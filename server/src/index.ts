import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { handleWebhook } from './webhook.js';
import { supabase } from './services/supabase.js';
import { WhatsApp } from './services/whatsapp.js';
import { getAgentConfig, saveAgentConfig, invalidateConfigCache } from './services/agent_config.js';
import { cancelBuffer, bufferSnapshot } from './services/messageBuffer.js';

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

    // Descarta qualquer buffer de mensagens do cliente que estaria
    // prestes a disparar a Serena. Humano está no controle agora.
    cancelBuffer(conv.phone);

    res.json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reativar Serena para uma conversa (após atendimento humano)
app.post('/api/conversations/:id/reactivate', async (req, res) => {
  const { error } = await supabase
    .from('conversations')
    .update({ status: 'active', unread_count: 0 })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
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

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Diagnóstico: estado do buffer de mensagens. Útil para verificar em produção
// se o agente está realmente acumulando mensagens picadas por 30s.
app.get('/debug/buffer', (_, res) => res.json(bufferSnapshot()));

app.listen(PORT, () => {
  console.log(`✅ Servidor Recanto da Serra rodando na porta ${PORT}`);
  console.log(`   Build: buffer30s+blocos160ch+delay-nativo (${new Date().toISOString()})`);
  console.log(`   Webhook: POST http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`   API: GET http://localhost:${PORT}/api/conversations`);
});
