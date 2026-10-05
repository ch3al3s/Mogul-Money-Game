// ============ MOGUL: THE MONEY RACE — DATA (v2) ============
// Prices grounded in mid-2026 real-world data:
// gold ≈ $4,150/oz · BTC ≈ $62K · ETH ≈ $1,750 · WTI ≈ $68/bbl
// Lagos avg home ≈ $200K · Monaco new-build avg ≈ €40M · Dubai avg ≈ $830K · London avg ≈ £542K
"use strict";

const START_CASH = 1000000;
const SEASON_YEARS = 100;   // v4: a full century — the BitLife arc
const START_AGE = 18;       // v4: you enter the race fresh out of school
const BASE_YEAR = 2067;     // v5: every season starts in 2067, for everyone
const calYear = y => BASE_YEAR + y;
// realm split: liquid paper trades in the Market, ownable things live in Assets
const MARKET_CATS = ["stocks", "crypto", "commodity"];
const ESTATE_CATS = ["realestate", "business", "luxury"];
// Net-worth gates for asset tiers (worldgen assigns tier by price)
const TIER_REQ = { 1: 5000000, 2: 50000000, 3: 250000000 };
// v10: the bank — leverage cuts both ways
const LOAN_RATE = 0.08;        // interest compounds each simulated year
const LOAN_LTV = 0.5;          // borrow up to 50% of net worth
const MARGIN_CALL_AT = 0.65;   // debt > 65% of gross assets → forced liquidation
const FIRE_SALE_HAIRCUT = 0.97;// margin-call sales fill 3% under market

// v10: season missions — seeded, shared with challenge rivals, no login traps
const MISSIONS = [
  { key: "props3",   text: "Own 3 properties at once",              reward: 80000,  check: st => st.props >= 3 },
  { key: "biz2",     text: "Run 2 private businesses at once",      reward: 80000,  check: st => st.biz >= 2 },
  { key: "crypto100",text: "Hold $100K+ of crypto at once",         reward: 60000,  check: st => st.cryptoVal >= 100000 },
  { key: "income50", text: "Build $50K/yr of yield income",         reward: 90000,  check: st => st.income >= 50000 },
  { key: "cats5",    text: "Hold 5 asset classes at once",          reward: 100000, check: st => st.cats >= 5 },
  { key: "country5", text: "Own assets in 5 countries",             reward: 100000, check: st => st.countries >= 5 },
  { key: "invested90",text: "Be at least 90% invested",             reward: 70000,  check: st => st.investedPct >= 0.9 },
  { key: "nw3m",     text: "Reach $3M net worth",                   reward: 120000, check: st => st.nw >= 3000000 },
  { key: "nw10m",    text: "Reach $10M net worth",                  reward: 250000, check: st => st.nw >= 10000000 },
  { key: "lux3",     text: "Own 3 collectibles at once",            reward: 90000,  check: st => st.lux >= 3 },
  { key: "casino50", text: "Be up $50K+ lifetime at the casino",    reward: 80000,  check: st => st.casinoNet >= 50000 },
  { key: "diamond",  text: "Survive a losing year without selling", reward: 110000, check: st => st.diamondHands },
];
const TIER_LABEL = { 1: "Private deals · unlocks at $5M net worth", 2: "Ultra assets · unlocks at $50M net worth", 3: "Legacy projects · unlocks at $250M net worth" };

const CATEGORIES = {
  realestate: { name: "Real Estate", emoji: "🏠" },
  stocks:     { name: "Stocks",      emoji: "📈" },
  crypto:     { name: "Crypto",      emoji: "🪙" },
  commodity:  { name: "Commodities", emoji: "⛏️" },
  business:   { name: "Businesses",  emoji: "💼" },
  luxury:     { name: "Collectibles",emoji: "💎" },
};

const REGION_NAMES = {
  nigeria: "Nigeria", africa: "Africa", monaco: "Monaco", europe: "Europe", uk: "UK",
  us: "USA", asia: "Asia", mideast: "Middle East", latam: "Latin America", oceania: "Oceania", global: "Global",
};

// mu = expected annual return · sigma = volatility · yield = annual cash income
const ASSETS = [
  // ================= REAL ESTATE (30) =================
  { id: "lagos_mainland", name: "Lagos Mainland Flat",     emoji: "🏢", cat: "realestate", region: "nigeria", price: 48000,    mu: 0.10, sigma: 0.15, yield: 0.08 },
  { id: "lekki_apt",      name: "Lekki Apartment",         emoji: "🌇", cat: "realestate", region: "nigeria", price: 125000,   mu: 0.11, sigma: 0.17, yield: 0.07 },
  { id: "ikoyi_luxe",     name: "Ikoyi Luxury Flat",       emoji: "🏙️", cat: "realestate", region: "nigeria", price: 380000,   mu: 0.10, sigma: 0.16, yield: 0.06 },
  { id: "banana_island",  name: "Banana Island Mansion",   emoji: "🏰", cat: "realestate", region: "nigeria", price: 2600000,  mu: 0.09, sigma: 0.18, yield: 0.04 },
  { id: "abuja_estate",   name: "Abuja Gated Estate Home", emoji: "🏡", cat: "realestate", region: "nigeria", price: 210000,   mu: 0.09, sigma: 0.14, yield: 0.06 },
  { id: "monaco_studio",  name: "Monaco Studio",           emoji: "🇲🇨", cat: "realestate", region: "monaco",  price: 2500000,  mu: 0.06, sigma: 0.09, yield: 0.02 },
  { id: "monaco_2bed",    name: "Monte Carlo 2-Bed",       emoji: "🌆", cat: "realestate", region: "monaco",  price: 6200000,  mu: 0.06, sigma: 0.10, yield: 0.02 },
  { id: "monaco_pent",    name: "Monaco Sea-View Penthouse",emoji: "🛗", cat: "realestate", region: "monaco", price: 42000000, mu: 0.07, sigma: 0.12, yield: 0.015 },
  { id: "dubai_apt",      name: "Dubai Marina Apartment",  emoji: "🌃", cat: "realestate", region: "mideast", price: 420000,   mu: 0.08, sigma: 0.19, yield: 0.06 },
  { id: "dubai_villa",    name: "Palm Jumeirah Villa",     emoji: "🌴", cat: "realestate", region: "mideast", price: 3600000,  mu: 0.08, sigma: 0.21, yield: 0.04 },
  { id: "dubai_pent",     name: "Downtown Dubai Penthouse",emoji: "🕌", cat: "realestate", region: "mideast", price: 8200000,  mu: 0.07, sigma: 0.20, yield: 0.03 },
  { id: "london_flat",    name: "London Zone-2 Flat",      emoji: "🇬🇧", cat: "realestate", region: "uk",      price: 545000,   mu: 0.05, sigma: 0.11, yield: 0.04 },
  { id: "mayfair_house",  name: "Mayfair Townhouse",       emoji: "🎩", cat: "realestate", region: "uk",      price: 8500000,  mu: 0.05, sigma: 0.12, yield: 0.02 },
  { id: "manchester_brr", name: "Manchester Buy-to-Let",   emoji: "🧱", cat: "realestate", region: "uk",      price: 240000,   mu: 0.05, sigma: 0.10, yield: 0.06 },
  { id: "nyc_condo",      name: "Brooklyn Condo",          emoji: "🗽", cat: "realestate", region: "us",      price: 1150000,  mu: 0.06, sigma: 0.12, yield: 0.035 },
  { id: "manhattan_pent", name: "Manhattan Penthouse",     emoji: "🏦", cat: "realestate", region: "us",      price: 16500000, mu: 0.06, sigma: 0.13, yield: 0.02 },
  { id: "miami_condo",    name: "Miami Beach Condo",       emoji: "🏖️", cat: "realestate", region: "us",      price: 680000,   mu: 0.07, sigma: 0.16, yield: 0.05 },
  { id: "tokyo_apt",      name: "Tokyo Shibuya Apartment", emoji: "🗼", cat: "realestate", region: "asia",    price: 460000,   mu: 0.04, sigma: 0.09, yield: 0.04 },
  { id: "singapore_condo",name: "Singapore Condo",         emoji: "🇸🇬", cat: "realestate", region: "asia",    price: 1850000,  mu: 0.05, sigma: 0.10, yield: 0.03 },
  { id: "mumbai_apt",     name: "Mumbai High-Rise Flat",   emoji: "🇮🇳", cat: "realestate", region: "asia",    price: 260000,   mu: 0.09, sigma: 0.16, yield: 0.03 },
  { id: "bali_villa",     name: "Bali Pool Villa",         emoji: "🏝️", cat: "realestate", region: "asia",    price: 360000,   mu: 0.08, sigma: 0.22, yield: 0.10 },
  { id: "bangkok_condo",  name: "Bangkok Condo",           emoji: "🛺", cat: "realestate", region: "asia",    price: 185000,   mu: 0.05, sigma: 0.13, yield: 0.05 },
  { id: "paris_apt",      name: "Paris Haussmann Apartment",emoji: "🥐", cat: "realestate", region: "europe", price: 720000,   mu: 0.04, sigma: 0.10, yield: 0.03 },
  { id: "lisbon_apt",     name: "Lisbon Alfama Apartment", emoji: "🚋", cat: "realestate", region: "europe",  price: 490000,   mu: 0.06, sigma: 0.13, yield: 0.04 },
  { id: "berlin_apt",     name: "Berlin Altbau Apartment", emoji: "🇩🇪", cat: "realestate", region: "europe",  price: 560000,   mu: 0.04, sigma: 0.11, yield: 0.03 },
  { id: "swiss_chalet",   name: "Swiss Alpine Chalet",     emoji: "🏔️", cat: "realestate", region: "europe",  price: 3100000,  mu: 0.05, sigma: 0.10, yield: 0.03 },
  { id: "santorini_villa",name: "Santorini Cliff Villa",   emoji: "🇬🇷", cat: "realestate", region: "europe",  price: 950000,   mu: 0.07, sigma: 0.18, yield: 0.08 },
  { id: "nairobi_apt",    name: "Nairobi Westlands Flat",  emoji: "🦒", cat: "realestate", region: "africa",  price: 155000,   mu: 0.08, sigma: 0.15, yield: 0.07 },
  { id: "capetown_villa", name: "Cape Town Sea-Point Villa",emoji: "⛰️", cat: "realestate", region: "africa", price: 750000,   mu: 0.06, sigma: 0.15, yield: 0.05 },
  { id: "sydney_house",   name: "Sydney Harbour House",    emoji: "🇦🇺", cat: "realestate", region: "oceania", price: 1950000,  mu: 0.06, sigma: 0.12, yield: 0.03 },

  // ================= STOCKS (28) =================
  { id: "pear",      name: "Pear Inc",            emoji: "🍐", cat: "stocks", region: "us",     tag: "tech",     price: 212,   mu: 0.11, sigma: 0.25, yield: 0.005 },
  { id: "macrohard", name: "MacroHard",           emoji: "🪟", cat: "stocks", region: "us",     tag: "tech",     price: 468,   mu: 0.11, sigma: 0.22, yield: 0.008 },
  { id: "rainforest",name: "Rainforest Retail",   emoji: "📦", cat: "stocks", region: "us",     tag: "tech",     price: 205,   mu: 0.10, sigma: 0.27, yield: 0 },
  { id: "nexchip",   name: "NexChip Semiconductors",emoji: "🔬", cat: "stocks", region: "asia", tag: "ai",       price: 148,   mu: 0.15, sigma: 0.42, yield: 0.004 },
  { id: "neuraldyne",name: "NeuralDyne AI",       emoji: "🧠", cat: "stocks", region: "us",     tag: "ai",       price: 96,    mu: 0.16, sigma: 0.52, yield: 0 },
  { id: "cloudnine", name: "CloudNine Systems",   emoji: "☁️", cat: "stocks", region: "us",     tag: "tech",     price: 310,   mu: 0.12, sigma: 0.30, yield: 0 },
  { id: "tessler",   name: "Tessler Motors",      emoji: "⚡", cat: "stocks", region: "us",     tag: "ev",       price: 274,   mu: 0.12, sigma: 0.48, yield: 0 },
  { id: "voltwagen", name: "VoltWagen Group",     emoji: "🚙", cat: "stocks", region: "europe", tag: "ev",       price: 118,   mu: 0.07, sigma: 0.26, yield: 0.05 },
  { id: "petrogiant",name: "PetroGiant Energy",   emoji: "🛢️", cat: "stocks", region: "us",     tag: "oil",      price: 88,    mu: 0.06, sigma: 0.24, yield: 0.06 },
  { id: "solarax",   name: "SolaraX Renewables",  emoji: "☀️", cat: "stocks", region: "europe", tag: "green",    price: 42,    mu: 0.10, sigma: 0.38, yield: 0 },
  { id: "globank",   name: "GloboBank",           emoji: "🏦", cat: "stocks", region: "uk",     tag: "bank",     price: 101,   mu: 0.07, sigma: 0.19, yield: 0.05 },
  { id: "firstnaira",name: "FirstNaira Bank",     emoji: "🪙", cat: "stocks", region: "nigeria",tag: "bank",     price: 14,    mu: 0.12, sigma: 0.28, yield: 0.07 },
  { id: "pharmaplus",name: "PharmaPlus",          emoji: "💊", cat: "stocks", region: "europe", tag: "pharma",   price: 164,   mu: 0.08, sigma: 0.20, yield: 0.02 },
  { id: "genesys",   name: "GeneSys Biotech",     emoji: "🧬", cat: "stocks", region: "us",     tag: "pharma",   price: 58,    mu: 0.12, sigma: 0.55, yield: 0 },
  { id: "fizzco",    name: "FizzCo Beverages",    emoji: "🥤", cat: "stocks", region: "us",     tag: "consumer", price: 71,    mu: 0.07, sigma: 0.14, yield: 0.03 },
  { id: "burgerbaron",name: "Burger Baron",       emoji: "🍔", cat: "stocks", region: "us",     tag: "consumer", price: 260,   mu: 0.08, sigma: 0.16, yield: 0.022 },
  { id: "megamart",  name: "MegaMart Stores",     emoji: "🛒", cat: "stocks", region: "us",     tag: "consumer", price: 92,    mu: 0.07, sigma: 0.15, yield: 0.015 },
  { id: "luxebrand", name: "LuxeBrand Group",     emoji: "👜", cat: "stocks", region: "europe", tag: "luxurybrand", price: 545, mu: 0.09, sigma: 0.22, yield: 0.015 },
  { id: "airafrica", name: "Air Africa",          emoji: "✈️", cat: "stocks", region: "africa", tag: "travel",   price: 34,    mu: 0.08, sigma: 0.32, yield: 0.01 },
  { id: "transpac",  name: "TransPacific Airlines",emoji: "🛫", cat: "stocks", region: "asia",  tag: "travel",   price: 47,    mu: 0.06, sigma: 0.30, yield: 0.012 },
  { id: "aegisworks",name: "AegisWorks Defense",  emoji: "🛡️", cat: "stocks", region: "us",     tag: "defense",  price: 385,   mu: 0.09, sigma: 0.22, yield: 0.02 },
  { id: "deeprock",  name: "DeepRock Mining",     emoji: "⛏️", cat: "stocks", region: "africa", tag: "mining",   price: 52,    mu: 0.07, sigma: 0.30, yield: 0.04 },
  { id: "streamflix",name: "StreamFlix",          emoji: "🎬", cat: "stocks", region: "us",     tag: "media",    price: 720,   mu: 0.09, sigma: 0.30, yield: 0 },
  { id: "talktalk",  name: "TalkTalk Global",     emoji: "📡", cat: "stocks", region: "global", tag: "telco",    price: 28,    mu: 0.05, sigma: 0.14, yield: 0.06 },
  { id: "gamestonk", name: "GameStonk",           emoji: "🕹️", cat: "stocks", region: "us",     tag: "meme",     price: 22,    mu: 0.02, sigma: 0.95, yield: 0 },
  { id: "orbitalx",  name: "OrbitalX Space",      emoji: "🚀", cat: "stocks", region: "us",     tag: "space",    price: 133,   mu: 0.13, sigma: 0.55, yield: 0 },
  { id: "towerreit", name: "Tower REIT",          emoji: "🏗️", cat: "stocks", region: "global", tag: "reit",     price: 64,    mu: 0.06, sigma: 0.16, yield: 0.055 },
  { id: "agrigrow",  name: "AgriGrow Corp",       emoji: "🌾", cat: "stocks", region: "latam",  tag: "agri",     price: 39,    mu: 0.06, sigma: 0.20, yield: 0.03 },

  // ================= CRYPTO (16) =================
  { id: "bitcorn",   name: "Bitcorn",         emoji: "🌽", cat: "crypto", tag: "bluechip", price: 62000,  mu: 0.20, sigma: 0.65, yield: 0 },
  { id: "ethereal",  name: "Ethereal",        emoji: "🔮", cat: "crypto", tag: "bluechip", price: 1750,   mu: 0.18, sigma: 0.75, yield: 0.03 },
  { id: "solunar",   name: "Solunar",         emoji: "🌙", cat: "crypto", tag: "alt",      price: 92,     mu: 0.20, sigma: 0.95, yield: 0.06 },
  { id: "stableusd", name: "StableUSD",       emoji: "💵", cat: "crypto", tag: "stable",   price: 1.0,    mu: 0.005, sigma: 0.008, yield: 0.045 },
  { id: "oraclenet", name: "OracleNet",       emoji: "🔗", cat: "crypto", tag: "alt",      price: 11.4,   mu: 0.14, sigma: 0.85, yield: 0.02 },
  { id: "zeroknight",name: "ZeroKnight",      emoji: "🥷", cat: "crypto", tag: "alt",      price: 156,    mu: 0.12, sigma: 0.90, yield: 0 },
  { id: "metaland",  name: "MetaLand",        emoji: "🕶️", cat: "crypto", tag: "alt",      price: 0.85,   mu: 0.08, sigma: 1.10, yield: 0 },
  { id: "greencoin", name: "GreenCoin",       emoji: "🌱", cat: "crypto", tag: "alt",      price: 2.3,    mu: 0.10, sigma: 0.80, yield: 0.03 },
  { id: "quantum",   name: "QuantumCash",     emoji: "⚛️", cat: "crypto", tag: "alt",      price: 38,     mu: 0.15, sigma: 1.00, yield: 0 },
  { id: "dogemoon",  name: "DogeMoon",        emoji: "🐶", cat: "crypto", tag: "meme",     price: 0.081,  mu: 0.08, sigma: 1.45, yield: 0 },
  { id: "frogcash",  name: "FrogCash",        emoji: "🐸", cat: "crypto", tag: "meme",     price: 0.0016, mu: 0.05, sigma: 1.85, yield: 0 },
  { id: "micropepe", name: "MicroPepe",       emoji: "🦠", cat: "crypto", tag: "meme",     price: 0.00002,mu: 0.02, sigma: 2.30, yield: 0 },
  { id: "saferug",   name: "SafeRug",         emoji: "🧻", cat: "crypto", tag: "rug",      price: 0.004,  mu: -0.15, sigma: 2.40, yield: 0 },
  { id: "apechain",  name: "ApeChain",        emoji: "🦍", cat: "crypto", tag: "meme",     price: 1.15,   mu: 0.06, sigma: 1.30, yield: 0 },
  { id: "pixelpunks",name: "PixelPunks Index",emoji: "🖼️", cat: "crypto", tag: "nft",      price: 48000,  mu: 0.05, sigma: 1.20, yield: 0 },
  { id: "casinocoin",name: "CasinoCoin",      emoji: "🎲", cat: "crypto", tag: "meme",     price: 0.42,   mu: 0.04, sigma: 1.40, yield: 0.08 },

  // ================= COMMODITIES (14) =================
  { id: "gold",     name: "Gold (oz)",           emoji: "🥇", cat: "commodity", tag: "safehaven", price: 4150,  mu: 0.06, sigma: 0.14, yield: 0 },
  { id: "silver",   name: "Silver (oz)",         emoji: "🥈", cat: "commodity", tag: "safehaven", price: 46,    mu: 0.06, sigma: 0.22, yield: 0 },
  { id: "platinum", name: "Platinum (oz)",       emoji: "⚪", cat: "commodity", tag: "safehaven", price: 1120,  mu: 0.05, sigma: 0.20, yield: 0 },
  { id: "oil",      name: "Crude Oil (bbl)",     emoji: "🛢️", cat: "commodity", tag: "oil",       price: 68,    mu: 0.03, sigma: 0.32, yield: 0 },
  { id: "natgas",   name: "Natural Gas (MMBtu)", emoji: "🔥", cat: "commodity", tag: "oil",       price: 3.4,   mu: 0.03, sigma: 0.45, yield: 0 },
  { id: "copper",   name: "Copper (ton)",        emoji: "🟠", cat: "commodity", tag: "industrial",price: 10400, mu: 0.05, sigma: 0.24, yield: 0 },
  { id: "lithium",  name: "Lithium (ton)",       emoji: "🔋", cat: "commodity", tag: "ev",        price: 12800, mu: 0.07, sigma: 0.42, yield: 0 },
  { id: "uranium",  name: "Uranium (lb)",        emoji: "☢️", cat: "commodity", tag: "energy",    price: 84,    mu: 0.08, sigma: 0.35, yield: 0 },
  { id: "wheat",    name: "Wheat (ton)",         emoji: "🌾", cat: "commodity", tag: "crops",     price: 245,   mu: 0.03, sigma: 0.26, yield: 0 },
  { id: "coffee",   name: "Coffee (ton)",        emoji: "☕", cat: "commodity", tag: "crops",     price: 5300,  mu: 0.04, sigma: 0.30, yield: 0 },
  { id: "cocoa",    name: "Cocoa (ton)",         emoji: "🍫", cat: "commodity", tag: "crops", region: "africa", price: 8400, mu: 0.04, sigma: 0.34, yield: 0 },
  { id: "sugar",    name: "Sugar (ton)",         emoji: "🍬", cat: "commodity", tag: "crops",     price: 540,   mu: 0.03, sigma: 0.24, yield: 0 },
  { id: "rareearth",name: "Rare Earths Index",   emoji: "🧲", cat: "commodity", tag: "industrial",price: 1900,  mu: 0.08, sigma: 0.38, yield: 0 },
  { id: "diamonds", name: "Diamonds (carat)",    emoji: "💠", cat: "commodity", tag: "safehaven", price: 1350,  mu: 0.02, sigma: 0.18, yield: 0 },

  // ================= BUSINESSES (19) =================
  { id: "carwash",    name: "Neighborhood Car Wash",  emoji: "🚗", cat: "business", region: "us",      price: 88000,    mu: 0.03, sigma: 0.10, yield: 0.16 },
  { id: "suyatruck",  name: "Lagos Suya Truck",       emoji: "🍢", cat: "business", region: "nigeria", price: 58000,    mu: 0.04, sigma: 0.15, yield: 0.20 },
  { id: "danfo",      name: "Danfo Minibus Fleet",    emoji: "🚌", cat: "business", region: "nigeria", price: 26000,    mu: 0.02, sigma: 0.18, yield: 0.24 },
  { id: "lagostech",  name: "Lagos Fintech Startup",  emoji: "📱", cat: "business", region: "nigeria", tag: "tech", price: 160000, mu: 0.18, sigma: 0.75, yield: 0 },
  { id: "nightclub",  name: "Berlin Nightclub",       emoji: "🪩", cat: "business", region: "europe",  tag: "nightlife", price: 540000, mu: 0.04, sigma: 0.30, yield: 0.13 },
  { id: "footy",      name: "Championship Football Club", emoji: "⚽", cat: "business", region: "uk",  tag: "sport",  price: 52000000, mu: 0.07, sigma: 0.26, yield: 0.015 },
  { id: "jetcharter", name: "Private Jet Charter Co", emoji: "🛩️", cat: "business", region: "mideast", tag: "travel", price: 5400000,  mu: 0.04, sigma: 0.22, yield: 0.09 },
  { id: "surfschool", name: "Bali Surf School",       emoji: "🏄", cat: "business", region: "asia",    tag: "travel", price: 92000,    mu: 0.05, sigma: 0.24, yield: 0.15 },
  { id: "goldmine",   name: "Ghana Gold Mine Stake",  emoji: "⛏️", cat: "business", region: "africa",  tag: "mining", price: 2500000,  mu: 0.06, sigma: 0.35, yield: 0.08 },
  { id: "coffeefarm", name: "Kenyan Coffee Farm",     emoji: "🌄", cat: "business", region: "africa",  tag: "crops",  price: 190000,   mu: 0.05, sigma: 0.24, yield: 0.11 },
  { id: "ecombrand",  name: "E-Commerce Brand",       emoji: "🛍️", cat: "business", region: "global",  tag: "tech",   price: 340000,   mu: 0.09, sigma: 0.40, yield: 0.07 },
  { id: "creatoragency",name: "Creator Talent Agency",emoji: "🎥", cat: "business", region: "us",      tag: "media",  price: 230000,   mu: 0.10, sigma: 0.45, yield: 0.06 },
  { id: "padelclub",  name: "Padel Club",             emoji: "🎾", cat: "business", region: "europe",  tag: "sport",  price: 410000,   mu: 0.07, sigma: 0.28, yield: 0.10 },
  { id: "solarfarm",  name: "Solar Farm",             emoji: "🔆", cat: "business", region: "africa",  tag: "green",  price: 1850000,  mu: 0.04, sigma: 0.14, yield: 0.09 },
  { id: "macaustake", name: "Macau Casino Stake",     emoji: "🎰", cat: "business", region: "asia",    tag: "nightlife", price: 12500000, mu: 0.06, sigma: 0.30, yield: 0.06 },
  { id: "dealership", name: "Luxury Car Dealership",  emoji: "🏎️", cat: "business", region: "mideast", tag: "consumer", price: 980000, mu: 0.05, sigma: 0.25, yield: 0.10 },
  { id: "cattleranch",name: "Argentine Cattle Ranch", emoji: "🐂", cat: "business", region: "latam",   tag: "agri",   price: 1450000,  mu: 0.05, sigma: 0.20, yield: 0.07 },
  { id: "arcade",     name: "Retro Arcade Bar",       emoji: "👾", cat: "business", region: "us",      tag: "nightlife", price: 135000, mu: 0.04, sigma: 0.22, yield: 0.14 },
  { id: "cocoaplant",  name: "Ghana Cocoa Plantation", emoji: "🌳", cat: "business", region: "africa", tag: "crops",  price: 330000,   mu: 0.05, sigma: 0.26, yield: 0.10 },

  // ================= COLLECTIBLES / LUXURY (15) =================
  { id: "sneakers",  name: "Grail Sneaker Collection", emoji: "👟", cat: "luxury", tag: "hype",  price: 2400,     mu: 0.06, sigma: 0.55, yield: 0 },
  { id: "rolex",     name: "Rolex Daytona",            emoji: "⌚", cat: "luxury", tag: "hype",  price: 46000,    mu: 0.07, sigma: 0.28, yield: 0 },
  { id: "patek",     name: "Patek Grand Complication", emoji: "🕰️", cat: "luxury", tag: "hype",  price: 380000,   mu: 0.07, sigma: 0.25, yield: 0 },
  { id: "modernart", name: "Modern Art Piece",         emoji: "🎨", cat: "luxury", tag: "art",   price: 320000,   mu: 0.08, sigma: 0.42, yield: 0 },
  { id: "streetart", name: "Street Art Original",      emoji: "🖌️", cat: "luxury", tag: "art",   price: 880000,   mu: 0.09, sigma: 0.50, yield: 0 },
  { id: "vintagecar", name: "Vintage 60s Supercar",    emoji: "🚗", cat: "luxury", tag: "art",   price: 1650000,  mu: 0.08, sigma: 0.30, yield: 0 },
  { id: "hypercar",  name: "Limited Hypercar",         emoji: "🏎️", cat: "luxury", tag: "hype",  price: 3900000,  mu: 0.07, sigma: 0.28, yield: 0 },
  { id: "yacht",     name: "60m Superyacht",           emoji: "🛥️", cat: "luxury", price: 13000000, mu: -0.04, sigma: 0.12, yield: 0 },
  { id: "island",    name: "Private Caribbean Island", emoji: "🏝️", cat: "luxury", price: 26000000, mu: 0.05, sigma: 0.18, yield: 0.01 },
  { id: "racehorse", name: "Thoroughbred Racehorse",   emoji: "🐎", cat: "luxury", tag: "sport", price: 270000,   mu: 0.02, sigma: 0.60, yield: 0.11 },
  { id: "guitar",    name: "Rock Legend's Guitar",     emoji: "🎸", cat: "luxury", tag: "art",   price: 88000,    mu: 0.06, sigma: 0.28, yield: 0 },
  { id: "winecellar",name: "Fine Wine Cellar",         emoji: "🍷", cat: "luxury", tag: "art",   price: 125000,   mu: 0.07, sigma: 0.20, yield: 0 },
  { id: "whiskycask",name: "Rare Whisky Cask",         emoji: "🥃", cat: "luxury", tag: "art",   price: 47000,    mu: 0.08, sigma: 0.25, yield: 0 },
  { id: "cards",     name: "Graded Card Collection",   emoji: "🃏", cat: "luxury", tag: "hype",  price: 16000,    mu: 0.05, sigma: 0.60, yield: 0 },
  { id: "fossil",    name: "T-Rex Skull Fossil",       emoji: "🦖", cat: "luxury", tag: "art",   price: 1250000,  mu: 0.06, sigma: 0.35, yield: 0 },
];

// ============ MACRO REGIMES ============
// Each year the world is in a regime; regimes shift category expected returns and persist.
const REGIMES = {
  expansion:   { name: "Steady Expansion", emoji: "🌤️", desc: "Calm growth. Markets drift upward.",
    adj: { realestate: 0.01, stocks: 0.02, crypto: 0.02, commodity: 0, business: 0.01, luxury: 0.01 } },
  boom:        { name: "Global Boom", emoji: "🚀", desc: "Money is everywhere. Risk assets rip.",
    adj: { realestate: 0.05, stocks: 0.09, crypto: 0.25, commodity: 0.04, business: 0.05, luxury: 0.08 } },
  recession:   { name: "Recession", emoji: "🌧️", desc: "Belts tighten. Almost everything struggles.",
    adj: { realestate: -0.07, stocks: -0.11, crypto: -0.25, commodity: -0.04, business: -0.06, luxury: -0.10 } },
  stagflation: { name: "Stagflation", emoji: "🔥", desc: "Prices up, growth down. Hard assets shine.",
    adj: { realestate: 0.01, stocks: -0.06, crypto: -0.05, commodity: 0.12, business: -0.02, luxury: 0.02 } },
  recovery:    { name: "Recovery Rally", emoji: "🌱", desc: "The bounce-back. Beaten-down assets rebound.",
    adj: { realestate: 0.03, stocks: 0.06, crypto: 0.15, commodity: 0.02, business: 0.04, luxury: 0.04 } },
};
// Transition probabilities (rows sum to 1)
const REGIME_FLOW = {
  expansion:   [["expansion", 0.45], ["boom", 0.22], ["recession", 0.15], ["stagflation", 0.10], ["recovery", 0.08]],
  boom:        [["boom", 0.35], ["expansion", 0.25], ["recession", 0.25], ["stagflation", 0.15]],
  recession:   [["recovery", 0.40], ["recession", 0.30], ["stagflation", 0.20], ["expansion", 0.10]],
  stagflation: [["stagflation", 0.30], ["recession", 0.25], ["recovery", 0.25], ["expansion", 0.20]],
  recovery:    [["expansion", 0.40], ["boom", 0.30], ["recovery", 0.20], ["recession", 0.10]],
};

// ============ EVENTS ============
// match: { all | cats:[] | region | tag } · min/max extra return · optional `also` side-effect
const EVENTS = [
  // --- tech / AI / innovation ---
  { text: "AI breakthrough stuns the world — tech valuations explode", match: { tag: "ai" }, min: 0.35, max: 1.20, also: { tag: "tech", min: 0.10, max: 0.40 } },
  { text: "Big Tech antitrust crackdown — regulators break up the giants", match: { tag: "tech" }, min: -0.30, max: -0.12 },
  { text: "Chip shortage returns — semiconductor prices spike", match: { tag: "ai" }, min: 0.20, max: 0.60, also: { tag: "industrial", min: 0.05, max: 0.20 } },
  { text: "A cyberattack takes down major clouds for weeks", match: { tag: "tech" }, min: -0.25, max: -0.08, also: { tag: "defense", min: 0.10, max: 0.30 } },
  { text: "Space race heats up — orbital stocks lift off", match: { tag: "space" }, min: 0.30, max: 1.00 },
  { text: "Streaming wars end in a bloodbath of price cuts", match: { tag: "media" }, min: -0.30, max: -0.10 },
  { text: "A viral gadget cycle sends consumer tech soaring", match: { tag: "tech" }, min: 0.15, max: 0.45 },

  // --- crypto ---
  { text: "CRYPTO SUPERCYCLE — institutions pile in", match: { cats: ["crypto"] }, min: 0.45, max: 1.70 },
  { text: "Crypto winter — exchanges freeze withdrawals", match: { cats: ["crypto"] }, min: -0.60, max: -0.30 },
  { text: "Rugpull season claims another victim", match: { tag: "rug" }, min: -0.95, max: -0.70 },
  { text: "A dog-themed meme goes planetary — meme coins erupt", match: { tag: "meme" }, min: 0.80, max: 3.80 },
  { text: "Major nation adopts crypto as legal tender", match: { tag: "bluechip" }, min: 0.30, max: 0.90 },
  { text: "Stablecoin passes its stress test — DeFi yields climb", match: { tag: "stable" }, min: 0.01, max: 0.03, also: { tag: "alt", min: 0.10, max: 0.35 } },
  { text: "NFT revival nobody saw coming", match: { tag: "nft" }, min: 0.50, max: 2.00 },
  { text: "Quantum computing scare rattles crypto security", match: { cats: ["crypto"] }, min: -0.35, max: -0.10, also: { tag: "alt", min: -0.20, max: -0.05 } },

  // --- regions ---
  { text: "Nigerian tech boom — Lagos startups mint millionaires", match: { region: "nigeria" }, min: 0.20, max: 0.60 },
  { text: "Naira devaluation shakes Nigerian markets", match: { region: "nigeria" }, min: -0.30, max: -0.10 },
  { text: "Monaco Grand Prix decade deal — Riviera prices hit records", match: { region: "monaco" }, min: 0.12, max: 0.35 },
  { text: "Gulf sovereign funds go on a spending spree", match: { region: "mideast" }, min: 0.15, max: 0.40 },
  { text: "Dubai property glut — cranes stop on the skyline", match: { region: "mideast" }, min: -0.30, max: -0.12 },
  { text: "London regains its crown as finance capital", match: { region: "uk" }, min: 0.10, max: 0.30 },
  { text: "UK property tax shock hits landlords", match: { region: "uk" }, min: -0.20, max: -0.08 },
  { text: "US consumer goes on a historic spending binge", match: { region: "us" }, min: 0.08, max: 0.25 },
  { text: "Asian export engine roars — record trade surpluses", match: { region: "asia" }, min: 0.10, max: 0.30 },
  { text: "African infrastructure mega-fund breaks ground", match: { region: "africa" }, min: 0.15, max: 0.40, also: { region: "nigeria", min: 0.10, max: 0.30 } },
  { text: "European energy crunch — heating bills triple", match: { region: "europe" }, min: -0.15, max: -0.05, also: { tag: "oil", min: 0.20, max: 0.50 } },
  { text: "Latin American harvest smashes records", match: { region: "latam" }, min: 0.10, max: 0.30, also: { tag: "crops", min: -0.20, max: -0.08 } },
  { text: "Oceania mining royalties windfall", match: { region: "oceania" }, min: 0.08, max: 0.25, also: { tag: "mining", min: 0.10, max: 0.35 } },

  // --- real estate / rates ---
  { text: "Central banks slash rates — cheap money floods property", match: { cats: ["realestate"] }, min: 0.10, max: 0.30, also: { cats: ["stocks"], min: 0.05, max: 0.18 } },
  { text: "Rate shock — mortgages bite and housing corrects", match: { cats: ["realestate"] }, min: -0.25, max: -0.10 },
  { text: "Remote-work reversal packs city centers again", match: { cats: ["realestate"] }, min: 0.06, max: 0.20 },
  { text: "Short-term rental crackdown in tourist hotspots", match: { region: "europe" }, min: -0.12, max: -0.04, also: { region: "asia", min: -0.10, max: -0.03 } },

  // --- commodities / energy ---
  { text: "OIL SHOCK — supply cut sends crude vertical", match: { tag: "oil" }, min: 0.35, max: 0.90, also: { tag: "travel", min: -0.30, max: -0.12 } },
  { text: "Energy glut — crude collapses", match: { tag: "oil" }, min: -0.40, max: -0.18, also: { tag: "travel", min: 0.10, max: 0.30 } },
  { text: "Inflation spiral — safe-haven metals surge", match: { tag: "safehaven" }, min: 0.15, max: 0.45 },
  { text: "Crop blight across the tropics — soft commodities jump", match: { tag: "crops" }, min: 0.25, max: 0.70 },
  { text: "EV adoption tipping point — battery metals fly", match: { tag: "ev" }, min: 0.25, max: 0.80, also: { tag: "green", min: 0.10, max: 0.40 } },
  { text: "Nuclear renaissance — uranium contracts triple", match: { tag: "energy" }, min: 0.30, max: 0.90 },
  { text: "Lab-grown diamonds crash the gem market", match: { ids: ["diamonds"] }, min: -0.35, max: -0.15 },
  { text: "Construction supercycle — industrial metals in demand", match: { tag: "industrial" }, min: 0.15, max: 0.45 },

  // --- sectors ---
  { text: "Miracle obesity drug 2.0 — pharma rockets", match: { tag: "pharma" }, min: 0.30, max: 0.85 },
  { text: "Drug pricing reform slams pharma margins", match: { tag: "pharma" }, min: -0.30, max: -0.12 },
  { text: "Banking crisis flashbacks — financials wobble", match: { tag: "bank" }, min: -0.35, max: -0.15 },
  { text: "Yield curve turns friendly — banks print money", match: { tag: "bank" }, min: 0.15, max: 0.40 },
  { text: "Global travel boom — the world goes on holiday", match: { tag: "travel" }, min: 0.20, max: 0.55, also: { region: "asia", min: 0.05, max: 0.18 } },
  { text: "Defense budgets balloon amid rising tensions", match: { tag: "defense" }, min: 0.20, max: 0.60 },
  { text: "Luxury demand from new millionaires hits records", match: { tag: "luxurybrand" }, min: 0.15, max: 0.50, also: { cats: ["luxury"], min: 0.10, max: 0.35 } },
  { text: "Counterfeit scandal rocks the collectibles market", match: { cats: ["luxury"] }, min: -0.25, max: -0.08 },
  { text: "Record art auction week — a canvas sells for $450M", match: { tag: "art" }, min: 0.20, max: 0.60 },
  { text: "Sneaker resale bubble pops", match: { tag: "hype" }, min: -0.35, max: -0.12 },
  { text: "Hype cycle returns — grails triple overnight", match: { tag: "hype" }, min: 0.30, max: 1.00 },
  { text: "Sports rights mega-deal lifts club valuations", match: { tag: "sport" }, min: 0.20, max: 0.55 },
  { text: "Nightlife renaissance — clubs are printing money", match: { tag: "nightlife" }, min: 0.20, max: 0.60 },
  { text: "A meme stock army mobilizes once more", match: { tag: "meme" }, min: 0.60, max: 2.50 },
  { text: "Green energy subsidies supercharged", match: { tag: "green" }, min: 0.25, max: 0.70 },
  { text: "REITs rally as income investors return", match: { tag: "reit" }, min: 0.10, max: 0.30 },
  { text: "Agri-tech revolution boosts farm yields", match: { tag: "agri" }, min: 0.10, max: 0.35 },
  { text: "A quiet year — markets drift on vibes alone", match: { all: true }, min: -0.03, max: 0.05 },
];

// Rare black swans (~8% chance per year) — huge, memorable, market-wide
const BLACK_SWANS = [
  { text: "🦢 GLOBAL FINANCIAL CRISIS — banks topple like dominoes", match: { all: true }, min: -0.40, max: -0.22, also: { tag: "safehaven", min: 0.25, max: 0.60 } },
  { text: "🦢 PANDEMIC 2.0 — the world locks down again", match: { all: true }, min: -0.30, max: -0.15, also: { tag: "tech", min: 0.15, max: 0.45 } },
  { text: "🦢 AI SINGULARITY MOMENT — productivity goes exponential", match: { cats: ["stocks", "crypto"] }, min: 0.35, max: 1.00, also: { tag: "ai", min: 0.50, max: 1.50 } },
  { text: "🦢 HYPERINFLATION SCARE — cash burns, hard assets soar", match: { tag: "safehaven" }, min: 0.40, max: 1.00, also: { cats: ["realestate", "commodity"], min: 0.15, max: 0.45 } },
  { text: "🦢 GEOPOLITICAL FLASHPOINT — oil and defense spike, risk assets dive", match: { tag: "oil" }, min: 0.40, max: 1.00, also: { cats: ["stocks", "crypto"], min: -0.25, max: -0.10 } },
  { text: "🦢 GLOBAL DEBT JUBILEE — everything melts up at once", match: { all: true }, min: 0.15, max: 0.45 },
  { text: "🦢 ASTEROID MINING BREAKTHROUGH — precious metals crater", match: { tag: "safehaven" }, min: -0.50, max: -0.25, also: { tag: "space", min: 0.60, max: 2.00 } },
  { text: "🦢 GRID-DOWN CYBER EVENT — chaos, then a defense supercycle", match: { all: true }, min: -0.20, max: -0.08, also: { tag: "defense", min: 0.40, max: 1.00 } },
];

// ---- Avatar options ----
const AVATAR_OPTS = {
  skin:    ["#f5d0a9", "#eab676", "#c68642", "#8d5524", "#5c3317", "#ffdbac"],
  hair:    ["none", "short", "spiky", "curly", "long"],
  hairColor: ["#1a1a1a", "#6b3e1e", "#e8c33a", "#b91c1c", "#7c3aed", "#0ea5e9"],
  acc:     ["", "🕶️", "👓", "🎩", "🧢", "👑", "🎧"],
  outfit:  ["#1d4ed8", "#b91c1c", "#047857", "#7c3aed", "#d97706", "#0f172a", "#db2777", "#0891b2"],
  bg:      ["#0e7490", "#b45309", "#6d28d9", "#047857", "#be123c", "#475569"],
};
function defaultAvatar() { return { skin: 0, hair: 1, hairColor: 0, acc: 0, outfit: 0, bg: 0 }; }

// ---- Achievements ----
const ACHIEVEMENTS = [
  { id: "firsttrade", name: "First Deal",       emoji: "🤝", desc: "Buy your first asset" },
  { id: "landlord",   name: "Landlord",         emoji: "🏘️", desc: "Own 5 properties at once" },
  { id: "diversified",name: "Diversified",      emoji: "🧺", desc: "Hold assets in all 6 categories at once" },
  { id: "double",     name: "Doubled Up",       emoji: "💰", desc: "Reach 2× your starting cash" },
  { id: "megarich",   name: "Ten-Bagger",       emoji: "🐐", desc: "Reach 10× your starting cash" },
  { id: "cryptoking", name: "Crypto Degen",     emoji: "🌽", desc: "Hold $500K+ of crypto at once" },
  { id: "highroller", name: "High Roller",      emoji: "🎰", desc: "Win $100K+ in the casino" },
  { id: "streak5",    name: "Coin God",         emoji: "🪙", desc: "Hit a 5-flip streak in Double or Nothing" },
  { id: "survivor",   name: "Rug Survivor",     emoji: "🧻", desc: "Hold SafeRug through a rugpull… and live" },
  { id: "blackswan",  name: "Swan Watcher",     emoji: "🦢", desc: "Live through a black swan event" },
  { id: "flexking",   name: "Flex King",        emoji: "🛥️", desc: "Own a Superyacht" },
  { id: "decade",     name: "Full Decade",      emoji: "🏁", desc: "Finish a 10-year season" },
  { id: "rivalslain", name: "Friendship Ender", emoji: "⚔️", desc: "Beat a friend's Mogul Card score" },
  { id: "broke",      name: "Rock Bottom",      emoji: "🕳️", desc: "Drop below $10K… character building" },
];

const ASSET_BY_ID = Object.fromEntries(ASSETS.map(a => [a.id, a]));

const NEWS_IDLE = [
  "Analysts recommend buying low and selling high. Groundbreaking stuff.",
  "A mogul was spotted browsing Monaco penthouses on their lunch break…",
  "SafeRug developers insist everything is fine. Everything is definitely fine.",
  "Tip: assets with a yield pay you cash income every simulated year.",
  "The Golden Vault Casino reminds you it is absolutely, definitely beatable.*",
  "Rumor: meme coins only go up. Source: a guy on the internet.",
  "Diversification is free lunch. FrogCash is free adrenaline.",
  "This year's regime shapes every market — check the recap banner.",
  "Yields compound quietly while traders panic loudly.",
  "Black swans are rare. Until they're not.",
  "Press ? for shortcuts. Press S to find out what the market thinks of you.",
  "Cash pays nothing. It also never rugs you.",
  "The yacht depreciates. The yacht does not care.",
  "Star ★ an asset to watch it. Watching is free. Buying is character.",
];

// ============ LIFE EVENTS (v15) — BitLife-style choices with consequences ============
// A season is a 100-year life; between market years, life happens. Each event is a
// two/three-choice card with real money/flag consequences and a dry, dark-comic voice.
// Rolled deterministically per (seed, year) OUTSIDE the market loop — see rollLifeEvent().
// choice.apply() mutates state and returns an outcome line. Cosmetic Math.random is fine
// here (personal life, never the market path). Helpers (netWorth, money) bind at call time.
// v17: the four Mogul stats — a persistent character profile the life-event
// deck, the passage of years, and the casino all move. 0–100, cosmetic only:
// they never touch the seeded market path (determinism stays sacred).
const MOGUL_STATS = [
  { key: "rep", label: "Reputation", short: "REP", icon: "♛", color: "#e8b54d", lo: "Notorious", hi: "Beloved" },
  { key: "cun", label: "Cunning",    short: "CUN", icon: "♟", color: "#38bdf8", lo: "Naive",     hi: "Shrewd"  },
  { key: "vit", label: "Vitality",   short: "VIT", icon: "✦", color: "#34d399", lo: "Burnt out", hi: "Thriving" },
  { key: "inf", label: "Influence",  short: "INF", icon: "⚑", color: "#f472b6", lo: "Unknown",   hi: "Kingmaker" },
];

const LIFE_EVENTS = [
  { id: "inherit", icon: "🏚️", text: "A relative you can't quite place has died and left you their estate — and its considerable debts.",
    choices: [
      { label: "Accept it all", fx: { cun: 4, inf: 2, rep: -3 }, apply: () => { const g = 400000 + Math.floor(Math.random() * 1600000); const d = 300000 + Math.floor(Math.random() * 900000); S.season.cash += g; S.season.debt = (S.season.debt || 0) + d; return `You pocketed ${money(g)} in assets and inherited ${money(d)} of debt. Family.`; } },
      { label: "Decline", fx: { rep: 2, cun: -2 }, apply: () => "You let it pass. Somewhere, a solicitor sighs with relief." },
    ] },
  { id: "startup", icon: "🚀", cond: () => S.season.cash > 200000, text: "An old friend pitches their startup at a 'friends and family' round. $200K gets you in early.",
    choices: [
      { label: "Write the check", fx: { cun: 5, inf: 3, vit: -3 }, apply: () => { S.season.cash -= 200000; if (Math.random() < 0.45) { const w = 900000 + Math.floor(Math.random() * 3000000); S.season.cash += w; return `It exited. Your $200K came back as ${money(w)}. You'll never let them forget it.`; } return "It folded within the year. The friendship survived. Barely."; } },
      { label: "Politely pass", fx: { cun: -2, vit: 2 }, apply: () => "You passed. It either 100×'d or vanished. You'll never know which hurts more." },
    ] },
  { id: "tax", icon: "🧾", text: "The revenue service requests a 'friendly chat' about your rather creative structures.",
    choices: [
      { label: "Cooperate fully", fx: { rep: 6, vit: 4, inf: -2 }, apply: () => { const c = Math.round(netWorth() * 0.03); S.season.cash -= c; return `You paid ${money(c)} and slept soundly. Overrated, sleeping soundly.`; } },
      { label: "Lawyer up", fx: { cun: 5, rep: -3, inf: 2 }, apply: () => { const c = Math.round(netWorth() * 0.015); S.season.cash -= c; return `The lawyers ate ${money(c)} and made it disappear. The lawyers eat well.`; } },
      { label: "Ghost them", fx: { cun: 2, rep: -6, vit: -4 }, apply: () => { if (Math.random() < 0.5) { const c = Math.round(netWorth() * 0.08); S.season.cash -= c; return `The audit came anyway. It cost you ${money(c)}. Bold move, poorly aged.`; } return "Incredibly, they forgot about you. Do not try this again."; } },
    ] },
  { id: "honor", icon: "🎖️", cond: () => netWorth() > 10000000, text: "A civic committee offers you an honorary title — for a suitably generous donation, of course.",
    choices: [
      { label: "Donate $2M", fx: { rep: 12, inf: 8 }, apply: () => { S.season.cash -= 2000000; S.flags.honored = true; return "You're now Sir/Dame Mogul. The plaque cost $2M and reads 'Philanthropist'."; } },
      { label: "Decline", fx: { rep: -2, cun: 2 }, apply: () => "You declined. Titles are for people who need them, you told the mirror." },
    ] },
  { id: "tabloid", icon: "📰", text: "A tabloid has photographs. They'd absolutely hate to have to print them.",
    choices: [
      { label: "Pay them off", fx: { rep: 5, cun: 3 }, apply: () => { S.season.cash -= 500000; return `${money(500000)} for silence. The photos were of you asleep in a meeting. Worth it.`; } },
      { label: "Let it run", fx: { rep: -8, inf: 6, vit: -2 }, apply: () => { S.flags.notorious = true; return "You let it run. Any press is press, and the story tripled your dinner invitations."; } },
    ] },
  { id: "rivalbet", icon: "🎲", cond: () => S.season.cash > 1000000, text: "A rival mogul dares you: double-or-nothing on $1M. One coin. Right now.",
    choices: [
      { label: "Flip for it", fx: { inf: 5, vit: -4, cun: -3 }, apply: () => { if (Math.random() < 0.5) { S.season.cash += 1000000; return "Heads. You took a cool $1M and their dignity."; } S.season.cash -= 1000000; return "Tails. You're out $1M and they will dine on this story for years."; } },
      { label: "Walk away", fx: { cun: 5, rep: 3, inf: -2 }, apply: () => "You walked. Discipline is a kind of wealth, you reminded yourself, unconvincingly." },
    ] },
  { id: "heir", icon: "🧬", text: "Someone appears claiming to be your long-lost heir. The resemblance is... suspiciously financial.",
    choices: [
      { label: "Welcome them", fx: { rep: 4, inf: 3, vit: 3 }, apply: () => { S.flags.heir = true; return "You welcomed them into the family. Time will tell if that was wisdom or theatre."; } },
      { label: "DNA test first", fx: { cun: 5, rep: -2 }, apply: () => { S.season.cash -= 50000; if (Math.random() < 0.5) return "The test came back a match. Awkward hug ensued."; return "A fraud, as suspected. The $50K test was the cheapest lesson of the decade."; } },
    ] },
  { id: "guru", icon: "🔮", text: "A self-styled market guru offers you one guaranteed hot tip — for a modest six-figure fee.",
    choices: [
      { label: "Pay for the tip", fx: { cun: -6, vit: -2 }, apply: () => { S.season.cash -= 100000; return `You paid ${money(100000)}. The tip was to stop paying for tips. Devastatingly accurate.`; } },
      { label: "Laugh him off", fx: { cun: 6, rep: 2 }, apply: () => "You laughed him out of the room. He's now a bestselling author. The world is unwell." },
    ] },
  { id: "gala", icon: "🥂", cond: () => netWorth() > 5000000, text: "You're seated beside old money at a charity gala. A public pledge is very much expected.",
    choices: [
      { label: "Pledge $500K", fx: { rep: 8, inf: 6 }, apply: () => { S.season.cash -= 500000; S.flags.philanthropist = true; return "You pledged $500K to loud applause and a wobbly ice sculpture of your own head."; } },
      { label: "Slip out early", fx: { rep: -5, cun: 3, vit: 2 }, apply: () => "You slipped out before the ask. The valet respects you. Nobody else does." },
    ] },
  { id: "barnfind", icon: "🏎️", text: "A barn find: a dust-caked classic under a tarp, going cheap to someone who won't ask questions.",
    choices: [
      { label: "Buy it, $200K", fx: { cun: 4, vit: 2 }, apply: () => { S.season.cash -= 200000; if (Math.random() < 0.5) { const v = 700000 + Math.floor(Math.random() * 900000); S.season.cash += v; return `Restored, it fetched ${money(v)} at auction. The tarp knew.`; } return "It was a lemon under a tarp. You own a very expensive planter now."; } },
      { label: "Leave it", fx: { cun: -2 }, apply: () => "You left it. It sold to a rival who won't shut up about the flip." },
    ] },
  { id: "scam", icon: "📧", text: "An overseas 'prince' emails about a large transfer that, for reasons, requires a small deposit from you.",
    choices: [
      { label: "Reply and help", fx: { cun: -8, rep: -3 }, apply: () => { S.season.cash -= 50000; return `Of course it was a scam. ${money(50000)} for a story you'll tell no one.`; } },
      { label: "Delete it", fx: { cun: 5 }, apply: () => "Deleted. A rare moment of the internet not costing you money." },
    ] },
  { id: "windfall", icon: "💰", text: "A dormant account from decades ago surfaces, quietly compounding while you forgot it existed.",
    choices: [
      { label: "Claim it", fx: { vit: 5, rep: 2 }, apply: () => { const w = 200000 + Math.floor(Math.random() * 1500000); S.season.cash += w; return `${money(w)}, materialised from your own forgetfulness. The best kind of income.`; } },
    ] },
  { id: "burnout", icon: "🛌", cond: () => (18 + S.season.year) >= 35 && (18 + S.season.year) <= 60, text: "You haven't taken a real holiday in a decade. Your reflection looks like a spreadsheet.",
    choices: [
      { label: "Take a year off", fx: { vit: 18, cun: -3, inf: -2 }, apply: () => { S.flags.rested = true; return "You took a year off. The markets moved without you and, shockingly, so did you."; } },
      { label: "Grind on", fx: { vit: -12, cun: 4, rep: 2 }, apply: () => "You grind on. Sleep is for people with smaller ambitions, you lied to yourself." },
    ] },
  { id: "security", icon: "🕴️", cond: () => netWorth() > 50000000, text: "Your people quietly note that a person of your net worth is now a person of interest to the wrong people.",
    choices: [
      { label: "Hire protection", fx: { vit: 6, inf: 4, rep: 2 }, apply: () => { S.season.cash -= 300000; S.flags.guarded = true; return `${money(300000)} for a wall of quiet men in good suits. You feel safer and stranger.`; } },
      { label: "Risk it", fx: { vit: -6, cun: -3 }, apply: () => "You waved it off. Fortune favours the bold, and occasionally the kidnapped." },
    ] },
  { id: "yachtfit", icon: "🛥️", cond: () => { const w = currentWorld ? currentWorld() : null; return w && Object.keys(S.season.holdings).some(id => (w.byId[id] || {}).arch === "yacht"); }, text: "Your superyacht needs a full refit or it becomes an expensive artificial reef.",
    choices: [
      { label: "Pay for the refit", fx: { rep: 4, inf: 5 }, apply: () => { S.season.cash -= 800000; return `${money(800000)} to keep the yacht floating and the crew fed. The sea is a landlord too.`; } },
      { label: "Let it go", fx: { rep: -4, cun: 3 }, apply: () => "You let it go. Somewhere, a barnacle inherits a very nice hull." },
    ] },
  { id: "politics", icon: "🏛️", cond: () => netWorth() > 20000000, text: "A rising candidate would very much like a friend with deep pockets and a short memory.",
    choices: [
      { label: "Donate $1M", fx: { inf: 14, rep: -3 }, apply: () => { S.season.cash -= 1000000; S.flags.connected = true; return "You donated $1M. Doors now open before you knock. Some doors you'd rather stayed shut."; } },
      { label: "Stay neutral", fx: { rep: 3, inf: -4, cun: 2 }, apply: () => "You stayed neutral. Both sides now distrust you equally. Balanced." },
    ] },
  { id: "forgery", icon: "🖼️", cond: () => { const w = currentWorld ? currentWorld() : null; return w && Object.keys(S.season.holdings).some(id => (w.byId[id] || {}).cat === "luxury"); }, text: "An expert leans in at a party and whispers that one of your prized pieces might be a very good fake.",
    choices: [
      { label: "Authenticate it", fx: { cun: 5, rep: 2 }, apply: () => { S.season.cash -= 100000; if (Math.random() < 0.55) return `Genuine. ${money(100000)} for the peace of mind and the bragging rights.`; return `A forgery. The ${money(100000)} test confirmed the worst. You'll display it anyway, out of spite.`; } },
      { label: "Never speak of it", fx: { rep: -3, cun: -2, inf: 2 }, apply: () => "You changed the subject. What you don't authenticate can't hurt your valuation." },
    ] },
  { id: "legacyq", icon: "📜", cond: () => (18 + S.season.year) >= 80, text: "A journalist, gently, asks what you'd most like to be remembered for.",
    choices: [
      { label: "\"My empire.\"", fx: { inf: 6, rep: 2, vit: -2 }, apply: () => { S.flags.epitaph = "empire"; return "\"The empire,\" you said, gesturing at the skyline. The journalist wrote 'lonely' in shorthand."; } },
      { label: "\"My family.\"", fx: { rep: 6, vit: 4 }, apply: () => { S.flags.epitaph = "family"; return "\"My family,\" you said, and almost believed it. It printed beautifully."; } },
      { label: "\"Honestly? The parties.\"", fx: { inf: 4, rep: -2, vit: 3 }, apply: () => { S.flags.epitaph = "parties"; return "\"The parties,\" you said. It went viral. Your accountant wept."; } },
    ] },
];
