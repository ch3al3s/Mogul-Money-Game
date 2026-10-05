# MOGUL — The Money Race

Everyone starts with **$1,000,000**. Ten simulated years. Richest mogul wins.

A competitive investment simulator with a professional trading-app interface: buy anything on Earth — from a Lagos mainland flat to a Monaco sea-view penthouse, meme coins to football clubs — then simulate a decade of chaotic markets against your friends.

## How to play
Double-click `index.html`. No installs. Progress saves automatically in your browser.

First run: build your character (skin, hair, accessory, outfit, backdrop) and choose a username.

## The world
- **122 assets** across 6 categories, priced from real mid-2026 market data (gold ≈ $4,150/oz, Bitcoin-analog ≈ $62K, Lagos homes ≈ $200K, Monaco penthouses in the tens of millions, London flats ≈ £542K…).
- **Macro regimes** — each year the world is in Steady Expansion, Global Boom, Recession, Stagflation or Recovery Rally. Regimes persist and shift like real cycles, tilting every category's returns.
- **57 world events** — 2 to 4 hit every year: AI manias, oil shocks, Naira devaluations, sneaker bubbles, rugpull seasons, nightlife renaissances…
- **8 black swans** (~8% chance per year) — financial crises, pandemics, hyperinflation, AI singularities. Rare, massive, memorable.
- **Idiosyncratic shocks** — any single asset can randomly moon or crater in any year. No two seasons play alike.

## The interface
- **Dashboard** — net worth chart, allocation breakdown, last year's movers, headline feed.
- **Market** — searchable, sortable table of all 122 assets with 1-year change, price-trend sparklines and yields. Click any row for the full detail view: price history chart, volatility rating, your position and P&L, quick 25/50/Max sizing.
- **Portfolio** — positions with average cost, unrealized P&L, weights, and annual income.
- **Casino** — roulette, slots, and double-or-nothing streaks at The Golden Vault.
- **Rivals** — challenges and Mogul Cards.
- **Awards** — 14 achievements and your season history.

## Racing friends (no server needed)
- **Challenge codes** lock the market seed: you and your friend live the *exact same* ten years of regimes, events and shocks. Same luck — pure skill decides.
- **Mogul Cards** carry your name, character, net worth and ROI. Swap them to fill each other's leaderboards. Cards from the same market show a ⚔ badge.

## Project structure
```
mogul-money-race/
├── index.html      # app shell: sidebar, views, modals
├── css/style.css   # design system: tokens, tables, charts, avatar, casino
└── js/
    ├── data.js     # 122 assets · 57 events · 8 black swans · 5 regimes
    ├── engine.js   # seeded simulation, cost-basis trading, casino, codes
    ├── ui.js       # rendering: dashboard, market table, sparklines, modals
    └── main.js     # navigation, wiring, game flow
```

## Ideas for later
- Real-time online lobbies with a WebSocket server
- Loans, leverage and margin calls
- Dividends reinvestment automation
- Sound design
