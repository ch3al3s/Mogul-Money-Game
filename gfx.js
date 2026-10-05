// ============ MOGUL: THE MONEY RACE — GFX (v8) ============
// Inline-SVG graphics system. Every asset gets generated tile art:
// a category gradient, a hand-drawn sector glyph, and a per-asset hue shift —
// so no two assets look alike and none of them are emoji.
// All vector, all local, no build step, no external files.
"use strict";

const GFX = (() => {
  // stroke glyphs, 24×24 grid, drawn for stroke-width 2.2 round caps
  const GLYPHS = {
    chart:    "M3 18 L8 12 L12 15 L21 5 M15 5 h6 v6",
    bank:     "M3 9 L12 3 L21 9 M4 9 v9 M9 9 v9 M15 9 v9 M20 9 v9 M2 20 h20",
    signal:   "M4 18 a14 14 0 0 1 16 0 M7.5 14.5 a9 9 0 0 1 9 0 M11 11 a4 4 0 0 1 2 0 M12 18 v.01",
    drop:     "M12 3 C8 9 5 12 5 15.5 a7 7 0 0 0 14 0 C19 12 16 9 12 3 Z",
    bag:      "M6 8 h12 l1.5 12 h-15 Z M9 8 a3 3 0 0 1 6 0",
    factory:  "M3 20 V10 l5 3 V10 l5 3 V6 h5 v14 Z M16 9 h.01",
    chip:     "M7 7 h10 v10 H7 Z M10 10 h4 v4 h-4 Z M9 7 V4 M15 7 V4 M9 20 v-3 M15 20 v-3 M7 9 H4 M7 15 H4 M20 9 h-3 M20 15 h-3",
    nodes:    "M12 5 v5 M7 18 l3.5 -5 M17 18 l-3.5 -5 M12 4 h.01 M6.5 18.5 h.01 M17.5 18.5 h.01 M12 11.5 h.01",
    pill:     "M12 3 v18 M3 12 h18 M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0",
    plane:    "M3 13 L21 5 L14 21 L11.5 13.5 Z M11.5 13.5 L21 5",
    pick:     "M4 20 L14 10 M10 4 C14 3 19 5 21 9 M10 4 l2 5 M21 9 l-5 -1",
    shield:   "M12 3 L19 6 v6 c0 5 -3.5 8 -7 9 c-3.5 -1 -7 -4 -7 -9 V6 Z",
    play:     "M12 3 a9 9 0 1 0 .01 0 Z M10 8.5 L16 12 L10 15.5 Z",
    leaf:     "M5 19 C5 9 12 4 20 4 C20 14 13 19 5 19 Z M5 19 C8 14 12 10 16 8",
    house:    "M4 11 L12 4 L20 11 M6 10 v9 h12 v-9 M10 19 v-5 h4 v5",
    building: "M6 20 V5 h12 v15 M9 8 h.01 M9 11 h.01 M9 14 h.01 M14 8 h.01 M14 11 h.01 M14 14 h.01 M4 20 h16 M11 20 v-3 h2 v3",
    tower:    "M9 20 V4 l6 2 v14 M11.5 8 h.01 M11.5 11 h.01 M11.5 14 h.01 M6 20 h12",
    castle:   "M5 20 V8 M19 20 V8 M5 8 V5 h2 v2 h3 V5 h4 v2 h3 V5 h2 v3 M5 8 h14 M10 20 v-5 h4 v5 M4 20 h16",
    waves:    "M4 8 L12 4 L20 8 M6 8 v6 h12 V8 M3 18 q2 -1.6 4 0 t4 0 t4 0 t4 0 t3 0",
    store:    "M4 9 L6 4 h12 l2 5 M4 9 c0 3 4 3 4 0 c0 3 4 3 4 0 c0 3 4 3 4 0 c0 3 4 3 4 0 M6 12 v8 h12 v-8 M9 20 v-5 h6 v5",
    coin:     "M12 3 a9 9 0 1 0 .01 0 Z M12 7 v10 M9.5 9.5 c0 -3 5 -3 5 0 c0 2.5 -5 2 -5 5 c0 3 5 3 5 0",
    hex:      "M12 3 L19 7.5 v9 L12 21 L5 16.5 v-9 Z M12 8 v8 M9 10 l6 4 M15 10 l-6 4",
    rocket:   "M12 3 c4 3 5 9 2 14 h-4 c-3 -5 -2 -11 2 -14 Z M10 17 l-2.5 4 M14 17 l2.5 4 M12 9 h.01",
    warn:     "M12 4 L21 19 H3 Z M12 10 v4 M12 17 h.01",
    ingot:    "M6 6 h12 l3 5 H3 Z M5 13 h14 l3 5 H2 Z",
    flame:    "M12 3 C14 7 18 9 18 14 a6 6 0 0 1 -12 0 C6 10 10 8 12 3 Z M12 21 a3 3 0 0 0 3 -4",
    cube:     "M12 3 L20 7.5 v9 L12 21 L4 16.5 v-9 Z M4 7.5 L12 12 L20 7.5 M12 12 v9",
    battery:  "M4 8 h14 v9 H4 Z M18 10 h2 v5 h-2 M7 12.5 h3 M13 11 l-2 4 h3 l-2 4",
    atom:     "M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M12 12 m-9 0 a9 4 25 1 0 18 0 a9 4 25 1 0 -18 0 M12 12 m-9 0 a9 4 -25 1 0 18 0 a9 4 -25 1 0 -18 0",
    grain:    "M12 21 V8 M12 8 C10 8 8 6 8 3 c3 0 4 2 4 5 C12 5 13 3 16 3 c0 3 -2 5 -4 5 M8 12 c3 0 4 2 4 4 M16 12 c-3 0 -4 2 -4 4",
    watch:    "M12 6 a6.5 6.5 0 1 0 .01 0 Z M12 9.5 V13 l2.5 1.5 M9.5 6 L10 2.5 h4 L14.5 6 M9.5 18 L10 21.5 h4 l.5 -3.5",
    car:      "M4 15 l2 -6 h12 l2 6 M3 15 h18 v3 h-2 M3 18 h2 M7 18 a1.6 1.6 0 1 0 .1 0 M17 18 a1.6 1.6 0 1 0 .1 0 M8 12 h8",
    frame:    "M5 4 h14 v16 H5 Z M8 7 h8 v10 H8 Z M8 14 l3 -3 2 2 3 -4",
    glass:    "M8 3 h8 c0 5 -2 8 -4 8 s-4 -3 -4 -8 Z M12 11 v7 M8 21 h8 M9 6 h6",
    horseshoe:"M6 21 V10 a6 6 0 0 1 12 0 v11 M6 15 h2 M16 15 h2 M6 18 h2 M16 18 h2",
    cards:    "M5 6 h8 v13 H5 Z M13 5 l5 1.5 -3 12 -2 -.8 M8 10 c1 -2 3 0 1.5 1.5 C11 10 13 12 11 13.5 l-1.5 1.5 -1.5 -1.5 Z",
    boat:     "M4 15 h16 l-3 5 H7 Z M12 15 V4 M12 4 L18 12 H12 M9 15 V9",
    palm:     "M13 21 c0 -6 -1 -10 -2 -13 M11 8 C8 4 5 4 3 6 c3 1 6 1 8 2 Z M11 8 c-1 -4 1 -6 5 -6 c-1 3 -3 5 -5 6 Z M11 8 c3 -2 6 -1 8 2 c-3 .8 -6 0 -8 -2 Z M7 21 h10",
    shoe:     "M3 17 c0 -2 1 -3 3 -4 l3 -6 c3 2 5 3 8 3 l4 4 v3 Z M3 17 h18 M9 10 l2 2 M11 8.5 l2 2",
    guitar:   "M17 3 l3 3 M18.5 4.5 L13 10 M12.5 9.5 c-2 -1 -5 0 -6 2 c-3 0 -4 4 -1.5 5.5 C4 20 8 21.5 9.5 19 c2.5 1 5 -2 3.5 -5 Z",
    gem:      "M7 4 h10 l4 5 -9 11 -9 -11 Z M3 9 h18 M7 4 l5 5 5 -5 M12 9 v11",
    bone:     "M7 14 a2.5 2.5 0 1 1 -3 -3 a2.5 2.5 0 1 1 3 -3 l10 0 a2.5 2.5 0 1 1 3 3 a2.5 2.5 0 1 1 -3 3 Z",
    bottle:   "M10 3 h4 v4 c2 1 3 3 3 5 v9 H7 v-9 c0 -2 1 -4 3 -5 Z M7 16 h10",
    monument: "M12 3 L15 7 H9 Z M10 7 v10 h4 V7 M6 20 l1 -3 h10 l1 3 Z M4 20 h16",
    trophy:   "M8 4 h8 v5 a4 4 0 0 1 -8 0 Z M8 5 H5 a3 3 0 0 0 3 4 M16 5 h3 a3 3 0 0 1 -3 4 M12 13 v3 M9 19 h6 M10 16 h4 v3 h-4 Z",
    music:    "M9 18 V5 l10 -2 v13 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 M19 16 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0",
    sun:      "M12 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M12 3 v2.5 M12 18.5 V21 M3 12 h2.5 M18.5 12 H21 M5.6 5.6 l1.8 1.8 M16.6 16.6 l1.8 1.8 M18.4 5.6 l-1.8 1.8 M7.4 16.6 l-1.8 1.8",
    bus:      "M5 4 h14 v13 H5 Z M5 9 h14 M8 17 v2.5 M16 17 v2.5 M8.5 13 h.01 M15.5 13 h.01",
    cup:      "M6 4 h9 v6 a4.5 4.5 0 0 1 -9 0 Z M15 5 h3 a3 3 0 0 1 -3 5 M5 18 h11 M7 15 l1 3 M14 15 l-1 3",
    parking:  "M5 4 h14 v16 H5 Z M9 17 V7 h4.5 a3.2 3.2 0 0 1 0 6.4 H9",
    billboard:"M4 4 h16 v9 H4 Z M12 13 v7 M9 20 h6 M7 8.5 l3 -2 2 2.5 3 -3",
    server:   "M5 4 h14 v5 H5 Z M5 10 h14 v5 H5 Z M5 16 h14 v5 H5 Z M8 6.5 h.01 M8 12.5 h.01 M8 18.5 h.01 M12 6.5 h4 M12 12.5 h4",
    vfarm:    "M6 21 V4 h12 v17 M6 9 h12 M6 14 h12 M9 7 c1 -2 3 -2 3 0 M9 12 c1 -2 3 -2 3 0 M9 19 c1 -2 3 -2 3 0 M4 21 h16",
    anchor:   "M12 6 a2 2 0 1 0 .01 0 M12 8 v12 M12 20 c-4.5 0 -7 -3 -7.5 -6 l2 1 M12 20 c4.5 0 7 -3 7.5 -6 l-2 1 M9 11 h6",
    boxes:    "M4 13 h7 v7 H4 Z M13 13 h7 v7 h-7 Z M8.5 4 h7 v7 h-7 Z M12 4 v7 M7.5 13 v7 M16.5 13 v7",
    note:     "M9 18 V5 l9 -2 v13 M9 18 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 M18 16 a2.5 2.5 0 1 1 -5 0 a2.5 2.5 0 0 1 5 0 M9 9 l9 -2",
    scroll:   "M7 4 h11 a2 2 0 0 1 -2 2 H7 a2 2 0 0 0 -2 2 v10 a2 2 0 0 0 4 0 v-1 h11 a2 2 0 0 1 -4 0 M9 9 h6 M9 12.5 h6 M9 16 h3",
    mast:     "M12 21 V7 M8 21 l4 -8 4 8 M9 7 a4.5 4.5 0 0 1 6 0 M7 4.5 a8 8 0 0 1 10 0",
    bridge:   "M3 16 h18 M3 16 c2 -6 6 -8 9 -8 s7 2 9 8 M7 16 v-4 M12 16 V8 M17 16 v-4 M3 20 h18",
    flagchk:  "M6 21 V4 M6 4 h12 l-2.5 4 L18 12 H6 M9 4 v8 M13 4 v8 M6 8 h12",
    gamepad:  "M7 8 h10 a4.5 4.5 0 0 1 4 6.5 L19.5 18 a2 2 0 0 1 -3.4 .4 L14.5 16 h-5 L8 18.4 A2 2 0 0 1 4.5 18 L3 14.5 A4.5 4.5 0 0 1 7 8 Z M8.5 11 v3 M7 12.5 h3 M15.5 11 h.01 M17.5 13 h.01",
    drone:    "M5 6 a2.5 2.5 0 1 0 .01 0 M19 6 a2.5 2.5 0 1 0 .01 0 M5 18 a2.5 2.5 0 1 0 .01 0 M19 18 a2.5 2.5 0 1 0 .01 0 M7 8 l3.5 3.5 M17 8 l-3.5 3.5 M7 16 l3.5 -3.5 M17 16 l-3.5 -3.5 M10 12 h4 v2 h-4 Z",
    tap:      "M6 8 h8 a4 4 0 0 1 4 4 v1 h-3 v-1 a1.5 1.5 0 0 0 -1.5 -1.5 M6 8 V5 M4 5 h4 M6 11 v3 M4 14 h4 M15 17 c0 2 -1.5 2.6 -1.5 4 a1.5 1.5 0 0 0 3 0 c0 -1.4 -1.5 -2 -1.5 -4 Z",
    meteor:   "M17 3 l4 4 M14 6 l4 -3 M19 8 l2 -1 M13 7 a7 7 0 1 0 4 4 Z M9.5 13.5 h.01 M12 16.5 h.01",
    book:     "M5 4 h6 a2 2 0 0 1 2 2 v14 a2 2 0 0 0 -2 -2 H5 Z M19 4 h-6 a2 2 0 0 0 -2 2 v14 a2 2 0 0 1 2 -2 h6 Z M7.5 8 h2.5 M14.5 8 h2.5 M7.5 11.5 h2.5",
    keys:     "M4 8 h16 v9 H4 Z M7 8 v5 M10 8 v5 M13 8 v5 M16 8 v5 M5.8 8 v5 h2.4 M11.8 8 v5 h2.4",
    film:     "M12 4 a8 8 0 1 0 .01 0 Z M12 9 a3 3 0 1 0 .01 0 M12 5.5 h.01 M12 18.5 h.01 M5.5 12 h.01 M18.5 12 h.01 M14 14 l6 7",
    globeg:   "M12 3 a9 9 0 1 0 .01 0 Z M3 12 h18 M12 3 c-3.5 3 -3.5 15 0 18 c3.5 -3 3.5 -15 0 -18 M12 21 v0 M10 21 l-1.5 2 h7 l-1.5 -2",
    capsule:  "M12 3 c4 0 6 4 6 9 l-2 6 h-8 l-2 -6 c0 -5 2 -9 6 -9 Z M9 9 h6 M10 18 l-1.5 3 M14 18 l1.5 3 M12 6 h.01",
  };

  // category gradient families [h, s%, l%] top → bottom
  const FAMS = {
    stocks:     [[222, 92, 66], [226, 78, 48]],
    crypto:     [[251, 92, 70], [253, 76, 52]],
    commodity:  [[38, 78, 58], [33, 72, 40]],
    realestate: [[201, 88, 58], [206, 80, 42]],
    business:   [[158, 74, 46], [161, 78, 32]],
    luxury:     [[326, 78, 66], [330, 62, 48]],
    legacy:     [[43, 82, 56], [40, 74, 38]],
  };

  const hashId = id => {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
    return h >>> 0;
  };

  // pick a glyph for an asset
  const NICHE_GLYPHS = {
    parking: "parking", billboard: "billboard", datacenter: "server", vfarm: "vfarm", marina: "anchor", storage: "boxes",
    royalties: "note", patents: "scroll", celltowers: "mast", tollbridge: "bridge", racing: "flagchk", esports: "gamepad",
    drones: "drone", waterco: "tap",
    meteor: "meteor", manuscript: "book", synth: "keys", filmreel: "film", globe: "globeg", capsule: "capsule",
  };
  function glyphFor(a) {
    if (a.arch === "legacy") return "monument";
    const mID = a.id && a.id.match(/^(?:nr|nb|lx)_([a-z]+)_/);
    if (mID && NICHE_GLYPHS[mID[1]]) return NICHE_GLYPHS[mID[1]];
    if (a.cat === "stocks") {
      return ({ Banking: "bank", Telecoms: "signal", Energy: "drop", Retail: "bag", Industrials: "factory",
        Technology: "chip", AI: "nodes", Pharma: "pill", Travel: "plane", Mining: "pick", Defense: "shield",
        Media: "play", Agriculture: "leaf" })[a.sector] || "chart";
    }
    if (a.cat === "crypto") {
      return ({ bluechip: "hex", stable: "coin", alt: "nodes", meme: "rocket", rug: "warn" })[a.arch || a.tag] || "hex";
    }
    if (a.cat === "commodity") {
      return ({ safehaven: "ingot", oil: "flame", industrial: "cube", ev: "battery", energy: "atom", crops: "grain", green: "leaf", ai: "chip" })[a.tag] || "ingot";
    }
    if (a.cat === "realestate") {
      const kind = ["building", "house", "tower", "castle", "waves", "block"][+(a.id.split("_re_")[1] || 0)] || "building";
      return kind === "block" ? "store" : kind;
    }
    if (a.cat === "business") {
      return ({ consumer: "cup", nightlife: "music", travel: "bus", sport: "trophy", green: "sun", tech: "chip", crops: "leaf", legacy: "monument" })[a.tag] || "store";
    }
    if (a.cat === "luxury") {
      const kind = (a.id.split("_")[1] || "");
      return ({ watch: "watch", car: "car", vintage: "car", art: "frame", wine: "glass", whisky: "glass",
        cards: "cards", horse: "horseshoe", yacht: "boat", island: "palm", jet: "plane", sneaker: "shoe",
        guitar: "guitar", jewel: "gem", fossil: "bone", cellar: "bottle" })[kind] || "gem";
    }
    return "chart";
  }

  const hsl = ([h, s, l]) => `hsl(${h},${s}%,${l}%)`;

  // the generated tile: gradient square, glyph, unique hue shift per id
  function icon(a, size = 36) {
    if (!a) return "";
    const fam = FAMS[a.arch === "legacy" ? "legacy" : a.cat] || FAMS.stocks;
    const shift = (hashId(a.id) % 33) - 16; // ±16° hue — every asset its own tint
    const c1 = hsl([fam[0][0] + shift, fam[0][1], fam[0][2]]);
    const c2 = hsl([fam[1][0] + shift, fam[1][1], fam[1][2]]);
    const g = GLYPHS[glyphFor(a)] || GLYPHS.chart;
    const uid = "g" + (hashId(a.id) % 100000);
    return `<svg class="gicon" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="url(#${uid})"/>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
      <path d="M1 11 a10 10 0 0 1 10 -10 h18 a10 10 0 0 1 10 10 Z" fill="rgba(255,255,255,.14)"/>
      <g transform="translate(8,8)"><path d="${g}" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
    </svg>`;
  }
  // small inline version for text rows
  const chip = (a, size = 17) => `<span class="gchip">${icon(a, size)}</span>`;

  // slot machine symbols (engine keeps emoji strings as logical ids)
  const SLOT_SVGS = {
    "🍒": `<svg viewBox="0 0 40 40"><path d="M22 6 C18 10 15 16 15 22" fill="none" stroke="#7fbf5f" stroke-width="2.5" stroke-linecap="round"/><path d="M22 6 c4 1 7 4 8 8 c-4 1 -7 -1 -8 -8 Z" fill="#5da341"/><circle cx="13" cy="26" r="7" fill="#e6393f"/><circle cx="25" cy="28" r="6.4" fill="#c02730"/><circle cx="11" cy="24" r="2" fill="rgba(255,255,255,.5)"/></svg>`,
    "🍋": `<svg viewBox="0 0 40 40"><ellipse cx="20" cy="21" rx="13" ry="9.5" fill="#f2c94c" transform="rotate(-18 20 21)"/><ellipse cx="16" cy="17" rx="4" ry="2.4" fill="rgba(255,255,255,.45)" transform="rotate(-18 16 17)"/><path d="M31 12 l4 -3" stroke="#5da341" stroke-width="2.5" stroke-linecap="round"/></svg>`,
    "🔔": `<svg viewBox="0 0 40 40"><path d="M20 6 c6 0 9 5 9 11 c0 5 2 7 4 9 H7 c2 -2 4 -4 4 -9 c0 -6 3 -11 9 -11 Z" fill="#f4c860"/><circle cx="20" cy="30" r="3" fill="#d9a84a"/><rect x="18.6" y="4" width="2.8" height="4" rx="1.4" fill="#d9a84a"/><path d="M14 10 c-2 2 -3 5 -3 8" stroke="rgba(255,255,255,.55)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
    "⭐": `<svg viewBox="0 0 40 40"><path d="M20 4 l4.8 9.7 10.7 1.6 -7.7 7.5 1.8 10.7 -9.6 -5 -9.6 5 1.8 -10.7 -7.7 -7.5 10.7 -1.6 Z" fill="#f4c860" stroke="#d9a84a" stroke-width="1.4" stroke-linejoin="round"/><path d="M20 8 l3 6" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round"/></svg>`,
    "💎": `<svg viewBox="0 0 40 40"><path d="M12 7 h16 l7 8 -15 18 -15 -18 Z" fill="#69c8ff"/><path d="M5 15 h30 M12 7 l8 8 8 -8 M20 15 v18" stroke="rgba(255,255,255,.75)" stroke-width="1.6" fill="none"/><path d="M12 7 l-7 8 h13 Z" fill="rgba(255,255,255,.35)"/></svg>`,
  };
  const slot = sym => `<i class="slot-sym">${SLOT_SVGS[sym] || ""}</i>`;

  // coin-flip faces
  const COIN = {
    idle: `<svg viewBox="0 0 64 64" width="52" height="52"><circle cx="32" cy="32" r="28" fill="#f4c860" stroke="#b07d20" stroke-width="3"/><circle cx="32" cy="32" r="21" fill="none" stroke="#d9a84a" stroke-width="1.6" stroke-dasharray="3 3"/><text x="32" y="41" text-anchor="middle" font-family="Space Grotesk,system-ui" font-weight="700" font-size="26" fill="#7a5418">M</text></svg>`,
    win:  `<svg viewBox="0 0 64 64" width="52" height="52"><circle cx="32" cy="32" r="28" fill="#2bd48c" stroke="#0d9159" stroke-width="3"/><path d="M20 33 l8 8 16 -17" fill="none" stroke="#04170d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    lose: `<svg viewBox="0 0 64 64" width="52" height="52"><circle cx="32" cy="32" r="28" fill="#ff6e66" stroke="#c0392f" stroke-width="3"/><path d="M22 22 l20 20 M42 22 l-20 20" stroke="#2b0705" stroke-width="6" stroke-linecap="round"/></svg>`,
  };

  function colors(a) {
    const fam = FAMS[a.arch === "legacy" ? "legacy" : a.cat] || FAMS.stocks;
    const shift = (hashId(a.id) % 33) - 16;
    return [hsl([fam[0][0] + shift, fam[0][1], fam[0][2]]), hsl([fam[1][0] + shift, fam[1][1], Math.max(10, fam[1][2] - 22)])];
  }

  // generated hero banner for the detail view — every asset gets its own scene
  function banner(a, w = 560, h = 96) {
    if (!a) return "";
    const [c1, c2] = colors(a);
    const gl = GLYPHS[glyphFor(a)] || GLYPHS.chart;
    const uid = "b" + (hashId(a.id) % 100000);
    const seedR = hashId(a.id + "b");
    const ringX = 80 + (seedR % 120);
    return `<svg class="gbanner" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#${uid})"/>
      <circle cx="${ringX}" cy="${h * 0.2}" r="90" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="1.4"/>
      <circle cx="${ringX}" cy="${h * 0.2}" r="58" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1.2"/>
      <circle cx="${ringX}" cy="${h * 0.2}" r="30" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
      <path d="M0 ${h} L ${w * 0.45} 0 L ${w * 0.58} 0 L ${w * 0.13} ${h} Z" fill="rgba(255,255,255,.05)"/>
      <path d="M${w * 0.3} ${h} L ${w * 0.68} 0 L ${w * 0.74} 0 L ${w * 0.36} ${h} Z" fill="rgba(255,255,255,.04)"/>
      <g transform="translate(${w - 118}, ${h / 2 - 44}) scale(3.6)" opacity=".26">
        <path d="${gl}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <rect width="${w}" height="${h}" fill="url(#${uid})" opacity="0" />
      <rect width="${w}" height="${h}" fill="rgba(0,0,0,.12)"/>
    </svg>`;
  }

  // ---- playing card (shared by blackjack + poker) ----
  const CARD_SUITS = ["♠", "♥", "♦", "♣"];
  const CARD_RANKS = [null, "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  function card(c, down) {
    if (down) return `<span class="pcard facedown">?</span>`;
    const red = c.s === 1 || c.s === 2;
    return `<span class="pcard${red ? " redsuit" : ""}">${CARD_RANKS[c.v]}<small>${CARD_SUITS[c.s]}</small></span>`;
  }

  // ---- live-dealer avatar — parametric SVG bust (croupier vest + bow tie) ----
  const D_SKIN = ["#f2caa0", "#e0a878", "#c98b52", "#9c6b3f", "#6b4423"];
  const D_HAIR = ["#20232b", "#4a3323", "#7a4a1e", "#c9c9cf", "#2a2140"];
  const D_TIE  = ["#c0392f", "#2f6bd8", "#159a60", "#7c3aed", "#e8b54d"];
  function dealer(spec = {}, size = 48) {
    const sk = D_SKIN[(spec.skin ?? 0) % D_SKIN.length];
    const hr = D_HAIR[(spec.hair ?? 0) % D_HAIR.length];
    const tie = D_TIE[(spec.tie ?? 0) % D_TIE.length];
    const hs = (spec.hairStyle ?? 0) % 3;
    let hair;
    if (hs === 0) hair = `<path d="M20 30 A12 12 0 0 1 44 30 L44 25 C44 17 20 17 20 25 Z" fill="${hr}"/>`;
    else if (hs === 1) hair = `<path d="M20 29 A12 12 0 0 1 44 29 C40 22 24 22 20 29 Z" fill="${hr}"/><rect x="19" y="24" width="4.5" height="15" rx="2" fill="${hr}"/><rect x="40.5" y="24" width="4.5" height="15" rx="2" fill="${hr}"/>`;
    else hair = `<path d="M21 28 A11 11 0 0 1 43 28 C43 21 21 21 21 28 Z" fill="${hr}"/>`;
    const glasses = spec.glasses
      ? `<rect x="22" y="27.5" width="8" height="6" rx="2.4" fill="none" stroke="#1a1c22" stroke-width="1.3"/><rect x="34" y="27.5" width="8" height="6" rx="2.4" fill="none" stroke="#1a1c22" stroke-width="1.3"/><path d="M30 30 h4" stroke="#1a1c22" stroke-width="1.3"/>`
      : "";
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="dealer-svg" aria-hidden="true">
      <rect width="64" height="64" fill="#0f1a15"/>
      <circle cx="20" cy="14" r="26" fill="rgba(255,255,255,.04)"/>
      <path d="M8 64 C8 49 20 43 32 43 C44 43 56 49 56 64 Z" fill="#161d2b"/>
      <path d="M26 44 L32 60 L38 44 Z" fill="#f2f3f7"/>
      <path d="M32 48 L25 44 L25 52 Z M32 48 L39 44 L39 52 Z" fill="${tie}"/>
      <circle cx="32" cy="48" r="2.1" fill="${tie}"/>
      <rect x="28.5" y="37" width="7" height="8" fill="${sk}"/>
      <circle cx="32" cy="30" r="12" fill="${sk}"/>
      ${hair}
      <circle class="d-eye" cx="27.4" cy="30.5" r="1.5" fill="#1a1c22"/>
      <circle class="d-eye" cx="36.6" cy="30.5" r="1.5" fill="#1a1c22"/>
      ${glasses}
      <path d="M28.5 35.5 q3.5 2.6 7 0" fill="none" stroke="#b06a52" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`;
  }

  return { icon, chip, slot, COIN, glyphFor, colors, banner, card, dealer };
})();
