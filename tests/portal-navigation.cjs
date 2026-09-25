const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];let dialogs=0;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',async dialog=>{dialogs++;await dialog.dismiss();});
    const data={
      resources:[{ID:'R1',Title:'Biology PDF',Category:'Notes',ResourceType:'PDF',FileURL:'https://drive.google.com/file/d/demo-file-1/view?resourcekey=demo-key'}],mcqs:[],videos:[],
      admissions:[
        {ID:'A1',Institution:'KPK College',Program:'FSc',DegreeLevel:'Intermediate',Eligibility:'Matric',Deadline:'2026-10-01',MeritListDate:'2026-10-10'},
        {ID:'A2',Institution:'Example University',Program:'BS Computer Science',DegreeLevel:'Bachelor',Eligibility:'FSc',Deadline:'2026-11-01'}
      ],
      scholarships:[
        {ID:'S1',Name:'Pakistan Need-Based Grant',Country:'Pakistan',Type:'Financial Aid'},
        {ID:'S2',Name:'International Scholarship',Country:'United Kingdom',Type:'Scholarship'}
      ],
      opportunities:[
        {ID:'O1',Title:'Student Internship',Type:'Internship'},
        {ID:'O2',Title:'Youth Competition',Type:'Competition'}
      ],
      announcements:[
        {ID:'N1',Title:'Exam schedule',Category:'Exam Update'},
        {ID:'N2',Title:'Results announced',Category:'Results'},
        {ID:'N3',Title:'University merit list',Category:'Merit List'}
      ],
      aiTools:[
        {ID:'T1',Name:'Study Assistant',Category:'Assistant',BestFor:'Students'},
        {ID:'T2',Name:'Smart Planner',Category:'Productivity',BestFor:'Study planning'}
      ],
      islamicContent:[{ID:'I1',Title:'Hadith example',Type:'Hadith',Reference:'Sahih source'}],
      blog:[
        {ID:'B1',Title:'Study Abroad Guide',Category:'Study Abroad',Summary:'International education'},
        {ID:'B2',Title:'General Student Article',Category:'Education'}
      ],
      entryTests:[{ID:'E1',Name:'NUMS',Slug:'nums',Organization:'NUMS'}]
    };
    await page.route('https://script.google.com/**',async route=>{
      const action=new URL(route.request().url()).searchParams.get('action');
      if(action==='portalData') return route.abort();
      if(action==='mdcatSubjects') return route.fulfill({json:{success:true,data:[{ID:'MDS-001',Name:'Biology',DisplayOrder:1}]}});
      return route.fulfill({json:{success:true,data:data[action]||[]}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    assert.equal(await page.locator('#categoryGrid .card').count(),10);

    for(let index=0;index<10;index++){
      await page.evaluate(()=>showHome());
      await page.locator('#categoryGrid .card').nth(index).click();
      await page.locator('#dynamicPage').waitFor({state:'visible'});
      assert.ok((await page.locator('#dynamicPageContent').textContent()).trim());
    }
    assert.equal(dialogs,0);

    await page.evaluate(()=>handleNavigation({Slug:'notes',Label:'Notes'}));
    await page.getByText('Biology PDF',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'View PDF',exact:true}).getAttribute('href'),'https://drive.google.com/file/d/demo-file-1/view?resourcekey=demo-key');
    assert.match(await page.getByRole('link',{name:'Download PDF',exact:true}).getAttribute('href'),/drive\.google\.com\/uc\?export=download&id=demo-file-1&resourcekey=demo-key/);
    const saveResource=page.getByRole('button',{name:'Save resource',exact:true});await saveResource.click();
    assert.equal(await page.locator('#dynamicPageContent button[aria-pressed="true"]').count(),1);assert.equal(await page.evaluate(()=>getPortalBookmarks()[0].title),'Biology PDF');

    const navigation=await page.evaluate(()=>PORTAL_BOOTSTRAP_DATA.navigation);
    for(const item of navigation){
      if(item.Slug==='home') continue;
      await page.evaluate(item=>handleNavigation(item),item);
      if(item.Slug==='mdcat'){
        await page.locator('#mdcatHub').waitFor({state:'visible'});
        continue;
      }
      await page.waitForFunction(()=>{
        const value=document.getElementById('dynamicPageContent').textContent.trim();
        return value && !/^Loading\b/i.test(value);
      });
      assert.equal(await page.locator('#dynamicPage').isVisible(),true,item.Slug);
      assert.ok((await page.locator('#dynamicPageContent').textContent()).trim(),item.Slug);
    }

    const internship=navigation.find(item=>item.Slug==='internships');
    await page.evaluate(item=>handleNavigation(item),internship);
    await page.getByText('Student Internship',{exact:true}).waitFor();
    assert.equal(await page.getByText('Youth Competition',{exact:true}).count(),0);

    const admissionMerit=navigation.find(item=>item.ID==='NAV-028');
    await page.evaluate(item=>handleNavigation(item),admissionMerit);
    await page.getByText('FSc',{exact:true}).waitFor();
    const updateMerit=navigation.find(item=>item.ID==='NAV-051');
    await page.evaluate(item=>handleNavigation(item),updateMerit);
    await page.getByText('University merit list',{exact:true}).waitFor();

    await page.setViewportSize({width:375,height:812});
    await page.evaluate(()=>showHome());
    const menuToggle=page.getByRole('button',{name:'Menu',exact:true});
    await menuToggle.waitFor({state:'visible'});
    assert.equal(await page.locator('#mainNavigation').isVisible(),false);
    await menuToggle.click();assert.equal(await menuToggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#mainNavigation').isVisible(),true);
    assert.equal(await page.getByRole('button',{name:'Student sign in',exact:true}).isVisible(),true);
    const studyToggle=page.getByRole('button',{name:'Show Study submenu'});
    await studyToggle.click();assert.equal(await studyToggle.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#submenu-NAV-002').isVisible(),true);
    await page.locator('#submenu-NAV-002').getByText('Notes',{exact:true}).click();
    assert.equal(await page.locator('#mainNavigation').isVisible(),false);
    await menuToggle.click();await page.keyboard.press('Escape');assert.equal(await page.locator('#mainNavigation').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS portal navigation: all ten homepage cards and all 59 navigation records resolve without alerts or blank pages; duplicate merit-list routes, filtered modules, empty states, and mobile layout verified.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
