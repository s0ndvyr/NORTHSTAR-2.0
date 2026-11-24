/* Submission transport: no retries, logs, persistence, or direct-mode writes. */
(function(global){
'use strict';
function payload(type,value){
  if(type==='online_upload'){
    const candidates=Array.isArray(value)?value:[value];
    const fileIds=[...new Set(candidates.map(item=>Number(item)).filter(item=>Number.isSafeInteger(item)&&item>0))];
    if(!fileIds.length||fileIds.length!==candidates.length)throw Error('Upload every selected file to Canvas before submitting.');
    if(fileIds.length>10)throw Error('A submission can contain at most 10 files in NORTHSTAR.');
    return {submission:{submission_type:type,file_ids:fileIds}};
  }
  value=String(value||'').trim();
  if(!value) throw Error('Enter your work before submitting.');
  if(type==='online_text_entry') return {submission:{submission_type:type,body:'<p>'+value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>')+'</p>'}};
  if(type==='online_url'){
    let url;try{url=new URL(value);}catch{throw Error('Enter a valid HTTP or HTTPS URL.');}
    if(!['http:','https:'].includes(url.protocol)) throw Error('Enter a valid HTTP or HTTPS URL.');
    return {submission:{submission_type:type,url:url.href}};
  }
  throw Error('This submission type must be completed in Canvas.');
}
async function send({credentials,courseId,assignmentId,data,fetchImpl=global.fetch}){
  if(!credentials?.proxy) throw Error('Connect using your private bridge to submit.');
  if(!/^\d+$/.test(String(courseId))||!/^\d+$/.test(String(assignmentId))) throw Error('Invalid assignment.');
  const url=new URL(credentials.proxy);url.searchParams.set('path',`/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions`);
  let res;
  try{res=await fetchImpl(url.href,{method:'POST',headers:{Authorization:'Bearer '+credentials.token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data),redirect:'error'});}
  catch{throw Error('Submission outcome unknown. Check Canvas before trying again; no automatic retry was made.');}
  if(!res.ok) throw Error(`Canvas/bridge refused the submission (HTTP ${res.status}). Check Canvas before retrying. You may need to redeploy the bridge or reopen the assignment in Canvas.`);
  let result;try{result=await res.json();}catch{throw Error('Response unreadable. Check Canvas before retrying.');}
  if(!result || !['submitted','graded','pending_review'].includes(result.workflow_state)) throw Error('Submission not confirmed. Check Canvas before retrying.');
  return result;
}
function isDefinitivelyUnsubmitted({submission,baselineAttempt=0}){
  if(!submission||typeof submission!=='object')return false;
  if(String(submission.workflow_state||'').toLowerCase()!=='unsubmitted'||submission.submitted_at)return false;
  const baseline=Number(baselineAttempt)||0;
  const hasAttempt=submission.attempt!==undefined&&submission.attempt!==null&&String(submission.attempt).trim()!=='';
  const current=hasAttempt?Number(submission.attempt):(baseline===0?0:NaN);
  return Number.isSafeInteger(current)&&Number.isSafeInteger(baseline)&&current===baseline;
}
function verifyReceipt({submission,expectedAttempt,submissionType,fileIds=[],baselineSubmittedAt=null}){
  const workflow=String(submission?.workflow_state||'').toLowerCase();
  const stateMatches=['submitted','graded','pending_review'].includes(workflow);
  const expected=Number(expectedAttempt),actual=Number(submission?.attempt);
  const attemptMatches=Number.isSafeInteger(expected)&&expected>0&&actual===expected;
  const typeMatches=!!submissionType&&String(submission?.submission_type||'')===String(submissionType);
  const submittedAt=String(submission?.submitted_at||'');
  const submittedAtMs=Date.parse(submittedAt);
  const hasBaselineTimestamp=baselineSubmittedAt!==null&&baselineSubmittedAt!==undefined&&String(baselineSubmittedAt).trim()!=='';
  const baselineMs=hasBaselineTimestamp?Date.parse(baselineSubmittedAt):NaN;
  const timestampMatches=Number.isFinite(submittedAtMs)&&(!hasBaselineTimestamp||(Number.isFinite(baselineMs)&&submittedAtMs>=baselineMs));
  const attachments=Array.isArray(submission?.attachments)?submission.attachments:Array.isArray(submission?.submitted_files)?submission.submitted_files:null;
  const rawFileIds=Array.isArray(fileIds)?fileIds:[];
  const normalizedFileIds=rawFileIds.map(Number);
  const fileIdsValid=normalizedFileIds.every(value=>Number.isSafeInteger(value)&&value>0);
  const expectedFiles=[...new Set(normalizedFileIds.filter(value=>Number.isSafeInteger(value)&&value>0))];
  const filesMatch=fileIdsValid&&(submissionType!=='online_upload'||expectedFiles.length>0)&&(expectedFiles.length===0||(!!attachments&&expectedFiles.every(fileId=>attachments.some(file=>Number(file?.id)===fileId))));
  const failures=[];
  if(!stateMatches)failures.push('Canvas has not reported a submitted, graded, or pending-review state');
  if(!attemptMatches)failures.push('the official attempt does not exactly match the expected attempt '+(Number.isSafeInteger(expected)&&expected>0?expected:'unknown'));
  if(!typeMatches)failures.push('the official submission type does not match '+(submissionType||'the requested type'));
  if(!timestampMatches)failures.push('Canvas did not return a valid submission timestamp at or after the previous attempt');
  if(!filesMatch)failures.push('the official submission does not contain every expected finalized Canvas file ID');
  return {confirmed:failures.length===0,failures,workflow,attempt:Number.isSafeInteger(actual)?actual:null,submittedAt:submittedAt||null,attachments:attachments||[],expectedFileIds:expectedFiles};
}
function sanitizeRichTextHtml(value){
  const html=String(value??'');
  if(typeof DOMParser==='undefined')return '<p>'+html.replace(/<[^>]*>/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</p>';
  const parser=new DOMParser(),doc=parser.parseFromString(html,'text/html'),allowed=new Set(['P','BR','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','H5','H6','DIV','SPAN','A','HR','PRE','CODE','TABLE','THEAD','TBODY','TR','TD','TH','SUB','SUP']);
  function copy(node){
    if(node.nodeType===3)return doc.createTextNode(node.nodeValue||'');
    if(node.nodeType!==1)return doc.createDocumentFragment();
    const tag=node.tagName;
    if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','IMG','VIDEO','AUDIO','SVG','MATH'].includes(tag))return doc.createDocumentFragment();
    if(!allowed.has(tag)){const frag=doc.createDocumentFragment();[...node.childNodes].forEach(child=>frag.append(copy(child)));return frag;}
    const out=doc.createElement(tag.toLowerCase());
    if(tag==='A'){
      try{const url=new URL(node.getAttribute('href')||'',global.location?.href||'https://northstar.invalid');if(['https:','http:'].includes(url.protocol)&&!url.username&&!url.password){out.href=url.href;out.target='_blank';out.rel='noopener noreferrer';}}catch{}
    }
    if(tag==='TD'||tag==='TH'){['colspan','rowspan'].forEach(key=>{const value=node.getAttribute(key);if(value&&/^\\d{1,2}$/.test(value))out.setAttribute(key,value);});}
    [...node.childNodes].forEach(child=>out.append(copy(child)));
    return out;
  }
  const out=doc.createElement('div');[...doc.body.childNodes].forEach(node=>out.append(copy(node)));return out.innerHTML;
}
function richTextPayload(html){
  const body=sanitizeRichTextHtml(html);
  let plain=body.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim();
  if(typeof DOMParser!=='undefined')plain=new DOMParser().parseFromString(body,'text/html').body.textContent.trim();
  if(!plain)throw Error('Enter your work before submitting.');
  let size;try{size=typeof TextEncoder!=='undefined'?new TextEncoder().encode(body).length:encodeURIComponent(body).replace(/%[A-F0-9]{2}/gi,'x').length;}catch{throw Error('Your response contains characters that cannot be encoded safely. Remove unusual characters and try again.');}
  if(size>16000)throw Error('Your formatted response is '+size.toLocaleString()+' bytes. Canvas accepts up to 16 KB here; shorten it before submitting.');
  return {submission:{submission_type:'online_text_entry',body}};
}
const api={payload,send,verifyReceipt,isDefinitivelyUnsubmitted,sanitizeRichTextHtml,richTextPayload};global.NorthstarSubmissions=api;
if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
