# Automation Biz

Next.js app with Prisma + PostgreSQL.

## Local setup

1. Copy envs:

```bash
cp .env.example .env
```

2. Set a PostgreSQL `DATABASE_URL` in `.env`.
3. Apply schema and seed:

```bash
npm run db:push
npm run db:seed
```

4. Run the app:

```bash
npm run dev
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Create a hosted PostgreSQL database (Vercel Postgres, Neon, Supabase, Railway, etc).
4. In Vercel Project Settings -> Environment Variables, set:
   - `DATABASE_URL` (production Postgres URL)
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional, default is `gpt-5.2`)
   - `OPENAI_BASE_URL` (optional)
   - `OPENAI_ORG_ID` (optional)
   - `OPENAI_PROJECT` (optional)
   - `NEXT_PUBLIC_APP_URL` (your Vercel production URL)
5. Deploy once from Vercel.
6. Initialize database schema and seed data against production DB:

```bash
npx prisma db push
npx prisma db seed
```

Use the same production `DATABASE_URL` when running the commands above.
