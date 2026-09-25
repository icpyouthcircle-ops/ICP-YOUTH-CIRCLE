const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];let saves=0;
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname,'../admin.html')).href);await page.locator('#adminLogin').waitFor({state:'visible'});
    const session={email:'owner@example.test',role:'Super Admin',tables:[{key:'RESOURCES',label:'Resources',headers:['ID','Title','Description','Status'],rowCount:1},{key:'MDCAT_QUESTION_BANK',label:'MDCAT question bank',headers:['ID','Question','CorrectOption','Explanation','Status'],rowCount:1}]};
    await page.evaluate(({session})=>{
      window.adminRequest=async(action,body={})=>{
        if(action==='adminList') return {headers:session.tables.find(table=>table.key===body.table).headers,rows:[{ID:'RES-001',Title:'Existing',Description:'Text',Status:'Active'}],total:1};
        if(action==='adminSession') return session;
        if(action==='adminSave'){window.__adminSave={body};return {created:false};}
        if(action==='adminBulk'){window.__adminBulk={body};return {saved:1,created:1,updated:0};}
        return {};
      };
      adminRenderSession(session);
    },{session});
    await page.getByRole('heading',{name:'Records',exact:true}).waitFor();await page.getByText('Existing',{exact:true}).waitFor();
    assert.equal(await page.locator('#adminTable option').count(),2);assert.equal(await page.getByText('CorrectOption',{exact:true}).count(),0);
    await page.getByRole('button',{name:'New record',exact:true}).click();await page.locator('#adminEditor [data-field="Title"]').fill('New resource');await page.locator('#adminEditor').getByRole('button',{name:'Save record',exact:true}).click();
    await page.waitForFunction(()=>window.__adminSave);saves++;assert.equal(await page.evaluate(()=>window.__adminSave.body.record.Title),'New resource');
    await page.getByRole('button',{name:'Paste multiple rows',exact:true}).click();await page.locator('#adminBulkText').fill('ID\tTitle\tDescription\tStatus\nRES-002\tBulk resource\tBulk text\tInactive');await page.getByRole('button',{name:'Validate and save rows',exact:true}).click();await page.waitForFunction(()=>window.__adminBulk);assert.equal(await page.evaluate(()=>window.__adminBulk.body.records[0].Title),'Bulk resource');
    await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);assert.equal(saves,1);
    console.log('PASS admin dashboard: sign-in shell, safe table selector, record editor, bulk paste validation, private-column exclusion, and mobile layout.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
