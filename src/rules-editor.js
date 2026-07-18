/* Rules editor — edit the active Singapore scoring rule set.
 * Depends on globals: DEFAULT_RULES, loadRules, saveRules (rules.js),
 * and window.__valueRefresh (value.js) to re-render the Value trainer.
 * IIFE-wrapped to avoid global collisions. */
(function () {
  const $ = (id) => document.getElementById(id);

  const GROUPS = [
    { title: 'Winning', items: [
      { key: 'minTai', label: 'Minimum tai to win', hint: '1 = a no-tai (chicken) hand cannot win; 0 allows it', min: 0 },
      { key: 'limit', label: 'Tai limit (cap 满)', hint: 'hands worth more pay this', min: 1 },
    ]},
    { title: 'Situational', items: [
      { key: 'zimo', label: 'Self-draw 自摸' },
    ]},
    { title: 'Honour pongs', items: [
      { key: 'seatWind', label: 'Seat wind 门风' },
      { key: 'roundWind', label: 'Round wind 圈风' },
      { key: 'dragon', label: 'Dragon pong 三元 (each)' },
    ]},
    { title: 'Hand shapes', items: [
      { key: 'pinghu', label: 'Ping hu 平胡' },
      { key: 'allPongs', label: 'All pongs 对对胡' },
      { key: 'halfFlush', label: 'Half flush 混一色' },
      { key: 'fullFlush', label: 'Full flush 清一色' },
    ]},
    { title: 'Limit hands', items: [
      { key: 'allHonors', label: 'All honours 字一色' },
      { key: 'smallThreeDragons', label: 'Small three dragons 小三元' },
      { key: 'bigThreeDragons', label: 'Big three dragons 大三元' },
    ]},
    { title: 'Bonus tiles', items: [
      { key: 'seatFlower', label: 'Seat flower/season (each)' },
    ]},
  ];

  const form = $('rules-form');

  function build() {
    const rules = loadRules();
    form.innerHTML = GROUPS.map((g) => `
      <fieldset class="rule-group">
        <legend>${g.title}</legend>
        ${g.items.map((it) => `
          <label class="rule-row">
            <span class="rule-label">${it.label}${it.hint ? `<span class="rule-hint">${it.hint}</span>` : ''}</span>
            <input type="number" inputmode="numeric" step="1" min="${it.min ?? 0}"
                   data-key="${it.key}" value="${rules[it.key]}" />
          </label>`).join('')}
      </fieldset>`).join('');
    $('rules-name').textContent = rules.name;
  }

  function apply() {
    const rules = loadRules();
    form.querySelectorAll('input[data-key]').forEach((inp) => {
      const v = parseInt(inp.value, 10);
      if (!Number.isNaN(v) && v >= 0) rules[inp.dataset.key] = v;
    });
    saveRules(rules);
    if (window.__valueRefresh) window.__valueRefresh();
    flashSaved();
  }

  function reset() {
    saveRules(Object.assign({}, DEFAULT_RULES));
    build();
    if (window.__valueRefresh) window.__valueRefresh();
    flashSaved();
  }

  let flashTimer = null;
  function flashSaved() {
    const s = $('rules-saved');
    s.classList.add('show');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => s.classList.remove('show'), 1300);
  }

  form.addEventListener('change', apply);
  $('rules-reset').addEventListener('click', reset);
  build();
})();
