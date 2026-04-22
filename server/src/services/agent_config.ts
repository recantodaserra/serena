import { supabase } from './supabase.js';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AgentConfig {
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

const DEFAULT_ATENDIMENTO_RULES = `ETAPA 1 — DISPONIBILIDADE (SEMPRE PRIMEIRO, NUNCA USE MEMÓRIA)
Para qualquer pergunta com datas específicas, chame imediatamente verificar_disponibilidade

ETAPA 2 — ESCOLHA DO CHALÉ
Informe os chalés disponíveis e pergunte qual o cliente prefere
Se pedir "todos", passe todos os disponíveis para calcular_orcamento

ETAPA 3 — ORÇAMENTO
Após disponibilidade confirmada e chalé escolhido, chame calcular_orcamento

ETAPA 4 — CONFIRMAÇÃO
Pergunte se o cliente deseja confirmar a reserva

ETAPA 5 — FORMA DE PAGAMENTO
Pergunte: "PIX ou Cartão?"
Cartão → transferir_para_humano (motivo: pagamento_cartao)
PIX → continue para ETAPA 6

ETAPA 6 — COLETA DE DADOS
Colete em sequência:
1. Nome completo do hóspede
2. CPF do titular
3. Observações (opcional)

ETAPA 7 — ENVIO DOS DADOS PIX
Envie o bloco de pagamento com os dados do PIX (use os dados configurados em Dados PIX)
Resumo: Check-in [DATA] às 14h | Check-out [DATA] às 12h | Chalé: [CHALÉ] | Titular: [NOME]
Instrução ao cliente: faça o PIX de 50% do valor total e envie o comprovante aqui

ETAPA 8 — PROCESSAR RESERVA
Aguarde o cliente ANEXAR o comprovante (imagem ou PDF)
Se disser "paguei" SEM anexar → peça o comprovante
Quando receber o comprovante → chame processar_reserva IMEDIATAMENTE
Após sucesso: confirme, agradeça e deseje uma boa estadia

---
PRIORIDADES ESPECIAIS

🔴 HÓSPEDE ATUAL — PRIORIDADE MÁXIMA
Se o cliente já chegou, está no check-in, está hospedado ou pergunta sobre o funcionamento do chalé → chame transferir_para_humano (motivo: hospede_chegou) IMEDIATAMENTE, sem tentar responder

🔴 DECORAÇÃO
Qualquer assunto sobre decoração, ornamentação, surpresa romântica, personalização → transferir_para_humano (motivo: decoracao)

📋 PREÇOS SEM DATA
Se o cliente pedir tabela geral de preços sem informar datas, informe:
- Chalé da Floresta, Horizonte e Montanha: a partir de R$ 550/diária
- Chalé do Mirante: a partir de R$ 500/diária
- Chalé Pôr do Sol: a partir de R$ 450/diária
(Seg: fechado | Ter-Qui: 15% desconto | Sex-Dom e feriados: preço cheio)

🛏️ COLCHÃO EXTRA: R$ 100,00 para todo o período (mencione SOMENTE se perguntarem)`;

const DEFAULT_CHALETS_INFO = `- *Chalé da Floresta* – até 2 adultos. Banheira hidromassagem, aquecedor, fogo de chão, deck com mirante.
- *Chalé do Horizonte* – até 2 adultos. Piscina privativa, churrasqueira, deck com mirante.
- *Chalé do Mirante* – até 2 adultos. Banheira hidromassagem, churrasqueira, deck com vista.
- *Chalé da Montanha* – até 2 adultos. Piscina privativa, deck com mirante (churrasqueira sob solicitação).
- *Chalé Pôr do Sol* – até 2 adultos. Estilo suíço, piscina privativa, churrasqueira, deck.

Check-in: 14h | Check-out: 12h | Localização: Pedro II - PI
NUNCA use "Pernoite" — use sempre "Diária" ou "Noite"
Não negocie preços.
SEMPRE inclua o link de fotos quando mostrar um orçamento.`;

const DEFAULT_CONFIG: AgentConfig = {
  identity: 'Você é a *Serena*, assistente de reservas do *Recanto da Serra*. Guie o cliente com eficiência pelo processo completo: consulta de disponibilidade, orçamento, coleta de dados, pagamento PIX e confirmação automática da reserva. Seja prestativa, clara e use emojis.',
  tone: 'amigavel',
  custom_instructions: '',
  faq: [],
  pix_razao_social: 'RECANTO DA SERRA ECO PARK LTDA',
  pix_cnpj: '61.187.265/0001-35',
  pix_banco: '323 - Mercado Pago',
  pix_chave: '61187265000135',
  photo_url: 'https://recantodaserrafotos.lovable.app/',
  location_url: 'https://maps.app.goo.gl/aDfdSCxEeCnsPQ5a8',
  atendimento_rules: DEFAULT_ATENDIMENTO_RULES,
  chalets_info: DEFAULT_CHALETS_INFO
};

let cached: AgentConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000;

export async function getAgentConfig(): Promise<AgentConfig> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached;

  const { data } = await supabase
    .from('agent_config')
    .select('*')
    .eq('id', 'main')
    .single();

  cached = {
    ...DEFAULT_CONFIG,
    ...data,
    // Garante que campos vazios no banco usem o default
    atendimento_rules: data?.atendimento_rules || DEFAULT_CONFIG.atendimento_rules,
    chalets_info: data?.chalets_info || DEFAULT_CONFIG.chalets_info
  };
  cacheTime = Date.now();
  return cached!;
}

export function invalidateConfigCache() {
  cached = null;
}

export async function saveAgentConfig(updates: Partial<AgentConfig>): Promise<AgentConfig> {
  const current = await getAgentConfig();
  const next = { ...current, ...updates };

  await supabase
    .from('agent_config')
    .upsert({ id: 'main', ...next, updated_at: new Date().toISOString() });

  cached = next;
  cacheTime = Date.now();
  return next;
}
