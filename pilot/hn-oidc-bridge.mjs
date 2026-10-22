/**
 * JC-SAVAGE optional GitHub-OIDC bridge — candidate only, NOT production.
 * Runs the genuine fixed, unauthenticated API Anything Tier-1 Hacker News GET.
 * Dry-run requests a short-lived GitHub OIDC identity JWT and validates its
 * *untrusted* inspected claims, then emits NON-SENSITIVE proof metadata.
 *
 * --submit is a distinct, fail-closed path requiring a separately approved
 * GitHub environment + approved HTTPS Edge receiver. This workflow DOES NOT
 * call --submit. Edge receiver independently validates signature and claims.
 */
import { call } from './dist/index.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const projectId='vxubjwmiizjyrxuflxhu';
const upstream='20cb677039fcfe92d3d9c777aa9362e30ff1fdb8';
const ghRepo='jshonuff/auto-browser';
const ghRepoId='1220312076';
const branch='refs/heads/jc-savage/pilot-api-anything-20261021';
const wf='.github/workflows/jcs-hn-oidc-bridge.yml';
const audience='jcs-api-anything-muncher-intake-v1';
const endpoint=`https://${projectId}.supabase.co/functions/v1/jcs-api-anything-intake`;
function fail(reason){throw Error('JCS_FAIL_CLOSED_'+reason)}
function assert(cond,reason){if(!cond)fail(reason)}
function claimsOf(value){
 const parts=value.split('.');
 assert(parts.length===3,'OIDC_JWT_FORMAT');
 return JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
}
async function oidcToken(){
 const base=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
 const bearer=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 assert(base?.startsWith('https://')&&bearer,'NO_GITHUB_IDENTITY');
 const url=new URL(base);
 url.searchParams.set('audience',audience);
 assert(url.protocol==='https:','OIDC_URL_PROTOCOL');
 const response=await fetch(url,{headers:{Authorization:'Bearer '+bearer},redirect:'error',signal:AbortSignal.timeout(10000)});
 assert(response.ok,'OIDC_RESPONSE_'+response.status);
 const body=await response.json();
 assert(typeof body.value==='string'&&body.value.length>100,'OIDC_TOKEN_MISSING');
 return body.value;
}
const mode=process.argv[2]??'--dry-run';
assert(mode==='--dry-run'||mode==='--submit','BAD_MODE');
assert(process.env.PIN===upstream,'SOURCE_UNPINNED');
assert(process.env.GITHUB_REPOSITORY===ghRepo&&String(process.env.GITHUB_REPOSITORY_ID)===ghRepoId,'WRONG_REPOSITORY');
assert(process.env.GITHUB_REF===branch,'WRONG_BRANCH');
assert(process.env.GITHUB_WORKFLOW_REF?.startsWith(ghRepo+'/'+wf+'@'+branch),'WRONG_WORKFLOW');
assert(process.env.SUPABASE_SERVICE_ROLE_KEY===undefined&&process.env.SUPABASE_DB_URL===undefined,'ADMIN_SECRET_IN_RUNNER');
const submit=mode==='--submit';
if(submit){
 assert(process.env.GITHUB_EVENT_NAME==='workflow_dispatch','NOT_MANUAL_DISPATCH');
 assert(process.env.JCS_PRODUCTION_DISPATCH==='false','DISPATCH_MUST_STAY_OFF');
 assert(process.env.JCS_INTAKE_APPROVED==='true','NO_EXPLICIT_APPROVAL');
 assert(process.env.JCS_INTAKE_ENVIRONMENT==='jcs-muncher-intake-approved','MISSING_APPROVED_ENVIRONMENT');
 assert(process.env.JCS_INTAKE_ENDPOINT===endpoint,'UNAPPROVED_ENDPOINT');
} else {
 assert(process.env.JCS_PRODUCTION_DISPATCH==='false','DISPATCH_MUST_STAY_OFF');
 assert(process.env.JCS_SUPABASE_WRITE_ENABLED==='false','PILOT_WRITE_NOT_DISABLED');
}
const spec=JSON.parse(readFileSync('sites/hacker-news.json','utf8'));
const op=spec.operations.find(x=>x.name==='frontPage');
assert(op?.readOnly===true&&!op.learnedLoggedIn&&op.minTier===1&&op.request.method==='GET'&&
 op.request.url==='https://news.ycombinator.com/'&&op.slots.length===0,'SOURCE_OPERATION_NOT_APPROVED');
const source=await call('hacker-news','frontPage',{}, {maxTier:1,allowWrites:false,minIntervalMs:0,timeoutMs:30000});
assert(source.ok&&source.tier===1&&Array.isArray(source.data),'SOURCE_API_FAILED');
const normal=source.data.map(x=>String(x?.title||'').trim()).filter(Boolean).slice(0,25);
assert(normal.length>=20,'INSUFFICIENT_RESULTS');
const digest=createHash('sha256').update(JSON.stringify(normal)).digest('hex');
const fetched_at=new Date().toISOString();
const runId=String(process.env.GITHUB_RUN_ID||'');
assert(/^\d{5,}$/.test(runId),'NO_RUN_ID');
const envelope={
 source_id:'JCS-API-ANYTHING-HN-'+digest.slice(0,24),
 source_pointer:'https://news.ycombinator.com/',
 source_type:'API',
 raw_line:'PUBLIC_HN_FRONTPAGE_SHA256:'+digest+':ROWCOUNT:'+normal.length,
 owner_hint:'MUNCHER-X',
 primary_domain:'MUNCHER-X',
 evidence_lineage:`API_ANYTHING_HN_FRONT_PAGE;SHA256:${digest};UPSTREAM_COMMIT:${upstream};GITHUB_RUN:${runId};OBSERVED_AT:${fetched_at}`,
 acquisition_state:'SUPPLIED_UNVERIFIED',
 source_sufficiency:'UNKNOWN',
 sensitivity_class:'NORMAL',
 processing_key:'munch:api-anything:hacker-news:frontPage:'+digest
};
const token=await oidcToken();
// Decoding the local token isn't verification. The receiving edge must do
// RSA/JWKS signature verification. Never emit the token or claim JSON.
const claims=claimsOf(token);
assert(claims.iss==='https://token.actions.githubusercontent.com','OIDC_ISSUER');
assert(claims.aud===audience,'OIDC_AUDIENCE');
assert(claims.repository===ghRepo&&String(claims.repository_id)===ghRepoId,'OIDC_REPOSITORY');
assert(claims.ref===branch,'OIDC_BRANCH');
assert(claims.workflow_ref===process.env.GITHUB_WORKFLOW_REF,'OIDC_WORKFLOW');
assert(claims.run_id===runId,'OIDC_RUN');
assert(Math.abs(Date.now()/1000-Number(claims.iat))<180,'OIDC_TOO_OLD');
if(submit){
 assert(claims.event_name==='workflow_dispatch'&&claims.environment==='jcs-muncher-intake-approved','OIDC_UNAPPROVED_EXECUTION');
 const response=await fetch(endpoint,{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({schema_version:1,site:'hacker-news',operation:'frontPage',upstream_commit:upstream,
    source_count:normal.length,checksum_sha256:digest,observed_at:fetched_at,github_run_id:runId,
    ...envelope})
 });
 const body=await response.text();
 assert(response.ok,'RECEIVER_HTTP_'+response.status);
 const outcome=JSON.parse(body);
 assert(outcome.receipt_verified===true&&outcome.source_id===envelope.source_id&&
 ['QUEUED','SUPPRESSED'].includes(outcome.intake_status),'RECEIVER_READBACK_UNVERIFIED');
 console.log('JCS_OIDC_INTAKE_RECEIPT '+JSON.stringify({source_id:envelope.source_id,status:outcome.intake_status,receipt_verified:true}));
}else{
 console.log('JCS_OIDC_REAL_BRIDGE_PREFLIGHT '+JSON.stringify({
  mode:'DRY_RUN',real_api_anything_called:true,results:normal.length,sha256:digest,
  oidc_minted:true,claims_locally_inspected:true,server_signature_not_tested:true,
  source_id:envelope.source_id,receiver_deployed:false,database_requests:0,
  site_payload_retained:false,production_dispatch:false,
  github_run_id:runId
 }));
}
