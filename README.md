# WhoGoverns — Web

Frontend web application for **WhoGoverns**.

The goal is to provide an interactive world map to explore **who governs** by country and year, with filters and country-level pages including a political timeline, major political events, and contextual articles.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Backend API: FastAPI (Render)
- Database: PostgreSQL (Supabase)
- Hosting: Cloudflare Pages

## Environment variables (local)
Create a `.env.local` file at the project root:

```env
NEXT_PUBLIC_API_BASE=https://api.whogoverns.org
