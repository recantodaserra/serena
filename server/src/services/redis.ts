import 'dotenv/config';

// Cliente leve para Upstash Redis via REST API.
// Não usamos o SDK @upstash/redis pra evitar dependência extra — o protocolo
// REST é só "POST body=[cmd, arg1, ...]" com Bearer token.

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redisConfigured = Boolean(URL && TOKEN);

if (!redisConfigured) {
  console.warn('[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não configurados. Buffer cairá em memória local.');
}

async function cmd(args: (string | number)[]): Promise<any> {
  if (!redisConfigured) throw new Error('Redis não configurado');
  const res = await fetch(URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify(args.map(String))
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.error) throw new Error(`Upstash error: ${json.error}`);
  return json.result;
}

export const Redis = {
  async rpush(key: string, value: string): Promise<number> {
    return cmd(['RPUSH', key, value]);
  },
  async lrange(key: string, start = 0, stop = -1): Promise<string[]> {
    return (await cmd(['LRANGE', key, start, stop])) || [];
  },
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return cmd(['DEL', ...keys]);
  },
  async expire(key: string, seconds: number): Promise<number> {
    return cmd(['EXPIRE', key, seconds]);
  },
  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    const args: (string | number)[] = ['SET', key, value];
    if (ttlSeconds) args.push('EX', ttlSeconds);
    return cmd(args);
  },
  async get(key: string): Promise<string | null> {
    return (await cmd(['GET', key])) ?? null;
  },
  async keys(pattern: string): Promise<string[]> {
    return (await cmd(['KEYS', pattern])) || [];
  },
  async llen(key: string): Promise<number> {
    return (await cmd(['LLEN', key])) || 0;
  }
};
