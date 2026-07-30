# Conhecimento iFood - MiBusca Brasil

Plataforma de ensino fechada usando o stack do blueprint técnico v2:

- Next.js 15 App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui style components
- Framer Motion
- Lucide Icons
- Prisma ORM
- Supabase PostgreSQL
- Clerk
- Supabase Storage
- Vercel-ready

## Fluxo de aprovação

O Clerk autentica a identidade do usuário, mas não libera conteúdo.

Quando um usuário é criado no Clerk, o webhook `/api/webhooks/clerk` cria um `UserProfile` com status `PENDING`.

As rotas do aluno usam `requireApprovedStudent()`, que consulta o banco. Somente `status = ACTIVE` acessa `/dashboard`, `/curso` e aulas. `PENDING` ou `REFUSED` vai para `/aguardando-aprovacao`.

## Setup local

1. Crie um projeto no Supabase.
2. Crie um projeto no Clerk.
3. Copie `.env.example` para `.env`.
4. Preencha:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET`
5. Crie no Supabase Storage o bucket definido em `SUPABASE_STORAGE_BUCKET`, por padrão `course-images`.
6. Depois de criar sua conta admin no Clerk, copie o `user_...` para `ADMIN_CLERK_ID`.

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run db:seed
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Webhook do Clerk

No painel do Clerk, configure o endpoint:

```text
https://SEU-DOMINIO/api/webhooks/clerk
```

Eventos necessários:

- `user.created`
- `user.updated`
- `user.deleted`

Copie o signing secret para `CLERK_WEBHOOK_SECRET`.

## Conteúdo inicial

O seed lê:

```text
data/course_content.md
```

Ele popula:

- 10 módulos
- 29 aulas
- passos como `ContentBlock`
- checklist como `ChecklistItem`
- imagens sugeridas como caminho de Storage

## Imagens

As imagens ficam no Supabase Storage em pastas:

```text
geral/
modulo-0/
modulo-1/
...
modulo-9/
```

O painel `/admin/imagens` envia arquivos para o bucket e lista URLs públicas.

## Validação feita

- `npm run prisma:generate`: OK
- `npm run typecheck`: OK
- `npm run build`: compila, mas o Clerk bloqueia o build sem uma `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` real.

## Deploy

No Vercel:

- importe o repositório do GitHub
- configure as mesmas variáveis do `.env`
- use o build command padrão `npm run build`
- depois rode `npm run prisma:push` e `npm run db:seed` apontando para o banco Supabase
