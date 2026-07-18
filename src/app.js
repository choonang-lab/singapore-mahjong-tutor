/* Efficiency Trainer UI — depends on engine.js (global: shanten, ukeire, bestDiscards) */

// ---- tile glyphs & names -------------------------------------------------
function glyph(i) {
  if (i < 9)  return String.fromCodePoint(0x1F007 + i);        // man 1-9
  if (i < 18) return String.fromCodePoint(0x1F019 + (i - 9));  // pin 1-9
  if (i < 27) return String.fromCodePoint(0x1F010 + (i - 18)); // sou 1-9
  const honor = [0x1F000, 0x1F001, 0x1F002, 0x1F003,           // E S W N
                 0x1F004, 0x1F005, 0x1F006];                    // Red Green White
  return String.fromCodePoint(honor[i - 27]);
}
function tileName(i) {
  const suit = ['Characters', 'Circles', 'Bamboo'];
  if (i < 27) return `${(i % 9) + 1} ${suit[Math.floor(i / 9)]}`;
  return ['East', 'South', 'West', 'North', 'Red Dragon', 'Green Dragon', 'White Dragon'][i - 27];
}
function tileClass(i) {
  if (i === 31) return 'dragon-red';
  if (i === 32) return 'dragon-green';
  return '';
}

/**
 * Describe a tile's structural role within a hand — the "why" behind a discard.
 * counts = the full 14-tile hand (tile still present).
 */
function describeTile(counts, i) {
  const cnt = counts[i];
  if (i >= 27) {
    if (cnt >= 3) return 'a triplet of honours — a locked-in set';
    if (cnt === 2) return 'an honour pair (possible eyes or a pong wait)';
    return 'a lone honour — it connects to nothing and can only ever pair up, so it is the least useful tile to hold';
  }
  const pos = i % 9;
  const base = i - pos;
  const at = (p) => (p >= 0 && p <= 8) ? counts[base + p] : 0;
  const terminal = (pos === 0 || pos === 8);
  if (cnt >= 3) return 'a triplet — a completed set';
  if (cnt === 2) {
    if (at(pos - 1) || at(pos + 1)) return 'a pair that also backs up a run';
    return 'a pair (eyes or a pong wait)';
  }
  const l1 = at(pos - 1) > 0, r1 = at(pos + 1) > 0;
  const l2 = at(pos - 2) > 0, r2 = at(pos + 2) > 0;
  if (l1 && r1) return 'the middle of a completed run';
  if (r1 || l1) {
    if (pos >= 1 && pos <= 7) return 'part of a two-sided run (ryanmen) — your most valuable shape, it accepts tiles on both ends';
    return 'part of an edge run (penchan) — it only accepts one number';
  }
  if (l2 || r2) return 'part of a gap run (kanchan) — it accepts only the one tile that fills the gap';
  return terminal
    ? 'an isolated terminal — narrow, it connects only inward'
    : 'an isolated middle tile — not yet part of any shape';
}

/**
 * Classify what an accepting tile does for a 13-tile hand: completes a full
 * set (run/triplet) or just builds a shape (pair / new partial).
 */
function acceptRole(counts13, t) {
  if (counts13[t] >= 2) return 'set';                    // pair -> triplet
  if (t < 27) {
    const pos = t % 9, base = t - pos;
    const at = (p) => (p >= 0 && p <= 8) ? counts13[base + p] : 0;
    if ((at(pos - 2) && at(pos - 1)) ||
        (at(pos - 1) && at(pos + 1)) ||
        (at(pos + 1) && at(pos + 2))) return 'set';      // fills a run
  }
  return 'shape';                                         // pair / partial
}

// ---- state ---------------------------------------------------------------
let hand = [];          // 34-count array, 14 tiles
let analysis = null;    // bestDiscards result
let graded = false;
let streak = 0;

const DIFFICULTY = { easy: [1, 2], medium: [2, 3], hard: [3, 4] };
const STATS_KEY = 'sgmj-eff-stats-v1';

function freshStats() { return { played: 0, optimal: 0, narrow: 0, backward: 0, bestStreak: 0 }; }
function loadStats() {
  try { return Object.assign(freshStats(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); }
  catch { return freshStats(); }
}
function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } }
let stats = loadStats();

const $ = (id) => document.getElementById(id);

// ---- hand generation -----------------------------------------------------
function randomHand() {
  const [lo, hi] = DIFFICULTY[$('difficulty').value] || [2, 3];
  for (let attempt = 0; attempt < 400; attempt++) {
    const wall = [];
    for (let i = 0; i < 34; i++) for (let c = 0; c < 4; c++) wall.push(i);
    for (let i = wall.length - 1; i > 0; i--) {          // Fisher–Yates
      const j = Math.floor(Math.random() * (i + 1));
      [wall[i], wall[j]] = [wall[j], wall[i]];
    }
    const counts = new Array(34).fill(0);
    for (let k = 0; k < 14; k++) counts[wall[k]]++;
    const sh = shanten(counts);
    if (sh >= lo && sh <= hi) return counts;
  }
  const wall = [];
  for (let i = 0; i < 34; i++) for (let c = 0; c < 4; c++) wall.push(i);
  const counts = new Array(34).fill(0);
  for (let k = 0; k < 14; k++) counts[wall[(k * 7) % wall.length]]++;
  return counts;
}

function handToList(counts) {
  const list = [];
  for (let i = 0; i < 34; i++) for (let c = 0; c < counts[i]; c++) list.push(i);
  return list; // sorted by index
}
function handMinus(i) { const c = hand.slice(); c[i]--; return c; }

// ---- rendering -----------------------------------------------------------
function renderHand() {
  const el = $('hand');
  el.innerHTML = '';
  el.classList.toggle('graded', graded);
  handToList(hand).forEach((i, pos) => {
    const t = document.createElement('div');
    t.className = `tile ${tileClass(i)}`.trim();
    t.textContent = glyph(i);
    t.title = tileName(i);
    t.dataset.index = i;
    t.dataset.pos = pos;
    if (!graded) t.addEventListener('click', () => onDiscard(i, t));
    else t.classList.add('locked');
    el.appendChild(t);
  });
  $('shanten').textContent = analysis ? analysis[0].shanten : shanten(hand);
}

function miniTiles(tiles) {
  return tiles
    .map(({ index, remaining }) =>
      `<span class="mini ${tileClass(index)}"><span>${glyph(index)}</span><span class="cnt">${remaining}</span></span>`)
    .join('');
}

/** Accepting tiles grouped by what they accomplish. */
function groupedAcceptance(counts13, tiles) {
  const sets = tiles.filter((x) => acceptRole(counts13, x.index) === 'set');
  const rest = tiles.filter((x) => acceptRole(counts13, x.index) !== 'set');
  let html = '';
  if (sets.length) html += `<div class="accept-line"><span class="accept-label">Completes a set</span><span class="mini-tiles">${miniTiles(sets)}</span></div>`;
  if (rest.length) html += `<div class="accept-line"><span class="accept-label">Builds a shape</span><span class="mini-tiles">${miniTiles(rest)}</span></div>`;
  return html || '<div class="accept-line note">no tiles improve this hand</div>';
}

function labelShanten(s) {
  if (s < 0) return 'a winning hand';
  if (s === 0) return 'tenpai (ready to win)';
  return `${s}-shanten`;
}

function renderSession() {
  $('score').textContent = `${stats.optimal} / ${stats.played}`;
  $('streak').textContent = streak;
  if (stats.played === 0) {
    $('sessionSummary').textContent = 'No hands played yet this session.';
    return;
  }
  const pct = Math.round((stats.optimal / stats.played) * 100);
  const hands = `${stats.played} hand${stats.played === 1 ? '' : 's'}`;
  $('sessionSummary').innerHTML =
    `<strong>${pct}%</strong> optimal over ${hands} · ` +
    `best streak <strong>${stats.bestStreak}</strong> · ` +
    `mistakes: ${stats.backward} backward, ${stats.narrow} narrow`;
}

// ---- interaction ---------------------------------------------------------
function newHand() {
  hand = randomHand();
  analysis = bestDiscards(hand);
  graded = false;
  $('feedback').hidden = true;
  renderHand();
}

function onDiscard(index, tileEl) {
  if (graded) return;
  graded = true;

  const chosen = analysis.find((d) => d.discard === index);
  const bestShanten = analysis[0].shanten;
  const bestTotal = analysis[0].total;

  let tier;
  if (chosen.shanten === bestShanten && chosen.total === bestTotal) tier = 'optimal';
  else if (chosen.shanten === bestShanten) tier = 'narrow';
  else tier = 'backward';

  // stats
  stats.played++;
  if (tier === 'optimal') { stats.optimal++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
  else { streak = 0; stats[tier]++; }
  saveStats();
  renderSession();

  // highlight
  document.querySelectorAll('.tile').forEach((el) => el.classList.add('locked'));
  tileEl.classList.add('chosen');
  if (tier === 'optimal') tileEl.classList.add('correct');
  const bestSet = new Set(analysis
    .filter((d) => d.shanten === bestShanten && d.total === bestTotal)
    .map((d) => d.discard));
  document.querySelectorAll('.tile').forEach((el) => {
    if (bestSet.has(+el.dataset.index)) el.classList.add('best');
  });

  renderFeedback(chosen, tier, bestShanten, bestTotal);
  $('hand').classList.add('graded');

  if (tier === 'optimal' && $('autoNext').checked) setTimeout(newHand, 950);
}

function renderFeedback(chosen, tier, bestShanten, bestTotal) {
  const fb = $('feedback');
  fb.hidden = false;

  const bestList = analysis.filter((d) => d.shanten === bestShanten && d.total === bestTotal);
  const bestNames = bestList.map((d) => tileName(d.discard)).join(' or ');
  const better = analysis.filter((d) =>
    d.shanten < chosen.shanten ||
    (d.shanten === chosen.shanten && d.total > chosen.total)).length;
  const rank = better + 1;

  const heads = {
    optimal:  ['good', '✓ Optimal discard'],
    narrow:   ['warn', '○ On pace, but not the widest'],
    backward: ['bad',  '✗ A step backward'],
  };
  const [cls, title] = heads[tier];
  fb.className = 'feedback ' + cls;

  let html = `<h3>${title} <span class="rank">rank ${rank} of ${analysis.length}</span></h3>`;
  html += `<div class="row"><strong>${tileName(chosen.discard)}</strong> is ${describeTile(hand, chosen.discard)}.</div>`;

  if (tier === 'optimal') {
    html += `<div class="row">Result: <strong>${labelShanten(chosen.shanten)}</strong>, ` +
            `accepting <strong>${chosen.total}</strong> tiles to advance:</div>`;
    html += groupedAcceptance(handMinus(chosen.discard), chosen.tiles);
  } else if (tier === 'narrow') {
    html += `<div class="row">You stay at <strong>${labelShanten(chosen.shanten)}</strong> — right speed — ` +
            `but this accepts <strong>${chosen.total}</strong> tiles vs <strong>${bestTotal}</strong> for the best discard.</div>`;
    html += bestBlock(bestNames, bestShanten, bestTotal, bestList[0]);
  } else {
    html += `<div class="row">This drops you from <strong>${labelShanten(bestShanten)}</strong> ` +
            `to <strong>${labelShanten(chosen.shanten)}</strong> — you gave up a completed or near-complete shape.</div>`;
    html += `<div class="row note">It may look like it accepts more tiles (${chosen.total}), but most of those just undo the step you took back.</div>`;
    html += bestBlock(bestNames, bestShanten, bestTotal, bestList[0]);
  }

  fb.innerHTML = html;
}

function bestBlock(names, sh, total, best) {
  return `<div class="row best-row">Best — <strong>${names}</strong>: ${labelShanten(sh)}, accepts <strong>${total}</strong> tiles</div>` +
         groupedAcceptance(handMinus(best.discard), best.tiles);
}

function showBest() {
  if (!analysis) return;
  const bestShanten = analysis[0].shanten;
  const bestTotal = analysis[0].total;
  const bestSet = new Set(analysis
    .filter((d) => d.shanten === bestShanten && d.total === bestTotal)
    .map((d) => d.discard));
  document.querySelectorAll('.tile').forEach((el) => {
    el.classList.toggle('best', bestSet.has(+el.dataset.index));
  });
}

function resetStats() {
  stats = freshStats();
  streak = 0;
  saveStats();
  renderSession();
}

// ---- wire up -------------------------------------------------------------
$('newHand').addEventListener('click', newHand);
$('hint').addEventListener('click', showBest);
$('difficulty').addEventListener('change', newHand);
$('resetStats').addEventListener('click', resetStats);

document.addEventListener('keydown', (e) => {
  if (document.getElementById('module-efficiency').hidden) return;   // only when this module is active
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === 'n') { newHand(); }
  else if (k === 'h') { showBest(); }
  else if (e.key === 'Enter' || e.key === ' ') {
    if (graded) { e.preventDefault(); newHand(); }
  }
});

renderSession();
newHand();
