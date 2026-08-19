/* Chroniques du Foyer — moteur de sélection de tâches ménagères v1 */
window.HouseholdLibrary = (() => {
  let library = null;

  async function load(url = './household-task-library.v1.json') {
    if (library) return library;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Bibliothèque indisponible (${response.status})`);
    const data = await response.json();
    if (data.schema !== 'chroniques.household-task-library' || !Array.isArray(data.tasks)) {
      throw new Error('Format de bibliothèque invalide');
    }
    library = data;
    return library;
  }

  function hasAll(set, values = []) { return values.every(v => set.has(v)); }
  function hasAny(set, values = []) { return values.some(v => set.has(v)); }

  function daysBetween(a, b) {
    const A = new Date(`${a}T12:00:00`), B = new Date(`${b}T12:00:00`);
    return Math.floor((B - A) / 86400000);
  }

  function eligible(task, context = {}, history = {}) {
    const flags = new Set(context.flags || []);
    const maxRisk = Number(context.maxRisk ?? 1);
    const durationMax = Number(context.durationMax ?? Infinity);
    const difficultyMax = Number(context.difficultyMax ?? 5);
    const category = context.category || null;

    if (!task.autoSuggest) return false;
    if (Number(task.risk?.level ?? 0) > maxRisk) return false;
    if (Number(task.durationMinutes) > durationMax) return false;
    if (Number(task.difficulty) > difficultyMax) return false;
    if (category && task.category !== category) return false;
    if (!hasAll(flags, task.conditions?.requires || [])) return false;
    if (hasAny(flags, task.conditions?.excludeIf || [])) return false;

    const last = history[task.id]?.lastCompletedAt;
    const minGap = Number(task.frequency?.minimumGapDays || 0);
    if (last && minGap > 0 && daysBetween(last, context.today || new Date().toISOString().slice(0,10)) < minGap) return false;
    return true;
  }

  function score(task, context = {}, history = {}) {
    let s = 10;
    const h = history[task.id] || {};
    const today = context.today || new Date().toISOString().slice(0,10);
    const interval = Number(task.frequency?.recommendedIntervalDays || 0);
    if (h.lastCompletedAt && interval > 0) {
      const elapsed = daysBetween(h.lastCompletedAt, today);
      s += Math.min(40, Math.max(0, elapsed - interval) * 2);
    } else if (!h.lastCompletedAt) s += 12;
    if (context.lowEnergy && task.durationMinutes <= 10) s += 18;
    if (context.preferredCategories?.includes(task.category)) s += 8;
    if (context.avoidTaskIds?.includes(task.id)) s -= 50;
    s += Math.max(0, 12 - task.durationMinutes / 5);
    return s;
  }

  function pick(tasks, context = {}, history = {}) {
    const pool = tasks.filter(t => eligible(t, context, history));
    if (!pool.length) return null;
    const ranked = pool.map(t => ({ task: t, score: score(t, context, history) }))
      .sort((a,b) => b.score - a.score);
    const top = ranked.slice(0, Math.min(6, ranked.length));
    const total = top.reduce((n,x) => n + Math.max(1,x.score), 0);
    let r = Math.random() * total;
    for (const x of top) { r -= Math.max(1,x.score); if (r <= 0) return x.task; }
    return top[0].task;
  }

  async function suggest(context = {}, history = {}) {
    const data = await load();
    let task = pick(data.tasks, context, history);
    if (!task) {
      const fallback = data.selectionDefaults?.fallbackTaskIds || [];
      task = data.tasks.find(t => fallback.includes(t.id)) || null;
    }
    return task;
  }

  return { load, eligible, score, suggest };
})();
