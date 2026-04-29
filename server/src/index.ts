import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { handleWebhook } from './webhook.js';
import { supabase } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { getAgentConfig, saveAgentConfig, invalidateConfigCache } from './services/agent_config.js';
import { cancelBuffer, bufferSnapshot } from './services/messageBuffer.js';
import { setHumanSilence, clearSilence, silenceInfo } from './services/silenceTimer.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Webhook (Evolution API → Serena) ---
app.post('/webhook/whatsapp', handleWebhook);

// --- API REST para o Frontend ---

// Listar conversas
app.get('/api/conversations', async (_, res) => {
  const { data, error } = await supabase
    .from('conversations')
    .select()
    .order('last_message_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Mensagens de uma conversa
app.get('/api/conversations/:id/messages', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('conversation_id', req.params.id)
    .order('timestamp', { ascending: true })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Humano envia mensagem manual.
// Assume a conversa: marca como 'transferred' e cancela qualquer buffer
// pendente, garantindo que a Serena NÃO vai responder em paralelo.
app.post('/api/conversations/:id/send', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  const { data: conv } = await supabase
    .from('conversations')
    .select('phone, status')
    .eq('id', req.params.id)
    .single();

  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

  try {
    await WhatsApp.sendText(conv.phone, text);
    const { data: msg } = await supabase
      .from('messages')
      .insert({
        conversation_id: req.params.id,
        direction: 'out',
        content: text,
        type: 'text',
        sender_type: 'human',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    // Atualização da conversa: se ainda não estava transferida, transfere agora.
    // Humano mandando mensagem = humano assumiu o atendimento.
    const updates: Record<string, any> = {
      last_message_at: new Date().toISOString(),
      last_message_text: text.slice(0, 120)
    };
    if (conv.status !== 'transferred') {
      updates.status = 'transferred';
      updates.transferred_at = new Date().toISOString();
      updates.transfer_reason = 'resposta_humana_manual';
    }
    await supabase
      .from('conversations')
      .update(updates)
      .eq('id', req.params.id);

    // Seta timer de 24h no Redis (IA silenciada) e cancela buffer pendente.
    // Humano está no controle agora.
    await Promise.all([
      setHumanSilence(conv.phone),
      cancelBuffer(conv.phone)
    ]);

    res.json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reativar Serena para uma conversa (após atendimento humano): remove o
// timer de silêncio no Redis e volta o status no CRM para 'active'.
app.post('/api/conversations/:id/reactivate', async (req, res) => {
  const { data: conv } = await supabase
    .from('conversations')
    .select('phone')
    .eq('id', req.params.id)
    .single();

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'active', unread_count: 0, transfer_reason: null })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });

  if (conv?.phone) await clearSilence(conv.phone);

  res.json({ ok: true });
});

// Marcar conversa como lida
app.post('/api/conversations/:id/read', async (req, res) => {
  const { error } = await supabase
    .from('conversations')
    .update({ unread_count: 0 })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// --- Configuração do Agente IA ---
app.get('/api/agent-config', async (_, res) => {
  try {
    const config = await getAgentConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/agent-config', async (req, res) => {
  try {
    const updated = await saveAgentConfig(req.body);
    invalidateConfigCache();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (_, res) => {
  const result: any = { ok: true, ts: new Date().toISOString(), checks: {} };

  // Supabase
  try {
    const { error } = await supabase.from('conversations').select('id').limit(1);
    result.checks.supabase = error ? { ok: false, error: error.message } : { ok: true };
  } catch (err: any) {
    result.checks.supabase = { ok: false, error: err.message };
  }

  // Redis
  const { redisConfigured } = await import('./services/redis.js');
  result.checks.redis = { configured: redisConfigured };
  if (redisConfigured) {
    try {
      const { Redis } = await import('./services/redis.js');
      await Redis.get('__healthcheck__');
      result.checks.redis.ok = true;
    } catch (err: any) {
      result.checks.redis.ok = false;
      result.checks.redis.error = err.message;
    }
  }

  // Env vars essenciais
  result.checks.env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: !!process.env.EVOLUTION_API_KEY,
    UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    TEAM_PHONES: !!process.env.TEAM_PHONES
  };

  const allOk = result.checks.supabase?.ok !== false && result.checks.redis?.ok !== false;
  res.status(allOk ? 200 : 503).json(result);
});

// Diagnóstico: estado do buffer de mensagens. Útil para verificar em produção
// se o agente está realmente acumulando mensagens picadas por 30s.
app.get('/debug/buffer', async (_, res) => {
  try { res.json(await bufferSnapshot()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Diagnóstico: a IA está silenciada pra esse phone? Em quantos segundos libera?
app.get('/debug/silence/:phone', async (req, res) => {
  try { res.json(await silenceInfo(req.params.phone)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// --- Parser de reservas via IA ---
app.post('/api/parse-reservation', async (req, res) => {
  const { text, chalets } = req.body as {
    text: string;
    chalets: Array<{ id: string; name: string }>;
  };

  if (!text || !chalets) {
    return res.status(400).json({ error: 'text e chalets são obrigatórios' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const chaletsList = chalets.map(c => `- "${c.name}" (id: ${c.id})`).join('\n');

    const systemPrompt = `Você é um extrator de dados de reservas hoteleiras brasileiras. Analise o texto e extraia as informações em JSON.

DATA DE HOJE: ${today.toISOString().split('T')[0]} (ano ${currentYear}, mês ${String(currentMonth).padStart(2, '0')}).

Chalés disponíveis (use SEMPRE o id exato, NUNCA o nome):
${chaletsList}

Retorne APENAS um JSON válido com este formato:
{
  "parsedData": {
    "chaletId": "string com o id do chalé ou null",
    "startDate": "YYYY-MM-DD ou null",
    "endDate": "YYYY-MM-DD ou null",
    "guest1Name": "string ou null",
    "guest1Cpf": "string ou null",
    "guest1Phone": "string ou null",
    "guest2Name": "string ou null",
    "guest2Cpf": "string ou null",
    "totalValue": número ou null,
    "paymentMethod": "Pix|Crédito|Débito|Dinheiro ou null",
    "paymentType": "Integral|Parcial ou null",
    "amountPaid": número ou null,
    "origin": "WhatsApp|Instagram|Airbnb|Booking|Indicação|Outro ou null",
    "observations": "string ou null"
  },
  "missingFields": ["campo1"],
  "missingFieldsLabels": ["Label 1"],
  "message": "Resumo amigável em português do que foi extraído e o que falta",
  "complete": true
}

REGRAS DE DATAS (MUITO IMPORTANTE):
- Formato BRASILEIRO: DD/MM ou DD/MM/YYYY. NUNCA interprete como MM/DD americano.
- "30/05" significa dia 30 de MAIO. Vira "${currentYear}-05-30".
- "01/06" significa dia 1 de JUNHO. Vira "${currentYear}-06-01".
- "15/04" significa dia 15 de ABRIL. Vira "${currentYear}-04-15".
- Se o ano não estiver no texto, use ${currentYear}.
- Se a data já passou nesse ano, use o próximo ano (${currentYear + 1}).
- IGNORE horários (ex: "às 14:00", "as 12:00") — apenas a data importa.
- "check-in: 30/05 às 14:00" → startDate: "${currentYear}-05-30".
- "check-out: 01/06 as 12:00" → endDate: "${currentYear}-06-01".
- Datas como "dia 24/04" no contexto de pagamento NÃO são startDate nem endDate, são da data do pagamento (ignore).

REGRAS DE PAGAMENTO:
- "100% Pix" → paymentType: "Integral", paymentMethod: "Pix", amountPaid = totalValue.
- "50% Pix" → paymentType: "Parcial", paymentMethod: "Pix", amountPaid = totalValue * 0.5.
- "Pago integral" → paymentType: "Integral", amountPaid = totalValue.

REGRAS DE HÓSPEDES:
- O primeiro nome é guest1Name (titular).
- CPF logo após o titular é guest1Cpf.
- O segundo nome (sem CPF próprio) é guest2Name.
- CPF logo após o segundo nome é guest2Cpf.
- Telefone vai sempre em guest1Phone (do titular).

OUTRAS REGRAS:
- chaletId DEVE ser um dos ids da lista acima. Se o nome no texto não bate com nenhum chalé, deixe null.
- "complete" = true APENAS se chaletId, startDate, endDate E guest1Name forem todos não-nulos.
- missingFields e missingFieldsLabels listam apenas os 4 campos obrigatórios que faltam.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    res.json(result);
  } catch (err: any) {
    console.error('[parse-reservation]', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor Recanto da Serra rodando na porta ${PORT}`);
  console.log(`   Build: buffer-redis-debounce + split-por-\\n + delay-nativo (${new Date().toISOString()})`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`   API: GET http://localhost:${PORT}/api/conversations`);
});
