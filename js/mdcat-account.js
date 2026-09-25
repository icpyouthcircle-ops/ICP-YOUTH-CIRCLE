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
    await authSDK.setPersistence(auth,authSDK.inMemoryPersistence);
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

async function openMDCATAccount(pending) {
  const {grid}=mdcatStudyPage('Student account','Sign in to save graded attempts and progress to your account. Guest activity and revision remain browser-only.');
  const view=mdcatGradeView;
  document.getElementById('mdcatStatus').textContent='Checking sign-in availability…';
  try {
    const identity=await mdcatLoadIdentity();
    if(view!==mdcatGradeView) return;
    document.getElementById('mdcatStatus').textContent='';
    if(!identity.auth.currentUser) {
      const panel=mdcatElement('div',null,'mdcat-wide');
      panel.appendChild(mdcatElement('p','Your Google account identifies your saved results. This browser will sign out when the page is reloaded. Your submitted results stay in your account.'));
      const signIn=mdcatButton('Continue with Google',async()=>{
        signIn.disabled=true;
        try {
          await identity.sdk.signInWithPopup(identity.auth,new identity.sdk.GoogleAuthProvider());
          if(view===mdcatGradeView) openMDCATAccount(pending);
        } catch(error) {if(view===mdcatGradeView) {mdcatAccountError(error,grid);signIn.disabled=false;}}
      });
      panel.appendChild(signIn);grid.appendChild(panel);return;
    }
    const panel=mdcatElement('div',null,'mdcat-wide');
    panel.appendChild(mdcatElement('p','Signed in as '+(identity.auth.currentUser.email || 'student')));
    panel.append(mdcatButton('My saved results',()=>openMDCATSavedResults()),mdcatButton('My scored progress',()=>openMDCATScoredProgress()),mdcatButton('Sign out',async()=>{await identity.sdk.signOut(identity.auth);openMDCATAccount();}));
    if(pending) panel.appendChild(mdcatButton('Continue to scored practice',()=>openMDCATGraded(pending.mode,pending.contextId)));
    grid.appendChild(panel);
  } catch(error) {if(view===mdcatGradeView) mdcatAccountError(error,grid,()=>openMDCATAccount(pending));}
}

async function openMDCATGraded(mode,contextId) {
  if(!mdcatIdentity || !mdcatIdentity.auth.currentUser) return openMDCATAccount({mode,contextId});
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
  summary.appendChild(mdcatButton('My saved results',()=>openMDCATSavedResults()));grid.appendChild(summary);
  for(const answer of result.answers || []) {
    const card=mdcatElement('article',null,'card mdcat-study-card');
    card.append(mdcatElement('h3',answer.question),mdcatElement('p','Your answer: '+(answer.selectedOption || 'Unanswered')),
      mdcatElement('p','Correct answer: '+answer.correctOption+'. '+answer.options[answer.correctOption]),mdcatElement('p','Marks: '+answer.marksAwarded));
    if(answer.explanation) card.appendChild(mdcatElement('p',answer.explanation));grid.appendChild(card);
  }
}

async function openMDCATSavedResults() {
  const {grid}=mdcatStudyPage('My saved results','Only your signed-in account’s attempts are shown. Open attempts retain their original deadline.');
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
  const {grid}=mdcatStudyPage('My scored progress','Accuracy is based on answered questions in your submitted attempts. It is not a prediction of exam performance.');
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
