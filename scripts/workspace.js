/* NORTHSTAR Phase 4 Canvas assignment + quiz transport.
   All writes are explicit, user-initiated, bridge-only, and never automatically retried. */
(function(root){
'use strict';
const id=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid Canvas identifier.');return n;};
const json=async(response)=>{
  let data;try{data=await response.json();}catch{throw Error('Canvas returned an unreadable response. Check Canvas before retrying.');}
  if(!response.ok){const error=Error((data&&data.errors&&JSON.stringify(data.errors))||data?.message||('Canvas refused the request (HTTP '+response.status+').'));error.status=response.status;throw error;}
  return data;
};
function transport(credentials,fetchImpl=root.fetch){
  if(!credentials?.base||!credentials?.token)throw Error('Connect Canvas first.');
  const base=new URL(credentials.base);
  if(base.protocol!=='https:'||base.origin!==credentials.base)throw Error('Canvas connection origin is invalid.');
  async function request(method,path,body,write=false){
    const api=new URL(path,base);
    const standardPath=api.pathname.startsWith('/api/v1/'),newQuizRead=method==='GET'&&(/^\/api\/quiz\/v1\/courses\/\d+\/quizzes\/\d+$/.test(api.pathname)||/^\/api\/quiz\/v1\/courses\/\d+\/quizzes\/\d+\/items$/.test(api.pathname)),sessionTokenRead=method==='GET'&&api.pathname==='/login/session_token'&&[...api.searchParams.keys()].every(key=>key==='return_to')&&api.searchParams.size<=1;if(api.origin!==base.origin||(!standardPath&&!newQuizRead&&!sessionTokenRead))throw Error('Canvas API path is outside your connected school.');
    if(write&&!credentials.proxy)throw Error('Connect through your private Canvas bridge to make changes.');
    let target=api.href;
    if(credentials.proxy){const bridge=new URL(credentials.proxy);if(bridge.protocol!=='https:')throw Error('Canvas bridge must use HTTPS.');bridge.searchParams.set('path',api.pathname+api.search);target=bridge.href;}
    let response;
    try{response=await fetchImpl(target,{method,headers:{Authorization:'Bearer '+credentials.token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',redirect:'error'});}
    catch{throw Error('Canvas request did not return a response. Check Canvas before retrying; NORTHSTAR will not retry a write automatically.');}
    return json(response);
  }
  async function getBinary(path){
    const api=new URL(path,base);
    if(api.origin!==base.origin||!api.pathname.startsWith('/api/v1/'))throw Error('Canvas file path is outside your connected school.');
    if(!credentials.proxy)throw Error('In-dashboard document viewing requires your private Canvas bridge.');
    const bridge=new URL(credentials.proxy);if(bridge.protocol!=='https:')throw Error('Canvas bridge must use HTTPS.');
    bridge.searchParams.set('path',api.pathname+api.search);
    let response;try{response=await fetchImpl(bridge.href,{method:'GET',headers:{Authorization:'Bearer '+credentials.token,Accept:'application/pdf,application/octet-stream,*/*'},cache:'no-store',redirect:'error'});}
    catch{throw Error('The PDF could not be downloaded through the private Canvas bridge.');}
    if(!response.ok)throw Error('Canvas file download failed (HTTP '+response.status+').');
    const contentType=response.headers.get('Content-Type')||'application/octet-stream';
    const disposition=response.headers.get('Content-Disposition')||'';
    const match=disposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
    return {bytes:new Uint8Array(await response.arrayBuffer()),contentType,filename:match?decodeURIComponent(match[1].replace(/^"|"$/g,'')):''};
  }
  return {get:path=>request('GET',path),post:(path,body)=>request('POST',path,body,true),put:(path,body)=>request('PUT',path,body,true),getBinary};
}
function safeCanvasReturnTo(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||value.includes('#'))return false;
  return /^\/courses\/\d+\/assignments\/\d+$/.test(value) ||
    /^\/courses\/\d+\/quizzes\/\d+$/.test(value) ||
    /^\/courses\/\d+\/files\/\d+$/.test(value) ||
    /^\/courses\/\d+\/external_tools\/\d+$/.test(value);
}
async function getCanvasSessionUrl({credentials,returnTo,fetchImpl=root.fetch}){
  if(!safeCanvasReturnTo(returnTo))throw Error('Choose a supported Canvas assignment, quiz, file or external-tool destination.');
  const base=new URL(credentials?.base||'');
  const result=await transport(credentials,fetchImpl).get('/login/session_token?return_to='+encodeURIComponent(returnTo));
  if(typeof result?.session_url!=='string'||!result.session_url)throw Error('Canvas did not return a temporary browser session URL.');
  let session;try{session=new URL(result.session_url);}catch{throw Error('Canvas returned an invalid temporary session URL.');}
  if(session.protocol!=='https:'||session.origin!==base.origin||session.username||session.password)throw Error('Canvas session URL did not match the connected school origin.');
  return {sessionUrl:session.href,expiresAt:result.expires_at||null};
}
async function getExternalToolLaunch({credentials,courseId,assignmentId,fetchImpl=root.fetch}){
  const c=id(courseId),a=id(assignmentId);
  const path='/api/v1/courses/'+c+'/external_tools/sessionless_launch?launch_type=assessment&assignment_id='+a;
  const result=await transport(credentials,fetchImpl).get(path);
  if(typeof result?.url!=='string'||!result.url)throw Error('Canvas did not return an authenticated external-tool launch URL for this assignment.');
  let launch;try{launch=new URL(result.url);}catch{throw Error('Canvas returned an invalid external-tool launch URL.');}
  if(launch.protocol!=='https:'||launch.username||launch.password||launch.href.length>12000)throw Error('External-tool launch URL did not pass security validation.');
  return {url:launch.href,name:String(result.name||'External course tool').slice(0,160),id:result.id??null};
}
async function uploadAssignmentFile({credentials,courseId,assignmentId,file,fetchImpl=root.fetch}){
  if(!file||typeof file.size!=='number'||!file.size||file.size>25000000||typeof file.name!=='string'||!file.name)throw Error('Choose a file under 25 MB.');
  const api=transport(credentials,fetchImpl),c=id(courseId),a=id(assignmentId);
  const currentUser=await api.get('/api/v1/users/self');if(!currentUser?.id)throw Error('Canvas did not identify the connected student account.');
  const init=await api.post('/api/v1/courses/'+c+'/assignments/'+a+'/submissions/'+id(currentUser.id)+'/files',{name:file.name,size:file.size,content_type:file.type||'application/octet-stream'});
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
function questionType(row){const q=row?.quiz_question||row?.question||row||{};return String(q.question_type||q.type||'').toLowerCase();}
function questionSupported(row){
  const q=row?.quiz_question||row?.question||row||{},type=questionType(row);
  if(type==='text_only_question')return true;
  if(['multiple_choice_question','true_false_question','multiple_answers_question'].includes(type))return Array.isArray(q.answers)&&q.answers.length>0;
  return ['essay_question','short_answer_question','numerical_question','calculated_question'].includes(type);
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
  let timing=null;try{timing=await api.get('/api/v1/courses/'+c+'/quizzes/'+q+'/submissions/'+id(sub.id)+'/time');}catch(error){}
  return {submission:sub,questions,timing};
}
async function getCurrentQuizSubmission({credentials,courseId,quizId,fetchImpl}){const result=await transport(credentials,fetchImpl).get('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submission');const rows=result?.quiz_submissions||result?.quiz_submission||[];return Array.isArray(rows)?(rows[0]||null):(rows&&typeof rows==='object'?rows:null);}
async function resumeQuiz({credentials,courseId,quizId,submission,validationToken,accessCode='',fetchImpl}){
 if(!submission?.id||!submission?.attempt||!validationToken)throw Error('The saved Canvas quiz session is incomplete. Do not start another attempt.');
 const api=transport(credentials,fetchImpl),submissionId=id(submission.id);
 const result=await api.get('/api/v1/quiz_submissions/'+submissionId+'/questions?include%5B%5D=quiz_question');
 const questions=result.quiz_submission_questions||result;
 if(!Array.isArray(questions))throw Error('Canvas did not return the existing quiz questions. Continue this attempt in Canvas; do not start another attempt.');
 let timing=null;try{timing=await api.get('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submissions/'+submissionId+'/time');}catch(error){}
 return {submission,questions,timing,accessCode:String(accessCode||'')};
}
async function getQuizTime({credentials,courseId,quizId,submissionId,fetchImpl}){return transport(credentials,fetchImpl).get('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submissions/'+id(submissionId)+'/time');}
async function saveQuizAnswers({credentials,submission,answers,accessCode='',fetchImpl}){
  if(!submission?.id||!submission?.attempt||!submission?.validation_token)throw Error('The Canvas quiz session is incomplete. Reopen the quiz.');
  if(!Array.isArray(answers)||!answers.length)throw Error('There are no answers to save.');
  const clean=answers.map(x=>{if(!x||!Number.isSafeInteger(Number(x.id))||Number(x.id)<1||x.answer===undefined)throw Error('A quiz answer is invalid.');return {id:String(x.id),answer:x.answer};});
  return transport(credentials,fetchImpl).post('/api/v1/quiz_submissions/'+id(submission.id)+'/questions',{
    attempt:Number(submission.attempt),validation_token:String(submission.validation_token),access_code:accessCode||null,quiz_questions:clean
  });
}
async function updateQuizQuestionFlag({credentials,submission,questionId,flagged,accessCode='',fetchImpl}){
  if(!submission?.id||!submission?.attempt||!submission?.validation_token)throw Error('The Canvas quiz session is incomplete. Reopen the quiz.');
  if(!Number.isSafeInteger(Number(questionId))||Number(questionId)<1||typeof flagged!=='boolean')throw Error('The quiz review flag is invalid.');
  return transport(credentials,fetchImpl).put('/api/v1/quiz_submissions/'+id(submission.id)+'/questions/'+id(questionId)+'/'+(flagged?'flag':'unflag'),{
    attempt:Number(submission.attempt),validation_token:String(submission.validation_token),access_code:accessCode||null
  });
}
async function completeQuiz({credentials,courseId,quizId,submission,accessCode='',fetchImpl}){
  if(!submission?.id||!submission?.attempt||!submission?.validation_token)throw Error('The Canvas quiz session is incomplete. Reopen the quiz.');
  return transport(credentials,fetchImpl).post('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submissions/'+id(submission.id)+'/complete',{
    attempt:Number(submission.attempt),validation_token:String(submission.validation_token),access_code:accessCode||null
  });
}
async function downloadCanvasFile({credentials,courseId,fileId,fetchImpl}){
  const c=id(courseId),f=id(fileId),api=transport(credentials,fetchImpl);
  const metadata=await api.get('/api/v1/courses/'+c+'/files/'+f);
  const download=await api.getBinary('/api/v1/files/'+f+'/download');
  return {id:f,name:download.filename||metadata.display_name||metadata.filename||('Canvas file '+f),contentType:download.contentType||metadata['content-type']||metadata.content_type||'',bytes:download.bytes,size:download.bytes.byteLength};
}
const api={transport,getCanvasSessionUrl,getExternalToolLaunch,uploadAssignmentFile,downloadCanvasFile,startQuiz,getCurrentQuizSubmission,resumeQuiz,getQuizTime,saveQuizAnswers,updateQuizQuestionFlag,completeQuiz,questionType,questionSupported};
root.NorthstarWorkspace=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
