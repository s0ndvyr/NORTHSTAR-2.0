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

const credentials={base:'https://school.instructure.com',proxy:'https://bridge.example',token:'secret-token'};
const calls=[];
const fetchImpl=async(url,opts)=>{
  calls.push({url,opts});
  if(opts.method==='POST'&&new URL(url).searchParams.get('path')==='/api/v1/courses/11/quizzes/22/submissions')return {ok:true,status:200,json:async()=>({quiz_submissions:[{id:77,attempt:1,validation_token:'validation-secret'}]})};
  if(opts.method==='GET'){const path=new URL(url).searchParams.get('path')||'';if(path.endsWith('/time'))return {ok:true,status:200,json:async()=>({time_left:180,end_at:'2026-11-18T05:00:00Z'})};return {ok:true,status:200,json:async()=>({quiz_submission_questions:[{id:9,answer:null,quiz_question:{id:9,question_type:'multiple_choice_question',question_text:'Pick one',answers:[{id:1,text:'A'}]}}]})};}
  return {ok:true,status:200,json:async()=>({ok:true})};
};
const started=await W.startQuiz({credentials,courseId:11,quizId:22,fetchImpl});
assert.equal(started.submission.id,77);
assert.equal(started.questions.length,1);
assert.equal(started.timing.time_left,180,'Canvas timing endpoint supplies authoritative remaining time');
assert(calls[0].url.startsWith('https://bridge.example/'));
assert(!calls[0].url.includes('secret-token'));
assert.equal(calls[0].opts.headers.Authorization,'Bearer secret-token');
assert.equal(JSON.parse(calls[0].opts.body).access_code,undefined);
await W.saveQuizAnswers({credentials,submission:started.submission,answers:[{id:9,answer:1}],fetchImpl});
assert.equal(JSON.parse(calls.at(-1).opts.body).quiz_questions[0].answer,1);
await W.completeQuiz({credentials,courseId:11,quizId:22,submission:started.submission,fetchImpl});
assert(new URL(calls.at(-1).url).searchParams.get('path').includes('/complete'));
assert.equal(JSON.parse(calls.at(-1).opts.body).attempt,1);
await assert.rejects(W.startQuiz({credentials:{base:credentials.base,token:'x'},courseId:11,quizId:22,fetchImpl}),/private Canvas bridge/);
await assert.rejects(W.saveQuizAnswers({credentials,submission:started.submission,answers:[],fetchImpl}),/no answers/i);

const uploadCalls=[];
const file=new File(['hello'],'homework.txt',{type:'text/plain'});
const uploaded=await W.uploadAssignmentFile({credentials,courseId:11,assignmentId:33,file,fetchImpl:async(url,opts)=>{
  uploadCalls.push({url,opts});
  if(new URL(url).hostname==='bridge.example'){const path=new URL(url).searchParams.get('path');if(opts.method==='GET'&&path==='/api/v1/users/self')return {ok:true,status:200,json:async()=>({id:7})};return {ok:true,status:200,json:async()=>({upload_url:'https://upload.example/signed',upload_params:{key:'signed-key',policy:'signed-policy'}})};}
  assert.equal(opts.method,'POST');
  assert.equal(opts.headers?.Authorization,undefined,'signed upload must never receive Canvas bearer token');
  const fields=[...opts.body.keys()];assert.deepEqual(fields,['key','policy','file'],'file must be appended last');
  return {ok:true,status:201,json:async()=>({id:55,display_name:'homework.txt'})};
}});
assert.equal(uploaded.id,55);
assert.equal(uploadCalls.length,3,'current-user lookup, upload initialization and signed file upload are all required');

console.log('PASS: Canvas quiz start, question retrieval, answer save, completion, bridge-only writes and validation');
