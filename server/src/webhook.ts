import { Request, Response } from 'express';
import { ConversationService, MessageService } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { transcribeAudio, describeImage } from './services/media.js';
import { runSerena } from './agent/serena.js';

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
  if (!parsed) return;
  if (parsed.fromMe) return;

  // Filtro de teste: se ALLOWED_PHONES estiver definido, só processa esses números
  if (ALLOWED_PHONES.length > 0 && !ALLOWED_PHONES.includes(parsed.phone)) {
    console.log(`[webhook] Número ${parsed.phone} bloqueado pelo filtro de teste`);
    return;
  }

  const { phone, type, mediaUrl, mediaBase64 } = parsed;
  let { content } = parsed;

  try {
    const conv = await ConversationService.upsert(phone);
    await ConversationService.updateLastMessage(phone, content);

    await MessageService.save({
      conversation_id: conv.id,
      direction: 'in',
      content,
      type: type as any,
      media_url: mediaUrl,
      sender_type: 'client',
      timestamp: new Date().toISOString()
    });

    if (conv.status === 'transferred') {
      await ConversationService.incrementUnread(phone);
      return;
    }

    // Processa mídia antes de enviar para a Serena
    let imageBase64ForSerena: string | undefined;

    if (type === 'audio' && mediaBase64) {
      try {
        const transcript = await transcribeAudio(mediaBase64);
        content = `[Transcrição de áudio]: ${transcript}`;
      } catch (err: any) {
        console.error('[webhook] Erro ao transcrever áudio:', err.message);
        content = '[Cliente enviou um áudio, mas não foi possível transcrever]';
      }
    } else if ((type === 'image' || type === 'document') && mediaBase64) {
      imageBase64ForSerena = mediaBase64;
      if (type === 'document') {
        try {
          const description = await describeImage(mediaBase64, content);
          content = `[Documento enviado]: ${description}`;
          imageBase64ForSerena = undefined;
        } catch (err: any) {
          console.error('[webhook] Erro ao analisar documento:', err.message);
          content = '[Cliente enviou um documento]';
        }
      }
    }

    const result = await runSerena(conv.id, phone, content, imageBase64ForSerena);

    await MessageService.save({
      conversation_id: conv.id,
      direction: 'out',
      content: result.text,
      type: 'text',
      sender_type: 'agent',
      timestamp: new Date().toISOString()
    });

    await ConversationService.updateLastMessage(phone, result.text);

    if (result.transfer) {
      await ConversationService.markTransferred(phone, result.transfer.reason);
      const teamMsg = `⚡ *Transferência de Atendimento*\n\nCliente: ${phone}\nMotivo: ${result.transfer.reason}\n\nÚltima mensagem: "${parsed.content}"`;
      await WhatsApp.notifyTeam(teamMsg);
    }

    await WhatsApp.sendText(phone, result.text);

  } catch (err: any) {
    console.error(`[webhook] Erro ao processar mensagem de ${phone}:`, err.message);
  }
}
