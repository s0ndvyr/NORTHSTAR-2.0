/* NORTHSTAR assignment metadata and attachment classifiers.
 * Submission configuration and attachment format are intentionally independent.
 * Missing Canvas data must never be translated into an offline assignment.
 */
(function(root){
'use strict';
const KNOWN_TYPES=new Set(['online_quiz','none','on_paper','discussion_topic','external_tool','basic_lti_launch','online_upload','online_text_entry','online_url','media_recording','student_annotation']);
const str=v=>typeof v==='string'?v.trim():'';
function getTypes(a){
 const value=Array.isArray(a?.submission_types)?a.submission_types:a?.submissionTypes;
 if(!Array.isArray(value))return {types:[],state:'missing'};
 const types=[...new Set(value.map(x=>str(x).toLowerCase()).filter(Boolean))];
 if(!types.length)return {types,state:'empty'};
 const supported=types.filter(x=>KNOWN_TYPES.has(x)),unsupported=types.filter(x=>!KNOWN_TYPES.has(x));
 return {types,state:unsupported.length?(supported.length?'mixed':'unsupported'):'known',supported,unsupported};
}
function providerKind(a){
 const tool=a?.external_tool||a?.externalTool||a?.tool||{},attrs=a?.external_tool_tag_attributes||a?.externalToolTagAttributes||{};
 const names=[tool.name,tool.vendor,tool.product,tool.description,a?.external_tool_name,a?.externalToolName,a?.lti_tool_name,a?.provider_name,attrs.tool_name,attrs.provider_name].map(str).filter(Boolean).join(' ').toLowerCase();
 if(/google\s*(assignments|workspace\s*lti)|assignments\s*lti/.test(names))return 'google_assignments';
 if(/google\s*drive\s*lti|drive\s*lti/.test(names))return 'google_drive_lti';
 return 'external_tool';
}
function classify(input){
 const a=input&&typeof input==='object'?input:{},meta=getTypes(a),types=meta.types;
 let kind='unknown',owner='unknown',launchMethod='canvas_assignment',primaryAction='Open in Canvas';
 if(types.includes('external_tool')||types.includes('basic_lti_launch')){kind=providerKind(a);owner='external_provider';launchMethod='sessionless_launch';primaryAction=kind==='google_assignments'?'Open Google Assignments':kind==='google_drive_lti'?'Open Google Drive LTI':'Open external tool';}
 else if(types.includes('student_annotation')){kind='student_annotation';owner='canvas';primaryAction='Open Student Annotation';}
 else if(types.includes('online_quiz')){kind='quiz';owner='canvas';primaryAction='Take Quiz in Canvas';}
 else if(types.includes('discussion_topic')){kind='discussion';owner='canvas';primaryAction='Open Discussion';}
 else if(types.includes('media_recording')){kind='media_recording';owner='canvas';primaryAction='Open Canvas Recorder';}
 else if(types.includes('online_upload')){kind='file_upload';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Submit File';}
 else if(types.includes('online_text_entry')){kind='text_entry';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Write Response';}
 else if(types.includes('online_url')){kind='url';owner='canvas';launchMethod='canvas_submission_api';primaryAction='Submit URL';}
 else if(types.length&&types.every(t=>t==='none'||t==='on_paper')){kind=types.includes('on_paper')?'offline_paper':'offline';owner='none';launchMethod='none';primaryAction='View Assignment';}
 const published=typeof a.published==='boolean'?a.published:null,locked=typeof a.locked_for_user==='boolean'?a.locked_for_user:(typeof a.lockedForUser==='boolean'?a.lockedForUser:null);
 const canSubmit=typeof a.can_submit==='boolean'?a.can_submit:(typeof a.canSubmit==='boolean'?a.canSubmit:null),group=Number(a.group_category_id||a.groupCategoryId)>0;
 let availability='unknown';if(published===false||locked===true||canSubmit===false||group)availability='unavailable';else if(canSubmit===true&&published!==false&&locked!==true&&!group)availability='available';
 const workflow=str(a.submission?.workflow_state||a.submission?.workflowState||a.subState).toLowerCase()||null;
 const assignmentId=Number(a.id),courseId=Number(a.course_id||a.courseId),unknownSubmissionTypes=meta.unsupported||[];
 return {kind,owner,provider:kind,launchMethod,primaryAction,submissionTypes:types,knownSubmissionTypes:meta.supported||[],unknownSubmissionTypes,submissionTypeState:meta.state,submissionMethodState:meta.state==='known'||meta.state==='mixed'?'configured':meta.state,confirmedOffline:kind==='offline'||kind==='offline_paper',requiresProvider:['external_tool','google_assignments','google_drive_lti','student_annotation','quiz','discussion','media_recording'].includes(kind),assignmentId:Number.isSafeInteger(assignmentId)&&assignmentId>0?assignmentId:null,courseId:Number.isSafeInteger(courseId)&&courseId>0?courseId:null,annotatableAttachmentId:Number.isSafeInteger(Number(a.annotatable_attachment_id||a.annotatableAttachmentId))&&Number(a.annotatable_attachment_id||a.annotatableAttachmentId)>0?Number(a.annotatable_attachment_id||a.annotatableAttachmentId):null,published,locked,canSubmit,groupAssignment:group,availability,resubmissionAllowed:typeof a.can_resubmit==='boolean'?a.can_resubmit:null,allowedAttempts:Number.isSafeInteger(Number(a.allowed_attempts))?Number(a.allowed_attempts):null,submissionState:workflow,submissionOwner:owner,safeFallback:kind==='unknown'||['missing','empty','unsupported'].includes(meta.state)};
}
function classifyResource(input){
 const file=input&&typeof input==='object'?input:{};
 const name=str(file.name||file.filename||file.display_name).toLowerCase();
 const mime=str(file.contentType||file.content_type||file['content-type']||file.mime_type).split(';')[0].toLowerCase();
 const ext=(name.match(/\\.([a-z0-9]{1,12})$/)||[])[1]||'';
 let kind='unknown',label='File',preview='canvas';
 if(ext==='pdf'||mime==='application/pdf'){kind='pdf';label='PDF';preview='northstar_pdf';}
 else if(['docx','dotx'].includes(ext)||mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){kind='word';label='Word document · DOCX';preview='northstar_office';}
 else if(['doc','dot'].includes(ext)||(!ext&&(mime==='application/msword'||mime==='application/vnd.ms-word'))){kind='word_legacy';label='Word document · DOC';preview='canvas';}
 else if(ext==='xlsx'||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){kind='spreadsheet';label='Excel workbook · XLSX';preview='northstar_office';}
 else if(['xls','xlt'].includes(ext)||(!ext&&mime==='application/vnd.ms-excel')){kind='spreadsheet_legacy';label='Excel workbook · XLS';preview='canvas';}
 else if(['pptx','ppsx'].includes(ext)||mime==='application/vnd.openxmlformats-officedocument.presentationml.presentation'){kind='presentation';label='PowerPoint · PPTX';preview='northstar_office';}
 else if(['ppt','pps'].includes(ext)||(!ext&&mime==='application/vnd.ms-powerpoint')){kind='presentation_legacy';label='PowerPoint · PPT';preview='canvas';}
 else if(mime.startsWith('image/')||['png','jpg','jpeg','gif','webp','svg','heic'].includes(ext)){kind='image';label='Image';preview='native_image';}
 else if(mime.startsWith('video/')||['mp4','m4v','webm','mov'].includes(ext)){kind='video';label='Video';preview='native_media';}
 else if(mime.startsWith('audio/')||['mp3','m4a','wav','ogg','aac'].includes(ext)){kind='audio';label='Audio';preview='native_media';}
 else if(mime.startsWith('text/')||['txt','csv','md','json','xml','log'].includes(ext)){kind='text';label='Text file';preview='native_text';}
 return {kind,label,preview,extension:ext||null,mimeType:mime||null,filename:str(file.name||file.filename||file.display_name)||null,fileId:Number.isSafeInteger(Number(file.id))&&Number(file.id)>0?Number(file.id):null};
}
root.NorthstarAssignmentExecution={classify,classifyResource,knownTypes:[...KNOWN_TYPES],providerKind};
if(typeof module!=='undefined'&&module.exports)module.exports=root.NorthstarAssignmentExecution;
})(typeof globalThis!=='undefined'?globalThis:this);
