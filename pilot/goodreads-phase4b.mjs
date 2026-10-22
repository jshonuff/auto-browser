// JC-SAVAGE Phase 4: separate-site validation. Public Goodreads autocomplete only.
// Network: fixed https://www.goodreads.com/book/auto_complete?format=json&q=hyperion
// No credentials, no saved responses, no backend mutations, no generated web recipes.
import { call } from './dist/index.js';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';

const site=JSON.parse(readFileSync('sites/goodreads.json','utf8'));
const op=site.operations.find(o=>o.name==='searchBooks');
if(!op || !op.readOnly || op.learnedLoggedIn || op.minTier!==1 ||
   op.request.method!=='GET' || op.slots.length!==1 || op.slots[0].param!=='q' ||
   !op.request.url.startsWith('https://www.goodreads.com/book/auto_complete?'))
 throw Error('STOP: nonpublic or unsupported site specification');
const query='hyperion';
const endpoint='https://www.goodreads.com/book/auto_complete?format=json&q='+encodeURIComponent(query);
const times={api:[],http:[]}, comparisons=[];
const browserBlockedStatus=403; // Verified prior GitHub run 39719360908; no retry.
const median=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
const normalise=x=>{
 const arr=Array.isArray(x)?x:(Array.isArray(x?.books)?x.books:(Array.isArray(x?.results)?x.results:null));
 if(!arr || !arr.length) throw Error('No matching books returned');
 const ids=arr.map(o=>String(o.bookId??o.book_id??o.id??'')).filter(Boolean);
 if(!ids.length)throw Error('Response lacks book identifiers');
 return ids;
};
const api=async()=>{
 const x=await call('goodreads','searchBooks',{q:query},{maxTier:1,allowWrites:false,minIntervalMs:0,timeoutMs:30000});
 if(!x.ok||x.tier!==1)throw Error('Read-only API failure, class='+x.class+', reason='+x.reason);
 return normalise(x.data);
};
const http=async()=>{
 const r=await fetch(endpoint,{method:'GET',redirect:'error',signal:AbortSignal.timeout(30000),headers:{accept:'application/json'}});
 if(!r.ok)throw Error('HTTP status '+r.status);
 return normalise(await r.json());
};
// Prior Chromium GET returned HTTP 403. Do not retry access-denied paths.
await http(); await api();
for(let i=0;i<3;i++){
 const order=i%2?['http','api']:['api','http'];
 const samples={};
 for(const label of order){
  const t=performance.now();
  samples[label]=label==='api'?await api():await http();
  times[label].push(+(performance.now()-t).toFixed(1));
 }
 const reference=new Set(samples.http);
 const matched=samples.api.filter(id=>reference.has(id)).length;
 comparisons.push({apiMatches:matched,referenceCount:reference.size});
 if(matched<Math.min(3,reference.size))throw Error('Public response mismatch: '+JSON.stringify(comparisons.at(-1)));
 await new Promise(resolve=>setTimeout(resolve,750));
}
console.log('JCS_GOODREADS_PHASE4B '+JSON.stringify({upstreamCommit:process.env.PIN,operation:'goodreads.searchBooks',query,measuredRuns:3,browserBlockedStatus,medianMs:Object.fromEntries(Object.entries(times).filter(([k,v])=>v.length).map(([k,v])=>[k,median(v)])),trialMs:times,parity:comparisons,source:'public unauthenticated Goodreads autocomplete',claimScope:'Goodreads direct HTTP and API Anything comparison; previously blocked Chromium 403 not retried; excludes AI token usage',persistentResults:false}));
