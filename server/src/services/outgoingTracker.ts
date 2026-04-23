// Rastreia IDs de mensagens enviadas pela API (Serena ou endpoint manual do CRM).
// Quando o webhook recebe um evento com fromMe=true, consulta aqui para saber
// se aquela mensagem foi nossa (ignorar, é eco) ou se o humano digitou direto
// no WhatsApp do celular (precisa assumir a conversa).

const outgoing = new Map<string, number>();
const TTL_MS = 10 * 60 * 1000; // 10 minutos — janela larga para o webhook de eco chegar

export function trackOutgoing(messageId: string | null | undefined): void {
  if (!messageId) return;
  outgoing.set(String(messageId), Date.now());
  // Poda oportunista a cada registro — evita crescimento infinito em produção.
  if (outgoing.size > 500) pruneExpired();
}

export function wasSentByApi(messageId: string | null | undefined): boolean {
  if (!messageId) return false;
  const ts = outgoing.get(String(messageId));
  if (!ts) return false;
  if (Date.now() - ts > TTL_MS) {
    outgoing.delete(String(messageId));
    return false;
  }
  return true;
}

function pruneExpired() {
  const now = Date.now();
  for (const [id, ts] of outgoing) {
    if (now - ts > TTL_MS) outgoing.delete(id);
  }
}
