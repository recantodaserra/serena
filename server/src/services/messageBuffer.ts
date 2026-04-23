import { Redis, redisConfigured } from './redis.js';

export interface BufferedMessage {
  content: string;
  type: string;
  mediaBase64?: string;
  mediaUrl?: string;
  audioTranscript?: string;
}

type FlushCallback = (
  conversationId: string,
  phone: string,
  messages: BufferedMessage[]
) => Promise<void>;

const BUFFER_DELAY_MS = 30000;
const REDIS_TTL_SEC = 120;

function msgsKey(phone: string) { return `rs:buf:${phone}`; }
function convKey(phone: string) { return `rs:conv:${phone}`; }

// Lock em memória para evitar 2 flushes concorrentes pro mesmo phone
// (caso a comparação de snapshot casse com timing idêntico).
const flushing = new Set<string>();

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Padrão de buffer por DEBOUNCE com snapshot no Redis (igual ao n8n):
//   1. PUSH a mensagem na lista Redis (rs:buf:{phone}).
//   2. Lê o snapshot atual (LLEN).
//   3. Espera 30s.
//   4. Lê o snapshot de novo.
//   5. Se iguais → ninguém mais chegou → EU sou o último, faço flush.
//      Se diferentes → outra execução chegou depois → eu morro, ela vai flushar.
//
// Vantagens: sem timer em memória, funciona com múltiplas réplicas, reinício
// de servidor não perde mensagens (elas ficam no Redis com TTL de 2min).
export async function bufferMessage(
  phone: string,
  conversationId: string,
  message: BufferedMessage,
  onFlush: FlushCallback
): Promise<void> {
  if (!redisConfigured) {
    console.error('[buffer] Redis não configurado — mensagem NÃO será buferada. Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.');
    await onFlush(conversationId, phone, [message]);
    return;
  }

  try {
    // 1. Push + marca conversationId + renova TTL
    await Promise.all([
      Redis.rpush(msgsKey(phone), JSON.stringify(message)),
      Redis.expire(msgsKey(phone), REDIS_TTL_SEC),
      Redis.set(convKey(phone), conversationId, REDIS_TTL_SEC)
    ]);

    // 2. Snapshot antes do wait
    const before = await Redis.llen(msgsKey(phone));
    console.log(`[buffer] ${phone} +1 msg (total=${before}). Aguardando 30s…`);

    // 3. Espera 30s
    await sleep(BUFFER_DELAY_MS);

    // 4. Snapshot depois
    const after = await Redis.llen(msgsKey(phone));

    // 5. Se chegou nova msg durante o wait, outra execução vai flushar
    if (after !== before) {
      console.log(`[buffer] ${phone} outra msg chegou (${before}→${after}) — essa execução não flusha`);
      return;
    }

    // Se a key sumiu (after=0), significa cancelBuffer ou flush concorrente
    if (after === 0) {
      console.log(`[buffer] ${phone} lista vazia ao acordar — nada a flushar`);
      return;
    }

    // Lock local contra duplicata (2 execuções chegando com same snapshot)
    if (flushing.has(phone)) {
      console.log(`[buffer] ${phone} outra execução já está flushando — abortando`);
      return;
    }
    flushing.add(phone);

    try {
      // Pega tudo e limpa — atômico o suficiente pro nosso caso
      const [raw, convId] = await Promise.all([
        Redis.lrange(msgsKey(phone)),
        Redis.get(convKey(phone))
      ]);
      await Redis.del(msgsKey(phone), convKey(phone));

      const messages = raw
        .map(s => { try { return JSON.parse(s) as BufferedMessage; } catch { return null; } })
        .filter((m): m is BufferedMessage => !!m);

      if (messages.length === 0 || !convId) {
        console.log(`[buffer] FLUSH ${phone} abortado (msgs=${messages.length}, conv=${!!convId})`);
        return;
      }

      console.log(`[buffer] FLUSH ${phone} — ${messages.length} msg(s). Chamando Serena…`);
      await onFlush(convId, phone, messages);
    } finally {
      flushing.delete(phone);
      console.log(`[buffer] ${phone} liberado`);
    }
  } catch (err: any) {
    console.error(`[buffer] Erro ao buferar msg de ${phone}:`, err.message);
  }
}

// Cancela o buffer: apaga as chaves no Redis. Execuções em espera vão
// acordar, comparar snapshot (before > 0, after = 0), diferença detectada
// → não flusham.
export async function cancelBuffer(phone: string): Promise<void> {
  try {
    if (redisConfigured) {
      await Redis.del(msgsKey(phone), convKey(phone));
    }
    console.log(`[buffer] CANCELADO buffer de ${phone}`);
  } catch (err: any) {
    console.error(`[buffer] Erro ao cancelar ${phone}:`, err.message);
  }
}

// Snapshot do estado atual — diagnóstico via GET /debug/buffer.
export async function bufferSnapshot() {
  if (!redisConfigured) {
    return { redis: false, pending: [], flushing: Array.from(flushing) };
  }

  try {
    const keys = await Redis.keys('rs:buf:*');
    const pending = await Promise.all(
      keys.filter(k => !k.startsWith('rs:conv:')).map(async k => ({
        phone: k.replace('rs:buf:', ''),
        messages: await Redis.llen(k)
      }))
    );
    return { redis: true, pending, flushing: Array.from(flushing) };
  } catch (err: any) {
    return { redis: true, error: err.message, flushing: Array.from(flushing) };
  }
}
