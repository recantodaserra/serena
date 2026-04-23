# Recanto da Serra

Sistema de reservas e gestão para o Recanto da Serra — resort com chalés na natureza.

## Tecnologias

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Banco de Dados:** Supabase (PostgreSQL)
- **IA:** Agente Serena (OpenAI GPT-4) via Evolution API (WhatsApp)
- **Cache:** Redis (Upstash)

## Estrutura

```
recanto-da-serra/
├── components/       # Componentes React (Admin, ChaletDetails, Chat, etc.)
├── contexts/         # AuthContext (Supabase Auth)
├── services/         # Camada de acesso ao Supabase
├── utils/            # Helpers (formatCurrency, getAmenityIcon, imageCompression)
├── server/           # Backend Express + agente Serena
└── public/           # Assets estáticos
```

## Rodar localmente

**Pré-requisitos:** Node.js 18+

1. Instale as dependências do frontend:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente — crie um `.env` na raiz:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. Instale as dependências do backend e configure `server/.env` (veja `server/.env.example`):
   ```bash
   cd server && npm install
   ```

4. Rode o frontend e o backend em paralelo:
   ```bash
   # Terminal 1 — Frontend
   npm run dev

   # Terminal 2 — Backend
   cd server && npm run dev
   ```

## Deploy

- **Frontend:** Vercel (build `npm run build`, output `dist/`)
- **Backend:** Easypanel
- **Banco:** Supabase Cloud
- **Cache:** Upstash Redis
