import { Request, Response } from 'express';
import { ConversationService, MessageService } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { transcribeAudio, describeImage } from './services/media.js';
import { runSerena } from './agent/serena.js';
import { bufferMessage, cancelBuffer, BufferedMessage } from './services/messageBuffer.js';
import { wasSentByApi } from './services/outgoingTracker.js';
import { setHumanSilence, isAiSilenced } from './services/silenceTimer.js';

interface ParsedMessage {
  phone: string;
  content: string;
  type: string;
  mediaBase64?: string;
  mediaUrl?: string;
  audioTranscript?: string;
  fromMe: boolean;
  messageId?: string;
  // Mensagem Evolution completa — necessária para o endpoint
  // /chat/getBase64FromMediaMessage quando a base64 não vem no webhook.
  rawMessage?: any;
}

// Evolution v1/v2/cloud colocam o base64 em lugares diferentes dependendo da
// config (WEBHOOK_BASE64, MESSAGE_BASE64_INSERT, plugin openai-bot, etc).
// Procurar em TODOS os lugares conhecidos evita perder áudio por causa de um
// campo com nome diferente. Retorna undefined se realmente não tiver.
function extractBase64(body: any, data: any, msg: any, mediaObj: any): string | undefined {
  const candidates = [
    body?.base64,             // raiz do webhook
    data?.base64,             // dentro de data
    data?.message?.base64,    // dentro de data.message (v2 comum)
    msg?.base64,              // alias de data.message.base64
    mediaObj?.base64,         // dentro do audioMessage/imageMessage/documentMessage
    mediaObj?.mediaData,      // algumas versões usam mediaData
    data?.mediaBase64,        // variante
    body?.mediaBase64
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 100) return c;
  }
  return undefined;
}

// O plugin openai-bot da Evolution (e alguns custom) injetam a transcrição
// direto no payload — se vier, economizamos a chamada ao Whisper.
function extractSpeechToText(body: any, data: any, msg: any, mediaObj: any): string | undefined {
  const candidates = [
    body?.speechToText,
    data?.speechToText,
    data?.message?.speechToText,
    msg?.speechToText,
    mediaObj?.speechToText,
    data?.message?.transcription,
    mediaObj?.transcription
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return undefined;
}

// Algumas mensagens vêm embrulhadas em ephemeralMessage / viewOnceMessage /
// messageContextInfo. Desembrulha recursivamente pra chegar no payload real.
function unwrapMessage(msg: any): any {
  if (!msg) return msg;
  if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage?.message) return unwrapMessage(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2?.message) return unwrapMessage(msg.viewOnceMessageV2.message);
  if (msg.documentWithCaptionMessage?.message) return unwrapMessage(msg.documentWithCaptionMessage.message);
  return msg;
}

function parseEvolutionPayload(body: any): ParsedMessage | null {
  try {
    const data = body?.data;
    if (!data) return null;

    const fromMe = data.key?.fromMe === true;
    const messageId: string | undefined = data.key?.id;
    const remoteJid: string = data.key?.remoteJid || '';

    const phoneMatch = remoteJid.match(/55(\d+)@/);
    if (!phoneMatch) return null;
    const phone = phoneMatch[1];

    const rawMsg = data.message || {};
    const msg = unwrapMessage(rawMsg);
    let content = '';
    let type = 'text';
    let mediaUrl: string | undefined;
    let mediaBase64: string | undefined;
    let audioTranscript: string | undefined;

    if (msg.conversation) {
      content = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      content = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      type = 'image';
      content = msg.imageMessage.caption || '[Imagem]';
      mediaUrl = msg.imageMessage.url;
      mediaBase64 = extractBase64(body, data, msg, msg.imageMessage);
    } else if (msg.audioMessage) {
      type = 'audio';
      content = '[Áudio]';
      mediaBase64 = extractBase64(body, data, msg, msg.audioMessage);
      audioTranscript = extractSpeechToText(body, data, msg, msg.audioMessage);
    } else if (msg.documentMessage) {
      type = 'document';
      content = msg.documentMessage.caption || '[Documento]';
      mediaUrl = msg.documentMessage.url;
      mediaBase64 = extractBase64(body, data, msg, msg.documentMessage);
    } else if (msg.videoMessage) {
      type = 'video';
      content = msg.videoMessage.caption || '[Vídeo]';
    } else {
      // Log pra ajudar a descobrir qualquer tipo de mensagem exótico
      // (pollMessage, reactionMessage, stickerMessage, etc.) que a gente
      // não suporta. Sem crash.
      console.log(`[webhook] mensagem ignorada, tipo desconhecido: ${Object.keys(msg).join(',')}`);
      return null;
    }

    return {
      phone, content, type, mediaUrl, mediaBase64, audioTranscript, fromMe, messageId,
      rawMessage: data
    };
  } catch (err: any) {
    console.error('[webhook] parseEvolutionPayload falhou:', err?.message);
    return null;
  }
}

const ALLOWED_PHONES = (process.env.ALLOWED_PHONES || '').split(',').filter(Boolean);

export async function handleWebhook(req: Request, res: Response) {
  res.sendStatus(200);

  const parsed = parseEvolutionPayload(req.body);
  if (!parsed) return;

  console.log(
    `[webhook] IN phone=${parsed.phone} fromMe=${parsed.fromMe} type=${parsed.type} msgId=${parsed.messageId || 'n/a'} content="${parsed.content.slice(0, 60)}"`
  );

  if (ALLOWED_PHONES.length > 0 && !ALLOWED_PHONES.includes(parsed.phone)) {
    console.log(`[webhook] Número ${parsed.phone} bloqueado pelo filtro`);
    return;
  }

  // fromMe=true pode ter 2 origens:
  //   (a) Nossa API (Serena ou endpoint manual do CRM) → é eco, ignorar.
  //   (b) Humano digitando direto no WhatsApp do celular → assumir a conversa.
  if (parsed.fromMe) {
    if (wasSentByApi(parsed.messageId)) {
      console.log(`[webhook] fromMe reconhecido como eco da API (${parsed.messageId}), ignorando.`);
      return;
    }
    console.log(`[webhook] fromMe NÃO reconhecido — humano assumiu via celular.`);
    await handleHumanTakeoverFromPhone(parsed);
    return;
  }

  const { phone, type, mediaUrl, mediaBase64, content } = parsed;

  try {
    const conv = await ConversationService.upsert(phone);

    // SEMPRE salva a mensagem do cliente no banco — antes de qualquer check,
    // pra que o CRM sempre tenha o histórico completo (inclusive mensagens
    // que chegaram enquanto humano está conduzindo a conversa).
    await MessageService.save({
      conversation_id: conv.id,
      direction: 'in',
      content,
      type: type as any,
      media_url: mediaUrl,
      sender_type: 'client',
      timestamp: new Date().toISOString()
    });
    await ConversationService.updateLastMessage(phone, content);

    // IA silenciada? (timer de 24h, setado pelo humano via celular ou CRM)
    // Padrão idêntico ao n8n: GET rs:timeout:{phone}, se ainda não expirou,
    // IA não responde — humano está no controle.
    if (await isAiSilenced(phone)) {
      await ConversationService.incrementUnread(phone);
      // Garante que a conversa esteja marcada como 'transferred' no CRM
      if (conv.status !== 'transferred') {
        await ConversationService.markTransferred(phone, 'silenciada_por_humano');
      }
      console.log(`[webhook] ${phone} — IA silenciada, msg salva mas não processada`);
      return;
    }

    // Silêncio expirou (ou nunca existiu): se a conversa estava marcada como
    // 'transferred', reativa pra IA voltar a trabalhar.
    if (conv.status === 'transferred') {
      await ConversationService.reactivate(phone);
      console.log(`[webhook] ${phone} reativada para IA (silêncio expirou)`);
    }

    // Para áudio: se a Evolution já entregou a transcrição (bot OpenAI ativo),
    // usamos ela direto — economiza chamada ao Whisper. Senão tenta base64 do
    // webhook; se não veio, busca via API (padrão n8n).
    let resolvedBase64 = mediaBase64;
    let resolvedTranscript = parsed.audioTranscript;

    if (type === 'audio') {
      if (resolvedTranscript) {
        console.log(
          `[webhook] áudio já veio transcrito pela Evolution (len=${resolvedTranscript.length}): "${resolvedTranscript.slice(0, 80)}"`
        );
      } else {
        const hasB64Inline = !!resolvedBase64;
        console.log(
          `[webhook] áudio msgId=${parsed.messageId} inlineBase64=${hasB64Inline}${hasB64Inline ? ` (${resolvedBase64!.length} chars)` : ''}`
        );
        if (!resolvedBase64 && parsed.messageId) {
          resolvedBase64 = await WhatsApp.fetchMediaBase64(parsed.messageId, parsed.rawMessage);
          if (resolvedBase64) {
            console.log(
              `[webhook] base64 buscado via API para msgId=${parsed.messageId} (${resolvedBase64.length} chars)`
            );
          } else {
            console.warn(`[webhook] não foi possível obter base64 do áudio msgId=${parsed.messageId}`);
          }
        }
      }
    }

    // Enfileira no buffer — aguarda 30s de silêncio antes de chamar a Serena.
    // Fire-and-forget: o webhook já respondeu 200, não espera o debounce.
    bufferMessage(
      phone,
      conv.id,
      { content, type, mediaBase64: resolvedBase64, mediaUrl, audioTranscript: resolvedTranscript },
      processBufferedMessages
    ).catch(err => console.error(`[webhook] Erro no bufferMessage de ${phone}:`, err.message));

  } catch (err: any) {
    console.error(`[webhook] Erro ao receber mensagem de ${phone}:`, err.message);
  }
}

// Humano digitou uma mensagem direto no WhatsApp do celular (não pelo CRM).
// Salva no banco, seta o timer de 24h (rs:timeout:{phone}) e cancela qualquer
// buffer pendente. A IA fica silenciada até o timer expirar ou alguém limpar.
async function handleHumanTakeoverFromPhone(parsed: ParsedMessage): Promise<void> {
  const { phone, content, type, mediaUrl } = parsed;
  try {
    const conv = await ConversationService.upsert(phone);

    await MessageService.save({
      conversation_id: conv.id,
      direction: 'out',
      content,
      type: type as any,
      media_url: mediaUrl,
      sender_type: 'human',
      timestamp: new Date().toISOString()
    });

    await ConversationService.updateLastMessage(phone, content);

    if (conv.status !== 'transferred') {
      await ConversationService.markTransferred(phone, 'resposta_humana_manual');
    }

    // Seta o timer de 24h no Redis (padrão n8n) E cancela buffer pendente
    // para garantir que nenhuma msg do cliente dispare a IA agora.
    await Promise.all([
      setHumanSilence(phone),
      cancelBuffer(phone)
    ]);

    console.log(`[webhook] Humano assumiu ${phone} via celular.`);
  } catch (err: any) {
    console.error(`[webhook] Erro em takeover de ${phone}:`, err.message);
  }
}

// Chamado pelo buffer após 30s de silêncio.
// Pode receber N mensagens acumuladas (texto, áudio, imagem, etc.).
async function processBufferedMessages(
  conversationId: string,
  phone: string,
  messages: BufferedMessage[]
): Promise<void> {
  const contentParts: string[] = [];
  let imageBase64ForSerena: string | undefined;

  // Processa cada mensagem do buffer (transcrição de áudio, análise de imagem, etc.)
  for (const msg of messages) {
    let content = msg.content;

    if (msg.type === 'audio' && msg.audioTranscript) {
      // Evolution já transcreveu — entrega como texto normal pra Serena.
      content = msg.audioTranscript;
    } else if (msg.type === 'audio' && msg.mediaBase64) {
      try {
        const transcript = await transcribeAudio(msg.mediaBase64);
        if (!transcript || transcript.startsWith('[Áudio')) {
          // Whisper não pegou fala — pede pro cliente repetir/digitar.
          content = '[sistema: o cliente enviou um áudio, mas a transcrição ficou vazia. Peça educadamente para ele repetir ou enviar por texto.]';
        } else {
          content = transcript;
        }
      } catch (err: any) {
        console.error('[webhook] Erro ao transcrever áudio:', err?.message);
        content = '[sistema: falha técnica ao transcrever o áudio do cliente. Peça educadamente para ele repetir ou enviar por texto.]';
      }
    } else if (msg.type === 'audio') {
      console.warn('[webhook] áudio sem base64 nem transcrição');
      content = '[sistema: o áudio do cliente não pôde ser baixado. Peça educadamente para ele repetir ou enviar por texto.]';
    } else if (msg.type === 'image' && msg.mediaBase64) {
      // Imagem é passada diretamente para a Serena ver
      imageBase64ForSerena = msg.mediaBase64;
    } else if (msg.type === 'document' && msg.mediaBase64) {
      try {
        const description = await describeImage(msg.mediaBase64, msg.content);
        content = `[Documento enviado]: ${description}`;
      } catch (err: any) {
        console.error('[webhook] Erro ao analisar documento:', err.message);
        content = '[Cliente enviou um documento]';
      }
    }

    if (content) contentParts.push(content);
  }

  // Combina todas as mensagens do buffer em uma única entrada para a IA
  const combinedContent = contentParts.join('\n');

  const result = await runSerena(conversationId, phone, combinedContent, imageBase64ForSerena);

  const hasDoubleBreak = /\n\s*\n/.test(result.text);
  console.log(
    `[serena] Resposta: len=${result.text.length} hasDoubleBreak=${hasDoubleBreak} transfer=${result.transfer?.reason || 'no'}`
  );

  // Salva resposta da Serena no banco
  await MessageService.save({
    conversation_id: conversationId,
    direction: 'out',
    content: result.text,
    type: 'text',
    sender_type: 'agent',
    timestamp: new Date().toISOString()
  });

  await ConversationService.updateLastMessage(phone, result.text);

  // Transferência para humano: notifica equipe ANTES de enviar mensagem ao cliente.
  // Seta timer de 24h no Redis (IA silenciada) e cancela buffer pendente.
  if (result.transfer) {
    await ConversationService.markTransferred(phone, result.transfer.reason);
    await Promise.all([
      setHumanSilence(phone),
      cancelBuffer(phone)
    ]);
    await notifyTransfer(phone, result.transfer.reason, messages);
  }

  // Envia resposta em blocos com typing indicator
  await WhatsApp.sendBlocks(phone, result.text);
}

const TRANSFER_REASON_LABELS: Record<string, string> = {
  hospede_chegou:  '🏠 Hóspede já chegou / check-in',
  decoracao:       '🌸 Decoração / ornamentação',
  pagamento_cartao:'💳 Pagamento por cartão',
  falha_reserva:   '⚠️ Falha ao criar reserva',
  sem_resposta:    '❓ Dúvida sem resposta'
};

async function notifyTransfer(
  phone: string,
  reason: string,
  messages: BufferedMessage[]
): Promise<void> {
  const label = TRANSFER_REASON_LABELS[reason] || reason;

  // Pega o conteúdo original das últimas 3 mensagens para contexto
  const recentTexts = messages
    .slice(-3)
    .map(m => `  • ${m.content.slice(0, 120)}`)
    .join('\n');

  const teamMsg = [
    `⚡ *TRANSFERÊNCIA DE ATENDIMENTO*`,
    ``,
    `👤 *Cliente:* +${phone}`,
    `📋 *Motivo:* ${label}`,
    ``,
    `💬 *Últimas mensagens:*`,
    recentTexts,
    ``,
    `📲 Abrir conversa: https://wa.me/${phone}`
  ].join('\n');

  await WhatsApp.notifyTeam(teamMsg);
}
