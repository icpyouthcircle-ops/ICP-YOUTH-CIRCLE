// Read the public MDCAT hierarchy; other portal modules stay separate.
let mdcatRequest = null;
const MDCAT_PUBLIC_CACHE_PREFIX = 'icp-mdcat-public-v1:';
const MDCAT_LIVE_SITE = location.hostname === 'icpyouthcircle-ops.github.io';
const MDCAT_SUBJECTS_BOOTSTRAP = [
  {ID:'MDS-001',Name:'Biology',Slug:'biology',Description:'MDCAT Biology subject hub containing syllabus-based topics, resources, MCQs, practice, revision and tests.',Icon:'',DisplayOrder:1},
  {ID:'MDS-002',Name:'Chemistry',Slug:'chemistry',Description:'MDCAT Chemistry subject hub containing syllabus-based topics, resources, MCQs, practice, revision and tests.',Icon:'',DisplayOrder:2},
  {ID:'MDS-003',Name:'Physics',Slug:'physics',Description:'MDCAT Physics subject hub containing syllabus-based topics, resources, MCQs, practice, revision and tests.',Icon:'',DisplayOrder:3},
  {ID:'MDS-004',Name:'English',Slug:'english',Description:'MDCAT English subject hub containing language concepts, vocabulary, comprehension, practice and tests.',Icon:'',DisplayOrder:4},
  {ID:'MDS-005',Name:'Logical Reasoning',Slug:'logical-reasoning',Description:'MDCAT Logical Reasoning hub containing reasoning concepts, practice questions, revision and tests.',Icon:'',DisplayOrder:5}
];

function mdcatPublicURL(action, params) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  for (const [key,value] of Object.entries(params || {})) {
    if (value != null && String(value).trim()) url.searchParams.set(key,String(value));
  }
  return url;
}

function mdcatStorePublicCache(key, data) {
  if (!MDCAT_LIVE_SITE) return;
  try {
    const value = JSON.stringify({savedAt:Date.now(),data});
    if (value.length < 250000) localStorage.setItem(MDCAT_PUBLIC_CACHE_PREFIX + key,value);
  } catch (_) {}
}

function mdcatReadPublicCache(key) {
  if (!MDCAT_LIVE_SITE) return null;
  try {
    const value = JSON.parse(localStorage.getItem(MDCAT_PUBLIC_CACHE_PREFIX + key));
    if (!value || Date.now() - Number(value.savedAt) > 15 * 60 * 1000 || !Array.isArray(value.data)) return null;
    return value.data;
  } catch (_) { return null; }
}

async function mdcatPublicRequest(action, params, controller) {
  const url = mdcatPublicURL(action,params);
  const key = url.searchParams.toString();
  const cached = mdcatReadPublicCache(key);
  if (cached) return cached;
  if (MDCAT_LIVE_SITE && action === 'mdcatSubjects') {
    // Show the stable subject directory instantly and refresh it for the next visit.
    fetch(url).then(response=>response.ok?response.json():null).then(result=>{
      if (result && result.success === true && Array.isArray(result.data)) mdcatStorePublicCache(key,result.data);
    }).catch(()=>{});
    return MDCAT_SUBJECTS_BOOTSTRAP;
  }
  const timeout = setTimeout(()=>controller.abort(),60000);
  try {
    const response = await fetch(url,{signal:controller.signal});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result || result.success !== true || !Array.isArray(result.data) ||
      result.data.some(row=>!row || typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid public MDCAT response');
    mdcatStorePublicCache(key,result.data);
    return result.data;
  } finally { clearTimeout(timeout); }
}

function closeMDCATHub() {
  resetMDCATStudy();
  if (mdcatRequest) mdcatRequest.abort();
  mdcatRequest = null;
  document.getElementById('mdcatHub').hidden = true;
}

function renderMDCATBreadcrumb(items=[]) {
  const breadcrumb=document.getElementById('mdcatBreadcrumb');
  if(!breadcrumb)return;
  breadcrumb.replaceChildren();
  const addSeparator=()=>{const separator=document.createElement('span');separator.setAttribute('aria-hidden','true');separator.textContent='/';breadcrumb.appendChild(separator);};
  const addButton=(label,action)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=action;breadcrumb.appendChild(button);};
  addButton('← Home',()=>showHome());addSeparator();
  const entry=portalData && Array.isArray(portalData.navigation)?portalData.navigation.find(row=>row.Slug==='entry-tests'&&!row.ParentID):null;
  addButton('Entry Tests',()=>handleNavigation(entry || {Slug:'entry-tests',Label:'Entry Tests'}));addSeparator();
  if(items.length)addButton('MDCAT 2027',()=>openMDCATHub());
  else {const current=document.createElement('span');current.className='breadcrumb-current';current.setAttribute('aria-current','page');current.textContent='MDCAT 2027';breadcrumb.appendChild(current);return;}
  items.forEach((item,index)=>{
    addSeparator();
    if(index===items.length-1){const current=document.createElement('span');current.className='breadcrumb-current';current.setAttribute('aria-current','page');current.textContent=item.label;breadcrumb.appendChild(current);}
    else addButton(item.label,item.action);
  });
}

function openMDCATHub(options={}) {
  document.getElementById('homeHero').style.display = 'none';
  document.getElementById('homeExplore').style.display = 'none';
  document.getElementById('dynamicPage').style.display = 'none';
  document.getElementById('mdcatHub').hidden = false;
  if(!options.fromHistory && window.location.hash!=='#/entry-tests/mdcat')history.pushState({portal:true},'','#/entry-tests/mdcat');
  document.getElementById('mdcatHubTitle').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
  loadMDCATSubjects();
}

async function loadMDCATSubjects() {
  return loadMDCATDirectory();
}

function openMDCATUnits(subject) {
  document.getElementById('mdcatHubTitle').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
  return loadMDCATDirectory(subject);
}

function openMDCATChapters(subject, unit) {
  document.getElementById('mdcatHubTitle').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
  return loadMDCATDirectory(subject, unit);
}

function openMDCATTopics(subject, unit, chapter) {
  document.getElementById('mdcatHubTitle').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
  return loadMDCATDirectory(subject, unit, chapter);
}

async function loadMDCATDirectory(subject = null, unit = null, chapter = null) {
  resetMDCATStudy();
  if (mdcatRequest) mdcatRequest.abort();
  const controller = new AbortController();
  mdcatRequest = controller;
  const grid = document.getElementById('mdcatSubjects');
  const status = document.getElementById('mdcatStatus');
  const retry = document.getElementById('mdcatRetry');
  const noun = chapter ? 'topics' : unit ? 'chapters' : subject ? 'units' : 'subjects';
  const breadcrumbItems=[];
  if(subject)breadcrumbItems.push({label:subject.Name,action:()=>openMDCATUnits(subject)});
  if(unit)breadcrumbItems.push({label:unit.Name,action:()=>openMDCATChapters(subject,unit)});
  if(chapter)breadcrumbItems.push({label:chapter.Name,action:()=>openMDCATTopics(subject,unit,chapter)});
  renderMDCATBreadcrumb(breadcrumbItems);
  document.getElementById('mdcatHubTitle').textContent = chapter
    ? chapter.Name + ' — Topics' : unit
    ? unit.Name + ' — Chapters' : subject
    ? subject.Name + ' — Units' : 'MDCAT 2027';
  document.getElementById('mdcatHubDescription').textContent = chapter
    ? 'Browse topics in ' + chapter.Name + '.' : unit
    ? subject.Name + ' · Browse the published chapters for ' + unit.Name + '.' : subject
    ? 'Browse the published units for ' + subject.Name + '.'
    : 'Explore the subjects for your MDCAT preparation.';
  grid.setAttribute('aria-label', chapter ? chapter.Name + ' topics' : unit ? unit.Name + ' chapters' : subject ? subject.Name + ' units' : 'MDCAT subjects');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading ' + noun + '…';
  retry.hidden = true;
  retry.onclick = () => loadMDCATDirectory(subject, unit, chapter);

  try {
    const action = chapter ? 'mdcatTopics' : unit ? 'mdcatChapters' : subject ? 'mdcatUnits' : 'mdcatSubjects';
    const params = chapter ? {subjectId:subject.ID,unitId:unit.ID,chapterId:chapter.ID}
      : unit ? {subjectId:subject.ID,unitId:unit.ID} : subject ? {subjectId:subject.ID} : {};
    const records = await mdcatPublicRequest(action,params,controller);
    if (mdcatRequest !== controller) return;
    if (records.some(item => !item || typeof item.Name !== 'string' || !item.Name.trim() ||
      (!unit && (item.ID == null || !String(item.ID).trim())) ||
      (subject && String(item.SubjectID) !== String(subject.ID)) ||
      (unit && String(item.UnitID) !== String(unit.ID)) ||
      (chapter && String(item.ChapterID) !== String(chapter.ID)))) {
      throw new Error('Invalid MDCAT directory record');
    }
    const order = subject => {
      const value = Number(subject.DisplayOrder);
      return Number.isFinite(value) ? value : 0;
    };
    records.slice().sort((a, b) => order(a) - order(b)).forEach(item => {
      const card = document.createElement('article');
      card.className = 'card mdcat-subject-card';
      // Never invent an ID when the API omits it; such records remain display-only.
      if (chapter) {
        if (item.ID != null) card.dataset.topicId = String(item.ID);
      } else if (unit) {
        if (item.ID != null) card.dataset.chapterId = String(item.ID);
      } else if (subject) card.dataset.unitId = String(item.ID);
      else card.dataset.subjectId = String(item.ID);

      const icon = document.createElement('span');
      icon.className = 'mdcat-subject-icon';
      icon.setAttribute('aria-hidden', 'true');
      // Sheet values remain text, never HTML or executable markup.
      icon.textContent = item.Icon || item.Name.trim().charAt(0);
      const heading = document.createElement('h3');
      heading.textContent = item.Name;
      const description = document.createElement('p');
      description.textContent = item.Description || (chapter
        ? 'Open practice questions for this topic.' : unit
        ? 'Learning materials for this chapter will be added here.' : subject
        ? 'Explore the available chapters for this unit.'
        : 'Explore the available units for this subject.');
      card.append(icon, heading, description);
      if (/^MD[UCT]-DEMO-/i.test(String(item.ID)) || (unit && /^MDU-DEMO-/i.test(String(unit.ID)))) {
        const demo = document.createElement('p');
        demo.className = 'mdcat-demo';
        demo.textContent = 'Demo content — navigation test only, not official syllabus content.';
        card.appendChild(demo);
      }
      if (item.ID != null && String(item.ID).trim()) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'resource-button mdcat-open-units';
        const destination = chapter ? 'practice questions' : unit ? 'topics' : subject ? 'chapters' : 'units';
        button.textContent = 'View ' + destination;
        button.setAttribute('aria-label', 'View ' + item.Name + ' ' + destination);
        button.onclick = chapter
          ? () => openMDCATPractice({SubjectID: subject.ID, UnitID: unit.ID, ChapterID: chapter.ID, TopicID: item.ID}, item.Name,
            () => openMDCATTopics(subject, unit, chapter))
          : unit ? () => openMDCATTopics(subject, unit, item)
          : subject ? () => openMDCATChapters(subject, item) : () => openMDCATUnits(item);
        card.appendChild(button);
      } else {
        const unavailable = document.createElement('p');
        unavailable.textContent = 'Content is awaiting setup. Please check back later.';
        card.appendChild(unavailable);
      }
      grid.appendChild(card);
    });
    status.textContent = records.length
      ? records.length + ' ' + (records.length === 1 ? noun.slice(0, -1) : noun) + ' available.'
      : 'No ' + noun + ' are published' + (chapter ? ' for ' + chapter.Name : unit ? ' for ' + unit.Name : subject ? ' for ' + subject.Name : '') + ' yet. Please check again later.';
  } catch (error) {
    // Navigation or a newer request owns the screen now.
    if (mdcatRequest !== controller) return;
    console.error('MDCAT directory error:', error);
    status.textContent = 'Unable to load ' + noun + ' right now. Please try again.';
    retry.hidden = false;
  } finally {
    if (mdcatRequest === controller) {
      grid.setAttribute('aria-busy', 'false');
      mdcatRequest = null;
    }
  }
}
