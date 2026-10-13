const ICP_AI_DEFAULTS={
  enabled:false,
  providers:['Auto','OpenAI','Gemini'],
  availableProviders:[],
  modes:['Explain','Summarize','Solve','Quiz Me','Check My Answer','Translate','Find Resources','Study Plan'],
  languages:['English','Urdu','Pashto'],
  dailyLimit:30
};

const icpAssistantState={
  config:{...ICP_AI_DEFAULTS},
  conversationId:'',
  messages:[],
  conversations:[],
  busy:false,
  historyOpen:false,
  recognition:null
};

function aiEl(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}

function aiIconButton(label,symbol,handler){
  const button=aiEl('button','icp-ai-icon-button',symbol);
  button.type='button';button.setAttribute('aria-label',label);button.title=label;
  if(handler)button.onclick=handler;
  return button;
}

function aiRequestId(){
  if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
  return 'request-'+Date.now()+'-'+Math.random().toString(36).slice(2,18);
}

async function aiPublicConfig(){
  try{
    const response=await fetch(API_BASE_URL+'?action=aiAssistantConfig',{cache:'no-store',redirect:'follow'});
    if(!response.ok)throw new Error('Configuration request failed.');
    const result=await response.json();
    return result&&result.success?{...ICP_AI_DEFAULTS,...result.data}:{...ICP_AI_DEFAULTS};
  }catch(_){return {...ICP_AI_DEFAULTS};}
}

async function aiEnsureIdentity(interactive=false){
  await loadPortalMDCATFeatures();
  const identity=await mdcatLoadIdentity();
  if(!identity.auth.currentUser&&interactive){
    await identity.sdk.signInWithPopup(identity.auth,new identity.sdk.GoogleAuthProvider());
    if(typeof setPortalAccountButton==='function')setPortalAccountButton(true);
  }
  return identity;
}

function aiSetStatus(message,type=''){
  const status=document.getElementById('icpAiStatus');
  if(!status)return;
  status.textContent=message||'';status.className='icp-ai-status'+(type?' is-'+type:'');
}

function aiSetBusy(value){
  icpAssistantState.busy=value;
  const send=document.getElementById('icpAiSend');const input=document.getElementById('icpAiInput');
  if(send){send.disabled=value;send.textContent=value?'…':'↑';send.setAttribute('aria-label',value?'Assistant is thinking':'Send');}
  if(input)input.disabled=value;
}

function aiShowSignIn(){
  const feed=document.getElementById('icpAiMessages');if(!feed)return;
  feed.replaceChildren();
  const welcome=aiEl('section','icp-ai-welcome');
  welcome.append(aiEl('span','icp-ai-mark','ICP AI'),aiEl('h3',null,'Your professional study assistant'),aiEl('p',null,'Sign in with Google to keep your conversations private, save helpful answers, and use grounded guidance from ICP YOUTH CIRCLE.'));
  const button=aiEl('button','resource-button','Continue with Google');button.type='button';
  button.onclick=async()=>{button.disabled=true;aiSetStatus('Opening secure sign-in…');try{await aiEnsureIdentity(true);await aiLoadHistory();aiStartConversation();aiSetStatus('Signed in.');}catch(error){aiSetStatus(error.message||'Sign-in was not completed.','error');button.disabled=false;}};
  welcome.appendChild(button);feed.appendChild(welcome);
}

function aiWelcome(){
  const feed=document.getElementById('icpAiMessages');if(!feed)return;
  feed.replaceChildren();
  const welcome=aiEl('section','icp-ai-welcome');
  welcome.append(aiEl('span','icp-ai-mark','ICP AI'),aiEl('h3',null,'How can I help you study?'),aiEl('p',null,'Ask for a clear explanation, a step-by-step solution, a quiz, verified resources, or a practical study plan.'));
  const prompts=aiEl('div','icp-ai-prompts');
  [
    ['Explain a topic','Explain photosynthesis in simple steps.','Explain'],
    ['Practice with a quiz','Quiz me on basic chemistry concepts.','Quiz Me'],
    ['Build a study plan','Create a seven-day MDCAT revision plan.','Study Plan'],
    ['Find verified resources','Find biology notes and practice resources.','Find Resources']
  ].forEach(([label,prompt,mode])=>{
    const button=aiEl('button','icp-ai-prompt');button.type='button';
    button.append(aiEl('strong',null,label),aiEl('span',null,prompt));
    button.onclick=()=>{document.getElementById('icpAiMode').value=mode;const input=document.getElementById('icpAiInput');input.value=prompt;aiResizeComposer(input);input.focus();};
    prompts.appendChild(button);
  });
  welcome.appendChild(prompts);feed.appendChild(welcome);
}

function aiAppendInline(parent,text){
  const pattern=/(\*\*[^*]+\*\*|`[^`]+`|\[S\d+\])/g;let last=0;let match;
  while((match=pattern.exec(String(text||'')))){
    if(match.index>last)parent.appendChild(document.createTextNode(text.slice(last,match.index)));
    const token=match[0];
    if(token.startsWith('**'))parent.appendChild(aiEl('strong',null,token.slice(2,-2)));
    else if(token.startsWith('`'))parent.appendChild(aiEl('code','icp-ai-inline-code',token.slice(1,-1)));
    else parent.appendChild(aiEl('span','icp-ai-inline-citation',token));
    last=match.index+token.length;
  }
  if(last<text.length)parent.appendChild(document.createTextNode(text.slice(last)));
}

function aiRenderRichText(container,text){
  const lines=String(text||'').split('\n');let list=null;let codeLines=null;let codeLanguage='';
  const addTextNode=(tag,className,value)=>{const node=aiEl(tag,className);aiAppendInline(node,value);container.appendChild(node);return node;};
  const finishCode=()=>{
    if(!codeLines)return;
    const wrap=aiEl('div','icp-ai-code-block');const top=aiEl('div','icp-ai-code-top');top.appendChild(aiEl('span',null,codeLanguage||'Code'));
    const copy=aiEl('button','icp-ai-code-copy','Copy');copy.type='button';copy.onclick=()=>aiCopy(codeLines.join('\n'));top.appendChild(copy);
    const pre=aiEl('pre');pre.appendChild(aiEl('code',null,codeLines.join('\n')));wrap.append(top,pre);container.appendChild(wrap);codeLines=null;codeLanguage='';
  };
  lines.forEach(raw=>{
    const fence=raw.trim().match(/^```([^`]*)$/);
    if(fence){list=null;if(codeLines)finishCode();else{codeLines=[];codeLanguage=fence[1].trim();}return;}
    if(codeLines){codeLines.push(raw);return;}
    const line=raw.trim();if(!line){list=null;return;}
    if(/^---+$/.test(line)){list=null;container.appendChild(aiEl('hr'));return;}
    const heading=line.match(/^#{1,3}\s+(.+)/);
    if(heading){list=null;addTextNode('h4',null,heading[1]);return;}
    const quote=line.match(/^>\s?(.+)/);if(quote){list=null;addTextNode('blockquote',null,quote[1]);return;}
    const bullet=line.match(/^[-*]\s+(.+)/);const numbered=line.match(/^\d+[.)]\s+(.+)/);
    if(bullet||numbered){
      const type=numbered?'ol':'ul';if(!list||list.tagName.toLowerCase()!==type){list=aiEl(type,'icp-ai-answer-list');container.appendChild(list);}
      const item=aiEl('li');aiAppendInline(item,(bullet||numbered)[1]);list.appendChild(item);return;
    }
    list=null;addTextNode('p',null,line);
  });
  finishCode();
}

function aiSpeak(text,button){
  if(!('speechSynthesis'in window)){aiSetStatus('Speech playback is not supported in this browser.','error');return;}
  window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(String(text||''));
  const language=document.getElementById('icpAiLanguage')?.value||'English';utterance.lang=language==='Urdu'?'ur-PK':language==='Pashto'?'ps-PK':'en-US';
  utterance.onstart=()=>button&&button.classList.add('is-active');utterance.onend=()=>button&&button.classList.remove('is-active');window.speechSynthesis.speak(utterance);
}

async function aiCopy(text){
  try{await navigator.clipboard.writeText(text);aiSetStatus('Answer copied.','success');}
  catch(_){aiSetStatus('Copy is unavailable in this browser.','error');}
}

async function aiShare(message){
  const text=message.content+'\n\n— ICP AI Assistant';
  try{if(navigator.share)await navigator.share({title:'ICP AI Assistant',text});else await aiCopy(text);}
  catch(error){if(error.name!=='AbortError')aiSetStatus('Sharing was not completed.','error');}
}

function aiRenderQuiz(parent,items){
  if(!Array.isArray(items)||!items.length)return;
  const section=aiEl('section','icp-ai-quiz');section.appendChild(aiEl('h4',null,'Quick quiz'));
  items.forEach((item,index)=>{
    const field=aiEl('fieldset','icp-ai-quiz-item');field.appendChild(aiEl('legend',null,(index+1)+'. '+item.question));
    (Array.isArray(item.options)?item.options:[]).forEach((option,choice)=>{
      const label=aiEl('label','icp-ai-quiz-option');const input=document.createElement('input');input.type='radio';input.name='ai-quiz-'+index+'-'+Date.now();input.value=String(choice);label.append(input,document.createTextNode(option));field.appendChild(label);
    });
    const reveal=aiEl('button','icp-ai-secondary','Check answer');reveal.type='button';
    reveal.onclick=()=>{const selected=field.querySelector('input:checked');if(!selected){aiSetStatus('Choose an answer first.','error');return;}const correct=Number(selected.value)===Number(item.correct_index);let result=field.querySelector('.icp-ai-quiz-result');if(!result){result=aiEl('p','icp-ai-quiz-result');field.appendChild(result);}result.className='icp-ai-quiz-result '+(correct?'is-correct':'is-incorrect');result.textContent=(correct?'Correct. ':'Not quite. ')+(item.explanation||'');};
    field.appendChild(reveal);section.appendChild(field);
  });parent.appendChild(section);
}

function aiRenderPlan(parent,items){
  if(!Array.isArray(items)||!items.length)return;
  const section=aiEl('section','icp-ai-plan');section.appendChild(aiEl('h4',null,'Study plan'));
  const list=aiEl('div','icp-ai-plan-list');items.forEach(item=>{const row=aiEl('div','icp-ai-plan-row');row.append(aiEl('strong',null,item.day),aiEl('span',null,item.task),aiEl('small',null,item.duration));list.appendChild(row);});section.appendChild(list);parent.appendChild(section);
}

async function aiFeedback(message,rating,button){
  try{await mdcatPrivateRequest('aiFeedback',{messageId:message.id,rating});button.closest('.icp-ai-actions').querySelectorAll('[data-rating]').forEach(node=>node.classList.toggle('is-active',node.dataset.rating===rating));aiSetStatus('Thank you for the feedback.','success');}
  catch(error){aiSetStatus(error.message||'Feedback could not be saved.','error');}
}

async function aiToggleSaved(message,button){
  const saved=!message.saved;try{await mdcatPrivateRequest('aiSaveMessage',{messageId:message.id,saved});message.saved=saved;button.classList.toggle('is-active',saved);button.textContent=saved?'★':'☆';button.setAttribute('aria-label',saved?'Remove saved answer':'Save answer');aiSetStatus(saved?'Answer saved.':'Answer removed from saved items.','success');}catch(error){aiSetStatus(error.message||'The answer could not be saved.','error');}
}

function aiMessageNode(message){
  const article=aiEl('article','icp-ai-message is-'+message.role);article.dataset.messageId=message.id||'';
  const avatar=aiEl('div','icp-ai-avatar',message.role==='assistant'?'ICP':'You');const body=aiEl('div','icp-ai-message-body');
  if(message.role==='user')body.appendChild(aiEl('p',null,message.content));
  else{
    const payload=message.payload||{};const meta=aiEl('div','icp-ai-response-meta');
    meta.appendChild(aiEl('strong','icp-ai-message-name','ICP AI'));
    const grounded=Boolean(payload.grounded);meta.append(aiEl('span','icp-ai-badge '+(grounded?'is-grounded':'is-guidance'),grounded?'✓ Verified sources':'General guidance'));
    if(payload.provider)meta.append(aiEl('span','icp-ai-provider-badge',payload.provider));
    if(payload.confidence)meta.append(aiEl('span','icp-ai-confidence','Confidence: '+payload.confidence));body.appendChild(meta);
    const answer=aiEl('div','icp-ai-answer');aiRenderRichText(answer,message.content);body.appendChild(answer);
    if(Array.isArray(payload.sources)&&payload.sources.length){
      const sources=aiEl('section','icp-ai-sources');sources.appendChild(aiEl('h4',null,'Sources'));
      payload.sources.forEach(source=>{const link=aiEl('a','icp-ai-source');link.href='#/'+source.route;link.append(aiEl('span','icp-ai-source-id',source.id),aiEl('span',null,source.title));link.onclick=event=>{event.preventDefault();handleNavigation({Slug:source.route,Label:source.title});};sources.appendChild(link);});body.appendChild(sources);
    }
    aiRenderQuiz(body,payload.quiz);aiRenderPlan(body,payload.study_plan);
    if(Array.isArray(payload.follow_up_questions)&&payload.follow_up_questions.length){const follow=aiEl('div','icp-ai-followups');payload.follow_up_questions.forEach(question=>{const button=aiEl('button','icp-ai-followup',question);button.type='button';button.onclick=()=>{const input=document.getElementById('icpAiInput');input.value=question;aiResizeComposer(input);input.focus();};follow.appendChild(button);});body.appendChild(follow);}
    const actions=aiEl('div','icp-ai-actions');
    actions.append(aiIconButton('Copy answer','Copy',()=>aiCopy(message.content)));
    const save=aiIconButton(message.saved?'Remove saved answer':'Save answer',message.saved?'★':'☆',event=>aiToggleSaved(message,event.currentTarget));save.classList.toggle('is-active',Boolean(message.saved));actions.append(save);
    actions.append(aiIconButton('Share answer','Share',()=>aiShare(message)));
    let speak; speak=aiIconButton('Read answer aloud','Listen',()=>aiSpeak(message.content,speak));actions.append(speak);
    const up=aiIconButton('Helpful','👍',event=>aiFeedback(message,'Helpful',event.currentTarget));up.dataset.rating='Helpful';
    const down=aiIconButton('Not helpful','👎',event=>aiFeedback(message,'Not Helpful',event.currentTarget));down.dataset.rating='Not Helpful';actions.append(up,down);body.appendChild(actions);
  }
  article.append(avatar,body);return article;
}

function aiRenderMessages(){
  const feed=document.getElementById('icpAiMessages');if(!feed)return;
  feed.replaceChildren();if(!icpAssistantState.messages.length){aiWelcome();return;}
  icpAssistantState.messages.forEach(message=>feed.appendChild(aiMessageNode(message)));requestAnimationFrame(()=>{feed.scrollTop=feed.scrollHeight;});
}

function aiShowThinking(){
  const feed=document.getElementById('icpAiMessages');if(!feed)return;
  const article=aiEl('article','icp-ai-message is-assistant icp-ai-thinking');article.id='icpAiThinking';
  const avatar=aiEl('div','icp-ai-avatar','ICP');const body=aiEl('div','icp-ai-message-body');body.append(aiEl('strong','icp-ai-message-name','ICP AI'));
  const dots=aiEl('div','icp-ai-thinking-dots');dots.setAttribute('aria-label','ICP AI is preparing an answer');dots.append(aiEl('span'),aiEl('span'),aiEl('span'));body.appendChild(dots);article.append(avatar,body);feed.appendChild(article);feed.scrollTop=feed.scrollHeight;
}

function aiRenderHistory(){
  const list=document.getElementById('icpAiHistory');if(!list)return;list.replaceChildren();
  if(!icpAssistantState.conversations.length){list.appendChild(aiEl('p','icp-ai-history-empty','No previous conversations.'));return;}
  icpAssistantState.conversations.forEach(conversation=>{
    const row=aiEl('div','icp-ai-history-row'+(conversation.id===icpAssistantState.conversationId?' is-current':''));
    const open=aiEl('button','icp-ai-history-open');open.type='button';open.append(aiEl('span',null,conversation.title),aiEl('small',null,conversation.mode+' · '+new Date(conversation.updatedAt).toLocaleDateString()));open.onclick=()=>aiOpenConversation(conversation.id);
    const archive=aiIconButton('Delete conversation','×',()=>aiArchiveConversation(conversation.id));row.append(open,archive);list.appendChild(row);
  });
}

async function aiLoadHistory(){
  try{icpAssistantState.conversations=await mdcatPrivateRequest('aiListConversations');aiRenderHistory();}
  catch(error){if(error.message!=='Please sign in to continue.')aiSetStatus(error.message||'History is unavailable.','error');}
}

async function aiOpenConversation(id){
  if(icpAssistantState.busy)return;aiSetStatus('Loading conversation…');
  try{const data=await mdcatPrivateRequest('aiLoadConversation',{conversationId:id});icpAssistantState.conversationId=id;icpAssistantState.messages=data.messages||[];document.getElementById('icpAiMode').value=data.conversation.mode||'Explain';document.getElementById('icpAiLanguage').value=data.conversation.language||'English';aiRenderMessages();aiRenderHistory();aiSetStatus('');aiCloseHistoryOnMobile();}
  catch(error){aiSetStatus(error.message||'The conversation could not be loaded.','error');}
}

async function aiArchiveConversation(id){
  if(!window.confirm('Delete this conversation from your history?'))return;
  try{await mdcatPrivateRequest('aiArchiveConversation',{conversationId:id});icpAssistantState.conversations=icpAssistantState.conversations.filter(item=>item.id!==id);if(icpAssistantState.conversationId===id)aiStartConversation();else aiRenderHistory();aiSetStatus('Conversation deleted.','success');}
  catch(error){aiSetStatus(error.message||'The conversation could not be deleted.','error');}
}

function aiStartConversation(){
  icpAssistantState.conversationId='';icpAssistantState.messages=[];aiRenderMessages();aiRenderHistory();aiSetStatus('');aiCloseHistoryOnMobile();const input=document.getElementById('icpAiInput');if(input)input.focus();
}

function aiResizeComposer(input){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px';}

async function aiSend(){
  if(icpAssistantState.busy)return;const input=document.getElementById('icpAiInput');const message=input.value.trim();if(message.length<2){aiSetStatus('Enter a question with at least two characters.','error');input.focus();return;}
  if(message.length>4000){aiSetStatus('Keep your request under 4,000 characters.','error');return;}
  let userMessage=null;
  let progressTimer=null;
  try{
    const identity=await aiEnsureIdentity(false);if(!identity.auth.currentUser){aiShowSignIn();return;}
    userMessage={id:'local-'+Date.now(),role:'user',content:message,payload:{},saved:false};icpAssistantState.messages.push(userMessage);aiRenderMessages();aiShowThinking();input.value='';aiResizeComposer(input);aiSetBusy(true);aiSetStatus('Reviewing sources and preparing a clear answer…');
    progressTimer=setTimeout(()=>aiSetStatus('Still working. Complex answers can take a little longer…'),12000);
    const data=await mdcatPrivateRequest('aiChat',{conversationId:icpAssistantState.conversationId||undefined,message,provider:document.getElementById('icpAiProvider').value,mode:document.getElementById('icpAiMode').value,language:document.getElementById('icpAiLanguage').value,verifiedOnly:document.getElementById('icpAiVerified').checked,requestId:aiRequestId()});
    icpAssistantState.conversationId=data.conversationId;icpAssistantState.messages.push(data.message);aiRenderMessages();await aiLoadHistory();aiSetStatus('');
  }catch(error){icpAssistantState.messages=icpAssistantState.messages.filter(item=>item.id!==userMessage?.id);aiRenderMessages();input.value=message;aiResizeComposer(input);aiSetStatus(error.message||'The assistant could not answer. Please try again.','error');}
  finally{if(progressTimer)clearTimeout(progressTimer);aiSetBusy(false);}
}

function aiToggleVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;const button=document.getElementById('icpAiMic');
  if(!Recognition){aiSetStatus('Voice input is not supported in this browser.','error');return;}
  if(icpAssistantState.recognition){icpAssistantState.recognition.stop();return;}
  const recognition=new Recognition();icpAssistantState.recognition=recognition;recognition.interimResults=false;
  const language=document.getElementById('icpAiLanguage').value;recognition.lang=language==='Urdu'?'ur-PK':language==='Pashto'?'ps-PK':'en-US';
  recognition.onstart=()=>{button.classList.add('is-active');aiSetStatus('Listening… Speak your question.');};
  recognition.onresult=event=>{const input=document.getElementById('icpAiInput');input.value=(input.value+' '+event.results[0][0].transcript).trim();aiResizeComposer(input);};
  recognition.onerror=()=>aiSetStatus('Voice input stopped. You can type your question instead.','error');
  recognition.onend=()=>{icpAssistantState.recognition=null;button.classList.remove('is-active');if(document.getElementById('icpAiStatus')?.textContent.startsWith('Listening'))aiSetStatus('');};recognition.start();
}

function aiCloseHistoryOnMobile(){const shell=document.querySelector('.icp-ai-shell');if(shell)shell.classList.remove('is-history-open');}

function aiBuildShell(content){
  content.className='icp-ai-page';content.replaceChildren();
  const shell=aiEl('div','icp-ai-shell');
  const sidebar=aiEl('aside','icp-ai-sidebar');sidebar.setAttribute('aria-label','Conversation history');
  const sideTop=aiEl('div','icp-ai-sidebar-top');sideTop.append(aiEl('strong',null,'ICP AI Assistant'));
  const close=aiIconButton('Close conversation history','×',aiCloseHistoryOnMobile);close.classList.add('icp-ai-history-close');sideTop.appendChild(close);sidebar.appendChild(sideTop);
  const fresh=aiEl('button','icp-ai-new-chat','＋ New conversation');fresh.type='button';fresh.onclick=aiStartConversation;sidebar.appendChild(fresh);
  const history=aiEl('div','icp-ai-history');history.id='icpAiHistory';sidebar.appendChild(history);
  const privacy=aiEl('p','icp-ai-privacy','Private to your signed-in account. AI can make mistakes—check important information.');sidebar.appendChild(privacy);

  const main=aiEl('section','icp-ai-main');
  const header=aiEl('header','icp-ai-header');const historyButton=aiIconButton('Open conversation history','☰',()=>shell.classList.add('is-history-open'));historyButton.classList.add('icp-ai-history-toggle');
  const heading=aiEl('div','icp-ai-heading');heading.append(aiEl('strong',null,'ICP AI'),aiEl('span',null,'Study assistant'));
  const controls=aiEl('div','icp-ai-controls');
  const provider=document.createElement('select');provider.id='icpAiProvider';provider.setAttribute('aria-label','AI provider');
  const available=new Set(icpAssistantState.config.availableProviders||[]);icpAssistantState.config.providers.forEach(value=>{const option=aiEl('option',null,value);option.value=value;option.disabled=value!=='Auto'&&!available.has(value);provider.appendChild(option);});
  const mode=document.createElement('select');mode.id='icpAiMode';mode.setAttribute('aria-label','Assistant mode');icpAssistantState.config.modes.forEach(value=>{const option=aiEl('option',null,value);option.value=value;mode.appendChild(option);});
  const language=document.createElement('select');language.id='icpAiLanguage';language.setAttribute('aria-label','Answer language');icpAssistantState.config.languages.forEach(value=>{const option=aiEl('option',null,value);option.value=value;language.appendChild(option);});
  const verified=aiEl('label','icp-ai-verified');const check=document.createElement('input');check.type='checkbox';check.id='icpAiVerified';check.checked=true;verified.append(check,document.createTextNode(' Verified ICP sources only'));
  controls.append(provider,mode,language,verified);header.append(historyButton,heading,controls);
  const feed=aiEl('div','icp-ai-messages');feed.id='icpAiMessages';feed.setAttribute('role','log');feed.setAttribute('aria-live','polite');
  const composerArea=aiEl('div','icp-ai-composer-area');const status=aiEl('p','icp-ai-status');status.id='icpAiStatus';status.setAttribute('role','status');
  const composer=aiEl('div','icp-ai-composer');const input=document.createElement('textarea');input.id='icpAiInput';input.rows=1;input.maxLength=4000;input.placeholder='Message ICP AI Assistant';input.setAttribute('aria-label','Message ICP AI Assistant');input.oninput=()=>aiResizeComposer(input);input.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();aiSend();}};
  const mic=aiIconButton('Use voice input','⌁',aiToggleVoice);mic.id='icpAiMic';const send=aiEl('button','icp-ai-send','↑');send.id='icpAiSend';send.type='button';send.setAttribute('aria-label','Send');send.onclick=aiSend;composer.append(mic,input,send);
  const note=aiEl('p','icp-ai-disclaimer','ICP AI may make mistakes. Verify deadlines, eligibility, health, legal, and financial information with official sources.');composerArea.append(status,composer,note);
  main.append(header,feed,composerArea);shell.append(sidebar,main);content.appendChild(shell);
}

async function openICPAssistant(){
  const content=document.getElementById('dynamicPageContent');if(!content)return;
  icpAssistantState.config=await aiPublicConfig();aiBuildShell(content);aiWelcome();
  if(!icpAssistantState.config.enabled){aiSetStatus('The interface is ready, but the AI service has not been enabled by the site administrator.','warning');}
  try{const identity=await aiEnsureIdentity(false);if(!identity.auth.currentUser){aiShowSignIn();return;}await aiLoadHistory();}
  catch(error){aiSetStatus(error.message||'Account services are temporarily unavailable.','error');}
}
