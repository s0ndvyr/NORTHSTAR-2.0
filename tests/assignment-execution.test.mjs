import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const E=createRequire(import.meta.url)('../scripts/assignment-execution.js');
const classify=E.classify,resource=E.classifyResource;
const cases=[
 [{submission_types:['online_upload']},'file_upload'],[{submission_types:['online_text_entry']},'text_entry'],[{submission_types:['online_url']},'url'],
 [{submission_types:['external_tool']},'external_tool'],[{submission_types:['external_tool'],external_tool:{name:'Google Assignments LTI'}},'google_assignments'],
 [{submission_types:['external_tool'],external_tool_tag_attributes:{resource_link_title:'Google Assignments'}},'google_assignments'],
 [{submission_types:['external_tool'],external_tool:{name:'Google Drive LTI'}},'google_drive_lti'],[{submission_types:['student_annotation'],annotatable_attachment_id:441},'student_annotation'],
 [{submission_types:['online_quiz']},'quiz'],[{submission_types:['discussion_topic']},'discussion'],[{submission_types:['media_recording']},'media_recording'],
 [{submission_types:['on_paper']},'offline_paper'],[{submission_types:['none']},'offline'],
 [{submission_types:['external_tool','online_upload']},'external_tool'],[{submission_types:['online_upload','online_text_entry']},'file_upload']
];
for(const [input,expected] of cases)assert.equal(classify(input).kind,expected);
assert.deepEqual(classify({submission_types:['online_upload','online_text_entry']}).submissionTypes,['online_upload','online_text_entry']);
assert.equal(classify({name:'Google Docs essay',submission_types:['online_upload']}).kind,'file_upload');
assert.equal(classify({name:'Google Assignments Essay',submission_types:['external_tool']}).kind,'external_tool','assignment title alone must not guess the provider');
assert.equal(classify({submission_types:['online_upload'],external_tool_tag_attributes:{url:'https://assignments.google.com'}}).kind,'file_upload');
assert.equal(classify({}).kind,'unknown');assert.equal(classify({}).submissionTypeState,'missing');assert.equal(classify({}).confirmedOffline,false);
assert.equal(classify({submission_types:[]}).kind,'unknown');assert.equal(classify({submission_types:[]}).submissionTypeState,'empty');
assert.equal(classify({submission_types:['future_type']}).kind,'unknown');assert.equal(classify({submission_types:['future_type']}).submissionTypeState,'unsupported');
assert.equal(classify({submission_types:['online_upload','future_type']}).submissionTypeState,'mixed');
assert.deepEqual(classify({submission_types:['online_upload','future_type']}).unknownSubmissionTypes,['future_type']);
assert.equal(classify({submission_types:['online_upload'],published:false}).availability,'unavailable');
assert.equal(classify({submission_types:['online_upload'],locked_for_user:true}).availability,'unavailable');
assert.equal(classify({submission_types:['online_upload'],can_submit:false}).availability,'unavailable');
assert.equal(classify({submission_types:['online_upload'],can_submit:true}).availability,'available');
assert.equal(classify({submission_types:['online_upload']}).availability,'unknown');
assert.equal(classify({submission_types:['online_upload'],can_submit:true}).resubmissionAllowed,null);
assert.equal(classify({submission_types:['online_upload'],can_resubmit:false}).resubmissionAllowed,false);
const resourceCases=[
 [{name:'Worksheet.PDF',content_type:'application/pdf'},'pdf','northstar_pdf'],
 [{name:'Essay.DOC',content_type:'application/msword'},'word_legacy','canvas'],
 [{name:'Essay.docx'},'word','northstar_office'],
 [{name:'table.xls'},'spreadsheet_legacy','canvas'],[{name:'table.xlsx'},'spreadsheet','northstar_office'],
 [{name:'slides.ppt'},'presentation_legacy','canvas'],[{name:'slides.pptx'},'presentation','northstar_office'],
 [{name:'image.jpg',content_type:'image/jpeg'},'image','native_image']
];
for(const [input,kind,preview] of resourceCases){const r=resource(input);assert.equal(r.kind,kind,input.name);assert.equal(r.preview,preview,input.name);}
console.log('assignment-execution: classification, unknown metadata, availability, provider, and attachment fixtures passed');
