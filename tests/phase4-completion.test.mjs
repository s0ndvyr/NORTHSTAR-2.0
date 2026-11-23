import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const workspace = require('../scripts/workspace.js');
const submissions = require('../scripts/submissions.js');

const supported = type => ({id:1, question_type:type, answers:
  ['multiple_choice_question','true_false_question','multiple_answers_question'].includes(type)
    ? [{id:11,text:'A'},{id:12,text:'B'}]
    : type==='matching_question'
      ? [{id:1,answer_match_left:'Left A'},{id:2,answer_match_left:'Left B'},{id:11,answer_match_right:'Right A'},{id:12,answer_match_right:'Right B'}]
      : ['fill_in_multiple_blanks_question','multiple_dropdowns_question'].includes(type)
        ? [{id:11,blank_id:'color'},{id:12,blank_id:'shape'}]
        : []
});
for (const type of ['multiple_choice_question','true_false_question','multiple_answers_question','essay_question','short_answer_question','numerical_question','calculated_question','matching_question','fill_in_multiple_blanks_question','multiple_dropdowns_question','text_only_question','file_upload_question']) {
  const row = supported(type);
  if (['essay_question','short_answer_question','numerical_question','calculated_question','text_only_question'].includes(type)) row.question_type=type;
  assert.equal(workspace.questionSupported(row), true, type+' should be supported');
}
assert.equal(workspace.questionSupported({id:2,question_type:'matching_question',answers:[{id:1,answer_match_left:'L'}]}), false, 'malformed matching question is not claimed as supported');
assert.equal(workspace.questionSupported({id:3,question_type:'unsupported_vendor_question',answers:[]}), false, 'unknown question formats remain on Canvas fallback');
assert.equal(workspace.questionSupported({id:4,question_type:'file_upload_question'}), true, 'Canvas Classic Quiz file-upload questions are supported by a dedicated upload endpoint');

assert.deepEqual(submissions.payload('online_upload',[101,102]).submission.file_ids,[101,102], 'multiple Canvas file IDs can be submitted together');
assert.deepEqual(submissions.payload('online_upload',101).submission.file_ids,[101], 'single file compatibility is preserved');
assert.throws(()=>submissions.payload('online_upload',[101,'bad']),/Upload every selected file/, 'invalid file ID blocks submission');
assert.throws(()=>submissions.payload('online_upload',Array.from({length:11},(_,i)=>i+1)),/at most 10/, 'more than ten attachments is blocked');

const calls=[];
const credentials={base:'https://school.instructure.com',token:'secret-token',proxy:'https://bridge.example/worker'};
const fetchMock=async(url,options={})=>{
  const target=new URL(url);calls.push({url:target.href,opts:options});
  assert.equal(target.origin,'https://bridge.example');assert.equal(target.searchParams.get('action'),'upload-file');
  assert.equal(target.searchParams.get('kind'),'assignment');assert.equal(target.searchParams.get('course_id'),'1');assert.equal(target.searchParams.get('resource_id'),'9');
  assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer secret-token');
  assert.equal(options.headers['Content-Type'],undefined);assert.deepEqual([...options.body.keys()],['file']);
  const file=options.body.get('file'),id=file.name==='one.txt'?501:502;
  return new Response(JSON.stringify({id,display_name:file.name,size:file.size}),{status:200,headers:{'Content-Type':'application/json'}});
};
const files=[new File(['one'],'one.txt',{type:'text/plain'}),new File(['two'],'two.txt',{type:'text/plain'})],progress=[];
const uploaded=await workspace.uploadAssignmentFiles({credentials,courseId:1,assignmentId:9,files,onProgress:event=>progress.push(event),fetchImpl:fetchMock});
assert.equal(uploaded.length,2);assert.deepEqual(uploaded.map(file=>file.id),[501,502]);assert.equal(calls.length,2);
assert.equal(progress.filter(x=>x.phase==='uploaded').length,2,'progress is reported after Canvas file finalization');
const payload=submissions.payload('online_upload',uploaded.map(file=>file.id));
assert.deepEqual(payload.submission.file_ids,[501,502]);
let submissionRequest=null;
const result=await submissions.send({credentials,courseId:1,assignmentId:9,data:payload,fetchImpl:async(url,options)=>{
  submissionRequest={url,options};const target=new URL(url);
  assert.equal(target.origin,'https://bridge.example');assert.equal(target.searchParams.get('path'),'/api/v1/courses/1/assignments/9/submissions');
  assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer secret-token');
  assert.deepEqual(JSON.parse(options.body),{submission:{submission_type:'online_upload',file_ids:[501,502]}});
  return new Response(JSON.stringify({workflow_state:'submitted',attempt:1,submitted_at:'2026-11-22T12:00:00Z'}),{status:200,headers:{'Content-Type':'application/json'}});
}});
assert.equal(result.workflow_state,'submitted');assert.ok(submissionRequest);
console.log('PASS: Phase 4 completion unit tests (expanded Classic Quiz types, multi-file payloads and staged Canvas uploads)');
