/*
 * Singapore Mahjong Tutor — bonus & instant-payout scorer (Module 3).
 *
 * Models the Singapore-specific bonus layer: flowers, seasons and animals.
 * Two distinct kinds of value:
 *   - HAND TAI  — added to your hand's score, only collected if you win.
 *   - INSTANT   — paid immediately by EACH opponent the moment the tiles are
 *                 revealed, whether or not you ever win the hand.
 *
 * held = {
 *   flowers: [numbers 1..4 you hold],   // Plum1 Orchid2 Chrys3 Bamboo4
 *   seasons: [numbers 1..4 you hold],   // Spring1 Summer2 Autumn3 Winter4
 *   animals: [subset of 'cat','rat','rooster','centipede'],
 * }
 * seat = 0..3 (E,S,W,N); your seat number = seat + 1.
 *
 * All amounts are house-dependent and come from the rule set. Instant amounts
 * are per-opponent units (a common teaching simplification).
 */

const ANIMALS = ['cat', 'rat', 'rooster', 'centipede'];

function scoreBonus(held, seat, rules) {
  const flowers = (held.flowers || []).slice();
  const seasons = (held.seasons || []).slice();
  const animals = (held.animals || []).slice();
  const seatNum = seat + 1;

  const handItems = [];
  const instantItems = [];

  // ---- hand tai ----
  if (animals.length) {
    handItems.push({ name: `Animal ×${animals.length}`, tai: rules.animalTai * animals.length });
  }
  const ownFlower = flowers.includes(seatNum);
  const ownSeason = seasons.includes(seatNum);
  const ownCount = (ownFlower ? 1 : 0) + (ownSeason ? 1 : 0);
  if (ownCount) {
    handItems.push({ name: `Own flower/season ×${ownCount}`, tai: rules.seatFlower * ownCount });
  }

  // ---- instant payouts ----
  const has = (a) => animals.includes(a);
  let pairs = 0;
  if (has('cat') && has('rat')) pairs++;
  if (has('rooster') && has('centipede')) pairs++;
  if (pairs) {
    instantItems.push({ name: `Predator–prey pair ×${pairs}`, amount: rules.instAnimalPair * pairs });
  }
  if (animals.length === 4) {
    instantItems.push({ name: 'All four animals', amount: rules.instFourAnimals });
  }
  if (ownFlower && ownSeason) {
    instantItems.push({ name: 'Own flower + own season', amount: rules.instOwnFlowers });
  }
  const fullFlowerSet = [1, 2, 3, 4].every((n) => flowers.includes(n));
  const fullSeasonSet = [1, 2, 3, 4].every((n) => seasons.includes(n));
  if (fullFlowerSet) instantItems.push({ name: 'Complete flower set (1–4)', amount: rules.instFlowerSet });
  if (fullSeasonSet) instantItems.push({ name: 'Complete season set (1–4)', amount: rules.instFlowerSet });
  if (fullFlowerSet && fullSeasonSet) {
    instantItems.push({ name: 'All eight flowers & seasons', amount: rules.instEightFlowers });
  }

  const handTai = handItems.reduce((n, it) => n + it.tai, 0);
  const instant = instantItems.reduce((n, it) => n + it.amount, 0);
  return { handTai, handItems, instant, instantItems };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreBonus, ANIMALS };
}
