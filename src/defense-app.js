/* Module 4 — Defense trainer.
 * Depends on globals: shanten, waits (engine.js); sujiSafe, riverValuesBySuit,
 * classify (defense.js). IIFE-wrapped to avoid global collisions. */
(function () {
  const $ = (id) => document.getElementById(id);

  function glyph(i) {
    if (i < 9)  return String.fromCodePoint(0x1F007 + i);
    if (i < 18) return String.fromCodePoint(0x1F019 + (i - 9));
    if (i < 27) return String.fromCodePoint(0x1F010 + (i - 18));
    return String.fromCodePoint([0x1F000, 0x1F001, 0x1F002, 0x1F003, 0x1F004, 0x1F005, 0x1F006][i - 27]);
  }
  function tileName(i) {
    const suit = ['Characters', 'Circles', 'Bamboo'];
    if (i < 27) return `${(i % 9) + 1} ${suit[Math.floor(i / 9)]}`;
    return ['East', 'South', 'West', 'North', 'Red Dragon', 'Green Dragon', 'White Dragon'][i - 27];
  }
  function tileClass(i) { return i === 31 ? 'dragon-red' : i === 32 ? 'dragon-green' : ''; }
  const randInt = (n) => Math.floor(Math.random() * n);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---- state ----
  let scenario = null, answered = false, streak = 0;
  const STATS_KEY = 'sgmj-defense-stats-v1';
  const fresh = () => ({ played: 0, safe: 0, optimal: 0, bestStreak: 0 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } };
  let stats = load();

  // ---- scenario generation ----
  function buildTenpai() {
    for (let attempt = 0; attempt < 400; attempt++) {
      const c = new Array(34).fill(0);
      let ok = true;
      const add = (t, n) => { c[t] += n; if (c[t] > 4) ok = false; };
      add(randInt(34), 2);                              // pair
      for (let k = 0; k < 3 && ok; k++) {               // 3 complete sets
        if (Math.random() < 0.6) { const s = randInt(3) * 9 + randInt(7); add(s, 1); add(s + 1, 1); add(s + 2, 1); }
        else add(randInt(34), 3);
      }
      if (ok) {                                         // ryanmen partial (the wait)
        const lo = 2 + randInt(6);                      // value 2..7 -> two-sided
        const base = randInt(3) * 9;
        add(base + lo - 1, 1); add(base + lo, 1);
      }
      let total = 0; for (let i = 0; i < 34; i++) total += c[i];
      if (ok && total === 13 && shanten(c) === 0 && waits(c).length) return c;
    }
    return null;
  }

  function genScenario(difficulty) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const opp = buildTenpai();
      if (!opp) continue;
      const waitArr = waits(opp);
      const waitSet = new Set(waitArr);
      const used = opp.slice();

      const nRiver = difficulty === 'easy' ? 9 : difficulty === 'hard' ? 7 : 8;
      const river = [];
      let guard = 0;
      while (river.length < nRiver && guard < 500) {
        guard++;
        const t = randInt(34);
        if (waitSet.has(t) || used[t] >= 4) continue;   // furiten: opp never discards a winning tile
        used[t]++; river.push(t);
      }
      const riverSet = new Set(river);

      const your = new Array(34).fill(0);
      let count = 0;
      const addYour = (t) => { if (used[t] >= 4 || count >= 13) return false; used[t]++; your[t]++; count++; return true; };
      let g = 0, d = 0;
      for (const t of shuffle([...riverSet])) { if (g >= 2) break; if (addYour(t)) g++; }
      for (const t of shuffle([...waitSet])) { if (d >= 2) break; if (addYour(t)) d++; }
      let guard2 = 0;
      while (count < 13 && guard2 < 800) { guard2++; addYour(randInt(34)); }

      if (count === 13 && g >= 1 && d >= 1) {
        return { waitArr, waitSet, river, riverSet, your, suitVals: riverValuesBySuit(river) };
      }
    }
    return null;
  }

  function newDeal() {
    const difficulty = $('d-difficulty').value;
    let sc = null;
    for (let i = 0; i < 5 && !sc; i++) sc = genScenario(difficulty);
    if (!sc) return;
    scenario = sc; answered = false;
    render();
  }

  // ---- rendering ----
  function handList(counts) { const l = []; for (let i = 0; i < 34; i++) for (let n = 0; n < counts[i]; n++) l.push(i); return l; }

  function render() {
    $('d-context').innerHTML = '<span class="chip">🀄 <strong>West</strong> is tenpai (ready to win). You are folding — discard the <strong>safest</strong> tile.</span>';

    const riverEl = $('d-river');
    riverEl.innerHTML = '';
    scenario.river.forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile mini-river ${tileClass(i)}`.trim();
      t.textContent = glyph(i); t.title = tileName(i);
      riverEl.appendChild(t);
    });

    const handEl = $('d-hand');
    handEl.innerHTML = '';
    handList(scenario.your).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile ${tileClass(i)}`.trim();
      t.textContent = glyph(i); t.title = tileName(i);
      t.dataset.index = i;
      if (!answered) t.addEventListener('click', () => onDiscard(i, t));
      else t.classList.add('locked');
      handEl.appendChild(t);
    });

    $('d-feedback').hidden = true;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('d-session').textContent = 'No discards played yet this session.'; return; }
    const safePct = Math.round((stats.safe / stats.played) * 100);
    const optPct = Math.round((stats.optimal / stats.played) * 100);
    $('d-session').innerHTML = `<strong>${safePct}%</strong> stayed safe · <strong>${optPct}%</strong> optimal over ${stats.played} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onDiscard(index, tileEl) {
    if (answered) return;
    answered = true;
    const { waitSet, riverSet } = scenario;
    const dealtIn = waitSet.has(index);
    const chosenGenbutsu = riverSet.has(index);
    const yourGenbutsu = handList(scenario.your).some((i) => riverSet.has(i));

    let tier;
    if (dealtIn) tier = 'dealin';
    else if (chosenGenbutsu) tier = 'safe-best';
    else tier = 'gamble';                               // safe this time but a genbutsu existed

    stats.played++;
    if (!dealtIn) stats.safe++;
    if (tier === 'safe-best') { stats.optimal++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();

    // colour every hand tile by its true classification
    document.querySelectorAll('#d-hand .tile').forEach((el) => {
      const i = +el.dataset.index;
      el.classList.add('locked', 'cls-' + classify(i, waitSet, riverSet, scenario.suitVals));
    });
    tileEl.classList.add('chosen');

    renderFeedback(tier, index, yourGenbutsu);
    renderSession();
  }

  function renderFeedback(tier, chosen, yourGenbutsu) {
    const fb = $('d-feedback');
    fb.hidden = false;
    const cls = tier === 'dealin' ? 'bad' : tier === 'safe-best' ? 'good' : 'warn';
    fb.className = 'feedback ' + cls;

    const waitStr = scenario.waitArr.map(tileName).join(', ');
    const heads = { 'dealin': '✗ You dealt in!', 'safe-best': '✓ Safe — genbutsu', 'gamble': '○ Safe, but you gambled' };
    let html = `<h3>${heads[tier]}</h3>`;

    if (tier === 'dealin') {
      html += `<div class="row"><strong>${tileName(chosen)}</strong> was one of West's winning tiles. West was waiting on <strong>${waitStr}</strong>.</div>`;
      if (yourGenbutsu) html += `<div class="row note">A genbutsu (a tile West already discarded) was sitting in your hand — those can never deal in.</div>`;
    } else if (tier === 'safe-best') {
      html += `<div class="row">West discarded <strong>${tileName(chosen)}</strong> earlier, so the furiten rule means they can never win on it — a guaranteed-safe discard.</div>`;
      html += `<div class="row note">West was in fact waiting on ${waitStr}.</div>`;
    } else {
      html += `<div class="row"><strong>${tileName(chosen)}</strong> happened to miss West's wait (${waitStr}) — but it wasn't provably safe. A <strong>genbutsu</strong> discard was guaranteed.</div>`;
    }
    html += `<div class="legend"><span class="lg cls-genbutsu">genbutsu · safe</span><span class="lg cls-suji">suji · likely</span><span class="lg cls-dealin">deal-in · danger</span><span class="lg cls-live">live · unknown</span></div>`;
    fb.innerHTML = html;
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('d-newDeal').addEventListener('click', newDeal);
  $('d-difficulty').addEventListener('change', newDeal);
  $('d-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-defense').hidden) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') newDeal();
    else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newDeal(); }
  });

  newDeal();
})();
