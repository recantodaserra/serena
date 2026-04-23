import React, { useEffect, useState } from 'react';
import {
  Save, Plus, Trash2, Bot, FileText, CreditCard, Settings2,
  CheckCircle2, AlertCircle, RefreshCw, ListChecks, Home
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FaqItem { question: string; answer: string }

interface AgentConfig {
  identity: string;
  tone: string;
  custom_instructions: string;
  faq: FaqItem[];
  pix_razao_social: string;
  pix_cnpj: string;
  pix_banco: string;
  pix_chave: string;
  photo_url: string;
  location_url: string;
  atendimento_rules: string;
  chalets_info: string;
}

const TONE_OPTIONS = [
  { value: 'amigavel', label: 'Amigável',  desc: 'Calorosa, usa emojis, comunicação leve' },
  { value: 'formal',   label: 'Formal',    desc: 'Profissional, sem gírias, menos emojis' },
  { value: 'casual',   label: 'Casual',    desc: 'Descontraído, como um amigo ajudando' },
];

type Tab = 'identidade' | 'atendimento' | 'chales' | 'faq' | 'pix' | 'avancado';

const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> =
  ({ active, onClick, icon, label }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        active
          ? 'bg-purple-600 text-white shadow'
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
    >
      {icon} {label}
    </button>
  );

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> =
  ({ label, hint, children }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      {children}
    </div>
  );

const AgentConfigManager: React.FC = () => {
  const [config, setConfig]     = useState<AgentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('identidade');
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch(`${API}/api/agent-config`);
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} ${r.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
      }
      setConfig(await r.json());
    } catch (err: any) {
      setLoadError(err?.message || 'Falha de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/agent-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!r.ok) throw new Error(await r.text());
      showToast('ok', 'Configuração salva com sucesso!');
    } catch (e: any) {
      showToast('err', e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) =>
    setConfig(c => c ? { ...c, [key]: value } : c);

  const addFaq = () =>
    setConfig(c => c ? { ...c, faq: [...c.faq, { question: '', answer: '' }] } : c);

  const updateFaq = (i: number, field: 'question' | 'answer', value: string) =>
    setConfig(c => {
      if (!c) return c;
      const faq = [...c.faq];
      faq[i] = { ...faq[i], [field]: value };
      return { ...c, faq };
    });

  const removeFaq = (i: number) =>
    setConfig(c => c ? { ...c, faq: c.faq.filter((_, idx) => idx !== i) } : c);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw className="animate-spin mr-2" size={20} /> Carregando configuração...
    </div>
  );

  if (loadError || !config) return (
    <div className="max-w-2xl mx-auto mt-12 bg-red-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <AlertCircle className="text-red-500" size={24} />
        <h3 className="font-bold text-red-800">Não foi possível carregar a configuração</h3>
      </div>
      <p className="text-sm text-red-700 mb-2">
        O backend em <code className="bg-white px-1.5 py-0.5 rounded text-xs">{API}</code> não respondeu.
      </p>
      {loadError && (
        <pre className="text-xs bg-white rounded p-3 text-red-600 overflow-x-auto mb-3">{loadError}</pre>
      )}
      <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside mb-4">
        <li>Abra <code className="bg-white px-1 rounded">{API}/health</code> em outra aba — se não carregar, o servidor está fora do ar.</li>
        <li>Verifique os logs do deploy no Easypanel.</li>
        <li>Confirme se <code className="bg-white px-1 rounded">VITE_API_URL</code> no Vercel aponta pro backend correto.</li>
      </ol>
      <button
        onClick={load}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
      >
        <RefreshCw size={14} /> Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Bot className="text-purple-600" size={28} /> Serena — Agente IA
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Configure o comportamento, regras de atendimento, chalés e dados do agente
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow transition-all disabled:opacity-60"
        >
          {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabBtn active={activeTab === 'identidade'}  onClick={() => setActiveTab('identidade')}  icon={<Bot size={15} />}        label="Identidade" />
        <TabBtn active={activeTab === 'atendimento'} onClick={() => setActiveTab('atendimento')} icon={<ListChecks size={15} />}  label="Atendimento" />
        <TabBtn active={activeTab === 'chales'}      onClick={() => setActiveTab('chales')}      icon={<Home size={15} />}        label="Chalés" />
        <TabBtn active={activeTab === 'faq'}         onClick={() => setActiveTab('faq')}         icon={<FileText size={15} />}    label="FAQ" />
        <TabBtn active={activeTab === 'pix'}         onClick={() => setActiveTab('pix')}         icon={<CreditCard size={15} />}  label="Dados PIX" />
        <TabBtn active={activeTab === 'avancado'}    onClick={() => setActiveTab('avancado')}    icon={<Settings2 size={15} />}   label="Avançado" />
      </div>

      {/* ── Tab: Identidade ── */}
      {activeTab === 'identidade' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <Field label="Descrição da Serena" hint="Define quem é a Serena e como ela se apresenta ao cliente">
            <textarea
              rows={5}
              value={config.identity}
              onChange={e => set('identity', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
            />
          </Field>

          <Field label="Tom de Voz">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TONE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('tone', opt.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    config.tone === opt.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-bold text-sm ${config.tone === opt.value ? 'text-purple-700' : 'text-gray-700'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Links">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Link das fotos</label>
                <input
                  type="text"
                  value={config.photo_url}
                  onChange={e => set('photo_url', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Link do Google Maps</label>
                <input
                  type="text"
                  value={config.location_url}
                  onChange={e => set('location_url', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
            </div>
          </Field>
        </div>
      )}

      {/* ── Tab: Atendimento ── */}
      {activeTab === 'atendimento' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Fluxo de Atendimento e Regras</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Define as etapas do processo de reserva, prioridades especiais e regras de transferência.
              Edite à vontade — a Serena segue exatamente o que está escrito aqui.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
            <strong>Dica de formatação:</strong> Use linhas em branco para separar seções. Emojis e CAIXA ALTA funcionam como destaque para a IA.
          </div>

          <textarea
            rows={28}
            value={config.atendimento_rules}
            onChange={e => set('atendimento_rules', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-y font-mono leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {/* ── Tab: Chalés ── */}
      {activeTab === 'chales' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Informações dos Chalés</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Descrição dos chalés que a Serena usa para apresentar ao cliente. Inclua nome, capacidade,
              comodidades, check-in/check-out e regras gerais de hospedagem.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
            <strong>Formatação WhatsApp:</strong> Use <code>*texto*</code> para negrito (um asterisco). Exemplo: <code>*Chalé da Floresta*</code>
          </div>

          <textarea
            rows={18}
            value={config.chalets_info}
            onChange={e => set('chalets_info', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-y font-mono leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {/* ── Tab: FAQ ── */}
      {activeTab === 'faq' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">Perguntas Frequentes</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                A Serena usará essas respostas quando o cliente perguntar algo específico
              </p>
            </div>
            <button
              onClick={addFaq}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          {config.faq.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma FAQ cadastrada ainda.</p>
              <p className="text-xs mt-1">Clique em "Adicionar" para criar sua primeira pergunta.</p>
            </div>
          )}

          {config.faq.map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="bg-purple-100 text-purple-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder="Pergunta do cliente"
                    value={item.question}
                    onChange={e => updateFaq(i, 'question', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                  <textarea
                    rows={3}
                    placeholder="Resposta da Serena"
                    value={item.answer}
                    onChange={e => updateFaq(i, 'answer', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                  />
                </div>
                <button onClick={() => removeFaq(i)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: PIX ── */}
      {activeTab === 'pix' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-gray-800">Dados para Pagamento PIX</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Enviados automaticamente quando o cliente confirma a reserva
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'pix_razao_social' as const, label: 'Razão Social',  placeholder: 'Ex: RECANTO DA SERRA ECO PARK LTDA' },
              { key: 'pix_cnpj'         as const, label: 'CNPJ',          placeholder: 'Ex: 61.187.265/0001-35' },
              { key: 'pix_banco'        as const, label: 'Banco',         placeholder: 'Ex: 323 - Mercado Pago' },
              { key: 'pix_chave'        as const, label: 'Chave PIX',     placeholder: 'CNPJ, CPF, telefone ou e-mail' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  value={config[field.key]}
                  onChange={e => set(field.key, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Preview — Como será enviado ao cliente:
            </p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
{`💳 DADOS PARA PAGAMENTO VIA PIX

📋 Razão Social: ${config.pix_razao_social}
🆔 CNPJ: ${config.pix_cnpj}
🏦 Banco: ${config.pix_banco}
🔑 Chave PIX: ${config.pix_chave}`}
            </pre>
          </div>
        </div>
      )}

      {/* ── Tab: Avançado ── */}
      {activeTab === 'avancado' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <Field
            label="Instruções Adicionais"
            hint="Regras extras ou restrições específicas. Adicionadas ao final do prompt com prioridade sobre o comportamento padrão."
          >
            <textarea
              rows={8}
              placeholder={`Ex:\n- Não mencione concorrentes\n- Pets não são permitidos\n- Silêncio após 22h`}
              value={config.custom_instructions}
              onChange={e => set('custom_instructions', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none font-mono"
            />
          </Field>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-2">Hierarquia das configurações</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li><strong>Identidade</strong> — quem é a Serena e tom de voz</li>
              <li><strong>Atendimento</strong> — fluxo das etapas e regras de prioridade</li>
              <li><strong>Chalés</strong> — informações das acomodações</li>
              <li><strong>FAQ</strong> — respostas para perguntas frequentes</li>
              <li><strong>Instruções Adicionais</strong> — regras extras (esta aba)</li>
            </ol>
            <p className="text-xs text-blue-600 mt-2">As instruções adicionais têm prioridade máxima e sobrepõem qualquer configuração acima.</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentConfigManager;
