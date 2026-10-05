// ============ MOGUL: THE MONEY RACE — UI (v3) ============
// Rendering + motion. Everything here is cosmetic; the engine owns the numbers.
"use strict";

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const RM = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => RM.matches;

const money = n => {
  const neg = n < 0 ? "−" : "";
  n = Math.abs(n);
  if (n >= 1e9) return neg + "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return neg + "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e4) return neg + "$" + (n / 1e3).toFixed(1) + "K";
  if (n >= 100) return neg + "$" + Math.round(n).toLocaleString();
  if (n >= 1) return neg + "$" + n.toFixed(2);
  if (n === 0) return "$0";
  return neg + "$" + n.toPrecision(2);
};
const pct = r => (r >= 0 ? "+" : "−") + Math.abs(r * 100).toFixed(1) + "%";

// ---------- count-up engine ----------
const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const numAnims = new WeakMap();

function animateNumber(el, from, to, fmt = money, dur = 500) {
  if (!el) return;
  const prev = numAnims.get(el);
  if (prev) cancelAnimationFrame(prev.raf);
  if (reduced() || from === to || !Number.isFinite(from)) {
    el.textContent = fmt(to);
    numAnims.set(el, { val: to, raf: 0 });
    return;
  }
  const t0 = performance.now();
  const state = { val: from, raf: 0 };
  numAnims.set(el, state);
  const step = now => {
    const k = easeOutExpo(Math.min(1, (now - t0) / dur));
    state.val = from + (to - from) * k;
    el.textContent = fmt(state.val);
    if (k < 1) state.raf = requestAnimationFrame(step);
    else { state.val = to; el.textContent = fmt(to); }
  };
  state.raf = requestAnimationFrame(step);
}
// animate from whatever the element currently shows (tracked), to `val`
function setNum(el, val, fmt = money) {
  const prev = numAnims.get(el);
  const from = prev ? prev.val : val;
  animateNumber(el, from, val, fmt);
}

// ---------- toasts v3 ----------
const TOAST_MAX = 3;
function toast(title, cls = "", opts = {}) {
  const wrap = $("#toasts");
  while (wrap.children.length >= TOAST_MAX) wrap.firstChild.remove();
  const dur = opts.dur || 3800;
  const icons = { "": "💬", gold: "✨", red: "⚠️", green: "✅" };
  const t = document.createElement("div");
  t.className = "toast " + cls;
  t.innerHTML = `<span class="t-ic">${opts.icon || icons[cls] || "💬"}</span>
    <span><span class="t-title"></span>${opts.body ? `<span class="t-body"></span>` : ""}</span>
    <span class="t-bar" style="animation-duration:${dur}ms"></span>`;
  t.querySelector(".t-title").textContent = title;
  if (opts.body) t.querySelector(".t-body").textContent = opts.body;
  const dismiss = () => {
    if (t.classList.contains("leaving")) return;
    t.classList.add("leaving");
    setTimeout(() => t.remove(), 260);
  };
  t.addEventListener("click", dismiss);
  wrap.appendChild(t);
  setTimeout(dismiss, dur);
}

// ---------- achievement banner ----------
let achBusy = false;
function flushAchievements() {
  if (achBusy || !achievementQueue.length) return;
  achBusy = true;
  const a = achievementQueue.shift();
  const b = $("#ach-banner");
  $("#ab-emoji").textContent = a.emoji;
  $("#ab-name").textContent = a.name;
  $("#ab-desc").textContent = a.desc;
  // restart the emoji spin
  const em = $("#ab-emoji");
  em.style.animation = "none"; void em.offsetWidth; em.style.animation = "";
  b.classList.add("show");
  Sound.play("unlock");
  setTimeout(() => {
    b.classList.remove("show");
    setTimeout(() => { achBusy = false; flushAchievements(); }, 550);
  }, 4000);
}
function setTicker(msg) { $("#ticker-text").textContent = msg; }

// ---------- empty states ----------
const DOODLES = {
  flat: `<svg width="72" height="30" viewBox="0 0 72 30" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 20 L18 20 L24 12 L32 24 L40 18 L70 18" stroke-linecap="round"/><circle cx="70" cy="18" r="2" fill="currentColor" stroke="none"/></svg>`,
  vault: `<svg width="44" height="40" viewBox="0 0 44 40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="36" height="30" rx="4"/><circle cx="22" cy="19" r="8"/><circle cx="22" cy="19" r="2.5"/><path d="M22 11v3M22 24v3M14 19h3M27 19h3"/><path d="M10 34v3M34 34v3"/></svg>`,
  scope: `<svg width="44" height="38" viewBox="0 0 44 38" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 26 L30 8" stroke-linecap="round"/><rect x="27" y="3" width="12" height="7" rx="2" transform="rotate(-37 33 6)"/><path d="M14 26 L10 35 M14 26 L20 35 M14 26 L14 22" stroke-linecap="round"/><circle cx="38" cy="24" r="1.4" fill="currentColor" stroke="none"/><circle cx="30" cy="30" r="1" fill="currentColor" stroke="none"/></svg>`,
  trophy: `<svg width="40" height="38" viewBox="0 0 40 38" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5h16v8a8 8 0 0 1-16 0V5z"/><path d="M12 7H6a6 6 0 0 0 6 8M28 7h6a6 6 0 0 1-6 8"/><path d="M20 21v6M14 31h12M16 27h8" stroke-linecap="round"/></svg>`,
};
const emptyHTML = (doodle, text) => `<div class="empty">${DOODLES[doodle] || ""}${text}</div>`;

// ---------- avatar ----------
const TOP_ACCS = ["🎩", "🧢", "👑", "🎧"];
function avatarHTML(av) {
  const o = AVATAR_OPTS;
  av = Object.assign(defaultAvatar(), av || {});
  const acc = o.acc[av.acc] || "";
  const accCls = TOP_ACCS.includes(acc) ? "acc-top" : "acc-eyes";
  return `<div class="avatar" style="--av-bg:${o.bg[av.bg]};--av-skin:${o.skin[av.skin]};--av-hair:${o.hairColor[av.hairColor]};--av-outfit:${o.outfit[av.outfit]}">
    <div class="av-hair hair-${o.hair[av.hair]}"></div>
    <div class="av-head"></div>
    <div class="av-eyes"><i></i><i></i></div>
    <div class="av-body"></div>
    ${acc ? `<div class="av-acc ${accCls}">${acc}</div>` : ""}
  </div>`;
}

// ---------- regime dressing ----------
const REGIME_META = {
  expansion:   { color: "#5b8cff", flavor: "Nothing dramatic. Somehow, that's when fortunes are actually made." },
  boom:        { color: "#16d383", flavor: "Everything is up. Everyone is a genius. Enjoy it while it lasts." },
  recession:   { color: "#ff5c5c", flavor: "The tide went out. Time to see who was swimming naked." },
  stagflation: { color: "#e8b54d", flavor: "Prices up, growth down, everyone annoyed. Gold nods knowingly." },
  recovery:    { color: "#38d9a9", flavor: "The brave are buying. The scarred are watching from cash." },
};

// ---------- charts ----------
const polyLen = pts => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
};

let sparkDrawn = new Set();
function sparklineSVG(hist, id) {
  const w = 84, h = 26;
  if (!hist || hist.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#202b3b" stroke-width="1.5" stroke-dasharray="3 3"/></svg>`;
  const min = Math.min(...hist), max = Math.max(...hist);
  const span = max - min || 1;
  const pts = hist.map((v, i) => `${(i / (hist.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  const up = hist[hist.length - 1] >= hist[0];
  const draw = id && !sparkDrawn.has(id) && !reduced();
  if (draw) sparkDrawn.add(id);
  return `<svg class="spark${draw ? " draw" : ""}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? "#16d383" : "#ff5c5c"}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}

// net-worth chart with crosshair + animated draw
let nwChartMap = null; // {xs, ys, vals}
function areaChart(svgEl, hist, W, H, animate) {
  const pad = 12;
  const max = Math.max(...hist, START_CASH) * 1.04;
  const min = Math.min(...hist, START_CASH) * 0.96;
  const x = i => pad + (i / Math.max(1, SEASON_YEARS)) * (W - 2 * pad);
  const y = v => H - pad - ((v - min) / Math.max(1, max - min)) * (H - 2 * pad);
  const P = hist.map((v, i) => [x(i), y(v)]);
  const line = P.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${x(0)},${y(hist[0])} ${line} ${x(hist.length - 1)},${H - pad} ${x(0)},${H - pad}`;
  const up = hist[hist.length - 1] >= START_CASH;
  const col = up ? "#16d383" : "#ff5c5c";
  svgEl.innerHTML = `
    <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity=".22"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${pad}" y1="${y(START_CASH)}" x2="${W - pad}" y2="${y(START_CASH)}" stroke="#2a3548" stroke-dasharray="4 4" stroke-width="1"/>
    <text x="${W - pad - 4}" y="${y(START_CASH) - 5}" text-anchor="end" fill="#5b6b80" font-size="10" font-weight="600">$1.0M start</text>
    <polygon points="${area}" fill="url(#ag)"/>
    <polyline id="nw-line" points="${line}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="${x(hist.length - 1)}" cy="${y(hist[hist.length - 1])}" r="4" fill="${col}"/>
    <g id="nw-cross" style="opacity:0"><line y1="${pad}" y2="${H - pad}" stroke="#5b6b80" stroke-width="1" stroke-dasharray="3 3"/><circle r="4.5" fill="none" stroke="${col}" stroke-width="2"/></g>`;
  nwChartMap = { P, vals: hist, W, H };
  if (animate && !reduced() && hist.length > 1) {
    const pl = svgEl.querySelector("#nw-line");
    const L = polyLen(P);
    pl.style.strokeDasharray = L;
    pl.style.strokeDashoffset = L;
    pl.getBoundingClientRect(); // flush
    pl.style.transition = "stroke-dashoffset .8s cubic-bezier(.22,.9,.32,1)";
    pl.style.strokeDashoffset = "0";
  }
}

function bindChartCrosshair(svg, tip, getMap, label) {
  svg.addEventListener("mousemove", e => {
    const map = getMap();
    if (!map || map.P.length < 2) return;
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * map.W;
    let best = 0, bd = Infinity;
    map.P.forEach((p, i) => { const d = Math.abs(p[0] - px); if (d < bd) { bd = d; best = i; } });
    const [cx, cy] = map.P[best];
    const g = svg.querySelector("#nw-cross, #am-cross");
    if (g) {
      g.style.opacity = "1";
      const ln = g.querySelector("line"), c = g.querySelector("circle");
      ln.setAttribute("x1", cx); ln.setAttribute("x2", cx);
      c.setAttribute("cx", cx); c.setAttribute("cy", cy);
    }
    tip.innerHTML = `<small>${label(best)}</small>${money(map.vals[best])}`;
    tip.style.left = (cx / map.W * r.width + svg.offsetLeft) + "px";
    tip.style.top = (cy / map.H * r.height + svg.offsetTop) + "px";
    tip.classList.add("show");
  });
  svg.addEventListener("mouseleave", () => {
    tip.classList.remove("show");
    const g = svg.querySelector("#nw-cross, #am-cross");
    if (g) g.style.opacity = "0";
  });
}

// ---------- HUD ----------
function renderHUD() {
  setNum($("#hud-cash"), S.season.cash);
  setNum($("#hud-networth"), liveNetWorth());
  $("#hud-year").textContent = `${calYear(S.season.year)} · Age ${START_AGE + S.season.year} · Yr ${S.season.year}/${SEASON_YEARS}`;
  $("#yt-fill").style.width = (S.season.year / SEASON_YEARS * 100) + "%";
  $("#hud-name").textContent = S.profile.name || "Mogul";
  const pcSmall = document.querySelector("#profile-chip .pc-text small");
  if (pcSmall) pcSmall.textContent = playerTitle() + " · edit";
  $("#hud-avatar").innerHTML = avatarHTML(S.profile.avatar);
  const btn = $("#btn-simulate");
  btn.disabled = S.season.finished;
  btn.querySelector(".sim-label").innerHTML = S.season.finished ? "Season complete" : `Simulate ${calYear(S.season.year + 1)} <span>→</span>`;
  renderMogulStats();
}

// ---------- v17: the four Mogul stat bars (persistent HUD) ----------
// Rendered into two hosts: the compact sidebar strip (desktop) and a fuller
// Dashboard "Mogul Profile" card (the mobile-visible home, since the sidebar
// is hidden below 860px). CSS on each container styles them differently.
function statTier(v) { return v >= 75 ? "high" : v >= 45 ? "mid" : v >= 25 ? "low" : "crit"; }
function mogulStatsHTML(withState) {
  return MOGUL_STATS.map(s => {
    const v = mogulStat(s.key);
    const state = withState ? `<span class="ms-state">${v >= 50 ? s.hi : s.lo}</span>` : "";
    return `<div class="mstat" data-k="${s.key}" data-tier="${statTier(v)}" title="${s.label}: ${v}/100 — ${v >= 50 ? s.hi : s.lo}">
      <span class="ms-ic" style="color:${s.color}">${s.icon}</span>
      <span class="ms-label">${s.short}</span>
      <span class="ms-track"><i class="ms-fill" style="width:${v}%;background:${s.color}"></i></span>
      <span class="ms-val">${v}</span>
      ${state}
    </div>`;
  }).join("");
}
function renderMogulStats() {
  const side = $("#mogul-stats");
  if (side) side.innerHTML = mogulStatsHTML(false);
  const dash = $("#mogul-stats-dash");
  if (dash) dash.innerHTML = mogulStatsHTML(true);
}

let nwDeltaTimer = 0;
function showNwDelta(chg) {
  const el = $("#nw-delta");
  el.textContent = (chg >= 0 ? "▲ " : "▼ ") + money(Math.abs(chg));
  el.className = "delta-chip show " + (chg >= 0 ? "up" : "down");
  clearTimeout(nwDeltaTimer);
  nwDeltaTimer = setTimeout(() => el.classList.remove("show"), 4000);
}

// ---------- dashboard ----------
let dashMounted = false;
const TITLES = [[0, "Apprentice"], [2e6, "Operator"], [5e6, "Dealmaker"], [2e7, "Magnate"], [1e8, "Tycoon"], [5e8, "Mogul"], [2e9, "Sovereign"]];
function playerTitle() {
  const nw = liveNetWorth();
  let t = TITLES[0][1];
  for (const [min, name] of TITLES) if (nw >= min) t = name;
  return t;
}
function worldName() {
  const stems = ["Kestrel", "Meridian", "Harmattan", "Aurora", "Cobalt", "Sable", "Zenith", "Corniche", "Baobab", "Onyx"];
  return `${stems[S.season.seed % stems.length]} ${String(BASE_YEAR).slice(2)}`;
}
function nextTitle() {
  const nw = liveNetWorth();
  for (const [min, name] of TITLES) if (nw < min) return [min, name];
  return null;
}
function renderXP() {
  const fill = $("#xp-fill"), label = $("#xp-label");
  if (!fill) return;
  const nxt = nextTitle();
  if (!nxt) { fill.style.width = "100%"; label.textContent = "Sovereign — the ladder ends here."; return; }
  const cur = TITLES.filter(t => t[0] <= liveNetWorth()).pop();
  const lo = cur ? cur[0] : 0;
  const kFrac = Math.max(0.02, Math.min(1, (liveNetWorth() - lo) / (nxt[0] - lo)));
  fill.style.width = (kFrac * 100).toFixed(1) + "%";
  label.textContent = `${money(liveNetWorth())} / ${money(nxt[0])} to ${nxt[1]}`;
}

// full-screen rank-up cinematic — a video game says it out loud
let rankBusy = false;
function checkRankUp() {
  if (rankBusy) return;
  const idx = TITLES.filter(t => t[0] <= liveNetWorth()).length - 1;
  const seen = (S.flags.titleIdx ?? 0);
  if (idx <= seen) { S.flags.titleIdx = Math.max(seen, idx); return; }
  S.flags.titleIdx = idx;
  save();
  rankBusy = true;
  $("#ru-title").textContent = TITLES[idx][1];
  $("#ru-sub").textContent = `Net worth past ${money(TITLES[idx][0])}. The room goes quiet when you walk in now.`;
  const ov = $("#rankup-overlay");
  ov.classList.remove("hidden");
  Sound.play("jackpot");
  confettiPhysics(60);
  setTimeout(() => { ov.classList.add("hidden"); rankBusy = false; }, reduced() ? 1200 : 3400);
}

function renderDashboard(opts = {}) {
  const greet = $("#dash-greet");
  if (greet) {
    const h = new Date().getHours();
    const tod = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    greet.innerHTML = `${tod}, <b>${S.profile.name || "Mogul"}</b> — <span class="gr-title">${playerTitle()}</span> of the <span class="gr-world">${worldName()}</span> market.`;
  }
  renderXP();
  const nw = liveNetWorth();
  const h = S.season.nwHistory;
  setNum($("#d-networth"), nw);
  const chgEl = $("#d-networth-chg");
  if (h.length > 1) {
    const d = h[h.length - 1] / h[h.length - 2] - 1;
    chgEl.textContent = pct(d) + " last year";
    chgEl.className = "chg " + (d >= 0 ? "up" : "down");
  } else { chgEl.textContent = "no years simulated yet"; chgEl.className = "chg muted"; }
  setNum($("#d-cash"), S.season.cash);
  $("#d-invested").textContent = money(liveHoldingsValue()) + " invested";
  setNum($("#d-income"), annualIncome());
  const r = roi();
  const roiEl = $("#d-roi");
  setNum(roiEl, r, v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%");
  roiEl.style.color = r >= 0 ? "var(--up)" : "var(--down)";
  const reg = REGIMES[S.season.regime];
  $("#d-regime").textContent = S.season.year ? `${reg.emoji} ${reg.name}` : "awaiting first year";
  $("#d-best").textContent = "Best: " + money(Math.max(S.bestScore, nw));

  if (opts.mountCards && !reduced()) {
    $$("#view-dashboard .scard").forEach((c, i) => {
      c.classList.remove("mounting"); void c.offsetWidth;
      c.style.animationDelay = (i * 60) + "ms";
      c.classList.add("mounting");
    });
  }

  areaChart($("#nw-chart"), h, 640, 240, opts.animateChart);

  // allocation — every bar is % of net worth, so the list sums to 100
  const alloc = catAllocation();
  const el = $("#d-alloc");
  const colors = { realestate: "#5b8cff", stocks: "#16d383", crypto: "#b658ff", commodity: "#e8b54d", business: "#38bdf8", luxury: "#f472b6" };
  let html = "";
  for (const c in CATEGORIES) {
    if (!alloc[c]) continue;
    const w = nw ? alloc[c] / nw * 100 : 0;
    html += `
      <div class="alloc-row">
        <span class="al-label">${CATEGORIES[c].emoji} ${CATEGORIES[c].name}</span>
        <div class="al-bar"><div class="al-fill" style="width:${w.toFixed(1)}%;background:${colors[c]}"></div></div>
        <span class="al-val">${w.toFixed(0)}%</span>
      </div>`;
  }
  const cashW = nw ? S.season.cash / nw * 100 : 100;
  html += `
    <div class="alloc-row">
      <span class="al-label">💵 Cash</span>
      <div class="al-bar"><div class="al-fill" style="width:${cashW.toFixed(1)}%;background:#5b6b80"></div></div>
      <span class="al-val">${cashW.toFixed(0)}%</span>
    </div>`;
  el.innerHTML = html;

  renderMissions();
  renderInsights();
  renderWatchMini();

  // movers (last year)
  const mv = $("#d-movers");
  if (S.season.year === 0) mv.innerHTML = emptyHTML("flat", "No moves yet. The market is waiting for you to blink first.");
  else {
    const rows = listedAssets().map(a => [a, lastReturn(a.id)]).filter(x => x[1] !== null)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 7);
    mv.innerHTML = rows.map(([a, r2]) =>
      `<div class="mv-row"><span>${GFX.chip(a)} ${a.name}</span><span class="${r2 >= 0 ? "up" : "down"}">${pct(r2)}</span></div>`).join("");
  }

  // headlines
  const news = $("#d-news");
  const recent = [...S.season.log].reverse().slice(0, 3);
  if (!recent.length) news.innerHTML = emptyHTML("flat", "The wire is quiet. Suspiciously quiet.");
  else news.innerHTML = recent.map(e => e.headlines.map(hl =>
    `<div class="nw-row"><span class="nw-yr">Y${e.year}</span><span>${hl}</span></div>`).join("")).join("");
}

// missions card — three seeded objectives, shared with challenge rivals
function renderMissions() {
  const el = $("#d-missions");
  if (!el) return;
  const m = ensureMissions();
  const act = activeMissions();
  $("#ms-count").textContent = `${m.done.length} / ${MISSIONS.length} done`;
  if (!act.length) { el.innerHTML = emptyHTML("trophy", "Every mission complete. The board is speechless."); return; }
  const st = missionState();
  el.innerHTML = act.map(ms => `
    <div class="mission-row${ms.check(st) ? " ready" : ""}">
      <span class="ms-dot"></span>
      <span class="ms-text">${ms.text}</span>
      <b class="ms-reward">+${money(ms.reward)}</b>
    </div>`).join("");
}

// insights card
function insightText(ins) {
  const a = worldAsset(ins.id);
  const nm = `${GFX.chip(a, 14)} <b>${a.name}</b>`;
  switch (ins.kind) {
    case "besthold": return `Best call — holding ${nm} added <b class="up">${money(ins.delta)}</b> last year.`;
    case "worsthold": return `Worst seat at the table — ${nm} bled <b class="down">${money(Math.abs(ins.delta))}</b> from the stack.`;
    case "soldearly": return `Selling ${nm} early in Y${ins.year} cost you <b class="down">${money(ins.regret)}</b>. It kept going without you.`;
    case "dodged": return `Dumping ${nm} in Y${ins.year} dodged a <b class="up">${money(Math.abs(ins.regret))}</b> fall. Cold-blooded. Respect.`;
    case "missed": return `${nm} did <b class="up">${pct(ins.r)}</b> and you owned none of it. The telescope was pointed the wrong way.`;
  }
  return "";
}
function renderInsights() {
  const el = $("#d-insights");
  const ins = computeInsights();
  if (!ins.length) {
    el.innerHTML = emptyHTML("scope", "Simulate a year and we'll tell you what you should have done. Hindsight is our specialty.");
    return;
  }
  el.innerHTML = ins.map(i => `<div class="insight-row"><span class="in-ic">${i.ic}</span><span>${insightText(i)}</span></div>`).join("");
}

// watchlist mini-card
function renderWatchMini() {
  const el = $("#d-watchlist");
  const ids = (S.watchlist || []).filter(id => worldAsset(id));
  if (!ids.length) {
    el.innerHTML = emptyHTML("scope", "Nothing starred. Tap ★ in the Market to stalk an asset without committing.");
    return;
  }
  el.innerHTML = ids.map(id => {
    const a = worldAsset(id), r = lastReturn(id);
    return `<div class="watch-mini" data-open="${id}">
      <span class="wm-name">${GFX.chip(a)} ${a.name}</span>
      <span><b>${money(livePrice(id))}</b> <span class="chg ${r === null ? "muted" : r >= 0 ? "up" : "down"}">${r === null ? "" : pct(r)}</span></span>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-open]").forEach(x => x.addEventListener("click", () => openAsset(x.dataset.open)));
}

// ---------- market ----------
let mktCat = "all", mktCountry = "all", mktSearch = "", mktSort = { key: "name", dir: 1 };
let kbRow = -1; // keyboard-focused row index

// country chips — flags with fixed per-country counts (legacy worlds have none)
function renderCountryFilters() {
  const el = $("#country-filters");
  const countries = worldCountries();
  if (!countries.length) { el.innerHTML = ""; return; }
  const y = S.season.year;
  const counts = {};
  for (const a of worldAssets()) {
    if (!a.country || (a.listYear || 0) > y) continue;
    counts[a.country] = (counts[a.country] || 0) + 1;
  }
  const mk = (key, label, title) =>
    `<button class="chip country-chip${mktCountry === key ? " active" : ""}" data-country="${key}" title="${title}">${label}</button>`;
  el.innerHTML = mk("all", "🌍 World", "All countries") +
    countries.map(c => mk(c.key, `${c.flag} ${c.name} <small class="chip-count">${counts[c.key] || 0}</small>`, `${c.name} — ${counts[c.key] || 0} assets`)).join("");
  el.querySelectorAll("[data-country]").forEach(b => b.addEventListener("click", () => {
    Sound.play("click");
    mktCountry = b.dataset.country;
    kbRow = -1;
    renderMarket();
  }));
}

function renderCatFilters() {
  const el = $("#cat-filters");
  el.innerHTML = "";
  const mk = (id, label, extra = "") => {
    const b = document.createElement("button");
    b.className = "chip " + extra + (mktCat === id ? " active" : "");
    b.textContent = label;
    b.addEventListener("click", () => { Sound.play("click"); mktCat = id; kbRow = -1; renderMarket(); });
    el.appendChild(b);
  };
  mk("all", "All");
  for (const c of MARKET_CATS) mk(c, CATEGORIES[c].name);
  mk("owned", "Owned");
  mk("watch", "★ Watchlist", "watch-chip ");
}

function marketRows() {
  let rows = listedAssets().filter(a => {
    if (!MARKET_CATS.includes(a.cat)) return false;   // estate realm lives in the Assets tab
    if (mktCat === "owned") { if (posQty(a.id) <= 0) return false; }
    else if (mktCat === "watch") { if (!isWatched(a.id)) return false; }
    else if (mktCat !== "all" && a.cat !== mktCat) return false;
    if (mktCountry !== "all" && a.country !== mktCountry) return false;
    if (mktSearch) {
      const s = mktSearch.toLowerCase();
      const c = a.country ? COUNTRY_BY_KEY[a.country] : null;
      const hay = (a.name + " " + a.cat + " " + (a.region || "") + " " + (a.tag || "") + " " + (a.sector || "") + " " + (c ? c.name : "") + " " + CATEGORIES[a.cat].name).toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });
  const val = a => {
    switch (mktSort.key) {
      case "price": return S.season.prices[a.id];
      case "chg": return lastReturn(a.id) ?? -99;
      case "yield": return a.yield || 0;
      case "owned": return posValue(a.id);
      default: return a.name.toLowerCase();
    }
  };
  rows.sort((a, b) => {
    const va = val(a), vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * mktSort.dir;
  });
  return rows;
}

let mktVisible = [];
function renderMarket(opts = {}) {
  renderCatFilters();
  renderCountryFilters();
  $$("#mkt-table th.sortable").forEach(th => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.sort === mktSort.key) th.classList.add(mktSort.dir === 1 ? "sorted-asc" : "sorted-desc");
  });
  const body = $("#mkt-body");
  mktVisible = marketRows();
  const stagger = opts.stagger && !reduced();
  const html = mktVisible.map((a, i) => {
    const price = livePrice(a.id);
    const r = lastReturn(a.id);
    const owned = posQty(a.id);
    const locked = tierLocked(a.id);
    const left = a.supply ? supplyLeft(a.id) : null;
    const flash = opts.flash && r !== null ? (r >= 0 ? " flash-up" : " flash-down") : "";
    const rowCls = [stagger && i < 15 ? "row-in" : "", locked ? "tier-locked" : ""].filter(Boolean).join(" ");
    const anim = rowCls ? ` class="${rowCls}"${stagger && i < 15 ? ` style="animation-delay:${i * 12}ms"` : ""}` : "";
    const c = a.country ? COUNTRY_BY_KEY[a.country] : null;
    const place = c ? `${c.flag} ${c.name}` : (a.region && a.region !== "global" ? REGION_NAMES[a.region] : "Global");
    const supplyTag = left !== null ? ` · <span class="${left === 0 ? "down" : ""}">${left === 0 ? "sold out" : left + " left"}</span>` : "";
    return `<tr data-id="${a.id}" data-i="${i}"${anim}>
      <td class="star-col"><button class="star-btn${isWatched(a.id) ? " on" : ""}" data-star="${a.id}" aria-label="Watchlist ${a.name}" title="Watchlist">${isWatched(a.id) ? "★" : "☆"}</button></td>
      <td><div class="cell-asset">
        ${GFX.icon(a, 30)}
        <div><div class="ca-name">${a.name}</div>
        <div class="ca-sub">${place} · ${a.sector || CATEGORIES[a.cat].name}${supplyTag}</div></div>
      </div></td>
      <td class="num${flash}"><b>${money(price)}</b></td>
      <td class="num ${r === null ? "" : r >= 0 ? "up" : "down"}${flash}">${r === null ? "—" : pct(r)}</td>
      <td class="trend-col">${sparklineSVG(S.season.hist[a.id], a.id)}</td>
      <td class="num">${a.yield ? (a.yield * 100).toFixed(1) + "%" : "—"}</td>
      <td class="num">${owned ? `<span class="pos-tag">${money(liveValue(a.id))}</span>` : "—"}</td>
      <td class="num"><button class="trade-btn" tabindex="-1">${locked ? "🔒" : "Trade"}</button></td>
    </tr>`;
  }).join("");
  body.innerHTML = html || `<tr><td colspan="8">${emptyHTML("scope", "Nothing matches. Even the meme coins are hiding.")}</td></tr>`;
  applyKbFocus();
}

// keyboard navigation over the visible market rows
function marketMove(dir) {
  if (!mktVisible.length) return;
  kbRow = Math.max(0, Math.min(mktVisible.length - 1, kbRow + dir));
  applyKbFocus(true);
}
function marketOpenFocused() {
  if (kbRow >= 0 && mktVisible[kbRow]) { Sound.play("click"); openAsset(mktVisible[kbRow].id); }
}
function applyKbFocus(scroll) {
  $$("#mkt-body tr").forEach(tr => tr.classList.toggle("kb-focus", +tr.dataset.i === kbRow));
  if (scroll && kbRow >= 0) {
    const tr = $(`#mkt-body tr[data-i="${kbRow}"]`);
    if (tr) tr.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
  }
}

// ---------- portfolio ----------
function renderBank() {
  const el = $("#bk-debt");
  if (!el) return;
  setNum(el, S.season.debt || 0);
  el.style.color = (S.season.debt || 0) > 0 ? "var(--down)" : "var(--text)";
  setNum($("#bk-cap"), loanCapacity());
  const gross = S.season.cash + liveHoldingsValue();
  const ratio = gross > 0 ? (S.season.debt || 0) / gross : 0;
  $("#bk-warn").style.color = ratio > 0.5 ? "var(--down)" : "var(--text-3)";
}

function renderPortfolio() {
  renderBank();
  const invested = liveHoldingsValue(), cost = totalCost();
  const pnl = invested - cost;
  setNum($("#p-invested"), invested);
  $("#p-positions").textContent = Object.keys(S.season.holdings).length + " positions";
  setNum($("#p-pnl"), pnl);
  $("#p-pnl").style.color = pnl >= 0 ? "var(--up)" : "var(--down)";
  const pp = $("#p-pnlpct");
  pp.textContent = cost ? pct(pnl / cost) + " on cost" : "—";
  pp.className = "chg " + (pnl >= 0 ? "up" : "down");
  setNum($("#p-income"), annualIncome());
  setNum($("#p-cash"), S.season.cash);

  const body = $("#pf-body");
  const ids = Object.keys(S.season.holdings).sort((a, b) => posValue(b) - posValue(a));
  const emptyEl = $("#pf-empty");
  emptyEl.classList.toggle("hidden", ids.length > 0);
  if (!ids.length) emptyEl.innerHTML = emptyHTML("vault", "All cash, no positions. Cash pays nothing — it also never rugs you. Your call.");
  body.innerHTML = ids.map(id => {
    const a = worldAsset(id);
    const qty = posQty(id), val = liveValue(id), pl = val - posCost(id), c = posCost(id);
    const w = invested ? val / invested * 100 : 0;
    return `<tr data-id="${id}">
      <td><div class="cell-asset">
        ${GFX.icon(a, 30)}
        <div><div class="ca-name">${a.name}</div>
        <div class="w-bar" style="width:110px"><div class="w-fill" style="width:${w}%"></div></div></div>
      </div></td>
      <td class="num">${qty.toLocaleString()}</td>
      <td class="num">${money(c / qty)}</td>
      <td class="num">${money(livePrice(id))}</td>
      <td class="num"><b>${money(val)}</b></td>
      <td class="num ${pl >= 0 ? "up" : "down"}">${money(pl)}<br><span style="font-size:11px">${c ? pct(pl / c) : ""}</span></td>
      <td class="num">
        <button class="sell-mini" data-s1="${id}">Sell 1</button>
        <button class="sell-mini" data-sa="${id}">All</button>
      </td>
    </tr>`;
  }).join("");
}

// ---------- asset modal ----------
let modalAssetId = null;
let amChartMap = null;
const VOL_LABEL = s => s < 0.15 ? "Low" : s < 0.3 ? "Medium" : s < 0.6 ? "High" : s < 1.2 ? "Very high" : "Degenerate";

function openAsset(id) {
  modalAssetId = id;
  const a = worldAsset(id);
  if (!a) return;
  const c = a.country ? COUNTRY_BY_KEY[a.country] : null;
  $("#am-banner").innerHTML = GFX.banner(a);
  $("#am-emoji").innerHTML = GFX.icon(a, 54);
  $("#am-name").textContent = a.name;
  $("#am-meta").textContent = [
    c ? `${c.flag} ${c.name}` : (a.region && a.region !== "global" ? REGION_NAMES[a.region] : "Global"),
    a.sector || CATEGORIES[a.cat].name,
    a.ticker || null,
    a.founded ? `est. ${a.founded}` : null,
  ].filter(Boolean).join(" · ");
  $("#trade-qty").value = 1;
  refreshAssetModal();
  $("#asset-modal").classList.remove("hidden");
}

function refreshAssetModal() {
  if (!modalAssetId) return;
  const id = modalAssetId, a = worldAsset(id);
  const price = livePrice(id);
  const r = lastReturn(id);
  $("#am-price").textContent = money(price);
  const chg = $("#am-chg");
  chg.textContent = r === null ? "no history yet" : pct(r) + " last year";
  chg.className = "chg " + (r === null ? "muted" : r >= 0 ? "up" : "down");

  // chart with cost-basis shading + crosshair
  const hist = S.season.hist[id] || [price];
  const svg = $("#am-chart");
  if (hist.length > 1) {
    const W = 560, H = 160, pad = 10;
    const min = Math.min(...hist), max = Math.max(...hist), span = max - min || 1;
    const x = i => pad + (i / (hist.length - 1)) * (W - 2 * pad);
    const y = v => H - pad - ((v - min) / span) * (H - 2 * pad);
    const P = hist.map((v, i) => [x(i), y(v)]);
    const pts = P.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const up = hist[hist.length - 1] >= hist[0];
    const col = up ? "#16d383" : "#ff5c5c";
    const qty = posQty(id);
    let basisLayer = "";
    if (qty > 0) {
      const basis = posCost(id) / qty;
      const by = Math.max(pad, Math.min(H - pad, y(basis)));
      // area between the price line and the basis line:
      // (under-curve region ∩ above basis) = green · (over-curve region ∩ below basis) = red
      const under = `${pts} ${x(hist.length - 1)},${H} ${x(0)},${H}`;
      const over = `${pts} ${x(hist.length - 1)},0 ${x(0)},0`;
      basisLayer = `
        <defs>
          <clipPath id="clip-under"><polygon points="${under}"/></clipPath>
          <clipPath id="clip-over"><polygon points="${over}"/></clipPath>
        </defs>
        <rect x="0" y="0" width="${W}" height="${by}" fill="#16d383" opacity=".13" clip-path="url(#clip-under)"/>
        <rect x="0" y="${by}" width="${W}" height="${H - by}" fill="#ff5c5c" opacity=".13" clip-path="url(#clip-over)"/>
        <line x1="${pad}" y1="${by}" x2="${W - pad}" y2="${by}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 4"/>
        <text x="${pad + 4}" y="${by - 4}" fill="#94a3b8" font-size="9.5" font-weight="600">avg cost ${money(basis)}</text>`;
    }
    svg.innerHTML = basisLayer +
      `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>` +
      P.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="${col}"/>`).join("") +
      `<g id="am-cross" style="opacity:0"><line y1="${pad}" y2="${H - pad}" stroke="#5b6b80" stroke-width="1" stroke-dasharray="3 3"/><circle r="4.5" fill="none" stroke="${col}" stroke-width="2"/></g>`;
    amChartMap = { P, vals: hist, W, H };
  } else {
    svg.innerHTML = `<text x="280" y="85" text-anchor="middle" fill="#5b6b80" font-size="12">Price history appears after your first simulated year</text>`;
    amChartMap = null;
  }

  const total10 = hist.length > 1 ? (hist[hist.length - 1] / hist[0] - 1) : null;
  const left = a.supply ? supplyLeft(id) : null;
  const locked = tierLocked(id);
  $("#am-stats").innerHTML = `
    <div class="am-stat"><small>Volatility</small><b>${VOL_LABEL(a.sigma)}</b></div>
    <div class="am-stat"><small>Yield</small><b>${a.yield ? (a.yield * 100).toFixed(1) + "%/yr" : "None"}</b></div>
    <div class="am-stat"><small>Since listing</small><b class="${total10 === null ? "" : total10 >= 0 ? "up" : "down"}">${total10 === null ? "—" : pct(total10)}</b></div>
    <div class="am-stat"><small>Supply</small><b>${a.supply ? `${left} of ${a.supply} left` : "Liquid"}</b></div>
    <div class="am-stat"><small>Max affordable</small><b>${maxAffordable(id).toLocaleString()}</b></div>
    ${a.shares ? `<div class="am-stat"><small>Market cap</small><b>${money(price * a.shares)}</b></div>` : ""}
    ${a.hq ? `<div class="am-stat"><small>HQ</small><b>${a.hq}</b></div>` : ""}
    ${a.employees ? `<div class="am-stat"><small>Employees</small><b>${a.employees.toLocaleString()}</b></div>` : ""}
    ${a.sqm ? `<div class="am-stat"><small>Floor area</small><b>${a.sqm.toLocaleString()} m²</b></div>` : ""}
    ${a.revenue ? `<div class="am-stat"><small>Est. revenue</small><b>${money(a.revenue)}/yr</b></div>` : ""}
    ${a.listYear ? `<div class="am-stat"><small>Listed</small><b>${calYear(a.listYear)}</b></div>` : ""}
    ${(a.facts || []).map(f => `<div class="am-stat niche"><small>${f[0]}</small><b>${f[1]}</b></div>`).join("")}`;

  const qty = posQty(id);
  const descLine = a.desc ? `<div class="am-desc">${a.desc}</div>` : "";
  const lockLine = locked ? `<div class="am-lock">🔒 ${TIER_LABEL[a.tier]}</div>` : "";
  $("#am-position").innerHTML = descLine + lockLine + (qty
    ? `You own <b>${qty.toLocaleString()}</b>${a.supply ? ` of ${a.supply}` : ""} · avg cost <b>${money(posCost(id) / qty)}</b> · value <b>${money(liveValue(id))}</b> · P&L <b class="${liveValue(id) - posCost(id) >= 0 ? "up" : "down"}">${money(liveValue(id) - posCost(id))}</b>`
    : `No position. Yet.`);

  updateTradeEstimate();
}

function updateTradeEstimate() {
  if (!modalAssetId) return;
  const q = Math.max(1, Math.floor(+$("#trade-qty").value || 1));
  const cost = q * livePrice(modalAssetId);
  const locked = tierLocked(modalAssetId);
  const left = supplyLeft(modalAssetId);
  $("#trade-estimate").textContent = locked
    ? "Locked — keep stacking."
    : left === 0 ? "Sold out — every unit is spoken for (mostly by you)."
    : `${q.toLocaleString()} × ${money(livePrice(modalAssetId))} = ${money(cost)} · cash after: ${money(S.season.cash - cost)}`;
  $("#btn-buy").disabled = locked || left === 0 || cost > S.season.cash || q > left || S.season.finished;
  $("#btn-buy").textContent = locked ? "🔒 Locked" : left === 0 ? "Sold out" : "Buy";
  $("#btn-sell").disabled = posQty(modalAssetId) < 1 || S.season.finished;
  $("#btn-sell").textContent = posQty(modalAssetId) ? `Sell (own ${posQty(modalAssetId).toLocaleString()})` : "Sell";
}

// ---------- RECAP CINEMATIC ----------
// A cancellable scheduler: one click anywhere skips to the finished state.
let recapTimers = [];
let recapDone = null;
function recapAfter(ms, fn) { recapTimers.push(setTimeout(fn, ms)); }
function recapSkip() {
  recapTimers.forEach(clearTimeout);
  recapTimers = [];
  if (recapDone) { const d = recapDone; recapDone = null; d(); }
}

function headlineIcon(text) {
  if (text.startsWith("🦢")) return "🦢";
  const t = text.toLowerCase();
  if (/crypto|coin|meme|nft|rug/.test(t)) return "🪙";
  if (/oil|energy|gas|uranium|nuclear/.test(t)) return "🛢️";
  if (/ai |tech|chip|cyber|space|stream/.test(t)) return "🤖";
  if (/property|housing|rate|rent|estate/.test(t)) return "🏠";
  if (/gold|metal|inflation|diamond/.test(t)) return "🥇";
  if (/bank|financ/.test(t)) return "🏦";
  if (/travel|holiday|airline/.test(t)) return "✈️";
  return "📰";
}

function showYearRecap(res) {
  $("#sim-overlay").classList.remove("hidden");
  $("#sim-title").textContent = `${calYear(res.entry.year)}`;
  const meta = REGIME_META[S.season.regime] || {};
  const regTag = $("#sim-regime");
  regTag.textContent = `${res.regime.emoji} ${res.regime.name}`;
  regTag.style.borderColor = meta.color || "var(--border)";
  regTag.style.color = meta.color || "var(--text-2)";
  regTag.classList.remove("stamp"); void regTag.offsetWidth; regTag.classList.add("stamp");
  $("#sim-flavor").textContent = meta.flavor || res.regime.desc;
  const hEl = $("#sim-headlines"); hEl.innerHTML = "";
  const mEl = $("#sim-movers"); mEl.innerHTML = "";
  const sEl = $("#sim-summary"); sEl.innerHTML = "";
  $("#recap-foot").classList.add("hidden");
  $("#recap-skip-hint").classList.remove("hidden");

  const chg = res.entry.nwAfter - res.entry.nwBefore;
  const fast = reduced();

  // ------- final (skipped-to) state -------
  const renderMovers = animate => {
    const maxAbs = Math.max(...res.best.map(x => Math.abs(x[1])), ...res.worst.map(x => Math.abs(x[1])), 0.01);
    const row = ([id, r]) => {
      const a = worldAsset(id);
      const w = Math.min(1, Math.abs(r) / maxAbs);
      return `<div class="mover-bar-row">
        <span class="mb-name">${GFX.chip(a, 15)} ${a.name}</span>
        <div class="mb-track"><div class="mb-fill ${r >= 0 ? "up" : "down"}" style="${animate ? "" : `transform:scaleX(${w})`}" data-w="${w}"></div></div>
        <span class="mb-val ${r >= 0 ? "up" : "down"}" data-r="${r}">${animate ? (r >= 0 ? "+0.0%" : "−0.0%") : pct(r)}</span>
      </div>`;
    };
    // your year: how each holding actually moved YOUR money
    const personal = Object.keys(S.season.holdings).map(id => {
      const r = res.returns[id];
      if (r == null) return null;
      const val = posValue(id);
      return { id, delta: val * r / (1 + r) };
    }).filter(Boolean).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 4);
    const personalHTML = personal.length
      ? `<h4>Your year</h4>` + personal.map(pr => {
          const a = worldAsset(pr.id);
          return `<div class="mover-bar-row"><span class="mb-name">${GFX.chip(a, 15)} ${a.name}</span>
            <div class="mb-track"></div>
            <span class="mb-val ${pr.delta >= 0 ? "up" : "down"}">${pr.delta >= 0 ? "+" : "−"}${money(Math.abs(pr.delta))}</span></div>`;
        }).join("") +
        (res.entry.income ? `<div class="mover-bar-row"><span class="mb-name">💵 Yield income</span><div class="mb-track"></div><span class="mb-val up">+${money(res.entry.income)}</span></div>` : "")
      : "";
    mEl.innerHTML = `<h4>Top gainers</h4>` + res.best.map(row).join("") +
      `<h4>Top losers</h4>` + res.worst.map(row).join("") + personalHTML;
    if (animate) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        mEl.querySelectorAll(".mb-fill").forEach(f => f.style.transform = `scaleX(${f.dataset.w})`);
        mEl.querySelectorAll(".mb-val").forEach(v => {
          const r = +v.dataset.r;
          animateNumber(v, 0, r, x => pct(x), 550);
        });
      }));
    }
  };

  const renderSummary = slam => {
    sEl.innerHTML = `<div class="sim-summary-box ${chg >= 0 ? "up" : "down"}${slam ? " slam" : ""}">
      ${chg >= 0 ? "You made" : "You lost"}<span class="pnl-fig">${money(Math.abs(chg))}</span>
      <small>${res.entry.income ? `includes ${money(res.entry.income)} of income · ` : ""}net worth now ${money(res.entry.nwAfter)}</small>
    </div>`;
    if (slam && !fast) {
      Sound.play(chg >= 0 ? "win" : "lose");
      const burst = document.createElement("div");
      burst.className = "pnl-burst";
      const bits = chg >= 0 ? ["💵", "🪙", "💰"] : ["•", "•", "∙"];
      for (let i = 0; i < 12; i++) {
        const b = document.createElement("i");
        b.textContent = bits[i % bits.length];
        if (chg < 0) b.style.color = "#5b6b80";
        const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 60 + Math.random() * 70;
        b.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        b.style.setProperty("--dy", Math.sin(ang) * dist - 30 + "px");
        b.style.setProperty("--rot", (Math.random() * 240 - 120) + "deg");
        burst.appendChild(b);
      }
      sEl.querySelector(".sim-summary-box").appendChild(burst);
      setTimeout(() => burst.remove(), 900);
    }
  };

  const renderFoot = () => {
    $("#recap-foot").classList.remove("hidden");
    $("#recap-skip-hint").classList.add("hidden");
    // compact season-so-far sparkline
    const sp = $("#recap-spark");
    const h = S.season.nwHistory, w = 120, hh = 34;
    if (h.length > 1) {
      const min = Math.min(...h), max = Math.max(...h), span = max - min || 1;
      const pts = h.map((v, i) => `${(i / (h.length - 1)) * w},${hh - 3 - ((v - min) / span) * (hh - 6)}`).join(" ");
      const up = h[h.length - 1] >= h[0];
      sp.innerHTML = `<polyline points="${pts}" fill="none" stroke="${up ? "#16d383" : "#ff5c5c"}" stroke-width="2" stroke-linejoin="round"/>`;
    } else sp.innerHTML = "";
    flushAchievements();
  };

  const age = START_AGE + res.entry.year;
  const birthdayHTML = age % 10 === 0
    ? `<div class="headline listing"><span class="hl-ic">🎂</span><span><b>MILESTONE</b> — You turned ${age}. The market did not send a card.</span></div>`
    : "";
  const marginHTML = (res.marginCalls && res.marginCalls.length)
    ? res.marginCalls.map(mc => {
        const a = worldAsset(mc.id);
        return `<div class="headline swan"><span class="hl-ic">🏦</span><span><b>MARGIN CALL</b> — the bank sold ${mc.qty.toLocaleString()} × ${a ? a.name : mc.id} for ${money(mc.proceeds)}. It did not ask nicely.</span></div>`;
      }).join("")
    : "";
  const listingsHTML = marginHTML + birthdayHTML + ((res.listings && res.listings.length)
    ? res.listings.map(a => {
        const c = a.country ? COUNTRY_BY_KEY[a.country] : null;
        return `<div class="headline listing"><span class="hl-ic">${GFX.chip(a, 16)}</span><span><b>NEW LISTING</b> — ${a.name} IPOs${c ? ` in ${c.flag} ${c.name}` : ""} at ${money(a.price)}</span></div>`;
      }).join("")
    : "");

  recapDone = () => {
    hEl.innerHTML = res.events.map(ev =>
      `<div class="headline${ev.text.startsWith("🦢") ? " swan" : ""}"><span class="hl-ic">${headlineIcon(ev.text)}</span><span>${ev.text.replace(/^🦢 /, "")}</span></div>`).join("") + listingsHTML;
    renderMovers(false);
    renderSummary(false);
    renderFoot();
    $("#swan-vignette").classList.remove("on");
  };

  if (fast) { recapSkip(); return; }

  // ------- the show -------
  let t = 500; // regime stamp settles first
  res.events.forEach(ev => {
    const isSwan = ev.text.startsWith("🦢");
    const text = ev.text.replace(/^🦢 /, "");
    recapAfter(t, () => {
      const div = document.createElement("div");
      div.className = "headline" + (isSwan ? " swan" : "");
      div.innerHTML = `<span class="hl-ic">${headlineIcon(ev.text)}</span><span class="hl-tx"></span><span class="caret"></span>`;
      hEl.appendChild(div);
      if (isSwan) {
        Sound.play("swan");
        const v = $("#swan-vignette");
        v.classList.add("on");
        setTimeout(() => v.classList.remove("on"), 1400);
        const modal = $("#sim-overlay .modal");
        modal.classList.remove("shake"); void modal.offsetWidth; modal.classList.add("shake");
      } else Sound.play("tick");
      const tx = div.querySelector(".hl-tx");
      let i = 0;
      const iv = setInterval(() => {
        tx.textContent = text.slice(0, ++i);
        if (i >= text.length) { clearInterval(iv); div.querySelector(".caret").remove(); }
      }, 30);
      recapTimers.push(iv);
    });
    t += 30 * text.length + 380;
  });

  if (listingsHTML) {
    recapAfter(t, () => {
      hEl.insertAdjacentHTML("beforeend", listingsHTML);
      Sound.play("unlock");
    });
    t += 450;
  }
  recapAfter(t, () => renderMovers(true));
  t += 900;
  // brief dark pause, then the P&L slams in
  recapAfter(t + 350, () => renderSummary(true));
  recapAfter(t + 1250, renderFoot);
  recapAfter(t + 1300, () => { recapDone = null; });
}

// ---------- WHILE YOU WERE AWAY (v7) ----------
// The fake market kept trading while the app was closed. On return, show what
// real-world hours/days of drift did to the player's holdings.
function fmtAway(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ${h % 24 ? (h % 24) + "h" : ""}`.trim();
}
const AWAY_WIRE = [
  "Overnight desks did overnight things.",
  "Rumors moved prices. Facts are still in a meeting.",
  "A whale sneezed somewhere. Charts reacted.",
  "Liquidity was thin. Opinions were not.",
  "The market traded while you slept. It does that.",
  "Algorithms argued among themselves. No winner declared.",
];
function showAwayDigest(awayMs, thenT) {
  const rep = awayReport(thenT, Date.now());
  if (!rep.rows.length) return;
  const up = rep.total >= 0;
  const wire = AWAY_WIRE[liveBucket() % AWAY_WIRE.length];
  $("#away-sub").textContent = `You were gone ${fmtAway(awayMs)}. ${wire}`;
  $("#away-total").className = "away-total " + (up ? "up" : "down");
  $("#away-rows").innerHTML = rep.rows.slice(0, 5).map(r2 => `
    <div class="away-row">
      <span>${GFX.chip(worldAsset(r2.id), 15)} ${r2.name}</span>
      <b class="${r2.delta >= 0 ? "up" : "down"}">${r2.delta >= 0 ? "+" : "−"}${money(Math.abs(r2.delta))}</b>
    </div>`).join("");
  $("#away-modal").classList.remove("hidden");
  animateNumber($("#away-total"), 0, rep.total, v => (v >= 0 ? "+" : "−") + money(Math.abs(v)), 900);
  Sound.play(up ? "buy" : "sell");
}

// ---------- SKIP-5 DIGEST — five years, one clean page ----------
function showSkipDigest(results, startYear, nwBefore) {
  recapSkip();
  $("#sim-overlay").classList.remove("hidden");
  const endYear = S.season.year;
  $("#sim-title").textContent = `${calYear(startYear + 1)} → ${calYear(endYear)}`;
  const meta = REGIME_META[S.season.regime] || {};
  const regTag = $("#sim-regime");
  regTag.textContent = `${REGIMES[S.season.regime].emoji} ${REGIMES[S.season.regime].name}`;
  regTag.style.borderColor = meta.color || "var(--border)";
  regTag.style.color = meta.color || "var(--text-2)";
  $("#sim-flavor").textContent = `${results.length} years pass. Age ${START_AGE + endYear}. Here's what mattered.`;

  const chg = netWorth() - nwBefore;
  const best = results.reduce((a, b) => (b.entry.nwAfter - b.entry.nwBefore) > (a.entry.nwAfter - a.entry.nwBefore) ? b : a);
  const worst = results.reduce((a, b) => (b.entry.nwAfter - b.entry.nwBefore) < (a.entry.nwAfter - a.entry.nwBefore) ? b : a);
  const income = results.reduce((s2, r) => s2 + (r.entry.income || 0), 0);
  const listings = results.flatMap(r => r.listings || []);
  const swans = results.filter(r => r.swan).length;

  $("#sim-headlines").innerHTML = `
    <div class="digest-stat"><span>Best year</span><b class="up">+${money(Math.max(0, best.entry.nwAfter - best.entry.nwBefore))} · ${calYear(best.entry.year)}</b></div>
    <div class="digest-stat"><span>Worst year</span><b class="down">${money(Math.min(0, worst.entry.nwAfter - worst.entry.nwBefore))} · ${calYear(worst.entry.year)}</b></div>
    <div class="digest-stat"><span>Yield income collected</span><b class="up">+${money(income)}</b></div>
    ${listings.length ? `<div class="digest-stat"><span>New listings</span><b>${listings.length} joined the market</b></div>` : ""}
    ${swans ? `<div class="digest-stat"><span>Black swans survived</span><b>🦢 ${swans}</b></div>` : ""}`;

  // five-year movers from history
  const n = results.length;
  const movers = listedAssets().map(a => {
    const h = S.season.hist[a.id];
    if (!h || h.length < n + 1) return null;
    return [a.id, h[h.length - 1] / h[h.length - 1 - n] - 1];
  }).filter(Boolean).sort((x, y) => y[1] - x[1]);
  const maxAbs = Math.max(Math.abs(movers[0]?.[1] || 0), Math.abs(movers[movers.length - 1]?.[1] || 0), 0.01);
  const row = ([id, r]) => {
    const a = worldAsset(id);
    return `<div class="mover-bar-row"><span class="mb-name">${a.emoji} ${a.name}</span>
      <div class="mb-track"><div class="mb-fill ${r >= 0 ? "up" : "down"}" style="transform:scaleX(${Math.min(1, Math.abs(r) / maxAbs)})"></div></div>
      <span class="mb-val ${r >= 0 ? "up" : "down"}">${pct(r)}</span></div>`;
  };
  $("#sim-movers").innerHTML = `<h4>${n}-year gainers</h4>` + movers.slice(0, 4).map(row).join("") +
    `<h4>${n}-year losers</h4>` + movers.slice(-4).reverse().map(row).join("");

  $("#sim-summary").innerHTML = `<div class="sim-summary-box ${chg >= 0 ? "up" : "down"}">
    ${chg >= 0 ? "You made" : "You lost"}<span class="pnl-fig">${money(Math.abs(chg))}</span>
    <small>across ${n} years · net worth now ${money(netWorth())}</small>
  </div>`;
  $("#recap-skip-hint").classList.add("hidden");
  const foot = $("#recap-foot");
  foot.classList.remove("hidden");
  const sp = $("#recap-spark");
  const h = S.season.nwHistory, w = 120, hh = 34;
  if (h.length > 1) {
    const min = Math.min(...h), max = Math.max(...h), span = max - min || 1;
    const pts = h.map((v, i) => `${(i / (h.length - 1)) * w},${hh - 3 - ((v - min) / span) * (hh - 6)}`).join(" ");
    sp.innerHTML = `<polyline points="${pts}" fill="none" stroke="${h[h.length - 1] >= h[0] ? "#16d383" : "#ff5c5c"}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  Sound.play(chg >= 0 ? "win" : "lose");
  flushAchievements();
}

// ---------- LIFE EVENT MODAL (v15) ----------
let lifeOnDone = null;
function showLifeEvent(ev, onDone) {
  lifeOnDone = onDone || null;
  $("#life-avatar").innerHTML = avatarHTML(S.profile.avatar);
  $("#life-icon").textContent = ev.icon;
  $("#life-year").textContent = `${calYear(S.season.year)} · Age ${START_AGE + S.season.year}`;
  $("#life-text").textContent = ev.text;
  const out = $("#life-outcome"); out.classList.add("hidden"); out.textContent = "";
  $("#life-continue").classList.add("hidden");
  const ch = $("#life-choices");
  ch.classList.remove("hidden");
  ch.innerHTML = ev.choices.map((c, i) => `<button class="life-choice" data-ci="${i}">${c.label}</button>`).join("");
  ch.querySelectorAll("[data-ci]").forEach(b => b.addEventListener("click", () => {
    Sound.play("click");
    const fx = ev.choices[+b.dataset.ci].fx;
    const outcome = applyLifeChoice(ev, +b.dataset.ci);
    ch.classList.add("hidden");
    out.innerHTML = `<span class="lo-text">${outcome}</span>${statFxChips(fx)}`;
    out.classList.remove("hidden");
    out.classList.remove("pop"); void out.offsetWidth; out.classList.add("pop");
    $("#life-continue").classList.remove("hidden");
    renderAll();
  }));
  $("#life-modal").classList.remove("hidden");
}
// render a choice's stat effects as +/- chips under the outcome line
function statFxChips(fx) {
  if (!fx) return "";
  const chips = MOGUL_STATS.filter(s => fx[s.key]).map(s => {
    const d = fx[s.key];
    return `<span class="fx-chip ${d > 0 ? "up" : "down"}" style="--fxc:${s.color}">${s.icon} ${s.short} ${d > 0 ? "+" : ""}${d}</span>`;
  }).join("");
  return chips ? `<span class="lo-fx">${chips}</span>` : "";
}
function closeLifeEvent() {
  $("#life-modal").classList.add("hidden");
  const d = lifeOnDone; lifeOnDone = null;
  if (d) d();
}

// ---------- CAREER RIBBON (v16) — a life-archetype title, awarded by how you played ----------
function careerRibbon() {
  const nw = liveNetWorth();
  const hist = S.season.nwHistory || [START_CASH];
  const peak = Math.max(S.bestScore || 0, nw, ...hist);
  const trough = Math.min(...hist);
  const f = S.flags || {};
  const casino = S.stats.casinoNet || 0;
  const holds = Object.keys(S.season.holdings).length;
  const trades = (S.season.trades || []).length;
  if (nw < START_CASH * 0.2) return { name: "The Cautionary Tale", desc: "A fortune is a terrible thing to misplace." };
  if (casino <= -750000) return { name: "The Degenerate", desc: "The house sends its sincere thanks." };
  if (casino >= 1000000) return { name: "House Always Wins", desc: "Beat the Vault at its own crooked game." };
  if (f.philanthropist || f.honored) return { name: "The Philanthropist", desc: "Gave it away with both hands — and a plaque." };
  if (f.notorious || f.connected) return { name: "The Robber Baron", desc: "Beloved by shareholders, feared by everyone else." };
  if (trough < START_CASH * 0.5 && nw > START_CASH * 3) return { name: "The Comeback King", desc: "Down to the studs, back to the penthouse." };
  if (holds >= 30) return { name: "The Monopolist", desc: "Owned a little of everything, and a lot of some." };
  if (trades <= SEASON_YEARS * 0.6 && nw > START_CASH * 3) return { name: "Diamond Hands", desc: "Bought, held, and never once blinked." };
  if (nw >= START_CASH * 100) return { name: "The Titan", desc: "Wealth you could see from orbit." };
  if (nw >= START_CASH * 10) return { name: "The Mogul", desc: "Generational money, generational nerve." };
  if (nw >= START_CASH) return { name: "The Operator", desc: "Compounded quietly, retired loudly." };
  return { name: "The Dabbler", desc: "Played the game. The game played back." };
}
// a light-hearted fake percentile from net worth, for the obituary flex
function moneyPercentile(nw) {
  if (nw >= START_CASH * 500) return 99.9;
  if (nw >= START_CASH * 50) return 99.5;
  if (nw >= START_CASH * 10) return 98;
  if (nw >= START_CASH * 3) return 92;
  if (nw >= START_CASH) return 78;
  if (nw >= START_CASH * 0.5) return 55;
  return 31;
}

// ---------- SEASON FINALE ----------
function showSeasonEnd() {
  $("#end-overlay").classList.remove("hidden");
  const stage = $("#end-overlay .finale-stage");
  const finalNW = netWorth(), r = roi();
  const verdict = finalNW >= START_CASH * 10 ? "Generational wealth. The group chat bows." :
    finalNW >= START_CASH * 3 ? "Certified mogul." :
    finalNW >= START_CASH ? "A solid decade of compounding." :
    finalNW >= START_CASH * 0.3 ? "A rough decade. Markets are cruel." : "Financial ruin. Honestly, iconic.";

  $("#end-avatar").innerHTML = avatarHTML(S.profile.avatar);
  $("#end-avatar").classList.remove("spotlight");
  // epitaph — from the life you chose to lead (BitLife death-card flavor)
  const EPITAPHS = {
    empire: "“He owned the board, then bought the table it sat on.”",
    family: "“Rich in what mattered. Also, just rich.”",
    parties: "“Died as they lived: overcommitted and slightly hungover.”",
  };
  const ep = (S.flags && EPITAPHS[S.flags.epitaph]) ||
    (finalNW >= START_CASH * 10 ? "“Died richer than the history books are comfortable with.”" :
     finalNW >= START_CASH ? "“Played the long game, and the long game paid.”" :
     "“The markets giveth. Mostly, they tooketh.”");
  const lifeCount = (S.season.lifeLog || []).length;
  $("#end-stats").innerHTML = `
    <div style="font-size:17px;font-weight:800;color:var(--text)">${S.profile.name || "Mogul"} · ${calYear(0)}–${calYear(S.season.year)}</div>
    <span class="fin-nw" id="fin-nw">$0</span>
    ${SEASON_YEARS}-year return <b class="${r >= 0 ? "up" : "down"}">${(r >= 0 ? "+" : "−") + Math.abs(r).toFixed(1)}%</b>
    · personal best <b>${money(S.bestScore)}</b>${lifeCount ? ` · ${lifeCount} life choices made` : ""}
    <div class="verdict" id="fin-verdict"></div>
    <div class="fin-epitaph">${ep}</div>`;
  // rank among rivals
  const beat = S.rivals.filter(x => finalNW > x.nw).length;
  const rankPos = S.rivals.length - beat + 1;
  $("#end-rank").textContent = S.rivals.length
    ? `#${rankPos} of ${S.rivals.length + 1} on your leaderboard — ${beat === S.rivals.length ? "clean sweep" : beat ? `${beat} rival${beat > 1 ? "s" : ""} beaten` : "the rivals send their regards"}`
    : "No rivals imported. Undefeated by default.";
  $("#end-rank").classList.remove("slide-in");

  // the awarded ribbon (life archetype)
  const ribbon = careerRibbon();
  $("#end-ribbon").innerHTML = `<span class="rb-kicker">AWARDED TITLE</span><span class="rb-name">${ribbon.name}</span><span class="rb-desc">${ribbon.desc}</span>`;

  const steps = [...stage.children];
  steps.forEach(el => el.classList.remove("fin-show"));
  const show = el => el && el.classList.add("fin-show");

  if (reduced()) {
    steps.forEach(show);
    $("#fin-nw").textContent = money(finalNW);
    $("#fin-verdict").textContent = verdict;
    return;
  }
  show($("#end-title"));
  setTimeout(() => { show($("#end-avatar")); $("#end-avatar").classList.add("spotlight"); }, 450);
  setTimeout(() => { show($("#end-ribbon")); $("#end-ribbon").classList.add("rb-pop"); }, 800);
  setTimeout(() => {
    show($("#end-stats"));
    // verdict typewriters in
    const v = $("#fin-verdict");
    let i = 0;
    const iv = setInterval(() => { v.textContent = verdict.slice(0, ++i); if (i >= verdict.length) clearInterval(iv); }, 28);
    animateNumber($("#fin-nw"), 0, finalNW, money, 1500);
  }, 1000);
  setTimeout(() => { show($("#end-rank")); $("#end-rank").classList.add("slide-in"); }, 2600);
  setTimeout(() => {
    show($("#btn-obituary")); show($("#btn-end-card")); show($("#btn-new-season"));
    if (finalNW >= START_CASH) { confettiPhysics(80); Sound.play("jackpot"); }
  }, 3100);
}

// physics confetti: gravity + horizontal drift, transform-only, hard cap
let confettiRunning = false;
function confettiPhysics(n) {
  if (confettiRunning || reduced()) return;
  confettiRunning = true;
  const layer = $("#confetti-layer");
  const emojis = ["💵", "🪙", "💰", "💎", "✨"];
  const W = innerWidth;
  const parts = [];
  for (let i = 0; i < Math.min(n, 80); i++) {
    const el = document.createElement("i");
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.fontSize = (13 + Math.random() * 12) + "px";
    layer.appendChild(el);
    parts.push({
      el,
      x: Math.random() * W,
      y: -30 - Math.random() * 240,
      vx: (Math.random() - 0.5) * 90,     // px/s drift
      vy: 40 + Math.random() * 80,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 240,
    });
  }
  const G = 340; // px/s²
  let last = performance.now();
  const H = innerHeight + 60;
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let alive = 0;
    for (const p of parts) {
      if (p.y > H) { if (p.el) { p.el.remove(); p.el = null; } continue; }
      alive++;
      p.vy += G * dt;
      p.vx *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
    }
    if (alive) requestAnimationFrame(tick);
    else { layer.innerHTML = ""; confettiRunning = false; }
  }
  requestAnimationFrame(tick);
}

// ---------- rivals ----------
function renderRivals() {
  const el = $("#rivals-list");
  const you = { name: S.profile.name || "You", avatar: S.profile.avatar, nw: Math.round(liveNetWorth()), roi: Math.round(roi()), seed: S.season.seed, year: S.season.year, you: true };
  const all = [...S.rivals, you].sort((a, b) => b.nw - a.nw);
  $("#rv-count").textContent = S.rivals.length + " rival" + (S.rivals.length === 1 ? "" : "s");
  el.innerHTML = all.map((r2, i) => {
    const same = !r2.you && (r2.seed === S.season.seed || S.pastSeasons.some(s => s.seed === r2.seed));
    return `<div class="rival-row${r2.you ? " you" : ""}"${r2.you ? "" : ` data-h2h="${r2.name.replace(/"/g, "&quot;")}"`}>
      <span class="rival-rank">${i + 1}</span>
      ${avatarHTML(r2.avatar)}
      <span class="rival-name">${r2.name}${r2.you ? " (you)" : ""}${same ? ` <span class="same-tag">⚔ same market</span>` : ""}
        <small>Year ${r2.year} · ROI ${r2.roi >= 0 ? "+" : ""}${r2.roi}%</small></span>
      <span class="rival-nw">${money(r2.nw)}</span>
    </div>`;
  }).join("");
  if (!S.rivals.length) el.insertAdjacentHTML("beforeend", emptyHTML("trophy", "No rivals yet. Import a friend's card — money is more fun with witnesses."));
  el.querySelectorAll("[data-h2h]").forEach(row => row.addEventListener("click", () => openH2H(row.dataset.h2h)));
  $("#cas-net").textContent = money(S.stats.casinoNet);
  $("#cas-net").style.color = S.stats.casinoNet >= 0 ? "var(--up)" : "var(--down)";
}

// head-to-head
function openH2H(name) {
  const rv = S.rivals.find(r => r.name === name);
  if (!rv) return;
  const meNW = Math.round(netWorth()), meROI = Math.round(roi());
  const same = rv.seed === S.season.seed || S.pastSeasons.some(s => s.seed === rv.seed);
  const lead = meNW - rv.nw;
  const maxNW = Math.max(meNW, rv.nw, 1);
  $("#h2h-body").innerHTML = `
    <div class="h2h-vs">
      <div class="h2h-col">${avatarHTML(S.profile.avatar)}<div class="h2h-name">${S.profile.name || "You"}</div><div class="h2h-roi ${meROI >= 0 ? "up" : "down"}">ROI ${meROI >= 0 ? "+" : ""}${meROI}%</div></div>
      <div class="h2h-flash">VS</div>
      <div class="h2h-col">${avatarHTML(rv.avatar)}<div class="h2h-name">${rv.name}</div><div class="h2h-roi ${rv.roi >= 0 ? "up" : "down"}">ROI ${rv.roi >= 0 ? "+" : ""}${rv.roi}%</div></div>
    </div>
    ${same ? `<div class="same-tag" style="margin-bottom:4px">⚔ same market — same luck, pure skill</div>` : ""}
    <div class="h2h-bars">
      <div class="h2h-bar-row"><span class="hb-label">You</span><div class="hb-bar"><div class="hb-fill" style="background:var(--accent)" data-w="${meNW / maxNW}"></div></div><span class="hb-val">${money(meNW)}</span></div>
      <div class="h2h-bar-row"><span class="hb-label">${rv.name}</span><div class="hb-bar"><div class="hb-fill" style="background:var(--gold)" data-w="${rv.nw / maxNW}"></div></div><span class="hb-val">${money(rv.nw)}</span></div>
    </div>
    <div class="h2h-verdict ${lead >= 0 ? "up" : "down"}">
      ${lead >= 0 ? `Ahead by ${money(lead)}` : `Behind by ${money(-lead)}`}
      <small>${lead >= 0 ? "Stay liquid. Stay smug." : "A single good year fixes this. Probably."}</small>
    </div>`;
  $("#h2h-modal").classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$("#h2h-body .hb-fill").forEach(f => f.style.transform = `scaleX(${f.dataset.w})`);
  }));
}

// ---------- news archive ----------
function openArchive() {
  const el = $("#archive-body");
  if (!S.season.log.length) {
    el.innerHTML = emptyHTML("flat", "No history yet. Simulate a year — the archive writes itself.");
  } else {
    el.innerHTML = [...S.season.log].reverse().map(e => {
      const reg = REGIMES[e.regime];
      const meta = REGIME_META[e.regime] || {};
      return `<div class="archive-year">
        <div class="archive-regime" style="border-left:3px solid ${meta.color || "var(--border)"}">
          <span class="ar-y">YEAR ${e.year}</span><span>${reg.emoji} ${reg.name}</span>
        </div>
        ${e.headlines.map(hl => `<div class="archive-hl${hl.startsWith("🦢") ? " swan" : ""}">${hl}</div>`).join("")}
      </div>`;
    }).join("");
  }
  $("#archive-modal").classList.remove("hidden");
}

// ---------- awards ----------
function renderAwards() {
  // career stats strip
  const st = S.stats;
  const seasons = S.pastSeasons.length;
  $("#stats-strip").innerHTML = `
    <div class="stat-mini"><small>Seasons</small><b>${seasons}</b></div>
    <div class="stat-mini"><small>Years simulated</small><b>${st.yearsTotal || 0}</b></div>
    <div class="stat-mini"><small>Casino net</small><b class="${st.casinoNet >= 0 ? "up" : "down"}">${money(st.casinoNet)}</b></div>
    <div class="stat-mini"><small>Best flip streak</small><b>${st.bestStreak || 0}×</b></div>
    <div class="stat-mini"><small>Best year</small><b class="up">${st.biggestGain ? "+" + money(st.biggestGain) : "—"}</b></div>
    <div class="stat-mini"><small>Worst year</small><b class="down">${st.biggestLoss ? money(st.biggestLoss) : "—"}</b></div>`;

  const el = $("#achievement-list");
  let got = 0;
  el.innerHTML = ACHIEVEMENTS.map(a => {
    const has = S.achievements.includes(a.id);
    if (has) got++;
    return `<div class="ach${has ? "" : " locked"}">
      <div class="ach-emoji">${a.emoji}</div>
      <div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
    </div>`;
  }).join("");
  $("#ach-count").textContent = `${got} / ${ACHIEVEMENTS.length}`;

  const sl = $("#seasons-list");
  if (!S.pastSeasons.length) sl.innerHTML = emptyHTML("trophy", "No finished seasons. Ten years takes about ten minutes around here.");
  else sl.innerHTML = [...S.pastSeasons].reverse().map((s, i) =>
    `<div class="season-row"><span>Season ${S.pastSeasons.length - i}</span><span><b>${money(s.finalNW)}</b> · ROI ${s.roi >= 0 ? "+" : ""}${s.roi}%</span></div>`).join("");
}

// ---------- creator ----------
const OPT_LABELS = { skin: "Skin", hair: "Hair", hairColor: "Hair color", acc: "Accessory", outfit: "Outfit", bg: "Backdrop" };
function openCreator() {
  $("#creator-overlay").classList.remove("hidden");
  $("#creator-name").value = S.profile.name || "";
  renderCreator();
}
function renderCreator() {
  $("#creator-preview").innerHTML = avatarHTML(S.profile.avatar);
  const el = $("#creator-options");
  el.innerHTML = "";
  for (const key in AVATAR_OPTS) {
    const group = document.createElement("div");
    group.className = "opt-group";
    group.innerHTML = `<div class="opt-label">${OPT_LABELS[key]}</div>`;
    const row = document.createElement("div");
    row.className = "opt-row";
    AVATAR_OPTS[key].forEach((opt, i) => {
      const sw = document.createElement("div");
      sw.className = "opt-swatch" + (S.profile.avatar[key] === i ? " sel" : "");
      sw.setAttribute("role", "button");
      sw.setAttribute("tabindex", "0");
      if (key === "hair") sw.textContent = ["🚫", "✂️", "⚡", "🌀", "🌊"][i];
      else if (key === "acc") sw.textContent = opt || "🚫";
      else sw.style.background = opt;
      const pick = () => { Sound.play("click"); S.profile.avatar[key] = i; save(); renderCreator(); };
      sw.addEventListener("click", pick);
      sw.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      row.appendChild(sw);
    });
    group.appendChild(row);
    el.appendChild(group);
  }

  // v8: app style — your accent, your felt. Makes the app feel like yours.
  const ACCENTS = { indigo: "#5b8cff", violet: "#8b7cff", mint: "#16d383", gold: "#e8b54d", coral: "#ff7a68" };
  const FELTS = { emerald: ["#14532d", "#0b3a1f"], navy: ["#173a5e", "#0c2440"], crimson: ["#5e1721", "#3a0c14"] };
  const mkStyleGroup = (label, opts, key, apply) => {
    const g = document.createElement("div");
    g.className = "opt-group";
    g.innerHTML = `<div class="opt-label">${label}</div>`;
    const row = document.createElement("div");
    row.className = "opt-row";
    for (const k in opts) {
      const sw = document.createElement("div");
      sw.className = "opt-swatch" + (S.settings[key] === k ? " sel" : "");
      sw.setAttribute("role", "button"); sw.setAttribute("tabindex", "0"); sw.title = k;
      sw.style.background = Array.isArray(opts[k]) ? `linear-gradient(135deg, ${opts[k][0]}, ${opts[k][1]})` : opts[k];
      const pick = () => { Sound.play("click"); S.settings[key] = k; save(); apply(); renderCreator(); };
      sw.addEventListener("click", pick);
      sw.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(); } });
      row.appendChild(sw);
    }
    g.appendChild(row);
    el.appendChild(g);
  };
  mkStyleGroup("App accent", ACCENTS, "accent", applyStyle);
  mkStyleGroup("Casino felt", FELTS, "felt", applyStyle);
}

// apply the player's chosen cosmetics across the whole app
const STYLE_ACCENTS = { indigo: ["#5b8cff", "#4a76e8"], violet: ["#8b7cff", "#6f5fe0"], mint: ["#16d383", "#0fae6b"], gold: ["#e8b54d", "#c99633"], coral: ["#ff7a68", "#e05b4a"], platinum: ["#dfe6f2", "#9fb0cc"] };
const STYLE_FELTS = { emerald: ["#14532d", "#0b3a1f"], navy: ["#173a5e", "#0c2440"], crimson: ["#5e1721", "#3a0c14"], onyx: ["#1c1c26", "#0a0a10"], royal: ["#3b1d5e", "#20103a"] };
function applyStyle() {
  const st = S.settings || {};
  const a = STYLE_ACCENTS[st.accent] || STYLE_ACCENTS.indigo;
  const f = STYLE_FELTS[st.felt] || STYLE_FELTS.emerald;
  const r = document.documentElement.style;
  r.setProperty("--accent", a[0]);
  r.setProperty("--accent-2", a[1]);
  r.setProperty("--felt-a", f[0]);
  r.setProperty("--felt-b", f[1]);
  document.body.setAttribute("data-cardback", st.cardBack || "classic");
  document.body.setAttribute("data-room", st.room || "midnight");
  const name = (S.profile && S.profile.name) || "M";
  const mono = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "M";
  r.setProperty("--mono", `"${mono}"`);
}

// ---------- CUSTOMIZATION STUDIO (v13) — earned cosmetics ----------
// Each locked item declares how it's unlocked; the picker gates selection and
// shows the requirement, so cosmetics double as achievement rewards.
function bestNW() { return Math.max(S.bestScore || 0, liveNetWorth()); }
const COSMETICS = {
  accent: { label: "App accent", get: () => S.settings.accent, set: k => S.settings.accent = k, items: [
    { key: "indigo", name: "Indigo", sw: STYLE_ACCENTS.indigo },
    { key: "violet", name: "Violet", sw: STYLE_ACCENTS.violet },
    { key: "mint", name: "Mint", sw: STYLE_ACCENTS.mint },
    { key: "gold", name: "Gold", sw: STYLE_ACCENTS.gold },
    { key: "coral", name: "Coral", sw: STYLE_ACCENTS.coral },
    { key: "platinum", name: "Platinum", sw: STYLE_ACCENTS.platinum, req: { test: () => bestNW() >= 250e6, label: "Reach $250M net worth" } },
  ] },
  felt: { label: "Casino felt", get: () => S.settings.felt, set: k => S.settings.felt = k, items: [
    { key: "emerald", name: "Emerald", sw: STYLE_FELTS.emerald },
    { key: "navy", name: "Navy", sw: STYLE_FELTS.navy },
    { key: "crimson", name: "Crimson", sw: STYLE_FELTS.crimson },
    { key: "onyx", name: "Onyx", sw: STYLE_FELTS.onyx, req: { test: () => S.stats.casinoNet >= 50000, label: "Win $50K at the casino" } },
    { key: "royal", name: "Royal Purple", sw: STYLE_FELTS.royal, req: { test: () => (S.pastSeasons || []).length >= 1, label: "Finish a season" } },
  ] },
  cardBack: { label: "Card back", get: () => S.settings.cardBack, set: k => S.settings.cardBack = k, card: true, items: [
    { key: "classic", name: "Classic" },
    { key: "noir", name: "Noir" },
    { key: "onyx", name: "Onyx", req: { test: () => S.stats.casinoNet >= 25000, label: "Win $25K at the casino" } },
    { key: "gold", name: "Gold Leaf", req: { test: () => bestNW() >= 100e6, label: "Reach $100M net worth" } },
    { key: "crest", name: "Monogram", req: { test: () => !!(S.profile && S.profile.name), label: "Name your mogul" } },
  ] },
  room: { label: "Casino room", get: () => S.settings.room, set: k => S.settings.room = k, room: true, items: [
    { key: "midnight", name: "Midnight" },
    { key: "noir", name: "Noir" },
    { key: "gilded", name: "Gilded Hall", req: { test: () => bestNW() >= 50e6, label: "Reach $50M net worth" } },
  ] },
};
function cosUnlocked(item) { return !item.req || item.req.test(); }
function renderStudio() {
  const el = $("#studio-body");
  el.innerHTML = Object.keys(COSMETICS).map(cat => {
    const c = COSMETICS[cat];
    const cur = c.get();
    return `<div class="studio-group">
      <div class="opt-label">${c.label}</div>
      <div class="studio-row">${c.items.map(it => {
        const ok = cosUnlocked(it);
        const sel = cur === it.key;
        let inner;
        if (c.card) inner = `<span class="studio-cardback cb-${it.key}"></span>`;
        else if (c.room) inner = `<span class="studio-room room-${it.key}"></span>`;
        else inner = `<span class="studio-swatch" style="background:linear-gradient(135deg,${it.sw[0]},${it.sw[1]})"></span>`;
        return `<button class="studio-tile${sel ? " sel" : ""}${ok ? "" : " locked"}" data-cat="${cat}" data-key="${it.key}" ${ok ? "" : "disabled"} title="${ok ? it.name : (it.req.label)}">
          ${inner}
          <span class="studio-name">${it.name}</span>
          ${ok ? "" : `<span class="studio-lock">🔒 ${it.req.label}</span>`}
        </button>`;
      }).join("")}</div>
    </div>`;
  }).join("");
}

// ---------- ASSETS REALM — boutique catalog for ownable things ----------
let estCat = "all", estCountry = "all";

function renderAssets() {
  const chipEl = $("#est-filters");
  if (!chipEl) return;
  // category chips
  const mkChip = (id, label, active) => `<button class="chip${active ? " active" : ""}" data-est="${id}">${label}</button>`;
  let chips = mkChip("all", "Everything", estCat === "all");
  for (const c of ESTATE_CATS) chips += mkChip(c, CATEGORIES[c].emoji + " " + CATEGORIES[c].name, estCat === c);
  chips += mkChip("owned", "Owned", estCat === "owned");
  chipEl.innerHTML = chips;

  // country chips (generated worlds only)
  const cEl = $("#est-countries");
  const countries = worldCountries();
  if (countries.length) {
    const estateCountries = countries.filter(c => worldAssets().some(a => a.country === c.key && ESTATE_CATS.includes(a.cat)));
    cEl.innerHTML = `<button class="chip country-chip${estCountry === "all" ? " active" : ""}" data-estc="all">🌍 World</button>` +
      estateCountries.map(c => `<button class="chip country-chip${estCountry === c.key ? " active" : ""}" data-estc="${c.key}">${c.flag} ${c.name}</button>`).join("");
  } else cEl.innerHTML = "";

  const rows = listedAssets().filter(a => {
    if (!ESTATE_CATS.includes(a.cat)) return false;
    if (estCat === "owned") { if (posQty(a.id) <= 0) return false; }
    else if (estCat !== "all" && a.cat !== estCat) return false;
    if (estCountry !== "all" && a.country !== estCountry) return false;
    return true;
  }).sort((a, b) =>
    (tierLocked(a.id) - tierLocked(b.id)) ||                  // buyable first, dreams below
    S.season.prices[b.id] - S.season.prices[a.id]);

  const grid = $("#assets-grid");
  if (!rows.length) {
    grid.innerHTML = emptyHTML("vault", estCat === "owned"
      ? "You own nothing here yet. The skyline isn't going to buy itself."
      : "Nothing matches. Try another country — the world is large and mostly for sale.");
    return;
  }
  grid.innerHTML = rows.map(a => {
    const price = livePrice(a.id);
    const r = lastReturn(a.id);
    const owned = posQty(a.id);
    const left = a.supply ? supplyLeft(a.id) : null;
    const locked = tierLocked(a.id);
    const c = a.country ? COUNTRY_BY_KEY[a.country] : null;
    const [tc1, tc2] = GFX.colors(a);
    return `<div class="est-card${locked ? " locked" : ""}${owned ? " owned" : ""}" data-id="${a.id}" role="button" tabindex="0" aria-label="${a.name}" style="--tc1:${tc1};--tc2:${tc2}">
      ${owned ? `<span class="est-owned-tag">OWNED${a.supply ? ` ${owned}/${a.supply}` : ""}</span>` : ""}
      ${locked ? `<span class="est-lock">🔒</span>` : ""}
      <div class="est-art">${GFX.icon(a, 46)}</div>
      <div class="est-name">${a.name}</div>
      <div class="est-place">${c ? `${c.flag} ${c.name}` : "Global"} · ${a.sector || CATEGORIES[a.cat].name}</div>
      <div class="est-row">
        <b class="est-price">${money(price)}</b>
        <span class="chg ${r === null ? "muted" : r >= 0 ? "up" : "down"}">${r === null ? "new" : pct(r)}</span>
      </div>
      <div class="est-meta">
        ${a.yield ? `<span class="est-badge up-b">${(a.yield * 100).toFixed(1)}% yield</span>` : ""}
        ${left !== null ? `<span class="est-badge${left === 0 ? " sold-b" : ""}">${left === 0 ? "SOLD OUT" : left + " left"}</span>` : ""}
        ${a.facts && a.facts[0] ? `<span class="est-badge">${a.facts[0][0]}: ${a.facts[0][1]}</span>` : ""}
      </div>
    </div>`;
  }).join("");
}

// ---------- EMPIRE — isometric board of everything you own ----------
function renderEmpire() {
  const el = $("#empire");
  if (!el) return;
  const tiles = [];
  // owned estate first — the skyline
  const KIND_ICON = { realestate: null, business: null, luxury: null };
  for (const id of Object.keys(S.season.holdings)) {
    const a = worldAsset(id);
    if (!a || !ESTATE_CATS.includes(a.cat)) continue;
    tiles.push({ icon: GFX.icon(a, 26), name: a.name, value: liveValue(id), cls: a.arch === "legacy" ? "legacy-t" : a.cat, qty: posQty(id) });
  }
  tiles.sort((x, y) => y.value - x.value);
  // liquid wealth as two civic buildings
  let marketVal = 0;
  for (const id of Object.keys(S.season.holdings)) {
    const a = worldAsset(id);
    if (a && MARKET_CATS.includes(a.cat)) marketVal += liveValue(id);
  }
  if (marketVal > 0) tiles.push({ icon: GFX.icon({ id: "xseat", cat: "stocks", sector: "Technology" }, 26), name: "Exchange seat", value: marketVal, cls: "market" });
  tiles.push({ icon: GFX.icon({ id: "vault", cat: "stocks", sector: "Banking" }, 26), name: "Cash vault", value: S.season.cash, cls: "cash" });

  $("#emp-count").textContent = `${tiles.length} holding${tiles.length === 1 ? "" : "s"} · ${money(liveNetWorth())}`;

  const estateTiles = tiles.filter(t => !["cash", "market"].includes(t.cls));
  if (!estateTiles.length) {
    el.innerHTML = `<div class="empire-stage empty-stage">${
      tiles.map(t => empireTileHTML(t)).join("")
    }<div class="empire-hint">Empty plots. Buy property, businesses and collectibles in the <b>Assets</b> tab — watch your skyline grow.</div></div>`;
    return;
  }
  el.innerHTML = `<div class="empire-stage">${tiles.map(t => empireTileHTML(t)).join("")}</div>`;
}

let empireSeen = new Set();
function empireTileHTML(t) {
  // height scales with log of value: $10K ≈ short, $50M ≈ skyscraper
  const h = Math.max(18, Math.min(110, Math.round((Math.log10(Math.max(1, t.value)) - 3) * 26)));
  const key = t.name;
  const fresh = !empireSeen.has(key) && !reduced();
  empireSeen.add(key);
  return `<div class="iso-tile ${t.cls}${fresh ? " iso-pop" : ""}" title="${t.name} — ${money(t.value)}">
    <span class="iso-emoji">${t.icon || t.emoji}</span>
    <div class="iso-cube" style="--h:${h}px"><i class="f-top"></i><i class="f-left"></i><i class="f-right"></i></div>
    <div class="iso-label"><b>${money(t.value)}</b><span>${t.name}${t.qty > 1 ? ` ×${t.qty}` : ""}</span></div>
  </div>`;
}

// ---------- sound toggle ----------
function renderSoundToggle() {
  const muted = S.settings && S.settings.muted;
  $("#sound-ic").textContent = muted ? "🔇" : "🔊";
  $("#btn-sound").classList.toggle("muted", !!muted);
}

// ---------- LIVE DEALERS (v12) ----------
// Each table has a named croupier with a drawn avatar and a reactive speech
// bubble — the "live dealer" feel, simulated for our offline use case.
const DEALERS = {
  poker:     { name: "The Baron", spec: { skin: 4, hair: 0, tie: 4, hairStyle: 0, glasses: 1 } },
  blackjack: { name: "Marco",     spec: { skin: 2, hair: 1, tie: 0, hairStyle: 0 } },
  roulette:  { name: "Genevieve", spec: { skin: 0, hair: 4, tie: 3, hairStyle: 1 } },
  slots:     { name: "Rex",       spec: { skin: 3, hair: 0, tie: 4, hairStyle: 2 } },
  coin:      { name: "Vera",      spec: { skin: 1, hair: 3, tie: 1, hairStyle: 1 } },
  dice:      { name: "Sable",     spec: { skin: 4, hair: 4, tie: 3, hairStyle: 1 } },
  crash:     { name: "Kai",       spec: { skin: 2, hair: 0, tie: 1, hairStyle: 2, glasses: 1 } },
};
const DEALER_LINES = {
  greet:  ["Welcome to the table.", "Good to see you. Feeling lucky?", "The felt's warm — let's play.", "Back for more? I respect it."],
  win:    ["The house tips its hat.", "Nicely played.", "That one's yours.", "Winner — don't let it swell your head."],
  bigwin: ["Now THAT is a number.", "The pit boss just looked up.", "Somebody chalk that on the board.", "Beautiful. Genuinely beautiful."],
  lose:   ["The table giveth, and taketh.", "Tough. Go again?", "House rules, my friend.", "Ouch. Shake it off."],
  push:   ["A stand-off — nobody blinks.", "Push. We reset.", "Even money. Night's young."],
  cashout:["Walking away a winner. Rare breed.", "Smart. Colour up and go.", "The vault will miss you."],
};
const DEALER_TABLE = {
  poker: {
    deal:    ["Five cards each. Read 'em and decide.", "Cards are out. Fold, or make me qualify.", "There's your hand. Impress me."],
    fold:    ["Folding? The Baron respects discretion.", "Away it goes. Cautious. Wise, even.", "No shame in a fold."],
    no_qualify: ["I didn't qualify — you take the ante.", "Ace-King eluded me. Lucky you.", "House couldn't answer. Pay the man."],
    win:     ["You beat me clean. Well read.", "The Baron concedes. This time.", "Your hand holds. Nicely done."],
    bigwin:  ["A monster hand at MY table. Bravo.", "I'll be telling this story for years.", "The Baron bows."],
    lose:    ["The Baron takes it. Again?", "Read that one wrong, didn't you.", "House wins the showdown."],
  },
  blackjack: { deal: ["Cards are out.", "Twenty-one's the target.", "Your move."] },
  roulette:  { bet: ["No more bets — round and round.", "The wheel decides now.", "Ball's in play."] },
  slots:     { bet: ["Pull it. Let's see.", "Spinning up.", "Line 'em up."] },
  coin:      { bet: ["Heads or tails, my friend.", "Call it in the air.", "One flip, one fate."] },
  dice:      { bet: ["Dice are yours.", "Over, under, or the magic seven?", "Let 'em roll."] },
  crash:     { bet: ["Rocket's lit. Watch the number.", "Hold your nerve.", "Up she goes."] },
};
function renderDealers() {
  let i = 0;
  for (const t in DEALERS) {
    const av = $("#dav-" + t), nm = $("#dnm-" + t);
    if (av && !av.dataset.drawn) {
      av.innerHTML = GFX.dealer(DEALERS[t].spec, 46);
      av.dataset.drawn = "1";
      av.style.setProperty("--bd", (i * 1.3).toFixed(1) + "s");  // desync the blinks
      av.style.setProperty("--rd", (i * 0.7).toFixed(1) + "s");  // desync the breathing
    }
    if (nm) nm.textContent = DEALERS[t].name;
    i++;
  }
}
function greetDealers() { for (const t in DEALERS) dealerSay(t, "greet"); }
function dealerSay(table, event) {
  const el = $("#dsay-" + table);
  if (!el) return;
  const bank = (DEALER_TABLE[table] && DEALER_TABLE[table][event]) || DEALER_LINES[event];
  if (!bank || !bank.length) return;
  el.textContent = bank[Math.floor(Math.random() * bank.length)];
  el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
}

// ---------- Caribbean Stud render ----------
function dealtCard(html, i) {
  // inject a per-card stagger delay so a hand deals out one card at a time
  return html.replace('class="pcard', `style="animation-delay:${i * 85}ms" class="pcard`);
}
function renderPoker(st) {
  const decide = st && st.phase === "decide";
  $("#cs-player").innerHTML = st ? st.player.map((c, i) => dealtCard(GFX.card(c), i)).join("") : "";
  $("#cs-dealer").innerHTML = st ? st.dealer.map((c, i) => dealtCard(GFX.card(c, decide && i > 0), i)).join("") : "";
  $("#cs-pname").textContent = st && !decide ? pokerName(st.playerRank || rankPoker(st.player)) : (decide ? "hidden" : "");
  $("#cs-dname").textContent = st && !decide ? pokerName(st.dealerRank || rankPoker(st.dealer)) : (decide ? "?" : "");
  $("#btn-cs-deal").disabled = !!decide;
  $("#btn-cs-play").disabled = !decide;
  $("#btn-cs-fold").disabled = !decide;
}

// ---------- MOGUL FORTUNE LOBBY (v14) ----------
// The casino is a lobby: pick a table, it opens in a focused view. Existing
// game markup is reused verbatim — the lobby is just a new parent layer.
// distinct premium emblem per game (gradient tile + white glyph)
const GAME_EMBLEM = {
  poker:     { g: ["#8b7cff", "#5f4de0"], in: `<text x="20" y="28" text-anchor="middle" font-size="22" fill="#fff" font-weight="700">♠</text>` },
  blackjack: { g: ["#16d383", "#0d9a5f"], in: `<text x="20" y="27" text-anchor="middle" font-size="16" fill="#fff" font-weight="800" font-family="Space Grotesk,sans-serif">21</text>` },
  roulette:  { g: ["#e8b54d", "#b07d20"], in: `<circle cx="20" cy="20" r="9" fill="none" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="2" fill="#fff"/><path d="M20 11v18 M11 20h18" stroke="#fff" stroke-width="1.4"/>` },
  slots:     { g: ["#f472b6", "#b8478f"], in: `<rect x="11" y="13" width="4.5" height="14" rx="1.5" fill="#fff"/><rect x="17.7" y="13" width="4.5" height="14" rx="1.5" fill="#fff"/><rect x="24.5" y="13" width="4.5" height="14" rx="1.5" fill="#fff"/>` },
  crash:     { g: ["#5b9dff", "#3d6bff"], in: `<path d="M11 27 L20 17 L24 21 L30 13" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 13 h5 v5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` },
  dice:      { g: ["#38bdf8", "#0e87c4"], in: `<rect x="12" y="12" width="16" height="16" rx="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="1.6" fill="#fff"/><circle cx="24" cy="24" r="1.6" fill="#fff"/><circle cx="20" cy="20" r="1.6" fill="#fff"/>` },
};
function casinoEmblem(key) {
  const e = GAME_EMBLEM[key] || GAME_EMBLEM.poker;
  return `<svg viewBox="0 0 40 40" width="44" height="44" class="gicon">
    <defs><linearGradient id="ge-${key}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${e.g[0]}"/><stop offset="1" stop-color="${e.g[1]}"/></linearGradient></defs>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#ge-${key})"/>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="none" stroke="rgba(255,255,255,.22)"/>
    <path d="M1 11 a10 10 0 0 1 10 -10 h18 a10 10 0 0 1 10 10 Z" fill="rgba(255,255,255,.14)"/>
    ${e.in}</svg>`;
}
const CASINO_GAMES = [
  { key: "poker",     name: "Caribbean Stud", desc: "Face the Baron in a high-stakes virtual poker table.", risk: "High",    dealer: "The Baron" },
  { key: "blackjack", name: "Blackjack",       desc: "Beat the dealer with timing, discipline and strategy.", risk: "Medium",  dealer: "Marco" },
  { key: "roulette",  name: "Roulette",        desc: "Spin the wheel and test probability.",                  risk: "Medium",  dealer: "Genevieve" },
  { key: "slots",     name: "Mega Slots",      desc: "Market-themed reels powered by luck.",                  risk: "High",    dealer: "Rex" },
  { key: "crash",     name: "Crash",           desc: "Ride the multiplier and exit before it breaks.",         risk: "Extreme", dealer: "Kai" },
  { key: "dice",      name: "Dice",            desc: "Fast over/under probability challenge.",                 risk: "Low",     dealer: "Sable" },
];
const RISK_TONE = { Low: "up", Medium: "", High: "orange", Extreme: "down" };

// session baseline for Risk IQ deltas (captured once on load)
let casinoSession = null;
function initCasinoSession() {
  if (!casinoSession) casinoSession = { net: S.stats.casinoNet || 0, risk: S.stats.chipsRisked || 0 };
}
function disciplineScore() {
  const risked = S.stats.chipsRisked || 0;
  if (risked < 5000) return 74;
  const roi = S.stats.casinoNet / risked;
  let sc = 62 + roi * 120;
  const exposure = risked / Math.max(2e6, bestNW());
  sc -= Math.min(34, exposure * 8);
  return Math.max(1, Math.min(100, Math.round(sc)));
}
function riskLevelLabel() {
  const sc = disciplineScore();
  return sc >= 70 ? ["Measured", "up"] : sc >= 45 ? ["Balanced", ""] : ["Aggressive", "down"];
}

function renderLobby() {
  initCasinoSession();
  // balances
  setNum($("#cas-balance"), S.season.cash);
  setNum($("#hero-chips"), S.season.cash);
  setNum($("#table-balance"), S.season.cash);
  setNum($("#lobby-nw"), liveNetWorth());
  setNum($("#cas-net"), S.stats.casinoNet);
  $("#cas-net").style.color = S.stats.casinoNet >= 0 ? "var(--up)" : "var(--down)";
  $("#lobby-avatar").innerHTML = avatarHTML(S.profile.avatar);

  // daily chips button
  const dc = $("#btn-daily-chips");
  if (dc) {
    const ready = dailyChipsReady();
    dc.disabled = !ready;
    dc.textContent = ready ? "Claim daily chips" : "Daily chips claimed";
  }

  // entrance cards
  $("#lobby-games").innerHTML = CASINO_GAMES.map(g => {
    const [rc] = [RISK_TONE[g.risk]];
    return `<button class="game-card" data-open="${g.key}">
      <div class="gc-icon">${casinoEmblem(g.key)}</div>
      <div class="gc-body">
        <div class="gc-name">${g.name}</div>
        <div class="gc-desc">${g.desc}</div>
        <div class="gc-meta">
          <span class="gc-risk ${rc}">${g.risk} risk</span>
          <span class="gc-dot">·</span><span class="gc-dealer">${g.dealer}</span>
          <span class="gc-status">● Open</span>
        </div>
      </div>
      <span class="gc-enter">Enter Table →</span>
    </button>`;
  }).join("");

  // Risk IQ
  const sc = disciplineScore(), [lvl, lvlTone] = riskLevelLabel();
  const sessionPL = S.stats.casinoNet - casinoSession.net;
  const sessionRisk = (S.stats.chipsRisked || 0) - casinoSession.risk;
  $("#risk-iq").innerHTML = `
    <div class="riq-score">
      <div class="riq-ring" style="--p:${sc}"><span>${sc}</span></div>
      <div><div class="riq-score-label">Investor Discipline</div><div class="riq-level ${lvlTone}">${lvl}</div></div>
    </div>
    <div class="riq-grid">
      <div class="riq-stat"><small>This session P/L</small><b class="${sessionPL >= 0 ? "up" : "down"}">${sessionPL >= 0 ? "+" : "−"}${money(Math.abs(sessionPL))}</b></div>
      <div class="riq-stat"><small>Biggest win</small><b class="up">${S.stats.biggestWin ? money(S.stats.biggestWin) : "—"}</b></div>
      <div class="riq-stat"><small>Chips risked (session)</small><b>${money(sessionRisk)}</b></div>
      <div class="riq-stat"><small>Best flip streak</small><b>${S.stats.bestStreak || 0}×</b></div>
      <div class="riq-stat"><small>Casino net (all time)</small><b class="${S.stats.casinoNet >= 0 ? "up" : "down"}">${money(S.stats.casinoNet)}</b></div>
      <div class="riq-stat"><small>Current risk level</small><b class="${lvlTone}">${lvl}</b></div>
    </div>
    <p class="riq-msg">Great Moguls know when to walk away.</p>`;

  renderLiveFeed();
  renderRooms();
}

// live floor feed — rotating premium flavor
const FEED_POOL = [
  () => `A mogul won ${money(400 + Math.floor(Math.random() * 8) * 300)} on Blackjack`,
  () => `Roulette streak: Red ×${2 + Math.floor(Math.random() * 4)}`,
  () => `The Baron's table is heating up`,
  () => `Risk IQ bonus unlocked on the ${["Tokyo", "Monaco", "Dubai"][Math.floor(Math.random() * 3)]} floor`,
  () => `${["Tokyo", "New York", "Cape Town"][Math.floor(Math.random() * 3)]} floor volume rising`,
  () => `Crash hit ${(2 + Math.random() * 12).toFixed(2)}× before the break`,
  () => `Dice: three sevens in a row on the Dubai floor`,
  () => `A rival cashed out ${money(1200 + Math.floor(Math.random() * 20) * 400)} in Fortune Chips`,
];
function renderLiveFeed() {
  const el = $("#live-feed");
  if (!el) return;
  const items = [];
  const idx = [...FEED_POOL.keys()];
  for (let i = 0; i < 5 && idx.length; i++) items.push(FEED_POOL[idx.splice(Math.floor(Math.random() * idx.length), 1)[0]]());
  el.innerHTML = items.map(t => `<div class="feed-row"><span class="feed-tick"></span>${t}</div>`).join("");
}

const FORTUNE_ROOMS = [
  { city: "Monaco",     name: "Fortune Room",   theme: "Riviera high-roller", bonus: "Poker rake-back weekend", req: 0 },
  { city: "Dubai",      name: "Gold Lounge",    theme: "Desert opulence",     bonus: "Double slots jackpots",   req: 5e6 },
  { city: "Tokyo",      name: "Neon Floor",     theme: "Electric after-hours", bonus: "Crash multiplier boost",  req: 20e6 },
  { city: "New York",   name: "Risk Room",      theme: "Wall-Street nerve",    bonus: "Blackjack surrender",     req: 50e6 },
  { city: "Cape Town",  name: "Diamond Room",   theme: "Ocean-cliff elite",    bonus: "Roulette insurance",      req: 100e6 },
];
function renderRooms() {
  const el = $("#lobby-rooms");
  if (!el) return;
  const nw = bestNW();
  el.innerHTML = FORTUNE_ROOMS.map(r => {
    const open = nw >= r.req;
    return `<div class="room-card ${open ? "open" : "locked"}">
      <div class="room-top"><span class="room-city">${r.city}</span><span class="room-status">${open ? "● Open" : "🔒 " + money(r.req)}</span></div>
      <div class="room-name">${r.name}</div>
      <div class="room-theme">${r.theme}</div>
      <div class="room-bonus">${open ? "★ " + r.bonus : "Unlocks at " + money(r.req) + " net worth"}</div>
    </div>`;
  }).join("");
}

// focused table view
let activeTable = null;
function openTable(key) {
  activeTable = key;
  $("#casino-lobby").classList.add("hidden");
  $("#casino-table-view").classList.remove("hidden");
  $$("#casino-stage .cas-card").forEach(c => c.classList.toggle("table-active", c.dataset.table === key));
  setNum($("#table-balance"), S.season.cash);
  renderDealers();
  dealerSay(key, "greet");
  const stage = $("#casino-table-view");
  if (stage) stage.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
}
function closeTable() {
  activeTable = null;
  $("#casino-table-view").classList.add("hidden");
  $("#casino-lobby").classList.remove("hidden");
  renderLobby();
}

// ---------- Dice + Crash render ----------
const DIE_PIPS = { // pip layout per face on a 3x3 grid
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
function dieHTML(v) {
  const on = new Set(DIE_PIPS[v] || []);
  return Array.from({ length: 9 }, (_, i) => `<i class="${on.has(i) ? "on" : ""}"></i>`).join("");
}
function renderDie(elId, v) {
  const el = $(elId);
  if (!el) return;
  el.innerHTML = dieHTML(v);
  el.classList.remove("roll"); void el.offsetWidth; if (!reduced()) el.classList.add("roll");
}

// ---------- render all ----------
function renderAll(opts = {}) {
  renderHUD();
  renderDashboard(opts.dash || {});
  renderMarket(opts.market || {});
  renderAssets();
  renderEmpire();
  renderPortfolio();
  renderRivals();
  renderAwards();
  renderSoundToggle();
  if (!$("#asset-modal").classList.contains("hidden")) refreshAssetModal();
}
