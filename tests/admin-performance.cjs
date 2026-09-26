const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage();
    await page.route('https://script.google.com/**',route=>route.fulfill({json:{success:true,data:[]}}));
    await page.goto(pathToFileURL(path.join(__dirname,'../admin.html')).href);
    await page.evaluate(()=>{document.getElementById('adminLogin').hidden=true;document.getElementById('adminDashboard').hidden=false;});
    await page.getByRole('button',{name:'Performance check',exact:true}).click();
    await page.getByRole('button',{name:'Run performance check',exact:true}).click();
    await page.getByText('All public service checks completed successfully.',{exact:true}).waitFor();
    assert.equal(await page.locator('.performance-card').count(),5);
    assert.equal(await page.getByText('Public visitors are not tracked.',{exact:false}).count(),1);
    console.log('PASS admin performance: checks run only on demand and render page, API and cache health.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
