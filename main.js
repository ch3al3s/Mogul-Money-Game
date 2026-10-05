// ============ MOGUL: THE MONEY RACE — MAIN (v3) ============
// Event wiring & game flow. Rendering lives in ui.js, numbers in engine.js.
"use strict";

(function init() {
  const hadSave = load();
  Sound.init();

  // ---- navigation ----
  const VIEW_TITLES = { dashboard: "Dashboard", market: "Market", assets: "Assets", portfolio: "Wealth", casino: "Casino", rivals: "Rivals", awards: "Awards" };
  const VIEW_ORDER = ["dashboard", "market", "assets", "portfolio", "casino", "rivals", "awards"];
  let currentView = "dashboard";
  function setView(v) {
    if (!VIEW_TITLES[v]) return;
    currentView = v;
    $$(".nav-btn, .mnav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    $$(".view").forEach(x => x.classList.remove("active"));
    $("#view-" + v).classList.add("active");
    $("#view-title").textContent = VIEW_TITLES[v];
    if (v === "dashboard") renderDashboard({ animateChart: true, mountCards: true });
    if (v === "market") renderMarket({ stagger: true });
    if (v === "assets") renderAssets();
    if (v === "portfolio") renderEmpire();
    if (v === "casino") enterCasino(); else stopCasinoFX();
  }
  $$(".nav-btn, .mnav-btn").forEach(b => b.addEventListener("click", () => { Sound.play("click"); setView(b.dataset.view); }));

  // ---- market: sort, search, delegated rows ----
  $$("#mkt-table th.sortable").forEach(th => th.addEventListener("click", () => {
    Sound.play("click");
    const key = th.dataset.sort;
    if (mktSort.key === key) mktSort.dir *= -1;
    else { mktSort.key = key; mktSort.dir = key === "name" ? 1 : -1; }
    kbRow = -1;
    renderMarket({ stagger: true });
  }));
  $("#mkt-search").addEventListener("input", e => { mktSearch = e.target.value.trim(); kbRow = -1; renderMarket(); });

  $("#mkt-body").addEventListener("click", e => {
    const star = e.target.closest(".star-btn");
    if (star) {
      e.stopPropagation();
      const id = star.dataset.star;
      const on = toggleWatch(id);
      Sound.play("click");
      if (mktCat === "watch" && !on) renderMarket();
      else { star.classList.toggle("on", on); star.textContent = on ? "★" : "☆"; }
      renderWatchMini();
      return;
    }
    const tr = e.target.closest("tr[data-id]");
    if (tr) {
      Sound.play("click");
      if (tierLocked(tr.dataset.id)) {
        const a = worldAsset(tr.dataset.id);
        toast("Locked tier", "", { icon: "🔒", body: TIER_LABEL[a.tier] + ". Something to aim at." });
        return;
      }
      openAsset(tr.dataset.id);
    }
  });

  // ---- portfolio: delegated sells / row open ----
  $("#pf-body").addEventListener("click", e => {
    const b1 = e.target.closest("[data-s1]"), ba = e.target.closest("[data-sa]");
    if (b1 || ba) {
      e.stopPropagation();
      const id = (b1 || ba).dataset.s1 || (b1 || ba).dataset.sa;
      const qty = b1 ? 1 : posQty(id);
      const p = sellAsset(id, qty);
      if (p) {
        Sound.play("sell");
        toast(b1 ? `Sold 1 for ${money(p)}` : `Position closed for ${money(p)}`, "", { icon: "🤝" });
        renderAll();
      }
      return;
    }
    const tr = e.target.closest("tr[data-id]");
    if (tr) openAsset(tr.dataset.id);
  });

  // ---- assets realm: filter chips + card grid ----
  $("#est-filters").addEventListener("click", e => {
    const b = e.target.closest("[data-est]");
    if (!b) return;
    Sound.play("click");
    estCat = b.dataset.est;
    renderAssets();
  });
  $("#est-countries").addEventListener("click", e => {
    const b = e.target.closest("[data-estc]");
    if (!b) return;
    Sound.play("click");
    estCountry = b.dataset.estc;
    renderAssets();
  });
  const openEstCard = card => {
    if (tierLocked(card.dataset.id)) {
      const a = worldAsset(card.dataset.id);
      toast("Locked tier", "", { icon: "🔒", body: TIER_LABEL[a.tier] + ". Something to aim at." });
      return;
    }
    Sound.play("click");
    openAsset(card.dataset.id);
  };
  $("#assets-grid").addEventListener("click", e => {
    const card = e.target.closest(".est-card");
    if (card) openEstCard(card);
  });
  $("#assets-grid").addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".est-card");
    if (card) { e.preventDefault(); openEstCard(card); }
  });

  // ---- asset modal ----
  const closeAsset = () => $("#asset-modal").classList.add("hidden");
  $("#asset-x").addEventListener("click", closeAsset);
  $("#asset-modal").addEventListener("click", e => { if (e.target === $("#asset-modal")) closeAsset(); });
  $("#qty-minus").addEventListener("click", () => { $("#trade-qty").value = Math.max(1, (+$("#trade-qty").value || 1) - 1); updateTradeEstimate(); });
  $("#qty-plus").addEventListener("click", () => { $("#trade-qty").value = (+$("#trade-qty").value || 0) + 1; updateTradeEstimate(); });
  $("#trade-qty").addEventListener("input", updateTradeEstimate);
  $$("#asset-modal [data-spend]").forEach(b => b.addEventListener("click", () => {
    if (!modalAssetId) return;
    Sound.play("click");
    const frac = +b.dataset.spend;
    const q = Math.max(1, Math.floor(S.season.cash * frac / S.season.prices[modalAssetId]));
    $("#trade-qty").value = q;
    updateTradeEstimate();
  }));
  $("#btn-buy").addEventListener("click", () => {
    const q = Math.max(1, Math.floor(+$("#trade-qty").value || 1));
    if (buyAsset(modalAssetId, q)) {
      const a = worldAsset(modalAssetId);
      Sound.play("buy");
      const bought = Math.min(q, posQty(modalAssetId));
      toast(`Bought ${bought.toLocaleString()} × ${a.name}`, "green", { icon: a.emoji });
      coinFlight($("#btn-buy"));
      flushAchievements(); renderAll();
    } else if (tierLocked(modalAssetId)) {
      const a = worldAsset(modalAssetId);
      toast("Not yet.", "red", { icon: "🔒", body: TIER_LABEL[a.tier] });
    } else if (supplyLeft(modalAssetId) === 0) {
      toast("Sold out.", "red", { body: "Scarce assets are scarce. That was the point." });
    } else toast("Not enough cash.", "red", { body: "The market respects conviction, not overdrafts." });
  });
  $("#btn-sell").addEventListener("click", () => {
    const q = Math.min(posQty(modalAssetId), Math.max(1, Math.floor(+$("#trade-qty").value || 1)));
    const p = sellAsset(modalAssetId, q);
    if (p) { Sound.play("sell"); toast(`Sold ${q.toLocaleString()} for ${money(p)}`, "", { body: "1% broker fee applied. The house always eats." }); coinFlight($("#btn-sell")); renderAll(); }
  });

  // ---- simulate: crunch → cinematic ----
  let simBusy = false, pendingLifeEvent = null;
  $("#life-continue").addEventListener("click", () => { Sound.play("click"); closeLifeEvent(); });
  $("#btn-simulate").addEventListener("click", () => {
    if (S.season.finished || simBusy) return;
    simBusy = true;
    const btn = $("#btn-simulate");
    btn.classList.add("crunching");
    const sp = document.createElement("span");
    sp.className = "spinner";
    btn.appendChild(sp);
    Sound.play("click");
    setTimeout(() => {
      const res = simulateYear();
      btn.classList.remove("crunching");
      sp.remove();
      simBusy = false;
      if (!res) return;
      const doneMissions = evalMissions();
      pendingLifeEvent = rollLifeEvent(S.season.year); // a year of life, decided after the recap
      showYearRecap(res);
      renderAll({ dash: { animateChart: true } });
      showNwDelta(res.entry.nwAfter - res.entry.nwBefore);
      syncSkipBtn();
      doneMissions.forEach((ms, i) => setTimeout(() =>
        toast(`Mission complete: ${ms.text}`, "gold", { icon: "🎯", body: `Reward: ${money(ms.reward)} wired to your account.` }), 800 + i * 900));
    }, reduced() ? 60 : 400);
  });
  // click anywhere inside the recap (except Continue) skips the show
  $("#sim-overlay").addEventListener("click", e => {
    if (e.target.closest("#sim-close")) return;
    recapSkip();
  });
  const syncSkipBtn = () => { $("#btn-skip5").disabled = S.season.finished; };
  syncSkipBtn();
  const closeRecap = () => {
    recapSkip();
    $("#sim-overlay").classList.add("hidden");
    renderMarket({ flash: true }); // price pulses land as the table comes back into view
    if (S.season.finished) { showSeasonEnd(); return; }
    // a life event (if any) lands after the recap, then the rank-up check runs
    if (pendingLifeEvent) { const ev = pendingLifeEvent; pendingLifeEvent = null; showLifeEvent(ev, checkRankUp); }
    else checkRankUp();
  };
  $("#sim-close").addEventListener("click", e => { e.stopPropagation(); Sound.play("click"); closeRecap(); });

  // ---- season end ----
  $("#btn-new-season").addEventListener("click", () => {
    startNewSeason();
    sparkDrawn.clear();
    $("#end-overlay").classList.add("hidden");
    toast("New season", "gold", { body: "Fresh $1M, fresh market, same you. Try to want things." });
    renderAll({ dash: { animateChart: true } });
  });
  $("#btn-end-card").addEventListener("click", () => {
    copyCode(makeMogulCard(), "#card-code");
    toast("Final Mogul Card copied", "", { body: "Send it to your rivals. Or your enemies. Same list." });
  });
  $("#btn-obituary").addEventListener("click", async () => {
    Sound.play("click");
    const how = await shareObituary();
    toast(how === "shared" ? "Obituary shared" : "Obituary downloaded", "gold", { icon: "🪦", body: "1080×1080 — the whole life, on one card." });
  });

  // ---- creator ----
  $("#profile-chip").addEventListener("click", () => { Sound.play("click"); openCreator(); });
  $("#creator-done").addEventListener("click", () => {
    const n = $("#creator-name").value.trim();
    if (!n) { toast("Pick a username first.", "red"); return; }
    const firstRun = !S.profile.name;
    S.profile.name = n.slice(0, 16);
    save();
    $("#creator-overlay").classList.add("hidden");
    renderAll();
    if (firstRun && !S.flags.tourDone) startTour();
  });

  // ---- casino: slots (vertical strips, motion blur, near-miss, jackpot) ----
  const REEL_CELL = 58;
  function buildReels() {
    $("#slot-reels").innerHTML = [0, 1, 2].map(() =>
      `<div class="reel"><div class="reel-strip">${SLOT_EMOJI.concat(SLOT_EMOJI).map(e => `<span>${GFX.slot(e)}</span>`).join("")}</div></div>`
    ).join("");
  }
  buildReels();
  function stopReel(reel, emoji) {
    const strip = reel.querySelector(".reel-strip");
    const idx = Math.max(0, SLOT_EMOJI.indexOf(emoji));
    reel.classList.remove("spinning", "slowmo");
    strip.style.transition = "none";
    strip.style.transform = "translateY(0)";
    void strip.offsetWidth;
    reel.classList.add("stopped");
    strip.style.transition = "";
    strip.style.transform = `translateY(${-(idx + 5) * REEL_CELL}px)`;
    Sound.play("tick");
  }
  let slotBusy = false;
  $("#btn-slots").addEventListener("click", () => {
    if (slotBusy) return;
    const res = playSlots(+$("#slot-bet").value);
    if (res.error) { toast(res.error, "red"); return; }
    slotBusy = true;
    renderHUD();
    const reels = $$("#slot-reels .reel");
    reels.forEach(r => { r.classList.remove("stopped", "wobble"); r.classList.add("spinning"); });
    const el = $("#slot-result");
    el.textContent = "…";
    el.className = "cas-result";
    const twoMatch = res.reels[0] === res.reels[1];
    const jackpot = twoMatch && res.reels[1] === res.reels[2];
    const fast = reduced();
    const base = fast ? 150 : 900;
    const gap = fast ? 60 : 200;
    // suspense: if the first two land the same, the last reel goes slow-mo
    const lastDelay = twoMatch && !fast ? base + 2 * gap + 700 : base + 2 * gap;
    stopAt(0, base); stopAt(1, base + gap);
    if (twoMatch && !fast) setTimeout(() => reels[2].classList.add("slowmo"), base + gap + 50);
    stopAt(2, lastDelay);
    function stopAt(i, t) { setTimeout(() => stopReel(reels[i], res.reels[i]), t); }
    setTimeout(() => {
      if (res.winnings > 0) {
        const pl = $("#payline");
        pl.classList.remove("hit"); void pl.offsetWidth; pl.classList.add("hit");
        el.textContent = jackpot ? `JACKPOT — ${money(res.winnings)}` : `Win ${money(res.winnings)}`;
        el.className = "cas-result up stamp";
        if (jackpot) { Sound.play("jackpot"); confettiPhysics(60); dealerSay("slots", "bigwin"); }
        else { Sound.play("win"); dealerSay("slots", "win"); }
      } else {
        el.textContent = `Lost ${money(res.staked)}`;
        el.className = "cas-result down";
        Sound.play("lose");
        dealerSay("slots", "lose");
        if (twoMatch || res.reels[0] === res.reels[2] || res.reels[1] === res.reels[2]) {
          reels.forEach(r => r.classList.add("wobble")); // so close
        }
      }
      slotBusy = false;
      flushAchievements(); renderHUD(); renderRivals(); renderAwards();
    }, lastDelay + (fast ? 100 : 450));
  });

  // ---- casino: roulette (numbered wheel lands the real pocket under the pointer) ----
  const POCKET = 360 / 37;
  function buildRouletteWheel() {
    const wheel = $("#roulette-wheel");
    // pocket i is centred at angle i·POCKET from 12 o'clock; 0 = green, odd = red, even = black
    const stops = [`#159a60 ${-POCKET / 2}deg ${POCKET / 2}deg`];
    for (let i = 1; i <= 36; i++) {
      stops.push(`${i % 2 === 1 ? "#c73e3c" : "#161d2b"} ${(i - 0.5) * POCKET}deg ${(i + 0.5) * POCKET}deg`);
    }
    wheel.style.background = `conic-gradient(${stops.join(",")})`;
    $("#roulette-ring").innerHTML = Array.from({ length: 37 }, (_, i) =>
      `<span style="transform: rotate(${i * POCKET}deg) translateY(-70px)">${i}</span>`).join("");
  }
  buildRouletteWheel();
  const roulHistory = [];
  function renderRoulHistory() {
    $("#roulette-history").innerHTML = roulHistory.slice(-8).map(n =>
      `<i class="${n === 0 ? "g" : n % 2 === 1 ? "r" : "b"}">${n}</i>`).join("");
  }
  let roulDeg = 0, orbitDeg = 0, roulBusy = false;
  $$("[data-roul]").forEach(b => b.addEventListener("click", () => {
    if (roulBusy) return;
    const res = playRoulette(+$("#roulette-bet").value, b.dataset.roul);
    if (res.error) { toast(res.error, "red"); return; }
    roulBusy = true;
    renderHUD();
    dealerSay("roulette", "bet");
    const dur = reduced() ? 400 : 2600;
    // spin forward 4-6 turns and stop with pocket n under the pointer
    const spins = 4 + Math.floor(Math.random() * 3);
    roulDeg = Math.ceil(roulDeg / 360) * 360 + spins * 360 - res.n * POCKET;
    orbitDeg -= (4 + Math.floor(Math.random() * 3)) * 360; // ball counter-spins, ends at the pointer
    $("#roulette-wheel").style.transform = `rotate(${roulDeg}deg)`;
    $("#roulette-orbit").style.transform = `rotate(${orbitDeg}deg)`;
    const el = $("#roulette-result");
    el.textContent = "No more bets…";
    el.className = "cas-result";
    // decelerating landing ticks
    if (!reduced()) {
      let t = 120;
      for (let i = 0; i < 14 && t < dur - 150; i++) {
        setTimeout(() => Sound.play("tick"), t);
        t += 60 + i * 24;
      }
    }
    setTimeout(() => {
      el.textContent = `${res.n} · ${res.color.toUpperCase()} — ${res.winnings > 0 ? "win " + money(res.winnings) : "lost " + money(res.staked)}`;
      el.className = "cas-result stamp " + (res.winnings > 0 ? "up" : "down");
      Sound.play(res.winnings > 0 ? "win" : "lose");
      dealerSay("roulette", res.winnings >= res.staked * 10 ? "bigwin" : res.winnings > 0 ? "win" : "lose");
      roulHistory.push(res.n);
      renderRoulHistory();
      roulBusy = false;
      flushAchievements(); renderHUD(); renderRivals(); renderAwards();
    }, dur);
  }));

  // ---- casino: double or nothing (3D coin, pot thump, insistent cash-out) ----
  function cashoutPulse(streak) {
    const btn = $("#btn-cashout");
    btn.classList.remove("pulse-1", "pulse-2", "pulse-3");
    if (streak >= 5) btn.classList.add("pulse-3");
    else if (streak >= 3) btn.classList.add("pulse-2");
    else if (streak >= 1) btn.classList.add("pulse-1");
  }
  $("#btn-flip").addEventListener("click", () => {
    const res = coinFlip(+$("#coin-bet").value);
    if (res.error) { toast(res.error, "red"); return; }
    const face = $("#coin-face");
    face.classList.remove("flipping");
    void face.offsetWidth;
    face.classList.add("flipping");
    renderHUD();
    setTimeout(() => {
      face.innerHTML = res.win ? GFX.COIN.win : GFX.COIN.lose;
      const el = $("#coin-result");
      if (res.win) {
        el.innerHTML = `Streak ×${res.streak} — pot <b>${money(res.pot)}</b>. Push your luck?`;
        el.className = "cas-result up pot-thump";
        Sound.play("win");
        dealerSay("coin", res.streak >= 4 ? "bigwin" : "win");
      } else {
        el.textContent = "Bust. The pot is gone.";
        el.className = "cas-result down";
        Sound.play("lose");
        dealerSay("coin", "lose");
      }
      $("#btn-cashout").disabled = res.pot <= 0;
      cashoutPulse(res.pot > 0 ? res.streak : 0);
      renderLadder(res.pot > 0 ? res.streak : 0, res.pot > 0);
      flushAchievements(); renderHUD(); renderRivals(); renderAwards();
    }, reduced() ? 100 : 900);
  });
  $("#btn-cashout").addEventListener("click", () => {
    const amt = coinCashout();
    if (amt) {
      Sound.play("win");
      toast(`Cashed out ${money(amt)}`, "gold", { icon: "🪙", body: "Walking away rich — the rarest casino move." });
      $("#coin-result").textContent = "Build a streak, cash out before the bust";
      $("#coin-result").className = "cas-result";
      $("#coin-face").innerHTML = GFX.COIN.idle;
      $("#btn-cashout").disabled = true;
      cashoutPulse(0);
      renderLadder(0, false);
      dealerSay("coin", "cashout");
      flushAchievements(); renderHUD(); renderRivals(); renderAwards();
    }
  });

  // ---- casino: Caribbean Stud poker (heads-up vs the Baron) ----
  const CS_LINES = {
    fold: ["fold", ""], no_qualify: ["dealer didn't qualify — ante paid", "up"],
    win: ["you win", "up"], push: ["push", ""], lose: ["dealer wins", "down"],
  };
  function csResolve(res) {
    renderPoker(res);
    const el = $("#cs-result");
    if (!res.outcome) {
      el.textContent = "Raise 2×, or fold and keep the rest.";
      el.className = "cas-result";
      Sound.play("tick");
      dealerSay("poker", "deal");
      return;
    }
    const [txt, cls] = CS_LINES[res.outcome];
    const yourHand = pokerName(res.playerRank);
    const net = res.winnings - (res.ante + res.raise);
    el.textContent = res.outcome === "fold"
      ? `Folded — you keep your seat.`
      : `${yourHand} vs ${pokerName(res.dealerRank)} — ${txt}${net > 0 ? " " + money(net) : ""}`;
    el.className = "cas-result stamp " + cls;
    if (res.outcome === "win" || res.outcome === "no_qualify") {
      const big = res.playerRank[0] >= 6; // full house or better
      Sound.play(big ? "jackpot" : "win");
      if (big) { confettiPhysics(60); dealerSay("poker", "bigwin"); }
      else dealerSay("poker", "win");
    } else if (res.outcome === "lose") { Sound.play("lose"); dealerSay("poker", "lose"); }
    else if (res.outcome === "fold") { Sound.play("click"); dealerSay("poker", "fold"); }
    else { Sound.play("click"); dealerSay("poker", "push"); }
    flushAchievements(); renderHUD(); renderRivals(); renderAwards();
  }
  $("#btn-cs-deal").addEventListener("click", () => {
    const res = csDeal(+$("#cs-ante").value);
    if (res.error) { toast(res.error, "red"); return; }
    renderHUD();
    csResolve(res);
  });
  $("#btn-cs-play").addEventListener("click", () => {
    const r = csPlay();
    if (!r) return;
    if (r.error) { toast(r.error, "red"); return; }
    renderHUD(); csResolve(r);
  });
  $("#btn-cs-fold").addEventListener("click", () => { const r = csFold(); if (r) csResolve(r); });

  // ---- rivals / codes ----
  function copyCode(code, sel) {
    $(sel).value = code;
    $(sel).select();
    try { navigator.clipboard.writeText(code); } catch (e) {}
  }
  window.copyCode = copyCode;

  $("#btn-challenge").addEventListener("click", () => {
    const { code, seed } = makeChallengeCode();
    copyCode(code, "#challenge-code");
    startNewSeason(seed, true);
    sparkDrawn.clear();
    toast("Challenge created & copied", "gold", { body: "You're now playing that market — send the code to a friend." });
    renderAll({ dash: { animateChart: true } });
  });
  $("#btn-accept").addEventListener("click", () => {
    const seed = acceptChallenge($("#accept-code").value);
    if (seed === null) { toast("That challenge code doesn't look right.", "red"); return; }
    $("#accept-code").value = "";
    sparkDrawn.clear();
    toast("Challenge accepted", "gold", { body: "Same market as your friend. Richest after 10 years wins." });
    renderAll({ dash: { animateChart: true } });
  });
  $("#btn-card").addEventListener("click", () => {
    copyCode(makeMogulCard(), "#card-code");
    toast("Mogul Card copied", "", { body: "Send it to a friend. Braggadocio, in base64." });
  });
  $("#btn-import-card").addEventListener("click", () => {
    const rival = importMogulCard($("#import-card").value);
    if (!rival) { toast("That card doesn't look right.", "red", { body: "Ask them to copy it again." }); return; }
    $("#import-card").value = "";
    toast(`${rival.name} joined your leaderboard`, "", { icon: "⚔️", body: `Arriving with ${money(rival.nw)}. Deal with it.` });
    flushAchievements();
    renderRivals();
  });

  // ---- modals: h2h, archive, shortcuts ----
  const bindOverlay = (id, xId) => {
    $(xId).addEventListener("click", () => $(id).classList.add("hidden"));
    $(id).addEventListener("click", e => { if (e.target === $(id)) $(id).classList.add("hidden"); });
  };
  bindOverlay("#h2h-modal", "#h2h-x");
  $("#away-close").addEventListener("click", () => { Sound.play("click"); $("#away-modal").classList.add("hidden"); });
  $("#away-modal").addEventListener("click", e => { if (e.target === $("#away-modal")) $("#away-modal").classList.add("hidden"); });
  bindOverlay("#archive-modal", "#archive-x");
  bindOverlay("#shortcuts-modal", "#shortcuts-x");
  $("#btn-archive").addEventListener("click", () => { Sound.play("click"); openArchive(); });
  bindOverlay("#share-modal", "#share-x");
  $("#btn-share").addEventListener("click", () => {
    Sound.play("click");
    $("#share-sub").textContent = `You're ${playerTitle()} of the ${worldName()} market, worth ${money(liveNetWorth())} in ${calYear(S.season.year)}.`;
    $("#share-code").value = "";
    $("#share-native").classList.toggle("hidden", !navigator.share);
    $("#share-modal").classList.remove("hidden");
  });
  let lastShareText = "";
  const putShare = (code, blurb) => {
    lastShareText = `${blurb}\n${code}`;
    $("#share-code").value = code;
    try { navigator.clipboard.writeText(code); } catch (e) {}
    toast("Copied", "", { icon: "✓", body: "Code is on your clipboard — paste it to a friend.", dur: 2200 });
  };
  $("#share-challenge").addEventListener("click", () => {
    Sound.play("click");
    // shares YOUR current market — the friend lives your exact 100 years
    putShare("MRC1." + b64e({ seed: S.season.seed }), `Beat me in MOGUL — same market (${worldName()}), pure skill. Paste this in Rivals → Accept challenge:`);
  });
  $("#share-card").addEventListener("click", () => {
    Sound.play("click");
    putShare(makeMogulCard(), `My MOGUL card — ${money(liveNetWorth())} and counting. Paste it in Rivals → Add friend's card:`);
  });
  $("#share-image").addEventListener("click", async () => {
    Sound.play("click");
    const how = await shareCardImage();
    toast(how === "shared" ? "Card shared" : "Card image downloaded", "gold", { icon: "🖼", body: "1080×1080 — made for the group chat.", dur: 2600 });
  });
  $("#share-native").addEventListener("click", async () => {
    try { await navigator.share({ title: "MOGUL: The Money Race", text: lastShareText }); } catch (e) {}
  });
  $("#btn-shortcuts").addEventListener("click", () => { Sound.play("click"); $("#shortcuts-modal").classList.remove("hidden"); });
  bindOverlay("#studio-modal", "#studio-x");
  $("#btn-studio").addEventListener("click", () => { Sound.play("click"); renderStudio(); $("#studio-modal").classList.remove("hidden"); });
  $("#studio-body").addEventListener("click", e => {
    const t = e.target.closest(".studio-tile");
    if (!t || t.disabled) return;
    Sound.play("click");
    COSMETICS[t.dataset.cat].set(t.dataset.key);
    save();
    applyStyle();
    renderStudio();
    if (currentView === "casino") { renderDealers(); }
  });

  // ---- sound toggle ----
  $("#btn-sound").addEventListener("click", () => {
    S.settings.muted = !S.settings.muted;
    save();
    renderSoundToggle();
    Sound.play("click"); // audible only when unmuting, which is the point
    toast(S.settings.muted ? "Sound off" : "Sound on", "", { icon: S.settings.muted ? "🔇" : "🔊", dur: 1800 });
  });

  // ---- onboarding tour ----
  const TOUR_STEPS = [
    { sel: () => visibleEl('[data-view="market"]'), title: "The Market", text: "Stocks, crypto and commodities — liquid paper, priced yearly. Click any row to trade. Star ★ the ones you're stalking." },
    { sel: () => visibleEl('[data-view="assets"]'), title: "Assets", text: "The ownable world: property, businesses, collectibles. Limited units — when they're gone, they're gone." },
    { sel: () => $("#btn-simulate"), title: "Simulate a year", text: "One click runs twelve months of markets, events, and the occasional black swan. A century awaits." },
    { sel: () => visibleEl('[data-view="portfolio"]'), title: "Wealth", text: "Your empire, rendered — every building, business and vault you own. Richest after 100 years wins." },
  ];
  function visibleEl(sel) {
    for (const el of $$(sel)) if (el.offsetParent !== null) return el;
    return null;
  }
  let tourStep = -1;
  function startTour() { tourStep = 0; $("#tour-overlay").classList.remove("hidden"); placeTour(); }
  function endTour() {
    $("#tour-overlay").classList.add("hidden");
    tourStep = -1;
    S.flags.tourDone = true;
    save();
  }
  function placeTour() {
    const step = TOUR_STEPS[tourStep];
    const target = step && step.sel();
    if (!target) { endTour(); return; }
    const r = target.getBoundingClientRect();
    const ring = $("#tour-ring"), tip = $("#tour-tip");
    const pad = 6;
    ring.style.left = (r.left - pad) + "px";
    ring.style.top = (r.top - pad) + "px";
    ring.style.width = (r.width + pad * 2) + "px";
    ring.style.height = (r.height + pad * 2) + "px";
    $("#tour-title").textContent = step.title;
    $("#tour-text").textContent = step.text;
    $("#tour-dots").innerHTML = TOUR_STEPS.map((_, i) => `<i class="${i === tourStep ? "on" : ""}"></i>`).join("");
    $("#tour-next").textContent = tourStep === TOUR_STEPS.length - 1 ? "Done" : "Next";
    // place the tip beside the target; fall back to below/above, clamped to the viewport
    const tw = 264, th = 150;
    let tx = r.right + 14, ty = r.top;
    if (tx + tw > innerWidth - 10) {
      tx = Math.min(Math.max(10, r.left + r.width / 2 - tw / 2), innerWidth - tw - 10);
      ty = r.bottom + 12;
    }
    if (ty + th > innerHeight - 10) ty = Math.max(10, r.top - th - 12);
    tip.style.left = tx + "px";
    tip.style.top = ty + "px";
  }
  $("#tour-next").addEventListener("click", () => {
    Sound.play("click");
    tourStep++;
    if (tourStep >= TOUR_STEPS.length) endTour(); else placeTour();
  });
  $("#tour-skip").addEventListener("click", endTour);
  window.addEventListener("resize", () => { if (tourStep >= 0) placeTour(); });

  // ---- the bank ----
  $("#bk-borrow").addEventListener("click", () => {
    const got = borrow(+$("#bk-amount").value);
    if (got > 0) {
      Sound.play("buy");
      toast(`Borrowed ${money(got)}`, "gold", { icon: "🏦", body: "8%/yr. The meter is running." });
      renderAll();
    } else toast("The bank says no.", "red", { body: "Credit line is net-worth-based. Grow first, borrow later." });
  });
  $("#bk-repay").addEventListener("click", () => {
    const paid = repay(+$("#bk-amount").value);
    if (paid > 0) {
      Sound.play("sell");
      toast(`Repaid ${money(paid)}`, "green", { body: "The bank grunts approvingly." });
      renderAll();
    } else toast("Nothing to repay — or no cash to do it with.", "red");
  });

  // ---- trade feel: coins fly from the action to your net worth ----
  function coinFlight(fromEl, n = 6) {
    if (reduced() || !fromEl) return;
    const from = fromEl.getBoundingClientRect();
    const to = $("#hud-networth").getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div");
      c.className = "coin-fly";
      c.innerHTML = GFX.COIN.idle;
      c.style.left = (from.left + from.width / 2) + "px";
      c.style.top = (from.top + from.height / 2) + "px";
      document.body.appendChild(c);
      const dx = to.left + to.width / 2 - (from.left + from.width / 2) + (Math.random() * 40 - 20);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2) + (Math.random() * 16 - 8);
      c.animate([
        { transform: "translate(0,0) scale(.9)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60 - Math.random() * 50}px) scale(.7)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 },
      ], { duration: 620 + i * 55, easing: "cubic-bezier(.3,.6,.4,1)" }).onfinish = () => c.remove();
    }
  }

  // ---- casino chrome: chip presets, streak ladder, balance ----
  $$(".chips-tray").forEach(tray => {
    const target = tray.dataset.for;
    const presets = [[1000, "1K", "c1"], [10000, "10K", "c2"], [50000, "50K", "c3"], [250000, "250K", "c4"]];
    tray.innerHTML = presets.map(([v, l, c]) => `<button class="chip-bet ${c}" data-v="${v}">${l}</button>`).join("") +
      `<button class="chip-bet cmax" data-v="max">MAX</button>`;
    tray.addEventListener("click", e => {
      const b = e.target.closest(".chip-bet");
      if (!b) return;
      Sound.play("tick");
      const v = b.dataset.v === "max" ? Math.max(100, Math.floor(S.season.cash)) : +b.dataset.v;
      $("#" + target).value = v;
    });
  });

  function renderLadder(streak, potLive) {
    $("#streak-ladder").innerHTML = [1, 2, 3, 4, 5, 6].map(i =>
      `<span class="${streak >= i ? "hit" : potLive && streak + 1 === i ? "next" : ""}">×${2 ** i}</span>`).join("");
  }
  renderLadder(0, false);
  function updateCasinoBalance() {
    setNum($("#cas-balance"), S.season.cash);
    if ($("#table-balance")) setNum($("#table-balance"), S.season.cash);
    if ($("#hero-chips")) setNum($("#hero-chips"), S.season.cash);
  }
  updateCasinoBalance();
  const _renderHUD = renderHUD;
  // keep the casino balance chips in sync with every HUD refresh
  window.renderHUD = function () { _renderHUD(); if ($("#cas-balance")) updateCasinoBalance(); };

  // ---- casino: blackjack ----
  const BJ_SUITS = ["♠", "♥", "♦", "♣"];
  const BJ_RANKS = [null, "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  function bjCardHTML(c, down) {
    if (down) return `<span class="pcard facedown">?</span>`;
    const red = c.s === 1 || c.s === 2;
    return `<span class="pcard${red ? " redsuit" : ""}">${BJ_RANKS[c.v]}<small>${BJ_SUITS[c.s]}</small></span>`;
  }
  function renderBJ(st) {
    const playing = st && st.phase === "player";
    $("#bj-player").innerHTML = st ? st.player.map((c, i) => dealtCard(bjCardHTML(c), i)).join("") : "";
    $("#bj-dealer").innerHTML = st ? st.dealer.map((c, i) => dealtCard(bjCardHTML(c, playing && i === 1), i)).join("") : "";
    $("#bj-pv").textContent = st ? bjValue(st.player) : "";
    $("#bj-dv").textContent = st && !playing ? st.dv ?? bjValue(st.dealer) : (st ? "?" : "");
    $("#btn-bj-deal").disabled = !!playing;
    $("#btn-bj-hit").disabled = !playing;
    $("#btn-bj-stand").disabled = !playing;
    $("#btn-bj-double").disabled = !playing || st.player.length !== 2 || S.season.cash < st.bet;
  }
  const BJ_LINES = {
    blackjack: ["BLACKJACK — paid 3:2", "up"], win: ["You win", "up"], dealer_bust: ["Dealer busts — you win", "up"],
    push: ["Push. Bet returned", ""], lose: ["Dealer wins", "down"], bust: ["Bust. Too greedy", "down"],
  };
  function bjResolve(res) {
    renderBJ(res);
    const el = $("#bj-result");
    if (res.outcome) {
      const [txt, cls] = BJ_LINES[res.outcome];
      el.textContent = `${txt}${res.winnings > res.bet ? " — " + money(res.winnings - res.bet) : ""} (you ${res.pv}, dealer ${res.dv})`;
      el.className = "cas-result stamp " + cls;
      Sound.play(cls === "up" ? "win" : cls === "down" ? "lose" : "click");
      dealerSay("blackjack", res.outcome === "blackjack" ? "bigwin" : cls === "up" ? "win" : cls === "down" ? "lose" : "push");
      flushAchievements(); renderHUD(); renderRivals(); renderAwards();
    } else {
      el.textContent = "Hit, stand, or double.";
      el.className = "cas-result";
      Sound.play("tick");
    }
  }
  $("#btn-bj-deal").addEventListener("click", () => {
    const res = bjDeal(+$("#bj-bet").value);
    if (res.error) { toast(res.error, "red"); return; }
    renderHUD();
    dealerSay("blackjack", "deal");
    bjResolve(res);
  });
  $("#btn-bj-hit").addEventListener("click", () => { const r = bjHit(); if (r) bjResolve(r); });
  $("#btn-bj-stand").addEventListener("click", () => { const r = bjStand(); if (r) bjResolve(r); });
  $("#btn-bj-double").addEventListener("click", () => {
    const r = bjDouble();
    if (!r) return;
    if (r.error) { toast(r.error, "red"); return; }
    renderHUD(); bjResolve(r);
  });

  // ---- skip 5 years: fast-forward with a period digest ----
  $("#btn-skip5").addEventListener("click", () => {
    if (S.season.finished || simBusy) return;
    simBusy = true;
    Sound.play("click");
    const startYear = S.season.year;
    const nwBefore = netWorth();
    setTimeout(() => {
      const results = [];
      const doneMissions = [];
      for (let i = 0; i < 5 && !S.season.finished; i++) {
        results.push(simulateYear());
        doneMissions.push(...evalMissions());
      }
      simBusy = false;
      if (!results.length) return;
      doneMissions.forEach((ms, i) => setTimeout(() =>
        toast(`Mission complete: ${ms.text}`, "gold", { icon: "🎯", body: `Reward: ${money(ms.reward)}.` }), 900 + i * 900));
      pendingLifeEvent = S.season.finished ? null : rollLifeEvent(S.season.year); // one event after a 5-year jump
      renderAll({ dash: { animateChart: true } });
      showSkipDigest(results, startYear, nwBefore);
      showNwDelta(netWorth() - nwBefore);
    }, reduced() ? 60 : 400);
  });

  // ---- Fortune Lobby: navigation ----
  function enterCasino() { closeTable(); startCasinoFX(); }
  $("#lobby-games").addEventListener("click", e => {
    const b = e.target.closest("[data-open]");
    if (!b) return;
    Sound.play("click");
    openTable(b.dataset.open);
  });
  $("#btn-back-lobby").addEventListener("click", () => { Sound.play("click"); closeTable(); });
  $("#btn-daily-chips").addEventListener("click", () => {
    const r = claimDailyChips();
    if (r.ok) {
      Sound.play("win");
      toast("Daily chips claimed", "gold", { icon: "🎁", body: money(r.amount) + " in Fortune Chips added." });
      renderHUD(); renderLobby();
    } else {
      const h = Math.max(1, Math.ceil(r.wait / 3600000));
      toast("Already claimed", "", { body: `Come back in ~${h}h for more chips.` });
    }
  });
  $("#btn-riskiq").addEventListener("click", () => {
    Sound.play("click");
    const p = $("#riskiq-panel");
    p.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    p.classList.remove("flash"); void p.offsetWidth; p.classList.add("flash");
  });
  setInterval(() => {
    if (currentView === "casino" && !$("#casino-lobby").classList.contains("hidden")) renderLiveFeed();
  }, 6000);

  // ---- casino: Dice ----
  $$("[data-dice]").forEach(b => b.addEventListener("click", () => {
    const res = playDice(+$("#dice-bet").value, b.dataset.dice);
    if (res.error) { toast(res.error, "red"); return; }
    renderHUD();
    renderDie("#die1", res.d1); renderDie("#die2", res.d2);
    const win = res.winnings > 0;
    const el = $("#dice-result");
    el.textContent = `${res.d1} + ${res.d2} = ${res.sum} — ${win ? "win " + money(res.winnings) : "no luck"}`;
    el.className = "cas-result stamp " + (win ? "up" : "down");
    Sound.play(win ? "win" : "lose");
    dealerSay("dice", win ? (res.winnings >= res.staked * 4 ? "bigwin" : "win") : "lose");
    flushAchievements(); renderHUD(); renderRivals(); renderAwards();
  }));

  // ---- casino: Crash ----
  let crashLive = false, crashM = 1, crashCP = 0, crashT0 = 0, crashRAF = 0, crashPts = [];
  const CRASH_K = 0.45;
  function drawCrash(t) {
    const W = 320, H = 150;
    const tEnd = Math.log(Math.max(1.05, crashCP)) / CRASH_K;
    const x = Math.min(W, (t / tEnd) * W);
    const y = H - Math.min(H - 8, (crashM - 1) / (Math.max(1.2, crashCP) - 1) * (H - 12));
    crashPts.push(x.toFixed(1) + "," + y.toFixed(1));
    $("#crash-graph").innerHTML =
      `<polyline points="0,${H} ${crashPts.join(" ")}" fill="none" stroke="var(--up)" stroke-width="2.6" stroke-linejoin="round"/>` +
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="var(--up)"/>`;
  }
  function crashLoop(now) {
    if (!crashLive) return;
    const t = (now - crashT0) / 1000;
    crashM = Math.exp(CRASH_K * t);
    if (crashM >= crashCP) { crashBustUI(); return; }
    $("#crash-mult").textContent = crashM.toFixed(2) + "×";
    drawCrash(t);
    crashRAF = requestAnimationFrame(crashLoop);
  }
  function crashBustUI() {
    crashLive = false; cancelAnimationFrame(crashRAF);
    const bust = crashBust();
    $("#btn-crash-out").disabled = true; $("#btn-crash-start").disabled = false;
    $("#crash-mult").textContent = (bust ? bust.crashPoint : crashM).toFixed(2) + "× 💥";
    $("#crash-mult").className = "crash-mult bust";
    $("#crash-graph").innerHTML = $("#crash-graph").innerHTML.replace(/var\(--up\)/g, "var(--down)");
    $("#crash-result").textContent = "Crashed. The nerve gave out.";
    $("#crash-result").className = "cas-result stamp down";
    Sound.play("lose"); dealerSay("crash", "lose");
    flushAchievements(); renderHUD(); renderRivals(); renderAwards();
  }
  $("#btn-crash-start").addEventListener("click", () => {
    if (crashLive) return;
    const res = crashStart(+$("#crash-bet").value);
    if (res.error) { toast(res.error, "red"); return; }
    renderHUD();
    crashCP = res.crashPoint; crashM = 1; crashPts = []; crashLive = true; crashT0 = performance.now();
    $("#btn-crash-start").disabled = true; $("#btn-crash-out").disabled = false;
    $("#crash-result").textContent = "Cash out before it breaks…"; $("#crash-result").className = "cas-result";
    $("#crash-mult").className = "crash-mult"; $("#crash-mult").textContent = "1.00×";
    dealerSay("crash", "bet");
    if (reduced()) { // no animation: resolve instantly at a fair random cash-window
      $("#crash-result").textContent = "Tap Cash Out to lock a multiplier.";
    }
    cancelAnimationFrame(crashRAF); crashRAF = requestAnimationFrame(crashLoop);
  });
  $("#btn-crash-out").addEventListener("click", () => {
    if (!crashLive) return;
    const res = crashCashout(crashM);
    crashLive = false; cancelAnimationFrame(crashRAF);
    $("#btn-crash-out").disabled = true; $("#btn-crash-start").disabled = false;
    if (res) {
      $("#crash-mult").textContent = res.at.toFixed(2) + "×"; $("#crash-mult").className = "crash-mult win";
      $("#crash-result").textContent = `Cashed out at ${res.at.toFixed(2)}× — ${money(res.winnings)}`;
      $("#crash-result").className = "cas-result stamp up";
      Sound.play(res.at >= 3 ? "jackpot" : "win");
      if (res.at >= 3) confettiPhysics(50);
      dealerSay("crash", res.at >= 3 ? "bigwin" : "win");
    }
    flushAchievements(); renderHUD(); renderRivals(); renderAwards();
  });

  // ---- casino background: drifting gold dust (canvas, only while on the floor) ----
  let fxRAF = 0, fxParticles = [], fxCanvas = null, fxCtx = null, fxLast = 0, fxW = 0, fxH = 0;
  function fxNew(init) { return { x: Math.random() * fxW, y: init ? Math.random() * fxH : fxH + 8, r: 0.5 + Math.random() * 2.1, vy: 5 + Math.random() * 15, drift: (Math.random() - 0.5) * 9, a: 0.08 + Math.random() * 0.42, tw: Math.random() * 6.28 }; }
  function sizeFX() {
    const sec = $("#view-casino");
    if (!sec || !fxCanvas) return;
    fxW = sec.clientWidth; fxH = Math.max(sec.clientHeight, 760);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fxCanvas.width = fxW * dpr; fxCanvas.height = fxH * dpr;
    fxCanvas.style.width = fxW + "px"; fxCanvas.style.height = fxH + "px";
    fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function fxLoop(now) {
    if (!fxRAF) return;
    if (document.hidden) { fxRAF = requestAnimationFrame(fxLoop); return; }
    const dt = Math.min(0.05, (now - fxLast) / 1000); fxLast = now;
    fxCtx.clearRect(0, 0, fxW, fxH);
    for (const p of fxParticles) {
      p.y -= p.vy * dt; p.x += Math.sin(p.tw + now * 0.0004) * p.drift * dt; p.tw += dt;
      if (p.y < -10) Object.assign(p, fxNew(false));
      fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, 6.283);
      fxCtx.fillStyle = "rgba(232,181,77," + p.a + ")"; fxCtx.fill();
    }
    fxRAF = requestAnimationFrame(fxLoop);
  }
  function startCasinoFX() {
    fxCanvas = $("#casino-bg");
    if (!fxCanvas) return;
    if (reduced()) { fxCanvas.style.display = "none"; return; }
    fxCanvas.style.display = "block";
    fxCtx = fxCanvas.getContext("2d");
    sizeFX();
    if (!fxParticles.length) for (let i = 0; i < 46; i++) fxParticles.push(fxNew(true));
    fxLast = performance.now();
    cancelAnimationFrame(fxRAF); fxRAF = requestAnimationFrame(fxLoop);
  }
  function stopCasinoFX() { cancelAnimationFrame(fxRAF); fxRAF = 0; }
  window.addEventListener("resize", () => { if (fxRAF) sizeFX(); });

  // ---- keyboard shortcuts ----
  const anyOverlayOpen = () => [...$$(".overlay")].some(o => !o.classList.contains("hidden"));
  window.addEventListener("keydown", e => {
    const typing = e.target instanceof Element && e.target.matches("input, textarea");
    if (e.key === "Escape") {
      if (tourStep >= 0) { endTour(); return; }
      if (!$("#sim-overlay").classList.contains("hidden")) { closeRecap(); return; }
      $$(".overlay").forEach(o => {
        if (o.id === "creator-overlay" && !S.profile.name) return; // no escaping character creation
        o.classList.add("hidden");
      });
      if (typing) e.target.blur();
      return;
    }
    if (typing) {
      // let ArrowDown hand focus from search to the table
      if (e.key === "ArrowDown" && e.target.id === "mkt-search") {
        e.preventDefault(); e.target.blur(); kbRow = -1; marketMove(1);
      }
      return;
    }
    if (anyOverlayOpen()) {
      if (e.key === "Enter" && !$("#sim-overlay").classList.contains("hidden")) recapSkip();
      return;
    }
    if (e.key >= "1" && e.key <= "7") { setView(VIEW_ORDER[+e.key - 1]); return; }
    switch (e.key) {
      case "s": case "S":
        if (!S.season.finished) $("#btn-simulate").click();
        break;
      case "/":
        e.preventDefault();
        setView("market");
        $("#mkt-search").focus();
        break;
      case "?":
        $("#shortcuts-modal").classList.remove("hidden");
        break;
      case "ArrowDown":
        if (currentView === "market") { e.preventDefault(); marketMove(1); }
        break;
      case "ArrowUp":
        if (currentView === "market") { e.preventDefault(); marketMove(-1); }
        break;
      case "Enter":
        if (currentView === "market") marketOpenFocused();
        break;
    }
  });

  // ---- chart crosshairs ----
  bindChartCrosshair($("#nw-chart"), $("#nw-tip"), () => nwChartMap, i => `${calYear(i)}`);
  bindChartCrosshair($("#am-chart"), $("#am-tip"), () => amChartMap, i => `${calYear(i)}`);

  // ---- ambient ----
  const liveQuote = () => {
    const pool = listedAssets().filter(a => MARKET_CATS.includes(a.cat));
    const a = pool[Math.floor(Math.random() * pool.length)];
    if (!a) return NEWS_IDLE[0];
    const f = driftFactor(a.id) - 1;
    return `${f >= 0 ? "▲" : "▼"} ${a.name} ${money(livePrice(a.id))} (${pct(f)} live)`;
  };
  const tick = () => setTicker(Math.random() < 0.45 ? liveQuote() : NEWS_IDLE[Math.floor(Math.random() * NEWS_IDLE.length)]);
  tick();
  setInterval(tick, 14000);
  const stampSave = () => { S.lastSeen = Date.now(); save(); };
  setInterval(stampSave, 15000);
  window.addEventListener("beforeunload", stampSave);

  // the live market breathes: refresh visible money surfaces every minute
  setInterval(() => {
    if (document.hidden || !$("#sim-overlay").classList.contains("hidden")) return;
    renderHUD();
    if (currentView === "market") renderMarket();
    if (currentView === "assets") renderAssets();
    if (currentView === "portfolio") { renderPortfolio(); renderEmpire(); }
    if (!$("#asset-modal").classList.contains("hidden")) refreshAssetModal();
  }, 60000);

  applyStyle();
  renderDealers();
  $("#coin-face").innerHTML = GFX.COIN.idle;
  renderAll({ dash: { animateChart: true, mountCards: true } });
  if (!hadSave || !S.profile.name) openCreator();
  else {
    if (!S.flags.tourDone && S.season.year === 0 && !S.pastSeasons.length) startTour();
    // the market kept moving while the app was closed
    const awayMs = Date.now() - (S.lastSeen || Date.now());
    if (awayMs > 30 * 60000 && !S.season.finished) showAwayDigest(awayMs, S.lastSeen);
  }
  S.lastSeen = Date.now();
  save();
})();
