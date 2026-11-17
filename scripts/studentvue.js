/* NORTHSTAR StudentVUE grade import adapter.
   Supports user-selected CSV/JSON exports only. It does not collect StudentVUE passwords
   or call undocumented district endpoints. Imported grades retain source and timestamp. */
(function(root){
  'use strict';
  const STORAGE_KEY='northstar_studentvue_grades_v1';
  function text(v){return String(v==null?'':v).trim();}
  function key(v){return text(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
  function csvRows(source){
    const rows=[];let row=[],field='',quoted=false;
    for(let i=0;i<source.length;i++){
      const ch=source[i],next=source[i+1];
      if(quoted){if(ch==='"'&&next==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;continue;}
      if(ch==='"'){quoted=true;continue;}
      if(ch===','){row.push(field);field='';continue;}
      if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&next==='\n')i++;
        row.push(field);field='';
        if(row.some(v=>text(v)))rows.push(row);
        row=[];continue;
      }
      field+=ch;
    }
    if(quoted)throw new Error('CSV contains an unclosed quoted field.');
    row.push(field);if(row.some(v=>text(v)))rows.push(row);
    if(!rows.length)return [];
    const headers=rows.shift().map(h=>key(h).replace(/ /g,''));
    return rows.map(values=>Object.fromEntries(headers.map((h,i)=>[h,text(values[i])])));
  }
  function pick(row,names){for(const name of names){const v=row[name];if(v!==undefined&&v!==null&&text(v)!=='')return v;}return null;}
  function normalizeRow(row,index,importedAt){
    row=Object.fromEntries(Object.entries(row||{}).map(([name,value])=>[key(name).replace(/ /g,''),value]));
    const courseCode=text(pick(row,['coursecode','code','courseid','classcode']));
    const courseName=text(pick(row,['coursename','course','class','classname']));
    const period=text(pick(row,['markingperiod','gradingperiod','period','term','gradingterm']));
    const schoolYear=text(pick(row,['schoolyear','academicyear','year']));
    const rawGrade=pick(row,['grade','currentgrade','score','percent','percentage','finalgrade']);
    const rawLetter=pick(row,['lettergrade','letter','gradeletter']);
    if(!courseCode&&!courseName)throw new Error('Row '+(index+1)+' is missing a course name or course code.');
    if(!period)throw new Error('Row '+(index+1)+' is missing its marking period.');
    let percent=null,letter=null;
    const numeric=text(rawGrade).replace(/%$/,'');
    if(numeric&&Number.isFinite(Number(numeric))){
      percent=Number(numeric);
      if(percent<0||percent>100)throw new Error('Row '+(index+1)+' has a grade outside 0–100%.');
    }else if(numeric){
      letter=numeric.toUpperCase();
    }
    if(rawLetter)letter=text(rawLetter).toUpperCase();
    if(percent===null&&!letter)throw new Error('Row '+(index+1)+' has no usable grade value.');
    const currentText=text(pick(row,['iscurrent','current','activeperiod'])).toLowerCase();
    const asOf=text(pick(row,['asof','updatedat','date','gradedate']));
    return {
      id:[key(courseCode||courseName),key(period),key(schoolYear),asOf||'undated'].join('|'),
      courseCode:courseCode||null,courseName:courseName||null,
      courseKey:key(courseCode||courseName),period,periodKey:key(period),schoolYear:schoolYear||null,
      percent,letter,display:letter&&percent!==null?letter+' · '+percent.toFixed(1)+'%':letter||percent.toFixed(1)+'%',
      isCurrent:['true','yes','1','current','active'].includes(currentText)||key(period)==='current',
      asOf:asOf||null,source:'StudentVUE import',importedAt
    };
  }
  function parse(source,filename){
    const importedAt=new Date().toISOString();
    let rows;
    if(typeof source==='string'){
      const trimmed=source.trim();
      if(!trimmed)throw new Error('The selected file is empty.');
      if((filename||'').toLowerCase().endsWith('.json')||trimmed.startsWith('{')||trimmed.startsWith('[')){
        let parsed;try{parsed=JSON.parse(trimmed);}catch{throw new Error('The JSON file could not be read.');}
        rows=Array.isArray(parsed)?parsed:(Array.isArray(parsed.grades)?parsed.grades:Array.isArray(parsed.records)?parsed.records:null);
      }else rows=csvRows(trimmed);
    }else if(Array.isArray(source)) rows=source;
    else if(source&&Array.isArray(source.grades)) rows=source.grades;
    else if(source&&Array.isArray(source.records)) rows=source.records;
    if(!Array.isArray(rows)||!rows.length)throw new Error('No grade rows were found. Use a CSV or JSON file with course, marking period, and grade columns.');
    const records=rows.map((row,i)=>normalizeRow(row,i,importedAt));
    const seen=new Set();
    return {format:'northstar-studentvue-grades',version:1,source:'StudentVUE import',importedAt,records:records.filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;})};
  }
  function load(storage){
    try{const raw=(storage||root.localStorage).getItem(STORAGE_KEY);if(!raw)return null;const data=JSON.parse(raw);return data&&data.format==='northstar-studentvue-grades'&&Array.isArray(data.records)?data:null;}catch{return null;}
  }
  function save(data,storage){
    if(!data||data.format!=='northstar-studentvue-grades'||!Array.isArray(data.records))throw new Error('Invalid StudentVUE grade import.');
    (storage||root.localStorage).setItem(STORAGE_KEY,JSON.stringify(data));return data.records.length;
  }
  function courseMatches(record,course){
    const code=key(course&&course.code),name=key(course&&course.name);
    return !!record&&((code&&record.courseKey===code)||(name&&record.courseKey===name));
  }
  function forCourse(course,periodName,data){
    const records=(data||load())?.records||[];
    const matches=records.filter(r=>courseMatches(r,course));
    if(periodName){const exact=matches.filter(r=>r.periodKey===key(periodName));if(exact.length)return exact.sort((a,b)=>(b.asOf||'').localeCompare(a.asOf||''))[0]||null;}
    return matches.filter(r=>r.isCurrent).sort((a,b)=>(b.asOf||'').localeCompare(a.asOf||''))[0]||null;
  }
  function historyForCourse(course,data){
    return ((data||load())?.records||[]).filter(r=>courseMatches(r,course)).sort((a,b)=>(b.schoolYear||'').localeCompare(a.schoolYear||'')||(b.asOf||'').localeCompare(a.asOf||''));
  }
  function remove(storage){(storage||root.localStorage).removeItem(STORAGE_KEY);}
  root.NorthstarStudentVue={STORAGE_KEY,parse,save,load,forCourse,historyForCourse,remove};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.NorthstarStudentVue;
})(typeof window!=='undefined'?window:globalThis);
