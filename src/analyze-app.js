/* Analyze — enter your real hand + what's already visible + draws left, and get
 * a live plan ranking and opponent-aware Monte Carlo for YOUR situation.
 * Depends on globals: analyzePlans, dominantSuit (plan.js); loadRules (rules.js);
 * mcTwoStage, mcBlockHTML, planTableHTML, PLAN_LABELS (plan-render.js). IIFE. */
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
  const SUITNAME = ['Characters', 'Circles', 'Bamboo'];

  const hand = new Array(34).fill(0);
  const seen = new Array(34).fill(0);
  let activeZone = 'hand';
  let lastPlans = null;

  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const listOf = (c) => { const l = []; for (let i = 0; i < 34; i++) for (let n = 0; n < c[i]; n++) l.push(i); return l; };

  function renderZone(id, counts) {
    const el = $(id);
    el.innerHTML = '';
    listOf(counts).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile mini-river ${tileClass(i)}`.trim();
      t.textContent = glyph(i); t.title = 'Remove ' + tileName(i);
      t.addEventListener('click', () => { counts[i]--; refresh(); });
      el.appendChild(t);
    });
  }

  function renderPalette() {
    const pal = $('az-palette');
    pal.innerHTML = '';
    for (let row = 0; row < 4; row++) {
      const r = document.createElement('div');
      r.className = 'az-prow';
      const lo = row * 9, hi = row === 3 ? 34 : lo + 9;
      for (let i = lo; i < hi; i++) {
        const remain = 4 - hand[i] - seen[i];
        const b = document.createElement('button');
        b.className = `tile az-ptile ${tileClass(i)}`.trim();
        b.type = 'button';
        b.innerHTML = `${glyph(i)}<span class="az-remain">${remain}</span>`;
        b.title = tileName(i);
        b.disabled = remain <= 0 || (activeZone === 'hand' && sum(hand) >= 13);
        b.addEventListener('click', () => {
          if (4 - hand[i] - seen[i] <= 0) return;
          if (activeZone === 'hand') { if (sum(hand) >= 13) return; hand[i]++; } else seen[i]++;
          refresh();
        });
        r.appendChild(b);
      }
      pal.appendChild(r);
    }
  }

  function refresh() {
    renderZone('az-hand', hand);
    renderZone('az-seen', seen);
    renderPalette();
    const hc = sum(hand);
    $('az-hand-count').textContent = `${hc} / 13`;
    $('az-hand-count').classList.toggle('ready', hc === 13);
    $('az-seen-count').textContent = sum(seen);
    $('az-analyze').disabled = hc !== 13;
  }

  function analyze() {
    const rules = loadRules();
    const draws = Math.max(1, Math.min(18, parseInt($('az-draws').value, 10) || 8));
    const plans = analyzePlans(hand, { seatWind: 0, roundWind: 0 }, rules, draws, seen);
    lastPlans = plans;
    const best = plans[0];
    let html = `<h3>Best direction: <strong>${PLAN_LABELS[best.type]}</strong>${best.suit != null ? ` (${SUITNAME[best.suit]})` : ''}</h3>`;
    html += planTableHTML(plans);
    html += `<div class="row note">EV ≈ win-chance × value over ~${draws} draws, counting only your <strong>live</strong> tiles (${sum(seen)} visible tiles removed). This is the analytic estimate — run the simulation to account for opponents.</div>`;
    html += `<button id="az-mc-btn" class="mc-run" type="button">▶ Run Monte Carlo — vs 3 opponents</button><div id="az-mc"></div>`;
    const box = $('az-result');
    box.className = 'feedback';
    box.hidden = false;
    box.innerHTML = html;
    $('az-mc-btn').addEventListener('click', runMC);
    box.scrollIntoView({ block: 'start' });
  }

  function runMC() {
    const btn = $('az-mc-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Simulating…';
    setTimeout(() => {
      const rules = loadRules();
      const draws = Math.max(1, Math.min(18, parseInt($('az-draws').value, 10) || 8));
      const { res, contenders } = mcTwoStage(hand, seen, rules, draws, dominantSuit(hand));
      $('az-mc').innerHTML = mcBlockHTML(res, contenders, lastPlans[0].type);
      btn.textContent = '✓ Simulated';
    }, 20);
  }

  function clearAll() { hand.fill(0); seen.fill(0); $('az-result').hidden = true; refresh(); }

  // ---- wire up ----
  document.querySelectorAll('.az-target-btn').forEach((b) => b.addEventListener('click', () => {
    activeZone = b.dataset.zone;
    document.querySelectorAll('.az-target-btn').forEach((x) => x.classList.toggle('active', x === b));
    renderPalette();
  }));
  $('az-analyze').addEventListener('click', analyze);
  $('az-clear').addEventListener('click', clearAll);
  refresh();
})();
