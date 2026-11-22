import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
let sequence=0;
const dom=new JSDOM(`<!doctype html><body>
  <div id="host"><div id="nsPdfTextContext">
    <select data-doc-family><option value="sans">Arial</option><option value="serif">Georgia</option></select>
    <input data-doc-size type="number" value="14"><select data-doc-preset><option value="normal">Normal</option></select>
    <button data-doc-cmd="bold"></button><button data-doc-cmd="italic"></button><button data-doc-cmd="underline"></button><button data-doc-cmd="strike"></button>
    <input data-doc-color type="color"><input data-doc-background type="color">
    <select data-doc-align><option value="left">Left</option><option value="center">Center</option></select>
    <input data-doc-line-height type="number" value="1.35">
    <button data-doc-edit>Edit</button><button data-doc-done>Done</button>
    <button data-doc-duplicate>Duplicate</button><button data-doc-delete>Delete</button>
  </div></div><div id="page" class="ns-pdf-page"></div>
</body>`,{pretendToBeVisual:true,url:'https://northstar.test/'});
globalThis.window=dom.window;
window.crypto.randomUUID=()=> 'document-test-'+(++sequence);
const host=window.document.getElementById('host'),page=window.document.getElementById('page');
page.getBoundingClientRect=()=>({left:0,top:0,right:1000,bottom:1400,width:1000,height:1400});
await import('../scripts/document-editor.js');
const api=window.NorthstarDocumentEditor;
assert.ok(api,'Document Editor module registers itself');
assert.deepEqual(Object.keys(api.presets).sort(),['heading1','heading2','heading3','normal','subtitle','title'].sort());

const legacy=api.migrateTextAnnotations([
 {x:.2,y:.3,width:.42,height:.12,text:'Existing note',color:'#c4e87b',fontSize:16},
 {x:-2,y:3,width:4,height:.01,text:'Second note'}
]);
assert.equal(legacy.length,2);
assert.equal(legacy[0].text,'Existing note');
assert.ok(legacy[0].id,'legacy annotations receive stable identifiers');
assert.equal(legacy[0].fontFamily,'sans');
assert.equal(legacy[0].fontSize,16);
assert.equal(legacy[1].x,0,'migrated x coordinates are bounded');
assert.equal(legacy[1].y,.98,'migrated y coordinates are bounded');
assert.equal(legacy[1].width,1,'migrated widths are bounded');
assert.ok(legacy[1].height>=.055,'migrated heights respect the minimum');

const note=api.createTextObject({x:.25,y:.2,width:.4,height:.16},{text:'A new note',fontFamily:'serif',fontSize:22,bold:true,align:'center'});
assert.equal(note.type,'text');
assert.equal(note.fontFamily,'serif');
assert.equal(note.fontSize,22);
assert.equal(note.bold,true);
assert.equal(note.align,'center');
assert.ok(note.id);

const resized=api.resizeTextObject(note,'se',.2,.2);
assert.ok(resized.width>note.width);
assert.ok(resized.height>note.height);
const bounded=api.resizeTextObject(note,'nw',2,2);
assert.ok(bounded.x>=0&&bounded.y>=0);
assert.ok(bounded.width>=.12&&bounded.height>=.055);
assert.ok(bounded.x+bounded.width<=1.000001);
assert.ok(bounded.y+bounded.height<=1.000001);

const safe=api.sanitizeRichHtml('<script>alert(1)</script><b>safe</b><img src=x>');
assert.ok(!safe.includes('<script'));
assert.ok(!safe.includes('<img'));
assert.ok(safe.includes('alert(1)')===false,'active element markup and content are not retained by the fallback sanitizer');
assert.ok(api.styleFor(note).includes('Georgia'));
assert.equal(api.plainTextFromHtml('<b>hello</b> world'),'hello world');

const texts=[];
let saves=0,histories=0;
const editor=api.mount({
 getHost:()=>host,getPageElement:()=>page,getTexts:()=>texts,canInteract:()=>true,
 beforeChange:()=>histories++,onChange:()=>saves++,getBrushSize:()=>9
});
assert.ok(editor.layer,'editor mounts a live annotation layer');
editor.setTool('select');
const created=editor.createTextBox({x:.1,y:.2,width:.4,height:.12},{fontFamily:'serif',fontSize:18});
assert.ok(created.id);
assert.equal(texts.length,1);
assert.equal(editor.editing,created.id);
let contentNode=editor.nodes.get(created.id).querySelector('.ns-doc-text-content');
contentNode.innerHTML='Directly edited note';
contentNode.dispatchEvent(new window.Event('input',{bubbles:true}));
editor.endEdit();
assert.equal(created.text,'Directly edited note','input edits are stored on the annotation object');
assert.ok(created.html.includes('Directly edited note'));
assert.ok(saves>0,'edits trigger persistence callbacks');

editor.beginEdit(created.id);
contentNode=editor.nodes.get(created.id).querySelector('.ns-doc-text-content');
const range=window.document.createRange();range.selectNodeContents(contentNode);
window.getSelection().removeAllRanges();window.getSelection().addRange(range);
editor.applyStyle('fontSize',24);
assert.ok(created.html.includes('24px'),'selected text receives font-size styling');
editor.toggleFormat('bold');
assert.ok(created.bold||created.html.includes('font-weight'),'bold formatting is retained');
editor.endEdit();

const object=editor.nodes.get(created.id);
object.setPointerCapture=()=>{};
const grip=object.querySelector('.ns-doc-drag-handle');
const pointerEvent=(type,values)=>{const event=new window.Event(type,{bubbles:true,cancelable:true});Object.entries(values).forEach(([key,value])=>Object.defineProperty(event,key,{value}));return event;};
const beforeX=created.x,beforeY=created.y;
grip.dispatchEvent(pointerEvent('pointerdown',{pointerId:11,pointerType:'touch',clientX:100,clientY:100}));
editor.layer.dispatchEvent(pointerEvent('pointermove',{pointerId:11,pointerType:'touch',clientX:200,clientY:240,buttons:1}));
editor.layer.dispatchEvent(pointerEvent('pointerup',{pointerId:11,pointerType:'touch',clientX:200,clientY:240}));
assert.ok(created.x>beforeX&&created.y>beforeY,'selected text objects can be moved after placement');

const resize=object.querySelector('[data-handle="se"]');
resize.dispatchEvent(pointerEvent('pointerdown',{pointerId:12,pointerType:'touch',clientX:200,clientY:200}));
editor.layer.dispatchEvent(pointerEvent('pointermove',{pointerId:12,pointerType:'touch',clientX:300,clientY:300,buttons:1}));
editor.layer.dispatchEvent(pointerEvent('pointerup',{pointerId:12,pointerType:'touch',clientX:300,clientY:300}));
assert.ok(created.width>.4&&created.height>.12,'text objects can be resized using their handles');

editor.duplicate();
assert.equal(texts.length,2,'selected text can be duplicated');
editor.remove();
assert.equal(texts.length,1,'selected text can be deleted');
editor.unmount();
assert.equal(page.querySelector('.ns-pdf-text-layer'),null,'editor unmount removes its overlay safely');

console.log('PASS: Document Studio migration, rich text, direct editing, persistence callbacks, move, resize, duplicate and delete');
