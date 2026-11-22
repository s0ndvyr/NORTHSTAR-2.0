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
    if(!response.ok){
      let detail={};try{detail=await response.json();}catch{}
      const stage=detail.stage||response.headers.get('X-Northstar-Stage')||'unknown';
      const upstreamHeader=response.headers.get('X-Northstar-Upstream-Status');
      const upstreamStatus=detail.upstreamStatus!==undefined?detail.upstreamStatus:(upstreamHeader!==null?Number(upstreamHeader):null);
      const code=detail.code||'CANVAS_FILE_DOWNLOAD_FAILED';
      const requestId=detail.requestId||response.headers.get('X-Northstar-Request-Id')||'';
      const failureType=detail.diagnostics?.failureType||response.headers.get('X-Northstar-Failure')||'http';
      const message=failureType==='network'
        ? (stage==='metadata'?'NORTHSTAR could not reach Canvas for attachment metadata (bridge HTTP '+response.status+').':'NORTHSTAR could not reach the file host during download (bridge HTTP '+response.status+').')
        : failureType==='redirect'
          ? 'NORTHSTAR stopped an unsafe or invalid file redirect (bridge HTTP '+response.status+').'
          : stage==='metadata'
            ? 'Canvas rejected the file metadata request (HTTP '+upstreamStatus+').'
            : stage==='content'
              ? 'Canvas rejected the actual file download (HTTP '+upstreamStatus+').'
              : 'Canvas file download failed (HTTP '+response.status+').';
      const error=Error(message+(requestId?' Reference: '+requestId:''));error.status=response.status;error.upstreamStatus=upstreamStatus===null?null:Number(upstreamStatus);error.stage=stage;error.code=code;error.requestId=requestId;error.failureType=failureType;error.workerVersion=response.headers.get('X-Northstar-Worker-Version')||'';error.diagnostics=detail.diagnostics&&typeof detail.diagnostics==='object'?detail.diagnostics:{};error.bridgeStatus=response.status;throw error;
    }
    const contentType=response.headers.get('Content-Type')||'application/octet-stream';
    const disposition=response.headers.get('Content-Disposition')||'';
    const match=disposition.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
    return {bytes:new Uint8Array(await response.arrayBuffer()),contentType,filename:match?decodeURIComponent(match[1].replace(/^"|"$/g,'')):'',workerVersion:response.headers.get('X-Northstar-Worker-Version')||''};
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
async function downloadCanvasFile({credentials,courseId,fileId,fetchImpl=root.fetch}){
  const c=id(courseId),f=id(fileId),api=transport(credentials,fetchImpl);
  const metadata=await api.get('/api/v1/courses/'+c+'/files/'+f);
  // Prefer Canvas's short-lived, file-specific download URL from metadata and fetch it
  // from the student's browser network. This avoids the Cloudflare-to-Cloudflare
  // Worker egress path that has been returning branded HTTP 406 HTML from storage.
  // The URL is treated as a temporary capability: never log, persist, or forward
  // the Canvas bearer token to it.
  const raw=metadata.url||metadata.download_url;
  const trustedHost=host=>{const h=String(host||'').toLowerCase();const base=new URL(credentials.base).hostname.toLowerCase();return h===base||h.endsWith('.instructure.com')||h.endsWith('.canvas-user-content.com')||h.endsWith('.inscloudgate.net');};
  const browserDelivery={attempted:false,result:'not_attempted',status:null,host:null,contentType:null};
  if(typeof raw==='string'&&raw){
    try{
      const target=new URL(raw,credentials.base);
      if(target.protocol==='https:'&&!target.username&&!target.password&&trustedHost(target.hostname)&&!target.searchParams.has('access_token')){
        browserDelivery.attempted=true;browserDelivery.host=target.hostname;
        const response=await fetchImpl(target.href,{method:'GET',headers:{Accept:'application/pdf,application/octet-stream,*/*'},mode:'cors',credentials:'omit',cache:'no-store',redirect:'follow'});
        const finalUrl=response.url?new URL(response.url):target;
        browserDelivery.host=trustedHost(finalUrl.hostname)?finalUrl.hostname:'untrusted-redirect';
        browserDelivery.status=response.status;
        browserDelivery.contentType=response.headers.get('Content-Type')||'';
        if(!response.ok)browserDelivery.result='http_error';
        else if(finalUrl.protocol!=='https:'||!trustedHost(finalUrl.hostname))browserDelivery.result='untrusted_redirect';
        else{
          const bytes=new Uint8Array(await response.arrayBuffer());
          if(bytes.length>=5&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-'){
            const disposition=response.headers.get('Content-Disposition')||'';
            const match=disposition.match(/filename\\*?=(?:UTF-8''|")?([^;"]+)/i);
            return {id:f,name:(match?decodeURIComponent(match[1].replace(/^"|"$/g,'')):'')||metadata.display_name||metadata.filename||('Canvas file '+f),contentType:browserDelivery.contentType||metadata['content-type']||metadata.content_type||'application/pdf',bytes,size:bytes.byteLength,workerVersion:'browser-direct'};
          }
          browserDelivery.result='not_pdf';
        }
      }else browserDelivery.result='url_not_trusted';
    }catch(error){
      // Do not retain or report the temporary URL or browser exception text.
      browserDelivery.result='browser_fetch_blocked';
    }
  }else browserDelivery.result='metadata_url_missing';
  try{
    const download=await api.getBinary('/api/v1/courses/'+c+'/files/'+f+'/download');
    return {id:f,name:download.filename||metadata.display_name||metadata.filename||('Canvas file '+f),contentType:download.contentType||metadata['content-type']||metadata.content_type||'',bytes:download.bytes,size:download.bytes.byteLength,workerVersion:download.workerVersion||''};
  }catch(error){
    error.browserDelivery=browserDelivery;
    throw error;
  }
}
const api={transport,getCanvasSessionUrl,getExternalToolLaunch,uploadAssignmentFile,uploadAssignmentFiles,uploadQuizSubmissionFile,downloadCanvasFile,startQuiz,getCurrentQuizSubmission,resumeQuiz,getQuizTime,saveQuizAnswers,updateQuizQuestionFlag,completeQuiz,questionType,questionSupported};
root.NorthstarWorkspace=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
