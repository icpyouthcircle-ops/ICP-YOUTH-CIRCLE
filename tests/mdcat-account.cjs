const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {createBackend}=require('./scoring-harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
 try {
  const backend=createBackend(),token=backend.token('student');
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let loseStart=false,loseSubmit=false;
  await page.route('https://script.google.com/**',async route=>{
   const request=route.request();
   if(request.method()==='POST'){
    assert.match(request.headers()['content-type'],/^text\/plain/);
    assert.equal(new URL(request.url()).search,'');
    const body=JSON.parse(request.postData());assert.equal(body.idToken,token);
    const result=backend.call(body.action,body.idToken,body);
    if(body.action==='mdcatStart'&&loseStart){loseStart=false;return route.abort();}
    if(body.action==='mdcatSubmit'&&loseSubmit){loseSubmit=false;return route.abort();}
    return route.fulfill({json:result});
   }
   const action=new URL(request.url()).searchParams.get('action');
   if(action==='portalData')return route.fulfill({json:{success:true,data:{settings:{},navigation:[],categories:[]}}});
   if(action==='mdcatAccountConfig')return route.fulfill({json:{success:true,data:{enabled:false}}});
   const response=backend.context.doGet({parameter:{action}});
   await route.fulfill({json:JSON.parse(response.getContent())});
  });
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.locator('#app').waitFor({state:'visible'});
  await page.evaluate(()=>handleNavigation({Slug:'mdcat',Label:'MDCAT'}));
  await page.evaluate(()=>openMDCATAccount());
  assert.match(await page.locator('#mdcatStatus').textContent(),/awaiting account setup/);
  assert.equal(await page.getByRole('button',{name:'Continue with Google',exact:true}).count(),0);
  // Inject a signed-in SDK test double; provider token verification still runs in the backend harness.
  await page.evaluate(token=>{mdcatIdentity={auth:{currentUser:{email:'student@example.test',getIdToken:async()=>token}},sdk:{signOut:async(auth)=>{auth.currentUser=null;}}};},token);
  await page.evaluate(()=>openMDCATGraded('test','MDTEST-DEMO-001'));
  loseStart=true;
  await page.getByRole('button',{name:'Start scored attempt',exact:true}).click();
  await page.getByRole('button',{name:'Retry starting this attempt',exact:true}).waitFor();
  await page.getByRole('button',{name:'Retry starting this attempt',exact:true}).click();
  await page.locator('.mdcat-question').nth(5).waitFor();
  assert.equal(backend.rows('MDCAT_Sessions').length,1);
  assert.equal(await page.getByText('Private demo explanation.',{exact:true}).count(),0);
  await page.locator('.mdcat-question').first().locator('input[value="B"]').check();
  loseSubmit=true;
  await page.getByRole('button',{name:'Submit for score',exact:true}).click();
  await page.getByRole('button',{name:'Retry saving the same answers',exact:true}).waitFor();
  assert.equal(await page.locator('.mdcat-question input:disabled').count(),24);
  await page.getByRole('button',{name:'Retry saving the same answers',exact:true}).click();
  await page.getByText('Score saved to your account.',{exact:true}).waitFor();
  assert.equal(backend.rows('MDCAT_Test_Attempts').length,1);
  assert.equal(backend.rows('MDCAT_Attempt_Answers').length,6);
  assert.equal(await page.getByText('Private demo explanation.',{exact:true}).count(),6);
  assert.match(await page.locator('.mdcat-result').textContent(),/Score:/);
  fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
  await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-scored-desktop.png'),fullPage:true});
  await page.setViewportSize({width:375,height:812});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-scored-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'My saved results',exact:true}).click();
  await page.getByRole('button',{name:'View score',exact:true}).click();
  await page.locator('.mdcat-result').waitFor();
  await page.evaluate(()=>openMDCATScoredProgress());
  await page.getByText(/answered · .*accuracy/).waitFor();
  await page.evaluate(()=>openMDCATGraded('daily','MDDP-DEMO-001'));
  await page.getByRole('button',{name:'Start scored attempt',exact:true}).click();
  await page.locator('.mdcat-question').nth(1).waitFor();
  await page.evaluate(()=>openMDCATHub());
  assert.equal(await page.evaluate(()=>mdcatGradeTimer),null);
  await page.evaluate(()=>openMDCATSavedResults());
  await page.getByRole('button',{name:'Resume or recover attempt',exact:true}).click();
  await page.locator('.mdcat-question').nth(1).waitFor();
  await page.getByRole('button',{name:'Submit for score',exact:true}).click();
  await page.getByText('Score saved to your account.',{exact:true}).waitFor();
  assert.equal(backend.rows('MDCAT_Test_Attempts').length,2);
  await page.evaluate(()=>openMDCATAccount());
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
  assert.equal(await page.locator('.mdcat-result').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS account browser: disabled configuration; authenticated POST body; lost-start and lost-submit recovery; no keys before submission; saved score/review/progress; resume; sign-out; mobile layout. Provider popup and real Google Sheets deployment still require configuration and live verification.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
