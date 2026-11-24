/* NORTHSTAR assignment execution classifier: metadata only; no title/URL provider guessing. */
(function(root){
'use strict';
const KNOWN_TYPES=new Set(['online_quiz','none','on_paper','discussion_topic','external_tool','basic_lti_launch','online_upload','online_text_entry','online_url','media_recording','student_annotation']);
const str=v=>typeof v==='string'?v.trim():'';
function providerKind(a){
 const tool=a.external_tool||a.externalTool||a.tool||{},attrs=a.external_tool_tag_attributes||a.externalToolTagAttributes||{};
 const explicit=[tool.name,tool.vendor,tool.product,tool.description,a.external_tool_name,a.externalToolName,a.lti_tool_name,a.provider_name,attrs.tool_name,attrs.provider_name].map(str).filter(Boolean).join(' ').toLowerCase();
 if(/google\s*(assignments|workspace\s*lti)|assignments\s*lti/.test(explicit))return 'google_assignments';
 if(/google\s*drive\s*lti|drive\s*lti/.test(explicit))return 'google_drive_lti';
 return 'external_tool';
}
function classify(input){
 const a=input&&typeof input==='object'?input:{},types=[...new Set((Array.isArray(a.submission_types||a.submissionTypes)?(a.submission_types||a.submissionTypes):[]).map(x=>str(x).toLowerCase()).filter(Boolean))];
 let kind='unknown',owner='unknown',launchMethod='none',primaryAction='Review assignment in Canvas';
 if(types.includes('discussion_topic')){kind='discussion';owner='canvas';launchMethod='canvas_session';primaryAction='Open Discussion';}
 else if(types.includes('student_annotation')){kind='student_annotation';owner='canvas';launchMethod='canvas_session';primaryAction='Open Student Annotation';}
 else if(types.includes('external_tool')||types.includes('basic_lti_launch')){kind=providerKind(a);owner='external_provider';launchMethod='sessionless_launch';primaryAction=kind==='google_assignments'?'Open Google Assignments':kind==='google_drive_lti'?'Open Google Drive LTI':'Open in Canvas provider';}
 else if(types.includes('online_quiz')){kind='quiz';owner='canvas';launchMethod='canvas_session';primaryAction='Take Quiz in Canvas';}
 else if(types.includes('media_recording')){kind='media_recording';owner='canvas';launchMethod='canvas_session';primaryAction='Open Canvas Recorder';}
 else if(types.includes('online_upload')){kind='file_upload';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Submit File';}
 else if(types.includes('online_text_entry')){kind='text_entry';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Write Response';}
 else if(types.includes('online_url')){kind='url';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Submit URL';}
 else if(types.includes('on_paper')){kind='offline_paper';owner='none';primaryAction='View Assignment';}
 else if(types.includes('none')){kind='offline';owner='none';primaryAction='View Assignment';}
 const published=a.published!==false,locked=a.locked_for_user===true||a.lockedForUser===true;
 const canSubmit=typeof a.can_submit==='boolean'?a.can_submit:(typeof a.canSubmit==='boolean'?a.canSubmit:null);
 const group=Number(a.group_category_id||a.groupCategoryId)>0,available=published&&!locked&&canSubmit!==false&&!group;
 const known=types.filter(t=>KNOWN_TYPES.has(t));
 return {kind,owner,provider:kind,launchMethod,primaryAction,submissionTypes:types,knownSubmissionTypes:known,unknownSubmissionTypes:types.filter(t=>!KNOWN_TYPES.has(t)),assignmentId:Number.isSafeInteger(Number(a.id))?Number(a.id):null,courseId:Number.isSafeInteger(Number(a.course_id||a.courseId))?Number(a.course_id||a.courseId):null,annotatableAttachmentId:Number.isSafeInteger(Number(a.annotatable_attachment_id||a.annotatableAttachmentId))?Number(a.annotatable_attachment_id||a.annotatableAttachmentId):null,published,locked,canSubmit,groupAssignment:group,available,resubmissionAllowed:canSubmit===true?true:canSubmit===false?false:null,submissionState:a.submission?.workflow_state||a.submission?.workflowState||a.subState||null,submissionOwner:owner,requiresProvider:['discussion','student_annotation','external_tool','google_assignments','google_drive_lti','quiz','media_recording'].includes(kind),safeFallback:kind==='unknown'};
}
root.NorthstarAssignmentExecution={classify,knownTypes:[...KNOWN_TYPES],providerKind};
if(typeof module!=='undefined'&&module.exports)module.exports=root.NorthstarAssignmentExecution;
})(typeof globalThis!=='undefined'?globalThis:this);
