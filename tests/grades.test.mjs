import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const G = require('../scripts/grades.js');

// --- unweighted: graded + missing count, excused/ungraded excluded ---
let a = [
  {id:1, points:100, score:90,  groupId:1},
  {id:2, points:100, score:80,  groupId:1},
  {id:3, points:50,  score:null, missing:true, groupId:1},   // missing -> 0
  {id:4, points:100, score:null, excused:true, groupId:1},   // excused -> excluded
  {id:5, points:100, score:null, groupId:1},                 // ungraded -> excluded
];
let g = G.computeCourseGrade(a, [], {});
assert.equal(g.percent, 68);            // (90+80+0)/(100+100+50)
assert.equal(g.letter, 'D');
assert.equal(g.counts.missing, 1);
assert.equal(g.counts.excused, 1);
assert.equal(g.counts.pending, 1);
assert.equal(g.pendingPoints, 100);

// --- weighted groups ---
a = [
  {id:1, points:100, score:90, groupId:1},
  {id:2, points:100, score:80, groupId:2},
];
const groups = [{id:1, name:'Homework', weight:60}, {id:2, name:'Exams', weight:40}];
g = G.computeCourseGrade(a, groups, {weighted:true});
assert.equal(g.percent, 86);            // 0.6*90 + 0.4*80
assert.equal(g.groups.length, 2);

// weighted: empty group redistributes
a = [{id:1, points:100, score:90, groupId:1}];
g = G.computeCourseGrade(a, groups, {weighted:true});
assert.equal(g.percent, 90);

// --- drop lowest ---
a = [
  {id:1, points:100, score:50, groupId:1},
  {id:2, points:100, score:90, groupId:1},
  {id:3, points:100, score:100, groupId:1},
];
g = G.computeCourseGrade(a, [], {courseDropLowest:1});
assert.equal(g.percent, 95);            // drop the 50 -> (90+100)/200

// --- letter grades ---
assert.equal(G.letterGrade(92), 'A');
assert.equal(G.letterGrade(86), 'B');
assert.equal(G.letterGrade(59.9), 'F');
assert.equal(G.letterGrade(85, [[85,'A'],[0,'F']]), 'A'); // custom scheme

// --- what-if: projection + needed ---
a = [
  {id:1, points:100, score:90, groupId:1},
  {id:2, points:100, score:80, groupId:1},
  {id:3, points:50,  score:null, missing:true, groupId:1},
  {id:5, points:100, score:null, groupId:1},   // pending
];
assert.ok(Math.abs(G.projectWith(a, [], {}, 100) - (270/350*100)) < 1e-9); // (170+100)/350
let w = G.neededForTarget(a, [], {}, 70);
assert.ok(Math.abs(w.needed - 75) < 0.5, 'needed ~75, got ' + w.needed);   // (0.7*350-170)/100
w = G.neededForTarget(a, [], {}, 80);
assert.equal(w.reachable, false);       // would need 110%

// --- marking periods ---
const periods = [
  {id:'p1', name:'Marking Period 1', start:'2026-09-01', end:'2026-10-31'},
  {id:'p2', name:'Marking Period 2', start:'2026-11-01', end:'2026-12-20'},
];
const items = [
  {id:1, due:'2026-09-15', noDue:false},
  {id:2, due:'2026-11-10', noDue:false},
  {id:3, due:'2027-01-15', noDue:false},   // outside any period
  {id:4, due:null, noDue:true},
];
const b = G.bucketByPeriod(items, periods, new Date('2026-11-15T12:00:00Z'));
assert.equal(b.buckets.length, 2);
assert.equal(b.buckets[0].items.length, 1);
assert.equal(b.buckets[0].archived, true);   // P1 ended before "now"
assert.equal(b.buckets[1].items.length, 1);
assert.equal(b.buckets[1].archived, false);
assert.equal(b.unassigned.length, 1);
assert.equal(b.noDue.length, 1);
assert.equal(G.periodForDate('2026-10-01', periods).id, 'p1');
assert.equal(G.periodForDate('2027-03-01', periods), null);
assert.equal(G.currentPeriod(periods, new Date('2026-11-15T12:00:00Z')).id, 'p2');

console.log('PASS: grade math (weighted/unweighted, excused/missing/ungraded, drops, letters, what-if) and marking-period bucketing');

assert.equal(G.periodForDate('2026-10-31T23:00:00', periods).id, 'p1');
assert.equal(G.currentPeriod(periods, new Date('2027-02-01')), null);
assert.equal(G.bucketByPeriod([], periods, new Date('2026-10-31T12:00:00')).buckets[0].archived, false);
assert.equal(G.computeCourseGrade([
  {points:100,score:50,groupId:1}, {points:100,score:100,groupId:1}
], [{id:1,weight:100,dropHighest:1}], {weighted:true}).percent, 50);
