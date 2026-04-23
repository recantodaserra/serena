/**
 * Confirma o email do usuário admin e garante que a senha está correta.
 * Execute uma única vez: node scripts/confirm-admin-user.mjs
 */

const SUPABASE_URL = 'https://alwqlbyjpagcdgbtnyxs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3FsYnlqcGFnY2RnYnRueXhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQwMjY1NywiZXhwIjoyMDc4OTc4NjU3fQ.bOpBlW3faw6R_e1MWl2iJ7WATtEsrDoZmwZ40hX1dGY';

const EMAIL = 'recantodaserra@gmail.com';
const PASSWORD = 'Recantosenha123#';

async function run() {
  // 1. Listar usuários para encontrar o ID
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=100`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  const listData = await listRes.json();
  const users = listData.users ?? [];
  const user = users.find(u => u.email === EMAIL);

  if (!user) {
    console.log('Usuário não encontrado, criando...');
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
    });
    const created = await createRes.json();
    if (!createRes.ok) { console.error('Erro ao criar:', created); process.exit(1); }
    console.log('✓ Usuário criado. ID:', created.id);
    return;
  }

  console.log('Usuário encontrado. ID:', user.id);
  console.log('Email confirmado:', user.email_confirmed_at ?? 'Não');

  // 2. Confirmar email + atualizar senha
  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email_confirm: true,
      password: PASSWORD,
    }),
  });
  const updated = await updateRes.json();
  if (!updateRes.ok) { console.error('Erro ao atualizar:', updated); process.exit(1); }
  console.log('✓ Email confirmado e senha atualizada com sucesso!');
  console.log('  Email confirmado em:', updated.email_confirmed_at);
}

run().catch(console.error);
