const PORTAL_COUNTDOWN_KEY='icp-exam-countdown-v1';
const PORTAL_TOUR_KEY='icp-welcome-tour-v1';
let portalInstallPrompt=null;

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();portalInstallPrompt=event;portalUpdateInstallButton();
});
window.addEventListener('appinstalled',()=>{portalInstallPrompt=null;portalUpdateInstallButton(true);});

function portalText(value,maximum=240){return String(value == null ? '' : value).trim().slice(0,maximum);}

function portalShareURL(item){
  const candidate=item && (item.FileURL || item.OfficialURL || item.URL || item.LinkURL || item.WebsiteURL);
  const safe=typeof safePortalURL==='function' ? safePortalURL(candidate) : '';
  return safe || location.href;
}

function appendPortalShareButton(container,item,kind){
  if(!container)return;
  const title=portalText(item && (item.Title || item.Name || item.Program || item.Question) || 'ICP YOUTH CIRCLE',200);
  const button=document.createElement('button');button.type='button';button.className='resource-button portal-share-button';
  button.textContent='Share';button.setAttribute('aria-label','Share '+title);
  button.onclick=async()=>{
    const url=portalShareURL(item);const text='View this '+portalText(kind || 'item',40)+' from ICP YOUTH CIRCLE.';
    if(navigator.share){
      try{await navigator.share({title,text,url});return;}catch(error){if(error && error.name==='AbortError')return;}
    }
    const whatsapp='https://wa.me/?text='+encodeURIComponent(title+'\n'+url);
    window.open(whatsapp,'_blank','noopener,noreferrer');
  };
  container.appendChild(button);
}

function portalInstallButton(){
  let button=document.getElementById('portalInstallButton');
  if(button)return button;
  button=document.createElement('button');button.id='portalInstallButton';button.type='button';button.className='footer-install-button';button.textContent='Install portal app';
  button.onclick=async()=>{
    if(portalInstallPrompt){
      portalInstallPrompt.prompt();await portalInstallPrompt.userChoice;portalInstallPrompt=null;portalUpdateInstallButton();return;
    }
    const message=/iphone|ipad|ipod/i.test(navigator.userAgent)
      ? 'On iPhone or iPad, open the browser Share menu and choose Add to Home Screen.'
      : 'Open your browser menu and choose Install app or Add to Home screen.';
    window.alert(message);
  };
  const footer=document.querySelector('.footer-bottom');if(footer)footer.appendChild(button);
  return button;
}

function portalUpdateInstallButton(installed=false){
  const button=portalInstallButton();if(!button)return;
  const standalone=installed || matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
  button.hidden=standalone;button.classList.toggle('is-ready',Boolean(portalInstallPrompt));
}

function portalReadCountdown(){
  try{const value=JSON.parse(localStorage.getItem(PORTAL_COUNTDOWN_KEY));return value && typeof value==='object' ? value : {};}
  catch(_){return {};}
}

function portalRenderCountdown(){
  const saved=portalReadCountdown();const output=document.getElementById('examCountdownOutput');if(!output)return;
  if(!saved.date){output.textContent='Choose an exam date to start your countdown.';return;}
  const target=new Date(saved.date+'T23:59:59');
  if(Number.isNaN(target.getTime())){output.textContent='Choose a valid exam date.';return;}
  const days=Math.max(0,Math.ceil((target.getTime()-Date.now())/86400000));
  const label=portalText(saved.name || 'Your exam',80);
  output.textContent=target.getTime()<Date.now() ? label+' date has passed.' : days===0 ? label+' is today.' : days+' day'+(days===1?'':'s')+' until '+label+'.';
}

function portalCreateHomeTools(){
  if(document.getElementById('homeTools'))return;
  const section=document.createElement('section');section.id='homeTools';section.className='home-tools';
  section.innerHTML='<div class="container"><div class="home-tools-grid"><article class="home-tool-card"><div><span class="home-tool-eyebrow">PERSONAL STUDY TOOL</span><h3>Exam countdown</h3><p id="examCountdownOutput">Choose an exam date to start your countdown.</p></div><form id="examCountdownForm" class="countdown-form"><label>Exam name<input id="examCountdownName" maxlength="80" placeholder="For example: MDCAT"></label><label>Exam date<input id="examCountdownDate" type="date" required></label><div><button class="resource-button" type="submit">Save countdown</button><button id="examCountdownClear" class="secondary-button" type="button">Clear</button></div></form></article></div></div>';
  document.getElementById('homeHero').insertAdjacentElement('afterend',section);
  const saved=portalReadCountdown();document.getElementById('examCountdownName').value=saved.name || '';document.getElementById('examCountdownDate').value=saved.date || '';
  document.getElementById('examCountdownForm').onsubmit=event=>{event.preventDefault();const value={name:portalText(document.getElementById('examCountdownName').value || 'My exam',80),date:document.getElementById('examCountdownDate').value};try{localStorage.setItem(PORTAL_COUNTDOWN_KEY,JSON.stringify(value));}catch(_){}portalRenderCountdown();};
  document.getElementById('examCountdownClear').onclick=()=>{try{localStorage.removeItem(PORTAL_COUNTDOWN_KEY);}catch(_){}document.getElementById('examCountdownForm').reset();portalRenderCountdown();};
  portalRenderCountdown();
}

function portalCreateWelcomeTour(){
  if(location.protocol==='file:' && !window.__ICP_TEST_TOUR__)return;
  try{if(localStorage.getItem(PORTAL_TOUR_KEY))return;}catch(_){}
  const steps=[
    ['Welcome to ICP YOUTH CIRCLE','Find study resources, opportunities, guidance and public updates in one student portal.'],
    ['Search and save','Use search to find content quickly. Save useful resources and access them later from My account.'],
    ['Stay updated','Use the notification bell for public announcements and sign in for personal test results, reminders and request tracking.']
  ];
  const overlay=document.createElement('div');overlay.className='welcome-tour';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','welcomeTourTitle');
  const card=document.createElement('div');card.className='welcome-tour-card';const progress=document.createElement('p');progress.className='welcome-tour-progress';const title=document.createElement('h2');title.id='welcomeTourTitle';const text=document.createElement('p');
  const actions=document.createElement('div');actions.className='welcome-tour-actions';const skip=document.createElement('button');skip.type='button';skip.className='secondary-button';skip.textContent='Skip';const next=document.createElement('button');next.type='button';next.className='resource-button';actions.append(skip,next);card.append(progress,title,text,actions);overlay.appendChild(card);document.body.appendChild(overlay);
  let index=0;const finish=()=>{try{localStorage.setItem(PORTAL_TOUR_KEY,'seen');}catch(_){}overlay.remove();};
  const draw=()=>{progress.textContent='STEP '+(index+1)+' OF '+steps.length;title.textContent=steps[index][0];text.textContent=steps[index][1];next.textContent=index===steps.length-1?'Start exploring':'Next';next.focus();};
  skip.onclick=finish;next.onclick=()=>{if(index===steps.length-1)finish();else{index+=1;draw();}};overlay.addEventListener('keydown',event=>{if(event.key==='Escape')finish();});draw();
}

function portalPakistanWeekday(){return new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'Asia/Karachi'}).format(new Date());}
function portalReminderIsScheduled(item){
  const now=Date.now();const start=item && item.PublishDate ? new Date(item.PublishDate).getTime() : 0;const end=item && item.ExpiryDate ? new Date(item.ExpiryDate).getTime() : 0;
  return (!Number.isFinite(start) || !start || start<=now) && (!Number.isFinite(end) || !end || end>=now);
}

function portalRenderFridayReminder(){
  if(portalPakistanWeekday()!=='Friday' || typeof loadPublicModule!=='function')return;
  loadPublicModule('announcements').then(rows=>{
    const item=(rows || []).filter(row=>String(row.Category || '').trim().toLowerCase()==='friday reminder' && portalReminderIsScheduled(row)).sort((a,b)=>Number(a.DisplayOrder || 0)-Number(b.DisplayOrder || 0))[0];
    if(!item)return;
    const banner=document.createElement('aside');banner.className='friday-reminder';banner.setAttribute('aria-label','Friday reminder');
    const copy=document.createElement('div');const label=document.createElement('span');label.textContent='FRIDAY REMINDER';const title=document.createElement('strong');title.textContent=portalText(item.Title || 'Friday reminder',200);const message=document.createElement('p');message.textContent=portalText(item.Summary || item.Content,500);copy.append(label,title,message);banner.appendChild(copy);
    const url=typeof safePortalURL==='function'?safePortalURL(item.OfficialURL):'';if(url){const link=document.createElement('a');link.className='resource-button';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=portalText(item.ButtonText || 'Read reminder',80);banner.appendChild(link);}
    document.querySelector('header').insertAdjacentElement('afterend',banner);
  }).catch(()=>{});
}

function loadPortalFAQs(){
  const content=document.getElementById('dynamicPageContent');const filters=document.getElementById('resourceFilters');const requestVersion=navigationVersion;
  filters.innerHTML='';filters.style.display='none';content.innerHTML='<p>Loading frequently asked questions…</p>';
  loadPublicModule('faqs').then(rows=>{
    if(requestVersion!==navigationVersion)return;
    content.replaceChildren();const panel=document.createElement('section');panel.className='faq-panel';
    const search=document.createElement('input');search.type='search';search.className='faq-search';search.placeholder='Search questions and answers';search.setAttribute('aria-label','Search frequently asked questions');
    const list=document.createElement('div');list.className='faq-list';panel.append(search,list);content.appendChild(panel);
    const draw=()=>{const query=search.value.trim().toLowerCase();const visible=(rows || []).filter(row=>!query || [row.Question,row.Answer,row.Category].join(' ').toLowerCase().includes(query));list.replaceChildren();
      if(!visible.length){const empty=document.createElement('p');empty.textContent='No matching answers found.';list.appendChild(empty);return;}
      visible.forEach(row=>{const details=document.createElement('details');details.className='faq-item';const summary=document.createElement('summary');summary.textContent=portalText(row.Question,500);const category=document.createElement('span');category.className='resource-badge';category.textContent=portalText(row.Category || 'General',120);const answer=document.createElement('p');answer.textContent=portalText(row.Answer,5000);details.append(summary,category,answer);list.appendChild(details);});
    };search.oninput=draw;draw();search.focus({preventScroll:true});
  }).catch(()=>{if(requestVersion===navigationVersion){content.innerHTML='<p>Frequently asked questions are unavailable right now.</p>';const retry=document.createElement('button');retry.type='button';retry.className='resource-button';retry.textContent='Try again';retry.onclick=loadPortalFAQs;content.appendChild(retry);}});
}

let portalLastBackgroundRefresh=0;
function portalRefreshInBackground(){
  if(Date.now()-portalLastBackgroundRefresh<15*60*1000 || typeof warmPublicBundle!=='function')return;
  portalLastBackgroundRefresh=Date.now();warmPublicBundle().catch(()=>{});
}

function initializePortalExtras(){
  portalCreateHomeTools();portalUpdateInstallButton();
  setTimeout(portalCreateWelcomeTour,500);
  const startReminder=()=>portalRenderFridayReminder();if('requestIdleCallback'in window)requestIdleCallback(startReminder,{timeout:2500});else setTimeout(startReminder,1200);
  addEventListener('online',portalRefreshInBackground);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')portalRefreshInBackground();});
}

document.addEventListener('DOMContentLoaded',initializePortalExtras);
