/**
 * CANDIDATE ONLY — NOT DEPLOYED.
 *
 * Edge receiver: short-lived, SIGNATURE VERIFIED GitHub Actions OIDC token,
 * exact workflow+repo+manual approval environment, fixed public source metadata,
 * one existing MUNCHER-X intake function, independent live DB readback.
 *
 * This deliberately requires verify_jwt=false WHEN DEPLOYED: GitHub OIDC is not
 * a Supabase user JWT. ALL auth is done here by issuer JWKS + claims checks.
 * No GitHub secret or Supabase admin key ever enters GitHub Actions.
 * Deployment requires separate JC approval and protected GitHub environment.
 */
import postgres from 'npm:postgres@3.4.5';

const project='vxubjwmiizjyrxuflxhu';
const repo='jshonuff/auto-browser';
const repoId='1220312076';
const ref='refs/heads/jc-savage/pilot-api-anything-20261021';
const workflowRef=repo+'/.github/workflows/jcs-hn-oidc-bridge.yml@'+ref;
const issuer='https://token.actions.githubusercontent.com';
const audience='jcs-api-anything-muncher-intake-v1';
const trustedEnvironment='jcs-muncher-intake-approved';
const commit='20cb677039fcfe92d3d9c777aa9362e30ff1fdb8';
const fixedUrl='https://news.ycombinator.com/';
const host='token.actions.githubusercontent.com';
const asString=x=>typeof x==='string'?x:'';
const timeNow=()=>Math.floor(Date.now()/1000);
const enc=new TextEncoder();

class Reject extends Error {
  constructor(code,status=403){super(code);this.code=code;this.status=status;}
}
function decodeBase64url(part){
  if(!/^[A-Za-z0-9_-]+$/.test(part))throw new Reject('INVALID_TOKEN_BASE64');
  const padded=part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4);
  return Uint8Array.from(atob(padded),x=>x.charCodeAt(0));
}
function parsePart(part){
 try{return JSON.parse(new TextDecoder().decode(decodeBase64url(part)))}
 catch{throw new Reject('INVALID_TOKEN_JSON')}
}
async function verifyGithubOIDC(jwt){
 if(jwt.length>8500)throw new Reject('TOKEN_TOO_LONG');
 const parts=jwt.split('.');
 if(parts.length!==3)throw new Reject('INVALID_TOKEN_FORMAT');
 const header=parsePart(parts[0]);
 if(header.alg!=='RS256'||!/^[\w.:-]{1,256}$/.test(asString(header.kid)))throw new Reject('UNSUPPORTED_JWT_HEADER');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),7000);
 let keys;
 try{
  // fixed known issuer; do not accept an attacker-controlled JWKS URL or jku.
  const result=await fetch('https://'+host+'/.well-known/jwks',{signal:controller.signal,redirect:'error'});
  if(!result.ok)throw Error('JWKS_STATUS');
  const body=await result.text();
  if(body.length>180000)throw Error('JWKS_SIZE');
  keys=JSON.parse(body).keys;
 }catch{throw new Reject('ISSUER_KEY_DISCOVERY_UNAVAILABLE',503)}finally{clearTimeout(timer)}
 const key=Array.isArray(keys)?keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig'&&k.alg==='RS256'):null;
 if(!key)throw new Reject('TRUSTED_RSA_KEY_MISSING');
 let verified=false;
 try{
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decodeBase64url(parts[2]),enc.encode(parts[0]+'.'+parts[1]));
 }catch{throw new Reject('JWT_VERIFICATION_FAILED')}
 if(!verified)throw new Reject('JWT_SIGNATURE_INVALID');
 const claims=parsePart(parts[1]);
 const now=timeNow();
 if(claims.iss!==issuer || claims.aud!==audience)throw new Reject('OIDC_ISSUER_OR_AUDIENCE');
 if(!Number.isFinite(claims.iat)||!Number.isFinite(claims.exp)||
    claims.exp<=now||claims.iat>now+45||claims.iat<now-300||
    claims.exp-claims.iat>600||
    (claims.nbf!==undefined&&claims.nbf>now+45))throw new Reject('OIDC_EXPIRED');
 if(claims.repository!==repo||String(claims.repository_id)!==repoId||
    claims.ref!==ref||claims.workflow_ref!==workflowRef||
    claims.event_name!=='workflow_dispatch'||claims.environment!==trustedEnvironment||
    !/^\d{5,}$/.test(asString(claims.run_id)))throw new Reject('WORKFLOW_NOT_APPROVED');
 return claims;
}
const textValid=(x,n=500)=>typeof x==='string'&&x.length>0&&x.length<=n;
function validateEnvelope(b,claims){
 if(!b||typeof b!=='object'||Array.isArray(b))throw new Reject('BODY_NOT_OBJECT',400);
 const hash=asString(b.checksum_sha256);
 if(b.schema_version!==1||b.site!=='hacker-news'||b.operation!=='frontPage'||
    b.upstream_commit!==commit||b.source_pointer!==fixedUrl||
    b.source_type!=='API'||b.owner_hint!=='MUNCHER-X'||b.primary_domain!=='MUNCHER-X'||
    b.acquisition_state!=='SUPPLIED_UNVERIFIED'||b.source_sufficiency!=='UNKNOWN'||
    b.sensitivity_class!=='NORMAL'||!/^([a-f0-9]{64})$/.test(hash)||
    !Number.isInteger(b.source_count)||b.source_count<20||b.source_count>25||
    b.github_run_id!==claims.run_id)throw new Reject('UNAPPROVED_SOURCE_ENVELOPE',400);
 const observed=Date.parse(b.observed_at);
 if(!Number.isFinite(observed)||Math.abs(Date.now()-observed)>10*60*1000)throw new Reject('STALE_SOURCE_ENVELOPE',400);
 const sourceId='JCS-API-ANYTHING-HN-'+hash.slice(0,24);
 const expectedLine='PUBLIC_HN_FRONTPAGE_SHA256:'+hash+':ROWCOUNT:'+b.source_count;
 const lineage=`API_ANYTHING_HN_FRONT_PAGE;SHA256:${hash};UPSTREAM_COMMIT:${commit};GITHUB_RUN:${claims.run_id};OBSERVED_AT:${b.observed_at}`;
 if(b.source_id!==sourceId||b.raw_line!==expectedLine||
    b.evidence_lineage!==lineage||
    b.processing_key!=='munch:api-anything:hacker-news:frontPage:'+hash||
    !textValid(b.source_id,120)||!textValid(b.evidence_lineage,500))throw new Reject('PROVENANCE_MISMATCH',400);
 return {sourceId,sourcePointer:fixedUrl,rawLine:expectedLine,lineage,processingKey:b.processing_key};
}
function jsonReply(code,payload){return new Response(JSON.stringify(payload),{status:code,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

Deno.serve(async request=>{
 if(request.method!=='POST')return jsonReply(405,{error:'POST_ONLY'});
 const rawAuth=request.headers.get('Authorization')||'';
 if(!rawAuth.startsWith('Bearer '))return jsonReply(401,{error:'OIDC_REQUIRED'});
 let sql;
 try{
  const claims=await verifyGithubOIDC(rawAuth.slice(7));
  const size=Number(request.headers.get('content-length')||'0');
  if(size>4800)throw new Reject('BODY_TOO_LARGE',413);
  const raw=await request.text();
  if(raw.length>4800)throw new Reject('BODY_TOO_LARGE',413);
  const body=JSON.parse(raw);
  const candidate=validateEnvelope(body,claims);
  const url=Deno.env.get('SUPABASE_DB_URL');
  if(!url)throw new Reject('DATABASE_NOT_CONFIGURED',503);
  sql=postgres(url,{max:1,connect_timeout:5,idle_timeout:1});
  // The single SQL statement performs same-statement policy preflight.
  // It calls the existing (already registered) MUNCHER-X intake function only.
  const receipt=await sql`
    WITH gates AS (
      SELECT
       (SELECT count(*) FROM jc_savage.workflow_execution_control
        WHERE control_key='singleton' AND production_dispatch_enabled=false
          AND claims_enabled=false AND codex_writes_enabled=false
          AND evidence_required=true)=1 AS allowed,
       (SELECT count(*) FROM jc_savage.action_ownership_registry
        WHERE action_key='muncher_x_intake_external_evidence'
          AND owner_state='ASSIGNED' AND execution_state='ALLOWED'
          AND accountable_owner_ref='MUNCHER-X'
          AND notes->>'canon_mutation_authority'='false')=1 AS owner_exists,
       (SELECT count(*) FROM jc_savage.dataset_sync_consumers
        WHERE enabled=true AND (
          lower(dataset_key) IN ('munch_queue_entries','munch_queue')
          OR lower(coalesce(metadata->>'source_relation',''))='jc_savage.munch_queue_entries'
        ))=0 AS no_derived_consumers
    ), applied AS (
      SELECT CASE WHEN allowed AND owner_exists AND no_derived_consumers
       THEN jc_savage.muncher_x_intake_external_evidence(
        ${candidate.sourceId}, ${candidate.sourcePointer}, 'API', ${candidate.rawLine},
        'MUNCHER-X', 'MUNCHER-X', ${candidate.lineage},
        'SUPPLIED_UNVERIFIED','UNKNOWN','NORMAL', ${candidate.processingKey}, '{}'::jsonb
       )
       ELSE jsonb_build_object('status','HOLD','reason','LIVE_GOVERNANCE_GATE')
       END AS payload FROM gates
    )
    SELECT payload FROM applied LIMIT 1
  `;
  const payload=receipt?.[0]?.payload;
  if(!['QUEUED','SUPPRESSED'].includes(payload?.status)||
     payload?.source_id!==candidate.sourceId){
   throw new Reject('INTAKE_NOT_ACCEPTED_OR_HELD',409);
  }
  // Independent canonical readback, no claim/worker dispatch.
  const rows=await sql`
    SELECT source_id,status,likely_owner,readback_verified,owner_result_state,processing_key
    FROM jc_savage.munch_queue_entries
    WHERE source_id=${candidate.sourceId} AND processing_key=${candidate.processingKey}
  `;
  const row=rows[0];
  if(!row||row.source_id!==candidate.sourceId||
     row.likely_owner!=='MUNCHER-X'||row.readback_verified!==false ||
     row.owner_result_state!==null ||
     !['QUEUED','DEFERRED','ROUTED'].includes(row.status)){
   throw new Reject('CANONICAL_READBACK_FAILED',409);
  }
  return jsonReply(200,{receipt_verified:true,source_id:candidate.sourceId,intake_status:payload.status,dispatch_enabled:false});
 }catch(e){
  if(e instanceof Reject)return jsonReply(e.status,{error:e.code});
  return jsonReply(500,{error:'SAFE_RECEIVER_FAILURE'});
 }finally{
  if(sql)await sql.end({timeout:1}).catch(()=>{});
 }
});
