const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];let searchRequests=0,searchMode='success';
    page.on('pageerror',error=>errors.push(error.message));
    const index=[
      {ID:'MDT-1',Kind:'MDCAT Topic',Title:'Demo Genetics',Description:'Biology genetics practice',Keywords:'biology inheritance',Route:'mdcat',MDCATLevel:'topic',SubjectID:'MDS-001',UnitID:'MDU-001',ChapterID:'MDC-001',TopicID:'MDT-1',SubjectName:'Biology',UnitName:'Genetics',ChapterName:'Inheritance'},
      {ID:'S-1',Kind:'Scholarship',Title:'Biology Student Scholarship',Description:'Support for students',Keywords:'pakistan grant',Route:'scholarships'},
      {ID:'B-1',Kind:'Blog',Title:'<img src=x onerror=alert(1)> Biology',Description:'Safe text result',Keywords:'biology',Route:'blog'}
    ];
    await page.route('https://script.google.com/**',async route=>{
      const action=new URL(route.request().url()).searchParams.get('action');
      if(action==='portalData') return route.abort();
      if(action==='searchIndex'){
        searchRequests++;
        if(searchMode==='error') return route.fulfill({status:503,body:'Unavailable'});
        return route.fulfill({json:{success:true,data:index}});
      }
      if(action==='mdcatSubjects') return route.fulfill({json:{success:true,data:[{ID:'MDS-001',Name:'Biology',DisplayOrder:1}]}});
      if(action==='mdcatQuestions') return route.fulfill({json:{success:true,data:[{ID:'Q1',SubjectID:'MDS-001',UnitID:'MDU-001',ChapterID:'MDC-001',TopicID:'MDT-1',Question:'Search opened this topic',OptionA:'A',OptionB:'B',OptionC:'C',OptionD:'D'}]}});
      return route.fulfill({json:{success:true,data:[]}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    const input=page.locator('#searchInput');
    await input.fill('demo genetics');await input.press('Enter');
    await page.getByRole('heading',{name:'Demo Genetics',exact:true}).waitFor();
    assert.equal(await page.locator('#dynamicPageContent article').count(),1);
    await page.getByRole('button',{name:'Open Demo Genetics',exact:true}).click();
    await page.getByRole('button',{name:'Start practice',exact:true}).click();
    await page.getByText(/Search opened this topic/).waitFor();

    await page.evaluate(()=>showHome());await input.fill('biology');await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.getByRole('heading',{name:'Biology Student Scholarship',exact:true}).waitFor();
    assert.equal(await page.locator('#dynamicPageContent img').count(),0);
    assert.equal(searchRequests,1);
    await page.getByRole('button',{name:'Open Biology Student Scholarship',exact:true}).click();
    await page.getByText('No matching scholarships found.',{exact:true}).waitFor();

    await page.evaluate(()=>showHome());await input.fill('nothing matches');await input.press('Enter');
    await page.getByText(/No published content matched/).waitFor();
    await page.evaluate(()=>showHome());await input.fill('a');await input.press('Enter');
    assert.match(await input.evaluate(node=>node.validationMessage),/at least two/i);

    searchMode='error';
    await page.evaluate(()=>{portalSearchIndex=null;portalSearchPromise=null;localStorage.removeItem(PORTAL_SEARCH_CACHE_KEY);showHome();});
    await input.fill('biology');await input.press('Enter');
    await page.getByRole('button',{name:'Retry search',exact:true}).waitFor();
    searchMode='success';await page.getByRole('button',{name:'Retry search',exact:true}).click();
    await page.getByRole('heading',{name:'Biology Student Scholarship',exact:true}).waitFor();

    await page.setViewportSize({width:375,height:812});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS portal search: Enter/button search, ranked results, safe text, internal navigation, MDCAT topic opening, cache reuse, empty/error/retry states, validation, and mobile layout.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
