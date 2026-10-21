// JC-SAVAGE public read-only benchmark: no account credentials and no persistent results.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {performance} from 'node:perf_hooks';
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
const exec=promisify(execFile);
const s=JSON.parse(readFileSync('sites/hacker-news.json','utf8'));
const op=s.operations.find(o=>o.name==='frontPage');
if(!op||!op.readOnly||op.learnedLoggedIn||op.minTier!==1||op.request.method!=='GET'||op.request.url!=='https://news.ycombinator.com/'||op.slots.length) throw Error('read-only gate failed');
const apiTimes=[],browserTimes=[],matches=[];
const api=async()=>{
 const t=performance.now();
 const r=await exec(process.execPath,['dist/cli.js','call','hacker-news','frontPage','--max-tier','1'],{timeout:45000,maxBuffer:4*1024*1024});
 const ms=Math.round(performance.now()-t);
 const x=JSON.parse(r.stdout);
 if(!x.ok||x.tier!==1||!Array.isArray(x.data)||x.data.length<10) throw Error('API response invalid '+JSON.stringify({ok:x.ok,tier:x.tier,count:x.data?.length,class:x.class,next:x.next}));
 return {ms,titles:x.data.map(z=>z.title).filter(Boolean)};
};
let browser;
try {
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const load=async()=>{
  const context=await browser.newContext({storageState:{cookies:[],origins:[]}});
  try {
   const page=await context.newPage(),start=performance.now();
   await page.goto('https://news.ycombinator.com/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForSelector('tr.athing .titleline > a',{timeout:15000});
   const titles=await page.locator('tr.athing .titleline > a').allTextContents();
   const ms=Math.round(performance.now()-start);
   if(titles.length<10) throw Error('browser response invalid');
   return {ms,titles};
  } finally {await context.close()}
 };
 for(let i=0;i<5;i++){
  const a=i%2?null:await api(), b=await load(), aa=a||await api();
  apiTimes.push(aa.ms);browserTimes.push(b.ms);
  const set=new Set(b.titles.map(t=>t.trim()));
  const overlap=aa.titles.filter(t=>set.has(t.trim())).length;
  matches.push(overlap);
  if(overlap<8) throw Error('API/browser response overlap too small: '+overlap);
 }
} finally {if(browser) await browser.close()}
const med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const a=med(apiTimes),b=med(browserTimes);
console.log('JCS_READONLY_BENCH '+JSON.stringify({commit:process.env.PIN,operation:'hacker-news.frontPage',repetitions:5,api_ms:apiTimes,browser_ms:browserTimes,overlap:matches,api_median_ms:a,browser_median_ms:b,speedup_percent:Math.round(1000*(b-a)/b)/10,notes:'Warmed Chrome navigation vs fresh Node CLI invocation; NO agent-token costs, NO account credentials, NO write calls.'}));
