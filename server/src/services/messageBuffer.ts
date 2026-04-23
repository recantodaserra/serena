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
  firstAt: number;
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
  const now = Date.now();

  if (existing) {
    clearTimeout(existing.timer);
    existing.messages.push(message);
    existing.timer = setTimeout(() => flush(phone, onFlush), BUFFER_DELAY_MS);
    const waited = Math.round((now - existing.firstAt) / 1000);
    console.log(
      `[buffer] +1 msg para ${phone} (total=${existing.messages.length}, aguardando 30s desde esta última; acumulando há ${waited}s)`
    );
  } else {
    buffer.set(phone, {
      messages: [message],
      conversationId,
      timer: setTimeout(() => flush(phone, onFlush), BUFFER_DELAY_MS),
      firstAt: now
    });
    console.log(`[buffer] NOVO buffer para ${phone} — timer de 30s iniciado`);
  }
}

function flush(phone: string, onFlush: FlushCallback): void {
  const entry = buffer.get(phone);
  if (!entry) return;

  if (processing.has(phone)) {
    console.log(`[buffer] ${phone} ainda processando rodada anterior — reagendando em ${PROCESSING_RETRY_MS}ms`);
    entry.timer = setTimeout(() => flush(phone, onFlush), PROCESSING_RETRY_MS);
    return;
  }

  buffer.delete(phone);
  processing.add(phone);

  const elapsed = Math.round((Date.now() - entry.firstAt) / 1000);
  console.log(
    `[buffer] FLUSH ${phone} — ${entry.messages.length} msg(s) acumulada(s) em ${elapsed}s. Chamando Serena…`
  );

  onFlush(entry.conversationId, phone, entry.messages)
    .catch(err => console.error(`[buffer] Erro ao processar mensagens de ${phone}:`, err.message))
    .finally(() => {
      processing.delete(phone);
      console.log(`[buffer] ${phone} processing liberado`);
    });
}

// Cancela qualquer buffer pendente para o telefone, descartando as mensagens
// acumuladas. Usado quando um humano assume a conversa.
export function cancelBuffer(phone: string): void {
  const entry = buffer.get(phone);
  if (!entry) return;
  clearTimeout(entry.timer);
  buffer.delete(phone);
  console.log(`[buffer] CANCELADO buffer de ${phone} (${entry.messages.length} msg descartada(s))`);
}

// Snapshot do estado atual — útil para endpoint de diagnóstico.
export function bufferSnapshot() {
  const now = Date.now();
  return {
    pending: Array.from(buffer.entries()).map(([phone, e]) => ({
      phone,
      messages: e.messages.length,
      waitingForSec: Math.round((now - e.firstAt) / 1000)
    })),
    processing: Array.from(processing)
  };
}
