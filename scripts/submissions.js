/* Submission transport: no retries, logs, persistence, or direct-mode writes. */
(function(global){
'use strict';
function payload(type,value){
  value=String(value||'').trim();
  if(!value) throw Error('Enter your work before submitting.');
  if(type==='online_text_entry') return {submission:{submission_type:type,body:'<p>'+value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])).replace(/\n/g,'<br>')+'</p>'}};
  if(type==='online_url'){
    let url;try{url=new URL(value);}catch{throw Error('Enter a valid HTTP or HTTPS URL.');}
    if(!['http:','https:'].includes(url.protocol)) throw Error('Enter a valid HTTP or HTTPS URL.');
    return {submission:{submission_type:type,url:url.href}};
  }
  if(type==='online_upload'){
    const fileId=Number(value);if(!Number.isSafeInteger(fileId)||fileId<1)throw Error('Upload the file to Canvas before submitting.');
    return {submission:{submission_type:type,file_ids:[fileId]}};
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
const api={payload,send};global.NorthstarSubmissions=api;
if(typeof module!=='undefined') module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
