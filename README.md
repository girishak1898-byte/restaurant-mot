# Northline

**Know your numbers. Stay on course.**

Northline is a B2B SaaS for restaurant operators. Upload your sales, menu, and labour data and get a clean analytics dashboard — prime cost, margin leak, revenue trends, and labour efficiency — without needing a data team.

## Current vertical

**Northline for Restaurants** — the first module. Property and other verticals are planned.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Supabase](https://supabase.com) — Auth, Postgres, RLS, Storage
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org) — data visualisation
- [SheetJS](https://sheetjs.com) — CSV / Excel parsing

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` to `.env.local` and fill in your Supabase project URL and anon key.

## Database

Migrations are in `supabase/migrations/`. Run them against your Supabase project in order:

1. `0001_common_tables.sql` — organisations, memberships, uploads, import jobs
2. `0002_restaurant_tables.sql` — sales, menu items, labour shifts
3. `0003_rls_policies.sql` — row-level security policies
