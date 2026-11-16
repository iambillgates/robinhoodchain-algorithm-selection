# rhalgodetect — Robinhood Chain FOMO Radar

A live dashboard that watches **newly launched memecoins on Robinhood Chain**,
scores each one for momentum ("FOMO"), and shows a ranked table you can scan
at a glance. Click any contract address to copy it.

**Live demo:** https://rhalgodetect.vercel.app

> Viewer / scanner only. It never buys, sells, or connects a wallet.

## Features

- **Auto-refresh every 4 seconds** (pauses while the tab is hidden; START / STOP button)
- **FOMO score per token**, computed from age, buyer count, USD inflow, and liquidity
- **Market cap (FDV)** from DexScreener, plus an in-memory **all-time-high (ATH) tracker** —
  tokens trading at ≥ 90% of their ATH get a `NEAR ATH` badge
- **Search** by symbol or contract address
- **Filters:** max age (15 min / 1 hour / 2 hours), minimum score (> 20 / > 30 / > 50),
  display limit (15 / 50 items)
- **Volume column** (USD inflow) and **click-to-copy contract address**
- **Error banner** — if the upstream API is down or blocked, the failure is shown
  instead of a silent empty table

## How the FOMO score works

`GET /api/fomo?minutes=120` fetches the newest launches, scores them, drops
anything below the threshold, and returns the top 50 sorted by score.

| Signal | Rule | Points |
| --- | --- | --- |
| Age | launched < 15 min ago | +30 |
| Age | launched < 60 min ago | +15 |
| Age | launched > 120 min ago | −10 |
| Buyers | more than 5 buyers | +3 per buyer |
| USD inflow | `usd_in` > 2000 | +15 |
| Liquidity | liquidity > 1500 | +10 |

Only tokens scoring **≥ 20** are shown. Tokenized stocks (`is_stock = 1`, e.g. META)
are filtered out — this radar is for memecoins.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Production build:

```bash
npm run build
npm start
```

Requires Node.js 20+. No database, no auth, no API keys.

## Configuration

Optional — copy `.env.example` to `.env` only if you need to override the
upstream radar URL (for example if the upstream moves domain again):

```bash
cp .env.example .env
```

| Variable | Default | Description |
| --- | --- | --- |
| `RADAR_API_URL` | `https://rhtrenches.com/api/radar` | Full URL of the upstream new-launch radar API (no key needed) |

## Data sources

1. **Upstream radar API — `rhtrenches.com/api/radar`.** An unofficial
   third-party endpoint (not Robinhood's, not a documented public API). The
   app is fully dependent on it: if the site blocks the server IP or changes
   its response shape, the table shows an error instead of data.
2. **DexScreener — `api.dexscreener.com`** (free, no key). Used for FDV /
   market cap, fetched in batches of up to 30 token addresses per request.

## Known limitations

- **ATH is in-memory only.** The highest market cap per token is kept in a
  server-side `Map`, so it resets on every restart / redeploy, and on
  serverless hosting each function instance has its own map. There is no
  persistence yet.
- **No caching.** Every poll hits the upstream radar API and DexScreener
  directly (`cache: 'no-store'`).
- **Single upstream.** There is no fallback source if the radar API goes down.

## Tech stack

Next.js 16.3.4 (App Router) · React 19.2.8 · TypeScript (strict) ·
Tailwind CSS v4. Zero extra runtime dependencies.

## Disclaimer

This is a momentum scanner, not financial advice. Memecoins are extremely
volatile and most new launches lose most of their value quickly. Do your own
research, never invest more than you can afford to lose, and verify any
contract address on DexScreener before interacting with it.

## License

MIT — see [LICENSE](LICENSE).
