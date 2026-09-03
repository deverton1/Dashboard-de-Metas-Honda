# Honda Metas

Dashboard frontend-only para acompanhar metas de vendas de motos Honda em uma tela de TV e em um painel de controle.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + TypeScript + Vite, local SQLite WASM persistence

## Where things live

- `artifacts/honda-metas/src/pages/tv.tsx` — placar fullscreen para a TV
- `artifacts/honda-metas/src/pages/controle.tsx` — operação de inclusão, desfazimento e metas
- `artifacts/honda-metas/src/lib/sales-store.ts` — SQLite WASM no navegador, persistido localmente
- `artifacts/honda-metas/src/lib/showroom-audio.ts` — áudio de celebração via Web Audio

## Architecture decisions

- A aplicação é frontend-only por decisão do piloto; não há rotas de API nem cadastro.
- O estado de vendas é um banco SQLite executado via WASM e serializado no storage local do navegador para sobreviver a recargas e sincronizar abas.
- A rota `/tv` é o modo de exibição e `/controle` é o modo operador; ambas usam o mesmo estado local.
- A celebração de cada lançamento dura 10 segundos e o áudio é gerado pelo navegador, sem arquivo externo.

## Product

- Registra e desfaz vendas à vista, financiadas e de consórcio.
- Mostra totais, metas e progresso por categoria no painel de controle e no placar de TV.
- Permite configurar metas, resetar o dia com confirmação, entrar em tela cheia e ligar/desligar o som.

## User preferences

- O usuário pediu uma solução simples, sem backend e sem emojis na interface.

## Gotchas

- O áudio exige uma interação do usuário para ser desbloqueado por políticas do navegador.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
