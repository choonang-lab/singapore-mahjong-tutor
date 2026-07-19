/* Module 6 — Best Plan trainer.
 * Depends on globals: shanten (engine.js); analyzePlans (plan.js); loadRules (rules.js).
 * IIFE-wrapped to avoid global collisions. */
(function () {
  const $ = (id) => document.getElementById(id);

  function glyph(i) {
    if (i < 9)  return String.fromCodePoint(0x1F007 + i);
    if (i < 18) return String.fromCodePoint(0x1F019 + (i - 9));
    if (i < 27) return String.fromCodePoint(0x1F010 + (i - 18));
    return String.fromCodePoint([0x1F000, 0x1F001, 0x1F002, 0x1F003, 0x1F004, 0x1F005, 0x1F006][i - 27]);
  }
  function tileClass(i) { return i === 31 ? 'dragon-red' : i === 32 ? 'dragon-green' : ''; }
  const randInt = (n) => Math.floor(Math.random() * n);
  const CTX = { seatWind: 0, roundWind: 0 };
  const DRAWS = { easy: 11, medium: 8, hard: 5 };
  const LABELS = { fastest: 'Fastest', fullFlush: 'Full flush', halfFlush: 'Half flush', allPongs: 'All pongs' };

  // ---- state ----
  let hand = null, plans = null, draws = 8, answered = false, streak = 0;
  const STATS_KEY = 'sgmj-plan-stats-v1';
  const fresh = () => ({ played: 0, correct: 0, bestStreak: 0 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } };
  let stats = load();

  function genHand(rules) {
    for (let a = 0; a < 600; a++) {
      const theme = randInt(3);
      const counts = new Array(34).fill(0);
      let n = 0;
      while (n < 13) {
        const t = Math.random() < 0.72 ? theme * 9 + randInt(9) : randInt(34);
        if (counts[t] >= 4) continue;
        counts[t]++; n++;
      }
      if (shanten(counts) < 0) continue;
      const p = analyzePlans(counts, CTX, rules, draws);
      const byType = Object.fromEntries(p.map((x) => [x.type, x]));
      const fast = byType.fastest.shanten;
      const flush = Math.min(byType.fullFlush.shanten, byType.halfFlush.shanten);
      // keep it a genuine decision: hand not too far, and a value direction is competitive
      if (fast < 1 || fast > 3) continue;
      if (flush > fast + 2) continue;
      return { counts, plans: p };
    }
    return null;
  }

  function newDeal() {
    const rules = loadRules();
    draws = DRAWS[$('pl-difficulty').value] || 8;
    let g = null;
    for (let i = 0; i < 6 && !g; i++) g = genHand(rules);
    if (!g) return;
    hand = g.counts; plans = g.plans; answered = false;
    render();
  }

  // ---- rendering ----
  function handList(counts) { const l = []; for (let i = 0; i < 34; i++) for (let x = 0; x < counts[i]; x++) l.push(i); return l; }

  function render() {
    $('pl-context').innerHTML = `<span class="chip">≈ <strong>${draws}</strong> draws left this hand</span>`;
    const handEl = $('pl-hand');
    handEl.innerHTML = '';
    handList(hand).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile ${tileClass(i)}`.trim();
      t.textContent = glyph(i);
      handEl.appendChild(t);
    });

    const box = $('pl-choices');
    box.innerHTML = '';
    ['fastest', 'fullFlush', 'halfFlush', 'allPongs'].forEach((type) => {
      const b = document.createElement('button');
      b.className = 'plan-btn';
      b.textContent = LABELS[type];
      b.dataset.type = type;
      b.addEventListener('click', () => onChoose(type, b));
      box.appendChild(b);
    });
    $('pl-feedback').hidden = true;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('pl-session').textContent = 'No hands played yet this session.'; return; }
    const pct = Math.round((stats.correct / stats.played) * 100);
    $('pl-session').innerHTML = `<strong>${pct}%</strong> right over ${stats.played} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onChoose(type, btn) {
    if (answered) return;
    answered = true;
    const best = plans[0];
    const chosen = plans.find((p) => p.type === type);
    // credit an exact tie on EV as correct too
    const correct = Math.abs(chosen.ev - best.ev) < 1e-9;

    stats.played++;
    if (correct) { stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();

    document.querySelectorAll('.plan-btn').forEach((b) => {
      b.classList.add('locked');
      if (b.dataset.type === best.type) b.classList.add('is-best');
    });
    if (!correct) btn.classList.add('wrong');

    renderFeedback(chosen, best, correct);
    renderSession();
  }

  function pctStr(p) { return `${Math.round(p * 100)}%`; }

  function renderFeedback(chosen, best, correct) {
    const fb = $('pl-feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (correct ? 'good' : 'bad');

    let html = `<h3>${correct ? '✓' : '✗'} Best direction: <strong>${LABELS[best.type]}</strong>${best.suit !== null ? ` (${['Characters', 'Circles', 'Bamboo'][best.suit]})` : ''}</h3>`;
    html += `<table class="plan-table"><thead><tr><th>Direction</th><th>Shanten</th><th>Accepts</th><th>≈ Value</th><th>Win%</th><th>EV</th></tr></thead><tbody>`;
    for (const p of plans) {
      const cls = (p.type === best.type ? ' class="best"' : (p.type === chosen.type ? ' class="chosen"' : ''));
      html += `<tr${cls}><td>${LABELS[p.type]}${p.suit !== null ? ` <span class="suit-tag">${['m', 'p', 's'][p.suit]}</span>` : ''}</td>` +
        `<td>${p.shanten}</td><td>${p.ukeire}</td><td>${p.value} tai</td><td>${pctStr(p.pWin)}</td><td class="ev">${p.ev.toFixed(2)}</td></tr>`;
    }
    html += `</tbody></table>`;
    html += `<div class="row note">EV ≈ win-chance × value. Win-chance comes from shanten &amp; acceptance over ~${draws} draws; value is the plan's characteristic tai plus honours you already hold. This is the analytic estimate — run the simulation below to sharpen it.</div>`;
    html += `<button id="pl-mc-btn" class="mc-run" type="button">▶ Run Monte Carlo — real win rates &amp; tai spread</button><div id="pl-mc"></div>`;
    fb.innerHTML = html;
    $('pl-mc-btn').addEventListener('click', runMC);
  }

  // ---- Monte Carlo (tier 3): fast enough (~40ms) to run inline on the main thread ----
  const N_ROLLOUTS = 1500;
  function runMC() {
    const btn = $('pl-mc-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Simulating…';
    setTimeout(() => {
      const rules = loadRules();
      const suit = (plans.find((p) => p.suit != null) || {}).suit ?? 0;
      const specs = [
        { type: 'fastest', opts: {} },
        { type: 'fullFlush', opts: { suit, honors: false } },
        { type: 'halfFlush', opts: { suit, honors: true } },
        { type: 'allPongs', opts: { chow: false } },
      ];
      const res = {};
      for (const s of specs) res[s.type] = runRollouts(hand, s.opts, rules, draws, N_ROLLOUTS, 20240719);
      renderMC(res, specs);
    }, 20);
  }

  function renderMC(res, specs) {
    const ranked = specs.map((s) => ({ type: s.type, ...res[s.type] })).sort((a, b) => b.evMC - a.evMC);
    const mcBest = ranked[0].type;
    const analyticBest = plans[0].type;

    let html = `<div class="mc-block"><div class="mc-head">Monte Carlo · ${N_ROLLOUTS} rollouts <span>— real win rate &amp; value spread</span></div><div class="mc-rows">`;
    for (const r of ranked) {
      html += `<div class="mc-row${r.type === mcBest ? ' best' : ''}">` +
        `<span class="mc-dir">${LABELS[r.type]}</span>` +
        `<span class="mc-num">${Math.round(r.winRate * 100)}% win</span>` +
        `<span class="mc-num">${r.meanTai.toFixed(1)} avg tai</span>` +
        `<span class="mc-num ev">EV ${r.evMC.toFixed(2)}</span></div>`;
    }
    html += `</div>`;

    // tai histogram for the MC-best direction
    const hist = ranked[0].hist;
    const keys = Object.keys(hist).map(Number).sort((a, b) => a - b);
    if (keys.length) {
      const max = Math.max(...keys.map((k) => hist[k]));
      html += `<div class="mc-hist"><div class="mc-hist-label">Tai when ${LABELS[mcBest]} wins:</div>`;
      for (const k of keys) {
        html += `<div class="hbar"><span class="hbar-k">${k} tai</span>` +
          `<span class="hbar-track"><span class="hbar-fill" style="width:${(hist[k] / max) * 100}%"></span></span>` +
          `<span class="hbar-n">${hist[k]}</span></div>`;
      }
      html += `</div>`;
    }

    html += `<div class="row note">${mcBest === analyticBest
      ? `Monte Carlo <strong>agrees</strong> the best direction is <strong>${LABELS[mcBest]}</strong> — now with a real win rate and the actual spread of tai.`
      : `Monte Carlo recommends <strong>${LABELS[mcBest]}</strong>, not the analytic pick <strong>${LABELS[analyticBest]}</strong>. The analytic model overrates a wide-but-cheap hand's win rate; trust the simulation.`}
      No opponents are modelled, so absolute win rates are a little optimistic — but the comparison is sound.</div></div>`;

    $('pl-mc').innerHTML = html;
    const btn = $('pl-mc-btn');
    if (btn) btn.textContent = `✓ Simulated · ${N_ROLLOUTS} rollouts`;
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('pl-newDeal').addEventListener('click', newDeal);
  $('pl-difficulty').addEventListener('change', newDeal);
  $('pl-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-plan').hidden) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') newDeal();
    else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newDeal(); }
  });

  window.__planRefresh = newDeal;
  newDeal();
})();
