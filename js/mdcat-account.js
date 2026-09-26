// Firebase web configuration is a public client identifier; scoring secrets remain server-side.
const MDCAT_FIREBASE_WEB_CONFIG = Object.freeze({
  apiKey:'AIzaSyA5tQEc0yf544hQ0buVmaNG32rStH0UYHQ',
  authDomain:'icp-youth-circle-1ce3d.firebaseapp.com',
  projectId:'icp-youth-circle-1ce3d',
  appId:'1:116078667555:web:7707153d9667bf8fd88e96'
});
let mdcatIdentity = null;
let mdcatIdentityLoading = null;
let mdcatGradeTimer = null;
let mdcatGradeView = 0;
let portalDashboardCache = null;
let portalDashboardPromise = null;

function resetMDCATGrading() {
  clearInterval(mdcatGradeTimer);
  mdcatGradeTimer = null;
  mdcatGradeView++;
}

async function mdcatLoadIdentity() {
  if (mdcatIdentity) return mdcatIdentity;
  if (mdcatIdentityLoading) return mdcatIdentityLoading;
  mdcatIdentityLoading = (async () => {
    const [appSDK,authSDK]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
    ]);
    const app=appSDK.initializeApp(MDCAT_FIREBASE_WEB_CONFIG,'icp-mdcat');
    const auth=authSDK.getAuth(app);
    await authSDK.setPersistence(auth,authSDK.browserSessionPersistence);
    mdcatIdentity={auth,sdk:authSDK};
    return mdcatIdentity;
  })();
  try {return await mdcatIdentityLoading;}
  finally {mdcatIdentityLoading=null;}
}

async function mdcatPrivateRequest(action,body={}) {
  const identity=await mdcatLoadIdentity();
  if(!identity.auth.currentUser) throw new Error('Please sign in to continue.');
  const user=identity.auth.currentUser;
  const idToken=await user.getIdToken();
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),60000);
  try {
    const response=await fetch(API_BASE_URL,{
      method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},
      body:JSON.stringify({...body,action,idToken}),signal:controller.signal,redirect:'follow'
    });
    if(!response.ok) throw new Error('The server could not complete this request.');
    const result=await response.json();
    if(identity.auth.currentUser!==user) throw new Error('The signed-in account changed.');
    if(!result.success) {
      const error=new Error(result.error && result.error.message || 'The request failed.');
      error.code=result.error && result.error.code;
      throw error;
    }
    return result.data;
  } catch(error) {
    if(error.name==='AbortError') throw new Error('The server response was delayed. Retry the same request; it will not duplicate your attempt.');
    throw error;
  } finally {clearTimeout(timeout);}
}

function mdcatAccountError(error,grid,retry) {
  document.getElementById('mdcatStatus').textContent=error.message || 'Unable to complete the request.';
  if(retry) grid.appendChild(mdcatButton('Retry',retry));
}

function showPortalAccountShell() {
  document.getElementById('mdcatHub').classList.add('portal-account-view');
}

function portalLocalStudentData() {
  const empty={attempts:[],revision:[],plan:[]};
  try {
    const stored=JSON.parse(localStorage.getItem(MDCAT_LOCAL_KEY) || 'null');
    return stored && ['attempts','revision','plan'].every(key=>Array.isArray(stored[key])) ? stored : empty;
  } catch (_) { return empty; }
}

function portalStudyPlanNotifications(data) {
  if(!data || !data.notificationPreferences || data.notificationPreferences.StudyPlanReminders===false)return [];
  const read=new Set((data.readNotificationIds || []).map(String));
  const today=new Date();today.setHours(0,0,0,0);
  const limit=today.getTime()+7*86400000;
  return portalLocalStudentData().plan.filter(task=>!task.done && task.date).map(task=>{
    const due=new Date(task.date+'T00:00:00');
    if(Number.isNaN(due.getTime()) || due.getTime()>limit)return null;
    const overdue=due.getTime()<today.getTime();
    const ID='PLAN-'+String(task.id || '').replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);
    return {ID,Title:overdue?'Study task overdue':'Study task due soon',Message:String(task.title || 'Study task'),Category:'Study Plan',Priority:overdue?'Important':'Normal',IsPinned:overdue,ReminderType:'Study Plan',ReminderAt:task.date,PublishAt:task.date,IsRead:read.has(ID),LocalTask:true};
  }).filter(Boolean);
}

function portalAllNotifications(data) {
  return [...portalStudyPlanNotifications(data),...(data.notifications || [])].sort((a,b)=>Number(Boolean(b.IsPinned))-Number(Boolean(a.IsPinned)) || new Date(b.PublishAt || 0)-new Date(a.PublishAt || 0));
}

function setPortalNotificationBadge(count) {
  const button=document.getElementById('portalAccountButton');
  if(!button)return;
  let badge=button.querySelector('.nav-notification-badge');
  if(!badge){badge=document.createElement('span');badge.className='nav-notification-badge';button.appendChild(badge);}
  const value=Math.max(0,Number(count || 0));
  badge.textContent=value>99?'99+':String(value);badge.hidden=!value;
  button.setAttribute('aria-label',value?'My account, '+value+' unread notification'+(value===1?'':'s'):'My account');
}

async function loadStudentDashboard(force=false) {
  if(!force && portalDashboardCache && Date.now()-portalDashboardCache.savedAt<60000)return portalDashboardCache.data;
  if(!force && portalDashboardPromise)return portalDashboardPromise;
  portalDashboardPromise=mdcatPrivateRequest('studentDashboard').then(data=>{
    portalDashboardCache={savedAt:Date.now(),data};
    setPortalNotificationBadge(portalAllNotifications(data).filter(row=>!row.IsRead).length);
    return data;
  }).finally(()=>{portalDashboardPromise=null;});
  return portalDashboardPromise;
}

async function initializePortalAccountState() {
  try {
    const identity=await mdcatLoadIdentity();
    const signedIn=Boolean(identity.auth.currentUser);
    if(typeof setPortalAccountButton==='function')setPortalAccountButton(signedIn);
    if(signedIn)await loadStudentDashboard();else setPortalNotificationBadge(0);
  } catch (_) {}
}

function dashboardSection(title,description,className='') {
  const section=mdcatElement('section',null,'student-dashboard-section '+className);
  section.append(mdcatElement('h3',title),mdcatElement('p',description,'student-dashboard-section-copy'));
  return section;
}

function dashboardEmpty(text) { return mdcatElement('p',text,'student-dashboard-empty'); }

function renderStudentDashboard(grid,data,user,pending) {
  const local=portalLocalStudentData();
  const bookmarks=typeof getPortalBookmarks==='function'?getPortalBookmarks():[];
  const upcoming=local.plan.filter(task=>!task.done).sort((a,b)=>String(a.date || '9999').localeCompare(String(b.date || '9999'))).slice(0,5);
  const notifications=portalAllNotifications(data);const unread=notifications.filter(row=>!row.IsRead);
  const requests=[...(data.submissions || []).map(row=>({...row,requestTitle:row.Title || 'Resource submission'})),...(data.helpRequests || []).map(row=>({...row,requestTitle:row.Subject || 'Help request'}))]
    .sort((a,b)=>new Date(b.UpdatedAt || b.SubmittedAt || 0)-new Date(a.UpdatedAt || a.SubmittedAt || 0));
  const welcome=mdcatElement('section',null,'mdcat-wide student-welcome-card');
  const name=user.displayName || (user.email ? user.email.split('@')[0] : 'Student');
  welcome.append(mdcatElement('span','STUDENT ACCOUNT','student-eyebrow'),mdcatElement('h3','Welcome, '+name),mdcatElement('p','Here is your latest study activity across ICP YOUTH CIRCLE.'));
  const actions=mdcatElement('div',null,'student-quick-actions');
  actions.append(mdcatButton('My tests',()=>openUserTests()),mdcatButton('Notifications',()=>openUserNotifications()),mdcatButton('Saved resources',()=>openStudentBookmarks()),mdcatButton('My requests',()=>openStudentRequests()),mdcatButton('Sign out',async()=>{await mdcatIdentity.sdk.signOut(mdcatIdentity.auth);portalDashboardCache=null;setPortalNotificationBadge(0);if(typeof setPortalAccountButton==='function')setPortalAccountButton(false);openUserAccount();}));
  if(pending)actions.appendChild(mdcatButton('Continue to scored practice',()=>openMDCATGraded(pending.mode,pending.contextId)));
  welcome.appendChild(actions);grid.appendChild(welcome);
  const metrics=mdcatElement('section',null,'mdcat-wide student-metric-grid');
  [['Questions attempted',data.questionsAttempted || 0,'Scored questions'],['Overall accuracy',(data.overallAccuracy || 0)+'%','Across scored answers'],['Unread notifications',unread.length,'Account synced'],['Saved resources',bookmarks.length,'Saved in this browser']].forEach(([label,value,note])=>{
    const card=mdcatElement('article',null,'student-metric-card');card.append(mdcatElement('span',label),mdcatElement('strong',String(value)),mdcatElement('small',note));metrics.appendChild(card);
  });grid.appendChild(metrics);
  const layout=mdcatElement('div',null,'mdcat-wide student-dashboard-grid');
  const tasks=dashboardSection('Upcoming study tasks','Your next browser-saved study plan items.');
  if(!upcoming.length)tasks.appendChild(dashboardEmpty('No upcoming tasks. Add one from the MDCAT study plan.'));
  upcoming.forEach(task=>{const row=mdcatElement('div',null,'student-list-row');row.append(mdcatElement('strong',task.title),mdcatElement('span',task.date?studentRequestDate(task.date):'No target date'));tasks.appendChild(row);});tasks.appendChild(mdcatButton('Open study plan',()=>openMDCATLocal('plan')));layout.appendChild(tasks);
  const noticeSection=dashboardSection('Unread notifications','Important updates and reminders.');
  if(!unread.length)noticeSection.appendChild(dashboardEmpty('You are all caught up.'));
  unread.slice(0,4).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',(row.IsPinned?'Pinned · ':'')+row.Title),mdcatElement('span',row.Category || 'General'));noticeSection.appendChild(item);});noticeSection.appendChild(mdcatButton('Open notification centre',()=>openUserNotifications()));layout.appendChild(noticeSection);
  const results=dashboardSection('Recent test results','Your latest submitted scored attempts.');
  if(!(data.recentResults || []).length)results.appendChild(dashboardEmpty('No scored test results yet.'));
  (data.recentResults || []).slice(0,4).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',row.title),mdcatElement('span',row.percentage+'% · '+studentRequestDate(row.submittedAt)));results.appendChild(item);});results.appendChild(mdcatButton('View all test results',()=>openMDCATSavedResults()));layout.appendChild(results);
  const accuracy=dashboardSection('Accuracy by subject','Based on submitted, scored questions.');
  if(!(data.accuracyBySubject || []).length)accuracy.appendChild(dashboardEmpty('Subject accuracy will appear after a scored test.'));
  (data.accuracyBySubject || []).slice(0,6).forEach(row=>{const item=mdcatElement('div',null,'student-progress-row');item.append(mdcatElement('div',row.subjectName+' · '+row.questionsAttempted+' questions'),mdcatElement('strong',row.accuracy+'%'));const bar=mdcatElement('span',null,'student-progress-track');const fill=mdcatElement('span',null,'student-progress-fill');fill.style.width=Math.max(0,Math.min(100,row.accuracy))+'%';bar.appendChild(fill);item.appendChild(bar);accuracy.appendChild(item);});layout.appendChild(accuracy);
  const weak=dashboardSection('Weak topics','Topics with the lowest current accuracy.');
  if(!(data.weakTopics || []).length)weak.appendChild(dashboardEmpty('Weak-topic guidance will appear after scored practice.'));
  (data.weakTopics || []).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',row.topicName),mdcatElement('span',(row.subjectName?row.subjectName+' · ':'')+row.accuracy+'% accuracy'));weak.appendChild(item);});layout.appendChild(weak);
  const saved=dashboardSection('Saved resources','Your latest browser bookmarks.');
  if(!bookmarks.length)saved.appendChild(dashboardEmpty('No saved resources yet.'));
  bookmarks.slice(0,4).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',row.title),mdcatElement('span',[row.subject,row.category].filter(Boolean).join(' · ') || 'Resource'));saved.appendChild(item);});saved.appendChild(mdcatButton('View saved resources',()=>openStudentBookmarks()));layout.appendChild(saved);
  const submitted=dashboardSection('Submitted requests','Latest resource and help-desk submissions.');
  if(!requests.length)submitted.appendChild(dashboardEmpty('No submitted requests found for this email.'));
  requests.slice(0,4).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',row.requestTitle),mdcatElement('span',(row.Status || 'Pending Review')+' · '+studentRequestDate(row.SubmittedAt)));submitted.appendChild(item);});submitted.appendChild(mdcatButton('Track all requests',()=>openStudentRequests()));layout.appendChild(submitted);
  const revision=dashboardSection('Revision reminders','Questions saved for another review.');
  if(!local.revision.length)revision.appendChild(dashboardEmpty('No revision questions saved yet.'));
  local.revision.slice(0,3).forEach(row=>{const item=mdcatElement('div',null,'student-list-row');item.append(mdcatElement('strong',row.Question || 'Saved question'),mdcatElement('span','Ready to practise'));revision.appendChild(item);});revision.appendChild(mdcatButton('Open revision',()=>openMDCATLocal('revision')));layout.appendChild(revision);
  grid.appendChild(layout);
}

async function openUserAccount(pending) {
  const {grid}=mdcatStudyPage('My account','Use one Google account for your portal activity, resources, requests and every supported test.');
  showPortalAccountShell();
  const view=mdcatGradeView;
  document.getElementById('mdcatStatus').textContent='Checking sign-in availability…';
  try {
    const identity=await mdcatLoadIdentity();
    if(view!==mdcatGradeView) return;
    if (typeof setPortalAccountButton === 'function') setPortalAccountButton(Boolean(identity.auth.currentUser));
    document.getElementById('mdcatStatus').textContent='';
    if(!identity.auth.currentUser) {
      const panel=mdcatElement('div',null,'mdcat-wide');
      panel.appendChild(mdcatElement('p','Your Google account identifies your saved results and requests. You stay signed in during this browser session.'));
      const signIn=mdcatButton('Continue with Google',async()=>{
        signIn.disabled=true;
        try {
          await identity.sdk.signInWithPopup(identity.auth,new identity.sdk.GoogleAuthProvider());
          if(view===mdcatGradeView) openUserAccount(pending);
        } catch(error) {if(view===mdcatGradeView) {mdcatAccountError(error,grid);signIn.disabled=false;}}
      });
      panel.appendChild(signIn);grid.appendChild(panel);return;
    }
    document.getElementById('mdcatHubTitle').textContent='My dashboard';
    document.getElementById('mdcatHubDescription').textContent='Your study overview, test performance, saved items, requests and notifications in one place.';
    document.getElementById('mdcatStatus').textContent='Loading your dashboard…';
    const data=await loadStudentDashboard(true);
    if(view!==mdcatGradeView)return;
    document.getElementById('mdcatStatus').textContent='';
    renderStudentDashboard(grid,data,identity.auth.currentUser,pending);
  } catch(error) {if(view===mdcatGradeView) mdcatAccountError(error,grid,()=>openUserAccount(pending));}
}

// Retained for existing scored-test links while the visible portal uses one universal account.
function openMDCATAccount(pending) { return openUserAccount(pending); }

function renderUserTestCatalog(grid,rows) {
  if(!rows.length){grid.appendChild(mdcatElement('p','No tests are published yet.','mdcat-wide'));return;}
  rows.forEach(row=>{
      const card=mdcatElement('article',null,'card mdcat-study-card');
      card.appendChild(mdcatElement('h3',row.Name));
      if(row.TestType)card.appendChild(mdcatElement('p',row.TestType));
      if(row.Description)card.appendChild(mdcatElement('p',row.Description));
      const isMDCAT=String(row.Engine || row.Slug).toLowerCase()==='mdcat';
      if(isMDCAT){
        card.append(mdcatButton('Open MDCAT',()=>openMDCATHub()),mdcatButton('My test results',()=>openMDCATSavedResults()),mdcatButton('My test progress',()=>openMDCATScoredProgress()));
      }else if(row.Route || row.Slug){
        card.appendChild(mdcatButton('Open test information',()=>handleNavigation({Slug:row.Route || row.Slug,Label:row.Name})));
      }
      grid.appendChild(card);
  });
}

async function openUserTests() {
  const {grid,controller}=mdcatStudyPage('My tests','Results and progress from every supported test use this same account.');
  showPortalAccountShell();
  document.getElementById('mdcatStatus').textContent='Loading available tests…';
  try {
    const rows=await mdcatPublicRequest('testCatalog',{},controller);
    if(mdcatRequest!==controller)return;
    document.getElementById('mdcatStatus').textContent='';
    renderUserTestCatalog(grid,rows);
  }catch(error){
    if(mdcatRequest!==controller)return;
    document.getElementById('mdcatStatus').textContent='Showing the currently available test.';
    renderUserTestCatalog(grid,[{ID:'TST-MDCAT',Name:'MDCAT',Slug:'mdcat',Description:'Medical and Dental College Admission Test preparation and scored practice.',TestType:'Entry Test',Route:'mdcat',Engine:'MDCAT'}]);
  }
}

async function markStudentNotificationsRead(ids,category) {
  await mdcatPrivateRequest('studentMarkNotificationsRead',{notificationIds:ids});
  if(portalDashboardCache){
    const data=portalDashboardCache.data;const read=new Set([...(data.readNotificationIds || []),...ids].map(String));data.readNotificationIds=[...read];
    (data.notifications || []).forEach(row=>{if(read.has(String(row.ID)))row.IsRead=true;});portalDashboardCache.savedAt=Date.now();
  }
  return openUserNotifications(category,true);
}

function notificationCategory(row) {
  if(row.ReminderType==='Deadline')return 'Deadline';
  if(row.ReminderType==='Study Plan' || row.Category==='Study Plan')return 'Study Plan';
  if(row.TestID || String(row.Category).toLowerCase()==='test')return 'Test';
  return row.Category || 'General';
}

function renderNotificationPreferences(grid,data) {
  const details=mdcatElement('details',null,'mdcat-wide notification-preferences');
  details.appendChild(mdcatElement('summary','Notification preferences'));
  const form=mdcatElement('form',null,'notification-preference-form');
  const options=[['GeneralUpdates','General portal updates'],['TestNotices','Test-specific notices'],['DeadlineReminders','Deadline reminders'],['StudyPlanReminders','Study-plan reminders']];
  options.forEach(([key,labelText])=>{const label=mdcatElement('label');const input=document.createElement('input');input.type='checkbox';input.name=key;input.checked=data.notificationPreferences ? data.notificationPreferences[key]!==false : true;label.append(input,document.createTextNode(' '+labelText));form.appendChild(label);});
  const save=mdcatElement('button','Save preferences','resource-button');save.type='submit';const status=mdcatElement('p','');status.setAttribute('role','status');
  form.append(save,status);form.onsubmit=async event=>{event.preventDefault();save.disabled=true;status.textContent='Saving…';try{const preferences=Object.fromEntries(options.map(([key])=>[key,form.elements[key].checked]));await mdcatPrivateRequest('studentSaveNotificationPreferences',{preferences});portalDashboardCache=null;status.textContent='Preferences saved. They will apply the next time this centre loads.';}catch(error){status.textContent=error.message || 'Unable to save preferences.';save.disabled=false;}};
  details.appendChild(form);grid.appendChild(details);
}

async function openUserNotifications(category='All',force=false) {
  const {grid}=mdcatStudyPage('Notification centre','Account-synced updates, test notices, deadlines and study reminders.');
  showPortalAccountShell();
  const view=mdcatGradeView;
  document.getElementById('mdcatStatus').textContent='Loading notifications…';
  try {
    const data=await loadStudentDashboard(force);
    if(view!==mdcatGradeView)return;
    const allRows=portalAllNotifications(data);
    document.getElementById('mdcatStatus').textContent='';
    const controls=mdcatElement('div',null,'mdcat-wide notification-toolbar');
    const label=mdcatElement('label','Category');const select=document.createElement('select');
    ['All',...new Set(allRows.map(notificationCategory))].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;option.selected=value===category;select.appendChild(option);});
    select.onchange=()=>openUserNotifications(select.value);label.appendChild(select);controls.appendChild(label);
    const unread=allRows.filter(row=>!row.IsRead);
    if(unread.length){const markAll=mdcatButton('Mark all as read',async()=>{markAll.disabled=true;try{await markStudentNotificationsRead(unread.map(row=>row.ID),category);}catch(error){document.getElementById('mdcatStatus').textContent=error.message;markAll.disabled=false;}});controls.appendChild(markAll);}
    controls.appendChild(mdcatButton('Back to dashboard',()=>openUserAccount()));grid.appendChild(controls);
    const rows=category==='All'?allRows:allRows.filter(row=>notificationCategory(row)===category);
    if(!rows.length)grid.appendChild(mdcatElement('p','No current notifications in this category.','mdcat-wide student-dashboard-empty'));
    rows.forEach(row=>{
      const card=mdcatElement('article',null,'card mdcat-study-card notification-card '+(!row.IsRead?'is-unread ':'')+(row.IsPinned?'is-pinned':''));
      const meta=mdcatElement('div',null,'notification-meta');meta.append(mdcatElement('span',notificationCategory(row),'notification-category'));
      if(row.TestID)meta.appendChild(mdcatElement('span','Test notice','notification-category'));
      if(row.IsPinned)meta.appendChild(mdcatElement('span','Pinned','notification-pinned'));card.appendChild(meta);
      card.appendChild(mdcatElement('h3',(row.IsRead?'':'New — ')+row.Title));
      const date=row.ReminderAt || row.PublishAt;if(date)card.appendChild(mdcatElement('p',(row.ReminderAt?'Reminder: ':'')+studentRequestDate(date),'notification-date'));
      if(row.Message)card.appendChild(mdcatElement('p',row.Message));
      const raw=String(row.LinkURL || '').trim();
      if(/^#[a-z0-9-]+$/i.test(raw))card.appendChild(mdcatButton('Open',()=>handleNavigation({Slug:raw.slice(1),Label:row.Title})));
      else {
        const url=typeof safePortalURL==='function'?safePortalURL(raw):'';
        if(url){const link=mdcatElement('a','Open link','resource-button');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.appendChild(link);}
      }
      if(!row.IsRead){const mark=mdcatButton('Mark as read',async()=>{mark.disabled=true;try{await markStudentNotificationsRead([row.ID],category);}catch(error){document.getElementById('mdcatStatus').textContent=error.message;mark.disabled=false;}});card.appendChild(mark);}
      grid.appendChild(card);
    });
    renderNotificationPreferences(grid,data);
  }catch(error){if(view===mdcatGradeView)mdcatAccountError(error,grid,()=>openUserNotifications(category,true));}
}

function openStudentBookmarks() {
  const {grid}=mdcatStudyPage('My bookmarks','Resources saved in this browser.');
  showPortalAccountShell();
  const rows=typeof getPortalBookmarks==='function' ? getPortalBookmarks() : [];
  if (!rows.length) {grid.appendChild(mdcatElement('p','No resources saved yet. Open Notes, Past Papers or Study Resources and choose Save resource.','mdcat-wide'));return;}
  rows.forEach(row=>{
    const card=mdcatElement('article',null,'mdcat-subject-card');
    card.appendChild(mdcatElement('h3',row.title));
    const details=[row.category,row.subject,row.level].filter(Boolean).join(' • ');
    if(details)card.appendChild(mdcatElement('p',details));
    const url=typeof safePortalURL==='function' ? safePortalURL(row.fileURL) : '';
    if(url){const link=mdcatElement('a','Open resource','resource-button');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.appendChild(link);}
    const remove=mdcatButton('Remove bookmark',()=>{
      const kept=getPortalBookmarks().filter(item=>item.key!==row.key);
      try {localStorage.setItem(PORTAL_BOOKMARKS_KEY,JSON.stringify(kept));} catch (_) {}
      openStudentBookmarks();
    });
    card.appendChild(remove);grid.appendChild(card);
  });
}

function studentRequestDate(value) {
  if (!value) return '';
  const date=new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-PK',{timeZone:'Asia/Karachi'});
}

function renderStudentRequestSection(grid,title,rows,type) {
  const section=mdcatElement('section',null,'mdcat-wide student-request-section');
  section.appendChild(mdcatElement('h3',title));
  if (!rows.length) section.appendChild(mdcatElement('p','No '+title.toLowerCase()+' found for this Google account.'));
  rows.forEach(row=>{
    const card=mdcatElement('article',null,'mdcat-subject-card');
    card.appendChild(mdcatElement('h4',type==='resource'?(row.Title || 'Resource submission'):(row.Subject || 'Help request')));
    const details=[row.ID,type==='resource'?row.ResourceType:row.RequestType,row.Status,studentRequestDate(row.SubmittedAt)].filter(Boolean).join(' • ');
    card.appendChild(mdcatElement('p',details));
    if(row.Response)card.appendChild(mdcatElement('p','Administrator response: '+row.Response));
    section.appendChild(card);
  });
  grid.appendChild(section);
}

async function openStudentRequests() {
  const {grid}=mdcatStudyPage('My requests','Track resource submissions and help-desk requests sent with your signed-in Google email.');
  showPortalAccountShell();
  const view=mdcatGradeView;
  document.getElementById('mdcatStatus').textContent='Loading your requests…';
  try {
    const data=await mdcatPrivateRequest('studentDashboard');
    if(view!==mdcatGradeView)return;
    document.getElementById('mdcatStatus').textContent='';
    renderStudentRequestSection(grid,'Resource submissions',data.submissions || [],'resource');
    renderStudentRequestSection(grid,'Help-desk requests',data.helpRequests || [],'help');
  } catch(error) {if(view===mdcatGradeView) mdcatAccountError(error,grid,()=>openStudentRequests());}
}

async function openMDCATGraded(mode,contextId) {
  if(!mdcatIdentity || !mdcatIdentity.auth.currentUser) return openPortalAccount({mode,contextId});
  const {grid}=mdcatStudyPage('Scored practice','Your score is calculated on the server and saved to your signed-in account.');
  const view=mdcatGradeView;
  const panel=mdcatElement('div',null,'mdcat-wide');
  panel.appendChild(mdcatElement('p','Start when ready. The server timer starts immediately. Leaving discards unsubmitted selections; the timer continues. Topic practice has a 120-minute limit. Timed sets use their configured limit, with a 30-second network allowance for submission. This is practice, not a proctored examination.'));
  let requestId=crypto.randomUUID();
  const start=mdcatButton('Start scored attempt',async()=>{
    start.disabled=true;
    document.getElementById('mdcatStatus').textContent='Starting your attempt…';
    try {
      const attempt=await mdcatPrivateRequest('mdcatStart',{mode,contextId,requestId});
      if(view!==mdcatGradeView) return;
      panel.remove();document.getElementById('mdcatStatus').textContent='';
      mdcatRenderGraded(attempt,grid,view);
    } catch(error) {if(view===mdcatGradeView) {
      if(error.code==='SETUP_REQUIRED') requestId=crypto.randomUUID();
      start.disabled=false;start.textContent='Retry starting this attempt';mdcatAccountError(error,grid);
    }}
  });
  panel.appendChild(start);grid.appendChild(panel);
}

function mdcatRenderGraded(attempt,grid,view) {
  if(attempt.status==='Submitted') return mdcatRenderScore(attempt,grid);
  if(!attempt.attemptId || !Array.isArray(attempt.questions) || !attempt.questions.length) throw new Error('Invalid attempt response.');
  const remaining=new Date(attempt.deadline).getTime()-new Date(attempt.serverNow).getTime();
  if(!Number.isFinite(remaining)) throw new Error('Invalid attempt deadline.');
  const deadline=Date.now()+Math.max(0,remaining);
  const answers={};
  let frozen=false, submitted=false;
  const panel=mdcatElement('div',null,'mdcat-wide');
  panel.appendChild(mdcatElement('h3',attempt.title));
  const timer=mdcatElement('p','','mdcat-clock');timer.setAttribute('role','timer');panel.appendChild(timer);
  const form=document.createElement('form');
  attempt.questions.forEach((question,index)=>{
    const field=mdcatElement('fieldset',null,'mdcat-question');
    field.appendChild(mdcatElement('legend',(index+1)+'. '+question.Question));
    const options=attempt.randomizeOptions ? mdcatShuffle(['A','B','C','D']) : ['A','B','C','D'];
    options.forEach(key=>{
      const label=mdcatElement('label',null,'mdcat-option');
      const input=document.createElement('input');input.type='radio';input.name='graded-'+index;input.value=key;
      input.onchange=()=>{
        if(frozen || Date.now()>=deadline) {
          input.checked=false;
          if(answers[question.ID]) field.querySelector('input[value="'+answers[question.ID]+'"]').checked=true;
          if(!frozen) submit();
          return;
        }
        answers[question.ID]=key;
      };
      label.append(input,mdcatElement('span',key+'. '+question['Option'+key]));field.appendChild(label);
    });form.appendChild(field);
  });
  const button=mdcatElement('button','Submit for score','resource-button');button.type='submit';form.appendChild(button);
  const submit=async()=>{
    if(submitted || view!==mdcatGradeView) return;
    frozen=true;submitted=true;clearInterval(mdcatGradeTimer);mdcatGradeTimer=null;
    form.querySelectorAll('input').forEach(input=>{input.disabled=true;});button.disabled=true;
    document.getElementById('mdcatStatus').textContent='Saving and grading your answers…';
    try {
      const result=await mdcatPrivateRequest('mdcatSubmit',{attemptId:attempt.attemptId,answers:Object.entries(answers).map(([questionId,option])=>({questionId,option}))});
      if(view!==mdcatGradeView) return;
      document.getElementById('mdcatStatus').textContent='Score saved to your account.';
      panel.remove();mdcatRenderScore(result,grid);
    } catch(error) {
      if(view!==mdcatGradeView) return;
      submitted=false;button.disabled=false;button.textContent='Retry saving the same answers';
      mdcatAccountError(error,grid);
    }
  };
  form.onsubmit=event=>{event.preventDefault();submit();};panel.appendChild(form);grid.appendChild(panel);
  const tick=()=>{
    const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    timer.textContent='Time remaining: '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
    if(seconds===0) submit();
  };
  mdcatGradeTimer=setInterval(tick,250);tick();
}

function mdcatRenderScore(result,grid) {
  const summary=mdcatElement('div',null,'mdcat-wide mdcat-result');
  summary.append(mdcatElement('h3',result.title),mdcatElement('p','Score: '+result.score+' / '+result.maxScore+' ('+result.percentage+'%)'),
    mdcatElement('p',result.correct+' correct · '+result.wrong+' incorrect · '+result.unanswered+' unanswered'),
    mdcatElement('p','Time: '+result.seconds+' seconds. Saved to your signed-in account.'));
  if(result.passed!==null) summary.appendChild(mdcatElement('p',result.passed ? 'Passed the configured practice threshold.' : 'Below the configured practice threshold.'));
  summary.appendChild(mdcatButton('My test results',()=>openMDCATSavedResults()));grid.appendChild(summary);
  for(const answer of result.answers || []) {
    const card=mdcatElement('article',null,'card mdcat-study-card');
    card.append(mdcatElement('h3',answer.question),mdcatElement('p','Your answer: '+(answer.selectedOption || 'Unanswered')),
      mdcatElement('p','Correct answer: '+answer.correctOption+'. '+answer.options[answer.correctOption]),mdcatElement('p','Marks: '+answer.marksAwarded));
    if(answer.explanation) card.appendChild(mdcatElement('p',answer.explanation));grid.appendChild(card);
  }
}

async function openMDCATSavedResults() {
  const {grid}=mdcatStudyPage('My test results','Your MDCAT attempts are shown here. All supported tests will use this same signed-in account. Open attempts retain their original deadline.');
  showPortalAccountShell();
  const view=mdcatGradeView;
  try {
    const rows=await mdcatPrivateRequest('mdcatMyResults');
    if(view!==mdcatGradeView) return;
    if(!rows.length) grid.appendChild(mdcatElement('p','No scored attempts yet.'));
    for(const row of rows) {
      const card=mdcatElement('article',null,'card mdcat-study-card');
      card.append(mdcatElement('h3',row.title),mdcatElement('p',row.status+' · '+mdcatCalendarDate(row.startedAt)));
      card.appendChild(mdcatButton(row.status==='Submitted'?'View score':'Resume or recover attempt',async()=>{
        const {grid:detail}=mdcatStudyPage(row.title,'Your saved attempt.');const detailView=mdcatGradeView;
        const load=async()=>{
          try {const data=await mdcatPrivateRequest(row.status==='Submitted'?'mdcatResult':'mdcatResume',{attemptId:row.attemptId});if(detailView===mdcatGradeView) mdcatRenderGraded(data,detail,detailView);}
          catch(error){if(detailView===mdcatGradeView)mdcatAccountError(error,detail,load);}
        };await load();
      }));grid.appendChild(card);
    }
  } catch(error){if(view===mdcatGradeView)mdcatAccountError(error,grid,()=>openMDCATSavedResults());}
}

async function openMDCATScoredProgress() {
  const {grid}=mdcatStudyPage('My test progress','MDCAT accuracy is based on answered questions in your submitted attempts. It is not a prediction of exam performance.');
  showPortalAccountShell();
  const view=mdcatGradeView;
  try {
    const rows=await mdcatPrivateRequest('mdcatMyProgress');
    if(view!==mdcatGradeView)return;
    if(!rows.length)grid.appendChild(mdcatElement('p','No answered, scored questions yet.'));
    for(const row of rows){
      const card=mdcatElement('article',null,'card mdcat-study-card');
      card.append(mdcatElement('h3',row.TopicName || 'Topic progress'),mdcatElement('p',row.SubjectName || ''),mdcatElement('p',row.CorrectAnswers+' correct / '+row.QuestionsAttempted+' answered · '+row.AccuracyPercentage+'% accuracy'));
      grid.appendChild(card);
    }
  }catch(error){if(view===mdcatGradeView)mdcatAccountError(error,grid,()=>openMDCATScoredProgress());}
}
