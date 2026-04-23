import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

// Valida que as chaves estão presentes e que a URL tem formato mínimo válido.
// Se um painel (Vercel/Easypanel) entregou a chave com \n, espaço ou char de
// controle, constants.cleanEnv já removeu — aqui garantimos que o que sobrou
// é utilizável antes de criar o client.
const isValidHttpUrl = (u: string) => /^https?:\/\/[^\s]+$/.test(u);
const isSupabaseConfigured =
  !!SUPABASE_URL && !!SUPABASE_ANON_KEY && isValidHttpUrl(SUPABASE_URL);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.error(
    '[supabaseClient] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes/inválidos. ' +
      'URL recebida:', SUPABASE_URL ? `"${SUPABASE_URL}"` : '(vazia)',
    '| ANON_KEY length:', SUPABASE_ANON_KEY.length,
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
