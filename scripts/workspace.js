/* NORTHSTAR Phase 4 Canvas assignment + quiz transport.
   All writes are explicit, user-initiated, bridge-only, and never automatically retried. */
(function(root){
'use strict';
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid Canvas identifier.');return n;};
const json=async(response)=>{
  let data;try{data=await response.json();}catch{throw Error('Canvas returned an unreadable response. Check Canvas before retrying.');}
  if(!response.ok)throw Error((data&&data.errors&&JSON.stringify(data.errors))||data?.message||('Canvas refused the request (HTTP '+response.status+').'));
  return data;
};
function transport(credentials,fetchImpl=root.fetch){
  if(!credentials?.base||!credentials?.token)throw Error('Connect Canvas first.');
  const base=new URL(credentials.base);
  if(base.protocol!=='https:'||base.origin!==credentials.base)throw Error('Canvas connection origin is invalid.');
  async function request(method,path,body,write=false){
    const api=new URL(path,base);
    if(api.origin!==base.origin||!api.pathname.startsWith('/api/v1/'))throw Error('Canvas API path is outside your connected school.');
    if(write&&!credentials.proxy)throw Error('Connect through your private Canvas bridge to make changes.');
    let target=api.href;
    if(credentials.proxy){const bridge=new URL(credentials.proxy);if(bridge.protocol!=='https:')throw Error('Canvas bridge must use HTTPS.');bridge.searchParams.set('path',api.pathname+api.search);target=bridge.href;}
    let response;
    try{response=await fetchImpl(target,{method,headers:{Authorization:'Bearer '+credentials.token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',redirect:'error'});}
    catch{throw Error('Canvas request did not return a response. Check Canvas before retrying; NORTHSTAR will not retry a write automatically.');}
    return json(response);
  }
  return {get:path=>request('GET',path),post:(path,body)=>request('POST',path,body,true)};
}
async function uploadAssignmentFile({credentials,courseId,assignmentId,file,fetchImpl=root.fetch}){
  if(!file||typeof file.size!=='number'||!file.size||file.size>25000000||typeof file.name!=='string'||!file.name)throw Error('Choose a file under 25 MB.');
  const api=transport(credentials,fetchImpl),c=id(courseId),a=id(assignmentId);
  const init=await api.post('/api/v1/courses/'+c+'/assignments/'+a+'/submissions/self/files',{name:file.name,size:file.size,content_type:file.type||'application/octet-stream'});
  const upload=Array.isArray(init.attachments)?init.attachments[0]:init;
  if(!upload?.upload_url||!upload.upload_params||typeof upload.upload_params!=='object')throw Error('Canvas did not return a valid signed upload request.');
  let target;try{target=new URL(upload.upload_url);}catch{throw Error('Canvas returned an invalid upload destination.');}
  if(target.protocol!=='https:'||target.username||target.password)throw Error('Canvas upload destination must be a secure HTTPS URL.');
  const FormDataCtor=root.FormData||globalThis.FormData;
  if(!FormDataCtor)throw Error('This browser does not support secure file uploads.');
  const form=new FormDataCtor();
  for(const [key,value] of Object.entries(upload.upload_params))form.append(key,String(value));
  form.append('file',file,file.name);
  let response;try{response=await fetchImpl(target.href,{method:'POST',body:form,redirect:'follow'});}
  catch{throw Error('Canvas accepted the upload request but the signed upload could not be confirmed. Check Canvas before retrying; no automatic retry was made.');}
  let uploaded;try{uploaded=await response.json();}catch{throw Error('Canvas file upload response could not be verified. Check Canvas before retrying.');}
  if(!response.ok||!uploaded?.id)throw Error('Canvas did not confirm the file upload (HTTP '+response.status+').');
  return uploaded;
}
async function startQuiz({credentials,courseId,quizId,accessCode='',fetchImpl}){
  const api=transport(credentials,fetchImpl),c=id(courseId),q=id(quizId);
  const body=accessCode?{access_code:String(accessCode)}:{};
  const result=await api.post('/api/v1/courses/'+c+'/quizzes/'+q+'/submissions',body);
  const sub=(result.quiz_submissions||[])[0]||result.quiz_submission||result;
  if(!sub?.id||!sub?.attempt||!sub?.validation_token)throw Error('Canvas started a quiz but did not return the required attempt details. Open the quiz in Canvas to continue.');
  let questionResult;try{questionResult=await api.get('/api/v1/quiz_submissions/'+id(sub.id)+'/questions?include%5B%5D=quiz_question');}catch(error){error.quizSubmission=sub;throw error;}
  const questions=questionResult.quiz_submission_questions||questionResult;
  if(!Array.isArray(questions)){const error=Error('Canvas started the quiz but returned an unsupported question response. Do not start another attempt; continue in Canvas.');error.quizSubmission=sub;throw error;}
  return {submission:sub,questions};
}
async function saveQuizAnswers({credentials,submission,answers,accessCode='',fetchImpl}){
  if(!submission?.id||!submission?.attempt||!submission?.validation_token)throw Error('The Canvas quiz session is incomplete. Reopen the quiz.');
  if(!Array.isArray(answers)||!answers.length)throw Error('There are no answers to save.');
  const clean=answers.map(x=>{if(!x||!Number.isSafeInteger(Number(x.id))||Number(x.id)<1||x.answer===undefined)throw Error('A quiz answer is invalid.');return {id:String(x.id),answer:x.answer};});
  return transport(credentials,fetchImpl).post('/api/v1/quiz_submissions/'+id(submission.id)+'/questions',{
    attempt:Number(submission.attempt),validation_token:String(submission.validation_token),access_code:accessCode||null,quiz_questions:clean
  });
}
async function completeQuiz({credentials,courseId,quizId,submission,accessCode='',fetchImpl}){
  if(!submission?.id||!submission?.attempt||!submission?.validation_token)throw Error('The Canvas quiz session is incomplete. Reopen the quiz.');
  return transport(credentials,fetchImpl).post('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submissions/'+id(submission.id)+'/complete',{
    attempt:Number(submission.attempt),validation_token:String(submission.validation_token),access_code:accessCode||null
  });
}
const api={transport,uploadAssignmentFile,startQuiz,saveQuizAnswers,completeQuiz};
root.NorthstarWorkspace=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
