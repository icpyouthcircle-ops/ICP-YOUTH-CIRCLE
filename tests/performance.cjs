const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {createBackend}=require('./scoring-harness.cjs');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.route('https://script.google.com/**',async route=>{
      const action=new URL(route.request().url()).searchParams.get('action');
      if(action==='portalData'){
        await new Promise(resolve=>setTimeout(resolve,2500));
        return route.fulfill({json:{success:true,data:{settings:{site_name:'Live title'},navigation:[],categories:[]}}});
      }
      return route.fulfill({json:{success:true,data:[]}});
    });
    const started=Date.now();
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    const visibleIn=Date.now()-started;
    assert.ok(visibleIn<1500,'Static portal startup took '+visibleIn+'ms');
    assert.equal(await page.locator('#categoryGrid .card').count(),10);
    assert.equal(await page.locator('#loading').isHidden(),true);
    await page.locator('#siteName').getByText('Live title',{exact:true}).waitFor({timeout:5000});

    const accountSource=fs.readFileSync(path.join(__dirname,'../js/mdcat-account.js'),'utf8');
    assert.equal(accountSource.includes('?action=mdcatAccountConfig'),false);
    assert.match(accountSource,/MDCAT_FIREBASE_WEB_CONFIG/);

    const backend=createBackend();
    const readSubjects=()=>JSON.parse(backend.context.doGet({parameter:{action:'mdcatSubjects'}}).getContent()).data;
    const before=readSubjects();
    backend.change('MDCAT_Subjects','MDS-001',{Name:'Changed after cache'});
    assert.deepEqual(readSubjects(),before);
    console.log('PASS performance: immediate static startup during a slow API response; background refresh; non-blocking account configuration; server public-data cache.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
