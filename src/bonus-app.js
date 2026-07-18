/* Module 3 — Animals & Instant Payouts trainer.
 * Depends on globals: scoreBonus, ANIMALS (bonus.js), loadRules (rules.js).
 * IIFE-wrapped to avoid global collisions. */
(function () {
  let RULES = loadRules();
  const $ = (id) => document.getElementById(id);

  const WIND = ['East', 'South', 'West', 'North'];
  const MAX_CHOICE = 8;   // trainer button cap; true total still shown on reveal

  // flower/season number -> {glyph, name}
  const FLOWER = { 1: ['🀢', 'Plum'], 2: ['🀣', 'Orchid'], 3: ['🀥', 'Chrysanthemum'], 4: ['🀤', 'Bamboo'] };
  const SEASON = { 1: ['🀦', 'Spring'], 2: ['🀧', 'Summer'], 3: ['🀨', 'Autumn'], 4: ['🀩', 'Winter'] };
  const ANIMAL = { cat: ['🐱', 'Cat'], rat: ['🐭', 'Rat'], rooster: ['🐓', 'Rooster'], centipede: ['🐛', 'Centipede'] };

  // ---- state ----
  let held = null, seat = 0, result = null, answered = false, streak = 0;

  const STATS_KEY = 'sgmj-bonus-stats-v1';
  const fresh = () => ({ played: 0, correct: 0, bestStreak: 0 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } };
  let stats = load();

  const randInt = (n) => Math.floor(Math.random() * n);

  function gen(difficulty) {
    const p = difficulty === 'easy' ? 0.18 : difficulty === 'medium' ? 0.32 : 0.5;
    const pAnimal = difficulty === 'hard' ? 0.5 : p;
    const flowers = [], seasons = [], animals = [];
    for (let n = 1; n <= 4; n++) { if (Math.random() < p) flowers.push(n); if (Math.random() < p) seasons.push(n); }
    for (const a of ANIMALS) if (Math.random() < pAnimal) animals.push(a);
    return { flowers, seasons, animals };
  }
  function total(h) { return h.flowers.length + h.seasons.length + h.animals.length; }
  function accept(difficulty, instant, tiles) {
    if (tiles < 1) return false;                 // always show at least one tile
    if (difficulty === 'easy') return instant <= 2;
    if (difficulty === 'hard') return instant >= 2;
    return true;
  }

  function newHand() {
    RULES = loadRules();
    const difficulty = $('b-difficulty').value;
    for (let attempt = 0; attempt < 500; attempt++) {
      const h = gen(difficulty);
      const s = randInt(4);
      const res = scoreBonus(h, s, RULES);
      if (accept(difficulty, res.instant, total(h))) { held = h; seat = s; result = res; answered = false; render(); return; }
    }
    held = gen(difficulty); seat = randInt(4); result = scoreBonus(held, seat, RULES); answered = false; render();
  }

  // ---- rendering ----
  function tileEl(glyph, label, isEmoji, own) {
    const t = document.createElement('div');
    t.className = 'tile bonus-tile' + (isEmoji ? ' animal-tile' : '') + (own ? ' own-tile' : '');
    t.textContent = glyph;
    t.title = label;
    return t;
  }

  function render() {
    const seatNum = seat + 1;
    $('b-context').innerHTML = `<span class="chip">You are seat <strong>${WIND[seat]}</strong> (number ${seatNum})</span>`;

    const el = $('b-tiles');
    el.innerHTML = '';
    held.flowers.slice().sort((a, b) => a - b).forEach((n) => el.appendChild(tileEl(FLOWER[n][0], `${FLOWER[n][1]} (flower ${n})`, false, n === seatNum)));
    held.seasons.slice().sort((a, b) => a - b).forEach((n) => el.appendChild(tileEl(SEASON[n][0], `${SEASON[n][1]} (season ${n})`, false, n === seatNum)));
    ANIMALS.filter((a) => held.animals.includes(a)).forEach((a) => el.appendChild(tileEl(ANIMAL[a][0], ANIMAL[a][1], true, false)));
    if (total(held) === 0) el.innerHTML = '<span class="none-note">no bonus tiles</span>';

    const box = $('b-choices');
    box.innerHTML = '';
    for (let v = 0; v <= MAX_CHOICE; v++) {
      const b = document.createElement('button');
      b.className = 'tai-btn';
      b.textContent = v === MAX_CHOICE ? `${v}+` : `${v}`;
      b.dataset.val = v;
      b.addEventListener('click', () => onAnswer(v, b));
      box.appendChild(b);
    }
    $('b-feedback').hidden = true;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('b-session').textContent = 'No deals scored yet this session.'; return; }
    const pct = Math.round((stats.correct / stats.played) * 100);
    const hands = `${stats.played} deal${stats.played === 1 ? '' : 's'}`;
    $('b-session').innerHTML = `<strong>${pct}%</strong> correct over ${hands} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onAnswer(val, btn) {
    if (answered) return;
    answered = true;
    const target = Math.min(result.instant, MAX_CHOICE);
    const isRight = val === target;

    stats.played++;
    if (isRight) { stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();

    document.querySelectorAll('#b-choices .tai-btn').forEach((b) => {
      b.classList.add('locked');
      if (+b.dataset.val === target) b.classList.add('right');
    });
    if (!isRight) btn.classList.add('wrong');

    renderFeedback(isRight);
    renderSession();
  }

  function reveal() {
    if (answered) return;
    answered = true;
    stats.played++; streak = 0; save();
    const target = Math.min(result.instant, MAX_CHOICE);
    document.querySelectorAll('#b-choices .tai-btn').forEach((b) => { b.classList.add('locked'); if (+b.dataset.val === target) b.classList.add('right'); });
    renderFeedback(false);
    renderSession();
  }

  function list(items, unit) {
    if (!items.length) return `<div class="row note">none</div>`;
    return '<ul class="breakdown">' +
      items.map((it) => `<li><span>${it.name}</span><span class="tai">+${it.tai ?? it.amount}${unit}</span></li>`).join('') +
      '</ul>';
  }

  function renderFeedback(isRight) {
    const fb = $('b-feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (isRight ? 'good' : 'bad');
    const capNote = result.instant > MAX_CHOICE ? ` <span class="cap-note">(true total ${result.instant})</span>` : '';

    let html = `<h3>${isRight ? '✓ Correct' : '✗ Not quite'} — instant payout <strong>${result.instant}</strong> per opponent${capNote}</h3>`;
    html += `<div class="row"><strong>Instant</strong> — paid now by each opponent, win or lose:</div>`;
    html += list(result.instantItems, '');
    html += `<div class="row" style="margin-top:10px"><strong>Hand tai</strong> — added to your score only if you win:</div>`;
    html += result.handItems.length
      ? list(result.handItems, ' tai')
      : `<div class="row note">none</div>`;
    fb.innerHTML = html;
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('b-newHand').addEventListener('click', newHand);
  $('b-reveal').addEventListener('click', reveal);
  $('b-difficulty').addEventListener('change', newHand);
  $('b-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-bonus').hidden) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') newHand();
    else if (e.key === 'r' || e.key === 'R') reveal();
    else if (/^[0-9]$/.test(e.key) && !answered) {
      const v = Math.min(+e.key, MAX_CHOICE);
      const btn = document.querySelector(`#b-choices .tai-btn[data-val="${v}"]`);
      if (btn) btn.click();
    } else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newHand(); }
  });

  window.__bonusRefresh = newHand;
  newHand();
})();
