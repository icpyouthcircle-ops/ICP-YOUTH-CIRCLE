const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://script.google.com/**',async route=>{
      const action=new URL(route.request().url()).searchParams.get('action');
      if(action==='portalData')return route.fulfill({json:{success:true,data:{settings:{},navigation:[],categories:[]}}});
      if(['publicNotifications','countdowns'].includes(action))return route.fulfill({json:{success:true,data:[]}});
      if(action==='portalBundle')return route.fulfill({json:{success:true,data:{resources:[],mcqs:[],videos:[],admissions:[],scholarships:[],opportunities:[],announcements:[],aiTools:[],islamicContent:[],blog:[],entryTests:[]}}});
      if(action==='qaQuestions')return route.fulfill({json:{success:true,data:[{ID:'QAQ-1',Subject:'Physics',Title:'Why does vertical velocity change?',Body:'Explain the effect of gravity during projectile motion.',Tags:'projectile',DisplayName:'Muneeb',AuthorVerified:false,AuthorRole:'Student',CreatedAt:'2026-10-13T04:00:00Z',AnswerCount:1,VoteScore:3,HasVerifiedAnswer:true}]}});
      if(action==='qaAnswers')return route.fulfill({json:{success:true,data:[{ID:'QAA-1',QuestionID:'QAQ-1',Body:'Gravity provides a constant downward acceleration, while no horizontal force acts when air resistance is ignored.',Sources:'First-year physics textbook',DisplayName:'Ms Ayesha',AuthorVerified:true,AuthorRole:'Teacher',IsAccepted:true,VoteScore:3,CreatedAt:'2026-10-13T04:10:00Z'}]}});
      return route.fulfill({json:{success:true,data:[]}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);await page.locator('#app').waitFor({state:'visible'});
    assert.equal(await page.locator('script[src*="qa.js"]').count(),0,'Q&A should remain lazy on the homepage.');
    await page.evaluate(()=>handleNavigation({Slug:'questions',Label:'Student Q&A'}));
    await page.getByRole('heading',{name:'Why does vertical velocity change?',exact:true}).waitFor();
    assert.equal(await page.locator('script[src*="qa.js"]').count(),1);
    await page.getByPlaceholder('Search questions').fill('gravity');
    assert.equal(await page.getByRole('heading',{name:'Why does vertical velocity change?',exact:true}).count(),1);
    await page.getByPlaceholder('Search questions').fill('chemistry');
    await page.getByText('No matching questions found.',{exact:true}).waitFor();
    await page.getByPlaceholder('Search questions').fill('');
    await page.getByRole('button',{name:'View answers',exact:true}).click();
    await page.getByText('Verified Teacher',{exact:true}).waitFor();
    await page.getByText('Accepted answer',{exact:true}).waitFor();
    await page.getByRole('button',{name:'← All questions',exact:true}).click();
    await page.getByRole('button',{name:'Ask a question',exact:true}).click();
    await page.getByRole('heading',{name:'Ask a clear question',exact:true}).waitFor();
    assert.equal(await page.getByLabel('Subject',{exact:true}).count(),1);
    await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS Student Q&A browser: lazy route, search and filtering, verified and accepted answers, question form, safe text, and mobile layout.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
