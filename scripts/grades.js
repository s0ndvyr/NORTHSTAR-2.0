/* NORTHSTAR grade math + marking-period bucketing: pure functions, no DOM, no I/O.
   Mirrors Canvas "current score" rules: graded and missing assignments count;
   excused and ungraded (not yet due / awaiting grading) are excluded; late
   penalties are already reflected in the submission `score`. Marking periods
   are user-defined (Canvas exposes no API for them) — nothing is guessed. */
(function (global) {
  'use strict';

  var DEFAULT_SCHEME = [[90, 'A'], [80, 'B'], [70, 'C'], [60, 'D'], [0, 'F']];

  function num(v, d) { var n = Number(v); return Number.isFinite(n) ? n : d; }

  function isCounted(a) {
    if (!a || a.excused) return false;
    if (a.score != null) return true;   // graded (score already reflects late penalty)
    if (a.missing) return true;         // past-due, unsubmitted -> counts as 0
    return false;                        // ungraded / not yet due -> excluded
  }
  function earnedOf(a) { return a.score != null ? num(a.score, 0) : 0; }
  function possibleOf(a) { return num(a.points, 0); }
  function pctOf(a) { var p = possibleOf(a); return p > 0 ? (earnedOf(a) / p) * 100 : 0; }
  function sum(list, fn) { return list.reduce(function (s, a) { return s + fn(a); }, 0); }

  function letterGrade(pct, scheme) {
    var s = (Array.isArray(scheme) && scheme.length) ? scheme : DEFAULT_SCHEME;
    var sorted = s.slice().sort(function (x, y) { return num(y[0], 0) - num(x[0], 0); });
    for (var i = 0; i < sorted.length; i++) if (pct >= num(sorted[i][0], 0)) return String(sorted[i][1]);
    return String(sorted[sorted.length - 1][1]);
  }

  // Drop the N lowest / highest counted assignments (by percentage) from a list.
  function applyDrops(list, dropLowest, dropHighest) {
    var lo = Math.max(0, Math.floor(num(dropLowest, 0)));
    var hi = Math.max(0, Math.floor(num(dropHighest, 0)));
    if (lo + hi <= 0 || list.length <= lo + hi) return list.slice();
    var sorted = list.slice().sort(function (a, b) { return pctOf(a) - pctOf(b); });
    return sorted.slice(lo, sorted.length - hi);
  }

  function isPending(a) { return !!a && !a.excused && !isCounted(a) && possibleOf(a) > 0; }

  // Core: overall percent. pendingScore=null excludes pending work; a number
  // (0-100) includes pending work as if it scores that percent.
  function gradePercent(assignments, groups, opts, pendingScore) {
    assignments = Array.isArray(assignments) ? assignments : [];
    groups = Array.isArray(groups) ? groups : [];
    opts = opts || {};
    var includePending = typeof pendingScore === 'number' && Number.isFinite(pendingScore);
    var pool = assignments.filter(function (a) {
      if (a.excused) return false;
      if (isCounted(a)) return true;
      return includePending && isPending(a);
    });
    var earnedFor = function (a) { return isCounted(a) ? earnedOf(a) : (includePending ? (possibleOf(a) * pendingScore / 100) : 0); };

    if (opts.weighted && groups.length) {
      var byId = {};
      groups.forEach(function (g) { byId[g.id] = g; });
      var wSum = 0, wTotal = 0;
      groups.forEach(function (g) {
        var inGroup = pool.filter(function (a) { return a.groupId === g.id; });
        var kept = applyDrops(inGroup, g.dropLowest, g.dropHighest);
        var possible = sum(kept, possibleOf);
        if (possible <= 0) return;
        var pct = (sum(kept, earnedFor) / possible) * 100;
        var w = num(g.weight, 0);
        if (w > 0) { wSum += pct * w; wTotal += w; }
      });
      var ungrouped = pool.filter(function (a) { return !byId[a.groupId]; });
      if (ungrouped.length) {
        var keptU = applyDrops(ungrouped, opts.courseDropLowest, opts.courseDropHighest);
        var pU = sum(keptU, possibleOf);
        if (pU > 0) {
          var pctU = (sum(keptU, earnedFor) / pU) * 100;
          var allPossible = sum(pool, possibleOf);
          var share = allPossible > 0 ? (pU / allPossible) * 100 : 0;
          wSum += pctU * share; wTotal += share;
        }
      }
      return wTotal > 0 ? (wSum / wTotal) : null;
    }
    var keptAll = applyDrops(pool, opts.courseDropLowest, opts.courseDropHighest);
    var possibleAll = sum(keptAll, possibleOf);
    return possibleAll > 0 ? (sum(keptAll, earnedFor) / possibleAll) * 100 : null;
  }

  // Full current-grade summary for one course.
  function computeCourseGrade(assignments, groups, opts) {
    opts = opts || {};
    assignments = Array.isArray(assignments) ? assignments : [];
    groups = Array.isArray(groups) ? groups : [];
    var percent = gradePercent(assignments, groups, opts, null);
    var counted = assignments.filter(isCounted);
    var pending = assignments.filter(isPending);
    var kept = applyDrops(counted, opts.courseDropLowest, opts.courseDropHighest);
    var breakdown = [];
    if (opts.weighted && groups.length) {
      groups.forEach(function (g) {
        var inGroup = counted.filter(function (a) { return a.groupId === g.id; });
        var k = applyDrops(inGroup, g.dropLowest, g.dropHighest);
        var possible = sum(k, possibleOf);
        breakdown.push({ id: g.id, name: g.name || 'Group', weight: num(g.weight, 0), earned: sum(k, earnedOf), possible: possible, percent: possible > 0 ? (sum(k, earnedOf) / possible) * 100 : null, count: k.length });
      });
    }
    return {
      percent: percent,
      letter: percent == null ? null : letterGrade(percent, opts.scheme),
      earned: sum(kept, earnedOf),
      possible: sum(kept, possibleOf),
      pendingPoints: sum(pending, possibleOf),
      groups: breakdown,
      counts: {
        graded: assignments.filter(function (a) { return a.score != null; }).length,
        missing: assignments.filter(function (a) { return a.missing && !a.excused; }).length,
        excused: assignments.filter(function (a) { return a.excused; }).length,
        pending: pending.length
      }
    };
  }

  // Projected overall percent if all pending work scores assumedPct.
  function projectWith(assignments, groups, opts, assumedPct) {
    return gradePercent(assignments, groups, opts, num(assumedPct, 0));
  }

  // Average needed on pending work to reach targetPct (binary search; monotonic).
  function neededForTarget(assignments, groups, opts, targetPct) {
    var target = num(targetPct, 0);
    var pending = (Array.isArray(assignments) ? assignments : []).filter(isPending);
    if (!pending.length) {
      var cur = gradePercent(assignments, groups, opts, null);
      return { needed: null, secured: cur != null && cur >= target, reachable: true };
    }
    var lo = 0, hi = 100, best = null;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      var p = projectWith(assignments, groups, opts, mid);
      if (p == null) return { needed: null, secured: false, reachable: false };
      if (p >= target) { best = mid; hi = mid; } else { lo = mid; }
    }
    if (best == null) return { needed: null, secured: false, reachable: false };
    return { needed: best, secured: best <= 0.5, reachable: true };
  }

  /* ---------- marking periods (user-defined; Canvas has no API for these) ---------- */
  function boundary(value, end) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(value + (end ? 'T23:59:59.999' : 'T00:00:00')).getTime();
    }
    return new Date(value).getTime();
  }
  function periodForDate(date, periods) {
    if (!date || !Array.isArray(periods)) return null;
    var t = new Date(date).getTime();
    if (!Number.isFinite(t)) return null;
    for (var i = 0; i < periods.length; i++) {
      var s = boundary(periods[i].start, false), e = boundary(periods[i].end, true);
      if (Number.isFinite(s) && Number.isFinite(e) && t >= s && t <= e) return periods[i];
    }
    return null;
  }
  function currentPeriod(periods, now) {
    if (!Array.isArray(periods) || !periods.length) return null;
    var t = now ? new Date(now).getTime() : Date.now();
    var sorted = periods.slice().sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    for (var i = 0; i < sorted.length; i++) if (t >= boundary(sorted[i].start, false) && t <= boundary(sorted[i].end, true)) return sorted[i];
    return null;
  }
  function bucketByPeriod(assignments, periods, now) {
    assignments = Array.isArray(assignments) ? assignments : [];
    periods = Array.isArray(periods) ? periods : [];
    var t = now ? new Date(now).getTime() : Date.now();
    var map = {};
    var buckets = periods.map(function (p) {
      var b = { period: p, items: [], archived: boundary(p.end, true) < t };
      map[p.id] = b; return b;
    });
    var unassigned = [], noDue = [];
    assignments.forEach(function (a) {
      if (a.noDue || !a.due || !Number.isFinite(new Date(a.due).getTime())) { noDue.push(a); return; }
      var p = periodForDate(a.due, periods);
      if (p && map[p.id]) map[p.id].items.push(a); else unassigned.push(a);
    });
    var byDue = function (x, y) { return new Date(x.due) - new Date(y.due); };
    buckets.forEach(function (b) { b.items.sort(byDue); });
    unassigned.sort(byDue);
    return { buckets: buckets, unassigned: unassigned, noDue: noDue };
  }

  var api = {
    DEFAULT_SCHEME: DEFAULT_SCHEME, isCounted: isCounted, letterGrade: letterGrade,
    computeCourseGrade: computeCourseGrade, projectWith: projectWith, neededForTarget: neededForTarget,
    periodForDate: periodForDate, currentPeriod: currentPeriod, bucketByPeriod: bucketByPeriod
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Grades = api;
})(typeof window !== 'undefined' ? window : globalThis);
