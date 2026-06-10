# AURUM — Gold Intelligence Terminal

An institutional-grade macro intelligence terminal dedicated exclusively to **XAU/USD** gold.
React + Vite + TypeScript + TailwindCSS + Framer Motion. Frontend-only, GitHub Pages ready.

## Quick start
```bash
npm install
npm run dev      # local dev at http://localhost:5173
npm run build    # production build into /dist
npm run preview  # preview the production build
```

## Data integrity
- **Live price is real.** Spot XAU/USD is pulled from `gold-api.com`
  (`GET https://api.gold-api.com/price/XAU`) — free, no API key, CORS-enabled.
- **No simulated prices.** A tick is emitted only when the real price changes.
  Green/red flashes reflect genuine moves.
- **If the feed fails**, the ticker stops and shows `NO LIVE MARKET FEED CONNECTED`.
  No fallback or fabricated values are ever shown.
- Spot REST refreshes every few seconds (not true tick-by-tick) and provides a single
  spot value. Bid/Ask are shown as `mid ± displayed spread` and are labelled as such
  in the UI until a broker feed supplies real bid/ask.
- The macro cards, AI Overview, For You, Edge Factor, Capital Flow and News are
  **authored editorial analyst content** (in `src/data/intel.ts`) — not price data,
  not random-generated. Edit them as your macro view changes.

## Feed abstraction layer
The UI depends only on the `MarketFeed` interface (`src/feed/types.ts`), never on a
concrete provider.

| Provider          | File                       | Status      |
| ----------------- | -------------------------- | ----------- |
| gold-api.com spot | `src/feed/GoldApiFeed.ts`  | Live now    |
| VT Markets MT5    | `src/feed/Mt5BridgeFeed.ts`| Scaffolded  |

### Going live on VT Markets MT5
Topology: `VT Markets → MT5 terminal → Feed Bridge (your host) → WebSocket → dashboard`.

1. Stand up a small WebSocket relay that exports MT5 ticks as JSON:
   `{ "symbol": "XAU/USD", "bid": 4205.06, "ask": 4205.36, "time": 1733846400000 }`
2. In `src/hooks/useGoldFeed.ts`, change:
   ```ts
   const feed = createFeed('gold-api');
   // to:
   const feed = createFeed('mt5-bridge', { wsUrl: 'wss://your-mt5-bridge.example/ws' });
   ```
   Nothing in the UI changes. Bid/Ask/spread become true MT5 values automatically.

## Deploy to GitHub Pages
`vite.config.ts` uses `base: './'`, so the build works under any repo subpath.
```bash
npm run build
# push /dist to your gh-pages branch, or use a GitHub Action
```

## Customise
- **Logo:** the official brand mark is `public/aurum-logo.png` (used in sidebar,
  header, login page, and as the favicon). Replace that single file to rebrand;
  regenerate favicons from it if desired.
- **Colors / fonts:** `tailwind.config.js` (tokens) and `index.html` (Google Fonts).
- **Intelligence content:** `src/data/intel.ts`.
- **Session windows:** `src/data/sessions.ts`.

## Structure
```
src/
  feed/            MarketFeed interface + providers (gold-api, mt5 bridge) + selector
  hooks/           useGoldFeed — consumes feed, derives metrics, handles disconnect
  data/            sessions logic + authored intelligence content
  components/      Header, Sidebar, LiveTicker, Sessions, MacroDesk, EdgeFactor,
                   MarketMood, CapitalFlow, Intelligence, NewsTerminal, Journal,
                   Chart (TradingView), Sparkline, Brand, ui primitives
  App.tsx          layout composition
```


## Recent changes
- **No login.** The site opens directly into the terminal.
- **XAUUSD hero.** Large logo + XAUUSD title + giant live price occupy the
  above-the-fold area (`src/components/Hero.tsx`).
- **First-class TradingView chart** carries ~58% of the workspace
  (`src/components/Chart.tsx`).
- **Gold Driver Matrix** (`src/components/DriverMatrix.tsx`): always-on board of
  the seven gold drivers with direction, gold impact, strength and confidence.
  Readings live in `src/data/drivers.ts` (editorial until a macro feed is wired).
- **Dynamic AI Overview** (`src/data/analyst.ts`): regenerated on every tick from
  the real price stream — what changed / why / why it matters / what to watch.
  When the feed is down it says so and pauses; it never invents prices, and it
  does not fabricate live values for drivers it has no live feed for.


## Update — research-desk pass
- **Persistent terminal bar** (`src/components/TerminalBar.tsx`): top tape with
  XAUUSD (live), DXY, US10Y, US02Y, SPX, NASDAQ, VIX. Non-gold instruments show
  an explicit "no feed" state and accept live values without structural change.
- **Dominant XAUUSD hero** (`src/components/Hero.tsx`): oversized logo, title and
  live price occupying ~40% of the viewport.
- **Gold Bias Engine** (`src/data/bias.ts` + `src/components/BiasEngine.tsx`):
  outputs Strong Bullish → Strong Bearish with confidence %, reasoning and top
  drivers; recomputes automatically when price or drivers change.
- **Driver Matrix** is fully live-injection ready (`src/data/drivers.ts`):
  columns Value · Direction · Delta · Impact · Strength · Confidence, rendered
  from one model. Use `applyDriverFeed(seed, updates)` to push live macro data.
- **Reduced dashboard feel**: boxed cards/widgets removed; sections are open and
  separated by whitespace + hairline rules. Removed legacy EdgeFactor, MarketMood,
  CapitalFlow and MacroDesk components (superseded by the Bias Engine, Driver
  Matrix and dynamic AI Overview).

### Wiring a macro feed to the matrix & top tape
Both read from plain data models. Fetch your macro values (any CORS-friendly
source or your MT5 bridge), then map them by key onto `DRIVER_SEED` via
`applyDriverFeed`, and pass live instrument values into `TerminalBar`. The Bias
Engine and AI Overview consume the result automatically.
