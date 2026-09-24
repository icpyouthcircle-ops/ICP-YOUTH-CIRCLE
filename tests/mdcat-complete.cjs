const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'mdcat-demo-fixture.json')));
const actions = {mdcatSubjects:'MDCAT_Subjects',mdcatUnits:'MDCAT_Units',mdcatChapters:'MDCAT_Chapters',mdcatTopics:'MDCAT_Topics',mdcatQuestions:'MDCAT_Question_Bank',mdcatTests:'MDCAT_Tests',mdcatTestQuestions:'MDCAT_Test_Questions',mdcatDailyPractice:'MDCAT_Daily_Practice',mdcatUpdates:'MDCAT_Updates'};
const columns = {subjectId:'SubjectID',unitId:'UnitID',chapterId:'ChapterID',topicId:'TopicID',testId:'TestID'};
fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
(async()=>{
  const browser = await chromium.launch({headless:true, ...(process.env.MDCAT_BROWSER_CHANNEL ? {channel:process.env.MDCAT_BROWSER_CHANNEL} : {})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    let failure='';
    const calls=[];
    await page.route('https://script.google.com/**',async route=>{
      const params=new URL(route.request().url()).searchParams;
      const action=params.get('action'); calls.push(action);
      if(action==='portalData') return route.fulfill({json:{success:true,data:{settings:{},navigation:[{ID:'home',Slug:'home',Label:'Home'},{ID:'entry',Slug:'entry-tests',Label:'Entry Tests'}],categories:[]}}});
      if(action==='entryTests') return route.fulfill({json:{success:true,data:[]}});
      assert.ok(actions[action],'Unexpected route '+action);
      let rows=structuredClone(fixture[actions[action]]);
      for(const [param,column] of Object.entries(columns)) if(params.has(param)) rows=rows.filter(row=>String(row[column])===params.get(param));
      if(action==='mdcatQuestions') {
        rows.forEach(row=>{delete row.CorrectOption;delete row.Explanation;});
        if(failure==='missing-question') rows=rows.filter(row=>row.ID!=='MDQ-DEMO-006');
        if(failure==='empty') rows=[];
        if(failure==='invalid') return route.fulfill({json:{success:true,data:{}}});
        if(failure==='html') return route.fulfill({contentType:'text/html',body:'<html>Sign in</html>'});
        if(failure==='network') return route.abort();
        if(failure==='timeout') return;
        if(failure==='slow') await new Promise(r=>setTimeout(r,400));
      }
      if(action==='mdcatTestQuestions' && failure==='duplicate-map') rows.push(rows[0]);
      if(action==='mdcatTestQuestions' && failure==='wrong-test') rows[0].TestID='another';
      if(action==='mdcatTopics' && failure==='wrong-chapter') rows[0].ChapterID='another';
      if(action==='mdcatUpdates') {
        rows.push({Title:'Future update',PublishDate:'2999-01-01'},{Title:'Expired update',ExpiryDate:'2000-01-01'});
        rows[0].OfficialURL='javascript:alert(1)'; rows[0].Content='<img src=x onerror=alert(1)>';
      }
      await route.fulfill({json:{success:true,data:rows}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    await page.evaluate(()=>handleNavigation({Slug:'mdcat',Label:'MDCAT'}));
    const tool=name=>page.getByRole('navigation',{name:'MDCAT tools'}).getByRole('button',{name,exact:true});
    for(const name of ['Biology','Chemistry','Physics','English','Logical Reasoning']) {
      await page.getByRole('button',{name:'View '+name+' units',exact:true}).click();
      await page.getByRole('button',{name:'View Demo '+name+' Unit chapters',exact:true}).click();
      await page.getByRole('button',{name:'View Demo '+name+' Chapter topics',exact:true}).click();
      await page.getByRole('button',{name:'View Demo '+name+' Topic practice questions',exact:true}).click();
      await page.getByRole('button',{name:'Start practice',exact:true}).waitFor();
      await tool('Subjects').click();
    }
    await tool('Question bank').click();
    await page.getByRole('button',{name:'Start practice',exact:true}).click();
    assert.equal(await page.locator('.mdcat-question').count(),6);
    await page.locator('.mdcat-question').first().locator('input[value="B"]').check();
    await page.getByRole('button',{name:'Save for revision',exact:true}).first().click();
    await page.getByRole('button',{name:'Finish practice',exact:true}).click();
    assert.match(await page.locator('.mdcat-result').textContent(),/1 answered · 5 unanswered/);
    assert.equal(await page.locator('.mdcat-question input:disabled').count(),24);
    await page.getByRole('button',{name:'Save activity in this browser',exact:true}).click();
    await tool('My activity').click();
    await page.getByText('1 saved sessions · 1 answers selected. Accuracy, mastery and scores are not calculated.',{exact:true}).waitFor();
    await tool('Revision').click();
    await page.getByRole('button',{name:'Practise saved question',exact:true}).click();
    await page.getByRole('button',{name:'Start practice',exact:true}).click();
    assert.equal(await page.locator('.mdcat-question').count(),1);
    await tool('Revision').click();
    await page.getByRole('button',{name:'Remove from revision',exact:true}).click();
    await page.getByText('No saved questions yet. Use Save for revision during practice.',{exact:true}).waitFor();
    await tool('Study plan').click();
    await page.getByLabel('Study task',{exact:true}).fill('Demo revision target');
    await page.getByLabel('Target date (optional)',{exact:true}).fill('2026-10-01');
    await page.getByRole('button',{name:'Add task',exact:true}).click();
    await page.getByRole('button',{name:'Mark complete',exact:true}).click();
    await page.getByText('Completed · 2026-10-01',{exact:true}).waitFor();
    await page.reload();
    await page.locator('#app').waitFor({state:'visible'});
    await page.evaluate(()=>handleNavigation({Slug:'mdcat',Label:'MDCAT'}));
    await tool('Study plan').click();
    await page.getByRole('button',{name:'Remove task',exact:true}).click();
    assert.equal(await page.getByRole('heading',{name:'Demo revision target',exact:true}).count(),0);
    await tool('Tests').click();
    await page.getByRole('button',{name:'Open practice set',exact:true}).click();
    await page.getByRole('button',{name:'Start practice',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>mdcatTimer),null);
    await page.getByRole('button',{name:'Start practice',exact:true}).click();
    assert.equal(await page.locator('.mdcat-question').count(),6);
    assert.match(await page.locator('.mdcat-clock').textContent(),/Time remaining:/);
    await page.evaluate(()=>{mdcatSession.deadline=Date.now()-1;});
    await page.getByText('Time is up.',{exact:true}).waitFor();
    assert.match(await page.locator('.mdcat-result').textContent(),/0 answered · 6 unanswered/);
    assert.equal(await page.evaluate(()=>mdcatTimer),null);
    await tool('Daily practice').click();
    await page.getByRole('button',{name:'Open practice set',exact:true}).click();
    await page.getByRole('button',{name:'Start practice',exact:true}).click();
    assert.equal(await page.locator('.mdcat-question').count(),2);
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-complete-mobile.png'),fullPage:true});
    await tool('Subjects').click();
    assert.equal(await page.evaluate(()=>mdcatTimer),null);
    await tool('Updates').click();
    await page.getByRole('heading',{name:'Demo portal notice',exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Future update',exact:true}).count(),0);
    assert.equal(await page.getByRole('heading',{name:'Expired update',exact:true}).count(),0);
    assert.equal(await page.getByRole('link',{name:'View source',exact:true}).count(),0);
    await page.getByText('Read update',{exact:true}).click();
    assert.equal(await page.locator('#mdcatSubjects img').count(),0);
    for(const mode of ['missing-question','duplicate-map','wrong-test']) {
      failure=mode; await tool('Tests').click();
      await page.getByRole('button',{name:'Open practice set',exact:true}).click();
      await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Start practice',exact:true}).count(),0);
      failure=''; await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByRole('button',{name:'Start practice',exact:true}).waitFor();
    }
    for(const mode of ['network','html','invalid']) {
      failure=mode; await tool('Question bank').click();
      await page.getByRole('button',{name:'Try again',exact:true}).waitFor();
      failure=''; await page.getByRole('button',{name:'Try again',exact:true}).click();
      await page.getByRole('button',{name:'Start practice',exact:true}).waitFor();
    }
    failure='empty'; await tool('Question bank').click();
    await page.getByText('No questions are published here yet.',{exact:true}).waitFor();
    failure='slow'; await tool('Question bank').click(); await tool('Study plan').click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#mdcatHubTitle').textContent(),'Study plan');
    failure='';
    await page.evaluate(()=>localStorage.setItem(MDCAT_LOCAL_KEY,'invalid json'));
    await tool('My activity').click();
    assert.match(await page.locator('#mdcatStatus').textContent(),/unavailable or unreadable/);
    assert.equal(await page.evaluate(()=>localStorage.getItem(MDCAT_LOCAL_KEY)),'invalid json');
    await page.evaluate(()=>localStorage.removeItem(MDCAT_LOCAL_KEY));
    await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('Quota exceeded');};});
    await tool('Study plan').click(); await page.getByLabel('Study task',{exact:true}).fill('Not saved');
    await page.getByRole('button',{name:'Add task',exact:true}).click();
    assert.match(await page.locator('#mdcatStatus').textContent(),/was not saved/);
    await page.setViewportSize({width:1280,height:900});
    await tool('Subjects').click(); await page.locator('#mdcatSubjects article').nth(4).waitFor();
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-complete-desktop.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    assert.ok(Object.keys(actions).every(action=>calls.includes(action)));
    console.log('PASS: all nine public routes; all five full hierarchies; practice selections; local activity/revision/plans and reload; explicit test mappings/counts; daily scope; timer start/expiry/cancel; wrong/duplicate/missing mapping rejection; API failure/retry/empty/stale; update dates/unsafe links; mobile layout; storage corruption/quota. No private routes, uncaught errors or grading claims.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
