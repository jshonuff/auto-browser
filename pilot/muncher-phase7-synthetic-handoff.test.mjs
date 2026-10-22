/**
 * JC-SAVAGE Phase 7 — isolated contract simulation ONLY.
 *
 * A pure in-memory model of observed Supabase
 *   jc_savage.muncher_x_intake_external_evidence
 * (inspected read-only 2026-10-21).
 * NEVER calls that live function, writes Supabase, fetches webpages, or uses secrets.
 * The owner resolver fixture mirrors independently read back STABLE SQL results.
 * This model is NOT proof of production deployment or function equivalence.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';

const allowedHosts=new Set(['www.goodreads.com','news.ycombinator.com']);
const allowedProviders=new Map([['goodreads','www.goodreads.com'],['hacker-news','news.ycombinator.com']]);
const acquisition=new Set(['UNKNOWN','NOT_SUPPLIED','SUPPLIED_UNVERIFIED','VERIFIED_READABLE','WAIVED','UNAVAILABLE','NOT_REQUIRED']);
const sufficiency=new Set(['UNKNOWN','INSUFFICIENT','SUFFICIENT','WAIVED','NOT_APPLICABLE']);
const sensitivity=new Set(['UNKNOWN','NORMAL','PRIVATE','SENSITIVE','RESTRICTED']);
const canonicalize=x=>Array.isArray(x)?x.map(canonicalize):x!==null&&typeof x==='object'?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonicalize(v)])):x;
const hash=x=>createHash('sha256').update(JSON.stringify(canonicalize(x))).digest('hex');
const md5=x=>createHash('md5').update(x).digest('hex');
const trimLow=x=>String(x??'').trim().toLowerCase();
const isSet=x=>typeof x==='string'&&x.trim().length>0;

// Direct-owner fixtures independently verified against live STABLE owner resolver.
// Unknown-hint fallback to valid primary_domain is a real observed behavior.
const ownerIndex=new Map([
 ['BOOK-X',{resolution_state:'RESOLVED',owner_ref:'BOOK-X',owner_type:'DOMAIN'}],
 ['MUNCHER-X',{resolution_state:'RESOLVED',owner_ref:'MUNCHER-X',owner_type:'DOMAIN'}],
 ['TOOL:CHAIN-ROUTER-X',{resolution_state:'RESOLVED',owner_ref:'TOOL:CHAIN-ROUTER-X',owner_type:'COMPONENT'}],
]);
function resolveOwner(hint,domain){
 const norm=s=>isSet(s)?s.trim().toUpperCase():null;
 const a=norm(hint),b=norm(domain),first=a??b;
 if(!first)return {resolution_state:'HOLD',reason:'MISSING_OWNER_HINT'};
 if(ownerIndex.has(first))return ownerIndex.get(first);
 if(b&&b!==first&&ownerIndex.has(b))return ownerIndex.get(b);
 return {resolution_state:'HOLD',reason:'OWNER_NOT_FOUND'};
}
function modelLiveFunction(inputs,state){
 const required=['source_id','source_pointer','source_type','raw_line','evidence_lineage'];
 for(const k of required)if(!isSet(inputs[k]))throw Error('REQUIRED:'+k);
 const ac=(inputs.acquisition_state??'SUPPLIED_UNVERIFIED').toUpperCase();
 const suff=(inputs.source_sufficiency??'UNKNOWN').toUpperCase();
 const sens=(inputs.sensitivity_class??'NORMAL').toUpperCase();
 if(!acquisition.has(ac))throw Error('INVALID_ACQUISITION');
 if(!sufficiency.has(suff))throw Error('INVALID_SUFFICIENCY');
 if(!sensitivity.has(sens))throw Error('INVALID_SENSITIVITY');
 if(state.bySourceId.has(inputs.source_id)){
  return {status:'SUPPRESSED',reason:'SOURCE_ID_ALREADY_CAPTURED',canon_promoted:false,target_executed:false};
 }
 const processing_key=isSet(inputs.processing_key)?inputs.processing_key.trim():
  'munch:'+md5(trimLow(inputs.source_pointer)+'|'+trimLow(inputs.raw_line));
 if(state.byProcessingKey.has(processing_key)){
  return {status:'SUPPRESSED',reason:'PROCESSING_DUPLICATE',canon_promoted:false,target_executed:false};
 }
 const owner=resolveOwner(inputs.owner_hint,inputs.primary_domain);
 const status=owner.resolution_state==='RESOLVED'?'QUEUED':'DEFERRED';
 // In-memory only: MUNCHER-X real function INSERTS, THIS NEVER DOES.
 state.bySourceId.add(inputs.source_id);
 state.byProcessingKey.add(processing_key);
 return {status,processing_key,verified_owner:status==='QUEUED'?owner.owner_ref:null,provenance_preserved:true,
  canon_promoted:false,target_executed:false,authority_boundary:'SOURCE_INTAKE_ONLY'};
}
function state(){return{bySourceId:new Set(),byProcessingKey:new Set()};}
const GOOD='https://www.goodreads.com/book/show/77566';
function adapter(candidate,st){
 if(!candidate||typeof candidate!=='object')return {status:'BLOCKED',reason:'BAD_CANDIDATE'};
 if(candidate.method!=='GET'||candidate.readOnly!==true||candidate.learnedLoggedIn===true)
  return {status:'BLOCKED',reason:'UNAPPROVED_OPERATION'};
 if(candidate.authentication||candidate.cookies||candidate.session||candidate.credentials)
  return {status:'BLOCKED',reason:'AUTH_DATA_NOT_ALLOWED'};
 if(candidate.sensitivity_class&&candidate.sensitivity_class!=='NORMAL')
  return {status:'BLOCKED',reason:'RESTRICTED_OR_UNKNOWN_DATA'};
 if(!allowedProviders.has(candidate.provider))return {status:'BLOCKED',reason:'UNAPPROVED_PROVIDER'};
 let url;
 try{url=new URL(candidate.url)}catch{return {status:'BLOCKED',reason:'INVALID_URL'}}
 if(url.protocol!=='https:'||url.username||url.password||url.port||!allowedHosts.has(url.hostname)||url.hostname!==allowedProviders.get(candidate.provider))
  return {status:'BLOCKED',reason:'UNAPPROVED_HOST'};
 if(!isSet(candidate.external_id)||!isSet(candidate.evidence_lineage)||candidate.normalized_content===undefined)
  return {status:'BLOCKED',reason:'INSUFFICIENT_PROVENANCE'};
 const payloadHash=hash(candidate.normalized_content);
 const source_id='JCS-API-ANYTHING-SYN-'+candidate.provider+'-'+candidate.external_id+'-'+payloadHash.slice(0,18);
 // Only approved structured metadata is passed. NO source payload text, cookies, or secrets.
 const inputs={
  source_id,source_pointer:url.origin+url.pathname,source_type:'API',raw_line:'PUBLIC_RESEARCH_CANDIDATE:'+candidate.provider+':'+candidate.external_id+':sha256:'+payloadHash,
  evidence_lineage:candidate.evidence_lineage,owner_hint:candidate.owner_hint??null,primary_domain:candidate.primary_domain??null,
  acquisition_state:'SUPPLIED_UNVERIFIED',source_sufficiency:'UNKNOWN',sensitivity_class:'NORMAL'
 };
 return modelLiveFunction(inputs,st);
}
const fixture={
 provider:'goodreads',method:'GET',readOnly:true,learnedLoggedIn:false,url:GOOD,external_id:'77566',
 normalized_content:{title:'Synthetic A',rating:'4.1'},evidence_lineage:'SYNTHETIC:PHASE7',
 owner_hint:'BOOK-X',primary_domain:'BOOK-X',sensitivity_class:'NORMAL'
};
const results=[];
function check(label,fn){
 test(label,()=>{fn();results.push(label);});
}
check('owner resolves Book-X to canonical domain',()=>assert.equal(resolveOwner('BOOK-X','BOOK-X').owner_ref,'BOOK-X'));
check('missing owner hints HOLD',()=>assert.equal(resolveOwner(null,null).resolution_state,'HOLD'));
check('unknown hint falls back to valid domain',()=>assert.equal(resolveOwner('NOT-A-REAL-OWNER','BOOK-X').owner_ref,'BOOK-X'));
check('unknown hint without valid fallback HOLD',()=>assert.equal(resolveOwner('UNKNOWN-FAKE','UNKNOWN-FAKE').resolution_state,'HOLD'));
check('new candidate QUEUED without canon promotion or execution',()=>{
 const v=adapter({...fixture},state());assert.equal(v.status,'QUEUED');assert.equal(v.verified_owner,'BOOK-X');
 assert.equal(v.canon_promoted,false);assert.equal(v.target_executed,false);});
check('same candidate with reordered JSON fields is suppressed',()=>{
 const st=state();adapter({...fixture},st);
 const v=adapter({...fixture,normalized_content:{rating:'4.1',title:'Synthetic A'}},st);
 assert.equal(v.status,'SUPPRESSED');assert.equal(v.reason,'SOURCE_ID_ALREADY_CAPTURED');
});
check('changed content same external ID is new review candidate, not canonical overwrite',()=>{
 const st=state();adapter({...fixture},st);
 const v=adapter({...fixture,normalized_content:{title:'Synthetic A',rating:'4.2'}},st);
 assert.equal(v.status,'QUEUED');assert.equal(v.canon_promoted,false);assert.equal(st.bySourceId.size,2);
});
check('old version after newer is suppressed',()=>{
 const st=state();adapter({...fixture},st);adapter({...fixture,normalized_content:{title:'Synthetic A',rating:'4.2'}},st);
 assert.equal(adapter({...fixture},st).status,'SUPPRESSED');
});
check('different external identity with identical content is separate',()=>{
 const st=state();adapter({...fixture},st);
 assert.equal(adapter({...fixture,external_id:'77567'},st).status,'QUEUED');assert.equal(st.bySourceId.size,2);
});
check('missing owner puts candidate in DEFERRED',()=>{
 const v=adapter({...fixture,owner_hint:null,primary_domain:null},state());assert.equal(v.status,'DEFERRED');
 assert.equal(v.verified_owner,null);assert.equal(v.canon_promoted,false);
});
check('owner fallback does not become a target write',()=>{
 const v=adapter({...fixture,owner_hint:'NOT-A-REAL-OWNER'},state());assert.equal(v.status,'QUEUED');
 assert.equal(v.verified_owner,'BOOK-X');assert.equal(v.target_executed,false);
});
check('duplicate processing key with another ID is suppressed in core model',()=>{
 const st=state();const base={source_id:'synthetic-1',source_pointer:GOOD,source_type:'API',raw_line:'test',
 evidence_lineage:'SYNTHETIC',owner_hint:'BOOK-X',primary_domain:'BOOK-X',processing_key:'manual-test-key'};
 assert.equal(modelLiveFunction(base,st).status,'QUEUED');
 const v=modelLiveFunction({...base,source_id:'synthetic-2'},st);
 assert.equal(v.status,'SUPPRESSED');assert.equal(v.reason,'PROCESSING_DUPLICATE');
});
for(const [key,value,code] of [['source_id','', 'REQUIRED:source_id'],['evidence_lineage',' ', 'REQUIRED:evidence_lineage'],
 ['acquisition_state','FALSE','INVALID_ACQUISITION'],['source_sufficiency','FALSE','INVALID_SUFFICIENCY'],
 ['sensitivity_class','FALSE','INVALID_SENSITIVITY']]){
 check('live function validator: '+key,()=>{
  const base={source_id:'synthetic-z',source_pointer:GOOD,source_type:'API',raw_line:'test',evidence_lineage:'SYNTHETIC',owner_hint:'BOOK-X',primary_domain:'BOOK-X'};
  assert.throws(()=>modelLiveFunction({...base,[key]:value},state()),new RegExp(code));
 });
}
for(const [label,update,reason] of [
 ['POST not allowed',{method:'POST'},'UNAPPROVED_OPERATION'],
 ['unapproved host',{url:'https://evil.example/item/77566'},'UNAPPROVED_HOST'],
 ['unapproved provider',{provider:'unapproved'},'UNAPPROVED_PROVIDER'],
 ['login operation',{learnedLoggedIn:true},'UNAPPROVED_OPERATION'],
 ['cookie-bearing request',{cookies:{session:'never-real'}},'AUTH_DATA_NOT_ALLOWED'],
 ['restricted sensitivity',{sensitivity_class:'SENSITIVE'},'RESTRICTED_OR_UNKNOWN_DATA'],
 ['missing external ID',{external_id:''},'INSUFFICIENT_PROVENANCE'],
 ['missing evidence lineage',{evidence_lineage:''},'INSUFFICIENT_PROVENANCE'],
 ['URL containing username',{url:'https://user:pass@www.goodreads.com/book/show/77566'},'UNAPPROVED_HOST']
]){
 check('adapter fail-closed: '+label,()=>{
  const st=state(),v=adapter({...fixture,...update},st);assert.equal(v.status,'BLOCKED');assert.equal(v.reason,reason);
  assert.equal(st.bySourceId.size,0);
 });
}
check('no persistent effects on the host from pure model',()=>{
 const st=state();adapter({...fixture},st);assert.equal(st.bySourceId.size,1);
 assert.equal(typeof process.env.SUPABASE_SERVICE_ROLE_KEY,'undefined');
 assert.equal(typeof process.env.JCS_SUPABASE_URL,'undefined');
});
process.on('exit',code=>{if(code===0)console.log('JCS_PHASE7_SYNTHETIC_HANDOFF '+JSON.stringify({passed:results.length,mode:'PURE_IN_MEMORY_SIMULATION',liveMuncherFunctionCalled:false,sourceWrites:0,productionDispatch:false,canonicalPromotion:false,credentialAccess:false,networkCalls:0,source:'Live MUNCHER-X function signature and owner resolver independently inspected; in-memory behavior subset only.'}));});
