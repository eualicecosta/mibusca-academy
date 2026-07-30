# Conhecimento iFood - MiBusca Brasil

Plataforma de ensino fechada usando:

- Next.js 15 App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui style components
- Framer Motion
- Lucide Icons
- Prisma ORM
- Supabase PostgreSQL
- Clerk
- Cloudflare R2 para imagens
- Vercel

## Fluxo de aprovacao

O Clerk autentica a identidade do usuario, mas nao libera conteudo sozinho.

Quando um usuario e criado no Clerk, o webhook `/api/webhooks/clerk` cria um `UserProfile` com status `PENDING`.

As rotas do aluno usam `requireApprovedStudent()`, que consulta o banco. Somente `status = ACTIVE` acessa `/dashboard`, `/curso` e aulas. `PENDING` ou `REFUSED` vai para `/aguardando-aprovacao`.

## Setup local

1. Crie um projeto no Supabase para o banco PostgreSQL.
2. Crie um projeto no Clerk.
3. Crie um bucket no Cloudflare R2 para as imagens.
4. Copie `.env.example` para `.env.local`.
5. Preencha as variaveis de banco, Clerk e R2.
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

## Variaveis de imagem

O app usa R2 para imagens novas e migradas:

```text
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

`R2_PUBLIC_BASE_URL` deve ser uma URL publica do bucket, como um dominio customizado ou URL publica `r2.dev`.

Durante a migracao, mantenha tambem as variaveis antigas do Supabase Storage:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=course-images
```

## Webhook do Clerk

No painel do Clerk, configure:

```text
https://SEU-DOMINIO/api/webhooks/clerk
```

Eventos necessarios:

- `user.created`
- `user.updated`
- `user.deleted`

Copie o signing secret para `CLERK_WEBHOOK_SECRET`.

## Conteudo inicial

O seed le:

```text
data/course_content.md
```

Ele popula:

- categorias
- modulos
- 29 aulas
- passos como `ContentBlock`
- checklist como `ChecklistItem`
- imagens sugeridas como caminhos de storage

## Imagens

As imagens ficam no Cloudflare R2 em pastas:

```text
geral/
banners/
categorias/
modulo-0/
modulo-1/
...
modulo-9/
```

O painel `/admin/imagens` envia arquivos para o bucket R2 e lista URLs publicas.

Para migrar imagens antigas do Supabase Storage para o R2:

```bash
npm run storage:migrate:r2
```

O script copia os arquivos para o R2 preservando caminhos e atualiza as referencias de imagem no banco para `R2_PUBLIC_BASE_URL`. Nao exclua o bucket antigo do Supabase antes de validar o app publicado.

## Deploy

No Vercel:

- importe o repositorio do GitHub
- configure as mesmas variaveis do `.env.local`
- use `npm run build`
- rode as migracoes/seed quando necessario apontando para o banco Supabase
