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

await W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl});
assert(new URL(calls.at(-1).url).searchParams.get('path').includes('/complete'));
assert.equal(JSON.parse(calls.at(-1).opts.body).attempt,1);
await assert.rejects(W.startQuiz({credentials:{base:credentials.base,token:'x'},courseId:11,quizId:22,fetchImpl}),/private Canvas bridge/);
await assert.rejects(W.saveQuizAnswers({credentials,submission:started.submission,answers:[],fetchImpl}),/no answers/i);

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
  if(path==='/api/v1/courses/11/files/42')return {ok:true,status:200,json:async()=>({id:42,display_name:'worksheet.pdf','content-type':'application/pdf',url:'https://cdn.inscloudgate.net/signed/worksheet.pdf?signature=short-lived'})};
  if(parsed.hostname==='cdn.inscloudgate.net')return {ok:true,status:200,url:'https://cdn.inscloudgate.net/signed/worksheet.pdf?signature=short-lived',headers:{get:name=>name==='Content-Type'?'application/pdf':name==='Content-Disposition'?'inline; filename="worksheet.pdf"':null},arrayBuffer:async()=>new Uint8Array([37,80,68,70,45,49]).buffer};
  if(path==='/api/v1/courses/11/files/42/download')return {ok:true,status:200,headers:{get:name=>name==='Content-Type'?'application/pdf':name==='Content-Disposition'?'attachment; filename="worksheet.pdf"':name==='X-Northstar-Worker-Version'?'0.4.16 (4.4.7.2)':null},arrayBuffer:async()=>new Uint8Array([37,80,68,70,45,49]).buffer};
  throw Error('Unexpected PDF endpoint '+url);
}});
assert.equal(pdf.name,'worksheet.pdf');
assert.equal(pdf.contentType,'application/pdf');
assert.equal(pdf.workerVersion,'browser-direct');
assert.equal(pdf.size,6);
assert.deepEqual([...pdf.bytes],[37,80,68,70,45,49]);
assert.equal(pdfFetchCalls.length,2,'PDF metadata is fetched through the bridge, then the signed PDF is fetched directly from the student browser');
assert.equal(pdfFetchCalls[0].opts.headers.Authorization,'Bearer secret-token','Canvas token is used only for metadata through the private bridge');
assert.equal(pdfFetchCalls[1].opts.headers.Authorization,undefined,'Canvas bearer token is never sent to signed storage');
assert.equal(pdfFetchCalls[1].opts.credentials,'omit','signed storage request does not send browser cookies');
assert.equal(pdfFetchCalls[1].opts.redirect,'follow','browser follows Canvas storage redirects');

// If browser CORS or the short-lived URL fails, the existing private bridge remains a fallback.
const fallbackCalls=[];
const fallbackPdf=await W.downloadCanvasFile({credentials,courseId:11,fileId:43,fetchImpl:async(url,opts)=>{
  fallbackCalls.push({url,opts});
  const parsed=new URL(url),path=parsed.searchParams.get('path');
  if(path==='/api/v1/courses/11/files/43')return {ok:true,status:200,json:async()=>({id:43,display_name:'fallback.pdf','content-type':'application/pdf',url:'https://cdn.inscloudgate.net/signed/fallback.pdf'})};
  if(parsed.hostname==='cdn.inscloudgate.net')throw new TypeError('CORS blocked browser direct storage access');
  if(path==='/api/v1/courses/11/files/43/download')return {ok:true,status:200,headers:{get:name=>name==='Content-Type'?'application/pdf':name==='Content-Disposition'?'attachment; filename="fallback.pdf"':name==='X-Northstar-Worker-Version'?'0.4.16 (4.4.7.2)':null},arrayBuffer:async()=>new Uint8Array([37,80,68,70,45,49]).buffer};
  throw Error('Unexpected PDF fallback endpoint '+url);
}});
assert.equal(fallbackPdf.name,'fallback.pdf');
assert.equal(fallbackPdf.workerVersion,'0.4.16 (4.4.7.2)');
assert.equal(fallbackPdf.size,6);
assert.equal(fallbackCalls.length,3,'browser CORS failure falls back to the authenticated private bridge');
assert.equal(fallbackCalls[1].opts.headers.Authorization,undefined,'browser direct attempt never receives the Canvas token');
assert.equal(fallbackCalls[2].opts.headers.Authorization,'Bearer secret-token','bridge fallback uses the Canvas token only with the private bridge');

const failedPdfError=await W.transport(credentials,async()=>({
  ok:false,status:406,
  headers:{get:name=>name==='X-Northstar-Stage'?'content':name==='X-Northstar-Upstream-Status'?'406':name==='X-Northstar-Request-Id'?'ray-outer-406':name==='X-Northstar-Worker-Version'?'0.4.16 (4.4.7.2)':null},
  json:async()=>({error:'Canvas rejected the file request',code:'CANVAS_FILE_CONTENT_FAILED',stage:'content',upstreamStatus:406,requestId:'ray-outer-406',diagnostics:{stage:'content',upstreamStatus:406,upstreamHost:'storage.example.net',upstreamRayId:'ray-upstream-406',redirectCount:1,redirectHosts:['school.instructure.com'],courseScoped:true}})
})).getBinary('/api/v1/courses/11/files/42/download').catch(error=>error);
assert.equal(failedPdfError.stage,'content');
assert.equal(failedPdfError.upstreamStatus,406);
assert.equal(failedPdfError.requestId,'ray-outer-406');
assert.equal(failedPdfError.diagnostics.upstreamHost,'storage.example.net');
assert.equal(failedPdfError.bridgeStatus,406);
assert.equal(failedPdfError.workerVersion,'0.4.16 (4.4.7.2)');

const networkPdfError=await W.transport(credentials,async()=>({
  ok:false,status:502,
  headers:{get:name=>name==='X-Northstar-Stage'?'content':name==='X-Northstar-Failure'?'network':null},
  json:async()=>({error:'Could not reach the file host while downloading the attachment',code:'CANVAS_FILE_CONTENT_NETWORK_FAILED',stage:'content',upstreamStatus:null,requestId:'ray-network',diagnostics:{stage:'content',failureType:'network',upstreamStatus:null,upstreamHost:'storage.example.net'}})
})).getBinary('/api/v1/courses/11/files/42/download').catch(error=>error);
assert.equal(networkPdfError.code,'CANVAS_FILE_CONTENT_NETWORK_FAILED');
assert.equal(networkPdfError.stage,'content');
assert.equal(networkPdfError.upstreamStatus,null);
assert.equal(networkPdfError.failureType,'network');
assert.equal(networkPdfError.diagnostics.upstreamHost,'storage.example.net');

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
