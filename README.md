# 🚢 Ghost Fleet Detector

> **Detecting ships that "go dark" to evade sanctions, smuggle cargo, and fish illegally.**

## 🎯 The Problem

Every commercial vessel over 300 tons must broadcast its position via AIS. But ships doing illegal things **intentionally turn off their transponders**:

- **Sanctions Evasion** — Russian/Iranian tankers hiding oil transfers ($Billions)
- **Illegal Fishing (IUU)** — $23B/year global problem, linked to forced labor
- **Smuggling** — Drugs, weapons, human trafficking
- **Ship-to-Ship Transfers** — Hiding cargo origins to bypass restrictions

## 💡 Our Approach

Most sensor analysis fuses data that exists. **We detect ABSENCE** — finding patterns in missing data.

```
──●────●────●────○────○────○────●────●──
  ^transmitting  ^DARK 3 days  ^back online
                 Score: 85/100 🚨
```

## 🚀 Quick Start

1. Clone the repo
2. Install dependencies: `npm install`
3. Create `.env.local` in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
   OPENAI_API_KEY=your_openai_api_key              # optional - for AI chat assistant
   RESEND_API_KEY=your_resend_api_key              # optional - for email reports
   SENTINEL_CLIENT_ID=your_sentinel_client_id      # optional - for satellite imagery
   SENTINEL_CLIENT_SECRET=your_sentinel_secret     # optional - for satellite imagery
   ```
4. Set up Supabase:
   ```bash
   brew install supabase/tap/supabase   # macOS/Linux
   supabase login
   supabase link --project-ref your-project-ref
   supabase db push
   ```
5. Run dev server: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000)

## 📡 Data Sources

| Source | Purpose | Cost |
|--------|---------|------|
| 🗄️ Supabase | Database & Auth | FREE (500MB) |
| 🚢 Kaggle AIS | Vessel positions | FREE |
| 🌤️ Open-Meteo | Weather correlation | FREE |
| 🚫 OpenSanctions | Sanctions check | FREE |
| ⛈️ NOAA NHC | Storm data | FREE |
| 🛰️ Sentinel Hub | Satellite imagery | FREE tier |
| 🗺️ Mapbox | Map rendering | FREE tier |
| 🤖 Anthropic Claude | AI intel reports | Pay per use |

## 🎯 Features

- **Dark period detection** — finds AIS gaps exceeding a configurable threshold
- **Multi-factor suspicion scoring** — duration, distance, transshipment zones, implied speed, ship type, time of day
- **Weather-adjusted risk** — severe weather reduces suspicion score
- **Storm correlation** — NOAA storm data explains legitimate dark periods
- **Sanctions integration** — OpenSanctions API + sanctioned flag state lookup
- **Satellite imagery** — Sentinel Hub verification of dark period locations
- **Interactive map** — deck.gl scatter + arc layers with tooltips
- **Charts** — risk distribution pie chart and duration histogram
- **AI intel reports** — Claude-generated intelligence summaries
- **CSV export** — download results for offline analysis
- **Demo mode** — sample South China Sea / Strait of Hormuz data

## 🏗️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Maps | deck.gl + react-map-gl |
| Charts | Recharts |
| CSV Parsing | PapaParse |
| AI | Anthropic Claude |

## 🎤 Pitch

> "Every ship over 300 tons must broadcast its position. But ships doing illegal things — sanctions evasion, smuggling, illegal fishing — turn off their transponders to hide. This is a $23 billion problem. We detect them by finding patterns in MISSING data."
