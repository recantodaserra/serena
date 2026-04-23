/**
 * Cria o usuário admin no Supabase Auth com email já confirmado (sem confirmação por email).
 * Execute uma única vez: node scripts/create-admin-user.mjs
 */

const SUPABASE_URL = 'https://alwqlbyjpagcdgbtnyxs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3FsYnlqcGFnY2RnYnRueXhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQwMjY1NywiZXhwIjoyMDc4OTc4NjU3fQ.bOpBlW3faw6R_e1MWl2iJ7WATtEsrDoZmwZ40hX1dGY';

const EMAIL = 'recantodaserra@gmail.com';
const PASSWORD = 'Recantosenha123#';

async function createAdminUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.msg?.includes('already been registered') || data.code === 'email_exists') {
      console.log('✓ Usuário já existe no Supabase Auth.');
      return;
    }
    console.error('Erro ao criar usuário:', data);
    process.exit(1);
  }

  console.log('✓ Usuário admin criado com sucesso!');
  console.log('  Email:', data.email);
  console.log('  ID:', data.id);
  console.log('  Email confirmado:', data.email_confirmed_at ? 'Sim' : 'Não');
}

createAdminUser().catch(console.error);
