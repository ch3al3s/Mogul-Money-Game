// ============ MOGUL: THE MONEY RACE — ENGINE (v2) ============
"use strict";

const SAVE_KEY = "mogul_save_v2";
let S = null;

// ---------- world resolution (v4) ----------
// The tradable universe is derived from the season: worldV 2 seasons generate a
// fictional world from the seed (see worldgen.js); older saves keep the static
// catalog in data.js. W is a cache — reset whenever the season changes.
let W = null;
function currentWorld() {
  if (!W) W = (S && S.season && S.season.worldV === 2) ? generateWorld(S.season.seed) : legacyWorld();
  return W;
}
function resetWorld() { W = null; }
function worldAssets() { return currentWorld().assets; }
function worldAsset(id) { return currentWorld().byId[id]; }
function worldCountries() { return currentWorld().countries; }
// listed = tradable this season-year (IPOs join the market at their listYear)
function listedAssets() {
  const y = S.season.year;
  return worldAssets().filter(a => (a.listYear || 0) <= y);
}
function supplyLeft(id) {
  const a = worldAsset(id);
  if (!a || !a.supply) return Infinity;
  return Math.max(0, a.supply - posQty(id));
}
function tierLocked(id) {
  const a = worldAsset(id);
  return !!(a && a.tier && netWorth() < TIER_REQ[a.tier]);
}

// ---------- seeded RNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function yearRng(seed, year) { return mulberry32((seed ^ Math.imul(year + 1, 2654435761)) >>> 0); }
function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- state ----------
function newSeason(seed) {
  seed = seed >>> 0;
  const world = generateWorld(seed);
  const prices = {}, hist = {};
  for (const a of world.assets) {
    if (a.listYear) continue; // IPOs join the market later
    prices[a.id] = a.price; hist[a.id] = [a.price];
  }
  return {
    seed,
    worldV: 2,                   // v4: seed-generated world (legacy saves: 1)
    year: 0,
    cash: START_CASH,
    holdings: {},                // assetId -> { qty, cost }  (cost = total $ paid)
    prices,
    hist,                        // assetId -> [price per year]
    regime: "expansion",
    nwHistory: [START_CASH],
    log: [],                     // [{year, regime, headlines, income, nwBefore, nwAfter}]
    trades: [],                  // v3: [{t:"buy"|"sell", id, qty, price, year}] — cosmetic, insights only
    debt: 0,                     // v10: margin loan balance
    missions: null,              // v10: { order, done, active } — seeded lazily
    lifeLog: [],                 // v15: [{year, text}] — BitLife-style life choices
    eventsSeen: [],              // v15: event ids already fired this life
    mstats: { rep: 50, cun: 50, vit: 62, inf: 40 }, // v17: the four Mogul stats (0–100)
    finished: false,
    fromChallenge: false,
  };
}

function defaultState() {
  return {
    profile: { name: "", avatar: defaultAvatar() },
    season: newSeason((Math.random() * 0xffffffff) >>> 0),
    bestScore: 0,
    pastSeasons: [],
    rivals: [],
    achievements: [],
    stats: { casinoNet: 0, bestStreak: 0, yearsTotal: 0, biggestGain: 0, biggestLoss: 0, biggestWin: 0, chipsRisked: 0 },
    lastSeen: Date.now(),        // v7: away-market anchor
    settings: { muted: false, accent: "indigo", felt: "emerald", cardBack: "classic", room: "midnight" },  // v3 + v8 + v13 style
    watchlist: [],               // v3: starred asset ids
    flags: { tourDone: false, titleIdx: 0, dailyChipsAt: 0 },  // v3 + v9 + v14
  };
}

// v3 fields land with defaults so v2 saves keep loading untouched.
function migrate() {
  const d = defaultState();
  S.stats = Object.assign(d.stats, S.stats || {});
  S.settings = Object.assign(d.settings, S.settings || {});
  S.flags = Object.assign(d.flags, S.flags || {});
  if (!Array.isArray(S.watchlist)) S.watchlist = [];
  if (S.season && !Array.isArray(S.season.trades)) S.season.trades = [];
  if (S.season && S.season.worldV === undefined) S.season.worldV = 1; // pre-v4 static catalog
  if (typeof S.lastSeen !== "number") S.lastSeen = Date.now();         // v7: away-market anchor
  if (S.season && typeof S.season.debt !== "number") S.season.debt = 0; // v10
  if (S.season && S.season.missions === undefined) S.season.missions = null;
  if (S.season && !Array.isArray(S.season.lifeLog)) S.season.lifeLog = [];       // v15
  if (S.season && !Array.isArray(S.season.eventsSeen)) S.season.eventsSeen = []; // v15
  if (S.season && (!S.season.mstats || typeof S.season.mstats.rep !== "number"))  // v17
    S.season.mstats = { rep: 50, cun: 50, vit: 62, inf: 40 };
  resetWorld();
  reconcileSeason(); // v11: adopt assets added to worldgen since this season began
}

// When worldgen gains new asset slots between app versions, older generated
// seasons won't have price entries for them. Fold them in at their base price
// so the world upgrade is seamless instead of a crash.
function reconcileSeason() {
  if (!S || !S.season || S.season.worldV !== 2) return;
  const sn = S.season;
  for (const a of worldAssets()) {
    if ((a.listYear || 0) <= sn.year && !(a.id in sn.prices)) {
      sn.prices[a.id] = a.price;
      sn.hist[a.id] = [a.price];
    }
  }
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { S = Object.assign(defaultState(), JSON.parse(raw)); migrate(); return true; }
    // migrate v1 → keep profile & rivals if present
    const old = localStorage.getItem("mogul_save_v1");
    if (old) {
      const o = JSON.parse(old);
      S = defaultState();
      if (o.profile) S.profile = Object.assign(S.profile, o.profile);
      if (o.achievements) S.achievements = o.achievements;
      if (o.bestScore) S.bestScore = o.bestScore;
      save();
      return !!S.profile.name;
    }
  } catch (e) {}
  S = defaultState();
  resetWorld();
  return false;
}

// ---------- portfolio math ----------
function posQty(id) { return S.season.holdings[id] ? S.season.holdings[id].qty : 0; }
function posCost(id) { return S.season.holdings[id] ? S.season.holdings[id].cost : 0; }
function posValue(id) { return posQty(id) * S.season.prices[id]; }
function posPnL(id) { return posValue(id) - posCost(id); }
function holdingsValue() {
  let v = 0;
  for (const id in S.season.holdings) v += posValue(id);
  return v;
}
function totalCost() {
  let c = 0;
  for (const id in S.season.holdings) c += posCost(id);
  return c;
}
function netWorth() { return S.season.cash + holdingsValue() - (S.season.debt || 0); }
function roi() { return (netWorth() / START_CASH - 1) * 100; }
function annualIncome() {
  let inc = 0;
  for (const id in S.season.holdings) inc += posValue(id) * ((worldAsset(id) || {}).yield || 0);
  return inc;
}
function lastReturn(id) {
  const h = S.season.hist[id];
  if (!h || h.length < 2) return null;
  return h[h.length - 1] / h[h.length - 2] - 1;
}
function catAllocation() {
  const alloc = {};
  for (const c in CATEGORIES) alloc[c] = 0;
  for (const id in S.season.holdings) {
    const a = worldAsset(id);
    if (a) alloc[a.cat] += posValue(id);
  }
  return alloc;
}

// ---------- LIVE MARKET (v7) ----------
// Between simulated years, prices drift in real wall-clock time so the market
// never sleeps. The drift is DETERMINISTIC per (seed, year, asset, hour) and
// oscillates around the canonical year price in sn.prices — it never feeds
// back into simulateYear()'s path, so seed determinism and challenge fairness
// are untouched. Trades fill at the live price the player sees.
const LIVE_TICK_MS = 3600000; // one drift tick per hour
function liveBucket(t) { return Math.floor((t ?? Date.now()) / LIVE_TICK_MS); }
function driftNoise(id, bucket) { // deterministic hash → [-1, 1]
  let h = (S.season.seed ^ Math.imul(S.season.year + 1, 2654435761)) >>> 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h = Math.imul(h ^ bucket, 2246822519);
  h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}
function driftFactor(id, t) {
  const a = worldAsset(id);
  if (!a) return 1;
  const now = t ?? Date.now();
  const b = liveBucket(now);
  const frac = (now % LIVE_TICK_MS) / LIVE_TICK_MS;
  // interpolate between hour ticks so prices glide instead of stepping
  const n = driftNoise(id, b) * (1 - frac) + driftNoise(id, b + 1) * frac;
  const amp = Math.min(0.12, Math.max(0.004, (a.sigma || 0.2) * 0.10));
  return 1 + n * amp;
}
function livePrice(id, t) { return (S.season.prices[id] || 0) * driftFactor(id, t); }
function liveValue(id, t) { return posQty(id) * livePrice(id, t); }
function liveHoldingsValue(t) {
  let v = 0;
  for (const id in S.season.holdings) v += liveValue(id, t);
  return v;
}
function liveNetWorth(t) { return S.season.cash + liveHoldingsValue(t) - (S.season.debt || 0); }

// What happened while you were gone: per-holding drift delta between two instants.
function awayReport(thenT, nowT) {
  const rows = [];
  let total = 0;
  for (const id in S.season.holdings) {
    const a = worldAsset(id);
    if (!a) continue;
    const delta = liveValue(id, nowT) - liveValue(id, thenT);
    total += delta;
    rows.push({ id, name: a.name, emoji: a.emoji, delta });
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { total, rows };
}

// ---------- trading ----------
function maxAffordable(id) {
  const byCash = Math.floor(S.season.cash / livePrice(id));
  return Math.min(byCash, supplyLeft(id));
}

function buyAsset(id, qty) {
  qty = Math.max(0, Math.floor(qty));
  const a = worldAsset(id);
  if (!a || !(id in S.season.prices)) return false;          // unknown or not yet listed
  if (tierLocked(id)) return false;                          // net-worth gate
  qty = Math.min(qty, supplyLeft(id));                       // scarce assets sell out
  const cost = livePrice(id) * qty;                          // fills at the live quote
  if (qty === 0 || cost > S.season.cash + 1e-6 || S.season.finished) return false;
  S.season.cash -= cost;
  if (!S.season.holdings[id]) S.season.holdings[id] = { qty: 0, cost: 0 };
  S.season.holdings[id].qty += qty;
  S.season.holdings[id].cost += cost;
  if (Array.isArray(S.season.trades)) S.season.trades.push({ t: "buy", id, qty, price: livePrice(id), year: S.season.year });
  unlock("firsttrade");
  checkHoldingAchievements();
  save();
  return true;
}

function sellAsset(id, qty) {
  const pos = S.season.holdings[id];
  if (!pos || S.season.finished) return 0;
  qty = Math.min(pos.qty, Math.max(0, Math.floor(qty)));
  if (qty === 0) return 0;
  const proceeds = livePrice(id) * qty * 0.99; // 1% broker fee, filled at the live quote
  if (Array.isArray(S.season.trades)) S.season.trades.push({ t: "sell", id, qty, price: livePrice(id), year: S.season.year });
  pos.cost *= (pos.qty - qty) / pos.qty;             // reduce basis proportionally
  pos.qty -= qty;
  if (pos.qty <= 0) delete S.season.holdings[id];
  S.season.cash += proceeds;
  save();
  return proceeds;
}

// ---------- event matching ----------
function eventMatches(m, asset) {
  if (!m) return false;
  if (m.all) return true;
  if (m.cats && m.cats.includes(asset.cat)) return true;
  if (m.region && asset.region === m.region) return true;
  if (m.tag && asset.tag === m.tag) return true;
  if (m.ids && m.ids.includes(asset.id)) return true;
  return false;
}

// ---------- the yearly simulation ----------
function pickDistinct(pool, n, rng) {
  const idx = pool.map((_, i) => i), out = [];
  for (let k = 0; k < n && idx.length; k++) {
    const i = Math.floor(rng() * idx.length);
    out.push(pool[idx[i]]);
    idx.splice(i, 1);
  }
  return out;
}

function stepRegime(current, rng) {
  const flow = REGIME_FLOW[current] || REGIME_FLOW.expansion;
  let r = rng();
  for (const [next, p] of flow) {
    r -= p;
    if (r <= 0) return next;
  }
  return flow[0][0];
}

function simulateYear() {
  if (S.season.finished) return null;
  const sn = S.season;
  sn.year++;
  const rng = yearRng(sn.seed, sn.year);

  // 1) macro regime shifts
  sn.regime = stepRegime(sn.regime, rng);
  const regime = REGIMES[sn.regime];

  // 2) events: 2-4 normal + ~8% chance of a black swan
  const nEvents = 2 + Math.floor(rng() * 3);
  const picked = pickDistinct(EVENTS, nEvents, rng);
  let swan = null;
  if (rng() < 0.08) {
    swan = BLACK_SWANS[Math.floor(rng() * BLACK_SWANS.length)];
    picked.push(swan);
  }
  const evMags = picked.map(ev => ({
    ev,
    mag: ev.min + rng() * (ev.max - ev.min),
    alsoMag: ev.also ? ev.also.min + rng() * (ev.also.max - ev.also.min) : 0,
  }));

  // 3) returns per asset — fixed world order, deterministic per seed+year.
  //    The asset list itself derives from the seed (worldgen), so the whole
  //    market path is still a pure function of (seed, year).
  const nwBefore = netWorth();
  const returns = {};
  const listings = []; // IPOs joining the market this year
  for (const a of worldAssets()) {
    if ((a.listYear || 0) > sn.year) continue;      // not listed yet
    if (!(a.id in sn.prices)) {                     // lists this year
      sn.prices[a.id] = a.price;
      sn.hist[a.id] = [a.price];
      listings.push(a);
    }
    let r = a.mu + (regime.adj[a.cat] || 0) + a.sigma * randn(rng);
    for (const { ev, mag, alsoMag } of evMags) {
      if (eventMatches(ev.match, a)) r += mag;
      else if (eventMatches(ev.also, a)) r += alsoMag;
    }
    // idiosyncratic shock: ~4% chance of an asset-specific jump
    if (rng() < 0.04) r += (rng() < 0.5 ? -1 : 1) * (0.2 + rng() * 0.6) * Math.min(2, 0.5 + a.sigma);
    r = Math.max(-0.95, Math.min(8, r));
    returns[a.id] = r;
    sn.prices[a.id] = Math.max(a.price * 0.0005, sn.prices[a.id] * (1 + r));
    sn.hist[a.id].push(sn.prices[a.id]);
  }

  // 4) yield income at new prices
  let income = 0;
  for (const id in sn.holdings) income += posValue(id) * ((worldAsset(id) || {}).yield || 0);
  sn.cash += income;

  // v10: the bank charges interest, then checks its margin
  let marginCalls = [];
  if (sn.debt > 0) {
    sn.debt = Math.round(sn.debt * (1 + LOAN_RATE));
    marginCalls = marginCheck(sn);
  }

  const nwAfter = netWorth();
  sn.nwHistory.push(nwAfter);
  const entry = {
    year: sn.year,
    regime: sn.regime,
    headlines: picked.map(e => e.text),
    income: Math.round(income),
    nwBefore: Math.round(nwBefore),
    nwAfter: Math.round(nwAfter),
  };
  sn.log.push(entry);

  // v3 career stats — pure bookkeeping, no rng draws
  const chg = entry.nwAfter - entry.nwBefore;
  S.stats.yearsTotal = (S.stats.yearsTotal || 0) + 1;
  if (chg > (S.stats.biggestGain || 0)) S.stats.biggestGain = chg;
  if (chg < (S.stats.biggestLoss || 0)) S.stats.biggestLoss = chg;

  // v17: annual Mogul-stat drift — derived from this year's outcome only, NO rng
  // draws, so the price path stays a pure function of (seed, year).
  {
    const age = START_AGE + sn.year;
    // Vitality erodes with age; nothing but rest (life events) restores it.
    bumpMogulStat("vit", -(0.15 + Math.max(0, age - 50) * 0.015));
    // Cunning tracks whether you actually grew the pile this year.
    const growth = nwBefore > 0 ? nwAfter / nwBefore : 1;
    if (growth > 1.05) bumpMogulStat("cun", 0.5);
    else if (growth < 0.97) bumpMogulStat("cun", -0.5);
    // Leverage and forced sales bruise your reputation.
    if (marginCalls.length) bumpMogulStat("rep", -3);
    else if (sn.debt > 0) bumpMogulStat("rep", -0.3);
    // Influence quietly compounds with the scale of your empire.
    if (nwAfter >= 250e6) bumpMogulStat("inf", 0.7);
    else if (nwAfter >= 50e6) bumpMogulStat("inf", 0.4);
    else if (nwAfter < 100000) bumpMogulStat("inf", -0.5);
  }

  // achievements
  if (swan) unlock("blackswan");
  const holdsRug = Object.keys(sn.holdings).some(id => (worldAsset(id) || {}).arch === "rug");
  if (holdsRug && picked.some(e => e.match && e.match.tag === "rug")) unlock("survivor");
  checkWealthAchievements();
  if (netWorth() < 10000) unlock("broke");

  if (sn.year >= SEASON_YEARS) {
    sn.finished = true;
    unlock("decade");
    const final = Math.round(nwAfter);
    S.bestScore = Math.max(S.bestScore, final);
    S.pastSeasons.push({ seed: sn.seed, finalNW: final, roi: Math.round(roi()), when: Date.now() });
  }
  save();

  const sorted = Object.entries(returns).sort((a, b) => b[1] - a[1]);
  return {
    entry,
    regime,
    events: picked,
    swan,
    listings,                    // v4: IPOs that joined the market this year
    marginCalls,                 // v10: forced liquidations, if the bank came knocking
    best: sorted.slice(0, 5),
    worst: sorted.slice(-5).reverse(),
    returns,
    finished: sn.finished,
  };
}

function startNewSeason(seed, fromChallenge = false) {
  S.season = newSeason(seed ?? ((Math.random() * 0xffffffff) >>> 0));
  S.season.fromChallenge = fromChallenge;
  resetWorld();
  save();
}

// ---------- casino ----------
function casinoBet(amount) {
  amount = Math.floor(amount);
  if (!(amount > 0) || amount > S.season.cash) return null;
  S.season.cash -= amount;
  S.stats.chipsRisked = (S.stats.chipsRisked || 0) + amount; // v14: Risk IQ
  bumpMogulStat("vit", -0.05); // v17: late nights at the table take a small toll
  return amount;
}
function casinoPayout(amount) {
  S.season.cash += amount;
  S.stats.casinoNet += amount;
  if (amount > (S.stats.biggestWin || 0)) { // v14: Risk IQ — a new personal-best win
    S.stats.biggestWin = amount;
    bumpMogulStat("cun", 1.5); bumpMogulStat("rep", 1); // v17: a legendary win precedes you
  }
  if (S.stats.casinoNet >= 100000) unlock("highroller");
  save();
}

// v14: daily virtual-chip faucet — purely cosmetic top-up (no real money)
function claimDailyChips() {
  const now = Date.now();
  const last = (S.flags && S.flags.dailyChipsAt) || 0;
  const cooldown = 20 * 3600 * 1000;
  if (now - last < cooldown) return { ok: false, wait: cooldown - (now - last) };
  const amount = 50000;
  S.season.cash += amount;
  S.flags.dailyChipsAt = now;
  save();
  return { ok: true, amount };
}
function dailyChipsReady() {
  const last = (S.flags && S.flags.dailyChipsAt) || 0;
  return Date.now() - last >= 20 * 3600 * 1000;
}

// v14: Dice — two dice, bet over/under 7 (×2) or exactly 7 (×5)
function playDice(bet, pick) {
  const staked = casinoBet(bet);
  if (staked === null) return { error: "Not enough chips." };
  S.stats.casinoNet -= staked;
  const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6), sum = d1 + d2;
  let mult = 0;
  if (pick === "over" && sum > 7) mult = 2;
  else if (pick === "under" && sum < 7) mult = 2;
  else if (pick === "seven" && sum === 7) mult = 5;
  const winnings = Math.round(staked * mult);
  if (winnings) casinoPayout(winnings);
  save();
  return { d1, d2, sum, winnings, staked, pick };
}

// v14: Crash — a rising multiplier; cash out before it breaks
let cr = null;
function crashStart(bet) {
  const staked = casinoBet(bet);
  if (staked === null) return { error: "Not enough chips." };
  S.stats.casinoNet -= staked;
  // house edge ~1%: crash point cp = 0.99/(1-r), clamped [1, 40]
  const r = Math.random();
  let cp = 0.99 / Math.max(1e-6, 1 - r);
  cp = Math.max(1, Math.min(40, cp));
  cr = { staked, cp: +cp.toFixed(2), cashed: false };
  save();
  return { staked, crashPoint: cr.cp };
}
function crashCashout(m) {
  if (!cr || cr.cashed) return null;
  if (m >= cr.cp) return null; // too late — already crashed
  cr.cashed = true;
  const winnings = Math.round(cr.staked * m);
  casinoPayout(winnings);
  cr = null;
  return { winnings, at: +m.toFixed(2) };
}
function crashBust() {
  if (!cr || cr.cashed) { cr = null; return null; }
  const cp = cr.cp;
  cr = null;
  save();
  return { crashPoint: cp };
}

function playRoulette(bet, pick) {
  const staked = casinoBet(bet);
  if (staked === null) return { error: "Not enough cash." };
  S.stats.casinoNet -= staked;
  const n = Math.floor(Math.random() * 37);
  const color = n === 0 ? "green" : n % 2 === 1 ? "red" : "black";
  // outside bets, standard table rules (zero beats everything except green)
  const hit = {
    red: color === "red", black: color === "black", green: n === 0,
    odd: n !== 0 && n % 2 === 1, even: n !== 0 && n % 2 === 0,
    low: n >= 1 && n <= 18, high: n >= 19 && n <= 36,
    d1: n >= 1 && n <= 12, d2: n >= 13 && n <= 24, d3: n >= 25 && n <= 36,
  }[pick];
  const mult = pick === "green" ? 36 : (pick === "d1" || pick === "d2" || pick === "d3") ? 3 : 2;
  const winnings = hit ? staked * mult : 0;
  if (winnings) casinoPayout(winnings);
  save();
  return { n, color, winnings, staked };
}

const SLOT_EMOJI = ["🍒", "🍋", "🔔", "⭐", "💎"];
function playSlots(bet) {
  const staked = casinoBet(bet);
  if (staked === null) return { error: "Not enough cash." };
  S.stats.casinoNet -= staked;
  const reels = [0, 0, 0].map(() => SLOT_EMOJI[Math.floor(Math.random() * SLOT_EMOJI.length)]);
  let mult = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) mult = reels[0] === "💎" ? 20 : 8;
  else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) mult = 1.6;
  const winnings = Math.round(staked * mult);
  if (winnings) casinoPayout(winnings);
  save();
  return { reels, winnings, staked };
}

let coinPot = 0, coinStreak = 0;
function coinFlip(bet) {
  if (coinPot === 0) {
    const staked = casinoBet(bet);
    if (staked === null) return { error: "Not enough cash." };
    S.stats.casinoNet -= staked;
    coinPot = staked;
  }
  const win = Math.random() < 0.5;
  if (win) {
    coinPot *= 2;
    coinStreak++;
    S.stats.bestStreak = Math.max(S.stats.bestStreak, coinStreak);
    if (coinStreak >= 5) unlock("streak5");
  } else { coinPot = 0; coinStreak = 0; }
  save();
  return { win, pot: coinPot, streak: coinStreak };
}
function coinCashout() {
  if (coinPot <= 0) return 0;
  const amount = coinPot;
  casinoPayout(amount);
  coinPot = 0; coinStreak = 0;
  return amount;
}

// ---------- THE BANK (v10): margin loans ----------
function loanCapacity() {
  return Math.max(0, Math.floor(netWorth() * LOAN_LTV - (S.season.debt || 0)));
}
function borrow(amount) {
  amount = Math.floor(amount);
  if (!(amount > 0) || S.season.finished) return 0;
  amount = Math.min(amount, loanCapacity());
  if (amount <= 0) return 0;
  S.season.debt = (S.season.debt || 0) + amount;
  S.season.cash += amount;
  save();
  return amount;
}
function repay(amount) {
  amount = Math.floor(Math.min(amount, S.season.cash, S.season.debt || 0));
  if (!(amount > 0)) return 0;
  S.season.debt -= amount;
  S.season.cash -= amount;
  save();
  return amount;
}
// year-end margin check — deterministic: worst performers liquidated first at a haircut
function marginCheck(sn) {
  const calls = [];
  if (!(sn.debt > 0)) return calls;
  const gross = () => sn.cash + holdingsValue();
  if (sn.debt <= gross() * MARGIN_CALL_AT) return calls;
  const order = Object.keys(sn.holdings).sort((a, b) => (lastReturn(a) ?? 0) - (lastReturn(b) ?? 0));
  for (const id of order) {
    if (sn.debt <= gross() * (MARGIN_CALL_AT - 0.15)) break; // liquidate down to a safe buffer
    const qty = posQty(id);
    const proceeds = sn.prices[id] * qty * FIRE_SALE_HAIRCUT;
    sn.holdings[id].cost = 0;
    delete sn.holdings[id];
    const pay = Math.min(proceeds, sn.debt);
    sn.debt -= pay;
    sn.cash += proceeds - pay;
    calls.push({ id, qty, proceeds: Math.round(proceeds) });
  }
  return calls;
}

// ---------- MISSIONS (v10): seeded objectives, same for challenge rivals ----------
function missionState() {
  const holdings = S.season.holdings;
  let props = 0, biz = 0, lux = 0, cryptoVal = 0;
  const cats = new Set(), countries = new Set();
  for (const id in holdings) {
    const a = worldAsset(id);
    if (!a) continue;
    cats.add(a.cat);
    if (a.country) countries.add(a.country);
    if (a.cat === "realestate") props++;
    if (a.cat === "business") biz++;
    if (a.cat === "luxury") lux++;
    if (a.cat === "crypto") cryptoVal += posValue(id);
  }
  const nw = netWorth();
  const lastLog = S.season.log[S.season.log.length - 1];
  const soldThisYear = Array.isArray(S.season.trades) && lastLog
    ? S.season.trades.some(t => t.t === "sell" && t.year === lastLog.year - 1)
    : false;
  return {
    props, biz, lux, cryptoVal, cats: cats.size, countries: countries.size,
    nw, income: annualIncome(),
    investedPct: nw > 0 ? holdingsValue() / (S.season.cash + holdingsValue()) : 0,
    casinoNet: S.stats.casinoNet,
    diamondHands: !!(lastLog && lastLog.nwAfter < lastLog.nwBefore && !soldThisYear && Object.keys(holdings).length > 0),
  };
}
function ensureMissions() {
  const sn = S.season;
  if (!sn.missions) {
    // shuffle the mission bank deterministically from the seed
    const rng = mulberry32((sn.seed ^ 0x4D155107) >>> 0);
    const order = MISSIONS.map(m => m.key);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    sn.missions = { order, done: [] };
  }
  return sn.missions;
}
function activeMissions() {
  const m = ensureMissions();
  return m.order.filter(k => !m.done.includes(k)).slice(0, 3)
    .map(k => MISSIONS.find(x => x.key === k)).filter(Boolean);
}
// returns newly completed missions (rewards paid) — call after each simulated year
function evalMissions() {
  const m = ensureMissions();
  const st = missionState();
  const finished = [];
  for (const mission of activeMissions()) {
    if (mission.check(st)) {
      m.done.push(mission.key);
      S.season.cash += mission.reward;
      finished.push(mission);
    }
  }
  if (finished.length) save();
  return finished;
}

// ---------- blackjack ----------
// Straightforward single-hand blackjack vs a stand-on-17 dealer.
// Naturals pay 3:2, wins 1:1, push refunds. Cosmetic randomness — never seeded.
let bj = null; // { bet, player, dealer, phase: "player"|"done", doubled }

function bjCard() {
  return { v: 1 + Math.floor(Math.random() * 13), s: Math.floor(Math.random() * 4) }; // v: 1=A … 13=K
}
function bjValue(hand) {
  let v = 0, aces = 0;
  for (const c of hand) { v += c.v === 1 ? 11 : Math.min(10, c.v); if (c.v === 1) aces++; }
  while (v > 21 && aces) { v -= 10; aces--; }
  return v;
}
function bjDeal(bet) {
  const staked = casinoBet(bet);
  if (staked === null) return { error: "Not enough cash." };
  S.stats.casinoNet -= staked;
  bj = { bet: staked, player: [bjCard(), bjCard()], dealer: [bjCard(), bjCard()], phase: "player", doubled: false };
  save();
  if (bjValue(bj.player) === 21) return bjFinish(); // natural — resolve immediately
  return bjPublic();
}
function bjHit() {
  if (!bj || bj.phase !== "player") return null;
  bj.player.push(bjCard());
  if (bjValue(bj.player) >= 21) return bjFinish();
  return bjPublic();
}
function bjDouble() {
  if (!bj || bj.phase !== "player" || bj.player.length !== 2) return null;
  const extra = casinoBet(bj.bet);
  if (extra === null) return { error: "Not enough cash to double." };
  S.stats.casinoNet -= extra;
  bj.bet += extra;
  bj.doubled = true;
  bj.player.push(bjCard());
  return bjFinish();
}
function bjStand() {
  if (!bj || bj.phase !== "player") return null;
  return bjFinish();
}
function bjFinish() {
  bj.phase = "done";
  const pv = bjValue(bj.player);
  if (pv <= 21) { while (bjValue(bj.dealer) < 17) bj.dealer.push(bjCard()); }
  const dv = bjValue(bj.dealer);
  const naturalP = pv === 21 && bj.player.length === 2 && !bj.doubled;
  const naturalD = dv === 21 && bj.dealer.length === 2;
  let mult = 0, outcome;
  if (pv > 21) outcome = "bust";
  else if (naturalP && !naturalD) { mult = 2.5; outcome = "blackjack"; }
  else if (dv > 21) { mult = 2; outcome = "dealer_bust"; }
  else if (pv > dv) { mult = 2; outcome = "win"; }
  else if (pv === dv) { mult = 1; outcome = "push"; }
  else outcome = "lose";
  const winnings = Math.round(bj.bet * mult);
  if (winnings) casinoPayout(winnings);
  save();
  return Object.assign(bjPublic(), { outcome, winnings, pv, dv });
}
function bjPublic() {
  return { bet: bj.bet, player: bj.player.slice(), dealer: bj.dealer.slice(), phase: bj.phase, doubled: bj.doubled };
}

// ---------- POKER: Caribbean Stud (heads-up vs the live dealer) ----------
// Real casino table poker: ante, see your 5 + the dealer's up-card, then fold
// or raise 2×. Dealer qualifies on Ace-King high or better; the raise bet pays
// a poker paytable. Cosmetic Math.random (never seeded) like the other games.
function freshDeck() {
  const d = [];
  for (let su = 0; su < 4; su++) for (let v = 1; v <= 13; v++) d.push({ v, s: su });
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
// rank a 5-card hand → comparable tuple [category, ...tiebreakers]; higher wins.
function rankPoker(cards) {
  const vals = cards.map(c => (c.v === 1 ? 14 : c.v)).sort((a, b) => b - a);
  const flush = cards.every(c => c.s === cards[0].s);
  const uniq = [...new Set(vals)];
  let straight = false, sHigh = 0;
  if (uniq.length === 5) {
    if (vals[0] - vals[4] === 4) { straight = true; sHigh = vals[0]; }
    else if (vals[0] === 14 && vals[1] === 5 && vals[4] === 2) { straight = true; sHigh = 5; } // wheel A-5
  }
  const cnt = {};
  for (const v of vals) cnt[v] = (cnt[v] || 0) + 1;
  const groups = Object.entries(cnt).map(([v, c]) => [c, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const k = groups.map(g => g[1]);
  if (straight && flush) return [8, sHigh];
  if (groups[0][0] === 4) return [7, k[0], k[1]];
  if (groups[0][0] === 3 && groups[1] && groups[1][0] === 2) return [6, k[0], k[1]];
  if (flush) return [5, ...vals];
  if (straight) return [4, sHigh];
  if (groups[0][0] === 3) return [3, k[0], k[1], k[2]];
  if (groups[0][0] === 2 && groups[1] && groups[1][0] === 2) return [2, k[0], k[1], k[2]];
  if (groups[0][0] === 2) return [1, k[0], k[1], k[2], k[3]];
  return [0, ...vals];
}
function cmpPoker(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d;
  }
  return 0;
}
const POKER_NAMES = ["High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"];
function pokerName(rank) {
  if (rank[0] === 8 && rank[1] === 14) return "Royal Flush";
  return POKER_NAMES[rank[0]];
}
// raise-bet payout multiplier by player hand category
function csRaiseMult(rank) {
  if (rank[0] === 8) return rank[1] === 14 ? 100 : 50;   // royal vs straight flush
  return [1, 1, 2, 3, 4, 5, 7, 20][rank[0]];             // high…quads
}
// dealer qualifies with a pair+ or Ace-King high
function csDealerQualifies(rank) {
  if (rank[0] >= 1) return true;
  return rank[1] === 14 && rank[2] === 13;
}

let cs = null; // { ante, raise, player, dealer, phase: "decide"|"done" }
function csDeal(ante) {
  const staked = casinoBet(ante);
  if (staked === null) return { error: "Not enough cash." };
  S.stats.casinoNet -= staked;
  const deck = freshDeck();
  cs = { ante: staked, raise: 0, player: deck.slice(0, 5), dealer: deck.slice(5, 10), phase: "decide" };
  save();
  return csPublic();
}
function csFold() {
  if (!cs || cs.phase !== "decide") return null;
  cs.phase = "done";
  save();
  return Object.assign(csPublic(), { outcome: "fold", winnings: 0,
    playerRank: rankPoker(cs.player), dealerRank: rankPoker(cs.dealer), qualifies: csDealerQualifies(rankPoker(cs.dealer)) });
}
function csPlay() {
  if (!cs || cs.phase !== "decide") return null;
  const raise = casinoBet(cs.ante * 2);
  if (raise === null) return { error: "Not enough cash to call the raise." };
  S.stats.casinoNet -= raise;
  cs.raise = raise;
  cs.phase = "done";
  const pr = rankPoker(cs.player), dr = rankPoker(cs.dealer);
  const qual = csDealerQualifies(dr);
  const cmp = cmpPoker(pr, dr);
  let winnings = 0, outcome;
  if (!qual) { winnings = cs.ante * 2 + cs.raise; outcome = "no_qualify"; }      // ante 1:1, raise pushes
  else if (cmp > 0) { winnings = cs.ante * 2 + cs.raise + cs.raise * csRaiseMult(pr); outcome = "win"; }
  else if (cmp === 0) { winnings = cs.ante + cs.raise; outcome = "push"; }
  else { winnings = 0; outcome = "lose"; }
  winnings = Math.round(winnings);
  if (winnings) casinoPayout(winnings);
  save();
  return Object.assign(csPublic(), { outcome, winnings, playerRank: pr, dealerRank: dr, qualifies: qual });
}
function csPublic() {
  return { ante: cs.ante, raise: cs.raise, phase: cs.phase, player: cs.player.slice(), dealer: cs.dealer.slice() };
}

// ---------- MOGUL STATS (v17) ----------
// A four-dimensional character profile (Reputation / Cunning / Vitality /
// Influence) that the life-event deck, the passing years, and the casino all
// move. Purely cosmetic — never drawn from the market rng, so the seeded price
// baseline is untouched. Always clamped to 0–100.
function mstats() {
  const m = S.season.mstats;
  if (!m || typeof m.rep !== "number") return (S.season.mstats = { rep: 50, cun: 50, vit: 62, inf: 40 });
  return m;
}
function mogulStat(k) { return Math.round(clampStat(mstats()[k])); }
function clampStat(v) { return Math.max(0, Math.min(100, v)); }
function bumpMogulStat(k, d) {
  const m = mstats();
  if (typeof m[k] !== "number") return;
  m[k] = clampStat(m[k] + d);
}
function applyStatFx(fx) {
  if (!fx) return;
  for (const k in fx) bumpMogulStat(k, fx[k]);
}
// A well-lived life buys you years: final Vitality shifts the age at death by
// up to ±7 around the base 100-year span. Pure read of a cosmetic stat.
function lifespanBonus() { return Math.round((mogulStat("vit") - 50) / 7); }
function livedToAge() { return START_AGE + SEASON_YEARS + lifespanBonus(); }

// ---------- LIFE EVENTS (v15) ----------
// Rolled from a hash of (seed, year) — NEVER the market rng — so the price
// baseline is untouched and challenge rivals meet the same events at the same
// ages. Eligibility depends on personal state (wealth/holdings), which is the
// point: your life reflects your fortune.
function lifeHash(year, salt) {
  let h = (S.season.seed ^ Math.imul(year + 1, 2654435761) ^ (salt >>> 0)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rollLifeEvent(year) {
  if (year < 1 || year > SEASON_YEARS) return null;
  if (lifeHash(year, 0x9E3779B9) > 0.5) return null; // ~50% of years are quiet
  const seen = S.season.eventsSeen || [];
  const pool = LIFE_EVENTS.filter(e => (!e.cond || e.cond()) && !(e.once && seen.includes(e.id)));
  if (!pool.length) return null;
  return pool[Math.floor(lifeHash(year, 0x85EBCA6B) * pool.length)];
}
function applyLifeChoice(ev, choiceIdx) {
  const choice = ev.choices[choiceIdx];
  if (!choice) return "";
  let outcome = "";
  try { outcome = choice.apply() || ""; } catch (e) { outcome = ""; }
  applyStatFx(choice.fx); // v17: the choice reshapes your character profile
  S.season.cash = Math.max(0, S.season.cash); // a life event can't bankrupt you into the negative
  if (!Array.isArray(S.season.lifeLog)) S.season.lifeLog = [];
  if (!Array.isArray(S.season.eventsSeen)) S.season.eventsSeen = [];
  S.season.lifeLog.push({ year: S.season.year, age: START_AGE + S.season.year, icon: ev.icon, choice: choice.label, text: outcome });
  if (!S.season.eventsSeen.includes(ev.id)) S.season.eventsSeen.push(ev.id);
  save();
  return outcome;
}

// ---------- watchlist ----------
function toggleWatch(id) {
  if (!Array.isArray(S.watchlist)) S.watchlist = [];
  const i = S.watchlist.indexOf(id);
  if (i >= 0) S.watchlist.splice(i, 1); else S.watchlist.push(id);
  save();
  return i < 0; // true if now watched
}
function isWatched(id) { return Array.isArray(S.watchlist) && S.watchlist.includes(id); }

// ---------- trade insights (derived, cosmetic) ----------
// Best/worst calls of last year: realized regret on sells, paper win/loss on holds.
function computeInsights() {
  const sn = S.season;
  if (!sn.year) return [];
  const out = [];
  // held positions: contribution from last year's move
  let bestHold = null, worstHold = null;
  for (const id in sn.holdings) {
    const r = lastReturn(id);
    if (r === null) continue;
    const val = posValue(id);
    const delta = val - val / (1 + r); // $ change of the position over last year
    if (!bestHold || delta > bestHold.delta) bestHold = { id, delta, r };
    if (!worstHold || delta < worstHold.delta) worstHold = { id, delta, r };
  }
  // sells this season: what the position would be worth had you held
  let worstSell = null, bestSell = null;
  if (Array.isArray(sn.trades)) {
    for (const t of sn.trades) {
      if (t.t !== "sell" || t.year >= sn.year) continue;
      const regret = (sn.prices[t.id] - t.price) * t.qty; // >0 sold too early, <0 dodged a fall
      if (!worstSell || regret > worstSell.regret) worstSell = { id: t.id, regret, year: t.year };
      if (!bestSell || regret < bestSell.regret) bestSell = { id: t.id, regret, year: t.year };
    }
  }
  // missed mover: biggest gainer you didn't own
  let missed = null;
  for (const a of worldAssets()) {
    const r = lastReturn(a.id);
    if (r === null || sn.holdings[a.id]) continue;
    if (!missed || r > missed.r) missed = { id: a.id, r };
  }
  if (bestHold && bestHold.delta > 0) out.push({ ic: "🏆", kind: "besthold", ...bestHold });
  if (worstHold && worstHold.delta < 0 && worstHold.id !== (bestHold && bestHold.id)) out.push({ ic: "🩹", kind: "worsthold", ...worstHold });
  if (worstSell && worstSell.regret > 1000) out.push({ ic: "🫠", kind: "soldearly", ...worstSell });
  if (bestSell && bestSell.regret < -1000) out.push({ ic: "🕶️", kind: "dodged", ...bestSell });
  if (missed && missed.r > 0.5) out.push({ ic: "🔭", kind: "missed", ...missed });
  return out.slice(0, 4);
}

// ---------- friend codes ----------
function b64e(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function b64d(str) { return JSON.parse(decodeURIComponent(escape(atob(str)))); }

function makeChallengeCode() {
  const seed = (Math.random() * 0xffffffff) >>> 0;
  return { code: "MRC1." + b64e({ seed }), seed };
}
function acceptChallenge(code) {
  try {
    const raw = code.trim();
    if (!raw.startsWith("MRC1.")) return null;
    const p = b64d(raw.slice(5));
    if (typeof p.seed !== "number") return null;
    startNewSeason(p.seed >>> 0, true);
    return p.seed >>> 0;
  } catch (e) { return null; }
}

function makeMogulCard() {
  return "MGC1." + b64e({
    n: S.profile.name || "Mogul",
    av: S.profile.avatar,
    nw: Math.round(netWorth()),
    roi: Math.round(roi()),
    seed: S.season.seed,
    yr: S.season.year,
  });
}
function importMogulCard(code) {
  try {
    const raw = code.trim();
    if (!raw.startsWith("MGC1.")) return null;
    const p = b64d(raw.slice(5));
    if (!p.n || typeof p.nw !== "number") return null;
    const rival = {
      name: String(p.n).slice(0, 16),
      avatar: p.av && typeof p.av === "object" ? p.av : defaultAvatar(),
      nw: Math.round(p.nw),
      roi: Math.round(p.roi || 0),
      seed: p.seed >>> 0,
      year: Math.min(SEASON_YEARS, Math.max(0, p.yr | 0)),
    };
    S.rivals = S.rivals.filter(r => r.name !== rival.name);
    S.rivals.push(rival);
    S.rivals.sort((a, b) => b.nw - a.nw);
    if (netWorth() > rival.nw) unlock("rivalslain");
    save();
    return rival;
  } catch (e) { return null; }
}

// ---------- achievements ----------
let achievementQueue = [];
function unlock(id) {
  if (S.achievements.includes(id)) return;
  S.achievements.push(id);
  const a = ACHIEVEMENTS.find(x => x.id === id);
  if (a) achievementQueue.push(a);
  save();
}
function checkWealthAchievements() {
  const nw = netWorth();
  if (nw >= START_CASH * 2) unlock("double");
  if (nw >= START_CASH * 10) unlock("megarich");
}
function checkHoldingAchievements() {
  let props = 0, cryptoVal = 0, yacht = false;
  const cats = new Set();
  for (const id in S.season.holdings) {
    const a = worldAsset(id);
    if (!a) continue;
    cats.add(a.cat);
    if (a.cat === "realestate") props += posQty(id);
    if (a.cat === "crypto") cryptoVal += posValue(id);
    if (a.arch === "yacht") yacht = true;
  }
  if (props >= 5) unlock("landlord");
  if (cryptoVal >= 500000) unlock("cryptoking");
  if (cats.size >= 6) unlock("diversified");
  if (yacht) unlock("flexking");
}
