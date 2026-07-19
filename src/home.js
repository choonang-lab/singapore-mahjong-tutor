/* Home screen — shows per-module progress from each trainer's saved stats.
 * Reads the same localStorage keys the modules write. IIFE-wrapped. */
(function () {
  function read(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

  const SOURCES = {
    eff: () => {
      const s = read('sgmj-eff-stats-v1');
      return s && s.played ? `${s.played} hand${s.played === 1 ? '' : 's'} · ${pct(s.optimal, s.played)}% optimal` : null;
    },
    value: () => {
      const s = read('sgmj-value-stats-v1');
      return s && s.played ? `${s.played} hand${s.played === 1 ? '' : 's'} · ${pct(s.correct, s.played)}% correct` : null;
    },
    bonus: () => {
      const s = read('sgmj-bonus-stats-v1');
      return s && s.played ? `${s.played} deal${s.played === 1 ? '' : 's'} · ${pct(s.correct, s.played)}% correct` : null;
    },
    defense: () => {
      const s = read('sgmj-defense-stats-v1');
      return s && s.played ? `${s.played} discard${s.played === 1 ? '' : 's'} · ${pct(s.safe, s.played)}% safe` : null;
    },
    pushfold: () => {
      const s = read('sgmj-pushfold-stats-v1');
      return s && s.played ? `${s.played} call${s.played === 1 ? '' : 's'} · ${pct(s.correct, s.played)}% right` : null;
    },
    plan: () => {
      const s = read('sgmj-plan-stats-v1');
      return s && s.played ? `${s.played} hand${s.played === 1 ? '' : 's'} · ${pct(s.correct, s.played)}% right` : null;
    },
  };

  function refresh() {
    document.querySelectorAll('.hc-progress[data-stat]').forEach((el) => {
      const line = SOURCES[el.dataset.stat] && SOURCES[el.dataset.stat]();
      el.textContent = line || 'Not started';
      el.classList.toggle('started', !!line);
    });
  }

  window.__homeRefresh = refresh;
  refresh();
})();
