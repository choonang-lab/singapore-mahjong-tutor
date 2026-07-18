/*
 * Configurable Singapore scoring rule set.
 *
 * Singapore mahjong is house-rule heavy — every value below varies table to
 * table. This object is the single source of truth the scorer reads, so a
 * different table = a different rules object, never a code change.
 *
 * All values are in TAI (台). `limit` is the cap; a hand worth more pays the
 * cap. `minTai` is the minimum needed to declare a win (0 = chicken hands OK).
 */
const DEFAULT_RULES = {
  id: 'sg-casual',
  name: 'Common casual Singapore',
  note: 'Typical home / kopitiam rules. Every value is house-dependent — edit freely.',

  limit: 5,      // tai cap (满)
  minTai: 1,     // minimum tai to win — 1 means a no-tai (chicken) hand cannot win

  // --- situational ---
  zimo: 1,       // self-draw 自摸

  // --- honor pongs/kongs ---
  seatWind: 1,   // pong of your seat wind 门风
  roundWind: 1,  // pong of the prevailing wind 圈风
  dragon: 1,     // each dragon pong 三元 (per dragon)

  // --- hand shapes ---
  pinghu: 1,     // all sequences, valueless pair 平胡  [house-dependent def.]
  allPongs: 2,   // 对对胡
  halfFlush: 2,  // one suit + honors 混一色
  fullFlush: 4,  // one suit only 清一色

  // --- limit / big hands ---
  allHonors: 5,          // 字一色
  smallThreeDragons: 4,  // 小三元 (2 dragon pongs + dragon pair)
  bigThreeDragons: 5,    // 大三元 (3 dragon pongs)

  // --- bonus tiles: hand tai (counted if you win) ---
  seatFlower: 1, // each flower/season matching your seat
  animalTai: 1,  // each animal tile (cat / rat / rooster / centipede)

  // --- instant payouts: paid immediately by EACH opponent on reveal, win or lose ---
  instAnimalPair: 2,    // completing Cat+Rat or Rooster+Centipede (per pair)
  instFourAnimals: 4,   // holding all four animals (on top of the two pairs)
  instOwnFlowers: 2,    // your matching flower AND your matching season together
  instFlowerSet: 2,     // a complete 4-flower or 4-season set (each set)
  instEightFlowers: 8,  // all eight flowers & seasons (on top of the two sets)
};

// --- active-rules store (persisted per device) ---
const RULES_KEY = 'sgmj-rules-v1';

function loadRules() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(RULES_KEY) : null;
    return Object.assign({}, DEFAULT_RULES, JSON.parse(raw || 'null') || {});
  } catch {
    return Object.assign({}, DEFAULT_RULES);
  }
}

function saveRules(rules) {
  try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* ignore */ }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_RULES, loadRules, saveRules, RULES_KEY };
}
