/**
 * JC-SAVAGE: bounded, GitHub-OIDC authenticated API Anything -> MUNCHER-X sender.
 * Authorized event: push in the approved pilot branch and exact workflow only.
 * Requires an administrator-set environment variable (JCS_INTAKE_APPROVED=true)
 * in the named GitHub Environment before attempting the live POST.
 * No Supabase key, database URL, login, article text or credentials are used.
 */
import { call } from './dist/index.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const upstream='20cb677039fcfe92d3d9c777aa9362e30ff1fdb8';
const repo='jshonuff/auto-browser';
const branch='refs/heads/jc-savage/pilot-api-anything-20261021';
const workflow=repo+'/.github/workflows/jcs-hn-oidc-live-submit.yml@'+branch;
const audience='jcs-api-anything-muncher-intake-v1';
const endpoint='https://vxubjwmiizjyrxuflxhu.supabase.co/functions/v1/jcs-api-anything-intake';
const envName='jcs-muncher-intake-approved';
function requireTrue(x,label){if(!x)throw Error('JCS_HOLD_'+label)}
requireTrue(process.env.PIN===upstream,'UPSTREAM');
requireTrue(process.env.JCS_INTAKE_APPROVED==='true','ENVIRONMENT_APPROVAL_NOT_SET');
requireTrue(process.env.GITHUB_EVENT_NAME==='push','EVENT');
requireTrue(process.env.GITHUB_REPOSITORY===repo,'REPOSITORY');
requireTrue(String(process.env.GITHUB_REPOSITORY_ID)==='1220312076','REPOSITORY_ID');
requireTrue(process.env.GITHUB_REF===branch,'BRANCH');
requireTrue(process.env.GITHUB_WORKFLOW_REF===workflow,'WORKFLOW');
requireTrue(process.env.JCS_PRODUCTION_DISPATCH==='false','PRODUCTION_DISPATCH');
requireTrue(process.env.SUPABASE_SERVICE_ROLE_KEY===undefined,'NO_SERVICE_ROLE_KEY_IN_GITHUB');
requireTrue(process.env.SUPABASE_DB_URL===undefined,'NO_DATABASE_PASSWORD_IN_GITHUB');
const spec=JSON.parse(readFileSync('sites/hacker-news.json','utf8'));
const op=spec.operations.find(x=>x.name==='frontPage');
requireTrue(op?.readOnly===true&&!op.learnedLoggedIn&&op.minTier===1&&op.request.method==='GET'&&op.request.url==='https://news.ycombinator.com/'&&op.slots.length===0,'SITE_SPEC');
const source=await call('hacker-news','frontPage',{}, {maxTier:1,allowWrites:false,minIntervalMs:0,timeoutMs:30000});
requireTrue(source.ok===true&&source.tier===1&&Array.isArray(source.data),'SITE_RESPONSE');
const titles=source.data.map(x=>typeof x.title==='string'?x.title.trim():'').filter(Boolean).slice(0,25);
requireTrue(titles.length>=20,'INSUFFICIENT_SOURCE');
const digest=createHash('sha256').update(JSON.stringify(titles)).digest('hex');
const runId=String(process.env.GITHUB_RUN_ID??'');
requireTrue(/^\d{5,}$/.test(runId),'RUN_ID');
const observed=new Date().toISOString();
const sourceId='JCS-API-ANYTHING-HN-'+digest.slice(0,24);
const envelope={
 schema_version:1,site:'hacker-news',operation:'frontPage',upstream_commit:upstream,
 source_count:titles.length,checksum_sha256:digest,observed_at:observed,github_run_id:runId,
 source_id:sourceId,source_pointer:'https://news.ycombinator.com/',source_type:'API',
 raw_line:'PUBLIC_HN_FRONTPAGE_SHA256:'+digest+':ROWCOUNT:'+titles.length,
 owner_hint:'MUNCHER-X',primary_domain:'MUNCHER-X',
 evidence_lineage:'API_ANYTHING_HN_FRONT_PAGE;SHA256:'+digest+';UPSTREAM_COMMIT:'+upstream+';GITHUB_RUN:'+runId+';OBSERVED_AT:'+observed,
 acquisition_state:'SUPPLIED_UNVERIFIED',source_sufficiency:'UNKNOWN',sensitivity_class:'NORMAL',
 processing_key:'munch:api-anything:hacker-news:frontPage:'+digest
};
const requestUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
const requestToken=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
requireTrue(requestUrl?.startsWith('https://')&&requestToken,'GITHUB_OIDC_UNAVAILABLE');
const url=new URL(requestUrl);
url.searchParams.set('audience',audience);
const identity=await fetch(url,{
 method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
 headers:{Authorization:'Bearer '+requestToken}
});
requireTrue(identity.ok,'OIDC_MINT_FAILED');
const jwt=(await identity.json()).value;
requireTrue(typeof jwt==='string'&&jwt.split('.').length===3,'OIDC_TOKEN_INVALID');
// Local claim inspection is NOT signature verification: the receiving Edge
// Function independently verifies the real GitHub JWKS signature.
const claim=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString('utf8'));
requireTrue(claim.iss==='https://token.actions.githubusercontent.com','ISSUER');
requireTrue(claim.aud===audience,'AUDIENCE');
requireTrue(claim.repository===repo&&String(claim.repository_id)==='1220312076','OIDC_REPO');
requireTrue(claim.ref===branch&&claim.workflow_ref===workflow,'OIDC_WORKFLOW');
requireTrue(claim.event_name==='push'&&claim.environment===envName,'OIDC_ENVIRONMENT');
requireTrue(String(claim.run_id)===runId,'OIDC_RUN');
const response=await fetch(endpoint,{
 method:'POST',redirect:'error',signal:AbortSignal.timeout(25000),
 headers:{Authorization:'Bearer '+jwt,'Content-Type':'application/json'},
 body:JSON.stringify(envelope)
});
const result=await response.json().catch(()=>({error:'NON_JSON_RECEIVER'}));
requireTrue(response.ok&&result.receipt_verified===true,'RECEIVER_'+response.status+'_'+String(result.error??'NO_RECEIPT'));
requireTrue(result.source_id===sourceId&&['QUEUED','SUPPRESSED'].includes(result.intake_status),'CANONICAL_RECEIPT');
console.log('JCS_REAL_AUTO_INTAKE '+JSON.stringify({
 source_id:sourceId,github_run_id:runId,source_count:titles.length,status:result.intake_status,
 receiver_verified:true,database_password_in_github:false,production_dispatch:false
}));
