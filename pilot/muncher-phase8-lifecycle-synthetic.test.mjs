/**
 * JC-SAVAGE Phase 8: synthetic-only terminal handoff and retention contract.
 * This is an in-memory MODEL of read-only-inspected live SQL rules.
 * NEVER imports credentials, calls Supabase, alters queue rows or retrieves websites.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {test} from 'node:test';

const allowedOutcome=new Set(['ACCEPTED_INSTALLED','ABSORBED','SUPPORT_REFERENCE_ONLY','REJECTED','DEFERRED','SUPERSEDED','NO_ACTION']);
const deliveryStates=new Set(['ACCEPTED_INSTALLED','ABSORBED','SUPPORT_REFERENCE_ONLY']);
const finishStates=new Set(['ROUTED','TRIAGED','SCREENED','DEFERRED','REJECTED','QUEUED']);
const readable=new Set(['VERIFIED_READABLE','WAIVED','NOT_REQUIRED']);
const sufficient=new Set(['SUFFICIENT','WAIVED','NOT_APPLICABLE']);
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const sha256=s=>createHash('sha256').update(s).digest('hex');
const mkLease=(worker='test-worker')=>({claimed_by:worker,lease_until:1001});
const mkRow=()=>({
 source_id:'JCS-SYNTH-PH8-001',status:'ROUTED',likely_owner:'BOOK-X',primary_domain:'BOOK-X',
 acquisition_state:'VERIFIED_READABLE',source_sufficiency:'SUFFICIENT',evidence_lineage:'TEST:SYNTHETIC',
 duplicate_conflict_risk:'REVIEWED_NO_EXACT_DUP',extraction_confidence:'HIGH',
 owner_match_confidence:'HIGH',action_confidence:'HIGH',sensitivity_class:'NORMAL',
 next_action:'OWNER_REVIEW',target_object_id:'DOC:JCS-FID-SYNTH-001',expected_target_version:'1'
});
const mkDoc=()=>{
 const body='# Synthetic document - not real canonical source';
 return {kind:'document',status:'ACTIVE',body,content_hash:sha256(body),version_no:'1'};
};
function finish(row,lease,{worker='test-worker',status='ROUTED',now=1000,resolver=()=>({resolution_state:'RESOLVED',owner_ref:'BOOK-X'})}={}){
 if(!nonempty(worker))throw Error('WORKER_REQUIRED');
 if(!finishStates.has(status))throw Error('INVALID_FINISH_STATUS');
 if(!lease||lease.claimed_by!==worker||lease.lease_until<=now)throw Error('LEASE_INVALID');
 if(status==='ROUTED'){
  if(!readable.has(row.acquisition_state))throw Error('READABILITY_GATE');
  if(!sufficient.has(row.source_sufficiency))throw Error('SUFFICIENCY_GATE');
  if(!nonempty(row.evidence_lineage))throw Error('PROVENANCE_GATE');
  if(!nonempty(row.likely_owner))throw Error('OWNER_GATE');
  const match=resolver(row.likely_owner,row.primary_domain);
  if(match.resolution_state!=='RESOLVED'||row.likely_owner.toUpperCase()!==match.owner_ref?.toUpperCase())throw Error('LIVE_OWNER_GATE');
  if(!nonempty(row.duplicate_conflict_risk)||row.duplicate_conflict_risk.toUpperCase()==='UNKNOWN')throw Error('DUPLICATE_GATE');
  if(!nonempty(row.extraction_confidence)||!nonempty(row.owner_match_confidence)||!nonempty(row.action_confidence))throw Error('CONFIDENCE_GATE');
  if(!nonempty(row.sensitivity_class)||row.sensitivity_class.toUpperCase()==='UNKNOWN')throw Error('SENSITIVITY_GATE');
  if(!nonempty(row.next_action))throw Error('NEXT_ACTION_GATE');
 }
 return {...row,status,terminallyVerified:false,ownerAccepted:false,leaseRetired:status!=='QUEUED'};
}
function verify(row,{ownerResult='ACCEPTED_INSTALLED',outcome='Synthetic verified',verified=true,receipt='',currentVersion='1',target=null}={}){
 if(!allowedOutcome.has(ownerResult))throw Error('INVALID_OWNER_OUTCOME');
 if(!nonempty(outcome))throw Error('OUTCOME_REQUIRED');
 if(row.status!=='ROUTED')throw Error('MUST_BE_ROUTED');
 const delivered=deliveryStates.has(ownerResult);
 if(!delivered){
  if(verified||nonempty(receipt))throw Error('NONDELIVERY_CANNOT_CLAIM_READBACK');
  return {...row,owner_result_state:ownerResult,readback_verified:false,readback_reference:null,completed_at:1000,canon_promoted:false};
 }
 if(!verified||!nonempty(receipt))throw Error('READBACK_REQUIRED');
 if(!nonempty(row.target_object_id)||!receipt.includes(row.target_object_id))throw Error('TARGET_RECEIPT_MISSING');
 if(nonempty(row.target_object_id)&&!nonempty(row.expected_target_version))throw Error('VERSION_BASELINE_MISSING');
 if(nonempty(row.expected_target_version)&&row.expected_target_version!==currentVersion)throw Error('VERSION_STALE');
 if(row.target_object_id.startsWith('MUSIC-CONTENT:')){
  if(target?.kind!=='music'||target.authority_state!=='SUPABASE_CANONICAL'||target.source_of_truth!=='SUPABASE'||!target.munch_source_ids?.includes(row.source_id))throw Error('MUSIC_OWNER_CANONICAL_NOT_VERIFIED');
 } else if(row.target_object_id.startsWith('DOC:')||row.target_object_id.startsWith('STORAGEDOC:')||row.target_object_id.startsWith('JCS-FID-')){
  if(target?.kind!=='document'||target.status!=='ACTIVE'||target.content_hash!==sha256(target.body))throw Error('DOCUMENT_NOT_VERIFIED');
  if(!receipt.includes(target.content_hash))throw Error('DOCUMENT_HASH_NOT_IN_RECEIPT');
  if(target.version_no!==row.expected_target_version)throw Error('DOCUMENT_VERSION_MISMATCH');
 } else throw Error('UNSUPPORTED_TARGET_TYPE');
 return {...row,owner_result_state:ownerResult,readback_verified:true,readback_reference:receipt,completed_at:1000,canon_promoted:false};
}
const valid=mkRow(),doc=mkDoc();
const receipt='source-target:'+valid.target_object_id+';hash:'+doc.content_hash;
const cases=[];
function check(name,fn){test(name,()=>{fn();cases.push(name)});}
check('valid route prerequisites pass with lease and domain owner',()=>{const r=finish(valid,mkLease());assert.equal(r.status,'ROUTED');assert.equal(r.ownerAccepted,false);});
check('routed is not owner-accepted or readback-complete',()=>assert.equal(finish(valid,mkLease()).terminallyVerified,false));
check('no live lease -> block',()=>assert.throws(()=>finish(valid,null),/LEASE_INVALID/));
check('wrong worker -> block',()=>assert.throws(()=>finish(valid,mkLease('other')),/LEASE_INVALID/));
check('expired lease -> block',()=>assert.throws(()=>finish(valid,{claimed_by:'test-worker',lease_until:1000}),/LEASE_INVALID/));
check('missing readability -> block',()=>assert.throws(()=>finish({...valid,acquisition_state:'SUPPLIED_UNVERIFIED'},mkLease()),/READABILITY_GATE/));
check('missing sufficiency -> block',()=>assert.throws(()=>finish({...valid,source_sufficiency:'UNKNOWN'},mkLease()),/SUFFICIENCY_GATE/));
check('missing evidence lineage -> block',()=>assert.throws(()=>finish({...valid,evidence_lineage:''},mkLease()),/PROVENANCE_GATE/));
check('missing owner -> block',()=>assert.throws(()=>finish({...valid,likely_owner:''},mkLease()),/OWNER_GATE/));
check('unverified owner -> block',()=>assert.throws(()=>finish(valid,mkLease(),{resolver:()=>({resolution_state:'HOLD'})}),/LIVE_OWNER_GATE/));
check('unknown duplicate/conflict classification -> block',()=>assert.throws(()=>finish({...valid,duplicate_conflict_risk:'UNKNOWN'},mkLease()),/DUPLICATE_GATE/));
check('missing extraction confidence -> block',()=>assert.throws(()=>finish({...valid,extraction_confidence:null},mkLease()),/CONFIDENCE_GATE/));
check('missing owner match confidence -> block',()=>assert.throws(()=>finish({...valid,owner_match_confidence:null},mkLease()),/CONFIDENCE_GATE/));
check('missing action confidence -> block',()=>assert.throws(()=>finish({...valid,action_confidence:null},mkLease()),/CONFIDENCE_GATE/));
check('unknown sensitivity -> block',()=>assert.throws(()=>finish({...valid,sensitivity_class:'UNKNOWN'},mkLease()),/SENSITIVITY_GATE/));
check('missing next action -> block',()=>assert.throws(()=>finish({...valid,next_action:''},mkLease()),/NEXT_ACTION_GATE/));
check('non-routed cannot record owner acceptance',()=>assert.throws(()=>verify({...valid,status:'DEFERRED'},{target:doc,receipt}),/MUST_BE_ROUTED/));
check('unrecognized legacy TARGET_VERIFIED not accepted by live verifier',()=>assert.throws(()=>verify(valid,{ownerResult:'TARGET_VERIFIED',target:doc,receipt}),/INVALID_OWNER_OUTCOME/));
check('delivery without independent readback blocked',()=>assert.throws(()=>verify(valid,{verified:false,target:doc,receipt}),/READBACK_REQUIRED/));
check('delivery without target receipt blocked',()=>assert.throws(()=>verify(valid,{target:doc,receipt:'hash:'+doc.content_hash}),/TARGET_RECEIPT_MISSING/));
check('delivery with no target version baseline blocked',()=>assert.throws(()=>verify({...valid,expected_target_version:null},{target:doc,receipt}),/VERSION_BASELINE_MISSING/));
check('stale target version blocked',()=>assert.throws(()=>verify(valid,{target:doc,receipt,currentVersion:'0'}),/VERSION_STALE/));
check('document whose hash is not in receipt blocked',()=>assert.throws(()=>verify(valid,{target:doc,receipt:'id:'+valid.target_object_id}),/DOCUMENT_HASH_NOT_IN_RECEIPT/));
check('document with tampered hash blocked',()=>assert.throws(()=>verify(valid,{target:{...doc,body:doc.body+'tampered'},receipt}),/DOCUMENT_NOT_VERIFIED/));
check('valid synthetic document target verified',()=>{const r=verify(valid,{target:doc,receipt});assert.equal(r.readback_verified,true);assert.equal(r.owner_result_state,'ACCEPTED_INSTALLED');assert.equal(r.canon_promoted,false);});
check('non-delivery NO_ACTION must not claim readback',()=>assert.throws(()=>verify(valid,{ownerResult:'NO_ACTION',target:doc,receipt}),/NONDELIVERY_CANNOT_CLAIM_READBACK/));
check('non-delivery NO_ACTION records no readback',()=>{const r=verify(valid,{ownerResult:'NO_ACTION',verified:false,receipt:''});assert.equal(r.readback_verified,false);});
check('SUPPORT_REFERENCE_ONLY requires same verified receipt',()=>{const r=verify(valid,{ownerResult:'SUPPORT_REFERENCE_ONLY',target:doc,receipt});assert.equal(r.readback_verified,true);});
check('Goodreads-to-BOOK-X target type unsupported in live verifier',()=>{const r={...valid,target_object_id:'BOOK-X:hyperion'};assert.throws(()=>verify(r,{target:doc,receipt:'BOOK-X:hyperion'}),/UNSUPPORTED_TARGET_TYPE/);});
check('MUSIC-X target must be canon-owned and lineage-linked',()=>{
 const row={...valid,target_object_id:'MUSIC-CONTENT:SYN-001'};
 assert.throws(()=>verify(row,{target:{kind:'music',authority_state:'DERIVED',source_of_truth:'SUPABASE',munch_source_ids:[row.source_id]},receipt:'MUSIC-CONTENT:SYN-001'}),/MUSIC_OWNER_CANONICAL_NOT_VERIFIED/);
});
check('MUSIC-X target supported only with canonical evidence',()=>{
 const row={...valid,target_object_id:'MUSIC-CONTENT:SYN-001'};
 const r=verify(row,{target:{kind:'music',authority_state:'SUPABASE_CANONICAL',source_of_truth:'SUPABASE',munch_source_ids:[row.source_id]},receipt:'MUSIC-CONTENT:SYN-001'});
 assert.equal(r.readback_verified,true);
});
check('no implicit retention/deletion authority in synthetic model',()=>{
 assert.equal(process.env.JCS_PRODUCTION_DISPATCH,'false');assert.equal(process.env.JCS_SUPABASE_WRITE_ENABLED,'false');
 assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY,undefined);assert.equal(process.env.JCS_SUPABASE_URL,undefined);
});
process.on('exit',code=>{if(code===0)console.log('JCS_PHASE8_LIFECYCLE_SIM '+JSON.stringify({passed:cases.length,method:'PURE_IN_MEMORY_MODEL_FROM_LIVE_FUNCTION_DEFINITIONS',liveMuncherInvoked:false,websiteCalls:0,queueWrites:0,retentionMutations:0,productionDispatch:false}))});
