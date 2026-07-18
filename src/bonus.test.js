const { scoreBonus } = require('./bonus');
const { DEFAULT_RULES: R } = require('./rules');

let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}

// seats: 0=East(1) 1=South(2) 2=West(3) 3=North(4)

// 1) nothing held
let r = scoreBonus({}, 0, R);
eq('empty handTai', r.handTai, 0);
eq('empty instant', r.instant, 0);

// 2) East holding own flower(1) + own season(1)
r = scoreBonus({ flowers: [1], seasons: [1] }, 0, R);
eq('own both handTai', r.handTai, R.seatFlower * 2);
eq('own both instant', r.instant, R.instOwnFlowers);

// 3) non-matching flower only (South seat, flower 1) -> no own, no instant
r = scoreBonus({ flowers: [1] }, 1, R);
eq('non-matching flower handTai', r.handTai, 0);
eq('non-matching flower instant', r.instant, 0);

// 4) Cat + Rat -> instant pair, 2 animals tai
r = scoreBonus({ animals: ['cat', 'rat'] }, 0, R);
eq('cat+rat handTai', r.handTai, R.animalTai * 2);
eq('cat+rat instant', r.instant, R.instAnimalPair);

// 5) all four animals -> 2 pairs + four-animal bonus; 4 animals tai
r = scoreBonus({ animals: ['cat', 'rat', 'rooster', 'centipede'] }, 0, R);
eq('four animals handTai', r.handTai, R.animalTai * 4);
eq('four animals instant', r.instant, R.instAnimalPair * 2 + R.instFourAnimals);

// 6) complete flower set for East -> own flower(1) tai + set instant
r = scoreBonus({ flowers: [1, 2, 3, 4] }, 0, R);
eq('flower set handTai (own flower 1)', r.handTai, R.seatFlower);
eq('flower set instant', r.instant, R.instFlowerSet);

// 7) all eight flowers+seasons for East -> own flower+season + both sets + eight bonus
r = scoreBonus({ flowers: [1, 2, 3, 4], seasons: [1, 2, 3, 4] }, 0, R);
eq('all eight handTai', r.handTai, R.seatFlower * 2);
eq('all eight instant', r.instant,
  R.instOwnFlowers + R.instFlowerSet + R.instFlowerSet + R.instEightFlowers);

// 8) rooster+centipede for West, plus own season(3)
r = scoreBonus({ seasons: [3], animals: ['rooster', 'centipede'] }, 2, R);
eq('rooster+centipede handTai', r.handTai, R.animalTai * 2 + R.seatFlower);
eq('rooster+centipede instant', r.instant, R.instAnimalPair);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
