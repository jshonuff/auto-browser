/**
 * JC-SAVAGE API Anything, phase 2: read-only and unauthenticated.
 * Compares a warm imported API Anything library with a warm Chromium browser
 * and an ordinary Node fetch + HTML parser. No persistence of fetched content.
 */
import {call} from './dist/index.js';
import {parse} from 'node-html-parser';
import {chromium} from 'playwright-core';
import {performance} from 'node:perf_hooks';
import {readFileSync} from 'node:fs';
const site=JSON.parse(readFileSync('sites/hacker-news.json','utf8'));
const operation=site.operations.find(x=>x.name==='frontPage');
if(!operation || operation.request.method!=='GET' || operation.request.url!=='https://news.ycombinator.com/' || operation.slots.length || !operation.readOnly || operation.learnedLoggedIn || operation.minTier!==1)
  throw Error('fail-closed public GET only preflight failed');
const url=operation.request.url;
const count=7;
const times={api_library:[],browser_warm:[],node_fetch_parse:[]};
const overlaps=[];
let browser;
const med=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)];
const run=async (label,fn)=>{
  const t=performance.now();const titles=await fn();const ms=+(performance.now()-t).toFixed(1);
  if(!Array.isArray(titles)||titles.length<25) throw Error(label+': insufficient results '+titles?.length);
  times[label].push(ms);
  return titles.map(x=>String(x).trim());
};
const library=async()=>{
 const x=await call('hacker-news','frontPage',{}, {maxTier:1,minIntervalMs:0,timeoutMs:20000,allowWrites:false});
 if(!x.ok||x.tier!==1||!Array.isArray(x.data)) throw Error('API returned '+JSON.stringify({ok:x.ok,tier:x.tier,kind:x.class,reason:x.reason}));
 return x.data.map(z=>z.title);
};
const basic=async()=>{
 const r=await fetch(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(20000),headers:{accept:'text/html'}});
 if(r.status!==200) throw Error('Raw GET status '+r.status);
 return parse(await r.text()).querySelectorAll('tr.athing .titleline > a').map(x=>x.textContent.trim());
};
try {
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const chrome=async()=>{
  const ctx=await browser.newContext({storageState:{cookies:[],origins:[]}});
  try{
   const p=await ctx.newPage();
   await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   return await p.locator('tr.athing .titleline > a').allTextContents();
  }finally{await ctx.close()}
 };
 // Warm all code paths before measured data; warmup excluded.
 await library();await chrome();await basic();
 for(let i=0;i<count;i++){
   // Alternate execution order to control for server cache and changing site load.
   const seq = i%2===0 ? ['api_library','browser_warm','node_fetch_parse'] : ['node_fetch_parse','browser_warm','api_library'];
   const titleBy={};
   for(const label of seq){
      const fn=label==='api_library'?library:label==='browser_warm'?chrome:basic;
      titleBy[label]=await run(label,fn);
   }
   const reference=new Set(titleBy.browser_warm);
   const api=titleBy.api_library.filter(x=>reference.has(x)).length;
   const raw=titleBy.node_fetch_parse.filter(x=>reference.has(x)).length;
   overlaps.push({api,raw});
   if(api<25 || raw<25) throw Error('content mismatch: '+JSON.stringify({api,raw}));
 }
} finally {if(browser)await browser.close()}
const a=med(times.api_library),b=med(times.browser_warm),f=med(times.node_fetch_parse);
console.log('JCS_PHASE2_BENCH '+JSON.stringify({
 commit:process.env.PIN, operation:'hacker-news.frontPage', trials:count,
 milliseconds:times, median_ms:{api_library:a,browser_warm:b,node_fetch_parse:f},
 versus_warm_browser_percent:+((b-a)*100/b).toFixed(1),
 overlap:overlaps,
 scope:'Same unauthenticated public GET, one host, no browser login, no writes; warm import and Chrome process; includes response parse, excludes AI agent orchestration and model tokens.'
}));
