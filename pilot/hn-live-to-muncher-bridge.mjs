/**
 * JC-SAVAGE HN real-source adapter / controlled manual handoff.
 * The only network request is the upstream api-anything Tier-1 unauthenticated GET.
 * Writes NO databases. Generates a bounded MUNCHER-X intake envelope to stdout.
 * An authorized operator may separately submit that exact envelope to the
 * already-existing Supabase intake function. No credentials in this worker.
 */
import {call} from './dist/index.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const expectedCommit='20cb677039fcfe92d3d9c777aa9362e30ff1fdb8';
if(process.env.PIN!==expectedCommit || process.env.JCS_SUPABASE_WRITE_ENABLED!=='false' || process.env.JCS_PRODUCTION_DISPATCH!=='false') throw Error('JCS_FAIL_CLOSED_APPROVAL_BOUNDARY');
if(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JCS_SUPABASE_URL || process.env.SUPABASE_URL) throw Error('JCS_UNEXPECTED_DATABASE_SECRET');
const spec=JSON.parse(readFileSync('sites/hacker-news.json','utf8'));
const op=spec.operations.find(x=>x.name==='frontPage');
if(!op || op.minTier!==1|| !op.readOnly||op.learnedLoggedIn||op.request.method!=='GET'||op.request.url!=='https://news.ycombinator.com/'||op.slots?.length!==0) throw Error('JCS_UNAPPROVED_OPERATION');
const result=await call('hacker-news','frontPage',{}, {maxTier:1,allowWrites:false,timeoutMs:30000,minIntervalMs:0});
if(!result.ok || result.tier!==1 || !Array.isArray(result.data))throw Error('JCS_REAL_API_FAILURE '+JSON.stringify({ok:result.ok,tier:result.tier,reason:result.reason,class:result.class}));
const normalized=result.data.map((x,index)=>({index,title:typeof x.title==='string'?x.title.trim():''})).filter(x=>x.title).slice(0,25);
if(normalized.length<20)throw Error('JCS_INSUFFICIENT_LIVE_SOURCE_RESULTS');
const digest=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
const sourceId='JCS-API-ANYTHING-HN-'+digest.slice(0,24);
const now=new Date().toISOString();
const receipt={
 source_id:sourceId,
 source_pointer:'https://news.ycombinator.com/',
 source_type:'API',
 raw_line:'PUBLIC_HN_FRONTPAGE_SHA256:'+digest+':ROWCOUNT:'+normalized.length,
 owner_hint:'MUNCHER-X',
 primary_domain:'MUNCHER-X',
 evidence_lineage:'API_ANYTHING_HN_FRONT_PAGE;SHA256:'+digest+';UPSTREAM_COMMIT:'+expectedCommit+';GITHUB_RUN:'+String(process.env.GITHUB_RUN_ID||'UNKNOWN')+';OBSERVED_AT:'+now,
 acquisition_state:'SUPPLIED_UNVERIFIED',
 source_sufficiency:'UNKNOWN',
 sensitivity_class:'NORMAL',
 processing_key:'munch:api-anything:hacker-news:frontPage:'+digest
};
for(const key of ['source_id','source_pointer','source_type','raw_line','evidence_lineage','processing_key'])if(!receipt[key])throw Error('JCS_INVALID_RECEIPT_'+key);
if(sourceId.length>100 || receipt.evidence_lineage.length>400 || !/^[0-9a-f]{64}$/.test(digest))throw Error('JCS_INVALID_CHECKSUM');
console.log('JCS_HN_TO_MUNCHER_REAL_SOURCE '+JSON.stringify({
 operation:'hacker-news.frontPage',
 source_count:normalized.length,
 source_checksum_sha256:digest,
 retrieved_at:now,
 upstream_commit:expectedCommit,
 munger_target:'jc_savage.muncher_x_intake_external_evidence',
 proposed_input:receipt,
 generated_by_real_api_anything_call:true,
 canonical_write:false,
 dispatched_to_live_muncher:false,
 source_payload_persisted:false,
 authorization_needed_for_intake_write:true
}));
