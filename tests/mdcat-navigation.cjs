const fs = require('node:fs');
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const subjects = ['Biology', 'Chemistry', 'Physics', 'English', 'Logical Reasoning'].map((Name, i) => ({ID:`MDS-00${i+1}`, Name, Slug:Name.toLowerCase().replaceAll(' ','-'), Icon:'', DisplayOrder:i+1}));
fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.MDCAT_BROWSER_CHANNEL ? {channel:process.env.MDCAT_BROWSER_CHANNEL} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let mode = 'success';
    let unitMode = 'success';
    let chapterMode = 'success';
    let delayEntry = false;
    await page.route('https://script.google.com/**', async route => {
      const action = new URL(route.request().url()).searchParams.get('action');
      let data = [];
      if (action === 'portalData') data = {settings:{}, navigation:[{ID:'home',Slug:'home',Label:'Home'},{ID:'entry',Slug:'entry-tests',Label:'Entry Tests'},{ID:'mdcat',ParentID:'entry',Slug:'mdcat',Label:'MDCAT'},{ID:'nums',ParentID:'entry',Slug:'nums',Label:'NUMS'},{ID:'notes',Slug:'notes',Label:'Notes'}],categories:[{Name:'Entry Tests',Slug:'entry-tests'}]};
      if (action === 'entryTests') {
        if (delayEntry) await new Promise(r => setTimeout(r,400));
        data = [{Name:'MDCAT existing details',Slug:'mdcat',Organization:'Existing organization'},{Name:'NUMS existing details',Slug:'nums'}];
      }
      if (action === 'mdcatSubjects') {
        if (mode === 'network') return route.abort();
        if (mode === 'http') return route.fulfill({status:503,body:'Unavailable'});
        if (mode === 'html') return route.fulfill({contentType:'text/html',body:'<html>Sign in</html>'});
        if (mode === 'invalid') return route.fulfill({json:{success:true,data:{}}});
        if (mode === 'backend') return route.fulfill({json:{success:false,error:'Failed'}});
        if (mode === 'slow') await new Promise(r=>setTimeout(r,400));
        data = mode === 'empty' ? [] : subjects.slice().reverse();
      }
      if (action === 'mdcatUnits') {
        const id = new URL(route.request().url()).searchParams.get('subjectId');
        assert.ok(id);
        if (unitMode === 'http') return route.fulfill({status:503,body:'Unavailable'});
        if (unitMode === 'slow') await new Promise(r=>setTimeout(r,400));
        data = id === 'MDS-001' ? [{ID:'MDU-DEMO-002',SubjectID:id,Name:'Second unit',DisplayOrder:2},{ID:'MDU-DEMO-001',SubjectID:id,Name:'Demo Biology Unit',DisplayOrder:1}] : [];
        if (unitMode === 'wrong-subject') data[0].SubjectID='MDS-002';
      }
      if (action === 'mdcatChapters') {
        const params = new URL(route.request().url()).searchParams;
        assert.equal(params.get('subjectId'),'MDS-001');
        const unitId = params.get('unitId');
        assert.ok(unitId);
        if (chapterMode === 'http') return route.fulfill({status:503,body:'Unavailable'});
        if (chapterMode === 'slow') await new Promise(r=>setTimeout(r,400));
        data = unitId === 'MDU-DEMO-001' ? [
          {ID:'MDC-DEMO-002',UnitID:unitId,SubjectID:'MDS-001',Name:'Second chapter',DisplayOrder:2},
          {UnitID:unitId,SubjectID:'MDS-001',Name:'Demo Biology Chapter',Description:'<img src=x onerror=alert(1)>',DisplayOrder:1}
        ] : [];
        if (chapterMode === 'wrong-unit') data[0].UnitID='another-unit';
        if (chapterMode === 'wrong-subject') data[0].SubjectID='MDS-002';
      }
      await route.fulfill({json:{success:true,data}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    await page.getByRole('navigation').getByText('Entry Tests',{exact:true}).click();
    await page.getByText('NUMS existing details',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Open MDCAT 2027 subject hub →'}).click();
    await page.locator('#mdcatSubjects article').nth(4).waitFor();
    assert.deepEqual(await page.locator('#mdcatSubjects h3').allTextContents(), subjects.map(s=>s.Name));
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-desktop.png'),fullPage:true});
    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'View Biology units',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading',{name:'Demo Biology Unit',exact:true}).waitFor();
    assert.deepEqual(await page.locator('#mdcatSubjects h3').allTextContents(),['Demo Biology Unit','Second unit']);
    assert.match(await page.locator('#mdcatSubjects').textContent(),/not official syllabus/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-units-mobile.png'),fullPage:true});
    await page.getByRole('button',{name:'View Demo Biology Unit chapters',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('heading',{name:'Demo Biology Chapter',exact:true}).waitFor();
    assert.deepEqual(await page.locator('#mdcatSubjects h3').allTextContents(),['Demo Biology Chapter','Second chapter']);
    assert.equal(await page.locator('#mdcatSubjects img').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-chapters-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1280,height:900});
    await page.screenshot({path:path.join(__dirname,'../test-results/mdcat-chapters-desktop.png'),fullPage:true});
    for (const failure of ['http','wrong-unit','wrong-subject']) {
      await page.getByRole('button',{name:'← Biology units',exact:true}).click();
      chapterMode = failure;
      await page.getByRole('button',{name:'View Demo Biology Unit chapters',exact:true}).click();
      await page.getByRole('button',{name:'Try again'}).waitFor();
      chapterMode = 'success';
      await page.getByRole('button',{name:'Try again'}).click();
      await page.getByRole('heading',{name:'Demo Biology Chapter',exact:true}).waitFor();
    }
    await page.getByRole('button',{name:'← Biology units',exact:true}).click();
    await page.getByRole('button',{name:'View Second unit chapters',exact:true}).click();
    await page.getByText('No chapters are published for Second unit yet. Please check again later.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'← Biology units',exact:true}).click();
    chapterMode = 'slow';
    await page.getByRole('button',{name:'View Demo Biology Unit chapters',exact:true}).click();
    await page.getByRole('button',{name:'← Biology units',exact:true}).click();
    await page.getByRole('heading',{name:'Demo Biology Unit',exact:true}).waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#mdcatHubTitle').textContent(),'Biology — Units');
    chapterMode = 'success';
    await page.getByRole('button',{name:'All subjects'}).click();
    await page.getByRole('button',{name:'View Chemistry units',exact:true}).click();
    await page.getByText('No units are published for Chemistry yet. Please check again later.',{exact:true}).waitFor();
    for (const failure of ['http','wrong-subject']) {
      await page.getByRole('button',{name:'All subjects'}).click();
      unitMode = failure;
      await page.getByRole('button',{name:'View Biology units',exact:true}).click();
      await page.getByRole('button',{name:'Try again'}).waitFor();
      unitMode = 'success';
      await page.getByRole('button',{name:'Try again'}).click();
      await page.getByRole('heading',{name:'Demo Biology Unit',exact:true}).waitFor();
    }
    await page.getByRole('button',{name:'All subjects'}).click();
    unitMode = 'slow';
    await page.getByRole('button',{name:'View Biology units',exact:true}).click();
    await page.getByRole('button',{name:'All subjects'}).click();
    await page.locator('#mdcatSubjects article').nth(4).waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#mdcatHubTitle').textContent(),'MDCAT 2027');
    assert.equal(await page.locator('#mdcatSubjects article').count(),5);
    unitMode = 'success';
    await page.getByRole('link',{name:'MDCAT test information'}).click();
    await page.getByText('MDCAT existing details',{exact:true}).waitFor();
    assert.equal(await page.getByText('NUMS existing details',{exact:true}).count(),0);
    await page.getByRole('link',{name:'Open MDCAT 2027 subject hub →'}).click();
    await page.locator('#mdcatSubjects article').nth(4).waitFor();
    for (const failure of ['network','http','html','invalid','backend']) {
      mode = failure;
      await page.evaluate(()=>loadMDCATSubjects());
      await page.getByRole('button',{name:'Try again'}).waitFor();
      assert.match(await page.locator('#mdcatStatus').textContent(),/Unable to load/);
      mode = 'success';
      await page.getByRole('button',{name:'Try again'}).click();
      await page.locator('#mdcatSubjects article').nth(4).waitFor();
    }
    mode = 'empty';
    await page.evaluate(()=>loadMDCATSubjects());
    assert.match(await page.locator('#mdcatStatus').textContent(),/No subjects/);
    subjects[0].Description='<img src=x onerror=alert(1)>';
    mode = 'success';
    await page.evaluate(()=>loadMDCATSubjects());
    assert.equal(await page.locator('#mdcatSubjects img').count(),0);
    mode = 'slow';
    await page.evaluate(()=>{loadMDCATSubjects();showHome();});
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#mdcatHub').isVisible(),false);
    assert.equal(await page.locator('#homeHero').isVisible(),true);
    delayEntry = true;
    mode = 'success';
    await page.evaluate(()=>{handleNavigation({Slug:'entry-tests',Label:'Entry Tests'});handleNavigation({Slug:'mdcat',Label:'MDCAT'});});
    await page.locator('#mdcatSubjects article').nth(4).waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#dynamicPage').isVisible(),false);
    await page.evaluate(()=>handleNavigation({Slug:'nums',Label:'NUMS'}));
    await page.getByText('NUMS existing details',{exact:true}).waitFor();
    assert.equal(await page.getByText('MDCAT existing details',{exact:true}).count(),0);
    await page.evaluate(()=>handleNavigation({Slug:'notes',Label:'Notes'}));
    assert.equal(await page.locator('#mdcatHub').isVisible(),false);
    assert.equal(await page.locator('#dynamicPageTitle').textContent(),'Notes');
    assert.deepEqual(errors,[]);
    console.log('PASS: subject order, desktop/mobile layout, Entry Tests/MDCAT navigation, legacy MDCAT and NUMS listings, notes navigation, five failure/retry cases, empty state, safe text, cancelled/stale requests; no uncaught browser errors.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
