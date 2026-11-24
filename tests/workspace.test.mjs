import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const W=createRequire(import.meta.url)('../scripts/workspace.js');

assert.equal(W.questionSupported({id:1,quiz_question:{id:1,question_type:'multiple_choice_question',answers:[{id:2,text:'A'}]}}),true);
assert.equal(W.questionSupported({id:7,question_type:'multiple_choice_question',answers:[{id:8,text:'A'}]}),true,'flattened question records are supported too');
assert.equal(W.questionSupported({id:2,quiz_question:{id:2,question_type:'true_false_question',answers:[{id:3,text:'True'}]}}),true);
assert.equal(W.questionSupported({id:3,quiz_question:{id:3,question_type:'essay_question'}}),true);
assert.equal(W.questionSupported({id:4,quiz_question:{id:4,question_type:'text_only_question'}}),true);
assert.equal(W.questionSupported({id:5,quiz_question:{id:5,question_type:'multiple_choice_question',answers:[]}}),false,'hidden answer choices must trigger Canvas fallback');
assert.equal(W.questionSupported({id:6,quiz_question:{id:6,question_type:'fill_in_multiple_blanks_question'}}),false,'unimplemented answer formats must not be marked safe to submit');
assert.equal(W.questionSupported({id:8,quiz_question:{id:8,question_type:'file_upload_question'}}),true,'file-upload questions use the dedicated Canvas quiz attachment API');

const credentials={base:'https://school.instructure.com',proxy:'https://bridge.example',token:'secret-token'};
const calls=[];
const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  if(opts.method==='POST'&&new URL(url).searchParams.get('path')==='/api/v1/courses/11/quizzes/22/submissions')return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,validation_token:'validation-secret'}]})};
  if(opts.method==='GET'){
  const path=new URL(url).searchParams.get('path')||'';
  if(path.startsWith('/login/session_token'))return {ok:true,status:200,json:async()=>({session_url:'https://school.instructure.com/login?session_token=short-lived'})};
  if(path.startsWith('/api/v1/courses/11/external_tools/sessionless_launch'))return {ok:true,status:200,json:async()=>({id:44,name:'Publisher Assessment',url:'https://publisher.example/lti/launch?state=opaque'})};
  if(path==='/api/v1/courses/11/quizzes/22/submission')return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,workflow_state:'complete',finished_at:'2026-11-18T10:00:00Z'}]})};
  if(path.endsWith('/time'))return {ok:true,status:200,json:async()=>({time_left:180,end_at:'2026-11-18T05:00:00Z'})};
  return {ok:true,status:200,json:async()=>({quiz_submission_questions:[{id:9,answer:null,quiz_question:{id:9,question_type:'multiple_choice_question',question_text:'Pick one',answers:[{id:1,text:'A'}]}}]})};
}
  return {ok:true,status:200,json:async()=>({ok:true})};
};
const session=await W.getCanvasSessionUrl({credentials,returnTo:'/courses/11/assignments/33',fetchImpl});
assert.equal(new URL(session.sessionUrl).origin,'https://school.instructure.com','Canvas session URL must match the connected school');
assert.ok(new URL(session.sessionUrl).searchParams.has('session_token'));
assert.equal(new URL(calls.at(-1).url).searchParams.get('path'),'/login/session_token?return_to=%2Fcourses%2F11%2Fassignments%2F33');
await assert.rejects(W.getCanvasSessionUrl({credentials,returnTo:'https://evil.example/login',fetchImpl}),/supported Canvas/,'arbitrary off-domain return URLs are rejected before network access');
const tool=await W.getExternalToolLaunch({credentials,courseId:11,assignmentId:33,fetchImpl});
assert.equal(tool.name,'Publisher Assessment');
assert.equal(new URL(tool.url).origin,'https://publisher.example','Canvas-issued LTI launch may use the registered provider origin');
await assert.rejects(W.getExternalToolLaunch({credentials,courseId:11,assignmentId:33,fetchImpl:async()=>({ok:true,status:200,json:async()=>({url:'http://insecure.example/launch'})})}),/security validation/,'non-HTTPS provider launch URLs are rejected');
const started=await W.startQuiz({credentials,courseId:11,quizId:22,fetchImpl});
assert.equal(started.submission.id,77);
assert.equal(started.questions.length,1);
assert.equal(started.timing.time_left,180,'Canvas timing endpoint supplies authoritative remaining time');
assert(calls[0].url.startsWith('https://bridge.example/'));
assert(!calls[0].url.includes('secret-token'));
assert.equal(calls[0].opts.headers.Authorization,'Bearer secret-token');
const startCall=calls.find(call=>new URL(call.url).searchParams.get('path')==='/api/v1/courses/11/quizzes/22/submissions');
assert.ok(startCall,'classic quiz start request was sent');
assert.equal(JSON.parse(startCall.opts.body).access_code,undefined);
await W.saveQuizAnswers({credentials,submission:started.submission,answers:[{id:9,answer:1}],fetchImpl});
assert.equal(JSON.parse(calls.at(-1).opts.body).quiz_questions[0].answer,1);
await W.updateQuizQuestionFlag({credentials,submission:started.submission,questionId:9,flagged:true,fetchImpl});
assert.equal(calls.at(-1).opts.method,'PUT','review flags use the dedicated Canvas PUT endpoint');
assert.equal(new URL(calls.at(-1).url).searchParams.get('path'),'/api/v1/quiz_submissions/77/questions/9/flag');
assert.equal(JSON.parse(calls.at(-1).opts.body).attempt,1);
await W.updateQuizQuestionFlag({credentials,submission:started.submission,questionId:9,flagged:false,fetchImpl});
assert.equal(new URL(calls.at(-1).url).searchParams.get('path'),'/api/v1/quiz_submissions/77/questions/9/unflag');

const callsBeforeComplete=calls.length;
const completionResult=await W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl});
const completionCalls=calls.slice(callsBeforeComplete);
const completionRequest=completionCalls.find(call=>new URL(call.url).searchParams.get('path')==='/api/v1/courses/11/quizzes/22/submissions/77/complete');
assert.ok(completionRequest,'official Canvas quiz completion request was sent');
assert.equal(completionRequest.opts.method,'POST');
assert.equal(JSON.parse(completionRequest.opts.body).attempt,1);
assert.equal(new URL(completionCalls.at(-1).url).searchParams.get('path'),'/api/v1/courses/11/quizzes/22/submission','completion is followed by an authoritative Canvas attempt read');
assert.equal(completionResult.confirmed,true);
await assert.rejects(W.startQuiz({credentials:{base:credentials.base,token:'x'},courseId:11,quizId:22,fetchImpl}),/private Canvas bridge/);
await assert.rejects(W.saveQuizAnswers({credentials,submission:started.submission,answers:[],fetchImpl}),/no answers/i);

// Assignment completion is read back from the official student submission
// record; upload and POST response alone are not treated as proof.
const assignmentReads=[];
const assignmentReceipt=await W.getAssignmentSubmission({credentials,courseId:11,assignmentId:33,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');assignmentReads.push(path);
 if(path==='/api/v1/courses/11/assignments/33?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true')return {ok:true,status:200,json:async()=>({id:33,submission:{id:88,attempt:2,workflow_state:'submitted',submission_type:'online_upload',submitted_at:'2026-11-23T16:00:00Z',attachments:[{id:501,filename:'annotated.pdf'}]},can_submit:true,allowed_extensions:['pdf']})};
 if(path==='/api/v1/users/self')return {ok:true,status:200,json:async()=>({id:700})};
 if(path==='/api/v1/courses/11/assignments/33/submissions/700?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment')return {ok:true,status:200,json:async()=>({attempt:2,submission_history:[{attempt:1,workflow_state:'submitted'},{attempt:2,workflow_state:'submitted'}],submission_comments:[],rubric_assessment:{}})};
 throw Error('Unexpected assignment verification path '+path);
}});
assert.equal(assignmentReceipt.submission.attempt,2);
assert.equal(assignmentReceipt.submission.workflow_state,'submitted');
assert.equal(assignmentReceipt.submissionDetails.submission_history.length,2);
assert.equal(assignmentReceipt.canSubmit,true);
assert.deepEqual(assignmentReads,[
 '/api/v1/courses/11/assignments/33?include%5B%5D=submission&include%5B%5D=can_submit&all_dates=true',
 '/api/v1/users/self',
 '/api/v1/courses/11/assignments/33/submissions/700?include%5B%5D=submission_history&include%5B%5D=submission_comments&include%5B%5D=full_rubric_assessment'
]);
await assert.rejects(W.getAssignmentSubmission({credentials,courseId:11,assignmentId:33,fetchImpl:async()=>({ok:true,status:200,json:async()=>({id:33})})}),/current student submission record/,'an assignment response without its submission property is not treated as verification');

const quizReceipt={id:77,attempt:1,finished_at:'2026-11-23T16:20:00Z',workflow_state:'complete'};
const completeCalls=[];
const completedQuiz=await W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');completeCalls.push({path,method:opts.method,body:opts.body});
 if(path==='/api/v1/courses/11/quizzes/22/submissions/77/complete')return {ok:true,status:200,json:async()=>({quiz_submission:{id:77,attempt:1}})};
 if(path==='/api/v1/courses/11/quizzes/22/submission')return {ok:true,status:200,json:async()=>({quiz_submissions:[quizReceipt]})};
 throw Error('Unexpected quiz reconciliation path '+path);
}});
assert.equal(completedQuiz.confirmed,true);
assert.equal(completedQuiz.submission.finished_at,quizReceipt.finished_at);
assert.deepEqual(completeCalls.map(call=>call.path),[
 '/api/v1/courses/11/quizzes/22/submissions/77/complete',
 '/api/v1/courses/11/quizzes/22/submission'
],'quiz completion is independently read after the official completion request');

await assert.rejects(W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');
 if(path.endsWith('/complete'))return {ok:true,status:200,json:async()=>({quiz_submission:{id:77,attempt:1}})};
 return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,workflow_state:'untaken',finished_at:null}]})};
}}),error=>error.completionOutcomeUnknown===true&&/not independently confirmed/.test(error.message),'an HTTP success without a completed Canvas attempt remains unconfirmed');
await assert.rejects(W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');
 if(path.endsWith('/complete'))return {ok:true,status:200,json:async()=>({})};
 throw Error('Canvas read timed out');
}}),error=>error.completionOutcomeUnknown===true&&/before retrying/.test(error.message),'a lost reconciliation read blocks another completion request');

// A lost completion POST response is ambiguous: always read Canvas before
// deciding whether the attempt completed or whether the owner may retry.
const lostPostCalls=[];
const lostPostResult=await W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');lostPostCalls.push({path,method:opts.method});
 if(path.endsWith('/complete'))throw Error('socket closed after request write');
 if(path.endsWith('/submission'))return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,workflow_state:'complete',finished_at:'2026-11-23T17:00:00Z'}]})};
 throw Error('Unexpected lost-response path '+path);
}});
assert.equal(lostPostResult.confirmed,true,'Canvas read-back can confirm completion after the POST response is lost');
assert.equal(lostPostResult.completionResponseLost,true,'the receipt records that the completion response was lost');
assert.deepEqual(lostPostCalls.map(call=>call.path),[
 '/api/v1/courses/11/quizzes/22/submissions/77/complete',
 '/api/v1/courses/11/quizzes/22/submission'
],'a lost POST is reconciled with one read and is never automatically repeated');

const uncertainPostCalls=[];
await assert.rejects(W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');uncertainPostCalls.push({path,method:opts.method});
 if(path.endsWith('/complete'))throw Error('connection reset');
 if(path.endsWith('/submission'))return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,workflow_state:'untaken',finished_at:null}]})};
 throw Error('Unexpected uncertain path '+path);
}}),error=>error.completionOutcomeUnknown===true&&error.currentSubmission?.workflow_state==='untaken','a lost POST with an active attempt remains uncertain and requires explicit reconciliation');
assert.equal(uncertainPostCalls.filter(call=>call.path.endsWith('/complete')).length,1,'uncertain completion is never automatically posted twice');

for(const wrongReceipt of [
 {id:78,attempt:1,workflow_state:'complete',finished_at:'2026-11-23T17:00:00Z'},
 {id:77,attempt:2,workflow_state:'complete',finished_at:'2026-11-23T17:00:00Z'}
]){
 await assert.rejects(W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
  const path=new URL(url).searchParams.get('path');
  if(path.endsWith('/complete'))return {ok:true,status:200,json:async()=>({})};
  return {ok:true,status:200,json:async()=>({quiz_submissions:[wrongReceipt]})};
 }}),error=>error.completionOutcomeUnknown===true,'a different Canvas attempt ID or attempt number cannot produce a completion receipt');
}

let rejectedCompletionReads=0;
await assert.rejects(W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl:async(url,opts)=>{
 const path=new URL(url).searchParams.get('path');
 if(path.endsWith('/complete'))return {ok:false,status:400,json:async()=>({message:'Quiz attempt is not available'})};
 rejectedCompletionReads++;return {ok:true,status:200,json:async()=>({quiz_submissions:[]})};
}}),error=>error.status===400,'an explicit Canvas rejection remains a definitive failed completion');
assert.equal(rejectedCompletionReads,0,'definitive Canvas 4xx rejection is not misclassified as a lost response');

const uploadCalls=[];
const file=new File(['hello'],'homework.txt',{type:'text/plain'});
const uploaded=await W.uploadAssignmentFile({credentials,courseId:11,assignmentId:33,file,fetchImpl:async(url,opts)=>{
  uploadCalls.push({url,opts});const target=new URL(url);
  assert.equal(target.origin,'https://bridge.example');assert.equal(target.searchParams.get('action'),'upload-file');
  assert.equal(target.searchParams.get('kind'),'assignment');assert.equal(target.searchParams.get('course_id'),'11');assert.equal(target.searchParams.get('resource_id'),'33');
  assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer secret-token');assert.equal(opts.headers['Content-Type'],undefined);
  assert.equal(opts.redirect,'error');assert.deepEqual([...opts.body.keys()],['file']);assert.equal(opts.body.get('file').name,'homework.txt');
  return new Response(JSON.stringify({id:55,display_name:'homework.txt',size:5}),{status:200,headers:{'Content-Type':'application/json'}});
}});
assert.equal(uploaded.id,55);assert.equal(uploadCalls.length,1,'the private bridge owns Canvas initialization, signed transfer and finalization');
const quizUploadCalls=[];
const quizFile=new File(['quiz response'],'quiz-response.txt',{type:'text/plain'});
const quizUploaded=await W.uploadQuizSubmissionFile({credentials,courseId:11,quizId:22,file:quizFile,fetchImpl:async(url,opts)=>{
  quizUploadCalls.push({url,opts});const target=new URL(url);
  assert.equal(target.origin,'https://bridge.example');assert.equal(target.searchParams.get('action'),'upload-file');
  assert.equal(target.searchParams.get('kind'),'quiz');assert.equal(target.searchParams.get('course_id'),'11');assert.equal(target.searchParams.get('resource_id'),'22');
  assert.equal(opts.method,'POST');assert.equal(opts.headers.Authorization,'Bearer secret-token');assert.deepEqual([...opts.body.keys()],['file']);
  return new Response(JSON.stringify({id:909,display_name:'quiz-response.txt'}),{status:200,headers:{'Content-Type':'application/json'}});
}});
assert.equal(quizUploaded.id,909);assert.equal(quizUploaded.name,'quiz-response.txt');assert.equal(quizUploadCalls.length,1);
const pdfFetchCalls=[];
const pdf=await W.downloadCanvasFile({credentials,courseId:11,fileId:42,fetchImpl:async(url,opts)=>{
  pdfFetchCalls.push({url,opts});
  const parsed=new URL(url),path=parsed.searchParams.get('path');
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/courses/11/files/42')return {ok:true,status:200,json:async()=>({id:42,display_name:'worksheet.pdf','content-type':'application/pdf',size:6,url:'https://school.instructure.com/files/42/download'})};
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/files/42/public_url')return {ok:true,status:200,json:async()=>({public_url:'https://cdn.inscloudgate.net/inline/worksheet.pdf?signature=short-lived'})};
  if(parsed.hostname==='cdn.inscloudgate.net'){
    assert.equal(opts.headers.Authorization,undefined,'the signed browser preview is never given the Canvas bearer token');
    assert.equal(opts.credentials,'omit','signed storage requests never use Canvas browser cookies');
    assert.equal(opts.mode,'cors');
    assert.equal(opts.redirect,'follow');
    return new Response(new Uint8Array([37,80,68,70,45,49]),{status:200,headers:{'Content-Type':'application/pdf','Content-Length':'6'}});
  }
  throw Error('Unexpected PDF endpoint '+url);
}});
assert.equal(pdf.name,'worksheet.pdf');
assert.equal(pdf.contentType,'application/pdf');
assert.equal(pdf.workerVersion,'browser-public-preview');
assert.equal(pdf.size,6);
assert.deepEqual([...pdf.bytes],[37,80,68,70,45,49]);
assert.equal(pdfFetchCalls.length,3,'metadata and public_url are authenticated through the bridge; PDF bytes are fetched from the browser');
assert.equal(pdfFetchCalls[0].opts.headers.Authorization,'Bearer secret-token');
assert.equal(pdfFetchCalls[1].opts.headers.Authorization,'Bearer secret-token');
assert.equal(pdfFetchCalls[2].opts.headers.Authorization,undefined,'no Canvas credential crosses to the signed storage host');

// When the storage host refuses browser JavaScript access, return a validated
// native preview URL instead of retrying the same file through the Worker.
const nativeCalls=[];
const nativePdf=await W.downloadCanvasFile({credentials,courseId:11,fileId:43,fetchImpl:async(url,opts)=>{
  nativeCalls.push({url,opts});
  const parsed=new URL(url),path=parsed.searchParams.get('path');
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/courses/11/files/43')return {ok:true,status:200,json:async()=>({id:43,display_name:'fallback.pdf','content-type':'application/pdf',url:'https://school.instructure.com/files/43/download'})};
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/files/43/public_url')return {ok:true,status:200,json:async()=>({public_url:'https://cdn.inscloudgate.net/inline/fallback.pdf?signature=short-lived'})};
  if(parsed.hostname==='cdn.inscloudgate.net'){
    assert.equal(opts.headers.Authorization,undefined);
    assert.equal(opts.credentials,'omit');
    throw new TypeError('CORS blocked browser direct storage access');
  }
  throw Error('Unexpected native fallback request '+url);
}});
assert.equal(nativePdf.bytes,null,'a CORS refusal must never masquerade as readable PDF bytes');
assert.equal(nativePdf.previewUrl,'https://cdn.inscloudgate.net/inline/fallback.pdf?signature=short-lived');
assert.equal(nativePdf.canvasReturnTo,'/courses/11/files/43');
assert.equal(nativePdf.previewDelivery.result,'browser_fetch_blocked');
assert.equal(nativeCalls.length,3,'no Worker storage download retry occurs after the browser CORS refusal');

// If public_url is unavailable, the only authenticated binary attempt allowed
// is a non-redirecting request to the exact school Canvas origin.
const canvasOriginCalls=[];
const canvasFallback=await W.downloadCanvasFile({credentials,courseId:11,fileId:44,fetchImpl:async(url,opts)=>{
  canvasOriginCalls.push({url,opts});
  const parsed=new URL(url),path=parsed.searchParams.get('path');
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/courses/11/files/44')return {ok:true,status:200,json:async()=>({id:44,display_name:'canvas-only.pdf','content-type':'application/pdf',url:'https://school.instructure.com/files/44/download'})};
  if(parsed.hostname==='bridge.example'&&path==='/api/v1/files/44/public_url')return {ok:false,status:403,json:async()=>({message:'Preview URL unavailable'})};
  if(parsed.origin==='https://school.instructure.com'){
    assert.equal(opts.headers.Authorization,'Bearer secret-token','the bearer token is sent only to the exact Canvas origin');
    assert.equal(opts.redirect,'error','an authenticated Canvas-origin download never follows a storage redirect');
    throw new TypeError('Canvas origin redirected; browser read unavailable');
  }
  throw Error('Unexpected Canvas fallback request '+url);
}});
assert.equal(canvasFallback.previewUrl,'');
assert.equal(canvasFallback.canvasReturnTo,'/courses/11/files/44');
assert.equal(canvasFallback.publicUrlEndpoint.result,'http_error');
assert.equal(canvasFallback.previewDelivery.result,'canvas_origin_fetch_blocked');
assert.equal(canvasOriginCalls.length,3);

// A hostile URL returned by Canvas is not fetched or exposed as a native link.
const hostileCalls=[];
const hostilePdf=await W.downloadCanvasFile({credentials,courseId:11,fileId:45,fetchImpl:async(url,opts)=>{
  hostileCalls.push({url,opts});
  const parsed=new URL(url),path=parsed.searchParams.get('path');
  if(path==='/api/v1/courses/11/files/45')return {ok:true,status:200,json:async()=>({id:45,display_name:'hostile.pdf','content-type':'application/pdf'})};
  if(path==='/api/v1/files/45/public_url')return {ok:true,status:200,json:async()=>({public_url:'https://evil.example/private.pdf?signature=must-not-leak'})};
  throw Error('Untrusted preview host must never be contacted');
}});
assert.equal(hostilePdf.previewUrl,'');
assert.equal(hostilePdf.previewDelivery.result,'not_attempted');
assert.equal(hostileCalls.length,2,'untrusted public preview URLs are rejected before browser navigation or fetch');

const recoveryCalls=[];
const recoveryFetch=async(url,opts)=>{recoveryCalls.push({url,opts});const path=new URL(url).searchParams.get('path');if(path.endsWith('/submission'))return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,started_at:'2026-11-18T10:00:00Z',finished_at:null,workflow_state:'untaken'}]})};if(path.includes('/quiz_submissions/77/questions'))return {ok:true,status:200,json:async()=>({quiz_submission_questions:[{id:9,answer:1,quiz_question:{id:9,question_type:'multiple_choice_question',answers:[{id:1,text:'A'}]}}]})};if(path.endsWith('/time'))return {ok:true,status:200,json:async()=>({time_left:90})};throw Error('Unexpected recovery path '+path);};
const current=await W.getCurrentQuizSubmission({credentials,courseId:11,quizId:22,fetchImpl:recoveryFetch});
assert.equal(current.id,77,'current student attempt is discovered before a new attempt is offered');
const resumed=await W.resumeQuiz({credentials,courseId:11,quizId:22,submission:current,validationToken:'validation-secret',accessCode:'',fetchImpl:recoveryFetch});
assert.equal(resumed.questions.length,1,'existing attempt questions are restored');
assert.equal(resumed.timing.time_left,90,'existing attempt timing is restored');
assert(recoveryCalls.some(x=>new URL(x.url).searchParams.get('path').endsWith('/submission')));
await assert.rejects(W.getCurrentQuizSubmission({credentials,courseId:11,quizId:22,fetchImpl:async()=>({ok:false,status:404,json:async()=>({message:'No current attempt'})})}),/No current attempt/);
console.log('PASS: Canvas quiz start, question retrieval, answer save, completion, bridge-only writes and validation');
