/* NORTHSTAR Phase 4 — local Word document export.
   Produces a standards-based .docx from the current assignment draft.
   The export is a file copy; it does not submit to Canvas until the student confirms. */
(function(root){
'use strict';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const xml=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const escapeName=value=>String(value||'NORTHSTAR-response').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,100)||'NORTHSTAR-response';
function textContent(node){return node?.textContent||'';}
function runXml(node,format={}){
  if(node.nodeType===3){
    const value=node.nodeValue||'';if(!value)return '';
    return '<w:r>'+formatXml(format)+'<w:t xml:space="preserve">'+xml(value)+'</w:t></w:r>';
  }
  if(node.nodeType!==1)return '';
  const tag=node.tagName.toLowerCase();
  if(tag==='br')return '<w:r><w:br/></w:r>';
  const next={...format};
  if(['b','strong'].includes(tag))next.bold=true;
  if(['i','em'].includes(tag))next.italic=true;
  if(tag==='u')next.underline=true;
  if(['s','strike','del'].includes(tag))next.strike=true;
  if(tag==='code'||tag==='pre')next.code=true;
  return [...node.childNodes].map(child=>runXml(child,next)).join('');
}
function formatXml(format){
  const parts=[];
  if(format.bold)parts.push('<w:b/>');
  if(format.italic)parts.push('<w:i/>');
  if(format.underline)parts.push('<w:u w:val="single"/>');
  if(format.strike)parts.push('<w:strike/>');
  if(format.code)parts.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>');
  return parts.length?'<w:rPr>'+parts.join('')+'</w:rPr>':'';
}
function paragraphXml(node,style){
  const runs=[...node.childNodes].map(child=>runXml(child)).join('');
  const pPr=style?'<w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>':'';
  return '<w:p>'+pPr+(runs||'<w:r><w:t></w:t></w:r>')+'</w:p>';
}
function tableXml(table){
  const rows=[...table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr')];
  if(!rows.length)return '';
  return '<w:tbl><w:tblPr><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(edge=>'<w:'+edge+' w:val="single" w:sz="4" w:space="0" w:color="B8C1CC"/>').join('')+'</w:tblBorders></w:tblPr>'+
    rows.map(row=>'<w:tr>'+[...row.children].filter(cell=>['TD','TH'].includes(cell.tagName)).map(cell=>'<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>'+paragraphXml(cell,cell.tagName==='TH'?'Heading3':null)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';
}
function bodyXml(html){
  if(typeof DOMParser==='undefined')throw Error('This browser does not provide the document parser required for Word export.');
  const safeHtml=root.NorthstarSubmissions?.sanitizeRichTextHtml?root.NorthstarSubmissions.sanitizeRichTextHtml(html):String(html||'');
  const doc=new DOMParser().parseFromString(safeHtml,'text/html');
  const blocks=[];
  const walk=node=>{
    if(node.nodeType===3){if(node.nodeValue.trim())blocks.push('<w:p>'+runXml(node)+'</w:p>');return;}
    if(node.nodeType!==1)return;
    const tag=node.tagName.toLowerCase();
    if(tag==='table'){blocks.push(tableXml(node));return;}
    if(['p','div','h1','h2','h3','h4','h5','h6','li','blockquote','pre'].includes(tag)){
      const styles={h1:'Title',h2:'Heading1',h3:'Heading2',h4:'Heading3',h5:'Heading3',h6:'Heading3'};
      let inner=[...node.childNodes].map(child=>runXml(child)).join('');
      if(tag==='li')inner='<w:r><w:t>• </w:t></w:r>'+inner;
      if(tag==='blockquote')inner='<w:r><w:i/></w:r>'+inner;
      if(tag==='pre')inner='<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr></w:r>'+inner;
      blocks.push('<w:p>'+(styles[tag]?'<w:pPr><w:pStyle w:val="'+styles[tag]+'"/></w:pPr>':'')+(inner||'<w:r><w:t></w:t></w:r>')+'</w:p>');
      return;
    }
    [...node.childNodes].forEach(walk);
  };
  [...doc.body.childNodes].forEach(walk);
  return blocks.join('')||'<w:p><w:r><w:t></w:t></w:r></w:p>';
}
async function createWordDocument({html,title='NORTHSTAR Assignment',filename}={}){
  if(!root.NorthstarSubmissions)throw Error('The assignment editor is not ready yet. Reload NORTHSTAR and try again.');
  const JSZipModule=await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
  const JSZip=JSZipModule.default||JSZipModule;
  const zip=new JSZip(),documentBody=bodyXml(html);
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:lang w:val="en-US"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>';
  const documentXml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>'+xml(title)+'</w:t></w:r></w:p>'+documentBody+'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>';
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.folder('word').file('document.xml',documentXml).file('styles.xml',styles).folder('_rels').file('document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');
  const blob=await zip.generateAsync({type:'blob',mimeType:MIME,compression:'DEFLATE',compressionOptions:{level:6}});
  const safeFilename=(filename||escapeName(title)+'-response.docx').replace(/[^\w .()\-]/g,'_').replace(/\.docx$/i,'')+'.docx';
  if(typeof root.File==='function')return new root.File([blob],safeFilename,{type:MIME,lastModified:Date.now()});
  Object.defineProperty(blob,'name',{value:safeFilename});return blob;
}
root.NorthstarDocumentExport={createWordDocument};
if(typeof module!=='undefined'&&module.exports)module.exports={createWordDocument};
})(typeof window!=='undefined'?window:globalThis);
