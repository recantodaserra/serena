-- ==========================================
-- SQL SETUP PARA SUPABASE - RECANTO DA SERRA
-- ==========================================

-- 1. Limpeza de tabelas existentes (se houver, para garantir um ambiente limpo)
DROP TABLE IF EXISTS "public"."reservations" CASCADE;
DROP TABLE IF EXISTS "public"."gallery" CASCADE;
DROP TABLE IF EXISTS "public"."custom_prices" CASCADE;
DROP TABLE IF EXISTS "public"."site_config" CASCADE;
DROP TABLE IF EXISTS "public"."chalets" CASCADE;

-- ==========================================
-- 2. Criação das Tabelas
-- ==========================================

-- Tabela: chalets
CREATE TABLE "public"."chalets" (
    "id" text NOT NULL,
    "slug" text NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "capacity" text,
    "amenities" text[] DEFAULT '{}'::text[],
    "base_price" numeric NOT NULL DEFAULT 0,
    "cover_image" text,
    "images" text[] DEFAULT '{}'::text[],
    PRIMARY KEY ("id")
);

-- Tabela: reservations
CREATE TABLE "public"."reservations" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chalet_id" text NOT NULL REFERENCES "public"."chalets"("id") ON DELETE CASCADE,
    "type" text NOT NULL DEFAULT 'guest',
    "guest1_name" text NOT NULL,
    "guest1_cpf" text,
    "guest1_phone" text,
    "guest2_name" text,
    "guest2_cpf" text,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "origin" text,
    "total_value" numeric NOT NULL DEFAULT 0,
    "payment_method" text,
    "payment_type" text,
    "amount_paid" numeric DEFAULT 0,
    "observations" text,
    "created_at" bigint NOT NULL,
    PRIMARY KEY ("id")
);

-- Tabela: custom_prices
CREATE TABLE "public"."custom_prices" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "date" date NOT NULL,
    "chalet_id" text NOT NULL REFERENCES "public"."chalets"("id") ON DELETE CASCADE,
    "price" numeric NOT NULL DEFAULT 0,
    PRIMARY KEY ("id"),
    UNIQUE ("date", "chalet_id") -- Garante que não temos dois preços pro mesmo dia/chale
);

-- Tabela: gallery
CREATE TABLE "public"."gallery" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "chalet_id" text, -- Pode ser nulo (geral) ou referenciar um chalé
    "type" text NOT NULL, -- 'image' or 'video'
    "url" text NOT NULL,
    "description" text,
    "created_at" bigint NOT NULL,
    PRIMARY KEY ("id")
);

-- Tabela: site_config (Para o Hero Banner)
CREATE TABLE "public"."site_config" (
    "key" text NOT NULL,
    "value" jsonb NOT NULL,
    PRIMARY KEY ("key")
);

-- ==========================================
-- 3. Configurações de Segurança (RLS - Row Level Security)
-- ==========================================
-- Habilitar RLS em todas as tabelas
ALTER TABLE "public"."chalets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."custom_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."gallery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Todos podem visualizar e editar por enquanto - Modo Aberto)
-- NOTA IMPORTANTE: Para ambiente de produção real, é recomendado criar políticas 
-- restritas com autenticação na tabela reservations/admin
CREATE POLICY "Enable all access for chalets" ON "public"."chalets" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for reservations" ON "public"."reservations" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for custom_prices" ON "public"."custom_prices" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for gallery" ON "public"."gallery" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for site_config" ON "public"."site_config" FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 4. Função para recarregar o schema no Supabase Rest API
-- ==========================================
NOTIFY pgrst, 'reload schema';
