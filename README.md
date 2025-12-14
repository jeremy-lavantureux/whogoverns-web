# WhoGoverns — Web

WhoGoverns is an open, data-driven project aiming to visualize political power across the world over time.

This repository contains the **frontend web application**, built with modern web technologies, that allows users to:
- explore an interactive world map
- visualize the ruling political parties by country and year
- filter by region and international groups
- access country-level timelines, political events, and contextual articles

## Scope (V1)
- World map visualization by year (1945–2025)
- Country-level pages with:
  - ruling party for the selected year
  - compressed political timeline
  - major political events
- API-first architecture (backend decoupled)
- Public, non-intrusive monetization (ads)

## Architecture
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend API: FastAPI
- Database: PostgreSQL (Supabase)
- Hosting & CDN: Cloudflare Pages + Cloudflare CDN

## Philosophy
- Neutral and factual presentation of political data
- Transparency in methodology
- Incremental and long-term approach

This project is under active development.
