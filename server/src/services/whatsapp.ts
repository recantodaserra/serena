import 'dotenv/config';

const BASE_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'Recanto';

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

export const WhatsApp = {
  async sendText(to: string, text: string) {
    const number = to.startsWith('55') ? to : `55${to}`;
    return post(`/message/sendText/${INSTANCE}`, { number, text });
  },

  async notifyTeam(text: string) {
    const phones = (process.env.TEAM_PHONES || '').split(',').filter(Boolean);
    await Promise.allSettled(phones.map(phone => WhatsApp.sendText(phone, text)));
  }
};
