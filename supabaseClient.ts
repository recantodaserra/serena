import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

// Cria uma instância única do cliente para ser usada em toda a aplicação
// Verifica se as chaves existem para evitar erros em tempo de execução
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;