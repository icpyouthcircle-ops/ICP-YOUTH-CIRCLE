const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    await page.addInitScript(()=>{
      window.__ICP_TEST_TOUR__=true;
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedPortalItem=data;}});
    });
    const soon=new Date(Date.now()+10*86400000).toISOString();
    const later=new Date(Date.now()+90*86400000).toISOString();
    const countdownTarget=new Date(Date.now()+((2*24+3)*60*60+4*60+5)*1000).toISOString();
    const modules={
      announcements:[{ID:'FRI-1',Title:'Friday reflection',Category:'Friday Reminder',Summary:'A managed reminder.'}],
      countdowns:[{ID:'COUNT-1',Title:'MDCAT result',Description:'Official result countdown.',TargetDateTime:countdownTarget,AfterMessage:'Result announced',OfficialURL:'https://example.test/result',ButtonText:'View result',Status:'Active'}],
      faqs:[{ID:'FAQ-1',Question:'How do I save a resource?',Answer:'Use the Save resource button.',Category:'Resources',DisplayOrder:1}],
      scholarships:[{ID:'SCH-1',Name:'Closing scholarship',Deadline:soon,OfficialURL:'https://example.test/soon'},{ID:'SCH-2',Name:'Later scholarship',Deadline:later}],
      resources:[{ID:'RES-1',Title:'Biology notes',Category:'Notes',FileURL:'https://example.test/notes'}]
    };
    await page.route('https://script.google.com/**',route=>{
      const url=new URL(route.request().url());const action=url.searchParams.get('action');
      if(action==='portalData')return route.abort();
      if(action==='resources')return route.fulfill({json:{success:true,data:modules.resources}});
      return route.fulfill({json:{success:true,data:modules[action] || []}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});

    const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../manifest.webmanifest'),'utf8'));
    assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,3);
    assert.equal(await page.locator('link[rel="manifest"]').count(),1);
    assert.equal(await page.locator('#portalInstallButton').count(),1);

    await page.locator('.welcome-tour').waitFor({state:'visible'});
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('button',{name:'Start exploring',exact:true}).click();
    assert.equal(await page.locator('.welcome-tour').count(),0);

    await page.evaluate(()=>{portalPakistanWeekday=()=> 'Friday';portalRenderFridayReminder();});
    await page.getByText('Friday reflection',{exact:true}).waitFor();

    await page.getByRole('heading',{name:'MDCAT result',exact:true}).waitFor();
    assert.equal(await page.locator('.public-countdown-clock [data-unit="days"]').innerText(),'02');
    assert.equal(await page.locator('.public-countdown-clock [data-unit="hours"]').innerText(),'03');
    assert.equal(await page.locator('.public-countdown-clock [data-unit="minutes"]').innerText(),'04');
    assert.equal(await page.locator('#examCountdownForm').count(),0);
    fs.mkdirSync(path.join(__dirname,'../test-results'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'../test-results/portal-enhancements-desktop.png'),fullPage:true});
    await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(__dirname,'../test-results/portal-enhancements-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});

    await page.evaluate(()=>handleNavigation({Slug:'faq',Label:'Frequently Asked Questions',ParentID:'NAV-008'}));
    await page.getByText('How do I save a resource?',{exact:true}).waitFor();
    await page.locator('.faq-search').fill('save');assert.equal(await page.locator('.faq-item').count(),1);
    await page.locator('.faq-search').fill('unrelated');assert.equal(await page.getByText('No matching answers found.',{exact:true}).count(),1);

    await page.evaluate(()=>handleNavigation({Slug:'scholarships',Label:'Scholarships'}));
    await page.getByText('Closing scholarship',{exact:true}).waitFor();
    await page.locator('#scholarshipClosing').selectOption('closing');
    assert.equal(await page.getByText('Closing scholarship',{exact:true}).count(),1);assert.equal(await page.getByText('Later scholarship',{exact:true}).count(),0);

    await page.evaluate(()=>handleNavigation({Slug:'notes',Label:'Notes',ParentID:'NAV-002'}));
    await page.getByText('Biology notes',{exact:true}).waitFor();await page.getByRole('button',{name:'Share Biology notes',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__sharedPortalItem.title),'Biology notes');
    assert.equal(await page.locator('#dynamicPageContent .portal-share-button svg').count(),1);
    await page.evaluate(()=>{handleNavigation({Slug:'home',Label:'Home'});portalDrawCountdown({ID:'COUNT-PAST',Title:'Past result',TargetDateTime:'2020-01-01T10:00:00+05:00',AfterMessage:'Result announced'});});
    await page.getByText('Result announced',{exact:true}).waitFor();
    assert.equal(await page.locator('.public-countdown-clock').isVisible(),false);assert.equal(await page.locator('.public-countdown-announced').isVisible(),true);
    console.log('PASS portal enhancements: install manifest, welcome tour, admin countdown with announced state, FAQs, closing-soon filtering and polished native sharing.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
