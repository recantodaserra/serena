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

// Split idêntico ao padrão n8n: divide por qualquer sequência de \n
// (simples ou múltiplas), trim, descarta vazios. Cada linha = 1 mensagem.
// O prompt da Serena é responsável por colocar \n entre as frases.
function splitIntoBlocks(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
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
