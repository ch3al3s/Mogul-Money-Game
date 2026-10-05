// MOGUL regression test (world v2) — run with: node test/regression.js
// Guards:
//  (1) same seed → identical generated WORLD (names, prices, slots)
//  (2) market path is a pure function of (seed, year) regardless of holdings
//  (3) prices stay finite & positive across seeds over the full 100 years
//  (4) outcomes vary across seeds
//  (5) generated names never collide with real famous brands/people
//  (6) supply caps and tier locks enforce
//  (7) legacy (pre-v4) saves still load and simulate on the static catalog
//  (8) baseline: recorded on first run, compared after (regenerate ONLY on
//      an intentional market-path change — delete baseline.json + rerun)
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeContext() {
  const store = {};
  const ctx = {
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    btoa: s => Buffer.from(s, "binary").toString("base64"),
    atob: s => Buffer.from(s, "base64").toString("binary"),
    Math, JSON, Object, Array, Date, console,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ["js/data.js", "js/worldgen.js", "js/engine.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", f), "utf8"), ctx, { filename: f });
  }
  return ctx;
}

function runSeason(seed, trade, years = 100) {
  const ctx = makeContext();
  vm.runInContext(`load(); startNewSeason(${seed >>> 0});`, ctx);
  const paths = [];
  for (let y = 1; y <= years; y++) {
    if (trade && y <= 4) vm.runInContext(trade, ctx); // divergent holdings must not touch prices
    vm.runInContext("simulateYear();", ctx);
    if (y % 10 === 0 || y === 1) {
      paths.push(vm.runInContext("JSON.stringify(worldAssets().filter(a => a.id in S.season.prices).map(a => S.season.prices[a.id]))", ctx));
    }
  }
  return { ctx, paths, finalNW: vm.runInContext("netWorth()", ctx) };
}

let failed = 0;
const assert = (ok, msg) => { if (!ok) { failed++; console.error("  ✗ " + msg); } };

// --- 1) same seed → identical world
{
  const ctx1 = makeContext(), ctx2 = makeContext();
  const w1 = vm.runInContext("JSON.stringify(generateWorld(424242).assets)", ctx1);
  const w2 = vm.runInContext("JSON.stringify(generateWorld(424242).assets)", ctx2);
  const w3 = vm.runInContext("JSON.stringify(generateWorld(424243).assets)", ctx1);
  assert(w1 === w2, "same seed produced different worlds");
  assert(w1 !== w3, "different seeds produced identical worlds");
  const n = JSON.parse(w1).length;
  console.log(`world determinism: ${w1 === w2 ? "OK" : "FAIL"} · assets at genesis+pipeline: ${n}`);
}

// --- 2) determinism vs holdings: same seed, different trading, identical prices
{
  const seed = 123456789;
  const a = runSeason(seed, "", 60);
  const b = runSeason(seed, `
    { const st = worldAssets().find(x => x.cat === 'stocks');
      const cm = worldAssets().find(x => x.cat === 'commodity');
      buyAsset(st.id, Math.max(1, maxAffordable(st.id) >> 1));
      buyAsset(cm.id, Math.max(1, maxAffordable(cm.id) >> 2));
      sellAsset(st.id, 1);
      if (S.season.cash > 20000) { playSlots(1000); playRoulette(1000, 'red'); } }
  `, 60);
  assert(JSON.stringify(a.paths) === JSON.stringify(b.paths),
    "price paths diverged between two seasons with different holdings");
  console.log("determinism vs holdings (60y): " + (JSON.stringify(a.paths) === JSON.stringify(b.paths) ? "OK" : "FAIL"));
}

// --- 3+4) seeds sweep: finite positive prices over 100y, distinct outcomes
{
  const finals = new Set();
  let priceOK = true, listedGrew = true;
  for (let i = 0; i < 12; i++) {
    const seed = (i * 2654435761 + 977) >>> 0;
    const r = runSeason(seed, `
      { const st = worldAssets().find(x => x.cat === 'stocks');
        buyAsset(st.id, Math.max(1, maxAffordable(st.id))); }
    `, 100);
    for (const p of r.paths) {
      for (const v of JSON.parse(p)) {
        if (!Number.isFinite(v) || v <= 0) { priceOK = false; assert(false, `bad price, seed ${seed}`); break; }
      }
    }
    const genesis = JSON.parse(r.paths[0]).length, end = JSON.parse(r.paths[r.paths.length - 1]).length;
    if (end <= genesis) listedGrew = false;
    finals.add(Math.round(r.finalNW));
  }
  assert(priceOK, "price sanity failed");
  assert(finals.size >= 11, `expected ≥11 distinct final net worths, got ${finals.size}`);
  assert(listedGrew, "IPO pipeline never grew the market");
  console.log(`100y price sanity: ${priceOK ? "OK" : "FAIL"} · distinct finals: ${finals.size}/12 · IPOs list over time: ${listedGrew ? "OK" : "FAIL"}`);
}

// --- 5) no real brand/person names in generated worlds
{
  const DENY = ["apple", "tesla", "google", "amazon", "microsoft", "nvidia", "meta", "netflix",
    "bitcoin", "ethereum", "solana", "dogecoin", "tether", "binance",
    "rolex", "patek", "ferrari", "porsche", "lamborghini", "nike", "adidas", "gucci",
    "musk", "bezos", "buffett", "zuckerberg", "gates", "trump", "dangote",
    "jpmorgan", "goldman", "barclays", "hsbc", "shell", "exxon", "aramco", "vodafone", "mtn ", "shoprite", "naspers"];
  const ctx = makeContext();
  let clean = true;
  for (const seed of [1, 42, 1337, 90210, 555555]) {
    const names = JSON.parse(vm.runInContext(`JSON.stringify(generateWorld(${seed}).assets.map(a => a.name))`, ctx));
    for (const name of names) {
      const low = " " + name.toLowerCase() + " ";
      for (const bad of DENY) {
        if (low.includes(bad.trim())) { clean = false; assert(false, `real-name leak: "${name}" (seed ${seed})`); }
      }
    }
  }
  console.log("no real names: " + (clean ? "OK" : "FAIL"));
}

// --- 6) supply caps + tier locks enforce
{
  const ctx = makeContext();
  vm.runInContext("load(); startNewSeason(777); S.season.cash = 1e12;", ctx);
  const ok = vm.runInContext(`
    (() => {
      const scarce = worldAssets().find(a => a.supply > 0 && !a.tier && a.id in S.season.prices);
      buyAsset(scarce.id, 999999);
      const capped = posQty(scarce.id) === scarce.supply && supplyLeft(scarce.id) === 0;
      const overbuy = buyAsset(scarce.id, 1) === false;
      S.season.cash = 1e12;
      const lockedAsset = worldAssets().find(a => a.tier === 2 && a.id in S.season.prices);
      // net worth is astronomic from the cash injection, so drain it to test the lock
      const cashBack = S.season.cash; S.season.cash = 1000;
      const lockBlocked = lockedAsset ? buyAsset(lockedAsset.id, 1) === false && tierLocked(lockedAsset.id) : true;
      S.season.cash = cashBack;
      return { capped, overbuy, lockBlocked };
    })()
  `, ctx);
  assert(ok.capped, "supply cap not enforced");
  assert(ok.overbuy, "overbuy past supply succeeded");
  assert(ok.lockBlocked, "tier lock not enforced");
  console.log(`supply cap: ${ok.capped ? "OK" : "FAIL"} · overbuy blocked: ${ok.overbuy ? "OK" : "FAIL"} · tier lock: ${ok.lockBlocked ? "OK" : "FAIL"}`);
}

// --- 7) legacy (pre-v4) save loads and simulates on the static catalog
{
  const ctx = makeContext();
  // hand-build a legacy season over the static ASSETS (no worldV field)
  const legacy = vm.runInContext(`
    (() => {
      const prices = {}, hist = {};
      for (const a of ASSETS) { prices[a.id] = a.price; hist[a.id] = [a.price]; }
      return JSON.stringify({
        profile: { name: "OldTimer", avatar: defaultAvatar() },
        season: { seed: 555, year: 3, cash: 500000, holdings: { gold: { qty: 10, cost: 40000 } },
                  prices, hist, regime: "expansion", nwHistory: [1000000, 990000, 1010000, 1020000],
                  log: [], finished: false, fromChallenge: false },
        bestScore: 0, pastSeasons: [], rivals: [], achievements: ["firsttrade"],
        stats: { casinoNet: 0, bestStreak: 0 },
      });
    })()
  `, ctx);
  const ctx2 = makeContext();
  vm.runInContext(`localStorage.setItem("mogul_save_v2", ${JSON.stringify(legacy)});`, ctx2);
  const res = vm.runInContext(`
    (() => {
      const loaded = load();
      const v = S.season.worldV;
      const usesStatic = !!worldAsset("gold") && worldAsset("gold").name === "Gold (oz)";
      const sim = simulateYear() !== null;
      return { loaded, v, usesStatic, sim, nw: netWorth() };
    })()
  `, ctx2);
  assert(res.loaded && res.v === 1 && res.usesStatic && res.sim && Number.isFinite(res.nw),
    `legacy save failed: ${JSON.stringify(res)}`);
  console.log("legacy v2 save compatibility: " + (res.loaded && res.v === 1 && res.usesStatic && res.sim ? "OK" : "FAIL"));
}

// --- 7b) live drift (v7): deterministic at a fixed instant, bounded, and
//         strictly cosmetic — trading at live prices never touches the canonical path
{
  const ctx = makeContext();
  vm.runInContext("load(); startNewSeason(321);", ctx);
  const r = vm.runInContext(`
    (() => {
      const t = 1800000000000; // fixed instant
      const ids = worldAssets().filter(a => a.id in S.season.prices).slice(0, 60).map(a => a.id);
      const f1 = ids.map(id => driftFactor(id, t));
      const f2 = ids.map(id => driftFactor(id, t));
      const bounded = f1.every(f => f > 0.85 && f < 1.15 && Number.isFinite(f));
      const stable = JSON.stringify(f1) === JSON.stringify(f2);
      const moves = new Set(f1.map(f => f.toFixed(6))).size > 10; // drift actually varies by asset
      const before = JSON.stringify(S.season.prices);
      const cheap = ids.find(id => S.season.prices[id] < 100000);
      buyAsset(cheap, 2); sellAsset(cheap, 1);
      const pathNeutral = JSON.stringify(S.season.prices) === before;
      return { bounded, stable, moves, pathNeutral };
    })()
  `, ctx);
  assert(r.bounded, "drift factor out of bounds");
  assert(r.stable, "drift factor not deterministic at fixed instant");
  assert(r.moves, "drift factors suspiciously uniform");
  assert(r.pathNeutral, "live trading mutated canonical prices");
  console.log(`live drift: bounded ${r.bounded ? "OK" : "FAIL"} · deterministic ${r.stable ? "OK" : "FAIL"} · path-neutral ${r.pathNeutral ? "OK" : "FAIL"}`);
}

// --- 8) baseline comparison (records on first run, compares after)
{
  const baseFile = path.join(__dirname, "baseline.json");
  const seeds = [1, 42, 1337, 987654321];
  const now = {};
  for (const s of seeds) now[s] = runSeason(s, "", 40).paths.join("|");
  if (fs.existsSync(baseFile)) {
    const base = JSON.parse(fs.readFileSync(baseFile, "utf8"));
    let same = true;
    for (const s of seeds) if (base[s] !== now[s]) { same = false; assert(false, `baseline mismatch for seed ${s}`); }
    console.log("baseline paths: " + (same ? "OK (identical to recorded baseline)" : "FAIL"));
  } else {
    fs.writeFileSync(baseFile, JSON.stringify(now));
    console.log("baseline paths: recorded (world v2 — first run)");
  }
}

console.log(failed ? `\n${failed} FAILURE(S)` : "\nALL PASS");
process.exit(failed ? 1 : 0);
