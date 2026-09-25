const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {createBackend}=require('./scoring-harness.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
 try {
  const backend=createBackend();
  backend.addSheet('Submissions',[{ID:'SUBM-OWN',Email:'student@example.test',Title:'My Biology Resource',ResourceType:'Notes',Subject:'Biology',Status:'Pending Review',SubmittedAt:'2026-09-24T10:00:00Z'},{ID:'SUBM-OTHER',Email:'other@example.test',Title:'Other Student Resource',Status:'Active'}]);
  backend.addSheet('Help_Desk',[{ID:'HELP-OWN',Email:'student@example.test',RequestType:'Study guidance',Subject:'My Physics Plan',Status:'Resolved',AdminResponse:'Plan shared.',SubmittedAt:'2026-09-24T11:00:00Z'},{ID:'HELP-OTHER',Email:'other@example.test',Subject:'Other Student Request',Status:'Pending Review'}]);
  const token=backend.token('student',{}, {email:'student@example.test'});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let loseStart=false,loseSubmit=false,configRequests=0;
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
   if(action==='mdcatAccountConfig'){configRequests++;return route.fulfill({json:{success:true,data:{enabled:true}}});}
   const response=backend.context.doGet({parameter:{action}});
   await route.fulfill({json:JSON.parse(response.getContent())});
  });
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.locator('#app').waitFor({state:'visible'});
  await page.evaluate(()=>localStorage.setItem(PORTAL_BOOKMARKS_KEY,JSON.stringify([{key:'RES-BOOKMARK',title:'Saved Biology Notes',category:'Notes',subject:'Biology',level:'Class 12',fileURL:'https://example.test/biology.pdf',resourceType:'PDF'}])));
  // Inject a signed-in SDK test double; provider token verification still runs in the backend harness.
  await page.evaluate(token=>{mdcatIdentity={auth:{currentUser:{email:'student@example.test',getIdToken:async()=>token}},sdk:{signOut:async(auth)=>{auth.currentUser=null;}}};},token);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  assert.equal(await page.locator('#mdcatHub').isVisible(),true);
  await page.getByRole('button',{name:'My tests',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'My account',exact:true}).count(),1);
  await page.getByRole('button',{name:'My bookmarks',exact:true}).click();await page.getByText('Saved Biology Notes',{exact:true}).waitFor();
  await page.evaluate(()=>openUserAccount());await page.getByRole('button',{name:'My tests',exact:true}).waitFor();
  await page.getByRole('button',{name:'My requests',exact:true}).click();await page.getByText('My Biology Resource',{exact:true}).waitFor();await page.getByText('My Physics Plan',{exact:true}).waitFor();
  assert.equal(await page.getByText('Other Student Resource',{exact:true}).count(),0);assert.equal(await page.getByText('Other Student Request',{exact:true}).count(),0);
  await page.evaluate(()=>openUserAccount());await page.getByRole('button',{name:'My tests',exact:true}).waitFor();
  assert.match(fs.readFileSync(path.join(__dirname,'../js/mdcat-account.js'),'utf8'),/browserSessionPersistence/);
  assert.equal(configRequests,0);
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
  await page.getByRole('button',{name:'My test results',exact:true}).click();
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
  await page.evaluate(()=>openUserAccount());
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await page.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
  assert.equal(await page.locator('.mdcat-result').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS account browser: no blocking config request; authenticated POST body; lost-start and lost-submit recovery; no keys before submission; saved score/review/progress; resume; sign-out; mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
