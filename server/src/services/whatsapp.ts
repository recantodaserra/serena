import 'dotenv/config';

const BASE_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'Recanto';

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
// Divide em parágrafos (dupla quebra de linha). Blocos longos são subdivididos
// em linhas únicas, agrupando-as até o limite de caracteres.
function splitIntoBlocks(text: string, maxLen = 350): string[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  const blocks: string[] = [];

  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      blocks.push(para);
      continue;
    }

    // Parágrafo longo: agrupa linhas simples até o limite
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
    let current = '';
    for (const line of lines) {
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

  return blocks.length > 0 ? blocks : [text.trim()];
}

export const WhatsApp = {
  // Envia texto simples. delayMs ativa o "digitando..." na Evolution API.
  async sendText(to: string, text: string, delayMs = 0) {
    const number = to.startsWith('55') ? to : `55${to}`;
    return post(`/message/sendText/${INSTANCE}`, {
      number,
      text,
      options: { delay: delayMs, presence: 'composing' }
    });
  },

  // Envia resposta longa quebrada em blocos com typing entre cada um.
  async sendBlocks(to: string, text: string) {
    const blocks = splitIntoBlocks(text);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // 30ms por caractere — mínimo 800ms, máximo 3500ms
      const typingMs = Math.min(Math.max(block.length * 30, 800), 3500);

      await WhatsApp.sendText(to, block, typingMs);

      // Aguarda o "digitando" terminar antes do próximo bloco
      if (i < blocks.length - 1) {
        await sleep(typingMs + 400);
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
