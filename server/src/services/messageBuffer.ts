export interface BufferedMessage {
  content: string;
  type: string;
  mediaBase64?: string;
  mediaUrl?: string;
}

type FlushCallback = (
  conversationId: string,
  phone: string,
  messages: BufferedMessage[]
) => Promise<void>;

interface BufferEntry {
  messages: BufferedMessage[];
  conversationId: string;
  timer: ReturnType<typeof setTimeout>;
}

const buffer = new Map<string, BufferEntry>();
const processing = new Set<string>();

const BUFFER_DELAY_MS = 30000;
const PROCESSING_RETRY_MS = 1500;

export function bufferMessage(
  phone: string,
  conversationId: string,
  message: BufferedMessage,
  onFlush: FlushCallback
): void {
  const existing = buffer.get(phone);

  if (existing) {
    clearTimeout(existing.timer);
    existing.messages.push(message);
    existing.timer = setTimeout(() => flush(phone, onFlush), BUFFER_DELAY_MS);
  } else {
    buffer.set(phone, {
      messages: [message],
      conversationId,
      timer: setTimeout(() => flush(phone, onFlush), BUFFER_DELAY_MS)
    });
  }
}

function flush(phone: string, onFlush: FlushCallback): void {
  const entry = buffer.get(phone);
  if (!entry) return;

  // Se ainda está processando a rodada anterior, aguarda e tenta de novo
  if (processing.has(phone)) {
    entry.timer = setTimeout(() => flush(phone, onFlush), PROCESSING_RETRY_MS);
    return;
  }

  buffer.delete(phone);
  processing.add(phone);

  onFlush(entry.conversationId, phone, entry.messages)
    .catch(err => console.error(`[buffer] Erro ao processar mensagens de ${phone}:`, err.message))
    .finally(() => processing.delete(phone));
}
