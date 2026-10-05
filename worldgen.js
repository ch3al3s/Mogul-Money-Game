// ============ MOGUL: THE MONEY RACE — WORLD GENERATOR (v4) ============
// Every season generates its own fictional market from the season seed:
// same seed → identical world (challenge codes still work), new seed → new world.
//
// RULES:
//  - Every company, coin, fund and collectible name is INVENTED. Real places
//    (countries, cities) are used for flavor; real companies and people never.
//  - Each country has a FIXED slate: 6 stocks, 4 properties, 3 businesses.
//    Global pools: 12 crypto, 10 commodities, 10 collectibles.
//  - An IPO pipeline lists ~30 new companies across the 100-year season.
//  - Generation order is FIXED so a seed always produces the same world.
//    Never reorder the banks or slates below — that changes every world.
"use strict";

// ---------- countries (fixed order — never reorder) ----------
// region values match the EVENTS/REGION_NAMES vocabulary in data.js.
const COUNTRIES = [
  { key: "us", name: "USA",          flag: "🇺🇸", region: "us",      band: "developed", ccy: "$" },
  { key: "uk", name: "UK",           flag: "🇬🇧", region: "uk",      band: "developed", ccy: "$" },
  { key: "ng", name: "Nigeria",      flag: "🇳🇬", region: "nigeria", band: "emerging",  ccy: "$" },
  { key: "za", name: "South Africa", flag: "🇿🇦", region: "africa",  band: "emerging",  ccy: "$" },
  { key: "ke", name: "Kenya",        flag: "🇰🇪", region: "africa",  band: "emerging",  ccy: "$" },
  { key: "ae", name: "UAE",          flag: "🇦🇪", region: "mideast", band: "gulf",      ccy: "$" },
  { key: "mc", name: "Monaco",       flag: "🇲🇨", region: "monaco",  band: "haven",     ccy: "$" },
  { key: "de", name: "Germany",      flag: "🇩🇪", region: "europe",  band: "developed", ccy: "$" },
  { key: "fr", name: "France",       flag: "🇫🇷", region: "europe",  band: "developed", ccy: "$" },
  { key: "jp", name: "Japan",        flag: "🇯🇵", region: "asia",    band: "developed", ccy: "$" },
  { key: "in", name: "India",        flag: "🇮🇳", region: "asia",    band: "emerging",  ccy: "$" },
  { key: "sg", name: "Singapore",    flag: "🇸🇬", region: "asia",    band: "developed", ccy: "$" },
  { key: "br", name: "Brazil",       flag: "🇧🇷", region: "latam",   band: "emerging",  ccy: "$" },
  { key: "au", name: "Australia",    flag: "🇦🇺", region: "oceania", band: "developed", ccy: "$" },
];
const COUNTRY_BY_KEY = Object.fromEntries(COUNTRIES.map(c => [c.key, c]));

// ---------- invented name banks (curated: no real brands, no real people) ----------
const STEMS = {
  us: ["Apex", "Vertex", "Redwood", "Cobalt", "Ridgeline", "Falcon Peak", "Beacon", "Frontier", "Quartzline", "Ironvale", "Bluegrass", "Stonebridge"],
  uk: ["Albion", "Thistledown", "Greyharbour", "Oakcrest", "Pennine", "Foxmoor", "Kingsbarrow", "Wrenfield", "Stonegate", "Marlton"],
  ng: ["Eko", "Zuri", "Gidiline", "Palmline", "Kolanut", "Adire", "Savanna Gate", "Obalight", "Nairaworks", "Harmattan"],
  za: ["Veldstone", "Karoo", "Goldreef", "Protea Ridge", "Umoya", "Drakenspur", "Baobab", "Kapstad"],
  ke: ["Umoja", "Savuti", "Ngong Hills", "Jambo Ridge", "Acacia Gate", "Simba Rock", "Rift Line"],
  ae: ["Falcon Dune", "Mirage Gate", "Pearl Route", "Oasis Crest", "Sandline", "Golden Dhow", "Sahara Star"],
  mc: ["Azure Rock", "Riviera Crest", "Corniche", "Grand Bleu", "Portside", "Monte Rosa"],
  de: ["Eisenhardt", "Schwarzwald", "Adlerstein", "Rheingold", "Nordturm", "Bergwerk", "Falkenrode"],
  fr: ["Lumière Bleue", "Château Vert", "Aubertin", "Solenne", "Ferrand", "Belrive", "Montclair"],
  jp: ["Sakuragi", "Kitsune", "Harukaze", "Tetsuyama", "Ginrei", "Hoshizora", "Kurogane"],
  in: ["Ashoka Gate", "Meridian Peak", "Lotus Vale", "Suryaline", "Kaveri", "Himal Crest", "Chandra Works"],
  sg: ["Merlion Bay", "Straits Crown", "Orchid Gate", "Padang", "Harbourfront", "Temasek Vale"],
  br: ["Ipanema Verde", "Cerrado", "Selva Azul", "Serra Alta", "Bossa Rock", "Pantanal Gate"],
  au: ["Southern Cross", "Wattle Creek", "Bluegum", "Coral Gate", "Outback Ridge", "Kookaburra"],
};
const SECTOR_DEFS = {
  bank:      { label: "Banking",     suffixes: ["Bank", "Capital", "Trust", "Finance Group"], emoji: "🏦", tag: "bank",     mu: [0.06, 0.11], sigma: [0.18, 0.28], yld: [0.03, 0.07], price: [8, 240] },
  telco:     { label: "Telecoms",    suffixes: ["Telecom", "Connect", "Networks", "Mobile"],  emoji: "📡", tag: "telco",    mu: [0.04, 0.07], sigma: [0.12, 0.18], yld: [0.04, 0.07], price: [10, 90] },
  energy:    { label: "Energy",      suffixes: ["Energy", "Petroleum", "Power", "Resources"], emoji: "🛢️", tag: "oil",      mu: [0.05, 0.08], sigma: [0.22, 0.30], yld: [0.04, 0.06], price: [20, 160] },
  retail:    { label: "Retail",      suffixes: ["Stores", "Retail", "Markets", "Trading Co"], emoji: "🛒", tag: "consumer", mu: [0.06, 0.09], sigma: [0.13, 0.19], yld: [0.015, 0.03], price: [15, 280] },
  industry:  { label: "Industrials", suffixes: ["Industries", "Works", "Steel", "Engineering"], emoji: "🏭", tag: "industrial", mu: [0.05, 0.08], sigma: [0.18, 0.27], yld: [0.02, 0.04], price: [25, 200] },
  tech:      { label: "Technology",  suffixes: ["Systems", "Labs", "Digital", "Technologies"], emoji: "💻", tag: "tech",   mu: [0.10, 0.15], sigma: [0.25, 0.42], yld: [0, 0.01], price: [30, 480] },
  ai:        { label: "AI",          suffixes: ["Intelligence", "Minds", "Cortex", "Neural"], emoji: "🧠", tag: "ai",       mu: [0.13, 0.18], sigma: [0.40, 0.58], yld: [0, 0],   price: [40, 260] },
  pharma:    { label: "Pharma",      suffixes: ["Pharma", "Biosciences", "Therapeutics", "Health"], emoji: "💊", tag: "pharma", mu: [0.08, 0.13], sigma: [0.22, 0.5], yld: [0, 0.02], price: [30, 300] },
  travel:    { label: "Travel",      suffixes: ["Airways", "Voyages", "Hotels", "Cruises"],   emoji: "✈️", tag: "travel",   mu: [0.05, 0.09], sigma: [0.26, 0.36], yld: [0.01, 0.02], price: [12, 120] },
  mining:    { label: "Mining",      suffixes: ["Mining", "Minerals", "Extraction", "Deep Earth"], emoji: "⛏️", tag: "mining", mu: [0.06, 0.09], sigma: [0.26, 0.36], yld: [0.03, 0.05], price: [10, 110] },
  defense:   { label: "Defense",     suffixes: ["Defense", "Aerospace", "Shield", "Dynamics"], emoji: "🛡️", tag: "defense", mu: [0.08, 0.11], sigma: [0.20, 0.28], yld: [0.015, 0.03], price: [60, 420] },
  media:     { label: "Media",       suffixes: ["Media", "Studios", "Broadcasting", "Stream"], emoji: "🎬", tag: "media",   mu: [0.07, 0.11], sigma: [0.25, 0.35], yld: [0, 0.01], price: [25, 600] },
  agri:      { label: "Agriculture", suffixes: ["Agri", "Farms", "Harvest", "Growers"],       emoji: "🌾", tag: "agri",     mu: [0.05, 0.08], sigma: [0.17, 0.25], yld: [0.02, 0.04], price: [12, 90] },
};
const SECTOR_KEYS = Object.keys(SECTOR_DEFS);

// property slates: [labelTemplate, emoji, priceBand by country band]
const PROPERTY_SLOTS = [
  { kind: "flat",     emoji: "🏢", label: (d, city) => `${d} Apartments, ${city}`,   price: { developed: [280000, 800000],  emerging: [45000, 220000],  gulf: [300000, 700000],  haven: [2200000, 5200000] }, yld: [0.03, 0.08], sigma: [0.10, 0.17] },
  { kind: "house",    emoji: "🏡", label: (d, city) => `${d} Residences, ${city}`,   price: { developed: [500000, 1500000], emerging: [90000, 380000],  gulf: [600000, 1600000], haven: [4500000, 9000000] }, yld: [0.025, 0.06], sigma: [0.10, 0.16] },
  { kind: "tower",    emoji: "🏙️", label: (d, city) => `${d} Tower, ${city}`,        price: { developed: [1400000, 4200000], emerging: [300000, 1200000], gulf: [1600000, 5200000], haven: [9000000, 22000000] }, yld: [0.02, 0.05], sigma: [0.12, 0.20] },
  { kind: "landmark", emoji: "🏰", label: (d, city) => `The ${d} Estate, ${city}`,   price: { developed: [6000000, 18000000], emerging: [1500000, 4200000], gulf: [7000000, 16000000], haven: [26000000, 60000000] }, yld: [0.01, 0.03], sigma: [0.13, 0.21] },
  { kind: "villa",    emoji: "🌊", label: (d, city) => `${d} Waterfront Villas, ${city}`, price: { developed: [900000, 2600000], emerging: [180000, 700000], gulf: [1100000, 3000000], haven: [7000000, 15000000] }, yld: [0.03, 0.07], sigma: [0.12, 0.19] },
  { kind: "block",    emoji: "🏬", label: (d, city) => `${d} Commercial Block, ${city}`,  price: { developed: [2200000, 6000000], emerging: [450000, 1600000], gulf: [2600000, 7000000], haven: [12000000, 28000000] }, yld: [0.04, 0.07], sigma: [0.11, 0.17] },
];
const CITIES = {
  us: ["New York", "Miami", "Austin"], uk: ["London", "Manchester", "Edinburgh"], ng: ["Lagos", "Abuja", "Port Harcourt"],
  za: ["Cape Town", "Johannesburg", "Durban"], ke: ["Nairobi", "Mombasa", "Kisumu"], ae: ["Dubai", "Abu Dhabi", "Sharjah"],
  mc: ["Monte Carlo", "La Condamine", "Fontvieille"], de: ["Berlin", "Munich", "Hamburg"], fr: ["Paris", "Nice", "Lyon"],
  jp: ["Tokyo", "Osaka", "Kyoto"], in: ["Mumbai", "Bengaluru", "Delhi"], sg: ["Singapore", "Sentosa", "Marina Bay"],
  br: ["São Paulo", "Rio de Janeiro", "Florianópolis"], au: ["Sydney", "Melbourne", "Gold Coast"],
};
const DISTRICTS = ["Palmgrove", "Northgate", "Silverline", "Old Quarter", "Harbourview", "Sunset Ridge", "Kingsway", "Lakeside", "Highfield", "Amberwood", "Crescent", "Garden Gate", "Ivory Park", "Meridian", "Windward", "Stonecourt"];

// business slates per draw: [name template, emoji, tag, price band, yield band, sigma band]
const BUSINESS_KINDS = [
  { kind: "food",      emoji: "🍢", tag: "consumer",  names: ["Street Kitchen", "Grill House", "Bakery Co", "Food Truck Fleet"], price: [30000, 160000],   yld: [0.14, 0.24], sigma: [0.10, 0.20], mu: [0.02, 0.05] },
  { kind: "nightlife", emoji: "🪩", tag: "nightlife", names: ["Nightclub", "Rooftop Bar", "Jazz Cellar", "Beach Club"],          price: [180000, 900000],  yld: [0.09, 0.16], sigma: [0.22, 0.34], mu: [0.03, 0.06] },
  { kind: "transport", emoji: "🚌", tag: "travel",    names: ["Minibus Fleet", "Ferry Line", "Charter Service", "Courier Co"],   price: [20000, 250000],   yld: [0.12, 0.24], sigma: [0.14, 0.26], mu: [0.02, 0.04] },
  { kind: "sport",     emoji: "⚽", tag: "sport",     names: ["Football Club", "Padel Centre", "Boxing Gym", "Cricket Franchise"], price: [350000, 45000000], yld: [0.01, 0.08], sigma: [0.22, 0.30], mu: [0.05, 0.08] },
  { kind: "green",     emoji: "🔆", tag: "green",     names: ["Solar Farm", "Wind Cooperative", "Recycling Plant"],              price: [900000, 3200000], yld: [0.07, 0.10], sigma: [0.12, 0.18], mu: [0.03, 0.05] },
  { kind: "venture",   emoji: "📱", tag: "tech",      names: ["Fintech Startup", "Delivery App", "Streaming Studio", "Robotics Lab"], price: [90000, 480000], yld: [0, 0],     sigma: [0.55, 0.85], mu: [0.12, 0.20] },
  { kind: "farm",      emoji: "🌄", tag: "crops",     names: ["Coffee Farm", "Vineyard", "Cocoa Plantation", "Cattle Ranch"],    price: [140000, 1600000], yld: [0.07, 0.12], sigma: [0.18, 0.28], mu: [0.03, 0.06] },
];

// crypto pool (12): [archetype, count]
const CRYPTO_PREFIX = ["Nova", "Zenith", "Orbix", "Pulse", "Nebula", "Quantum", "Ember", "Frost", "Turbo", "Pixel", "Vapor", "Comet", "Drift", "Glacier", "Onyx", "Aurora"];
const CRYPTO_SUFFIX = ["Coin", "Chain", "Cash", "Token", "Net", "Ledger"];
const MEME_ANIMALS = ["Capy", "Snek", "Wombat", "Axolotl", "Pigeon", "Ferret", "Goat", "Mantis", "Llama", "Toad"];
const CRYPTO_SLOTS = [
  { arch: "bluechip", n: 2, tag: "bluechip", mu: [0.16, 0.22], sigma: [0.6, 0.8],   yld: [0, 0.03],  price: [900, 80000], emoji: "🪙" },
  { arch: "stable",   n: 1, tag: "stable",   mu: [0.004, 0.006], sigma: [0.006, 0.01], yld: [0.04, 0.05], price: [1, 1], emoji: "💵" },
  { arch: "alt",      n: 6, tag: "alt",      mu: [0.10, 0.20], sigma: [0.75, 1.1],  yld: [0, 0.06],  price: [0.5, 200], emoji: "🔮" },
  { arch: "meme",     n: 6, tag: "meme",     mu: [0.02, 0.08], sigma: [1.3, 2.3],   yld: [0, 0],     price: [0.00001, 0.5], emoji: "🐸" },
  { arch: "rug",      n: 1, tag: "rug",      mu: [-0.15, -0.15], sigma: [2.4, 2.4], yld: [0, 0],     price: [0.001, 0.01], emoji: "🧻" },
];

// commodities — real materials (not companies), fixed slate, prices jittered per world
const COMMODITY_SLATE = [
  { name: "Gold (oz)",           emoji: "🥇", tag: "safehaven",  base: 4150,  mu: 0.06, sigma: 0.14 },
  { name: "Silver (oz)",         emoji: "🥈", tag: "safehaven",  base: 46,    mu: 0.06, sigma: 0.22 },
  { name: "Crude Oil (bbl)",     emoji: "🛢️", tag: "oil",        base: 68,    mu: 0.03, sigma: 0.32 },
  { name: "Natural Gas (MMBtu)", emoji: "🔥", tag: "oil",        base: 3.4,   mu: 0.03, sigma: 0.45 },
  { name: "Copper (ton)",        emoji: "🟠", tag: "industrial", base: 10400, mu: 0.05, sigma: 0.24 },
  { name: "Lithium (ton)",       emoji: "🔋", tag: "ev",         base: 12800, mu: 0.07, sigma: 0.42 },
  { name: "Uranium (lb)",        emoji: "☢️", tag: "energy",     base: 84,    mu: 0.08, sigma: 0.35 },
  { name: "Wheat (ton)",         emoji: "🌾", tag: "crops",      base: 245,   mu: 0.03, sigma: 0.26 },
  { name: "Coffee (ton)",        emoji: "☕", tag: "crops",      base: 5300,  mu: 0.04, sigma: 0.30 },
  { name: "Rare Earths Index",   emoji: "🧲", tag: "industrial", base: 1900,  mu: 0.08, sigma: 0.38 },
  { name: "Carbon Credits (ton)", emoji: "🌫️", tag: "green",     base: 95,    mu: 0.07, sigma: 0.30 },
  { name: "Water Rights (ML)",   emoji: "💧", tag: "crops",      base: 2100,  mu: 0.06, sigma: 0.22 },
  { name: "Timber (m³)",         emoji: "🪵", tag: "crops",      base: 320,   mu: 0.04, sigma: 0.18 },
  { name: "Helium-3 (kg)",       emoji: "🌕", tag: "energy",     base: 1400000, mu: 0.09, sigma: 0.48 },
  { name: "Compute Index (PFLOP-day)", emoji: "🧮", tag: "ai",   base: 240,   mu: 0.11, sigma: 0.44 },
];

// collectibles (10 slots) — every marque/artist invented
const LUXURY_SLOTS = [
  { kind: "watch",   emoji: "⌚", tag: "hype", names: ["Meridian Chronograph", "Aldebaran Perpetual", "Northstar Tourbillon"], price: [30000, 420000], sigma: [0.22, 0.3], mu: [0.06, 0.08], supply: [2, 6] },
  { kind: "car",     emoji: "🏎️", tag: "hype", names: ["Vega GT Roadster", "Stratos Millegra", "Falchion V12"],               price: [900000, 4200000], sigma: [0.24, 0.32], mu: [0.06, 0.08], supply: [1, 3] },
  { kind: "vintage", emoji: "🚗", tag: "art",  names: ["'62 Corsair Spyder", "'71 Boreal Coupe", "'58 Duchess Cabriolet"],     price: [700000, 2400000], sigma: [0.26, 0.34], mu: [0.07, 0.09], supply: [1, 2] },
  { kind: "art",     emoji: "🎨", tag: "art",  names: ["Untitled No. 7", "Harmattan Dusk", "The Blue Hour Triptych", "Study in Ochre"], price: [180000, 1500000], sigma: [0.4, 0.55], mu: [0.07, 0.1], supply: [1, 1] },
  { kind: "wine",    emoji: "🍷", tag: "art",  names: ["Belrive Grand Cellar", "Kloof Reserve Vault", "Comet Vintage Lot"],    price: [60000, 220000], sigma: [0.18, 0.24], mu: [0.06, 0.08], supply: [2, 8] },
  { kind: "whisky",  emoji: "🥃", tag: "art",  names: ["Thistledown 40yr Cask", "Kurogane Single Cask", "Pennine Reserve"],    price: [30000, 90000], sigma: [0.22, 0.28], mu: [0.07, 0.09], supply: [2, 6] },
  { kind: "cards",   emoji: "🃏", tag: "hype", names: ["Graded Rookie Vault", "First-Print Comic Lot", "Holo Set '99"],        price: [8000, 60000], sigma: [0.5, 0.65], mu: [0.04, 0.07], supply: [3, 10] },
  { kind: "horse",   emoji: "🐎", tag: "sport", names: ["Midnight Harmattan", "Riviera Comet", "Veld Dancer"],                 price: [160000, 480000], sigma: [0.5, 0.65], mu: [0.01, 0.03], supply: [1, 1], yld: [0.08, 0.13] },
  { kind: "yacht",   emoji: "🛥️", tag: "",    names: ["Kestrel 60m", "Aurora Borealis 72m", "Sable Queen 55m"],                price: [9000000, 24000000], sigma: [0.1, 0.14], mu: [-0.05, -0.03], supply: [1, 1], arch: "yacht" },
  { kind: "island",  emoji: "🏝️", tag: "",    names: ["Coralhaven Cay", "Pelican Atoll", "Mangrove Key"],                      price: [18000000, 42000000], sigma: [0.14, 0.2], mu: [0.04, 0.06], supply: [1, 1], yld: [0.005, 0.015] },
  { kind: "jet",     emoji: "🛩️", tag: "",    names: ["Peregrine X Long-Range Jet", "Zephyr 900 Bizjet", "Stratos Duchess"],   price: [12000000, 30000000], sigma: [0.1, 0.14], mu: [-0.05, -0.03], supply: [1, 2] },
  { kind: "sneaker", emoji: "👟", tag: "hype", names: ["Grail Run '49 Pair", "Court Kings Prototype", "Marathon Ghost Sample"], price: [4000, 40000], sigma: [0.5, 0.68], mu: [0.05, 0.08], supply: [3, 10] },
  { kind: "guitar",  emoji: "🎸", tag: "art",  names: ["The Harmattan Stratotone", "Bluesbird '58", "Stage-Burned Axe"],        price: [40000, 220000], sigma: [0.26, 0.34], mu: [0.06, 0.08], supply: [1, 2] },
  { kind: "jewel",   emoji: "💎", tag: "hype", names: ["The Aurora Diamond", "Sapphire of the Straits", "Meridian Parure"],     price: [800000, 3800000], sigma: [0.2, 0.28], mu: [0.05, 0.07], supply: [1, 1] },
  { kind: "fossil",  emoji: "🦖", tag: "art",  names: ["Tyrant King Skull", "Sea Titan Skeleton", "First Bird Slab"],           price: [700000, 2400000], sigma: [0.3, 0.4], mu: [0.05, 0.07], supply: [1, 1] },
  { kind: "cellar",  emoji: "🍾", tag: "art",  names: ["Century Champagne Vault", "Pre-War Port Cache", "Lost Vintage Cache"],  price: [90000, 380000], sigma: [0.2, 0.26], mu: [0.06, 0.09], supply: [2, 5] },
  { kind: "meteor",  emoji: "☄️", tag: "art",  names: ["The Skyfall Iron", "Vald Basin Pallasite", "Harmattan Sky-Stone"],        price: [120000, 900000], sigma: [0.25, 0.35], mu: [0.05, 0.08], supply: [1, 1], facts: r => [["Mass", (14 + Math.floor(r() * 480)) + " kg"], ["Fell", 1400 + Math.floor(r() * 600)]] },
    { kind: "manuscript", emoji: "📖", tag: "art", names: ["Illuminated Atlas Folio", "The Navigator's Codex", "Star-Chart Vellum"], price: [300000, 1800000], sigma: [0.2, 0.3], mu: [0.06, 0.08], supply: [1, 1], facts: r => [["Folios", 40 + Math.floor(r() * 300)], ["Century", (12 + Math.floor(r() * 6)) + "th"]] },
    { kind: "synth",   emoji: "🎛️", tag: "hype", names: ["Prototype Polysynth 1", "The Basement Modular", "Serial 001 Drum Machine"], price: [30000, 160000], sigma: [0.3, 0.42], mu: [0.06, 0.09], supply: [1, 2], facts: r => [["Built", 1968 + Math.floor(r() * 30)], ["Serial", "#" + (1 + Math.floor(r() * 40))]] },
    { kind: "filmreel", emoji: "🎞️", tag: "art", names: ["Lost Studio Negatives", "The Unreleased Cut", "Director's Nitrate Reels"], price: [200000, 1200000], sigma: [0.35, 0.5], mu: [0.05, 0.09], supply: [1, 1], facts: r => [["Reels", 4 + Math.floor(r() * 20)], ["Runtime", (60 + Math.floor(r() * 120)) + " min"]] },
    { kind: "globe",   emoji: "🌐", tag: "art",  names: ["Pre-Colonial Floor Globe", "The Cartographer's Pair", "Celestial & Terrestrial Set"], price: [80000, 420000], sigma: [0.2, 0.28], mu: [0.05, 0.07], supply: [1, 1], facts: r => [["Diameter", (60 + Math.floor(r() * 90)) + " cm"], ["Dated", 1500 + Math.floor(r() * 300)]] },
    { kind: "capsule", emoji: "🛰️", tag: "hype", names: ["Flown Capsule Hatch", "Booster Grid Fin", "Orbital Suit Glove"],          price: [150000, 800000], sigma: [0.3, 0.45], mu: [0.07, 0.11], supply: [1, 1], facts: r => [["Missions", 1 + Math.floor(r() * 5)], ["Orbit days", 2 + Math.floor(r() * 300)]] },
];

// ---------- helpers ----------
function wRange(rng, [a, b]) { return a + rng() * (b - a); }
function wPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function wPickN(rng, arr, n) {
  const idx = arr.map((_, i) => i), out = [];
  for (let k = 0; k < n && idx.length; k++) out.push(arr[idx.splice(Math.floor(rng() * idx.length), 1)[0]]);
  return out;
}
function tickerFrom(name, used) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "");
  for (let len = 3; len <= 5; len++) {
    const t = letters.slice(0, len);
    if (t.length >= 3 && !used.has(t)) { used.add(t); return t; }
  }
  let n = 2;
  while (used.has(letters.slice(0, 2) + n)) n++;
  const t = letters.slice(0, 2) + n; used.add(t); return t;
}
const roundPrice = p => p >= 1000 ? Math.round(p / 100) * 100 : p >= 10 ? Math.round(p * 10) / 10 : +p.toPrecision(3);
const tierFor = price => price >= 200000000 ? 3 : price >= 20000000 ? 2 : price >= 2000000 ? 1 : 0;

// band modifiers: emerging markets run hotter
const BAND_MOD = {
  developed: { mu: 0, sigma: 0,    yld: 0 },
  emerging:  { mu: 0.02, sigma: 0.05, yld: 0.01 },
  gulf:      { mu: 0.01, sigma: 0.04, yld: 0 },
  haven:     { mu: 0, sigma: -0.02, yld: -0.005 },
};

// ---------- the generator ----------
// Deterministic: one rng stream, fixed draw order. Returns { assets, byId, countries }.
function generateWorld(seed) {
  const rng = mulberry32((seed ^ 0x0A5F1523) >>> 0);
  const usedTickers = new Set();
  const usedNames = new Set();
  const assets = [];
  const era = BASE_YEAR; // in-world "present" (2067) — founded years render relative to this

  const uniqueName = make => {
    for (let i = 0; i < 24; i++) {
      const n = make();
      if (!usedNames.has(n)) { usedNames.add(n); return n; }
    }
    const n = make() + " II"; usedNames.add(n); return n;
  };

  const stockFor = (c, sectorKey, listYear, ipoIdx) => {
    const s = SECTOR_DEFS[sectorKey];
    const mod = BAND_MOD[c.band];
    // name pattern: banks read old-money, the rest mix corporate forms
    const name = uniqueName(() => {
      const stem = wPick(rng, STEMS[c.key]);
      const form = rng();
      if (sectorKey === "bank") {
        return form < 0.35 ? `First ${stem} Bank` : form < 0.6 ? `${stem} & Sons` : `${stem} ${wPick(rng, s.suffixes)}`;
      }
      if (form < 0.14) return `${stem} Group`;
      if (form < 0.24) return `${stem} Holdings`;
      return `${stem} ${wPick(rng, s.suffixes)}`;
    });
    const price = roundPrice(wRange(rng, s.price));
    const hq = wPick(rng, CITIES[c.key]);
    const employees = Math.floor(120 + rng() * rng() * 90000);
    const shares = Math.floor(4e6 + rng() * 4e8);
    return {
      id: ipoIdx != null ? `ipo_${ipoIdx}` : `${c.key}_st_${sectorKey}`,
      name, emoji: s.emoji, cat: "stocks", region: c.region, country: c.key, tag: s.tag,
      sector: s.label, ticker: tickerFrom(name, usedTickers),
      price,
      mu: +(wRange(rng, s.mu) + mod.mu).toFixed(3),
      sigma: +(wRange(rng, s.sigma) + mod.sigma).toFixed(3),
      yield: +Math.max(0, wRange(rng, s.yld) + (s.yld[1] ? mod.yld : 0)).toFixed(3),
      supply: 0, tier: 0, listYear: listYear || 0,
      founded: era - Math.floor(5 + rng() * 70),
      hq, employees, shares,
      desc: `${name} is a ${s.label.toLowerCase()} company headquartered in ${hq}, ${c.name}. ${employees.toLocaleString()} employees and a ticker everyone mispronounces.`,
    };
  };

  // 1) STOCKS — each country draws 8 distinct sectors from the pool (fixed count)
  for (const c of COUNTRIES) {
    const sectors = wPickN(rng, SECTOR_KEYS, 8);
    for (const sk of sectors) assets.push(stockFor(c, sk));
  }

  // 2) PROPERTIES — 4 fixed slots per country, limited supply
  for (const c of COUNTRIES) {
    PROPERTY_SLOTS.forEach((slot, i) => {
      const district = wPick(rng, DISTRICTS);
      const city = wPick(rng, CITIES[c.key]);
      const price = roundPrice(wRange(rng, slot.price[c.band]));
      const mod = BAND_MOD[c.band];
      assets.push({
        id: `${c.key}_re_${i}`,
        name: slot.label(district, city), emoji: slot.emoji, cat: "realestate",
        region: c.region, country: c.key, sector: "Real estate",
        price,
        mu: +(wRange(rng, [0.04, 0.09]) + mod.mu).toFixed(3),
        sigma: +(wRange(rng, slot.sigma) + mod.sigma).toFixed(3),
        yield: +(wRange(rng, slot.yld) + mod.yld).toFixed(3),
        supply: slot.kind === "landmark" ? 1 : 2 + Math.floor(rng() * 7),
        sqm: Math.floor(slot.kind === "flat" ? 55 + rng() * 90 : slot.kind === "house" ? 140 + rng() * 260 : slot.kind === "tower" ? 900 + rng() * 4200 : 1200 + rng() * 5200),
        tier: tierFor(price), listYear: 0,
        founded: era - Math.floor(2 + rng() * 60),
        desc: `${slot.kind === "flat" ? "A rental apartment block" : slot.kind === "house" ? "A gated residential development" : slot.kind === "tower" ? "A mixed-use tower" : "A one-of-one landmark estate"} in ${city}, ${c.name}. Limited units — when they're gone, they're gone.`,
      });
    });
  }

  // 3) BUSINESSES — 5 distinct kinds per country
  for (const c of COUNTRIES) {
    const kinds = wPickN(rng, BUSINESS_KINDS, 5);
    kinds.forEach((k, i) => {
      const name = uniqueName(() => `${wPick(rng, STEMS[c.key])} ${wPick(rng, k.names)}`);
      const price = roundPrice(wRange(rng, k.price));
      const mod = BAND_MOD[c.band];
      assets.push({
        id: `${c.key}_biz_${i}`,
        name, emoji: k.emoji, cat: "business", region: c.region, country: c.key,
        tag: k.tag, sector: "Private business",
        price,
        mu: +(wRange(rng, k.mu) + mod.mu).toFixed(3),
        sigma: +(wRange(rng, k.sigma) + mod.sigma).toFixed(3),
        yield: +(k.yld ? wRange(rng, k.yld) + mod.yld : 0).toFixed(3),
        supply: 1 + Math.floor(rng() * 4),
        revenue: Math.round(wRange(rng, k.price) * (0.4 + rng() * 1.1)),
        tier: tierFor(price), listYear: 0,
        founded: era - Math.floor(1 + rng() * 30),
        desc: `${name} — a private ${k.kind} business in ${c.name}. Pays out of real cashflow, priced on vibes and revenue.`,
      });
    });
  }

  // 4) CRYPTO — 12 coins from fixed archetype slots
  for (const slot of CRYPTO_SLOTS) {
    for (let i = 0; i < slot.n; i++) {
      let name;
      if (slot.arch === "stable") name = uniqueName(() => `${wPick(rng, CRYPTO_PREFIX)}USD`);
      else if (slot.arch === "meme") name = uniqueName(() => `${wPick(rng, MEME_ANIMALS)}${wPick(rng, ["Coin", "Moon", "Cash", "Inu"])}`);
      else if (slot.arch === "rug") name = uniqueName(() => `Safe${wPick(rng, ["Rug", "Vault", "Moon", "Yield"])}`);
      else name = uniqueName(() => `${wPick(rng, CRYPTO_PREFIX)}${wPick(rng, CRYPTO_SUFFIX)}`);
      const price = slot.arch === "stable" ? 1 : +wRange(rng, slot.price).toPrecision(3);
      assets.push({
        id: `cx_${slot.arch}_${i}`,
        name, emoji: slot.arch === "meme" ? wPick(rng, ["🐸", "🐶", "🦍", "🦠", "🐹"]) : slot.emoji,
        cat: "crypto", region: "global", tag: slot.tag, arch: slot.arch, sector: "Crypto",
        price,
        mu: +wRange(rng, slot.mu).toFixed(3),
        sigma: +wRange(rng, slot.sigma).toFixed(3),
        yield: +wRange(rng, slot.yld).toFixed(3),
        supply: 0, tier: 0, listYear: 0, founded: era - Math.floor(1 + rng() * 12),
        desc: slot.arch === "rug"
          ? `${name} promises safe, sustainable 4-digit yields. The developers insist everything is fine.`
          : slot.arch === "stable" ? `${name} is pegged to the dollar and pays a savings-style yield. Boring on purpose.`
          : slot.arch === "meme" ? `${name} has no product, no roadmap, and a very loud community.`
          : `${name} is a ${slot.arch} crypto asset. Traded 24/7 by people who should be asleep.`,
      });
    }
  }

  // 5) COMMODITIES — fixed slate, per-world price jitter (±12%)
  COMMODITY_SLATE.forEach((m, i) => {
    assets.push({
      id: `cm_${i}`, name: m.name, emoji: m.emoji, cat: "commodity", region: "global",
      tag: m.tag, sector: "Commodities",
      price: roundPrice(m.base * (0.88 + rng() * 0.24)),
      mu: m.mu, sigma: m.sigma, yield: 0,
      supply: 0, tier: 0, listYear: 0, founded: 0,
      desc: `${m.name.replace(/\s*\(.*\)/, "")} — priced on global markets. It does not care about your feelings.`,
    });
  });

  // 6) COLLECTIBLES — 10 fixed slots, scarce by design
  LUXURY_SLOTS.forEach((slot, i) => {
    const name = uniqueName(() => wPick(rng, slot.names));
    const price = roundPrice(wRange(rng, slot.price));
    assets.push({
      id: `lx_${slot.kind}_${i}`,
      name, emoji: slot.emoji, cat: "luxury", region: "global",
      tag: slot.tag || undefined, arch: slot.arch, sector: "Collectibles",
      price,
      mu: +wRange(rng, slot.mu).toFixed(3),
      sigma: +wRange(rng, slot.sigma).toFixed(3),
      yield: +(slot.yld ? wRange(rng, slot.yld) : 0).toFixed(3),
      supply: slot.supply ? slot.supply[0] + Math.floor(rng() * (slot.supply[1] - slot.supply[0] + 1)) : 1,
      facts: slot.facts ? slot.facts(rng) : undefined,
      tier: tierFor(price), listYear: 0, founded: 0,
      desc: slot.kind === "yacht" ? `${name}. Depreciates beautifully. The marina fees are somebody's salary.` :
            slot.kind === "island" ? `${name} — a private island. The ultimate "leave me alone" asset.` :
            `${name} — a collectible ${slot.kind}. Worth what the next person will pay, which is the whole game.`,
    });
  });

  // 6a-bis) NICHE ASSETS — the weird corners of money. Each world draws a
  //         different subset, every one carries its own generated fact sheet.
  const NICHE_RE = [
    { kind: "parking",  emoji: "🅿️", label: (st, city) => `${st} Parking Structure, ${city}`, price: [400000, 1400000], yld: [0.07, 0.11], sigma: [0.07, 0.11], facts: r => [["Bays", 180 + Math.floor(r() * 700)], ["Occupancy", (72 + Math.floor(r() * 26)) + "%"]] },
    { kind: "billboard",emoji: "🪧", label: (st, city) => `${st} Billboard Cluster, ${city}`,  price: [150000, 600000],  yld: [0.09, 0.14], sigma: [0.10, 0.16], facts: r => [["Faces", 4 + Math.floor(r() * 20)], ["Views/day", (40 + Math.floor(r() * 400)) + "K"]] },
    { kind: "datacenter",emoji: "🗄️", label: (st, city) => `${st} Data Vault, ${city}`,        price: [2500000, 9000000], yld: [0.05, 0.08], sigma: [0.12, 0.20], facts: r => [["Racks", 400 + Math.floor(r() * 4000)], ["Uptime", (99 + r()).toFixed(2) + "%"]] },
    { kind: "vfarm",    emoji: "🌿", label: (st, city) => `${st} Vertical Farm, ${city}`,      price: [900000, 3200000], yld: [0.06, 0.09], sigma: [0.12, 0.19], facts: r => [["Grow floors", 6 + Math.floor(r() * 30)], ["Output", (200 + Math.floor(r() * 1800)) + " t/yr"]] },
    { kind: "marina",   emoji: "⚓", label: (st, city) => `${st} Marina Berths, ${city}`,      price: [700000, 2600000], yld: [0.05, 0.09], sigma: [0.10, 0.15], facts: r => [["Berths", 20 + Math.floor(r() * 120)], ["Waitlist", (1 + Math.floor(r() * 9)) + " yrs"]] },
    { kind: "storage",  emoji: "📦", label: (st, city) => `${st} Storage Park, ${city}`,       price: [350000, 1200000], yld: [0.08, 0.12], sigma: [0.08, 0.12], facts: r => [["Units", 300 + Math.floor(r() * 1200)], ["Occupancy", (80 + Math.floor(r() * 18)) + "%"]] },
  ];
  const NICHE_BIZ = [
    { kind: "royalties", emoji: "🎼", name: st => `${st} Royalty Catalog`,        price: [400000, 2400000], yld: [0.09, 0.14], sigma: [0.12, 0.2], mu: [0.01, 0.03], tag: "media", facts: r => [["Tracks", 40 + Math.floor(r() * 900)], ["Streams/day", (50 + Math.floor(r() * 900)) + "K"]] },
    { kind: "patents",   emoji: "📜", name: st => `${st} Patent Portfolio`,       price: [600000, 3000000], yld: [0.04, 0.07], sigma: [0.25, 0.4], mu: [0.04, 0.08], tag: "tech",  facts: r => [["Patents", 12 + Math.floor(r() * 140)], ["Expiry", calYear(10 + Math.floor(r() * 25))]] },
    { kind: "celltowers",emoji: "🗼", name: st => `${st} Tower Network`,          price: [1800000, 6000000], yld: [0.06, 0.09], sigma: [0.09, 0.14], mu: [0.02, 0.04], tag: "telco", facts: r => [["Masts", 30 + Math.floor(r() * 400)], ["Tenancy", (1.4 + r()).toFixed(1) + "x"]] },
    { kind: "tollbridge",emoji: "🌉", name: st => `${st} Toll Crossing`,          price: [4000000, 14000000], yld: [0.07, 0.10], sigma: [0.06, 0.10], mu: [0.01, 0.03], tag: "travel", facts: r => [["Crossings/day", (18 + Math.floor(r() * 120)) + "K"], ["Concession", (20 + Math.floor(r() * 40)) + " yrs left"]] },
    { kind: "racing",    emoji: "🏁", name: st => `${st} Racing Team`,            price: [2000000, 9000000], yld: [0.005, 0.02], sigma: [0.35, 0.5], mu: [0.05, 0.09], tag: "sport", facts: r => [["Podiums", Math.floor(r() * 40)], ["Fan clubs", (10 + Math.floor(r() * 190)) + "K members"]] },
    { kind: "esports",   emoji: "🕹️", name: st => `${st} Esports Org`,            price: [800000, 3600000], yld: [0.01, 0.04], sigma: [0.4, 0.6], mu: [0.06, 0.12], tag: "media", facts: r => [["Titles", 1 + Math.floor(r() * 7)], ["Roster", 12 + Math.floor(r() * 40)]] },
    { kind: "drones",    emoji: "🛸", name: st => `${st} Drone Corridor`,         price: [1200000, 4200000], yld: [0.05, 0.08], sigma: [0.2, 0.32], mu: [0.05, 0.09], tag: "tech",  facts: r => [["Routes", 4 + Math.floor(r() * 26)], ["Deliveries/day", (5 + Math.floor(r() * 90)) + "K"]] },
    { kind: "waterco",   emoji: "🚰", name: st => `${st} Water Utility Stake`,    price: [3000000, 10000000], yld: [0.05, 0.07], sigma: [0.06, 0.10], mu: [0.02, 0.03], tag: "green", facts: r => [["Households", (40 + Math.floor(r() * 400)) + "K"], ["Pipeline", (200 + Math.floor(r() * 1800)) + " km"]] },
  ];
  // 6 niche properties + 5 niche businesses per world, countries drawn per slot
  for (const slot of wPickN(rng, NICHE_RE, 6)) {
    const c = wPick(rng, COUNTRIES);
    const city = wPick(rng, CITIES[c.key]);
    const st = wPick(rng, STEMS[c.key]);
    const price = roundPrice(wRange(rng, slot.price));
    assets.push({
      id: `nr_${slot.kind}_${c.key}`, name: slot.label(st, city), emoji: slot.emoji,
      cat: "realestate", region: c.region, country: c.key, sector: "Niche real estate",
      price, mu: +wRange(rng, [0.03, 0.06]).toFixed(3), sigma: +wRange(rng, slot.sigma).toFixed(3),
      yield: +wRange(rng, slot.yld).toFixed(3), supply: 1 + Math.floor(rng() * 3),
      tier: tierFor(price), listYear: 0, founded: era - Math.floor(1 + rng() * 25),
      facts: slot.facts(rng),
      desc: `${slot.label(st, city)} — unglamorous, cash-generating, and quietly fought over. The best kind of asset.`,
    });
  }
  for (const slot of wPickN(rng, NICHE_BIZ, 5)) {
    const c = wPick(rng, COUNTRIES);
    const st = wPick(rng, STEMS[c.key]);
    const name = uniqueName(() => slot.name(st));
    const price = roundPrice(wRange(rng, slot.price));
    assets.push({
      id: `nb_${slot.kind}_${c.key}`, name, emoji: slot.emoji,
      cat: "business", region: c.region, country: c.key, tag: slot.tag, sector: "Niche venture",
      price, mu: +wRange(rng, slot.mu).toFixed(3), sigma: +wRange(rng, slot.sigma).toFixed(3),
      yield: +wRange(rng, slot.yld).toFixed(3), supply: 1 + Math.floor(rng() * 2),
      tier: tierFor(price), listYear: 0, founded: era - Math.floor(2 + rng() * 30),
      facts: slot.facts(rng),
      desc: `${name} — a ${slot.kind === "royalties" ? "catalog that pays you every time someone hums" : slot.kind === "tollbridge" ? "bridge people literally cannot avoid paying" : "corner of the economy most investors never think about"}. Niche is where the margins hide.`,
    });
  }

  // 6b) LEGACY MEGAPROJECTS — one-of-one facilities that list from Year 35.
  //     Deliberate late-game money sinks: colossal price, thin yield, pure prestige.
  const LEGACY_SLOTS = [
    { name: "Grand Stadium",            emoji: "🏟️", price: [120e6, 300e6],  yld: [0.01, 0.02] },
    { name: "Orbital Hotel Stake",      emoji: "🛰️", price: [400e6, 900e6],  yld: [0, 0.01] },
    { name: "Fusion Research Campus",   emoji: "⚛️", price: [600e6, 1400e6], yld: [0, 0.005] },
    { name: "Desalination Megaplant",   emoji: "💧", price: [250e6, 600e6],  yld: [0.015, 0.025] },
    { name: "National Museum Wing",     emoji: "🏛️", price: [150e6, 350e6],  yld: [0, 0] },
    { name: "University Endowment",     emoji: "🎓", price: [200e6, 500e6],  yld: [0.01, 0.015] },
    { name: "Skyline District",         emoji: "🌆", price: [900e6, 2200e6], yld: [0.02, 0.03] },
    { name: "Space Elevator Consortium",emoji: "🚀", price: [1500e6, 3000e6],yld: [0, 0.01] },
  ];
  LEGACY_SLOTS.forEach((slot, i) => {
    const c = wPick(rng, COUNTRIES);
    const price = roundPrice(wRange(rng, slot.price));
    const year = 35 + Math.floor(rng() * 41); // lists somewhere in years 35-75
    assets.push({
      id: `lg_${i}`,
      name: `${slot.name} · ${c.name}`, emoji: slot.emoji, cat: "business",
      region: c.region, country: c.key, tag: "legacy", arch: "legacy", sector: "Legacy project",
      price,
      mu: +wRange(rng, [0.02, 0.04]).toFixed(3),
      sigma: +wRange(rng, [0.08, 0.14]).toFixed(3),
      yield: +wRange(rng, slot.yld).toFixed(3),
      supply: 1, tier: 3, listYear: year, founded: 0,
      desc: `${slot.name} in ${c.name} — opens to investors in ${calYear(year)}. One stake exists. It will not make you richer; it will make you remembered.`,
    });
  });

  // 7) IPO PIPELINE — ~30 future listings spread across the century.
  //    Draw order fixed; listYear sorted after generation (stable by draw index).
  const ipoCount = 55 + Math.floor(rng() * 10);
  for (let i = 0; i < ipoCount; i++) {
    const c = wPick(rng, COUNTRIES);
    const sectorKey = wPick(rng, SECTOR_KEYS);
    const year = 3 + Math.floor(rng() * 93);
    const a = stockFor(c, sectorKey, year, i);
    a.desc = `${a.name} lists in ${calYear(year)} — a ${SECTOR_DEFS[sectorKey].label.toLowerCase()} IPO out of ${c.name}. Fresh paper, fresh risk.`;
    assets.push(a);
  }

  const byId = Object.fromEntries(assets.map(a => [a.id, a]));
  return { assets, byId, countries: COUNTRIES, version: 2 };
}

// Legacy world wrapper — v2/v3 saves keep their original static catalog.
function legacyWorld() {
  const assets = ASSETS.map(a => Object.assign({ supply: 0, tier: 0, listYear: 0, country: null, sector: CATEGORIES[a.cat].name, desc: "" }, a));
  // archetype flags so achievements keep working on the old catalog
  const byId = Object.fromEntries(assets.map(a => [a.id, a]));
  if (byId.saferug) byId.saferug.arch = "rug";
  if (byId.yacht) byId.yacht.arch = "yacht";
  return { assets, byId, countries: [], version: 1 };
}
