/* Module 2 — Value Trainer.
 * Depends on globals: scoreHand (scorer.js), DEFAULT_RULES (rules.js).
 * Wrapped in an IIFE so its locals never collide with app.js globals. */
(function () {
  let RULES = loadRules();   // active (possibly edited) rules; refreshed each new hand
  const $ = (id) => document.getElementById(id);

  // ---- tiles ----
  function glyph(i) {
    if (i < 9)  return String.fromCodePoint(0x1F007 + i);
    if (i < 18) return String.fromCodePoint(0x1F019 + (i - 9));
    if (i < 27) return String.fromCodePoint(0x1F010 + (i - 18));
    return String.fromCodePoint([0x1F000, 0x1F001, 0x1F002, 0x1F003, 0x1F004, 0x1F005, 0x1F006][i - 27]);
  }
  function tileClass(i) { return i === 31 ? 'dragon-red' : i === 32 ? 'dragon-green' : ''; }
  const WIND = ['East', 'South', 'West', 'North'];

  // ---- state ----
  let hand = null;       // 34-count winning hand
  let ctx = null;        // context
  let result = null;     // scoreHand result
  let answered = false;
  let streak = 0;

  const STATS_KEY = 'sgmj-value-stats-v1';
  function fresh() { return { played: 0, correct: 0, bestStreak: 0 }; }
  function load() { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch { return fresh(); } }
  function save() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ } }
  let stats = load();

  // ---- random winning-hand generation ----
  function randInt(n) { return Math.floor(Math.random() * n); }

  function tryBuild(difficulty) {
    const counts = new Array(34).fill(0);
    const suitLock = (difficulty === 'hard' && Math.random() < 0.45) ? randInt(3) : null; // flush theme
    const forcePong = (difficulty === 'hard' && Math.random() < 0.4);
    const pChow = difficulty === 'easy' ? 0.85 : difficulty === 'medium' ? 0.65 : 0.45;

    const addN = (tile, n) => { counts[tile] += n; return counts[tile] <= 4; };

    // pair
    const pairTile = suitLock !== null ? suitLock * 9 + randInt(9) : randInt(34);
    if (!addN(pairTile, 2)) return null;

    for (let k = 0; k < 4; k++) {
      const wantChow = !forcePong && Math.random() < pChow;
      if (wantChow) {
        const suit = suitLock !== null ? suitLock : randInt(3);
        const start = suit * 9 + randInt(7);           // 0..6 within suit
        if (!(addN(start, 1) && addN(start + 1, 1) && addN(start + 2, 1))) return null;
      } else {
        const tile = suitLock !== null ? suitLock * 9 + randInt(9) : randInt(34);
        if (!addN(tile, 3)) return null;
      }
    }
    return counts;
  }

  function genContext(difficulty) {
    return {
      seatWind: randInt(4),
      roundWind: difficulty === 'easy' ? 0 : randInt(4),
      selfDraw: Math.random() < (difficulty === 'easy' ? 0.35 : 0.5),
      seatFlowers: difficulty === 'easy' ? 0 : (Math.random() < 0.3 ? 1 : 0),
    };
  }

  function accept(difficulty, total, capped) {
    if (total < RULES.minTai) return false;         // must be a legal win under active rules
    if (difficulty === 'easy') return total <= Math.max(2, RULES.minTai);
    if (difficulty === 'hard') return total >= 3;
    return true;
  }

  function newHand() {
    RULES = loadRules();                            // pick up any edits from the Rules screen
    const difficulty = $('v-difficulty').value;
    for (let attempt = 0; attempt < 500; attempt++) {
      const c = tryBuild(difficulty);
      if (!c) continue;
      const context = genContext(difficulty);
      const res = scoreHand(c, context, RULES);
      if (!res.isWin) continue;
      if (!accept(difficulty, res.total, res.capped)) continue;
      hand = c; ctx = context; result = res;
      answered = false;
      render();
      return;
    }
    // fallback: any hand that is a legal win under the active rules
    let c; let context; let res;
    for (let n = 0; n < 500; n++) {
      c = tryBuild(difficulty);
      if (!c) continue;
      context = genContext(difficulty);
      res = scoreHand(c, context, RULES);
      if (res.isWin && res.total >= RULES.minTai) break;
    }
    hand = c; ctx = context; result = res; answered = false; render();
  }

  // ---- rendering ----
  function handList(counts) {
    const list = [];
    for (let i = 0; i < 34; i++) for (let n = 0; n < counts[i]; n++) list.push(i);
    return list;
  }

  function render() {
    // context chips
    const chips = [
      `Seat <strong>${WIND[ctx.seatWind]}</strong>`,
      `Round <strong>${WIND[ctx.roundWind]}</strong>`,
      ctx.selfDraw ? 'Won by <strong>self-draw</strong>' : 'Won <strong>by discard</strong>',
    ];
    if (ctx.seatFlowers) chips.push(`Flowers <strong>${ctx.seatFlowers}</strong>`);
    $('v-context').innerHTML = chips.map((c) => `<span class="chip">${c}</span>`).join('');

    // hand
    const el = $('v-hand');
    el.innerHTML = '';
    handList(hand).forEach((i) => {
      const t = document.createElement('div');
      t.className = `tile ${tileClass(i)}`.trim();
      t.textContent = glyph(i);
      el.appendChild(t);
    });

    // choices 0..limit
    const box = $('v-choices');
    box.innerHTML = '';
    for (let v = 0; v <= RULES.limit; v++) {
      const b = document.createElement('button');
      b.className = 'tai-btn';
      b.textContent = v === RULES.limit ? `${v}+` : `${v}`;
      b.dataset.val = v;
      b.addEventListener('click', () => onAnswer(v, b));
      box.appendChild(b);
    }

    $('v-feedback').hidden = true;
    $('v-rules-note').textContent = `Active rules: ${RULES.name}. ${RULES.note}`;
    renderSession();
  }

  function renderSession() {
    if (stats.played === 0) { $('v-session').textContent = 'No hands scored yet this session.'; return; }
    const pct = Math.round((stats.correct / stats.played) * 100);
    const hands = `${stats.played} hand${stats.played === 1 ? '' : 's'}`;
    $('v-session').innerHTML = `<strong>${pct}%</strong> correct over ${hands} · streak <strong>${streak}</strong> · best <strong>${stats.bestStreak}</strong>`;
  }

  function onAnswer(val, btn) {
    if (answered) return;
    answered = true;
    const correct = result.capped;
    const isRight = val === correct;

    stats.played++;
    if (isRight) { stats.correct++; streak++; stats.bestStreak = Math.max(stats.bestStreak, streak); }
    else streak = 0;
    save();

    document.querySelectorAll('.tai-btn').forEach((b) => {
      b.classList.add('locked');
      if (+b.dataset.val === correct) b.classList.add('right');
    });
    if (!isRight) btn.classList.add('wrong');

    renderFeedback(isRight);
    renderSession();
  }

  function renderFeedback(isRight) {
    const fb = $('v-feedback');
    fb.hidden = false;
    fb.className = 'feedback ' + (isRight ? 'good' : 'bad');

    const capNote = result.capped < result.total
      ? ` <span class="cap-note">(capped from ${result.total} at the ${result.limit}-tai limit)</span>` : '';

    let html = `<h3>${isRight ? '✓ Correct' : '✗ Not quite'} — worth <strong>${result.capped} tai</strong>${capNote}</h3>`;
    if (result.items.length === 0) {
      const legal = RULES.minTai === 0
        ? ' Still a legal win here.'
        : ` Under these rules it <strong>cannot win</strong> (needs at least ${RULES.minTai} tai).`;
      html += `<div class="row note">A chicken hand (鸡胡) — no scoring elements, worth 0 tai.${legal}</div>`;
    } else {
      html += '<ul class="breakdown">' +
        result.items.map((it) => `<li><span>${it.name}</span><span class="tai">+${it.tai}</span></li>`).join('') +
        `<li class="sum"><span>Total</span><span class="tai">${result.total}${result.capped < result.total ? ` → ${result.capped}` : ''}</span></li>` +
        '</ul>';
    }
    fb.innerHTML = html;
  }

  function reveal() {
    if (answered) return;
    // treat as an answer with no guess: reveal without scoring the streak as correct
    answered = true;
    stats.played++;
    streak = 0;
    save();
    const correct = result.capped;
    document.querySelectorAll('.tai-btn').forEach((b) => {
      b.classList.add('locked');
      if (+b.dataset.val === correct) b.classList.add('right');
    });
    renderFeedback(false);
    renderSession();
  }

  function resetStats() { stats = fresh(); streak = 0; save(); renderSession(); }

  // ---- wire up ----
  $('v-newHand').addEventListener('click', newHand);
  $('v-reveal').addEventListener('click', reveal);
  $('v-difficulty').addEventListener('change', newHand);
  $('v-reset').addEventListener('click', resetStats);

  document.addEventListener('keydown', (e) => {
    if ($('module-value').hidden) return;               // only when this module is active
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'n' || e.key === 'N') newHand();
    else if (e.key === 'r' || e.key === 'R') reveal();
    else if (/^[0-9]$/.test(e.key) && !answered) {
      const v = Math.min(+e.key, RULES.limit);
      const btn = document.querySelector(`.tai-btn[data-val="${v}"]`);
      if (btn) btn.click();
    } else if ((e.key === 'Enter' || e.key === ' ') && answered) { e.preventDefault(); newHand(); }
  });

  window.__valueRefresh = newHand;   // let the Rules editor re-render after changes
  newHand();
})();
