import test from 'node:test';
import assert from 'node:assert/strict';
import StudentVUE from '../scripts/studentvue.js';

test('parses quoted CSV and preserves course and period provenance',()=>{
 const data=StudentVUE.parse('Course Code,Course Name,Marking Period,Grade,Letter Grade,School Year\nBIO 101,"Biology, Honors",Marking Period 2,92.5,A,2026-27','grades.csv');
 assert.equal(data.records.length,1);
 assert.equal(data.records[0].courseName,'Biology, Honors');
 assert.equal(data.records[0].percent,92.5);
 assert.equal(data.records[0].letter,'A');
 assert.equal(data.records[0].source,'StudentVUE import');
});
test('parses JSON exports and chooses explicit current-period grade',()=>{
 const data=StudentVUE.parse({grades:[
  {courseCode:'CHEM 1',markingPeriod:'MP1',grade:'82',letterGrade:'B',schoolYear:'2026-27'},
  {courseCode:'CHEM 1',markingPeriod:'MP2',grade:'91',letterGrade:'A',schoolYear:'2026-27',isCurrent:true}
 ]});
 assert.equal(StudentVUE.forCourse({code:'CHEM 1'},'MP2',data).percent,91);
 assert.equal(StudentVUE.historyForCourse({code:'CHEM 1'},data).length,2);
});
test('rejects missing periods and out-of-range values',()=>{
 assert.throws(()=>StudentVUE.parse([{course:'English',grade:'90'}]),/marking period/i);
 assert.throws(()=>StudentVUE.parse([{course:'English',period:'MP1',grade:'140'}]),/outside 0/);
});
test('saves and loads records without credentials',()=>{
 const map=new Map();const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const data=StudentVUE.parse([{course:'Math',period:'MP1',grade:'88'}]);
 StudentVUE.save(data,storage);
 assert.equal(StudentVUE.load(storage).records[0].percent,88);
 StudentVUE.remove(storage);assert.equal(StudentVUE.load(storage),null);
});
