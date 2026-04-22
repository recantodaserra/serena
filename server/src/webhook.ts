import { Request, Response } from 'express';
import { ConversationService, MessageService } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { transcribeAudio, describeImage } from './services/media.js';
import { runSerena } from './agent/serena.js';
import { bufferMessage, BufferedMessage } from './services/messageBuffer.js';

interface ParsedMessage {
  phone: string;
  content: string;
  type: string;
  mediaBase64?: string;
  mediaUrl?: string;
  fromMe: boolean;
}

function parseEvolutionPayload(body: any): ParsedMessage | null {
  try {
    const data = body?.data;
    if (!data) return null;

    const fromMe = data.key?.fromMe === true;
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

    return { phone, content, type, mediaUrl, mediaBase64, fromMe };
  } catch {
    return null;
  }
}

const ALLOWED_PHONES = (process.env.ALLOWED_PHONES || '').split(',').filter(Boolean);

export async function handleWebhook(req: Request, res: Response) {
  res.sendStatus(200);

  const parsed = parseEvolutionPayload(req.body);
  if (!parsed || parsed.fromMe) return;

  if (ALLOWED_PHONES.length > 0 && !ALLOWED_PHONES.includes(parsed.phone)) {
    console.log(`[webhook] Número ${parsed.phone} bloqueado pelo filtro`);
    return;
  }

  const { phone, type, mediaUrl, mediaBase64, content } = parsed;

  try {
    const conv = await ConversationService.upsert(phone);
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

    // Enfileira no buffer — aguarda silêncio de 4s antes de chamar a Serena
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

// Chamado pelo buffer após o silêncio de 4s.
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

  const result = await runSerena(conversationId, phone, combinedContent, imageBase64ForSerena);

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

  // Transferência para humano: notifica equipe ANTES de enviar mensagem ao cliente
  if (result.transfer) {
    await ConversationService.markTransferred(phone, result.transfer.reason);
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
