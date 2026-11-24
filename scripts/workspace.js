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
  return {get:path=>request('GET',path),post:(path,body)=>request('POST',path,body,true),put:(path,body)=>request('PUT',path,body,true)};
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
async function getAssignmentSubmission({credentials,courseId,assignmentId,fetchImpl=root.fetch}){
  const c=id(courseId),a=id(assignmentId),api=transport(credentials,fetchImpl);
  const assignment=await api.get('/api/v1/courses/'+c+'/assignments/'+a+'?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true');
  if(!assignment||!Object.prototype.hasOwnProperty.call(assignment,'submission'))throw Error('Canvas did not return the current student submission record. The result remains unverified.');
  let userId=null,submissionDetails=null,historyError=null;
  try{
    const user=await api.get('/api/v1/users/self');userId=Number(user?.id);
    if(Number.isSafeInteger(userId)&&userId>0){
      submissionDetails=await api.get('/api/v1/courses/'+c+'/assignments/'+a+'/submissions/'+userId+'?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment');
    }
  }catch(error){historyError=String(error?.message||error);}
  return {assignment,submission:assignment.submission||null,submissionDetails,userId,historyError,canSubmit:assignment.can_submit===true,lockedForUser:assignment.locked_for_user===true,published:assignment.published!==false,lockExplanation:assignment.lock_explanation||assignment.lock_info?.asset_string||'',unlockAt:assignment.unlock_at||null,groupAssignment:Number.isInteger(assignment.group_category_id)&&assignment.group_category_id>0};
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
async function uploadCanvasFileThroughBridge({credentials,courseId,resourceId,kind,file,fetchImpl=root.fetch}){
  if(!credentials?.proxy)throw Error('Connect through your private Canvas bridge to upload files.');
  transport(credentials,fetchImpl);
  if(!['assignment','quiz'].includes(kind))throw Error('Unsupported Canvas file upload context.');
  const c=id(courseId),resource=id(resourceId);
  if(!file||typeof file.size!=='number'||!file.size||file.size>25000000||typeof file.name!=='string'||!file.name)throw Error('Choose a non-empty file under 25 MB.');
  const FormDataCtor=root.FormData||globalThis.FormData;if(!FormDataCtor)throw Error('This browser does not support secure file uploads.');
  let bridge;try{bridge=new URL(credentials.proxy);}catch{throw Error('Canvas bridge URL is invalid.');}
  if(bridge.protocol!=='https:'||bridge.username||bridge.password)throw Error('Canvas bridge must use a secure HTTPS URL.');
  bridge.searchParams.set('action','upload-file');bridge.searchParams.set('kind',kind);bridge.searchParams.set('course_id',String(c));bridge.searchParams.set('resource_id',String(resource));
  const form=new FormDataCtor();form.append('file',file,file.name);
  let response;try{response=await fetchImpl(bridge.href,{method:'POST',headers:{Authorization:'Bearer '+credentials.token,Accept:'application/json'},body:form,cache:'no-store',redirect:'error'});}catch{throw Error('The Canvas file upload could not be confirmed. No assignment submission was sent; check Canvas before retrying.');}
  let result;try{result=await response.json();}catch{throw Error('Canvas file upload response was unreadable. No assignment submission was sent; check Canvas before retrying.');}
  if(!response.ok)throw Error(result?.error||('Canvas file upload failed (HTTP '+response.status+').'));
  if(!result||!Number.isSafeInteger(Number(result.id))||Number(result.id)<1)throw Error('Canvas did not confirm a finalized file ID. No assignment submission was sent.');
  return result;
}
async function uploadAssignmentFile({credentials,courseId,assignmentId,file,fetchImpl=root.fetch}){return uploadCanvasFileThroughBridge({credentials,courseId,resourceId:assignmentId,kind:'assignment',file,fetchImpl});}
async function uploadQuizSubmissionFile({credentials,courseId,quizId,file,fetchImpl=root.fetch}){
  const uploaded=await uploadCanvasFileThroughBridge({credentials,courseId,resourceId:quizId,kind:'quiz',file,fetchImpl});
  return {id:Number(uploaded.id),name:String(uploaded.display_name||uploaded.filename||file.name),size:file.size,type:file.type||'application/octet-stream'};
}
async function uploadAssignmentFiles({credentials,courseId,assignmentId,files,onProgress,fetchImpl=root.fetch}){
  const rows=Array.from(files||[]);
  if(!rows.length)throw Error('Choose at least one file.');
  if(rows.length>10)throw Error('Canvas assignment uploads are limited to 10 files per submission in NORTHSTAR.');
  const total=rows.reduce((sum,file)=>sum+(Number(file?.size)||0),0);
  if(total>100000000)throw Error('The selected files total more than 100 MB. Remove some files and try again.');
  const uploaded=[];
  for(let index=0;index<rows.length;index++){
    const file=rows[index];
    try{
      if(typeof onProgress==='function')onProgress({index:index+1,total:rows.length,file:file.name,phase:'uploading',uploaded:uploaded.slice()});
      const result=await uploadAssignmentFile({credentials,courseId,assignmentId,file,fetchImpl});
      uploaded.push({id:Number(result.id),name:String(result.display_name||result.filename||file.name),size:file.size,type:file.type||'application/octet-stream'});
      if(typeof onProgress==='function')onProgress({index:index+1,total:rows.length,file:file.name,phase:'uploaded',uploaded:uploaded.slice()});
    }catch(error){
      error.uploadedFiles=uploaded.slice();
      error.failedFile=file?.name||'Selected file';
      throw error;
    }
  }
  return uploaded;
}
function questionType(row){const q=row?.quiz_question||row?.question||row||{};return String(q.question_type||q.type||'').toLowerCase();}
function questionSupported(row){
  const q=row?.quiz_question||row?.question||row||{},type=questionType(row),answers=Array.isArray(q.answers)?q.answers:[];
  if(type==='text_only_question'||type==='file_upload_question')return true;
  if(['multiple_choice_question','true_false_question','multiple_answers_question'].includes(type))return answers.some(a=>Number.isSafeInteger(Number(a?.id))&&Number(a.id)>0);
  if(['essay_question','short_answer_question','numerical_question','calculated_question'].includes(type))return true;
  if(type==='matching_question')return answers.length>=2&&answers.some(a=>a?.answer_match_left)&&answers.some(a=>a?.answer_match_right)&&answers.every(a=>Number.isSafeInteger(Number(a?.id))&&Number(a.id)>0);
  if(type==='multiple_dropdowns_question'||type==='fill_in_multiple_blanks_question'){
    const blanks=new Set(answers.map(a=>String(a?.blank_id??'')).filter(Boolean));
    return blanks.size>0&&answers.every(a=>Number.isSafeInteger(Number(a?.id))&&Number(a.id)>0);
  }
  return false;
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
async function getCurrentQuizSubmission({credentials,courseId,quizId,fetchImpl}){
 const result=await transport(credentials,fetchImpl).get('/api/v1/courses/'+id(courseId)+'/quizzes/'+id(quizId)+'/submission');
 const raw=result?.quiz_submissions||result?.quiz_submission||[];
 if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
 if(!Array.isArray(raw)||!raw.length)return null;
 return raw.slice().sort((a,b)=>{
  const activeA=!!(a&&!a.finished_at&&!['complete','pending_review'].includes(String(a.workflow_state||'').toLowerCase())),activeB=!!(b&&!b.finished_at&&!['complete','pending_review'].includes(String(b.workflow_state||'').toLowerCase()));
  if(activeA!==activeB)return activeA?-1:1;
  return Number(b?.attempt||0)-Number(a?.attempt||0);
 })[0]||null;
}
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
  const c=id(courseId),q=id(quizId),attempt=Number(submission.attempt),api=transport(credentials,fetchImpl);
  let response=null,completionRequestError=null;
  try{
    response=await api.post('/api/v1/courses/'+c+'/quizzes/'+q+'/submissions/'+id(submission.id)+'/complete',{
      attempt,validation_token:String(submission.validation_token),access_code:accessCode||null
    });
  }catch(error){
    // A definite Canvas 4xx rejection is not an accepted completion. Network
    // failures and 5xx responses are ambiguous: Canvas may have committed the
    // attempt before the response was lost, so reconcile before allowing retry.
    if(Number(error?.status)>=400&&Number(error?.status)<500)throw error;
    completionRequestError=error;
  }
  let verified;
  try{verified=await getCurrentQuizSubmission({credentials,courseId:c,quizId:q,fetchImpl});}
  catch(error){
    const uncertain=Error('The Canvas completion response was '+(completionRequestError?'lost or unavailable':'received')+', but NORTHSTAR could not independently read the current attempt. Check Canvas status before retrying; no completion request was repeated.');
    uncertain.completionOutcomeUnknown=true;uncertain.cause=error;uncertain.completionRequestError=completionRequestError;throw uncertain;
  }
  const state=String(verified?.workflow_state||'').toLowerCase();
  const sameAttempt=Number(verified?.attempt)===attempt&&Number(verified?.id)===Number(submission.id);
  const finished=!!verified?.finished_at&&['complete','pending_review'].includes(state);
  if(!sameAttempt||!finished){
    const uncertain=Error('Canvas has not independently confirmed that this exact quiz attempt is complete. Its current state is '+(state||'unknown')+'. Do not submit again; refresh the attempt status first.');
    uncertain.completionOutcomeUnknown=true;uncertain.currentSubmission=verified||null;uncertain.completionResponse=response;uncertain.completionRequestError=completionRequestError;throw uncertain;
  }
  return {response,submission:verified,confirmed:true,completionResponseLost:!!completionRequestError};
}
function trustedCanvasPreviewUrl(value,base){
  try{
    const url=value instanceof URL?new URL(value.href):new URL(String(value||''),base);
    const host=url.hostname.toLowerCase(),baseHost=new URL(base).hostname.toLowerCase();
    const trusted=host===baseHost||host.endsWith('.instructure.com')||host.endsWith('.canvas-user-content.com')||host.endsWith('.inscloudgate.net')||host==='amazonaws.com'||host.endsWith('.amazonaws.com');
    return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.searchParams.has('access_token')&&trusted?url:null;
  }catch{return null;}
}
async function readBrowserPdf(url,fetchImpl,authorization){
  const headers={Accept:'application/pdf,application/octet-stream,*/*'};
  // A legacy file URL may still be on the school's exact Canvas origin. In
  // that single-origin case the authenticated request cannot leak on redirect.
  if(authorization)headers.Authorization=authorization;
  const response=await fetchImpl(url.href,{method:'GET',headers,mode:'cors',credentials:'omit',cache:'no-store',redirect:authorization?'error':'follow'});
  const finalUrl=trustedCanvasPreviewUrl(response.url||url.href,url.origin);
  if(!response.ok)return {result:'http_error',status:response.status,host:finalUrl?.hostname||url.hostname,contentType:response.headers.get('Content-Type')||''};
  if(!finalUrl)return {result:'untrusted_redirect',status:response.status,host:'untrusted-redirect',contentType:response.headers.get('Content-Type')||''};
  const contentType=response.headers.get('Content-Type')||'';
  const length=Number(response.headers.get('Content-Length')||0);
  if(length>100*1024*1024)return {result:'file_too_large',status:response.status,host:finalUrl.hostname,contentType};
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>100*1024*1024)return {result:'file_too_large',status:response.status,host:finalUrl.hostname,contentType};
  if(bytes.byteLength<5||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')return {result:'not_pdf',status:response.status,host:finalUrl.hostname,contentType};
  return {result:'success',status:response.status,host:finalUrl.hostname,contentType:contentType||'application/pdf',bytes};
}
async function downloadCanvasFile({credentials,courseId,fileId,fetchImpl=root.fetch}){
  const c=id(courseId),f=id(fileId),api=transport(credentials,fetchImpl),base=new URL(credentials.base);
  const metadata=await api.get('/api/v1/courses/'+c+'/files/'+f);
  const name=String(metadata.display_name||metadata.filename||('Canvas file '+f));
  const delivery={attempted:false,result:'not_attempted',status:null,host:'',contentType:''};
  let previewUrl=null,endpointResult='not_attempted',endpointStatus=null;
  try{
    const publicData=await api.get('/api/v1/files/'+f+'/public_url');
    endpointResult='response';endpointStatus=200;
    const candidate=trustedCanvasPreviewUrl(publicData?.public_url,base.origin);
    if(candidate){
      previewUrl=candidate;
      delivery.attempted=true;delivery.host=candidate.hostname;
      try{
        const read=await readBrowserPdf(candidate,fetchImpl);
        Object.assign(delivery,{result:read.result,status:read.status,host:read.host,contentType:read.contentType});
        if(read.result==='success')return {id:f,name,contentType:read.contentType,bytes:read.bytes,size:read.bytes.byteLength,workerVersion:'browser-public-preview',previewDelivery:delivery};
      }catch{
        // CORS is expected on some Canvas-managed storage hosts. Native Safari
        // navigation does not require JavaScript to read the cross-origin bytes.
        delivery.result='browser_fetch_blocked';
      }
    }else{
      endpointResult=typeof publicData?.public_url==='string'?'url_rejected':'no_public_url';
    }
  }catch(error){
    endpointResult='http_error';endpointStatus=Number.isFinite(Number(error?.status))?Number(error.status):null;
  }
  // Only fall back to a browser-authenticated download when the target is
  // exactly the Canvas origin and redirects are refused. Never send a Canvas
  // token to a storage hostname, even if it is operated by Instructure.
  if(!previewUrl&&typeof metadata.url==='string'){
    const legacy=trustedCanvasPreviewUrl(metadata.url,base.origin);
    if(legacy&&legacy.origin===base.origin){
      delivery.attempted=true;delivery.host=legacy.hostname;
      try{
        const read=await readBrowserPdf(legacy,fetchImpl,'Bearer '+String(credentials.token));
        Object.assign(delivery,{result:read.result,status:read.status,host:read.host,contentType:read.contentType});
        if(read.result==='success')return {id:f,name,contentType:read.contentType,bytes:read.bytes,size:read.bytes.byteLength,workerVersion:'browser-canvas-origin',previewDelivery:delivery};
      }catch{delivery.result='canvas_origin_fetch_blocked';}
    }
  }
  return {
    id:f,name,contentType:metadata['content-type']||metadata.content_type||'application/pdf',
    bytes:null,size:Number(metadata.size)||null,previewUrl:previewUrl?.href||'',
    canvasReturnTo:'/courses/'+c+'/files/'+f,
    publicUrlEndpoint:{result:endpointResult,status:endpointStatus},
    previewDelivery:delivery,
    workerVersion:'browser-native-fallback'
  };
}

const api={transport,getCanvasSessionUrl,getExternalToolLaunch,getAssignmentSubmission,uploadAssignmentFile,uploadAssignmentFiles,uploadQuizSubmissionFile,downloadCanvasFile,startQuiz,getCurrentQuizSubmission,resumeQuiz,getQuizTime,saveQuizAnswers,updateQuizQuestionFlag,completeQuiz,questionType,questionSupported};
root.NorthstarWorkspace=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
