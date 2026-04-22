-- ==========================================
-- MIGRAÇÃO: Conversas e Mensagens (Serena)
-- ==========================================

-- Tabela: conversations (uma por número de WhatsApp)
CREATE TABLE IF NOT EXISTS "public"."conversations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "phone" text NOT NULL,
  "name" text,
  "status" text NOT NULL DEFAULT 'active',
  "unread_count" integer NOT NULL DEFAULT 0,
  "last_message_at" timestamptz,
  "last_message_text" text,
  "transferred_at" timestamptz,
  "transfer_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("phone")
);

-- Tabela: messages (todas as mensagens trocadas)
CREATE TABLE IF NOT EXISTS "public"."messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
  "direction" text NOT NULL CHECK (direction IN ('in', 'out')),
  "content" text,
  "type" text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'document', 'video')),
  "media_url" text,
  "sender_type" text NOT NULL DEFAULT 'agent' CHECK (sender_type IN ('client', 'agent', 'human')),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  "read_at" timestamptz,
  PRIMARY KEY ("id")
);

-- Tabela: agent_memory (memória de contexto da Serena por conversa)
CREATE TABLE IF NOT EXISTS "public"."agent_memory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL REFERENCES "public"."conversations"("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK (role IN ('user', 'assistant')),
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON "public"."messages"("conversation_id");
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON "public"."messages"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON "public"."conversations"("last_message_at" DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_conversation ON "public"."agent_memory"("conversation_id", "created_at");

-- RLS
ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."agent_memory" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for conversations" ON "public"."conversations" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for messages" ON "public"."messages" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for agent_memory" ON "public"."agent_memory" FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
