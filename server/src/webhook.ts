import { Request, Response } from 'express';
import { ConversationService, MessageService } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { transcribeAudio, describeImage } from './services/media.js';
import { runSerena } from './agent/serena.js';
import { bufferMessage, cancelBuffer, BufferedMessage } from './services/messageBuffer.js';
import { wasSentByApi } from './services/outgoingTracker.js';

interface ParsedMessage {
  phone: string;
  content: string;
  type: string;
  mediaBase64?: string;
  mediaUrl?: string;
  fromMe: boolean;
  messageId?: string;
}

// Após 24h de silêncio, uma conversa transferida volta automaticamente para a IA.
const REACTIVATE_AFTER_MS = 24 * 60 * 60 * 1000;

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

    const msg = data.message || {};
    let content = '';
    let type = 'text';
    let mediaUrl: string | undefined;
    let mediaBase64: string | undefined;

    if (msg.conversation) {
      content = msg.conversation;
    } else if (msg.extendedTextMessage?.text) {
      content = msg.extendedTextMessage.text;
    } else if (msg.imageMessage) {
      type = 'image';
      content = msg.imageMessage.caption || '[Imagem]';
      mediaUrl = msg.imageMessage.url;
      mediaBase64 = data.message?.base64 || msg.imageMessage?.base64;
    } else if (msg.audioMessage) {
      type = 'audio';
      content = '[Áudio]';
      mediaBase64 = data.message?.base64 || msg.audioMessage?.base64;
    } else if (msg.documentMessage) {
      type = 'document';
      content = msg.documentMessage.caption || '[Documento]';
      mediaUrl = msg.documentMessage.url;
      mediaBase64 = data.message?.base64 || msg.documentMessage?.base64;
    } else if (msg.videoMessage) {
      type = 'video';
      content = msg.videoMessage.caption || '[Vídeo]';
    } else {
      return null;
    }

    return { phone, content, type, mediaUrl, mediaBase64, fromMe, messageId };
  } catch {
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

    // Reativação automática: se a conversa está transferida e passou mais de
    // 24h desde a última interação, devolve para a IA.
    if (conv.status === 'transferred' && conv.last_message_at) {
      const lastMs = new Date(conv.last_message_at).getTime();
      if (Number.isFinite(lastMs) && Date.now() - lastMs > REACTIVATE_AFTER_MS) {
        await ConversationService.reactivate(phone);
        conv.status = 'active';
        console.log(`[webhook] Conversa ${phone} reativada para IA após 24h de silêncio.`);
      }
    }

    await ConversationService.updateLastMessage(phone, content);

    // Salva a mensagem no banco imediatamente (aparece no CRM em tempo real)
    await MessageService.save({
      conversation_id: conv.id,
      direction: 'in',
      content,
      type: type as any,
      media_url: mediaUrl,
      sender_type: 'client',
      timestamp: new Date().toISOString()
    });

    // Conversa em atendimento humano: só incrementa não lidas, não processa com IA
    if (conv.status === 'transferred') {
      await ConversationService.incrementUnread(phone);
      return;
    }

    // Enfileira no buffer — aguarda 30s de silêncio antes de chamar a Serena
    console.log(`[webhook] Enfileirando no buffer (aguarda 30s de silêncio): ${phone}`);
    bufferMessage(
      phone,
      conv.id,
      { content, type, mediaBase64, mediaUrl },
      processBufferedMessages
    );

  } catch (err: any) {
    console.error(`[webhook] Erro ao receber mensagem de ${phone}:`, err.message);
  }
}

// Humano digitou uma mensagem direto no WhatsApp do celular (não pelo CRM).
// Salva no banco, marca conversa como transferida se ainda não estava, e
// cancela qualquer buffer pendente. A IA não deve mais responder.
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

    cancelBuffer(phone);

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

    if (msg.type === 'audio' && msg.mediaBase64) {
      try {
        const transcript = await transcribeAudio(msg.mediaBase64);
        content = `[Transcrição de áudio]: ${transcript}`;
      } catch (err: any) {
        console.error('[webhook] Erro ao transcrever áudio:', err.message);
        content = '[Cliente enviou um áudio, mas não foi possível transcrever]';
      }
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

  console.log(`[buffer] Flush ${phone} — ${messages.length} msg(s) acumulada(s). Chamando Serena…`);
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
  // Cancela buffer pendente (mensagens que o cliente enviou durante o runSerena
  // não devem disparar uma nova resposta da IA — humano agora está no controle).
  if (result.transfer) {
    await ConversationService.markTransferred(phone, result.transfer.reason);
    cancelBuffer(phone);
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
