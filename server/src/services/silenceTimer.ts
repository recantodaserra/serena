import { Redis, redisConfigured } from './redis.js';

// Timer de silenciamento da IA — padrão idêntico ao n8n:
//   - Sempre que um humano manda mensagem (pelo celular ou pelo CRM), setamos
//     `rs:timeout:{phone}` = timestamp de quando o silêncio expira.
//   - Toda vez que o cliente manda mensagem, verificamos essa key antes de
//     disparar a Serena. Se o timestamp ainda não venceu, IA fica calada.
//   - Quando vence naturalmente (24h sem humano agir), a IA volta sozinha.
//
// Usamos valor = timestamp ms (não só TTL do Redis) pra conseguir saber
// QUANTO falta pra expirar (útil no endpoint de debug e pra logar).
// O TTL do Redis é setado com margem extra, só como safety net.

const DEFAULT_SILENCE_MINUTES = 1440; // 24h (igual ao TEMPO_SILENCIO_MINUTOS do n8n)

function key(phone: string) { return `rs:timeout:${phone}`; }

export async function setHumanSilence(phone: string, minutes = DEFAULT_SILENCE_MINUTES): Promise<void> {
  if (!redisConfigured) return;
  const expiresAt = Date.now() + minutes * 60 * 1000;
  const ttlSeconds = minutes * 60 + 300; // margem de 5min
  try {
    await Redis.set(key(phone), expiresAt.toString(), ttlSeconds);
    console.log(`[silence] ${phone} silenciada por ${minutes}min (até ${new Date(expiresAt).toISOString()})`);
  } catch (err: any) {
    console.error(`[silence] Erro ao setar timeout de ${phone}:`, err.message);
  }
}

export async function isAiSilenced(phone: string): Promise<boolean> {
  if (!redisConfigured) return false;
  try {
    const raw = await Redis.get(key(phone));
    if (!raw) return false;
    const expiresAt = parseInt(raw, 10);
    if (!Number.isFinite(expiresAt)) return false;
    if (Date.now() > expiresAt) return false;
    return true;
  } catch (err: any) {
    console.error(`[silence] Erro ao ler timeout de ${phone}:`, err.message);
    return false;
  }
}

export async function clearSilence(phone: string): Promise<void> {
  if (!redisConfigured) return;
  try {
    await Redis.del(key(phone));
    console.log(`[silence] ${phone} silêncio removido manualmente`);
  } catch (err: any) {
    console.error(`[silence] Erro ao limpar timeout de ${phone}:`, err.message);
  }
}

// Para o endpoint de debug.
export async function silenceInfo(phone: string): Promise<{ silenced: boolean; expiresIn?: number }> {
  if (!redisConfigured) return { silenced: false };
  const raw = await Redis.get(key(phone));
  if (!raw) return { silenced: false };
  const expiresAt = parseInt(raw, 10);
  const msLeft = expiresAt - Date.now();
  return { silenced: msLeft > 0, expiresIn: Math.max(0, Math.round(msLeft / 1000)) };
}
