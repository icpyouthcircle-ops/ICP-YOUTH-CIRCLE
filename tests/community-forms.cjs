const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createBackend}=require('./scoring-harness.cjs');

function backendChecks(){
  const backend=createBackend();
  backend.addSheet('Submissions',[{ID:'',Name:'',Email:'',Title:'',ResourceType:'',Subject:'',Level:'',Description:'',URL:'',Status:'',SubmittedAt:'',CreatedAt:'',UpdatedAt:''}]);
  backend.addSheet('Help_Desk',[{ID:'',Name:'',Email:'',RequestType:'',Subject:'',Message:'',Status:'',SubmittedAt:'',CreatedAt:'',UpdatedAt:''}]);
  const ok=result=>{assert.equal(result.success,true,JSON.stringify(result));return result.data;};
  const bad=(result,code)=>{assert.equal(result.success,false,JSON.stringify(result));assert.equal(result.error.code,code);};
  const token='abcdefghijklmnopqrstuvwx';
  const resource=ok(backend.call('publicSubmitResource',null,{submissionToken:token,name:'Student',email:'student@example.test',title:'Biology notes',resourceType:'Notes',subject:'Biology',level:'Class 12',description:'Useful revision notes',url:'https://example.test/biology'}));
  assert.match(resource.id,/^SUBM-/);assert.equal(resource.status,'Pending Review');
  const saved=backend.rows('Submissions').find(row=>row.ID===resource.id);
  assert.equal(saved.Email,'student@example.test');assert.equal(saved.Status,'Pending Review');assert.equal(saved.URL,'https://example.test/biology');
  const help=ok(backend.call('publicHelpRequest',null,{submissionToken:'helpabcdefghijklmnopqrst',name:'Student',email:'student@example.test',requestType:'Study guidance',subject:'Physics plan',message:'Please guide me.'}));
  assert.match(help.id,/^HELP-/);assert.equal(backend.rows('Help_Desk').find(row=>row.ID===help.id).Message,'Please guide me.');
  ok(backend.call('publicSubmitResource',null,{submissionToken:'outsiderabcdefghijklmnop',name:'Other',email:'other@example.test',title:'Other resource',resourceType:'Notes',url:'https://example.test/other'}));
  const studentToken=backend.token('student',{}, {email:'student@example.test'});
  const dashboard=ok(backend.call('studentDashboard',studentToken));
  assert.equal(dashboard.email,'student@example.test');assert.ok(dashboard.submissions.some(row=>row.Title==='Biology notes'));assert.ok(dashboard.helpRequests.some(row=>row.Subject==='Physics plan'));
  assert.equal(dashboard.submissions.some(row=>row.Title==='Other resource'),false);
  bad(backend.call('publicSubmitResource',null,{submissionToken:'badurlabcdefghijklmnopqr',name:'Student',email:'student@example.test',title:'Bad link',resourceType:'Other',url:'javascript:alert(1)'}),'BAD_REQUEST');
  bad(backend.call('publicHelpRequest',null,{submissionToken:'honeypotabcdefghijklmnop',website:'spam',name:'Bot',email:'bot@example.test',requestType:'Other',subject:'Spam',message:'Spam'}),'BAD_REQUEST');
  for(let index=0;index<5;index++) ok(backend.call('publicHelpRequest',null,{submissionToken:'ratelimitabcdefghijklmnop',name:'Student',email:'student@example.test',requestType:'Other',subject:'Question '+index,message:'Message'}));
  bad(backend.call('publicHelpRequest',null,{submissionToken:'ratelimitabcdefghijklmnop',name:'Student',email:'student@example.test',requestType:'Other',subject:'Extra',message:'Message'}),'RATE_LIMITED');
  const legacy=createBackend();
  legacy.addSheet('Submissions',[{ID:'',SubmittedBy:'',ContactEmail:'',ResourceTitle:'',Type:'',Link:'',Status:'',SubmittedAt:''}]);
  const legacyResult=legacy.call('publicSubmitResource',null,{submissionToken:'legacyabcdefghijklmnopqr',name:'Contributor',email:'contributor@example.test',title:'Legacy schema resource',resourceType:'Website',url:'https://example.test/resource'});
  assert.equal(legacyResult.success,true,JSON.stringify(legacyResult));
  const legacyRow=legacy.rows('Submissions').find(row=>row.ID===legacyResult.data.id);
  assert.equal(legacyRow.SubmittedBy,'Contributor');assert.equal(legacyRow.ResourceTitle,'Legacy schema resource');assert.equal(legacyRow.Link,'https://example.test/resource');
}

async function browserChecks(){
  const browser=await chromium.launch({headless:true,...(process.env.MDCAT_BROWSER_CHANNEL?{channel:process.env.MDCAT_BROWSER_CHANNEL}:{})});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];const requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://script.google.com/**',async route=>{
      const request=route.request();
      if(request.method()==='POST'){
        const body=JSON.parse(request.postData());requests.push(body);
        const id=body.action==='publicSubmitResource'?'SUBM-101':'HELP-101';
        return route.fulfill({json:{success:true,data:{id,status:'Pending Review'}}});
      }
      return route.abort();
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
    await page.locator('#app').waitFor({state:'visible'});
    await page.evaluate(()=>handleNavigation({Slug:'submit-resource',Label:'Submit Resource'}));
    await page.getByLabel('Your name *').fill('Student');await page.getByLabel('Email *').fill('student@example.test');
    await page.getByLabel('Resource title *').fill('Biology notes');await page.getByLabel('Resource type *').selectOption('Notes');
    await page.getByLabel('Resource link *').fill('https://example.test/notes');await page.locator('.portal-form-consent input').check();
    await page.getByRole('button',{name:'Send for review'}).click();await page.getByText(/Reference: SUBM-101/).waitFor();
    assert.equal(requests[0].action,'publicSubmitResource');assert.equal(requests[0].title,'Biology notes');assert.match(requests[0].submissionToken,/^[A-Za-z0-9_-]{20,80}$/);
    await page.evaluate(()=>handleNavigation({Slug:'student-help-desk',Label:'Student Help Desk'}));
    await page.getByLabel('Your name *').fill('Student');await page.getByLabel('Email *').fill('student@example.test');
    await page.getByLabel('Request type *').selectOption('Study guidance');await page.getByLabel('Subject *').fill('Study plan');
    await page.getByLabel('How can we help? *').fill('Please guide me.');await page.locator('.portal-form-consent input').check();
    await page.getByRole('button',{name:'Send request'}).click();await page.getByText(/Reference: HELP-101/).waitFor();
    assert.equal(requests[1].action,'publicHelpRequest');assert.equal(requests[1].message,'Please guide me.');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
}

(async()=>{backendChecks();await browserChecks();console.log('PASS community forms: resource and help submissions validate, save for review, resist spam, show references, remain owner-filtered in the student dashboard, and fit mobile screens.');})().catch(error=>{console.error(error);process.exit(1);});
