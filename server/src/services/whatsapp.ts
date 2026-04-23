import 'dotenv/config';
import { trackOutgoing } from './outgoingTracker.js';

const BASE_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'Recanto';

// Extrai o ID da mensagem do retorno da Evolution, testando os formatos
// conhecidos (v1 e v2). Qualquer um que vier, registramos para deduplicação.
function extractMessageId(response: any): string | undefined {
  if (!response) return undefined;
  return response?.key?.id
    || response?.messageId
    || response?.id
    || undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function post(path: string, body: object) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Quebra o texto em blocos para envio separado.
// Estratégia:
//   1. Divide por dupla quebra de linha (parágrafos explícitos da IA).
//   2. Se um parágrafo passa de maxLen, subdivide por linhas simples.
//   3. Se ainda estiver grande (ou se veio tudo sem \n), subdivide por sentenças.
// Isso garante blocos pequenos mesmo quando o modelo devolve textão.
function splitIntoBlocks(text: string, maxLen = 280): string[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const blocks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      blocks.push(para);
      continue;
    }

    // Parágrafo grande: agrupa linhas simples até o limite.
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
    let current = '';
    for (const line of lines) {
      if (line.length > maxLen) {
        if (current) { blocks.push(current); current = ''; }
        // Linha única gigante — quebra por sentenças.
        blocks.push(...splitBySentences(line, maxLen));
        continue;
      }
      if (!current) {
        current = line;
      } else if (current.length + 1 + line.length <= maxLen) {
        current += '\n' + line;
      } else {
        blocks.push(current);
        current = line;
      }
    }
    if (current) blocks.push(current);
  }

  // Fallback final: texto sem nenhuma quebra (\n) e > maxLen.
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].length > maxLen)) {
    return splitBySentences(text.trim(), maxLen);
  }

  return blocks;
}

// Divide um texto longo em blocos menores cortando em fim de sentença
// (., !, ?, :) e agrupando até o limite.
function splitBySentences(text: string, maxLen: number): string[] {
  const sentences = text.match(/[^.!?:\n]+[.!?:]+[\s)]*|[^.!?:\n]+$/g);
  if (!sentences) return [text];

  const blocks: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;

    if (!current) {
      current = s;
    } else if (current.length + 1 + s.length <= maxLen) {
      current += ' ' + s;
    } else {
      blocks.push(current);
      current = s;
    }
  }
  if (current) blocks.push(current);

  return blocks.length > 0 ? blocks : [text];
}

// Envia indicador "digitando..." para o número pelo tempo especificado.
// Usa endpoint dedicado sendPresence para funcionar em qualquer versão da Evolution.
async function sendPresence(to: string, durationMs: number) {
  const number = to.startsWith('55') ? to : `55${to}`;
  const payload = { number, delay: durationMs, presence: 'composing' };
  try {
    // Tenta formato top-level (Evolution v2+).
    await post(`/chat/sendPresence/${INSTANCE}`, payload);
    return;
  } catch (err) {
    console.warn('[whatsapp] sendPresence v2 falhou:', (err as Error).message);
    // Fallback: formato antigo (Evolution v1) com options.
    try {
      await post(`/chat/sendPresence/${INSTANCE}`, {
        number,
        options: { delay: durationMs, presence: 'composing' }
      });
      return;
    } catch (err2) {
      console.warn('[whatsapp] sendPresence v1 também falhou — seguindo sem typing:', (err2 as Error).message);
    }
  }
}

export const WhatsApp = {
  // Envia texto simples, sem typing.
  async sendText(to: string, text: string) {
    const number = to.startsWith('55') ? to : `55${to}`;
    // Formato v2 (top-level). Evolution v1 aceita os mesmos campos se existirem.
    const response = await post(`/message/sendText/${INSTANCE}`, { number, text });
    // Registra o messageId para que o webhook saiba que esse eco é nosso,
    // não uma mensagem digitada pelo humano no celular.
    trackOutgoing(extractMessageId(response));
    return response;
  },

  // Envia resposta longa quebrada em blocos com typing real entre cada um.
  async sendBlocks(to: string, text: string) {
    const blocks = splitIntoBlocks(text);
    console.log(`[whatsapp] sendBlocks -> ${blocks.length} bloco(s) para ${to}`);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Duração do typing proporcional ao tamanho do bloco.
      // 30ms/caractere, mínimo 900ms, máximo 3500ms.
      const typingMs = Math.min(Math.max(block.length * 30, 900), 3500);

      console.log(`[whatsapp] bloco ${i + 1}/${blocks.length} len=${block.length} typing=${typingMs}ms`);

      // 1) Dispara o "digitando..." explicitamente.
      await sendPresence(to, typingMs);
      // 2) Aguarda a presença ser renderizada no cliente e durar o tempo.
      await sleep(typingMs);
      // 3) Envia a mensagem.
      await WhatsApp.sendText(to, block);

      // Pequena pausa entre blocos para parecer natural.
      if (i < blocks.length - 1) {
        await sleep(600);
      }
    }
  },

  async notifyTeam(text: string) {
    const phones = (process.env.TEAM_PHONES || '').split(',').filter(Boolean);
    const results = await Promise.allSettled(phones.map(p => WhatsApp.sendText(p, text)));
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[whatsapp] Falha ao notificar ${phones[i]}:`, (r.reason as Error)?.message);
      }
    });
  }
};
