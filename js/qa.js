const PORTAL_QA_SUBJECTS=['Biology','Chemistry','Physics','Mathematics','English','Computer Science','Islamic Studies','Pakistan Studies','MDCAT','NUMS','ETEA','Admissions','Scholarships','Career Guidance','Other'];
let portalQAQuestions=[];
let portalQAActiveQuestion=null;

function qaElement(tag,text,className){const node=document.createElement(tag);if(text!=null)node.textContent=String(text);if(className)node.className=className;return node;}
function qaButton(text,action,className='secondary-button'){const button=qaElement('button',text,className);button.type='button';button.onclick=action;return button;}
function qaDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'});}

async function qaPublicRequest(action,params={}){
  const url=new URL(API_BASE_URL);url.searchParams.set('action',action);
  Object.entries(params).forEach(([key,value])=>{if(value!=null&&String(value).trim())url.searchParams.set(key,String(value));});
  const response=await fetchWithPortalTimeout(url,{},30000);if(!response.ok)throw new Error('The Q&A service could not be reached.');
  const result=await response.json();if(!result.success||!Array.isArray(result.data))throw new Error(result.error&&result.error.message||'Unable to load Student Q&A.');
  return result.data;
}

async function qaSignedInRequest(action,body={}){
  await loadPortalMDCATFeatures();
  const identity=await mdcatLoadIdentity();
  if(!identity.auth.currentUser){
    await identity.sdk.signInWithPopup(identity.auth,new identity.sdk.GoogleAuthProvider());
    if(typeof setPortalAccountButton==='function')setPortalAccountButton(true);
  }
  return mdcatPrivateRequest(action,body);
}

function qaVerifiedBadge(role){const badge=qaElement('span','Verified '+(role||'contributor'),'qa-verified');badge.setAttribute('title','This contributor is verified by ICP YOUTH CIRCLE.');return badge;}

function openPortalQA(){
  const content=document.getElementById('dynamicPageContent');
  document.getElementById('dynamicPageTitle').textContent='Student Q&A';
  document.getElementById('dynamicPageDescription').textContent='Ask clear subject questions and learn from moderated student and verified contributor answers.';
  const filters=document.getElementById('resourceFilters');filters.replaceChildren();filters.style.display='none';
  content.className='qa-page';content.replaceChildren();
  const toolbar=qaElement('section',null,'qa-toolbar');
  const search=qaElement('input');search.type='search';search.placeholder='Search questions';search.setAttribute('aria-label','Search questions');
  const subject=qaElement('select');subject.setAttribute('aria-label','Filter by subject');
  subject.appendChild(new Option('All subjects',''));PORTAL_QA_SUBJECTS.forEach(value=>subject.appendChild(new Option(value,value)));
  const ask=qaButton('Ask a question',()=>qaOpenQuestionForm(),'resource-button');
  const refresh=qaButton('Refresh',()=>qaLoadQuestions(true));
  toolbar.append(search,subject,ask,refresh);
  const notice=qaElement('p','Answers from regular student accounts are reviewed before publishing. Copying an existing answer is blocked.','qa-policy');
  const status=qaElement('p','Loading questions…','qa-status');status.id='qaStatus';status.setAttribute('role','status');
  const list=qaElement('div',null,'qa-question-list');list.id='qaQuestionList';
  content.append(toolbar,notice,status,list);
  const filter=()=>qaRenderQuestionList(search.value,subject.value);search.oninput=filter;subject.onchange=filter;
  loadPortalMDCATFeatures().catch(()=>{});
  qaLoadQuestions();
}

async function qaLoadQuestions(force=false){
  const status=document.getElementById('qaStatus');if(status)status.textContent=force?'Refreshing questions…':'Loading questions…';
  try{portalQAQuestions=await qaPublicRequest('qaQuestions');qaRenderQuestionList();if(status)status.textContent=portalQAQuestions.length?portalQAQuestions.length+' published question'+(portalQAQuestions.length===1?'':'s')+'.':'No questions have been published yet.';}
  catch(error){if(status)status.textContent=error.message;}
}

function qaRenderQuestionList(query='',subject=''){
  const list=document.getElementById('qaQuestionList');if(!list)return;list.replaceChildren();
  const needle=String(query||'').trim().toLowerCase();
  const rows=portalQAQuestions.filter(row=>(!subject||row.Subject===subject)&&(!needle||[row.Title,row.Body,row.Tags,row.Subject].join(' ').toLowerCase().includes(needle)));
  if(!rows.length){list.appendChild(qaElement('p','No matching questions found.','qa-empty'));return;}
  rows.forEach(question=>{
    const card=qaElement('article',null,'qa-question-card');
    const meta=qaElement('div',null,'qa-meta');meta.append(qaElement('span',question.Subject,'qa-subject'));
    if(question.AuthorVerified)meta.appendChild(qaVerifiedBadge(question.AuthorRole));
    meta.appendChild(qaElement('span','Asked by '+question.DisplayName+(qaDate(question.CreatedAt)?' · '+qaDate(question.CreatedAt):'')));
    const title=qaElement('h4',question.Title);const body=qaElement('p',question.Body,'qa-question-body');
    const stats=qaElement('p',question.AnswerCount+' published answer'+(question.AnswerCount===1?'':'s')+(question.HasVerifiedAnswer?' · Verified answer available':''),'qa-stats');
    const actions=qaElement('div',null,'qa-actions');
    actions.append(qaButton('View answers',()=>qaOpenQuestion(question),'resource-button'),qaButton('Report question',()=>qaOpenReport('Question',question.ID)));
    card.append(meta,title,body,stats,actions);list.appendChild(card);
  });
}

function qaField(labelText,control){const label=qaElement('label',null,'qa-field');label.append(qaElement('span',labelText),control);return label;}

function qaOpenQuestionForm(){
  const list=document.getElementById('qaQuestionList');list.replaceChildren();
  const form=qaElement('form',null,'qa-form');const title=qaElement('input');title.required=true;title.minLength=10;title.maxLength=180;
  const subject=qaElement('select');subject.required=true;subject.setAttribute('aria-label','Subject');subject.appendChild(new Option('Choose subject',''));PORTAL_QA_SUBJECTS.forEach(value=>subject.appendChild(new Option(value,value)));
  const details=qaElement('textarea');details.required=true;details.minLength=30;details.maxLength=3000;details.rows=7;
  const tags=qaElement('input');tags.maxLength=180;tags.placeholder='Example: vectors, chapter 2';
  const name=qaElement('input');name.maxLength=60;name.placeholder='Public display name';
  const status=qaElement('p','Sign in with Google when you submit.','qa-status');status.setAttribute('role','status');
  const submit=qaButton('Submit question',null,'resource-button');submit.type='submit';const cancel=qaButton('Cancel',()=>qaRenderQuestionList());
  form.append(qaElement('h4','Ask a clear question'),qaField('Subject',subject),qaField('Question title',title),qaField('Details',details),qaField('Tags (optional)',tags),qaField('Display name (optional)',name));
  const actions=qaElement('div',null,'qa-actions');actions.append(submit,cancel);form.append(actions,status);
  form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;status.textContent='Submitting securely…';
    try{const result=await qaSignedInRequest('qaCreateQuestion',{subject:subject.value,title:title.value,body:details.value,tags:tags.value,displayName:name.value});status.textContent='Question published. Reference: '+result.id+'.';await qaLoadQuestions(true);}
    catch(error){status.textContent=error.message||'Unable to submit the question.';submit.disabled=false;}};
  list.appendChild(form);title.focus();
}

async function qaOpenQuestion(question){
  portalQAActiveQuestion=question;const list=document.getElementById('qaQuestionList');list.replaceChildren();
  const back=qaButton('← All questions',()=>qaRenderQuestionList());const header=qaElement('article',null,'qa-question-card qa-question-detail');
  header.append(qaElement('span',question.Subject,'qa-subject'),qaElement('h4',question.Title),qaElement('p',question.Body,'qa-question-body'));
  const answerButton=qaButton('Write an answer',()=>qaOpenAnswerForm(question),'resource-button');const report=qaButton('Report question',()=>qaOpenReport('Question',question.ID));
  const actions=qaElement('div',null,'qa-actions');actions.append(answerButton,report);header.appendChild(actions);
  const status=qaElement('p','Loading answers…','qa-status');status.id='qaAnswerStatus';const answers=qaElement('div',null,'qa-answer-list');answers.id='qaAnswerList';
  list.append(back,header,status,answers);
  try{const rows=await qaPublicRequest('qaAnswers',{questionId:question.ID});qaRenderAnswers(rows);status.textContent=rows.length?rows.length+' published answer'+(rows.length===1?'':'s')+'.':'No published answers yet. Be the first to help.';}
  catch(error){status.textContent=error.message;}
}

function qaRenderAnswers(rows){
  const list=document.getElementById('qaAnswerList');if(!list)return;list.replaceChildren();
  rows.forEach(answer=>{
    const card=qaElement('article',null,'qa-answer-card');const meta=qaElement('div',null,'qa-meta');
    if(answer.IsAccepted)meta.appendChild(qaElement('span','Accepted answer','qa-accepted'));
    if(answer.AuthorVerified)meta.appendChild(qaVerifiedBadge(answer.AuthorRole));
    meta.appendChild(qaElement('span','Answered by '+answer.DisplayName+(qaDate(answer.CreatedAt)?' · '+qaDate(answer.CreatedAt):'')));
    const actions=qaElement('div',null,'qa-actions');const score=qaElement('span',String(answer.VoteScore),'qa-vote-score');
    actions.append(qaButton('Helpful ↑',()=>qaVote(answer,1,score)),score,qaButton('Not helpful ↓',()=>qaVote(answer,-1,score)),qaButton('Report answer',()=>qaOpenReport('Answer',answer.ID)));
    card.append(meta,qaElement('p',answer.Body,'qa-answer-body'));
    if(answer.Sources&&answer.Sources!=='No external source supplied')card.appendChild(qaElement('p','Source: '+answer.Sources,'qa-sources'));
    card.appendChild(actions);list.appendChild(card);
  });
}

function qaOpenAnswerForm(question){
  const list=document.getElementById('qaAnswerList');list.replaceChildren();const form=qaElement('form',null,'qa-form');
  const body=qaElement('textarea');body.required=true;body.minLength=40;body.maxLength=5000;body.rows=8;
  const sources=qaElement('textarea');sources.maxLength=1000;sources.rows=3;sources.placeholder='Official book, page, or trusted link';
  const name=qaElement('input');name.maxLength=60;name.placeholder='Public display name';const status=qaElement('p','Student answers are reviewed before publishing.','qa-status');
  const submit=qaButton('Submit answer',null,'resource-button');submit.type='submit';const cancel=qaButton('Cancel',()=>qaOpenQuestion(question));
  form.append(qaElement('h4','Answer: '+question.Title),qaField('Your explanation',body),qaField('Sources (recommended)',sources),qaField('Display name (optional)',name));const actions=qaElement('div',null,'qa-actions');actions.append(submit,cancel);form.append(actions,status);
  form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;submit.disabled=true;status.textContent='Submitting securely…';try{const result=await qaSignedInRequest('qaCreateAnswer',{questionId:question.ID,body:body.value,sources:sources.value,displayName:name.value});status.textContent=result.status==='Active'?'Verified answer published.':'Answer submitted for review. Reference: '+result.id+'.';}catch(error){status.textContent=error.message;submit.disabled=false;}};
  list.appendChild(form);body.focus();
}

async function qaVote(answer,value,score){try{const result=await qaSignedInRequest('qaVote',{answerId:answer.ID,value:value});score.textContent=String(result.score);}catch(error){document.getElementById('qaAnswerStatus').textContent=error.message;}}

function qaOpenReport(entityType,entityId){
  const target=document.getElementById('qaAnswerList')||document.getElementById('qaQuestionList');if(!target)return;
  const form=qaElement('form',null,'qa-form qa-report-form');const reason=qaElement('select');['Incorrect information','Copied content','Spam or advertising','Abusive content','Other'].forEach(value=>reason.appendChild(new Option(value,value)));
  const details=qaElement('textarea');details.rows=3;details.maxLength=500;const status=qaElement('p','Reports are private and reviewed by administrators.','qa-status');const submit=qaButton('Send report',null,'resource-button');submit.type='submit';
  form.append(qaElement('h4','Report content'),qaField('Reason',reason),qaField('Additional details (optional)',details),submit,status);
  form.onsubmit=async event=>{event.preventDefault();submit.disabled=true;try{const result=await qaSignedInRequest('qaReport',{entityType,entityId,reason:reason.value,details:details.value});status.textContent='Report received. Reference: '+result.id+'.';}catch(error){status.textContent=error.message;submit.disabled=false;}};
  target.prepend(form);form.scrollIntoView({behavior:'smooth',block:'center'});
}
