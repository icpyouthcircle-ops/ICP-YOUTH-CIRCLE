function performanceGrade(milliseconds){return milliseconds<800?'Fast':milliseconds<2500?'Acceptable':'Slow';}

async function performanceProbe(action){
  const started=performance.now();
  try{
    const separator=ADMIN_API_URL.includes('?')?'&':'?';
    const response=await fetch(ADMIN_API_URL+separator+'action='+encodeURIComponent(action)+'&diagnostic='+Date.now(),{cache:'no-store'});
    const data=await response.json();
    const milliseconds=Math.round(performance.now()-started);
    return {name:action,milliseconds,status:response.ok && data.success?'Available':'Failed',grade:response.ok && data.success?performanceGrade(milliseconds):'Needs attention'};
  }catch(_){return {name:action,milliseconds:Math.round(performance.now()-started),status:'Failed',grade:'Needs attention'};}
}

function performanceMetricCard(label,value,detail){
  const card=document.createElement('article');card.className='performance-card';
  const heading=document.createElement('span');heading.textContent=label;const number=document.createElement('strong');number.textContent=value;const copy=document.createElement('p');copy.textContent=detail || '';
  card.append(heading,number,copy);return card;
}

async function runAdminPerformanceCheck(){
  const button=document.getElementById('adminPerformanceRun');const status=document.getElementById('adminPerformanceStatus');const results=document.getElementById('adminPerformanceResults');
  button.disabled=true;status.textContent='Checking the portal and public data service…';results.replaceChildren();
  const navigation=performance.getEntriesByType('navigation')[0];
  const pageLoad=navigation?Math.round(navigation.loadEventEnd || performance.now()):Math.round(performance.now());
  const probes=await Promise.all(['portalData','announcements','searchIndex'].map(performanceProbe));
  results.appendChild(performanceMetricCard('Admin page load',pageLoad+' ms',performanceGrade(pageLoad)+' on this device'));
  probes.forEach(probe=>results.appendChild(performanceMetricCard(probe.name,probe.milliseconds+' ms',probe.status+' · '+probe.grade)));
  const cacheCount=Object.keys(localStorage).filter(key=>key.startsWith('icp-public-')).length;
  results.appendChild(performanceMetricCard('Cached portal modules',String(cacheCount),'Cached content opens faster on repeat visits'));
  const failures=probes.filter(probe=>probe.status==='Failed').length;
  status.textContent=failures ? failures+' service check'+(failures===1?'':'s')+' failed. Retry before changing portal code.' : 'All public service checks completed successfully.';
  button.disabled=false;
}

function initializeAdminPerformance(){
  const toggle=document.getElementById('adminPerformanceToggle');const panel=document.getElementById('adminPerformancePanel');const close=document.getElementById('adminPerformanceClose');const run=document.getElementById('adminPerformanceRun');
  if(!toggle || !panel)return;
  toggle.onclick=()=>{panel.hidden=false;document.getElementById('adminPerformanceTitle').focus?.();};
  close.onclick=()=>{panel.hidden=true;};run.onclick=runAdminPerformanceCheck;
}

document.addEventListener('DOMContentLoaded',initializeAdminPerformance);
