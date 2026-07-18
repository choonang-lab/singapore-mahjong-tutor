/* Module 5 — Push / Fold trainer.
 * Depends on globals: shanten, waits (engine.js); scoreHand (scorer.js);
 * loadRules (rules.js); riverValuesBySuit (defense.js);
 * DANGER, dangerClass, winProb, decide (pushfold.js). IIFE-wrapped. */
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
  const CTX = { seatWind: 0, roundWind: 0, selfDraw: false }; // fixed context (illustrative)

  // ---- state ----
  let sc = null, answered = false, streak = 0;
  const STATS_KEY = 'sgmj-pushfold-stats-v1';
  const fresh = () => ({ played: 0, correct: 0, bestStreak: 0 });
  const load = () => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } };
  const save = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } };
  let stats = load();

  // ---- generation ----
  function buildTenpai() {
    for (let a = 0; a < 400; a++) {
      const c = new Array(34).fill(0);
      let ok = true;
      const add = (t, n) => { c[t] += n; if (c[t] > 4) ok = false; };
      add(randInt(34), 2);
      for (let k = 0; k < 3 && ok; k++) {
        if (Math.random() < 0.6) { const s = randInt(3) * 9 + randInt(7); add(s, 1); add(s + 1, 1); add(s + 2, 1); }
        else add(randInt(34), 3);
      }
      if (ok) { const lo = 2 + randInt(6); const base = randInt(3) * 9; add(base + lo - 1, 1); add(base + lo, 1); }
      let total = 0; for (let i = 0; i < 34; i++) total += c[i];
      if (ok && total === 13 && shanten(c) === 0 && waits(c).length) return c;
    }
    return null;
  }

  // best tai over legal (>= minTai) winning tiles
  function bestValue(counts13, rules) {
    const w = waits(counts13);
    let maxTai = -1; const valid = [];
    for (const t of w) {
      counts13[t]++;
      const r = scoreHand(counts13, CTX, rules);
      counts13[t]--;
      if (r.total >= rules.minTai) { valid.push(t); if (r.total > maxTai) maxTai = r.total; }
    }
    return { valid, maxTai };
  }

  function gen(difficulty) {
    const rules = loadRules();
    const chances = difficulty === 'easy' ? 9 : difficulty === 'hard' ? 6 : 7;
    for (let attempt = 0; attempt < 300; attempt++) {
      const you = buildTenpai();
      if (!you) continue;
      const yv = bestValue(you, rules);
      if (!yv.valid.length || yv.maxTai < rules.minTai) continue;   // dead tenpai — can't legally win
      const yourWaits = new Set(yv.valid);

      const opp = buildTenpai();
      if (!opp) continue;
      const oppWaitSet = new Set(waits(opp));
      const ov = bestValue(opp, rules);
      if (ov.maxTai < rules.minTai) continue;                        // West must be a real threat

      // West's furiten-consistent river
      const used = you.map((n, i) => n + opp[i]);
      const nRiver = 8;
      const river = []; let guard = 0;
      while (river.length < nRiver && guard < 500) {
        guard++;
        const t = randInt(34);
        if (oppWaitSet.has(t) || used[t] >= 4) continue;
        used[t]++; river.push(t);
      }
      const riverSet = new Set(river);
      const suitVals = riverValuesBySuit(river);

      // the drawn tile X you'd throw to keep tenpai: not your winning tile, non-genbutsu (has risk)
      let X = -1; let g2 = 0;
      while (g2 < 400) {
        g2++;
        const t = randInt(34);
        if (yourWaits.has(t) || riverSet.has(t) || used[t] >= 4) continue;
        X = t; used[t]++; break;
      }
      if (X < 0) continue;

      const outs = yv.valid.reduce((n, t) => n + Math.max(0, 4 - you[t] - (riverSet.has(t) ? river.filter((r) => r === t).length : 0)), 0);
      const unseen = 136 - 13 - 1 - river.length;                    // your 13 + drawn X + river
      const pWin = winProb(outs, unseen, chances);
      const dClass = dangerClass(X, riverSet, suitVals);
      const pDeal = DANGER[dClass];
      // committing to push means several risky discards, not just this one
      const pushes = Math.max(1, Math.round(chances / 2));
      const pRisk = cumulativeRisk(pDeal, pushes);
      const vYou = yv.maxTai, vOpp = ov.maxTai;
      const d = decide(pWin, vYou, pRisk, vOpp);

      return {
        you, drawn: X, river, riverSet, suitVals, chances, outs, unseen,
        yourWaits: yv.valid, vYou, vOpp, pWin, pDeal, pRisk, pushes, dClass,
        ev: d.ev, best: d.best, close: d.close,
        actualDealIn: oppWaitSet.has(X), oppWait: [...oppWaitSet],
      };
    }
    return null;
  }

  function newDeal() {
    const difficulty = $('p-difficulty').value;
    let s = null;
    for (let i = 0; i < 6 && !s; i++) s = gen(difficulty);
    if (!s) return;
    sc = s; answered = false;
    render();
  }

  // ---- rendering ----
  function handList(counts) { const l = []; for (let i = 0; i < 34; i++) for (let n = 0; n < counts[i]; n++) l.push(i); return l; }
  function pctStr(p) { return `${Math.round(p * 100)}%`; }

  function render() {
    $('p-yours').innerHTML =
      `<span class="chip">Your hand ≈ <strong>${sc.vYou} tai</strong></span>` +
      `<span class="chip">Wait: <strong>${sc.yourWaits.map(tileName).join(', ')}</strong> · ${sc.outs} live</span>` +
      `<span class="chip">≈ <strong>${sc.chances}</strong> chances left</span>`;
    $('p-threat').innerHTML =
      `<span class="chip danger">🀄 Opponent is tenpai ≈ <strong>${sc.vOpp} tai</strong></span>`;

    const handEl = $('p-hand');
    handEl.innerHTML = '';
    handList(sc.you).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile ${tileClass(i)}`.trim();
      t.textContent = glyph(i); t.title = tileName(i);
      handEl.appendChild(t);
    });

    const drawEl = $('p-drawn');
    drawEl.innerHTML = '';
    const dt = document.createElement('div');
    dt.className = `tile drawn ${tileClass(sc.drawn)}`.trim();
    dt.textContent = glyph(sc.drawn); dt.title = tileName(sc.drawn);
    drawEl.appendChild(dt);

    const riverEl = $('p-river');
    riverEl.innerHTML = '';
    sc.river.forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile mini-river ${tileClass(i)}`.trim();
      t.textContent = glyph(i); t.title = tileName(i);
      riverEl.appendChild(t);
    });

    $('p-push').disabled = false; $('p-fold').disabled = false;
    $('p-feedback').hidden = true;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('p-session').textContent = 'No decisions played yet this session.'; return; }
    const pct = Math.round((stats.correct / stats.played) * 100);
    $('p-session').innerHTML = `<strong>${pct}%</strong> right over ${stats.played} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onChoose(choice) {
    if (answered) return;
    answered = true;
    const correct = choice === sc.best;
    stats.played++;
    if (correct) { stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();
    $('p-push').disabled = true; $('p-fold').disabled = true;
    $('p-push').classList.toggle('is-best', sc.best === 'push');
    $('p-fold').classList.toggle('is-best', sc.best === 'fold');
    renderFeedback(choice, correct);
    renderSession();
  }

  function renderFeedback(choice, correct) {
    const fb = $('p-feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (correct ? 'good' : 'bad');

    const reward = sc.pWin * sc.vYou, risk = sc.pRisk * sc.vOpp;
    const evSign = sc.ev >= 0 ? '+' : '−';
    let html = `<h3>${correct ? '✓' : '✗'} ${sc.best === 'push' ? 'Push' : 'Fold'} was better${sc.close ? ' — but it\'s close' : ''}</h3>`;
    html += `<div class="ev-calc">`;
    html += `<div class="ev-row"><span>Reward — P(win) ${pctStr(sc.pWin)} × ${sc.vYou} tai</span><span class="tai">+${reward.toFixed(2)}</span></div>`;
    html += `<div class="ev-row"><span>Risk — P(deal in) ${pctStr(sc.pRisk)} (${sc.dClass.replace('-', ' ')}, ~${sc.pushes} risky discards) × ${sc.vOpp} tai</span><span class="tai neg">−${risk.toFixed(2)}</span></div>`;
    html += `<div class="ev-row sum"><span>Push EV</span><span class="tai">${evSign}${Math.abs(sc.ev).toFixed(2)}</span></div>`;
    html += `<div class="ev-row"><span>Fold EV</span><span class="tai">0</span></div>`;
    html += `</div>`;
    html += `<div class="row">${sc.ev > 0
      ? 'Your hand\'s expected gain outweighs the deal-in risk — <strong>push</strong>.'
      : 'The deal-in risk outweighs your hand\'s expected gain — <strong>fold</strong>.'}</div>`;

    // decision vs outcome — depends on both the correct call and what actually happened
    const drew = tileName(sc.drawn);
    const wait = sc.oppWait.map(tileName).join(', ');
    let note;
    if (sc.actualDealIn) {
      note = sc.best === 'push'
        ? `Pushing was the +EV call — the right decision — even though the drawn <strong>${drew}</strong> would have <strong>dealt in</strong> this time (they waited on ${wait}). Judge the choice, not the result.`
        : `And the drawn <strong>${drew}</strong> would have <strong>dealt in</strong> (they waited on ${wait}) — folding was right on both counts.`;
    } else {
      note = sc.best === 'push'
        ? `Here pushing was both the +EV call and safe — the drawn <strong>${drew}</strong> missed their wait (${wait}).`
        : `The drawn <strong>${drew}</strong> would have been safe this time (they waited on ${wait}), but a lucky-safe tile doesn't make a −EV push correct. Judge the choice, not the result.`;
    }
    html += `<div class="row note">${note}</div>`;
    fb.innerHTML = html;
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('p-push').addEventListener('click', () => onChoose('push'));
  $('p-fold').addEventListener('click', () => onChoose('fold'));
  $('p-newDeal').addEventListener('click', newDeal);
  $('p-difficulty').addEventListener('change', newDeal);
  $('p-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-pushfold').hidden) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'p' && !answered) onChoose('push');
    else if (k === 'f' && !answered) onChoose('fold');
    else if (k === 'n') newDeal();
    else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newDeal(); }
  });

  window.__pushfoldRefresh = newDeal;
  newDeal();
})();
