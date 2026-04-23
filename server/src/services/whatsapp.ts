import 'dotenv/config';
import { trackOutgoing } from './outgoingTracker.js';

const BASE_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'Recanto';

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

// Tamanho-alvo de cada bloco enviado ao WhatsApp.
// 160 chars é o sweet spot: cabe uma ou duas frases, força a IA a parecer
// humana (ninguém digita paredão de texto), e evita fadiga de leitura.
const MAX_BLOCK_LEN = 160;

// Quebra o texto em blocos pequenos.
// Estratégia em cascata:
//   1. Divide por dupla quebra de linha (parágrafos que a IA marcou).
//   2. Cada parágrafo é subdividido por sentenças (. ! ? :).
//   3. Sentenças são agrupadas até MAX_BLOCK_LEN caracteres.
// Isso funciona mesmo se a IA devolver textão sem \n\n.
function splitIntoBlocks(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const blocks: string[] = [];

  for (const para of paragraphs) {
    // Linhas internas do parágrafo: se o modelo gerou uma lista com \n, cada
    // linha já é um "chunk" natural. Caso contrário, caímos em splitBySentences.
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (line.length <= MAX_BLOCK_LEN) {
        blocks.push(line);
      } else {
        blocks.push(...splitBySentences(line, MAX_BLOCK_LEN));
      }
    }
  }

  // Junta blocos adjacentes pequenos para não ficar hiper-picotado
  // (ex: "Olá!" + "Tudo bem?" → "Olá! Tudo bem?" se couber).
  const merged: string[] = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (last && last.length + 1 + b.length <= MAX_BLOCK_LEN) {
      merged[merged.length - 1] = last + ' ' + b;
    } else {
      merged.push(b);
    }
  }

  return merged;
}

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

  // Se uma única sentença ainda passa do limite (cliente escreveu um período
  // gigante sem pontuação), corta por palavras como fallback duro.
  const out: string[] = [];
  for (const b of blocks) {
    if (b.length <= maxLen * 1.3) { out.push(b); continue; }
    out.push(...splitByWords(b, maxLen));
  }
  return out.length > 0 ? out : [text];
}

function splitByWords(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = '';
  for (const w of words) {
    if (!current) { current = w; continue; }
    if (current.length + 1 + w.length <= maxLen) current += ' ' + w;
    else { out.push(current); current = w; }
  }
  if (current) out.push(current);
  return out;
}

// Duração do typing proporcional ao tamanho do bloco.
// Heurística: ~25 caracteres por segundo (digitação rápida), com piso de
// 800ms (pra aparecer no celular) e teto de 2500ms (pra não parecer trava).
function typingMsFor(block: string): number {
  const ms = Math.round(block.length * 40);
  return Math.min(Math.max(ms, 800), 2500);
}

export const WhatsApp = {
  // Envia texto com typing embutido.
  // O parâmetro `delay` no próprio /message/sendText é a forma NATIVA da
  // Evolution de mostrar "digitando..." por X ms antes de entregar — isso
  // é muito mais confiável do que um sendPresence separado (que depende da
  // versão da Evolution e tem formato de payload diferente em v1 vs v2).
  async sendText(to: string, text: string, delayMs = 0) {
    const number = to.startsWith('55') ? to : `55${to}`;
    const body: Record<string, any> = { number, text };
    if (delayMs > 0) body.delay = delayMs;
    const response = await post(`/message/sendText/${INSTANCE}`, body);
    trackOutgoing(extractMessageId(response));
    return response;
  },

  // Envia resposta quebrada em blocos com typing real entre cada um.
  async sendBlocks(to: string, text: string) {
    const blocks = splitIntoBlocks(text);
    console.log(
      `[whatsapp] sendBlocks -> ${blocks.length} bloco(s) para ${to} (tamanhos: ${blocks.map(b => b.length).join(',')})`
    );

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const delayMs = typingMsFor(block);

      console.log(`[whatsapp] bloco ${i + 1}/${blocks.length} len=${block.length} typing=${delayMs}ms`);

      try {
        // delay embutido: a Evolution mostra "digitando..." por delayMs,
        // depois entrega a mensagem. Simples e robusto.
        await WhatsApp.sendText(to, block, delayMs);
      } catch (err: any) {
        console.error(`[whatsapp] falha no bloco ${i + 1}/${blocks.length}:`, err.message);
        // Não interrompe: tenta entregar os blocos restantes para o cliente
        // não ficar com a resposta pela metade.
      }

      // Respiro entre blocos (o próprio delay já gera pausa, mas um gap
      // extra evita que o WhatsApp agrupe as mensagens lado a lado).
      if (i < blocks.length - 1) await sleep(400);
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
