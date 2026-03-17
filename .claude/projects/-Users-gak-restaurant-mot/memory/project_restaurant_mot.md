---
name: restaurant_mot_project
description: Core context for the Northline restaurant analytics SaaS project — stack, phases, features built, what's next
type: project
---

Northline is a B2B SaaS for independent restaurant operators. Next.js 16 App Router, Supabase (Postgres + Auth + RLS), Tailwind CSS v4, shadcn/ui, Recharts.

**Core features built:**
- Multi-tenant auth with org-based RLS
- 5-step file upload wizard (CSV/XLSX → restaurant_sales, restaurant_menu_items, restaurant_labour_shifts)
- Analytics dashboard (revenue, prime cost, margin, labour, alerts)
- Admin-controlled plan access system (free/premium) — see below

**Plan Access System (built 2026-03-17):**
- Migration: `supabase/migrations/0006_plan_access.sql`
  - `organizations.plan` ('free' | 'premium', default 'free')
  - `profiles.is_super_admin` (boolean, default false)
  - `upgrade_requests` table (org, user, status: pending/approved/rejected)
  - `notifications` table (user-level, type, read flag)
- Admin area at `/admin` — visible only to super_admin users via `SidebarNav`
  - `/admin` — overview stats
  - `/admin/organizations` — list all orgs + toggle Free/Premium
  - `/admin/users` — list all users + their org/plan/role
  - `/admin/requests` — approve or reject upgrade requests
- Dashboard: premium sections gated with `PremiumGate` component (blur + overlay)
  - Locked for free: Owner Summary, Operator Alerts, Prime Cost, Margin Leak, Labour
  - Free: Revenue overview, Menu Performance, Data Health
- Contact Sales modal (`components/contact-sales-modal.tsx`) — creates upgrade_request
- Notifications bell in sidebar — marks read, shows unread badge
- `/pricing` page — standalone page with free/premium tier comparison

**How to make a user super_admin:**
Run SQL: `UPDATE profiles SET is_super_admin = true WHERE id = '<user-uuid>';`

**Why:** To allow admin-controlled access without billing integration — manual upgrade approval via admin panel.
