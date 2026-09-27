const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1365,height:900}});const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.PORTAL_ASSISTANT_URL || 'http://127.0.0.1:8512');
    await page.getByRole('heading',{name:'Portal Content Assistant',exact:true}).waitFor({timeout:30000});
    await page.getByLabel('Paste the announcement or details').fill("CITY UNIVERSITY OF SCIENCE AND INFORMATION TECHNOLOGY\nADMISSIONS OPEN FALL '26\nBS English\nLAST DATE OF REGISTRATION: 5th October, 2026");
    await page.getByLabel('Official source or application URL').fill('https://cup.edu.pk/registration.php');
    await page.getByRole('button',{name:'Prepare sheet rows',exact:true}).click();
    await page.getByText('Copy-ready Google Sheets data',{exact:true}).waitFor({timeout:15000});
    await page.getByRole('button',{name:'Download TSV file',exact:true}).waitFor({timeout:30000});
    const testIds=await page.locator('[data-testid]').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.getAttribute('data-testid')))].sort());
    assert.ok(testIds.includes('stDownloadButton'),JSON.stringify(testIds));
    assert.ok(testIds.includes('stJson'),JSON.stringify(testIds));
    const output=path.join(__dirname,'..','test-results');fs.mkdirSync(output,{recursive:true});
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
    const mobile=await browser.newPage({viewport:{width:390,height:844}});
    await mobile.goto(process.env.PORTAL_ASSISTANT_URL || 'http://127.0.0.1:8512');
    await mobile.getByRole('heading',{name:'Portal Content Assistant',exact:true}).waitFor({timeout:30000});
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
    await mobile.close();
    assert.deepEqual(errors,[]);
    console.log('PASS Streamlit UI: professional shell, editable extraction flow, copy-ready rows, and responsive layout.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
