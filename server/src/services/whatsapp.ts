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

// Parâmetros do splitter. São propositalmente conservadores — preferimos
// quebrar demais a mandar textão.
const HARD_MAX = 200;        // limite duro de 1 bloco
const MERGE_TINY_MAX = 18;   // só mergeia se o anterior for BEM curto (ex: "Oi!", "Certo.")

// Quebra AGRESSIVAMENTE o texto em blocos pequenos, SEM depender do modelo
// ter colocado \n\n na resposta.
//
// Estratégia:
//   1. Normaliza quebras de linha (\r\n → \n).
//   2. Junta parágrafos e linhas num fluxo unificado.
//   3. Divide por sentença (. ! ? ou \n) — cada sentença vira candidata a bloco.
//   4. Se uma sentença ultrapassa HARD_MAX, corta por vírgula ou por palavras.
//   5. Mergeia só blocos MUITO curtos (< MIN_MERGE), respeitando SOFT_MAX.
//
// Isso garante que mesmo se a Serena responder "Oi! Temos 5 chalés. Quer ver?"
// numa linha só, vira 3 mensagens separadas.
function splitIntoBlocks(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  // Fase 1: quebra em sentenças. Usamos um lookahead para preservar a
  // pontuação dentro da sentença e cortar DEPOIS do sinal.
  // Também tratamos \n simples como fim de sentença (listas, bullets, etc).
  const rawPieces = clean
    .split(/(?<=[.!?…])\s+|\n+/)
    .map(p => p.trim())
    .filter(Boolean);

  // Fase 2: se alguma peça passa de HARD_MAX, quebra ela por vírgula; se
  // ainda assim passar, quebra por palavras.
  const pieces: string[] = [];
  for (const p of rawPieces) {
    if (p.length <= HARD_MAX) { pieces.push(p); continue; }
    pieces.push(...splitByComma(p, HARD_MAX));
  }

  // Fase 3: mergeia SÓ quando o bloco anterior é muito curto (tipo "Oi!",
  // "Claro.", "Certo."). Frases de tamanho médio ficam sempre separadas —
  // é exatamente o que queremos pra simular conversa humana.
  const merged: string[] = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    const canMerge =
      last != null &&
      last.length <= MERGE_TINY_MAX &&
      last.length + 1 + p.length <= HARD_MAX;

    if (canMerge) merged[merged.length - 1] = last + ' ' + p;
    else merged.push(p);
  }

  return merged;
}

function splitByComma(text: string, maxLen: number): string[] {
  const parts = text.split(/,\s+/).map(p => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    const candidate = cur ? `${cur}, ${p}` : p;
    if (candidate.length <= maxLen) {
      cur = candidate;
    } else {
      if (cur) out.push(cur);
      if (p.length > maxLen) out.push(...splitByWords(p, maxLen));
      else cur = p;
      if (cur === p && p.length > maxLen) cur = '';
    }
  }
  if (cur) out.push(cur);
  return out;
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
