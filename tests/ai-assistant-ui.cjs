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
      if(action==='aiAssistantConfig')return route.fulfill({json:{success:true,data:{enabled:true,providers:['Auto','OpenAI','Gemini'],availableProviders:['OpenAI','Gemini'],modes:['Explain','Summarize','Solve','Quiz Me','Check My Answer','Translate','Find Resources','Study Plan'],languages:['English','Urdu','Pashto'],dailyLimit:30}}});
      if(['publicNotifications','countdowns'].includes(action))return route.fulfill({json:{success:true,data:[]}});
      if(action==='portalBundle')return route.fulfill({json:{success:true,data:{resources:[],mcqs:[],videos:[],admissions:[],scholarships:[],opportunities:[],announcements:[],aiTools:[],islamicContent:[],blog:[],entryTests:[]}}});
      return route.fulfill({json:{success:true,data:[]}});
    });
    await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);await page.locator('#app').waitFor({state:'visible'});
    assert.equal(await page.locator('script[src*="assistant.js"]').count(),0,'Assistant must remain lazy on the homepage.');
    await page.evaluate(()=>{
      window.openMDCATHub=()=>{};window.openUserAccount=()=>{};window.initializePortalAccountState=async()=>{};
      window.mdcatLoadIdentity=async()=>({auth:{currentUser:{uid:'student'}},sdk:{}});
      window.aiTestRequest=null;window.mdcatPrivateRequest=async(action,body)=>{
        if(action==='aiListConversations')return [];
        if(action==='aiChat'){window.aiTestRequest=body;return {conversationId:'AIC-1',message:{id:'AIM-1',role:'assistant',content:'## Cell structure\nCells contain <script>unsafe()</script>, **organized parts**, and `DNA`.\n```text\ncell → nucleus\n```',saved:false,payload:{provider:'Gemini',grounded:true,confidence:'high',cited_source_ids:['S1'],sources:[{id:'S1',title:'Biology Cell Notes',kind:'Resource',route:'notes'}],follow_up_questions:['Quiz me on this topic'],quiz:[{question:'Which part contains genetic material?',options:['Nucleus','Cell wall'],correct_index:0,explanation:'The nucleus contains most genetic material.'}],study_plan:[]}}};}
        if(action==='aiFeedback'||action==='aiSaveMessage')return {saved:true};
        return {conversation:{id:'AIC-1',title:'Cell structure',mode:'Explain',language:'English'},messages:[]};
      };
      handleNavigation({Slug:'ai-assistant',Label:'AI Assistant',ParentID:'NAV-007'});
    });
    await page.getByRole('heading',{name:'What can I help with?'}).waitFor();
    assert.equal(await page.locator('script[src*="assistant.js"]').count(),1);
    assert.equal(await page.locator('#icpAiVerified').count(),0,'General answering should not depend on an ICP-only switch.');
    await page.getByLabel('AI provider').selectOption('Gemini');
    await page.getByLabel('Assistant mode').selectOption('Explain');
    await page.getByLabel('Answer language').selectOption('Urdu');
    await page.getByLabel('Message ICP AI Assistant').fill('Explain cell structure');
    await page.getByRole('button',{name:'Send',exact:true}).click();
    await page.getByText('Biology Cell Notes',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.aiTestRequest.provider),'Gemini');assert.equal(await page.evaluate(()=>window.aiTestRequest.verifiedOnly),false);await page.locator('.icp-ai-provider-badge',{hasText:'Gemini'}).waitFor();
    assert.equal(await page.locator('.icp-ai-answer script').count(),0,'Assistant content must render as text, never executable HTML.');
    assert.equal(await page.getByText('<script>unsafe()</script>',{exact:false}).count(),1);
    assert.equal(await page.locator('.icp-ai-answer strong',{hasText:'organized parts'}).count(),1);assert.equal(await page.locator('.icp-ai-code-block code').count(),1);
    await page.getByText('Verified sources',{exact:false}).waitFor();
    await page.getByText('Quick quiz',{exact:true}).waitFor();
    await page.getByLabel('Nucleus').check();await page.getByRole('button',{name:'Check answer'}).click();await page.getByText('Correct.',{exact:false}).waitFor();
    await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS ICP AI browser: lazy loading, professional modes, multilingual controls, safe rendering, citations, quiz interaction, and mobile layout.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
