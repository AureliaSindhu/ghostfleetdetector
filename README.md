# Ghost Fleet Detector

Mission-first maritime intelligence for vessels that go dark.

Ghost Fleet Detector turns AIS silence into an intelligence event. The dashboard keeps the map permanent, surfaces custody failures in a left-side detection feed, and gives operators a right-side mission panel for vessel detail, stats, data ingest, and an AI analyst.

## The Pitch

Every fusion system has the same blind spot.

They track what is there.
They lose what disappears.

A vessel is transmitting. Cooperative sensor data is flowing. Then the signal stops. It may be weather, hardware failure, spoofing, sanctions evasion, illegal fishing, or a ship-to-ship transfer. Most tools drop the track and leave an analyst with a gap in a logbook.

Ghost Fleet Detector treats that gap as signal.

We fuse absence. When AIS goes silent, the app turns the dark period into a custody event, estimates what happened while the vessel was missing, correlates the blackout with maritime risk factors, and produces an analyst-ready view of the threat.

## Why It Matters

Dark shipping is not a UI problem. It is a custody problem.

| Threat | Why AIS silence matters |
| --- | --- |
| Sanctions evasion | Shadow-fleet tankers can hide oil transfers and cargo origin laundering. |
| Illegal fishing | IUU fishing relies on disappearing in protected waters and contested EEZs. |
| Smuggling | Drugs, weapons, and human trafficking routes exploit gaps in maritime domain awareness. |
| Ship-to-ship transfers | Cargo can move between vessels while both tracks are ambiguous or missing. |
| Gray-zone operations | The adversary can win by making the track uncertain instead of invisible forever. |

The core idea is simple: most fusion systems combine data that exists. Ghost Fleet Detector analyzes the moment the data stops.

## What The App Does

1. Detects AIS blackout periods over a configurable time threshold.
2. Calculates last known position, reappearance position, gap duration, distance traveled, and implied speed.
3. Scores each event using duration, distance, high-risk geography, ship behavior, vessel type, and timing.
4. Correlates against weather, storm activity, sanctions context, and maritime risk zones.
5. Renders risk-colored arcs on a permanent map so the operator never loses the operational picture.
6. Lets the analyst drill into a selected vessel, inspect the reasoning, export results, save analyses, or ask the AI analyst for synthesis.

## Current UI

The redesigned interface is built for a live mission brief, not a tabbed analytics toy.

| Area | Purpose |
| --- | --- |
| Header | Mission counters: vessels, blackouts, critical, high, live state, export/save/reset/settings. |
| Permanent map | Always-on maritime picture with colored vessel blackout arcs and live monitoring overlay. |
| Left DETECTIONS panel | Risk filters, ranked contacts, and one-click vessel selection. |
| Right mission panel: Detail | Selected vessel summary: risk, score, blackout duration, distance, and reasons. |
| Right mission panel: Stats | Risk cards and distribution chart for quick analytic context. |
| Right mission panel: Data | AIS load, sample demo scan, database load, synthetic data generator, upload history. |
| Right mission panel: AI | Embedded AI analyst chat, styled to match the mission UI and scoped to the active detections. |

## The 3-Minute Win Run

Total format: 90 seconds pitch, 90 seconds demo.

Discipline: hands off the keyboard for the first 90 seconds. The pitch front-loads the story. The demo proves it.

### Stage Prep

- Browser open on the Ghost Fleet Detector dashboard.
- Empty state visible or dashboard reset.
- Sample demo data ready so the `DEMO` or `DEMO SCAN` button responds instantly.
- Map positioned for the South China Sea / high-risk maritime region.
- Top critical MMSI memorized.
- AI analyst fallback answer or screenshot ready in case the model response is slow.
- Know exactly where the right-panel tabs are: `Detail`, `Stats`, `Data`, `AI`.

### Pitch Script [0:00 - 1:30]

#### [0:00 - 0:15] Hook

Walk up. Pause. Eyes on judges.

> Every fusion system on the planet has the same blind spot.
>
> They track what is there.
>
> They lose what disappears.

#### [0:15 - 0:35] Problem

> A target is transmitting. Cooperative sensor - AIS, ADS-B, it does not matter. You have custody.
>
> Then it goes silent.
>
> Equipment failure? Weather? Or did the adversary flip a switch?
>
> Most systems shrug and drop the track. The contact becomes a question mark in a logbook.

#### [0:35 - 0:55] Drama

> In contested environments, that gap is where the fight happens.
>
> Russian shadow-fleet oil moves through these gaps.
>
> Illegal fishing hides in these gaps.
>
> Ship-to-ship transfers happen in these gaps.
>
> Every dark period is a custody failure. The adversary wins by default.

#### [0:55 - 1:15] Solution

Slow down.

> We built the fix.
>
> We fuse absence.
>
> When AIS goes silent, we treat the silence itself as a detection event. We preserve the last known state, calculate what happened across the blackout, correlate weather, geography, sanctions context, vessel behavior, and reappearance, then refine confidence as each signal arrives.
>
> The track does not die. It transitions.
>
> Custody, maintained.

#### [1:15 - 1:30] Pivot

Step toward the screen. Hand near keyboard.

> Three example missions in one interface: sanctions evasion, illegal fishing, and unreported maritime transfers.
>
> Working today. On AIS data.
>
> Watch.

On "Watch", click `DEMO` in the left panel or open `Data` and click `DEMO SCAN`.

### Demo Script [1:30 - 3:00]

#### [1:30 - 1:45] Beat 1 - Load

Action: click `DEMO` or `DEMO SCAN`. Let the counters populate.

Say:

> Real AIS-style vessel tracks. High-risk maritime region. The engine scans for custody failures and scores each dark period.
>
> The header gives us the mission picture: vessels monitored, blackout events, critical contacts, high-risk contacts.

Point to:

- Header counters.
- Left `DETECTIONS` panel.
- Critical and high filters.

#### [1:45 - 2:00] Beat 2 - Permanent Map

Action: keep the map visible. Do not navigate away from it.

Say:

> The map never leaves the screen. Each arc is a vessel that broke custody. Color is confidence. Red is critical. Orange is high.
>
> This is the operational advantage: the analyst sees the blackout pattern geographically, not just as rows in a table.

Point to:

- Red/orange arcs.
- Clustered region.
- Map controls and risk geography.

#### [2:00 - 2:35] Beat 3 - Drill Down

Action: click the top critical vessel in the left `DETECTIONS` panel. Keep the right panel on `Detail`.

Say:

> Top contact. High confidence. This is the custody failure turned into an intelligence object.
>
> Last known position. Reappearance position. Hours dark. Nautical miles traveled. Implied behavior while missing.
>
> Now the refinement loop: longer blackout raises risk. Significant movement raises risk. High-risk geography raises risk. Sanctions or watchlist context raises risk. Weather can reduce risk if the environment explains the silence.
>
> One event. Multiple signals. Confidence refined at every step.

Point to:

- Selected MMSI.
- Risk level.
- Score.
- Dark duration.
- Distance.
- Reason list.

#### [2:35 - 2:50] Beat 4 - AI Analyst

Action: click the `AI` tab in the right panel. Use `Summary` or ask: `Brief this selected threat for an operator.`

Say:

> Last layer: synthesis.
>
> The AI analyst turns the fused detections into operator language. The user gets the picture, not the pile.
>
> It is scoped to the active detection set, so the model is explaining this mission view, not hallucinating a generic maritime report.

If the response is slow:

> The live model call can take a moment, so the fallback is an analyst summary screenshot. The important point is the workflow: detection, refinement, synthesis.

#### [2:50 - 3:00] Close

Step back from the screen. Face the judges.

> Most teams build fusion for when sensors cooperate.
>
> We built the one that works when they do not.
>
> That is the version the warfighter actually needs.
>
> Questions?

## Choreography Rules

1. Pitch first, keyboard second. The first 90 seconds are voice only.
2. "Watch" is the trigger word. Click only on that word.
3. Talk over loading. Dead air makes the demo feel fragile.
4. Protect the drill-down. The selected vessel is the hero moment.
5. End with eye contact. The final three lines are for judges, not the screen.

## Three Lines To Memorize

1. "They lose what disappears."
2. "We fuse absence."
3. "We built the one that works when they do not."

## Scoring Model

Ghost Fleet Detector assigns each dark period a suspicion score from 0 to 100.

| Factor | Impact |
| --- | --- |
| Longer blackout duration | Raises suspicion. |
| Large distance traveled while dark | Raises suspicion. |
| High implied speed | Raises suspicion, especially if behavior looks physically implausible. |
| Known transshipment or high-risk zone | Raises suspicion. |
| Tanker or high-risk vessel type | Raises suspicion. |
| Nighttime disappearance | Raises suspicion. |
| Severe weather or storm overlap | Can reduce suspicion by explaining signal loss. |
| Sanctioned flag or watchlist context | Raises suspicion. |

Risk levels:

- `CRITICAL`: immediate investigation.
- `HIGH`: priority review.
- `MEDIUM`: monitor.
- `LOW`: likely benign, but retained for context.

## Data And Fusion Sources

| Source | Role |
| --- | --- |
| AIS records | Vessel position timeline and blackout detection. |
| Open-Meteo | Weather checks at blackout location and time. |
| NOAA storm context | Storm overlap and environmental explanation. |
| OpenSanctions-style context | Sanctions, watchlist, and flag-state risk. |
| Sentinel-style satellite workflow | Future/optional verification of vessel presence. |
| AI analyst | Natural-language synthesis for operators. |
| Supabase | Persistence for historical analyses and repeat-offender workflows. |

## Technical Stack

| Layer | Technology |
| --- | --- |
| App framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Mapping | deck.gl, Mapbox, react-map-gl |
| Charts | Recharts |
| CSV parsing | PapaParse |
| Database | Supabase |
| AI | OpenAI-compatible chat route |
| Email reports | Resend |

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key
SENTINEL_CLIENT_ID=your_sentinel_client_id
SENTINEL_CLIENT_SECRET=your_sentinel_secret
```

Run locally:

```bash
npm run dev
```

Build check:

```bash
npm run lint
npm run build
```

## Demo Checklist

Before walking on stage:

- Dashboard opens without console errors.
- `DEMO` loads instantly.
- Map renders with arcs.
- Top critical vessel is known.
- Right panel `Detail` shows selected vessel information.
- `Stats` tab shows risk distribution.
- `Data` tab can load demo/sample/generated data.
- `AI` tab is visible and styled with the current UI.
- Export button works.
- Backup screenshot for AI response is ready.

## Q&A Prep

| Question | Answer |
| --- | --- |
| What is novel? | We treat missing sensor data as the event. Most systems analyze detections; this analyzes disappearance. |
| Is this real-time capable? | Yes. The demo uses loaded AIS-style data, but the detection and scoring pipeline can sit behind a streaming AIS feed. |
| How do you reduce false positives? | We correlate the gap with weather, storms, geography, vessel behavior, and sanctions context instead of scoring duration alone. |
| What if AIS is spoofed? | Spoofing is another custody failure. The same workflow can add satellite or radar confirmation to compare claimed position with observed reality. |
| Why does this matter militarily? | Maritime domain awareness depends on custody. Losing the track lets adversaries move oil, cargo, fish, weapons, or people through uncertainty. |
| What is next? | Streaming feeds, rendezvous detection, satellite verification, alerting, and integration into existing command-and-control workflows. |

## One-Sentence Close

Ghost Fleet Detector is fusion for the moment sensors stop cooperating.
