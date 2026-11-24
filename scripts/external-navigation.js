/* Top-level browser navigation for provider-owned Canvas/LTI experiences. */
(function(root){
'use strict';
function validate(value){let url;try{url=new URL(value);}catch{throw new Error('The launch destination is not a valid URL.');}if(url.protocol!=='https:'||url.username||url.password||url.href.length>12000)throw new Error('The launch destination must be a secure HTTPS URL without embedded credentials.');return url.href;}
function navigateTopLevel(value,locationObject){const target=validate(value),location=locationObject||root.location;if(!location||typeof location.assign!=='function')throw new Error('Top-level navigation is unavailable in this browser.');location.assign(target);return target;}
root.NorthstarExternalNavigation={validate,navigateTopLevel};
if(typeof module!=='undefined'&&module.exports)module.exports={validate};
})(typeof window!=='undefined'?window:globalThis);
