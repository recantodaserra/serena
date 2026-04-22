-- Tabela de configuração do agente Serena
CREATE TABLE IF NOT EXISTS agent_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  identity TEXT NOT NULL DEFAULT 'Você é a *Serena*, assistente de reservas do *Recanto da Serra*. Guie o cliente com eficiência pelo processo completo: consulta de disponibilidade, orçamento, coleta de dados, pagamento PIX e confirmação automática da reserva. Seja prestativa, clara e use emojis.',
  tone TEXT NOT NULL DEFAULT 'amigavel',
  custom_instructions TEXT DEFAULT '',
  faq JSONB NOT NULL DEFAULT '[]',
  pix_razao_social TEXT NOT NULL DEFAULT 'RECANTO DA SERRA ECO PARK LTDA',
  pix_cnpj TEXT NOT NULL DEFAULT '61.187.265/0001-35',
  pix_banco TEXT NOT NULL DEFAULT '323 - Mercado Pago',
  pix_chave TEXT NOT NULL DEFAULT '61187265000135',
  photo_url TEXT NOT NULL DEFAULT 'https://recantodaserrafotos.lovable.app/',
  location_url TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/aDfdSCxEeCnsPQ5a8',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insere a configuração padrão se não existir
INSERT INTO agent_config (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_agent_config" ON agent_config FOR ALL USING (true) WITH CHECK (true);
