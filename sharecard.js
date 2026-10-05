// ============ MOGUL: THE MONEY RACE — SHARE CARD (v9) ============
// Renders a 1080×1080 PNG of the player's empire on a <canvas> —
// avatar, title, net worth, skyline of owned assets, season sparkline.
// Pure canvas, no external assets; fonts come from the already-loaded
// Google Fonts (awaited via document.fonts).
"use strict";

async function renderShareCard() {
  await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  const W = 1080, H = 1080;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");

  // ---- backdrop: midnight gradient + drifting glows + diamond grid ----
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0a0f1c"); bg.addColorStop(1, "#05070d");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, r, col) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  };
  glow(160, 140, 520, "rgba(91,140,255,0.16)");
  glow(950, 900, 560, "rgba(139,124,255,0.13)");
  x.strokeStyle = "rgba(255,255,255,0.03)"; x.lineWidth = 1;
  for (let i = -H; i < W + H; i += 56) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke();
    x.beginPath(); x.moveTo(i + H, 0); x.lineTo(i, H); x.stroke();
  }

  // ---- header: wordmark + market + year ----
  x.textBaseline = "alphabetic";
  x.fillStyle = "#eef2f8";
  x.font = "700 54px 'Space Grotesk', sans-serif";
  x.fillText("MOGUL", 64, 108);
  x.fillStyle = "#5b8cff";
  x.font = "600 26px Inter, sans-serif";
  x.fillText(`THE ${worldName().toUpperCase()} MARKET · ${calYear(S.season.year)}`, 64, 150);

  // ---- avatar (drawn from the profile config) ----
  const av = Object.assign(defaultAvatar(), S.profile.avatar || {});
  const o = AVATAR_OPTS;
  const ax = 540, ay = 320, ar = 120;
  x.save();
  x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI * 2); x.clip();
  x.fillStyle = o.bg[av.bg]; x.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  x.fillStyle = o.outfit[av.outfit];                       // body
  x.beginPath(); x.ellipse(ax, ay + ar * 0.95, ar * 0.72, ar * 0.55, 0, Math.PI, 0); x.fill();
  x.fillStyle = o.skin[av.skin];                           // head
  x.beginPath(); x.arc(ax, ay - ar * 0.12, ar * 0.42, 0, Math.PI * 2); x.fill();
  if (o.hair[av.hair] !== "none") {                        // hair cap
    x.fillStyle = o.hairColor[av.hairColor];
    x.beginPath(); x.arc(ax, ay - ar * 0.22, ar * 0.43, Math.PI * 1.05, Math.PI * 1.95); x.fill();
  }
  x.fillStyle = "#14181f";                                 // eyes
  x.beginPath(); x.arc(ax - ar * 0.14, ay - ar * 0.14, ar * 0.045, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(ax + ar * 0.14, ay - ar * 0.14, ar * 0.045, 0, Math.PI * 2); x.fill();
  x.restore();
  x.strokeStyle = "rgba(232,181,77,0.9)"; x.lineWidth = 6;
  x.beginPath(); x.arc(ax, ay, ar + 4, 0, Math.PI * 2); x.stroke();

  // ---- name, title, net worth ----
  x.textAlign = "center";
  x.fillStyle = "#eef2f8";
  x.font = "700 52px 'Space Grotesk', sans-serif";
  x.fillText(S.profile.name || "Mogul", 540, 505);
  x.fillStyle = "#e8b54d";
  x.font = "700 30px Inter, sans-serif";
  x.fillText(playerTitle().toUpperCase(), 540, 550);
  const nw = liveNetWorth();
  x.fillStyle = nw >= START_CASH ? "#16d383" : "#ff5c5c";
  x.font = "700 110px 'Space Grotesk', sans-serif";
  x.fillText(money(nw), 540, 680);
  x.fillStyle = "#94a3b8";
  x.font = "500 28px Inter, sans-serif";
  const r = roi();
  x.fillText(`${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(0)}% since 2067 · age ${START_AGE + S.season.year}`, 540, 726);

  // ---- season sparkline ----
  const h = S.season.nwHistory;
  if (h.length > 1) {
    const sx = 240, sw = 600, sy0 = 795, sh = 70;
    const min = Math.min(...h), max = Math.max(...h), span = max - min || 1;
    x.beginPath();
    h.forEach((v, i) => {
      const px = sx + (i / (h.length - 1)) * sw;
      const py = sy0 + sh - ((v - min) / span) * sh;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.strokeStyle = h[h.length - 1] >= h[0] ? "#16d383" : "#ff5c5c";
    x.lineWidth = 5; x.lineJoin = "round"; x.stroke();
  }

  // ---- empire skyline: one tower per estate holding ----
  const estate = Object.keys(S.season.holdings)
    .map(id => ({ a: worldAsset(id), v: liveValue(id) }))
    .filter(t => t.a && ESTATE_CATS.includes(t.a.cat))
    .sort((p, q) => q.v - p.v).slice(0, 14);
  const groundY = 985;
  x.fillStyle = "rgba(255,255,255,0.06)";
  x.fillRect(64, groundY, W - 128, 3);
  const COLS = { realestate: "#5b8cff", business: "#38bdf8", luxury: "#f472b6", legacy: "#e8b54d" };
  const bw = 46, gap = 22;
  const total = estate.length * (bw + gap) - gap;
  let bx = 540 - total / 2;
  for (const t of estate) {
    const bh = Math.max(26, Math.min(140, (Math.log10(Math.max(1, t.v)) - 3) * 34));
    const col = t.a.arch === "legacy" ? COLS.legacy : COLS[t.a.cat];
    x.fillStyle = col;
    x.fillRect(bx, groundY - bh, bw, bh);
    x.fillStyle = "rgba(255,255,255,0.25)";                // lit windows
    for (let wy = groundY - bh + 8; wy < groundY - 8; wy += 14) {
      for (let wx = bx + 7; wx < bx + bw - 7; wx += 13) x.fillRect(wx, wy, 5, 7);
    }
    bx += bw + gap;
  }
  if (!estate.length) {
    x.fillStyle = "#5b6b80"; x.font = "500 24px Inter, sans-serif";
    x.fillText("Skyline under construction.", 540, groundY - 24);
  }

  // ---- footer ----
  x.fillStyle = "#94a3b8"; x.font = "600 26px Inter, sans-serif";
  x.fillText("Think you'd do better? Ask me for a challenge code.", 540, 1042);
  x.textAlign = "left";
  return cv;
}

// download + native share plumbing
async function shareCardImage() {
  const cv = await renderShareCard();
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const file = new File([blob], "mogul-card.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "MOGUL: The Money Race" });
      return "shared";
    } catch (e) { /* fall through to download */ }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "mogul-card.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}

// ============ OBITUARY / DEATH CARD (v16) ============
// A prestige tombstone rendered from the whole life — the flagship share moment.
async function renderObituaryCard() {
  await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
  const W = 1080, H = 1080;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");

  // obsidian backdrop + gold vignette + faint grid
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0c0d12"); bg.addColorStop(1, "#050507");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  glow(540, 250, 620, "rgba(232,181,77,0.10)");
  x.strokeStyle = "rgba(255,255,255,0.025)"; x.lineWidth = 1;
  for (let i = -H; i < W + H; i += 60) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + H, H); x.stroke(); }
  // gold frame
  x.strokeStyle = "rgba(232,181,77,0.35)"; x.lineWidth = 2;
  x.strokeRect(40, 40, W - 80, H - 80);

  x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = "#e8b54d"; x.font = "700 20px Inter, sans-serif";
  x.fillText("MOGUL · IN MEMORIAM", 540, 108);

  // avatar in a gold laurel ring
  const av = Object.assign(defaultAvatar(), S.profile.avatar || {});
  const o = AVATAR_OPTS, ax = 540, ay = 250, ar = 92;
  x.save(); x.beginPath(); x.arc(ax, ay, ar, 0, Math.PI * 2); x.clip();
  x.fillStyle = o.bg[av.bg]; x.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
  x.fillStyle = o.outfit[av.outfit]; x.beginPath(); x.ellipse(ax, ay + ar * 0.95, ar * 0.72, ar * 0.55, 0, Math.PI, 0); x.fill();
  x.fillStyle = o.skin[av.skin]; x.beginPath(); x.arc(ax, ay - ar * 0.12, ar * 0.42, 0, Math.PI * 2); x.fill();
  if (o.hair[av.hair] !== "none") { x.fillStyle = o.hairColor[av.hairColor]; x.beginPath(); x.arc(ax, ay - ar * 0.22, ar * 0.43, Math.PI * 1.05, Math.PI * 1.95); x.fill(); }
  x.fillStyle = "#14181f"; x.beginPath(); x.arc(ax - ar * 0.14, ay - ar * 0.14, ar * 0.045, 0, 6.28); x.fill(); x.beginPath(); x.arc(ax + ar * 0.14, ay - ar * 0.14, ar * 0.045, 0, 6.28); x.fill();
  x.restore();
  x.strokeStyle = "rgba(232,181,77,0.95)"; x.lineWidth = 5; x.beginPath(); x.arc(ax, ay, ar + 4, 0, Math.PI * 2); x.stroke();

  const endYear = S.season.year, nw = liveNetWorth();
  const deathYear = endYear + lifespanBonus(); // v17: vitality shifts your final year
  const age = START_AGE + deathYear;
  const hist = S.season.nwHistory || [START_CASH];
  const peak = Math.max(S.bestScore || 0, nw, ...hist);
  const rib = careerRibbon();

  x.fillStyle = "#eef1f9"; x.font = "700 54px 'Space Grotesk', sans-serif";
  x.fillText(S.profile.name || "Mogul", 540, 420);
  x.fillStyle = "#94a3b8"; x.font = "500 24px Inter, sans-serif";
  x.fillText(`${calYear(0)} – ${calYear(deathYear)}  ·  lived to ${age}`, 540, 456);

  // the awarded ribbon
  x.fillStyle = "#e8b54d"; x.font = "700 15px Inter, sans-serif";
  x.fillText("AWARDED TITLE", 540, 512);
  x.font = "700 46px 'Space Grotesk', sans-serif";
  const rg = x.createLinearGradient(0, 520, 0, 570); rg.addColorStop(0, "#fff6d8"); rg.addColorStop(1, "#e8b54d");
  x.fillStyle = rg; x.fillText(rib.name, 540, 556);
  x.fillStyle = "#a3adc7"; x.font = "italic 20px Inter, sans-serif";
  x.fillText(rib.desc, 540, 588);

  // stats grid (2×3)
  const stats = [
    ["Peak net worth", money(peak)],
    ["Final net worth", money(nw)],
    ["Biggest single win", S.stats.biggestWin ? money(S.stats.biggestWin) : "—"],
    ["Casino record", (S.stats.casinoNet >= 0 ? "+" : "−") + money(Math.abs(S.stats.casinoNet))],
    ["Holdings owned", String(Object.keys(S.season.holdings).length)],
    ["100-year return", (roi() >= 0 ? "+" : "−") + Math.abs(roi()).toFixed(0) + "%"],
  ];
  const gx = 120, gw = 840, cw = gw / 3, rh = 86, gy = 626;
  stats.forEach((s, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx0 = gx + col * cw, cy0 = gy + row * rh;
    x.fillStyle = "rgba(255,255,255,0.03)"; x.strokeStyle = "rgba(255,255,255,0.06)";
    roundRectPath(x, cx0 + 8, cy0, cw - 16, rh - 12, 12); x.fill(); x.stroke();
    x.textAlign = "left";
    x.fillStyle = "#5b6b80"; x.font = "600 13px Inter, sans-serif"; x.fillText(s[0].toUpperCase(), cx0 + 26, cy0 + 30);
    x.fillStyle = "#eef1f9"; x.font = "700 27px 'Space Grotesk', sans-serif"; x.fillText(s[1], cx0 + 26, cy0 + 62);
  });
  x.textAlign = "center";

  // v17: life profile — the four Mogul stats you died with
  const prof = MOGUL_STATS.map(s => ({ icon: s.icon, short: s.short, color: s.color, v: mogulStat(s.key) }));
  const pW = 178, pGap = 16, pTotal = prof.length * pW + (prof.length - 1) * pGap;
  let px0 = 540 - pTotal / 2; const pY = 852;
  x.fillStyle = "#5b6b80"; x.font = "600 14px Inter, sans-serif";
  x.fillText("LIFE PROFILE AT DEATH", 540, pY - 20);
  prof.forEach(p => {
    x.textAlign = "left"; x.fillStyle = p.color; x.font = "700 16px Inter, sans-serif";
    x.fillText(`${p.icon} ${p.short}`, px0, pY);
    x.textAlign = "right"; x.fillStyle = "#c9d2e6"; x.font = "700 16px 'Space Grotesk', sans-serif";
    x.fillText(String(p.v), px0 + pW, pY);
    const ty = pY + 12, th = 8;
    x.fillStyle = "rgba(255,255,255,0.08)"; roundRectPath(x, px0, ty, pW, th, 4); x.fill();
    x.fillStyle = p.color; roundRectPath(x, px0, ty, Math.max(4, pW * p.v / 100), th, 4); x.fill();
    px0 += pW + pGap;
  });
  x.textAlign = "center";

  // epitaph + percentile + footer
  const EP = { empire: "“He owned the board, then bought the table it sat on.”", family: "“Rich in what mattered. Also, just rich.”", parties: "“Died as they lived: overcommitted and slightly hungover.”" };
  const ep = (S.flags && EP[S.flags.epitaph]) || (nw >= START_CASH * 10 ? "“Died richer than the history books are comfortable with.”" : nw >= START_CASH ? "“Played the long game, and the long game paid.”" : "“The markets giveth. Mostly, they tooketh.”");
  x.fillStyle = "#c9d2e6"; x.font = "italic 24px 'Space Grotesk', sans-serif"; x.fillText(ep, 540, 926);
  x.fillStyle = "#e8b54d"; x.font = "700 22px Inter, sans-serif";
  x.fillText(`Richer than ${moneyPercentile(nw)}% of moguls`, 540, 970);
  x.fillStyle = "#5b6b80"; x.font = "600 20px Inter, sans-serif";
  x.fillText("MOGUL: The Money Race · think you'd do better? Ask for a challenge code.", 540, 1014);
  x.textAlign = "left";
  return cv;
}
function roundRectPath(x, rx, ry, rw, rh, r) {
  x.beginPath();
  x.moveTo(rx + r, ry); x.arcTo(rx + rw, ry, rx + rw, ry + rh, r); x.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
  x.arcTo(rx, ry + rh, rx, ry, r); x.arcTo(rx, ry, rx + rw, ry, r); x.closePath();
}
async function shareObituary() {
  const cv = await renderObituaryCard();
  const blob = await new Promise(res => cv.toBlob(res, "image/png"));
  const file = new File([blob], "mogul-obituary.png", { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: "MOGUL — In Memoriam" }); return "shared"; } catch (e) {}
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "mogul-obituary.png"; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "downloaded";
}
