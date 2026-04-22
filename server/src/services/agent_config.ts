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
}

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
  location_url: 'https://maps.app.goo.gl/aDfdSCxEeCnsPQ5a8'
};

let cached: AgentConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getAgentConfig(): Promise<AgentConfig> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached;

  const { data } = await supabase
    .from('agent_config')
    .select('*')
    .eq('id', 'main')
    .single();

  if (!data) {
    cached = DEFAULT_CONFIG;
  } else {
    cached = { ...DEFAULT_CONFIG, ...data };
  }
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
