const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec';
const PORTAL_CACHE_KEY = 'icp-public-portal-v1';
const PUBLIC_MODULE_CACHE_PREFIX = 'icp-public-module-v2:';
const PUBLIC_MODULE_CACHE_TTL = 30 * 60 * 1000;
const PUBLIC_NOTIFICATION_SEEN_KEY = 'icp-public-notifications-seen-v1';
const PUBLIC_NOTIFICATION_LIFETIME = 24 * 60 * 60 * 1000;
const publicModuleMemory = new Map();
const publicModuleRequests = new Map();
let publicNotificationRequest = null;
let portalRenderFingerprint = '';
const PORTAL_BOOKMARKS_KEY = 'icp-student-bookmarks-v1';
const PORTAL_BOOTSTRAP_DATA = {
  settings: {
    site_name: 'ICP YOUTH CIRCLE',
    site_tagline: 'Learn • Connect • Grow',
    site_description: 'A student resource, opportunity, guidance and community platform by ICP YOUTH CIRCLE.',
    footer_text: 'ICP YOUTH CIRCLE'
  },
  navigation: [
    ['NAV-001','Home','home',''],['NAV-002','Study','study',''],['NAV-003','Entry Tests','entry-tests',''],
    ['NAV-004','Admissions','admissions',''],['NAV-005','Scholarships','scholarships',''],['NAV-006','Career','career',''],
    ['NAV-007','AI & Smart Tools','ai-smart-tools',''],['NAV-008','Community','community',''],['NAV-009','Updates','updates',''],
    ['NAV-010','Islamic','islamic',''],['NAV-011','Explore','explore',''],
    ['NAV-012','Notes','notes','NAV-002'],['NAV-013','Past Papers','past-papers','NAV-002'],['NAV-014','MCQs','mcqs','NAV-002'],
    ['NAV-015','Videos','videos','NAV-002'],['NAV-016','Study Resources','study-resources','NAV-002'],
    ['NAV-017','Prep Tracker','prep-tracker','NAV-002'],
    ['NAV-018','MDCAT','mdcat','NAV-003'],['NAV-019','NUMS','nums','NAV-003'],['NAV-020','ETEA','etea','NAV-003'],
    ['NAV-021','ECAT','ecat','NAV-003'],['NAV-022','NUST NET','nust-net','NAV-003'],['NAV-023','Other Tests','other-tests','NAV-003'],
    ['NAV-024','College Admissions','college-admissions','NAV-004'],['NAV-025','University Admissions','university-admissions','NAV-004'],
    ['NAV-026','Eligibility','eligibility','NAV-004'],['NAV-027','Deadlines','deadlines','NAV-004'],
    ['NAV-028','Merit Lists','merit-lists','NAV-004'],['NAV-029','Admission Guides','admission-guides','NAV-004'],
    ['NAV-030','Pakistan Scholarships','pakistan-scholarships','NAV-005'],['NAV-031','International Scholarships','international-scholarships','NAV-005'],
    ['NAV-032','Financial Aid','financial-aid','NAV-005'],['NAV-033','Scholarship Guides','scholarship-guides','NAV-005'],
    ['NAV-034','Career Guidance','career-guidance','NAV-006'],['NAV-035','Internships','internships','NAV-006'],
    ['NAV-036','Competitions','competitions','NAV-006'],['NAV-037','Student Programs','student-programs','NAV-006'],
    ['NAV-038','Portfolio Guidance','portfolio-guidance','NAV-006'],['NAV-039','Mentors','mentors','NAV-006'],
    ['NAV-040','AI Assistant','ai-assistant','NAV-007'],['NAV-041','AI Tools','ai-tools','NAV-007'],
    ['NAV-042','Smart Tools','smart-tools','NAV-007'],['NAV-043','Study Tools','study-tools','NAV-007'],
    ['NAV-044','Forum','forum','NAV-008'],['NAV-045','Student Help Desk','student-help-desk','NAV-008'],
    ['NAV-046','Submit Resource','submit-resource','NAV-008'],['NAV-047','Suggestions','suggestions','NAV-008'],
    ['NAV-048','Announcements','announcements','NAV-009'],['NAV-049','Exam Updates','exam-updates','NAV-009'],
    ['NAV-050','Results','results','NAV-009'],['NAV-051','Merit Lists','merit-lists','NAV-009'],
    ['NAV-052','Important Notices','important-notices','NAV-009'],
    ['NAV-053','Hadith','hadith','NAV-010'],['NAV-054','Islamic Reminders','islamic-reminders','NAV-010'],
    ['NAV-055','Duas / Motivation','duas-motivation','NAV-010'],
    ['NAV-056','Study Abroad','study-abroad','NAV-011'],['NAV-057','Blog','blog','NAV-011'],
    ['NAV-058','About','about','NAV-011'],['NAV-059','Contact','contact','NAV-011']
  ].map((row,index)=>({ID:row[0],Label:row[1],Slug:row[2],ParentID:row[3],DisplayOrder:index+1})),
  categories: [
    ['Study','study','Study materials and learning resources'],['Entry Tests','entry-tests','Entry test preparation and related content'],
    ['Admissions','admissions','College and university admission information'],['Scholarships','scholarships','Scholarships and financial aid'],
    ['Career','career','Career guidance and student opportunities'],['AI & Smart Tools','ai-smart-tools','AI tools and smart study utilities'],
    ['Community','community','Student support and community features'],['Updates','updates','Announcements, results and important notices'],
    ['Islamic','islamic','Islamic reminders, hadith and duas'],['Explore','explore','Blog, study abroad, about and contact content']
  ].map((row,index)=>({ID:'BOOT-'+(index+1),Name:row[0],Slug:row[1],Description:row[2],DisplayOrder:index+1}))
};
    let portalData = null;
    let currentResources = [];
    let currentVideos = [];
    let currentAdmissions = [];
    let currentScholarships = [];
    let currentOpportunities = [];
    let currentAnnouncements = [];
    let currentAITools = [];
    let currentIslamicContent = [];
    let currentBlogPosts = [];
    let currentEntryTests = [];
    let portalSearchIndex = null;
    let portalSearchPromise = null;
    let navigationVersion = 0;
    let portalInitialRouteApplied = false;

    let mcqScore = 0;
    let mcqAnswered = 0;
    let currentMCQs = [];

    let activeQuizMCQs = [];
    let currentMCQIndex = 0;
    let mockTestActive = false;

    let mockTestSubmitted = false;
    let mockTestAnswers = {};

function safePortalURL(value) {
  const raw=String(value == null ? '' : value).trim();
  if (!raw) return '';
  try {
    const url=new URL(raw,window.location.href);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}

function googleDriveDownloadURL(value) {
  const safe=safePortalURL(value);
  if (!safe) return '';
  try {
    const url=new URL(safe);
    if (url.hostname!=='drive.google.com') return '';
    const pathMatch=url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    const id=pathMatch ? pathMatch[1] : url.searchParams.get('id');
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return '';
    const download=new URL('https://drive.google.com/uc');
    download.searchParams.set('export','download');download.searchParams.set('id',id);
    const resourceKey=url.searchParams.get('resourcekey');if(resourceKey)download.searchParams.set('resourcekey',resourceKey);
    return download.href;
  } catch (_) { return ''; }
}

function getPortalBookmarks() {
  try {
    const rows=JSON.parse(localStorage.getItem(PORTAL_BOOKMARKS_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter(row=>row && row.key && row.title).slice(0,100) : [];
  } catch (_) { return []; }
}

function portalBookmarkKey(resource) {
  return String(resource.ID || resource.FileURL || resource.Title || '').trim().slice(0,300);
}

function isPortalResourceBookmarked(resource) {
  const key=portalBookmarkKey(resource);
  return Boolean(key && getPortalBookmarks().some(row=>row.key===key));
}

function togglePortalResourceBookmark(resource,button) {
  const key=portalBookmarkKey(resource);
  if (!key) return;
  const rows=getPortalBookmarks();
  const index=rows.findIndex(row=>row.key===key);
  if (index>=0) rows.splice(index,1);
  else rows.unshift({
    key:key,title:String(resource.Title || 'Resource').slice(0,240),
    category:String(resource.Category || '').slice(0,80),subject:String(resource.Subject || '').slice(0,160),
    level:String(resource.Level || '').slice(0,120),fileURL:safePortalURL(resource.FileURL),
    resourceType:String(resource.ResourceType || '').slice(0,80),savedAt:new Date().toISOString()
  });
  try {localStorage.setItem(PORTAL_BOOKMARKS_KEY,JSON.stringify(rows.slice(0,100)));} catch (_) {}
  const saved=index<0;
  button.textContent=saved?'Saved ✓':'Save resource';button.setAttribute('aria-pressed',String(saved));
}

function publicModuleKey(action, params = {}) {
  const query = new URLSearchParams({ action, ...params });
  return query.toString();
}

function readPublicModuleCache(key, allowStale = false) {
  if (publicModuleMemory.has(key)) return publicModuleMemory.get(key);
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_MODULE_CACHE_PREFIX + key));
    if (!cached || !Array.isArray(cached.data)) return null;
    if (!allowStale && Date.now() - Number(cached.savedAt || 0) > PUBLIC_MODULE_CACHE_TTL) return null;
    publicModuleMemory.set(key, cached.data);
    return cached.data;
  } catch (_) { return null; }
}

function storePublicModuleCache(key, data) {
  if (!Array.isArray(data)) return;
  publicModuleMemory.set(key, data);
  try {
    const value = JSON.stringify({ savedAt: Date.now(), data });
    if (value.length <= 500000) localStorage.setItem(PUBLIC_MODULE_CACHE_PREFIX + key, value);
  } catch (_) {}
}

function fetchWithPortalTimeout(url, options = {}, timeoutMs = 15000) {
  if (typeof AbortController === 'undefined') return fetch(url, options);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {...options, signal: controller.signal})
    .finally(() => clearTimeout(timeout));
}

function refreshPublicModule(action, params = {}) {
  const key = publicModuleKey(action, params);
  if (publicModuleRequests.has(key)) return publicModuleRequests.get(key);
  const url = API_BASE_URL + '?' + key;
  const request = fetchWithPortalTimeout(url)
    .then(response => {
      if (!response.ok) throw new Error('HTTP error: ' + response.status);
      return response.json();
    })
    .then(result => {
      if (!result.success || !Array.isArray(result.data)) {
        throw new Error(result.error || 'Unable to load portal content.');
      }
      storePublicModuleCache(key, result.data);
      return result.data;
    })
    .finally(() => publicModuleRequests.delete(key));
  publicModuleRequests.set(key, request);
  return request;
}

function loadPublicModule(action, params = {}) {
  const key = publicModuleKey(action, params);
  const cached = readPublicModuleCache(key, true);
  if (cached) {
    refreshPublicModule(action, params).catch(() => {});
    return Promise.resolve(cached);
  }
  return refreshPublicModule(action, params);
}

function storePublicBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return false;
  const actions = ['mcqs','videos','admissions','scholarships','opportunities','announcements','aiTools','islamicContent','blog','entryTests'];
  if (!actions.every(action => Array.isArray(bundle[action])) || !Array.isArray(bundle.resources)) return false;
  actions.forEach(action => storePublicModuleCache(publicModuleKey(action), bundle[action]));
  ['Notes','Past Papers','Study Resources'].forEach(category => {
    const rows = bundle.resources.filter(item => String(item.Category || '').trim().toLowerCase() === category.toLowerCase());
    storePublicModuleCache(publicModuleKey('resources',{category}), rows);
  });
  return true;
}

function warmPublicBundle() {
  return fetchWithPortalTimeout(API_BASE_URL + '?action=portalBundle')
    .then(response => {
      if (!response.ok) throw new Error('HTTP error: ' + response.status);
      return response.json();
    })
    .then(result => {
      if (!result.success || !storePublicBundle(result.data)) throw new Error('Invalid portal bundle.');
      return true;
    });
}

function warmPublicModules() {
  if (location.hostname !== 'icpyouthcircle-ops.github.io' && !window.__ICP_ENABLE_PREFETCH__) return;
  const modules = [
    ['announcements'], ['entryTests'], ['admissions'], ['scholarships'],
    ['opportunities'], ['aiTools'], ['islamicContent'], ['blog'], ['videos'], ['mcqs'],
    ['resources', { category: 'Notes' }],
    ['resources', { category: 'Past Papers' }],
    ['resources', { category: 'Study Resources' }]
  ];
  let index = 0;
  const next = () => {
    if (index >= modules.length) return;
    const [action, params] = modules[index++];
    const key = publicModuleKey(action, params || {});
    if (readPublicModuleCache(key)) {
      setTimeout(next, 80);
      return;
    }
    refreshPublicModule(action, params || {}).catch(() => {}).finally(() => setTimeout(next, 120));
  };
  const start = () => warmPublicBundle().catch(() => { next(); next(); });
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 600);
}

    document.addEventListener(
      'DOMContentLoaded',
      loadPortal
    );


function readPortalCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(PORTAL_CACHE_KEY));
    if (!cached || Date.now() - Number(cached.savedAt) > 6 * 60 * 60 * 1000) return null;
    if (!cached.data || !Array.isArray(cached.data.navigation) || !Array.isArray(cached.data.categories)) return null;
    return cached.data;
  } catch (_) { return null; }
}

function loadPortal() {
  // Render immediately from a safe same-origin snapshot; refresh from Sheets in the background.
  renderPortal(readPortalCache() || PORTAL_BOOTSTRAP_DATA);
  const searchInput=document.getElementById('searchInput');
  searchInput.addEventListener('input',()=>searchInput.setCustomValidity(''));
  searchInput.addEventListener('focus',()=>loadPortalSearchIndex().catch(()=>{}));
  searchInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();portalSearch();}});
  fetchWithPortalTimeout(API_BASE_URL + '?action=portalData')
    .then(response => {
      if (!response.ok) {
        throw new Error(
          'HTTP error: ' + response.status
        );
      }

      return response.json();
    })
    .then(result => {
      if (!result.success) {
        throw new Error(
          result.error ||
          'Unable to load portal data.'
        );
      }

      if (!result.data || !Array.isArray(result.data.navigation) || !Array.isArray(result.data.categories)) {
        throw new Error('Invalid portal data.');
      }
      try { localStorage.setItem(PORTAL_CACHE_KEY, JSON.stringify({savedAt:Date.now(),data:result.data})); } catch (_) {}
      renderPortal(result.data);
    })
    .catch(error => {
      console.error(
        'Portal data error:',
        error
      );

      // The already-rendered snapshot keeps the portal usable while the API recovers.
    });
  warmPublicModules();
  registerPortalServiceWorker();
}

function registerPortalServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=20260926-mobile-nav').catch(() => {});
  }, {once: true});
}


    function renderPortal(data) {

      portalData = data;

      let fingerprint = '';
      try { fingerprint = JSON.stringify({settings:data.settings || {},navigation:data.navigation || [],categories:data.categories || []}); } catch (_) {}
      if (fingerprint && fingerprint === portalRenderFingerprint) return;
      portalRenderFingerprint = fingerprint;

      const settings = data.settings || {};

      document.getElementById(
        'siteName'
      ).textContent =
        settings.site_name ||
        'ICP YOUTH CIRCLE';


      document.getElementById(
        'tagline'
      ).textContent =
        settings.site_tagline ||
        'Learn • Connect • Grow';


      document.getElementById(
        'heroTitle'
      ).textContent =
        settings.site_name ||
        'ICP YOUTH CIRCLE';


      document.getElementById(
        'heroTagline'
      ).textContent =
        settings.site_tagline ||
        'Learn • Connect • Grow';


      document.getElementById(
        'heroDescription'
      ).textContent =
        settings.site_description || '';


      document.getElementById(
        'footerText'
      ).textContent =
        settings.footer_text ||
        'ICP YOUTH CIRCLE';


      renderNavigation(
        data.navigation || []
      );


      renderCategories(
        data.categories || []
      );

      if (!publicNotificationRequest) {
        publicNotificationRequest = loadPublicModule('announcements')
          .catch(error => { publicNotificationRequest = null; throw error; });
      }
      publicNotificationRequest.then(renderPublicNotifications).catch(() => {});


      document.getElementById(
        'loading'
      ).style.display = 'none';


      document.getElementById(
        'app'
      ).style.display = 'block';

      if (!portalInitialRouteApplied) {
        portalInitialRouteApplied = true;
        navigatePortalLocation();
      }

    }

function announcementTimestamp(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return 0;
  const timestamp = Date.parse(raw);
  if (!Number.isNaN(timestamp)) return timestamp;
  const match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  return match ? Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : 0;
}

function sortedPublicNotifications(items) {
  const priority = {high: 2, medium: 1, low: 0};
  const now = Date.now();
  return (Array.isArray(items) ? items : [])
    .filter(item => {
      if (!item || !(item.Title || item.Summary || item.Content)) return false;
      const publishedAt = announcementTimestamp(item.PublishDate);
      return publishedAt > 0 && publishedAt <= now && now - publishedAt < PUBLIC_NOTIFICATION_LIFETIME;
    })
    .sort((a, b) => {
      const featured = String(b.Featured || '').toLowerCase() === 'yes' ? 1 : 0;
      const otherFeatured = String(a.Featured || '').toLowerCase() === 'yes' ? 1 : 0;
      return (featured - otherFeatured) ||
        ((priority[String(b.Priority || '').toLowerCase()] || 0) - (priority[String(a.Priority || '').toLowerCase()] || 0)) ||
        (announcementTimestamp(b.PublishDate) - announcementTimestamp(a.PublishDate));
    });
}

function renderPublicNotifications(items) {
  const wrapper = document.getElementById('publicNotifications');
  if (!wrapper) return;
  const notifications = sortedPublicNotifications(items);
  const button = wrapper.querySelector('.public-notification-button');
  const badge = wrapper.querySelector('.public-notification-badge');
  const list = wrapper.querySelector('.public-notification-list');
  if (!button || !badge || !list) return;
  list.replaceChildren();
  if (!notifications.length) {
    button.disabled = true;
    badge.hidden = true;
    const empty = document.createElement('p'); empty.className = 'public-notification-empty'; empty.textContent = 'No current announcements.';
    list.appendChild(empty);
    return;
  }
  button.disabled = false;
  notifications.slice(0, 5).forEach(item => {
    const link = document.createElement('a'); link.href = '#/announcements'; link.className = 'public-notification-item';
    const meta = document.createElement('span'); meta.className = 'public-notification-meta'; meta.textContent = String(item.Category || 'Announcement');
    const title = document.createElement('strong'); title.textContent = String(item.Title || item.Summary || 'Portal update');
    link.append(meta, title);
    link.onclick = event => { event.preventDefault(); closePublicNotifications(); handleNavigation({Slug: 'announcements', Label: 'Announcements', ParentID: 'NAV-009'}); closeMobileNavigation(); };
    list.appendChild(link);
  });
  const latestId = String(notifications[0].ID || notifications[0].Title || 'latest');
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(PUBLIC_NOTIFICATION_SEEN_KEY) || 'null'); } catch (_) {}
  const viewedRecently = seen && seen.latestId === latestId;
  badge.textContent = String(Math.min(notifications.length, 9)) + (notifications.length > 9 ? '+' : '');
  badge.hidden = Boolean(viewedRecently);
  button.dataset.latestId = latestId;
  button.dataset.notificationCount = String(notifications.length);
}

function closePublicNotifications() {
  const wrapper = document.getElementById('publicNotifications');
  if (!wrapper) return;
  wrapper.classList.remove('is-open');
  const button = wrapper.querySelector('.public-notification-button');
  if (button) button.setAttribute('aria-expanded', 'false');
}

function togglePublicNotifications() {
  const wrapper = document.getElementById('publicNotifications');
  if (!wrapper) return;
  const open = !wrapper.classList.contains('is-open');
  closePublicNotifications();
  if (!open) return;
  closeMobileNavigation();
  wrapper.classList.add('is-open');
  const button = wrapper.querySelector('.public-notification-button');
  const badge = wrapper.querySelector('.public-notification-badge');
  button.setAttribute('aria-expanded', 'true');
  const latestId = button.dataset.latestId;
  if (latestId) {
    try { localStorage.setItem(PUBLIC_NOTIFICATION_SEEN_KEY, JSON.stringify({latestId, seenAt: Date.now()})); } catch (_) {}
    badge.hidden = true;
  }
}

function renderNavigation(items) {

  const nav = document.getElementById('mainNavigation');
  const menuToggle = document.getElementById('menuToggle');
  const previousPublicNotifications = document.getElementById('publicNotifications');
  if (previousPublicNotifications) previousPublicNotifications.remove();

  nav.innerHTML = '';
  nav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded','false');
  menuToggle.onclick=()=>{closePublicNotifications();setMobileNavigationOpen(!nav.classList.contains('is-open'));};
  if (!nav.dataset.keyboardReady) {
    document.addEventListener('keydown',event=>{if(event.key==='Escape') closeMobileNavigation();});
    nav.dataset.keyboardReady='true';
  }

  const parents = items
    .filter(item => !item.ParentID)
    .sort(
      (a, b) =>
        Number(a.DisplayOrder || 0) -
        Number(b.DisplayOrder || 0)
    );

  parents.forEach(parent => {

    const wrapper = document.createElement('div');
    wrapper.className = 'nav-item';

    const row = document.createElement('div');
    row.className = 'nav-item-row';

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = parent.Label;

    link.onclick = function(event) {
      event.preventDefault();
      handleNavigation(parent);
      closeMobileNavigation();
    };

    row.appendChild(link);

    const children = items
      .filter(item => item.ParentID === parent.ID)
      .sort(
        (a, b) =>
          Number(a.DisplayOrder || 0) -
          Number(b.DisplayOrder || 0)
      );

    if (children.length > 0) {

      const dropdown = document.createElement('div');
      dropdown.className = 'dropdown-menu';
      dropdown.id='submenu-'+String(parent.ID || parent.Slug || '').replace(/[^A-Za-z0-9_-]/g,'');

      const submenuToggle=document.createElement('button');
      submenuToggle.type='button';submenuToggle.className='submenu-toggle';
      submenuToggle.setAttribute('aria-controls',dropdown.id);submenuToggle.setAttribute('aria-expanded','false');
      submenuToggle.setAttribute('aria-label','Show '+parent.Label+' submenu');submenuToggle.textContent='⌄';
      submenuToggle.onclick=()=>{
        const open=!wrapper.classList.contains('submenu-open');
        nav.querySelectorAll('.nav-item.submenu-open').forEach(item=>{
          if(item!==wrapper){item.classList.remove('submenu-open');const button=item.querySelector('.submenu-toggle');if(button)button.setAttribute('aria-expanded','false');}
        });
        wrapper.classList.toggle('submenu-open',open);submenuToggle.setAttribute('aria-expanded',String(open));
      };
      row.appendChild(submenuToggle);

      children.forEach(child => {

        const childLink = document.createElement('a');

        childLink.href = '#';
        childLink.textContent = child.Label;

        childLink.onclick = function(event) {
          event.preventDefault();
          handleNavigation(child);
          closeMobileNavigation();
        };

        dropdown.appendChild(childLink);

      });

      wrapper.appendChild(dropdown);
    }

    wrapper.prepend(row);
    nav.appendChild(wrapper);
  });

  const publicNotifications = document.createElement('div');
  publicNotifications.id = 'publicNotifications';
  publicNotifications.className = 'public-notifications';
  publicNotifications.innerHTML = `
    <button type="button" class="public-notification-button" aria-label="Public notifications" aria-expanded="false" aria-controls="publicNotificationPanel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      <span class="public-notification-badge" hidden>0</span>
    </button>
    <div id="publicNotificationPanel" class="public-notification-panel" role="region" aria-label="Latest public notifications">
      <div class="public-notification-heading"><strong>Notifications</strong><span>Public updates</span></div>
      <div class="public-notification-list"><p class="public-notification-empty">Loading updates…</p></div>
      <a class="public-notification-all" href="#/announcements">View all announcements</a>
    </div>`;
  publicNotifications.querySelector('.public-notification-button').onclick = togglePublicNotifications;
  publicNotifications.querySelector('.public-notification-all').onclick = event => { event.preventDefault(); closePublicNotifications(); handleNavigation({Slug: 'announcements', Label: 'Announcements', ParentID: 'NAV-009'}); closeMobileNavigation(); };
  document.querySelector('.header-inner').appendChild(publicNotifications);

  const accountButton = document.createElement('button');
  accountButton.id = 'portalAccountButton';
  accountButton.type = 'button';
  accountButton.className = 'nav-account-button';
  const accountLabel=document.createElement('span');accountLabel.className='nav-account-label';accountLabel.textContent='Sign in';accountButton.appendChild(accountLabel);
  accountButton.onclick = () => {
    closeMobileNavigation();
    openPortalAccount();
  };
  nav.appendChild(accountButton);
  if (!nav.dataset.publicNotificationsReady) {
    document.addEventListener('click', event => { if (!event.target.closest('#publicNotifications')) closePublicNotifications(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closePublicNotifications(); });
    nav.dataset.publicNotificationsReady = 'true';
  }
  if(typeof initializePortalAccountState==='function')initializePortalAccountState();
}

function setPortalAccountButton(signedIn) {
  const button = document.getElementById('portalAccountButton');
  if (button) {
    let label=button.querySelector('.nav-account-label');
    if(!label){label=document.createElement('span');label.className='nav-account-label';button.prepend(label);}
    label.textContent=signedIn ? 'My account' : 'Sign in';
    if(!signedIn){const badge=button.querySelector('.nav-notification-badge');if(badge)badge.hidden=true;button.setAttribute('aria-label','Sign in');}
  }
}

function openPortalAccount(pending) {
  document.getElementById('homeHero').style.display = 'none';
  document.getElementById('homeExplore').style.display = 'none';
  document.getElementById('dynamicPage').style.display = 'none';
  document.getElementById('mdcatHub').hidden = false;
  window.location.hash = 'account';
  openUserAccount(pending);
}

function setMobileNavigationOpen(open) {
  const nav=document.getElementById('mainNavigation');const toggle=document.getElementById('menuToggle');
  nav.classList.toggle('is-open',Boolean(open));toggle.setAttribute('aria-expanded',String(Boolean(open)));
  if(!open){nav.querySelectorAll('.nav-item.submenu-open').forEach(item=>item.classList.remove('submenu-open'));nav.querySelectorAll('.submenu-toggle').forEach(button=>button.setAttribute('aria-expanded','false'));}
}

function closeMobileNavigation() { setMobileNavigationOpen(false); }

    function renderCategories(categories) {

      const grid =
        document.getElementById(
          'categoryGrid'
        );

      grid.innerHTML = '';

      const mainCategories =
        categories
          .filter(
            item =>
              !item.ParentCategory
          )
          .sort(
            (a, b) =>
              Number(a.DisplayOrder || 0) -
              Number(b.DisplayOrder || 0)
          );


      mainCategories.forEach(category => {

        const card =
          document.createElement('div');

        card.className = 'card category-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute('aria-label', 'Open ' + category.Name);

        const categoryVisuals = {
          'study': ['ST', 'Learning resources'],
          'entry-tests': ['ET', 'Test preparation'],
          'admissions': ['AD', 'Application guidance'],
          'scholarships': ['SC', 'Funding opportunities'],
          'career': ['CR', 'Career development'],
          'ai-smart-tools': ['AI', 'Smart productivity'],
          'community': ['CO', 'Student support'],
          'updates': ['UP', 'Latest information'],
          'islamic': ['IS', 'Faith and reflection'],
          'explore': ['EX', 'Discover more']
        };
        const visual = categoryVisuals[category.Slug] || ['IC', 'Student portal'];
        const top = document.createElement('div');
        top.className = 'category-card-top';
        const icon = document.createElement('span');
        icon.className = 'category-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = visual[0];
        const eyebrow = document.createElement('span');
        eyebrow.className = 'category-eyebrow';
        eyebrow.textContent = visual[1];
        top.append(icon, eyebrow);


        const title =
          document.createElement('h4');

        title.textContent =
          category.Name;


        const description =
          document.createElement('p');

        description.textContent =
          category.Description || '';


        const action = document.createElement('span');
        action.className = 'category-action';
        action.innerHTML = 'Explore <span aria-hidden="true">→</span>';

        card.append(top, title, description, action);

        card.onclick = function() {
          openCategory(category);
        };
        card.onkeydown = function(event) {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openCategory(category);
          }
        };

        grid.appendChild(card);

      });

    }




    function openCategory(category) {
      handleNavigation({Slug: category.Slug, Label: category.Name, TargetURL: category.TargetURL || ''});
    }

function resolveNavigationItem(item) {
  if (!item || !portalData || !Array.isArray(portalData.navigation)) return item || {};
  const navigation=portalData.navigation;
  let match=item.ID ? navigation.find(row=>String(row.ID)===String(item.ID)) : null;
  const candidates=navigation.filter(row=>String(row.Slug)===String(item.Slug));
  if(!match && item.ParentID)match=candidates.find(row=>String(row.ParentID)===String(item.ParentID));
  if(!match && candidates.length>1){
    const segments=String(item.TargetURL || window.location.hash || '').replace(/^#\/?/,'').split('/').filter(Boolean);
    const parentHint=segments.length>1?segments[segments.length-2]:'';
    match=candidates.find(row=>{
      const parent=navigation.find(parentRow=>String(parentRow.ID)===String(row.ParentID));
      return parent && parent.Slug===parentHint;
    });
  }
  if(!match)match=candidates[0];
  return match ? Object.assign({},match,item) : item;
}

function getNavigationParentSlug(item) {
  const resolved=resolveNavigationItem(item);
  if (!resolved || !resolved.ParentID || !portalData || !Array.isArray(portalData.navigation)) return '';
  const parent = portalData.navigation.find(row=>String(row.ID)===String(resolved.ParentID));
  return parent ? String(parent.Slug || '') : '';
}

function getNavigationTrail(item) {
  const navigation=portalData && Array.isArray(portalData.navigation)?portalData.navigation:[];
  const trail=[];let current=resolveNavigationItem(item);const visited=new Set();
  while(current && current.Slug && current.Slug!=='home' && !visited.has(String(current.ID || current.Slug))){
    trail.unshift(current);visited.add(String(current.ID || current.Slug));
    current=current.ParentID?navigation.find(row=>String(row.ID)===String(current.ParentID)):null;
  }
  return trail;
}

function renderPageBreadcrumb(item) {
  const breadcrumb=document.getElementById('pageBreadcrumb');
  if(!breadcrumb)return;
  breadcrumb.replaceChildren();
  const home=document.createElement('button');home.type='button';home.append(document.createTextNode('← Home'));home.onclick=()=>showHome();breadcrumb.appendChild(home);
  const trail=getNavigationTrail(item);
  trail.forEach((row,index)=>{
    const separator=document.createElement('span');separator.setAttribute('aria-hidden','true');separator.textContent='/';breadcrumb.appendChild(separator);
    const label=row.Label || row.Name || row.Slug;
    if(index===trail.length-1){const current=document.createElement('span');current.className='breadcrumb-current';current.setAttribute('aria-current','page');current.textContent=label;breadcrumb.appendChild(current);}
    else {const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>handleNavigation(row);breadcrumb.appendChild(button);}
  });
}

function portalRouteHash(item) {
  const trail=getNavigationTrail(item);
  const slugs=trail.map(row=>String(row.Slug || '')).filter(Boolean);
  if(!slugs.length && item && item.Slug)slugs.push(String(item.Slug));
  return '#/'+slugs.join('/');
}

function navigationItemForLocation() {
  if(!portalData || !Array.isArray(portalData.navigation))return null;
  const raw=decodeURIComponent(String(window.location.hash || '').replace(/^#\/?/,''));
  if(!raw)return {Slug:'home',Label:'Home'};
  if(raw==='account')return {Slug:'account',Label:'My account'};
  if(raw.startsWith('search='))return {Slug:'search',Query:raw.slice(7)};
  const segments=raw.split('/').filter(Boolean);const slug=segments[segments.length-1];const parentHint=segments.length>1?segments[segments.length-2]:'';
  const candidates=portalData.navigation.filter(row=>String(row.Slug)===slug);
  return candidates.find(row=>getNavigationParentSlug(row)===parentHint) || candidates[0] || null;
}

function navigatePortalLocation() {
  const item=navigationItemForLocation();if(!item)return;
  if(item.Slug==='home')return showHome({fromHistory:true});
  if(item.Slug==='account')return openPortalAccount();
  if(item.Slug==='search'){const input=document.getElementById('searchInput');input.value=item.Query || '';return portalSearch();}
  handleNavigation(item,{fromHistory:true});
}

window.addEventListener('popstate',()=>{if(portalInitialRouteApplied)navigatePortalLocation();});

function renderNavigationSection(parentSlug) {
  const content=document.getElementById('dynamicPageContent');
  const filters=document.getElementById('resourceFilters');
  filters.innerHTML='';filters.style.display='none';content.replaceChildren();
  const navigation=portalData && Array.isArray(portalData.navigation) ? portalData.navigation : [];
  const parent=navigation.find(row=>row.Slug===parentSlug && !row.ParentID);
  const children=parent ? navigation.filter(row=>String(row.ParentID)===String(parent.ID)) : [];
  children.sort((a,b)=>Number(a.DisplayOrder||0)-Number(b.DisplayOrder||0)).forEach(child=>{
    const card=document.createElement('article');card.className='card resource-card section-link-card';
    const meta=document.createElement('span');meta.className='section-link-meta';meta.textContent='ICP YOUTH CIRCLE';
    const heading=document.createElement('h4');heading.textContent=child.Label;
    const description=document.createElement('p');
    const category=portalData.categories && portalData.categories.find(row=>row.Slug===child.Slug);
    description.textContent=category && category.Description ? category.Description : 'Open '+child.Label+' from ICP YOUTH CIRCLE.';
    const button=document.createElement('button');button.type='button';button.className='resource-button';button.textContent='Open '+child.Label;
    button.onclick=()=>handleNavigation(child);card.append(meta,heading,description,button);content.appendChild(card);
  });
  if (!children.length) renderSectionNotice('No sections have been published here yet.');
}

function renderSectionNotice(message) {
  const filters=document.getElementById('resourceFilters');filters.innerHTML='';filters.style.display='none';
  const content=document.getElementById('dynamicPageContent');content.replaceChildren();
  const card=document.createElement('div');card.className='empty-state';
  const mark=document.createElement('span');mark.className='empty-state-mark';mark.setAttribute('aria-hidden','true');mark.textContent='○';
  const heading=document.createElement('h4');heading.textContent='Content is being prepared';
  const text=document.createElement('p');text.textContent=message;
  const action=document.createElement('button');action.type='button';action.className='empty-state-action';action.textContent='Return to home';action.onclick=showHome;
  card.append(mark,heading,text,action);content.appendChild(card);
}

function routeContains(item,fields,terms) {
  const text=fields.map(field=>String(item[field]||'').toLowerCase()).join(' ');
  return terms.some(term=>text.includes(term));
}

function renderAboutPage() {
  const settings=portalData && portalData.settings || {};
  const filters=document.getElementById('resourceFilters');filters.innerHTML='';filters.style.display='none';
  const content=document.getElementById('dynamicPageContent');content.replaceChildren();
  const panel=document.createElement('section');panel.className='about-panel';
  const intro=document.createElement('div');intro.className='about-intro';
  const eyebrow=document.createElement('p');eyebrow.className='about-eyebrow';eyebrow.textContent='OUR PURPOSE';
  const heading=document.createElement('h4');heading.textContent='Helping students move forward with confidence';
  const description=document.createElement('p');description.textContent=settings.site_description || 'ICP YOUTH CIRCLE is a student resource, opportunity, guidance and community platform.';
  intro.append(eyebrow,heading,description);
  const pillars=document.createElement('div');pillars.className='about-pillars';
  [
    ['01','Learn','Find study material, test preparation and practical guidance in one place.'],
    ['02','Connect','Reach student support, community features and trusted opportunities.'],
    ['03','Grow','Build knowledge, confidence and skills for education and career progress.']
  ].forEach(item=>{
    const card=document.createElement('article');card.className='about-pillar';
    const number=document.createElement('span');number.textContent=item[0];
    const title=document.createElement('h5');title.textContent=item[1];
    const text=document.createElement('p');text.textContent=item[2];
    card.append(number,title,text);pillars.appendChild(card);
  });
  panel.append(intro,pillars);content.appendChild(panel);
}

function createContactIcon(type) {
  const namespace='http://www.w3.org/2000/svg';
  const icon=document.createElement('span');
  icon.className='contact-icon contact-icon-'+type;
  icon.setAttribute('aria-hidden','true');
  const svg=document.createElementNS(namespace,'svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('focusable','false');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('stroke-linejoin','round');
  const add=(name,attributes)=>{
    const node=document.createElementNS(namespace,name);
    Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,value));
    svg.appendChild(node);
  };
  if(type==='email') {
    add('rect',{x:'3',y:'5',width:'18',height:'14',rx:'2'});
    add('path',{d:'m4 7 8 6 8-6'});
  } else if(type==='whatsapp') {
    add('path',{d:'M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2a8.5 8.5 0 1 1 15.6-4.7Z'});
    add('path',{d:'M8.2 7.8c.3-.5.6-.5.9-.5h.4c.2 0 .4.1.5.4l.8 2c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.5.9 1.3 1.7 2.2 2.2.2.1.4.2.6 0l.9-1.1c.2-.2.4-.3.7-.2l2 .9c.3.1.4.3.4.5 0 .4-.2 1.5-.7 2-.5.6-1.4.9-2.3.7-1.1-.2-2.7-.8-4.6-2.5-1.5-1.3-2.5-3-2.8-4.1-.3-1 .1-1.8.5-2.4Z'});
  } else if(type==='instagram') {
    add('rect',{x:'3',y:'3',width:'18',height:'18',rx:'5'});
    add('circle',{cx:'12',cy:'12',r:'4'});
    add('circle',{cx:'17.4',cy:'6.6',r:'.8',fill:'currentColor',stroke:'none'});
  } else if(type==='facebook') {
    add('path',{d:'M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.6.4-1 1-1Z',fill:'currentColor',stroke:'none'});
  } else if(type==='youtube') {
    add('rect',{x:'2.5',y:'5.5',width:'19',height:'13',rx:'4'});
    add('path',{d:'m10 9 5 3-5 3V9Z',fill:'currentColor',stroke:'none'});
  } else if(type==='linkedin') {
    add('rect',{x:'3',y:'3',width:'18',height:'18',rx:'2'});
    add('circle',{cx:'7.2',cy:'8',r:'1',fill:'currentColor',stroke:'none'});
    add('path',{d:'M7.2 11v6M11 17v-6m0 2.7c.7-1.7 5-2.2 5 1.3v2'});
  } else if(type==='x') {
    add('path',{d:'M5 4l14 16M19 4 5 20'});
  } else if(type==='tiktok') {
    add('path',{d:'M14 4v11.2a4.2 4.2 0 1 1-3.2-4.1'});
    add('path',{d:'M14 4c.5 2.4 2 4 5 4.5'});
  } else if(type==='telegram') {
    add('path',{d:'m3 11 17-7-5 16-4-6-4 3 1-5 9-5-11 4Z'});
  }
  icon.appendChild(svg);
  return icon;
}

function getRouteDescription(slug, label) {
  const descriptions={
    'study':'Access notes, past papers, MCQs, videos and study resources.',
    'entry-tests':'Prepare for major entry tests with focused information, practice and resources.',
    'admissions':'Find admission requirements, deadlines, merit information and application guidance.',
    'scholarships':'Discover scholarships, financial aid and guidance for stronger applications.',
    'career':'Explore career guidance, internships, competitions and student development opportunities.',
    'ai-smart-tools':'Use practical AI and digital tools to study, plan and work more effectively.',
    'community':'Connect with student support, contribute useful resources and share suggestions.',
    'updates':'Stay informed about exams, results, merit lists and important student notices.',
    'islamic':'Read carefully presented Islamic reminders, hadith and duas for daily reflection.',
    'explore':'Discover study-abroad guidance, articles, information about us and official contact channels.',
    'about':'Learn about the purpose and student-focused direction of ICP YOUTH CIRCLE.',
    'contact':'Contact ICP YOUTH CIRCLE through an official communication channel.',
    'notes':'Browse published study notes by subject and level.',
    'past-papers':'Find published past papers to support focused exam preparation.',
    'mcqs':'Practice published multiple-choice questions and check your understanding.',
    'videos':'Explore selected educational videos and learning material.',
    'submit-resource':'Recommend a useful student resource for administrator review.',
    'student-help-desk':'Send a question or request support from the portal administrators.',
    'suggestions':'Share a suggestion to help improve the student portal.'
  };
  return descriptions[slug] || 'Find published '+label.toLowerCase()+' information and resources from ICP YOUTH CIRCLE.';
}

function renderContactPage() {
  const settings=portalData && portalData.settings || {};
  const content=document.getElementById('dynamicPageContent');
  const filters=document.getElementById('resourceFilters');
  filters.innerHTML='';filters.style.display='none';content.replaceChildren();
  const panel=document.createElement('section');panel.className='contact-panel';
  const intro=document.createElement('div');intro.className='contact-intro';
  const eyebrow=document.createElement('p');eyebrow.className='contact-eyebrow';eyebrow.textContent='GET IN TOUCH';
  const heading=document.createElement('h4');heading.textContent='We are here to help';
  const description=document.createElement('p');description.textContent='Choose the official ICP YOUTH CIRCLE channel that suits you best.';
  intro.append(eyebrow,heading,description);panel.appendChild(intro);
  const cards=document.createElement('div');cards.className='contact-grid';
  const addCard=(label,detail,href,iconType)=>{
    if(!detail || !href)return;
    const card=document.createElement('article');card.className='contact-card';
    const mark=createContactIcon(iconType);
    const body=document.createElement('div');
    const title=document.createElement('h5');title.textContent=label;
    const link=document.createElement('a');link.href=href;link.textContent=detail;link.className='contact-link';
    if(/^https?:/i.test(href)){link.target='_blank';link.rel='noopener noreferrer';}
    body.append(title,link);card.append(mark,body);cards.appendChild(card);
  };
  const email=String(settings.contact_email || '').trim();
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))addCard('Email','Send us an email','mailto:'+email,'email');
  const whatsapp=safePortalURL(settings.whatsapp_channel);
  addCard('WhatsApp channel','Follow our WhatsApp updates',whatsapp,'whatsapp');
  const instagram=safePortalURL(settings.instagram_url);
  addCard('Instagram','Follow ICP YOUTH CIRCLE',instagram,'instagram');
  [
    ['Facebook','Follow us on Facebook','facebook_url','facebook'],
    ['YouTube','Watch us on YouTube','youtube_url','youtube'],
    ['LinkedIn','Connect with us on LinkedIn','linkedin_url','linkedin'],
    ['X','Follow us on X','x_url','x'],
    ['TikTok','Follow us on TikTok','tiktok_url','tiktok'],
    ['Telegram','Join us on Telegram','telegram_url','telegram']
  ].forEach(([label,detail,key,iconType])=>{
    const fallback=key==='x_url' ? settings.twitter_url : '';
    addCard(label,detail,safePortalURL(settings[key] || fallback),iconType);
  });
  if(!cards.children.length){
    const empty=document.createElement('p');empty.className='contact-empty';empty.textContent='Official contact details have not been published yet.';panel.appendChild(empty);
  }else panel.appendChild(cards);
  content.appendChild(panel);
}

function publicFormToken() {
  const key='icp-public-form-token';
  try {
    let token=localStorage.getItem(key);
    if (/^[A-Za-z0-9_-]{20,80}$/.test(token || '')) return token;
    const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
    token=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(key,token);return token;
  } catch (_) {
    return String(Date.now())+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  }
}

async function submitPublicPortalForm(action, values) {
  const response=await fetch(API_BASE_URL,{
    method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(Object.assign({action:action,submissionToken:publicFormToken()},values))
  });
  if (!response.ok) throw new Error('The portal service could not be reached.');
  const result=await response.json();
  if (!result.success) throw new Error(result.error && result.error.message ? result.error.message : 'Unable to submit the form.');
  return result.data;
}

function publicFormField(label, name, type, required, options) {
  const wrapper=document.createElement('label');wrapper.className='portal-form-field';
  const title=document.createElement('span');title.textContent=label+(required?' *':'');wrapper.appendChild(title);
  let input;
  if (type==='textarea') { input=document.createElement('textarea');input.rows=5; }
  else if (type==='select') {
    input=document.createElement('select');
    const empty=document.createElement('option');empty.value='';empty.textContent='Select one';input.appendChild(empty);
    options.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;input.appendChild(option);});
  } else { input=document.createElement('input');input.type=type; }
  input.name=name;input.required=required;input.autocomplete=name==='email'?'email':name==='name'?'name':'off';
  wrapper.appendChild(input);return wrapper;
}

function renderPublicPortalForm(kind) {
  const content=document.getElementById('dynamicPageContent');
  const filters=document.getElementById('resourceFilters');filters.innerHTML='';filters.style.display='none';content.replaceChildren();
  const resource=kind==='resource';
  const card=document.createElement('article');card.className='card portal-form-card';
  const intro=document.createElement('p');
  intro.textContent=resource ? 'Share a useful, legal student resource for administrator review. Submitting it does not publish it automatically.' : 'Send a question or support request to the ICP YOUTH CIRCLE administrators. Do not include passwords, identity documents or payment details.';
  const form=document.createElement('form');form.className='portal-form';form.noValidate=false;
  const fields=resource ? [
    ['Your name','name','text',true],['Email','email','email',true],['Resource title','title','text',true],
    ['Resource type','resourceType','select',true,['Notes','Past Paper','Book','Video','Course','Website','Tool','Other']],
    ['Subject','subject','text',false],['Level or class','level','text',false],['Resource link','url','url',true],
    ['Why is this useful?','description','textarea',false]
  ] : [
    ['Your name','name','text',true],['Email','email','email',true],
    ['Request type','requestType','select',true,['Resource request','Study guidance','Portal problem','Correction','Suggestion','Other']],
    ['Subject','subject','text',true],['How can we help?','message','textarea',true]
  ];
  fields.forEach(field=>form.appendChild(publicFormField(field[0],field[1],field[2],field[3],field[4] || [])));
  const trap=document.createElement('label');trap.className='portal-form-trap';trap.setAttribute('aria-hidden','true');trap.textContent='Website';
  const trapInput=document.createElement('input');trapInput.name='website';trapInput.tabIndex=-1;trapInput.autocomplete='off';trap.appendChild(trapInput);form.appendChild(trap);
  const consent=document.createElement('label');consent.className='portal-form-consent';
  const consentInput=document.createElement('input');consentInput.type='checkbox';consentInput.required=true;
  consent.append(consentInput,document.createTextNode(resource ? ' I confirm this link is safe to review and I have permission to share it.' : ' I agree that administrators may use my email to respond to this request.'));
  const submit=document.createElement('button');submit.type='submit';submit.className='resource-button';submit.textContent=resource?'Send for review':'Send request';
  const status=document.createElement('p');status.className='portal-form-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  form.append(consent,submit,status);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!form.reportValidity()) return;
    submit.disabled=true;status.className='portal-form-status';status.textContent='Sending…';
    const values=Object.fromEntries(new FormData(form).entries());
    try {
      const result=await submitPublicPortalForm(resource?'publicSubmitResource':'publicHelpRequest',values);
      form.reset();status.className='portal-form-status portal-form-success';
      status.textContent=(resource?'Resource submitted':'Request submitted')+' successfully. Reference: '+result.id+'.';
    } catch(error) { status.className='portal-form-status portal-form-error';status.textContent=error.message || 'Unable to submit the form.'; }
    finally { submit.disabled=false; }
  });
  card.append(intro,form);content.appendChild(card);
}

function handleNavigation(item,options={}) {

  navigationVersion += 1;
  closeMDCATHub();
  document.getElementById('mdcatEntryLink').hidden = true;
  item=resolveNavigationItem(item);

  if (item.Slug === 'mdcat' || item.Slug === 'mdcat-2027') {
    openMDCATHub(options);
    return;
  }

  if (item.Slug === 'home') {
    showHome(options);
    return;
  }

  const title =
    document.getElementById('dynamicPageTitle');

  const description =
    document.getElementById('dynamicPageDescription');

  const content =
    document.getElementById('dynamicPageContent');

  const itemLabel=item.Label || item.Name || 'Portal';
  const parentSlug=getNavigationParentSlug(item);
  title.textContent = itemLabel;

  description.textContent = getRouteDescription(item.Slug, itemLabel);
  renderPageBreadcrumb(item);

  content.innerHTML = '';

const resourceCategories = {
  'notes': 'Notes',
  'past-papers': 'Past Papers',
  'study-resources': 'Study Resources'
};

if (resourceCategories[item.Slug]) {
  loadResourcesByCategory(
    resourceCategories[item.Slug]
  );
} else if (item.Slug === 'mcqs') {
  loadMCQs();
} else if (item.Slug === 'videos') {
  loadVideos();
} else if (['admissions','college-admissions','university-admissions','eligibility','deadlines','admission-guides'].includes(item.Slug) || (item.Slug==='merit-lists'&&parentSlug==='admissions')) {
  loadAdmissions(item.Slug,parentSlug);
} else if (['scholarships','pakistan-scholarships','international-scholarships','financial-aid','scholarship-guides'].includes(item.Slug)) {
  loadScholarships(item.Slug);
} else if (['career','career-guidance','internships','competitions','student-programs','portfolio-guidance','mentors'].includes(item.Slug)) {
  loadOpportunities(item.Slug);
} else if (
  item.Slug === 'updates' ||
  item.Slug === 'announcements' || item.Slug === 'exam-updates' || item.Slug === 'results' ||
  item.Slug === 'important-notices' || (item.Slug === 'merit-lists' && parentSlug === 'updates')
) {
  loadAnnouncements(item.Slug,parentSlug);
} else if (
  item.Slug === 'ai-smart-tools' ||
  item.Slug === 'ai-tools' || item.Slug === 'ai-assistant' || item.Slug === 'smart-tools' || item.Slug === 'study-tools'
) {
  loadAITools(item.Slug);
} else if (
  item.Slug === 'islamic' ||
  item.Slug === 'hadith' ||
  item.Slug === 'islamic-reminders' ||
  item.Slug === 'duas-motivation'
) {
  loadIslamicContent(item.Slug);
} else if (item.Slug === 'blog' || item.Slug === 'study-abroad') {
  loadBlog(item.Slug);
} else if (
  item.Slug === 'entry-tests' ||
  item.Slug === 'mdcat-info' ||
  item.Slug === 'nums' ||
  item.Slug === 'etea' ||
  item.Slug === 'ecat' ||
  item.Slug === 'nust-net' ||
  item.Slug === 'other-tests'
) {
  loadEntryTests(item.Slug === 'mdcat-info' ? 'mdcat' : item.Slug);
} else if (['study','community','explore'].includes(item.Slug)) {
  renderNavigationSection(item.Slug);
} else if (item.Slug === 'about') {
  renderAboutPage();
} else if (item.Slug === 'contact') {
  renderContactPage();
} else if (item.Slug === 'prep-tracker') {
  renderSectionNotice('No public preparation tracker has been published yet. MDCAT students can use My activity and Study plan inside the MDCAT 2027 hub.');
} else if (item.Slug === 'submit-resource') {
  renderPublicPortalForm('resource');
} else if (item.Slug === 'student-help-desk' || item.Slug === 'suggestions') {
  renderPublicPortalForm('help');
} else if (item.Slug === 'forum') {
  renderSectionNotice(itemLabel+' is not publicly available yet. An official link will appear here when it is published.');
} else {
  renderSectionNotice('No published content is available in '+itemLabel+' yet.');
}

  document.getElementById(
    'homeHero'
  ).style.display = 'none';

  document.getElementById(
    'homeExplore'
  ).style.display = 'none';

  document.getElementById(
    'dynamicPage'
  ).style.display = 'block';

  if(!options.fromHistory){
    const target=portalRouteHash(item);
    if(window.location.hash!==target)history.pushState({portal:true},'',target);
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
function showHome(options={}) {

  navigationVersion += 1;
  closeMDCATHub();

  document.getElementById(
    'dynamicPage'
  ).style.display = 'none';

  document.getElementById(
    'homeHero'
  ).style.display = 'block';

  document.getElementById(
    'homeExplore'
  ).style.display = 'block';

  if(!options.fromHistory && (window.location.hash || window.location.search)) history.pushState({portal:true},'',window.location.pathname);

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
function loadResourcesByCategory(categoryName) {
  const requestVersion = navigationVersion;

  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML =
    '<p>Loading resources...</p>';

loadPublicModule('resources', {category: categoryName})
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderResourceCards(data);
  })
  .catch(error => {
    console.error(
      'Resources error:',
      error
    );

  if (requestVersion === navigationVersion) showResourceError(error);
  });
  }

function renderResourceCards(resources) {

  currentResources = resources || [];

  buildResourceFilters(currentResources);

  displayFilteredResources();
}
function buildResourceFilters(resources) {

  const container =
    document.getElementById('resourceFilters');

  if (!resources || resources.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'grid';

  const levels =
    getUniqueValues(resources, 'Level');

  const subjects =
    getUniqueValues(resources, 'Subject');

  const years =
    getUniqueValues(resources, 'Year');

  const institutions =
    getUniqueValues(resources, 'Institution');

  container.innerHTML = `
    ${createFilterSelect(
      'filterLevel',
      'All Levels',
      levels
    )}

    ${createFilterSelect(
      'filterSubject',
      'All Subjects',
      subjects
    )}

    ${createFilterSelect(
      'filterYear',
      'All Years',
      years
    )}

    ${createFilterSelect(
      'filterInstitution',
      'All Institutions',
      institutions
    )}
  `;

  container
    .querySelectorAll('select')
    .forEach(select => {

      select.addEventListener(
        'change',
        displayFilteredResources
      );

    });
}
function getUniqueValues(resources, field) {

  return [
    ...new Set(
      resources
        .map(item =>
          String(item[field] || '').trim()
        )
        .filter(Boolean)
    )
  ].sort();
}
function createFilterSelect(
  id,
  defaultLabel,
  values
) {

  const options = values
    .map(value =>
      `<option value="${escapeHtml(value)}">
        ${escapeHtml(value)}
      </option>`
    )
    .join('');

  return `
    <select id="${id}">
      <option value="">
        ${defaultLabel}
      </option>
      ${options}
    </select>
  `;
}
function displayFilteredResources() {

  const level =
    document.getElementById('filterLevel')
      ?.value || '';

  const subject =
    document.getElementById('filterSubject')
      ?.value || '';

  const year =
    document.getElementById('filterYear')
      ?.value || '';

  const institution =
    document.getElementById(
      'filterInstitution'
    )?.value || '';

  const filtered =
    currentResources.filter(resource => {

      return (
        (!level ||
          resource.Level === level) &&

        (!subject ||
          resource.Subject === subject) &&

        (!year ||
          String(resource.Year) === year) &&

        (!institution ||
          resource.Institution === institution)
      );

    });

  drawResourceCards(filtered);
}

function drawResourceCards(resources) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!resources || resources.length === 0) {

    content.innerHTML =
      '<p>No matching resources found.</p>';

    return;
  }

  resources.forEach(resource => {

    const card =
      document.createElement('div');

    card.className =
      'card resource-card';


    const resourceThumbnailURL=safePortalURL(resource.ThumbnailURL);
    if (resourceThumbnailURL) {

      const image =
        document.createElement('img');

      image.src = resourceThumbnailURL;
      image.loading = 'lazy';
      image.decoding = 'async';

      image.alt =
        resource.Title || 'Resource';

      image.className =
        'resource-thumbnail';

      card.appendChild(image);
    }


    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';


    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';


    if (resource.ResourceType) {

      const typeBadge =
        document.createElement('span');

      typeBadge.className =
        'resource-badge';

      typeBadge.textContent =
        resource.ResourceType;

      badges.appendChild(typeBadge);
    }


    if (
      String(resource.Featured)
        .toLowerCase() === 'yes'
    ) {

      const featured =
        document.createElement('span');

      featured.className =
        'resource-badge featured-badge';

      featured.textContent =
        'Featured';

      badges.appendChild(featured);
    }


    if (badges.children.length > 0) {
      body.appendChild(badges);
    }


    const title =
      document.createElement('h4');

    title.textContent =
      resource.Title ||
      'Untitled Resource';

    body.appendChild(title);


    if (resource.Description) {

      const description =
        document.createElement('p');

      description.textContent =
        resource.Description;

      body.appendChild(description);
    }


    const meta =
      document.createElement('div');

    meta.className =
      'resource-meta';

    meta.textContent = [
      resource.Subject,
      resource.Level,
      resource.Institution,
      resource.Year
    ]
      .filter(Boolean)
      .join(' • ');

    if (meta.textContent) {
      body.appendChild(meta);
    }


    const resourceFileURL=safePortalURL(resource.FileURL);
    if (resourceFileURL) {

      const link =
        document.createElement('a');

      link.href = resourceFileURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      const isPdf=String(resource.ResourceType || '').trim().toLowerCase()==='pdf';
      link.textContent = isPdf ? 'View PDF' : 'Open Resource';

      link.className =
        'resource-button';

      body.appendChild(link);

      const downloadURL=isPdf ? googleDriveDownloadURL(resourceFileURL) : '';
      if (downloadURL) {
        const download=document.createElement('a');
        download.href=downloadURL;download.target='_blank';download.rel='noopener noreferrer';
        download.textContent='Download PDF';download.className='resource-button';
        body.appendChild(download);
      }
    }

    const bookmark=document.createElement('button');
    const bookmarked=isPortalResourceBookmarked(resource);
    bookmark.type='button';bookmark.className='resource-button';bookmark.textContent=bookmarked?'Saved ✓':'Save resource';
    bookmark.setAttribute('aria-pressed',String(bookmarked));bookmark.onclick=()=>togglePortalResourceBookmark(resource,bookmark);
    body.appendChild(bookmark);


    card.appendChild(body);

    content.appendChild(card);

  });
}
function escapeHtml(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showResourceError(error) {
  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML =
    '<p>Unable to load resources right now.</p>';

  console.error(error);
}
function loadMCQs() {
  const requestVersion = navigationVersion;

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading MCQs...</p>';

 loadPublicModule('mcqs')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderMCQs(data);
  })
  .catch(error => {
    console.error(
      'MCQ error:',
      error
    );

  if (requestVersion === navigationVersion) showMCQError(error);
  });
  }

function renderMCQs(mcqs) {

  currentMCQs = mcqs || [];

  buildMCQFilters(currentMCQs);

  addMockTestButton();

  displayFilteredMCQs();
}
function addMockTestButton() {

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  if (!filters) {
    return;
  }

  let button =
    document.getElementById(
      'startMockTestButton'
    );

  if (button) {
    return;
  }

  button =
    document.createElement('button');

  button.id =
    'startMockTestButton';

  button.type =
    'button';

  button.textContent =
    'Start Mock Test';

  button.style.padding =
    '11px 16px';

  button.style.border =
    'none';

  button.style.borderRadius =
    '8px';

  button.style.background =
    '#991b2f';

  button.style.color =
    '#ffffff';

  button.style.fontWeight =
    'bold';

  button.style.cursor =
    'pointer';

  button.onclick =
    startMockTest;

  filters.appendChild(button);
}
function startMockTest() {

  if (!activeQuizMCQs.length) {
    alert(
      'No MCQs are available for this mock test.'
    );
    return;
  }

  mockTestActive = true;
  mockTestSubmitted = false;
  mockTestAnswers = {};

  currentMCQIndex = 0;
  mcqScore = 0;
  mcqAnswered = 0;

  drawMCQs(activeQuizMCQs);
}
function buildMCQFilters(mcqs) {

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  if (!mcqs || mcqs.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const subjects =
    getUniqueValues(mcqs, 'Subject');

  const levels =
    getUniqueValues(mcqs, 'Level');

  const entryTests =
    getUniqueValues(mcqs, 'EntryTest');

  const difficulties =
    getUniqueValues(mcqs, 'Difficulty');

  filters.innerHTML = `
    ${createFilterSelect(
      'mcqSubject',
      'All Subjects',
      subjects
    )}

    ${createFilterSelect(
      'mcqLevel',
      'All Levels',
      levels
    )}

    ${createFilterSelect(
      'mcqEntryTest',
      'All Entry Tests',
      entryTests
    )}

    ${createFilterSelect(
      'mcqDifficulty',
      'All Difficulties',
      difficulties
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {

      select.addEventListener(
        'change',
        displayFilteredMCQs
      );

    });
}
function displayFilteredMCQs() {

  const subject =
    document.getElementById(
      'mcqSubject'
    )?.value || '';

  const level =
    document.getElementById(
      'mcqLevel'
    )?.value || '';

  const entryTest =
    document.getElementById(
      'mcqEntryTest'
    )?.value || '';

  const difficulty =
    document.getElementById(
      'mcqDifficulty'
    )?.value || '';

  const filtered =
    currentMCQs.filter(mcq => {

      return (
        (!subject ||
          mcq.Subject === subject) &&

        (!level ||
          mcq.Level === level) &&

        (!entryTest ||
          mcq.EntryTest === entryTest) &&

        (!difficulty ||
          mcq.Difficulty === difficulty)
      );

    });

activeQuizMCQs = filtered;
currentMCQIndex = 0;
mcqScore = 0;
mcqAnswered = 0;

drawMCQs(activeQuizMCQs);
}
function drawMCQs(mcqs) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!mcqs || mcqs.length === 0) {

    content.innerHTML =
      '<p>No MCQs are available yet.</p>';

    return;
  }

  if (currentMCQIndex < 0) {
    currentMCQIndex = 0;
  }

  if (currentMCQIndex >= mcqs.length) {
    currentMCQIndex = mcqs.length - 1;
  }

  const mcq = mcqs[currentMCQIndex];

  const topBar =
    document.createElement('div');

  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  topBar.style.alignItems = 'center';
  topBar.style.gap = '12px';
  topBar.style.marginBottom = '20px';
  topBar.style.flexWrap = 'wrap';


  const counter =
    document.createElement('div');

  counter.style.fontWeight = 'bold';

  counter.textContent =
    'Question ' +
    (currentMCQIndex + 1) +
    ' of ' +
    mcqs.length;


  const scoreBox =
    document.createElement('div');

  scoreBox.id = 'mcqScoreBox';

  scoreBox.style.fontWeight = 'bold';

  scoreBox.textContent =
    'Score: ' +
    mcqScore +
    ' / ' +
    mcqAnswered;


  topBar.appendChild(counter);
  topBar.appendChild(scoreBox);

  content.appendChild(topBar);


  const card =
    document.createElement('div');

  card.className = 'card';

  card.style.cursor = 'default';


  const question =
    document.createElement('h4');

  question.textContent =
    mcq.Question || 'Question';

  card.appendChild(question);


  const meta =
    document.createElement('p');

  meta.textContent = [
    mcq.Subject,
    mcq.Topic,
    mcq.Level,
    mcq.EntryTest,
    mcq.Difficulty
  ]
    .filter(Boolean)
    .join(' • ');

  if (meta.textContent) {
    card.appendChild(meta);
  }


  const optionsContainer =
    document.createElement('div');

  optionsContainer.style.marginTop = '18px';


  const options = [
    ['A', mcq.OptionA],
    ['B', mcq.OptionB],
    ['C', mcq.OptionC],
    ['D', mcq.OptionD]
  ];


  const feedback =
    document.createElement('div');

  feedback.style.marginTop = '16px';
  feedback.style.fontWeight = 'bold';


  const explanation =
    document.createElement('div');

  explanation.style.marginTop = '10px';
  explanation.style.display = 'none';


  options.forEach(([letter, text]) => {

    if (!text) {
      return;
    }

    const button =
      document.createElement('button');

    button.type = 'button';

    button.textContent =
      letter + '. ' + text;

    button.style.display = 'block';
    button.style.width = '100%';
    button.style.textAlign = 'left';
    button.style.margin = '8px 0';
    button.style.padding = '12px';
    button.style.border =
      '1px solid #dbe0e6';
    button.style.borderRadius = '8px';
    button.style.background = '#ffffff';
    button.style.cursor = 'pointer';


    button.onclick = function() {

      const allButtons =
        optionsContainer
          .querySelectorAll('button');

      allButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'default';
      });


      const correct =
        String(
          mcq.CorrectOption || ''
        )
          .trim()
          .toUpperCase();


      mcqAnswered++;

      if (letter === correct) {
        mcqScore++;
      }


      if (letter === correct) {

        feedback.textContent =
          'Correct answer.';

        button.style.background =
          '#dcfce7';

        button.style.borderColor =
          '#16a34a';

      } else {

        feedback.textContent =
          'Incorrect answer.';

        button.style.background =
          '#fee2e2';

        button.style.borderColor =
          '#dc2626';


        allButtons.forEach(btn => {

          if (
            btn.textContent
              .startsWith(
                correct + '.'
              )
          ) {

            btn.style.background =
              '#dcfce7';

            btn.style.borderColor =
              '#16a34a';
          }

        });
      }


      const currentScoreBox =
        document.getElementById(
          'mcqScoreBox'
        );

      if (currentScoreBox) {
        currentScoreBox.textContent =
          'Score: ' +
          mcqScore +
          ' / ' +
          mcqAnswered;
      }


      if (mcq.Explanation) {

        explanation.textContent =
          'Explanation: ' +
          mcq.Explanation;

        explanation.style.display =
          'block';
      }

    };


    optionsContainer.appendChild(
      button
    );
  });


  card.appendChild(optionsContainer);
  card.appendChild(feedback);
  card.appendChild(explanation);

  content.appendChild(card);


  const controls =
    document.createElement('div');

  controls.style.display = 'flex';
  controls.style.justifyContent = 'space-between';
  controls.style.gap = '10px';
  controls.style.marginTop = '20px';
  controls.style.flexWrap = 'wrap';


  const previousButton =
    document.createElement('button');

  previousButton.textContent =
    '← Previous';

  previousButton.disabled =
    currentMCQIndex === 0;

  previousButton.onclick = function() {

    if (currentMCQIndex > 0) {
      currentMCQIndex--;
      drawMCQs(activeQuizMCQs);
    }
  };


  const restartButton =
    document.createElement('button');

  restartButton.textContent =
    'Restart Quiz';

  restartButton.onclick = function() {

    currentMCQIndex = 0;
    mcqScore = 0;
    mcqAnswered = 0;

    drawMCQs(activeQuizMCQs);
  };


  const nextButton =
    document.createElement('button');

  nextButton.textContent =
    'Next →';

  nextButton.disabled =
    currentMCQIndex ===
    mcqs.length - 1;

  nextButton.onclick = function() {

    if (
      currentMCQIndex <
      mcqs.length - 1
    ) {

      currentMCQIndex++;

      drawMCQs(activeQuizMCQs);
    }
  };
  const submitMockButton =
  document.createElement('button');

submitMockButton.textContent =
  'Submit Mock Test';

submitMockButton.style.display =
  mockTestActive
    ? 'inline-block'
    : 'none';

submitMockButton.onclick = function() {
  submitMockTest();
};


  [
  previousButton,
  restartButton,
  nextButton,
  submitMockButton
]
    .forEach(button => {

      button.style.padding = '10px 16px';
      button.style.border =
        '1px solid #dbe0e6';
      button.style.borderRadius = '8px';
      button.style.background = '#ffffff';
      button.style.cursor =
        button.disabled
          ? 'default'
          : 'pointer';

    });


  controls.appendChild(previousButton);
  controls.appendChild(restartButton);
  controls.appendChild(nextButton);
  controls.appendChild(submitMockButton);

  content.appendChild(controls);
}
function submitMockTest() {

  mockTestSubmitted = true;
  mockTestActive = false;

  const total =
    activeQuizMCQs.length;

  const correct =
    mcqScore;

  const answered =
    mcqAnswered;

  const incorrect =
    answered - correct;

  const unanswered =
    total - answered;

  const percentage =
    total > 0
      ? Math.round(
          (correct / total) * 100
        )
      : 0;

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = `
    <div class="card">
      <h3>Mock Test Result</h3>

      <p>
        Score:
        <strong>${correct} / ${total}</strong>
      </p>

      <p>
        Percentage:
        <strong>${percentage}%</strong>
      </p>

      <p>
        Correct:
        <strong>${correct}</strong>
      </p>

      <p>
        Incorrect:
        <strong>${incorrect}</strong>
      </p>

      <p>
        Unanswered:
        <strong>${unanswered}</strong>
      </p>

      <button
        type="button"
        onclick="restartMockTest()"
        style="
          margin-top:15px;
          padding:10px 16px;
          border:none;
          border-radius:8px;
          background:#991b2f;
          color:white;
          font-weight:bold;
          cursor:pointer;
        ">
        Restart Mock Test
      </button>
    </div>
  `;
}
function restartMockTest() {

  mockTestActive = true;
  mockTestSubmitted = false;
  mockTestAnswers = {};

  currentMCQIndex = 0;
  mcqScore = 0;
  mcqAnswered = 0;

  drawMCQs(activeQuizMCQs);
}
function showMCQError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load MCQs right now.</p>';

  console.error(error);
}
function loadVideos() {
  const requestVersion = navigationVersion;

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading videos...</p>';

loadPublicModule('videos')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderVideos(data);
  })
  .catch(error => {
    console.error(
      'Videos error:',
      error
    );

  if (requestVersion === navigationVersion) showVideoError(error);
  });
  }

function renderVideos(videos) {

  currentVideos = videos || [];

  buildVideoFilters(currentVideos);

  displayFilteredVideos();
}
function buildVideoFilters(videos) {

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  if (!videos || videos.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const subjects =
    getUniqueValues(videos, 'Subject');

  const levels =
    getUniqueValues(videos, 'Level');

  const categories =
    getUniqueValues(videos, 'Category');

  const platforms =
    getUniqueValues(videos, 'Platform');

  filters.innerHTML = `
    ${createFilterSelect(
      'videoSubject',
      'All Subjects',
      subjects
    )}

    ${createFilterSelect(
      'videoLevel',
      'All Levels',
      levels
    )}

    ${createFilterSelect(
      'videoCategory',
      'All Categories',
      categories
    )}

    ${createFilterSelect(
      'videoPlatform',
      'All Platforms',
      platforms
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {

      select.addEventListener(
        'change',
        displayFilteredVideos
      );

    });
}
function displayFilteredVideos() {

  const subject =
    document.getElementById(
      'videoSubject'
    )?.value || '';

  const level =
    document.getElementById(
      'videoLevel'
    )?.value || '';

  const category =
    document.getElementById(
      'videoCategory'
    )?.value || '';

  const platform =
    document.getElementById(
      'videoPlatform'
    )?.value || '';

  const filtered =
    currentVideos.filter(video => {

      return (
        (!subject ||
          video.Subject === subject) &&

        (!level ||
          video.Level === level) &&

        (!category ||
          video.Category === category) &&

        (!platform ||
          video.Platform === platform)
      );

    });

  drawVideoCards(filtered);
}
function drawVideoCards(videos) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!videos || videos.length === 0) {
    content.innerHTML =
      '<p>No matching videos found.</p>';
    return;
  }

  videos.forEach(video => {

    const card =
      document.createElement('div');

    card.className =
      'card resource-card';

    const videoThumbnailURL=safePortalURL(video.ThumbnailURL);
    if (videoThumbnailURL) {

      const image =
        document.createElement('img');

      image.src = videoThumbnailURL;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = video.Title || 'Video';
      image.className = 'resource-thumbnail';

      card.appendChild(image);
    }

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const badges =
  document.createElement('div');

badges.className =
  'resource-badges';

if (video.Platform) {

  const platformBadge =
    document.createElement('span');

  platformBadge.className =
    'resource-badge';

  platformBadge.textContent =
    video.Platform;

  badges.appendChild(platformBadge);
}

if (
  String(video.Featured || '')
    .toLowerCase() === 'yes'
) {

  const featuredBadge =
    document.createElement('span');

  featuredBadge.className =
    'resource-badge featured-badge';

  featuredBadge.textContent =
    'Featured';

  badges.appendChild(featuredBadge);
}

if (badges.children.length > 0) {
  body.appendChild(badges);
}

    const title =
      document.createElement('h4');

    title.textContent =
      video.Title || 'Untitled Video';

    body.appendChild(title);

    const meta =
      document.createElement('div');

    meta.className =
      'resource-meta';

    meta.textContent = [
      video.Subject,
      video.Level,
      video.Platform,
      video.Duration
    ]
      .filter(Boolean)
      .join(' • ');

    if (meta.textContent) {
      body.appendChild(meta);
    }

    if (video.Description) {

      const description =
        document.createElement('p');

      description.textContent =
        video.Description;

      description.style.marginTop = '12px';

      body.appendChild(description);
    }

    const videoURL=safePortalURL(video.VideoURL);
    if (videoURL) {

      const link =
        document.createElement('a');

      link.href = videoURL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Watch Video';
      link.className = 'resource-button';

      body.appendChild(link);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showVideoError(error) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load videos right now.</p>';

  console.error(error);
}
function loadAdmissions(slug='admissions',parentSlug='') {
  const requestVersion=navigationVersion;

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading admissions...</p>';

loadPublicModule('admissions')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderAdmissions(filterAdmissionsForRoute(data,slug,parentSlug));
  })
  .catch(error => {
    console.error(
      'Admissions error:',
      error
    );

  if (requestVersion === navigationVersion) showAdmissionsError(error);
  });
  }

function filterAdmissionsForRoute(items,slug,parentSlug) {
  if (slug==='college-admissions') return items.filter(item=>routeContains(item,['DegreeLevel','AdmissionType','Institution','Program'],['college','intermediate','fsc']));
  if (slug==='university-admissions') return items.filter(item=>routeContains(item,['DegreeLevel','AdmissionType','Institution','Program'],['university','bachelor','undergraduate','graduate','master','phd']));
  if (slug==='eligibility') return items.filter(item=>String(item.Eligibility||'').trim());
  if (slug==='deadlines') return items.filter(item=>String(item.Deadline||'').trim());
  if (slug==='merit-lists'&&parentSlug==='admissions') return items.filter(item=>String(item.MeritListDate||'').trim());
  if (slug==='admission-guides') return items.filter(item=>routeContains(item,['Program','AdmissionType','Description'],['guide','application','how to apply']));
  return items;
}

function loadScholarships(slug='scholarships') {
  const requestVersion=navigationVersion;
  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading scholarships...</p>';

 loadPublicModule('scholarships')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderScholarships(filterScholarshipsForRoute(data,slug));
  })
  .catch(error => {
    console.error(
      'Scholarships error:',
      error
    );

  if (requestVersion === navigationVersion) showScholarshipsError(error);
  });
  }

function filterScholarshipsForRoute(items,slug) {
  if (slug==='pakistan-scholarships') return items.filter(item=>String(item.Country||'').toLowerCase().includes('pakistan'));
  if (slug==='international-scholarships') return items.filter(item=>String(item.Country||'').trim()&&!String(item.Country).toLowerCase().includes('pakistan'));
  if (slug==='financial-aid') return items.filter(item=>routeContains(item,['Name','Type','Description','Benefits'],['financial aid','grant','bursary','need-based','need based']));
  if (slug==='scholarship-guides') return items.filter(item=>routeContains(item,['Name','Type','Description'],['guide','how to apply','application']));
  return items;
}

function loadOpportunities(slug='career') {
  const requestVersion=navigationVersion;
  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading opportunities...</p>';

 loadPublicModule('opportunities')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderOpportunities(filterOpportunitiesForRoute(data,slug));
  })
  .catch(error => {
    console.error(
      'Opportunities error:',
      error
    );

  if (requestVersion === navigationVersion) showOpportunitiesError(error);
  });
  }

function filterOpportunitiesForRoute(items,slug) {
  const terms={
    'career-guidance':['career guidance','career counselling','career counseling'],
    internships:['internship'],competitions:['competition','contest','hackathon'],
    'student-programs':['student program','fellowship','exchange program'],
    'portfolio-guidance':['portfolio'],'mentors':['mentor','mentorship']
  }[slug];
  return terms ? items.filter(item=>routeContains(item,['Title','Type','Description'],terms)) : items;
}

function loadAnnouncements(slug='updates',parentSlug='') {
  const requestVersion=navigationVersion;
  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading announcements...</p>';

 loadPublicModule('announcements')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderAnnouncements(filterAnnouncementsForRoute(data,slug,parentSlug));
  })
  .catch(error => {
    console.error(
      'Announcements error:',
      error
    );

  if (requestVersion === navigationVersion) showAnnouncementsError(error);
  });
  }

function filterAnnouncementsForRoute(items,slug,parentSlug) {
  const terms=slug==='exam-updates'?['exam','test']:
    slug==='results'?['result']:
    slug==='important-notices'?['important notice','notice']:
    slug==='merit-lists'&&parentSlug==='updates'?['merit list']:null;
  return terms ? items.filter(item=>routeContains(item,['Title','Category','Summary','Content'],terms)) : items;
}

function loadAITools(slug='ai-smart-tools') {
  const requestVersion=navigationVersion;
  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading AI tools...</p>';

 loadPublicModule('aiTools')
  .then(data => {
    if (requestVersion !== navigationVersion) return;
    renderAITools(filterAIToolsForRoute(data,slug));
  })
  .catch(error => {
    console.error(
      'AI Tools error:',
      error
    );

  if (requestVersion === navigationVersion) showAIToolsError(error);
  });
  }

function filterAIToolsForRoute(items,slug) {
  const terms=slug==='ai-assistant'?['assistant','chatbot']:
    slug==='smart-tools'?['smart','productivity','utility']:
    slug==='study-tools'?['study','student','education','learning']:null;
  return terms ? items.filter(item=>routeContains(item,['Name','Category','Description','BestFor'],terms)) : items;
}
  
function loadIslamicContent(slug) {
  const requestVersion = navigationVersion;
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  const pageTitles = {
    'islamic': 'Islamic',
    'hadith': 'Hadith',
    'islamic-reminders': 'Islamic Reminders',
    'duas-motivation': 'Duas / Motivation'
  };

  title.textContent =
    pageTitles[slug] || 'Islamic Content';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading Islamic content...</p>';

  loadPublicModule('islamicContent')
    .then(data => {
      if (requestVersion !== navigationVersion) return;
      renderIslamicContent(
        data,
        slug
      );
    })
    .catch(error => {
      console.error(
        'Islamic Content error:',
        error
      );

      if (requestVersion === navigationVersion) showIslamicContentError(error);
    });
}

function renderIslamicContent(items, slug) {
  currentIslamicContent =
    items || [];

  const typeBySlug = {
    'hadith': 'hadith',
    'islamic-reminders': 'islamic reminder',
    'duas-motivation': 'dua / motivation'
  };

  const requiredType =
    typeBySlug[slug] || '';

  if (requiredType) {
    currentIslamicContent =
      currentIslamicContent.filter(item =>
        String(item.Type || '')
          .trim()
          .toLowerCase() === requiredType
      );
  }

  buildIslamicFilters(
    currentIslamicContent
  );

  displayFilteredIslamicContent();
}

function buildIslamicFilters(items) {
  const filters =
    document.getElementById('resourceFilters');

  if (!items || items.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const types =
    getUniqueValues(items, 'Type');

  filters.innerHTML = `
    ${createFilterSelect(
      'islamicType',
      'All Types',
      types
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredIslamicContent
      );
    });
}

function displayFilteredIslamicContent() {
  const type =
    document.getElementById(
      'islamicType'
    )?.value || '';

  const filtered =
    currentIslamicContent.filter(item =>
      !type || item.Type === type
    );

  drawIslamicCards(filtered);
}

function drawIslamicCards(items) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!items || items.length === 0) {
    content.innerHTML =
      '<p>No matching Islamic content found.</p>';
    return;
  }

  items.forEach(item => {
    const card =
      document.createElement('div');

    card.className =
      'card resource-card';

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';

    if (item.Type) {
      const typeBadge =
        document.createElement('span');

      typeBadge.className =
        'resource-badge';

      typeBadge.textContent =
        item.Type;

      badges.appendChild(typeBadge);
    }

    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {
      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(featuredBadge);
    }

    if (badges.children.length > 0) {
      body.appendChild(badges);
    }

    const title =
      document.createElement('h4');

    title.textContent =
      item.Title || 'Islamic Content';

    body.appendChild(title);

    if (item.ArabicText) {
      const arabic =
        document.createElement('p');

      arabic.textContent =
        item.ArabicText;

      arabic.dir = 'rtl';
      arabic.style.textAlign = 'right';
      arabic.style.fontSize = '1.25rem';
      arabic.style.lineHeight = '2';
      arabic.style.marginTop = '14px';

      body.appendChild(arabic);
    }

    if (item.UrduTranslation) {
      const urdu =
        document.createElement('p');

      urdu.textContent =
        item.UrduTranslation;

      urdu.dir = 'rtl';
      urdu.style.textAlign = 'right';
      urdu.style.marginTop = '12px';

      body.appendChild(urdu);
    }

    if (item.EnglishTranslation) {
      const english =
        document.createElement('p');

      english.textContent =
        item.EnglishTranslation;

      english.style.marginTop = '12px';

      body.appendChild(english);
    }

    if (item.Reference) {
      const reference =
        document.createElement('p');

      reference.textContent =
        'Reference: ' + item.Reference;

      reference.style.fontWeight = 'bold';
      reference.style.marginTop = '12px';

      body.appendChild(reference);
    }

    if (item.Description) {
      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop = '10px';

      body.appendChild(description);
    }

    const sourceURL=safePortalURL(item.SourceURL);
    if (sourceURL) {
      const link =
        document.createElement('a');

      link.href = sourceURL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'View Source';
      link.className = 'resource-button';

      body.appendChild(link);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showIslamicContentError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load Islamic content right now.</p>';

  console.error(
    'Islamic Content error:',
    error
  );
}

function loadEntryTests(slug) {
  const requestVersion = navigationVersion;
  document.getElementById('mdcatEntryLink').hidden =
    slug !== 'entry-tests' && slug !== 'mdcat';
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  const pageTitles = {
    'entry-tests': 'Entry Tests',
    'mdcat': 'MDCAT',
    'nums': 'NUMS',
    'etea': 'ETEA',
    'ecat': 'ECAT',
    'nust-net': 'NUST NET',
    'other-tests': 'Other Tests'
  };

  title.textContent =
    pageTitles[slug] || 'Entry Tests';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading entry tests...</p>';

  loadPublicModule('entryTests')
    .then(data => {
      if (requestVersion !== navigationVersion) return;

      renderEntryTests(
        data,
        slug
      );
    })
    .catch(error => {
      console.error(
        'Entry Tests error:',
        error
      );

      if (requestVersion !== navigationVersion) return;
      showEntryTestsError(error);
    });
}

function renderEntryTests(items, slug) {
  currentEntryTests =
    items || [];

  if (slug && slug !== 'entry-tests') {
    currentEntryTests =
      currentEntryTests.filter(item =>
        String(item.Slug || '')
          .trim()
          .toLowerCase() ===
        String(slug)
          .trim()
          .toLowerCase()
      );
  }

  buildEntryTestFilters(
    currentEntryTests
  );

  displayFilteredEntryTests();
}

function buildEntryTestFilters(items) {
  const filters =
    document.getElementById('resourceFilters');

  if (!items || items.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const organizations =
    getUniqueValues(
      items,
      'Organization'
    );

  filters.innerHTML = `
    ${createFilterSelect(
      'entryTestOrganization',
      'All Organizations',
      organizations
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredEntryTests
      );
    });
}

function displayFilteredEntryTests() {
  const organization =
    document.getElementById(
      'entryTestOrganization'
    )?.value || '';

  const filtered =
    currentEntryTests.filter(item =>
      !organization ||
      item.Organization === organization
    );

  drawEntryTestCards(filtered);
}

function drawEntryTestCards(items) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!items || items.length === 0) {
    content.innerHTML =
      '<p>No matching entry tests found.</p>';
    return;
  }

  items.forEach(item => {
    const card =
      document.createElement('div');

    card.className =
      'card resource-card';

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const title =
      document.createElement('h4');

    title.textContent =
      item.Name || 'Entry Test';

    body.appendChild(title);

    if (item.Organization) {
      const organization =
        document.createElement('p');

      organization.textContent =
        item.Organization;

      organization.style.fontWeight =
        'bold';

      body.appendChild(organization);
    }

    if (item.Description) {
      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop =
        '10px';

      body.appendChild(description);
    }

    if (item.Eligibility) {
      const eligibility =
        document.createElement('p');

      eligibility.textContent =
        'Eligibility: ' +
        item.Eligibility;

      eligibility.style.marginTop =
        '10px';

      body.appendChild(eligibility);
    }

    if (item.RegistrationStart) {
      const opening =
        document.createElement('p');

      opening.textContent =
        'Registration opens: ' +
        formatPortalDate(
          item.RegistrationStart
        );

      opening.style.marginTop =
        '10px';

      body.appendChild(opening);
    }

    if (item.RegistrationDeadline) {
      const deadline =
        document.createElement('p');

      deadline.textContent =
        'Registration deadline: ' +
        formatPortalDate(
          item.RegistrationDeadline
        );

      deadline.style.marginTop =
        '10px';

      body.appendChild(deadline);
    }

    if (item.TestDate) {
      const testDate =
        document.createElement('p');

      testDate.textContent =
        'Test date: ' +
        formatPortalDate(
          item.TestDate
        );

      testDate.style.marginTop =
        '10px';

      body.appendChild(testDate);
    }

    const entryTestURL=safePortalURL(item.OfficialURL);
    if (entryTestURL) {
      const link =
        document.createElement('a');

      link.href = entryTestURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Official Details';

      link.className =
        'resource-button';

      body.appendChild(link);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showEntryTestsError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load entry tests right now.</p>';

  console.error(
    'Entry Tests error:',
    error
  );
}

function loadBlog(slug='blog') {
  const requestVersion=navigationVersion;
  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading blog posts...</p>';

  loadPublicModule('blog')
    .then(data => {
      if (requestVersion !== navigationVersion) return;
      const posts=data;
      renderBlog(slug==='study-abroad' ? posts.filter(item=>routeContains(item,['Title','Category','Summary','Content'],['study abroad','international education'])) : posts);
    })
    .catch(error => {
      console.error(
        'Blog error:',
        error
      );

      if (requestVersion === navigationVersion) showBlogError(error);
    });
}

function renderBlog(posts) {
  currentBlogPosts =
    posts || [];

  buildBlogFilters(
    currentBlogPosts
  );

  displayFilteredBlog();
}

function buildBlogFilters(posts) {
  const filters =
    document.getElementById('resourceFilters');

  if (!posts || posts.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const categories =
    getUniqueValues(
      posts,
      'Category'
    );

  const authors =
    getUniqueValues(
      posts,
      'Author'
    );

  filters.innerHTML = `
    ${createFilterSelect(
      'blogCategory',
      'All Categories',
      categories
    )}

    ${createFilterSelect(
      'blogAuthor',
      'All Authors',
      authors
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredBlog
      );
    });
}

function displayFilteredBlog() {
  const category =
    document.getElementById(
      'blogCategory'
    )?.value || '';

  const author =
    document.getElementById(
      'blogAuthor'
    )?.value || '';

  const filtered =
    currentBlogPosts.filter(item => {
      return (
        (!category ||
          item.Category === category) &&
        (!author ||
          item.Author === author)
      );
    });

  drawBlogCards(filtered);
}

function drawBlogCards(posts) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!posts || posts.length === 0) {
    content.innerHTML =
      '<p>No matching blog posts found.</p>';
    return;
  }

  posts.forEach(item => {
    const card =
      document.createElement('article');

    card.className =
      'card resource-card';

    const blogThumbnailURL=safePortalURL(item.ThumbnailURL);
    if (blogThumbnailURL) {
      const image =
        document.createElement('img');

      image.src = blogThumbnailURL;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt =
        item.Title || 'Blog post';

      image.className =
        'resource-thumbnail';

      card.appendChild(image);
    }

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';

    if (item.Category) {
      const categoryBadge =
        document.createElement('span');

      categoryBadge.className =
        'resource-badge';

      categoryBadge.textContent =
        item.Category;

      badges.appendChild(
        categoryBadge
      );
    }

    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {
      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(
        featuredBadge
      );
    }

    if (badges.children.length > 0) {
      body.appendChild(badges);
    }

    const title =
      document.createElement('h4');

    title.textContent =
      item.Title || 'Blog Post';

    body.appendChild(title);

    const metaParts = [];

    if (item.Author) {
      metaParts.push(
        'By ' + item.Author
      );
    }

    if (item.PublishDate) {
      metaParts.push(
        formatPortalDate(
          item.PublishDate
        )
      );
    }

    if (metaParts.length > 0) {
      const meta =
        document.createElement('div');

      meta.className =
        'resource-meta';

      meta.textContent =
        metaParts.join(' • ');

      body.appendChild(meta);
    }

    if (item.Summary) {
      const summary =
        document.createElement('p');

      summary.textContent =
        item.Summary;

      summary.style.marginTop =
        '10px';

      body.appendChild(summary);
    }

    if (item.Content) {
      const details =
        document.createElement('details');

      details.style.marginTop =
        '12px';

      const summaryToggle =
        document.createElement('summary');

      summaryToggle.textContent =
        'Read Article';

      summaryToggle.style.cursor =
        'pointer';

      summaryToggle.style.fontWeight =
        'bold';

      const articleText =
        document.createElement('p');

      articleText.textContent =
        item.Content;

      articleText.style.marginTop =
        '12px';

      details.appendChild(
        summaryToggle
      );

      details.appendChild(
        articleText
      );

      body.appendChild(details);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showBlogError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load blog posts right now.</p>';

  console.error(
    'Blog error:',
    error
  );
}

function renderAITools(tools) {
  currentAITools =
    tools || [];

  buildAIToolFilters(
    currentAITools
  );

  displayFilteredAITools();
}
function buildAIToolFilters(tools) {
  const filters =
    document.getElementById('resourceFilters');

  if (!tools || tools.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const categories =
    getUniqueValues(
      tools,
      'Category'
    );

  const pricingTypes =
    getUniqueValues(
      tools,
      'PricingType'
    );

  filters.innerHTML = `
    ${createFilterSelect(
      'aiToolCategory',
      'All Categories',
      categories
    )}

    ${createFilterSelect(
      'aiToolPricing',
      'All Pricing Types',
      pricingTypes
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredAITools
      );
    });
}
function displayFilteredAITools() {
  const category =
    document.getElementById(
      'aiToolCategory'
    )?.value || '';

  const pricing =
    document.getElementById(
      'aiToolPricing'
    )?.value || '';

  const filtered =
    currentAITools.filter(item => {
      return (
        (!category ||
          item.Category === category) &&

        (!pricing ||
          item.PricingType === pricing)
      );
    });

  drawAIToolCards(filtered);
}
function drawAIToolCards(tools) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!tools || tools.length === 0) {
    content.innerHTML =
      '<p>No matching AI tools found.</p>';

    return;
  }

  tools.forEach(item => {
    const card =
      document.createElement('div');

    card.className =
      'card resource-card';


    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';


    const toolLogoURL=safePortalURL(item.LogoURL);
    if (toolLogoURL) {
      const logo =
        document.createElement('img');

      logo.src = toolLogoURL;
      logo.loading = 'lazy';
      logo.decoding = 'async';

      logo.alt =
        item.Name || 'AI Tool';

      logo.style.maxWidth =
        '70px';

      logo.style.maxHeight =
        '70px';

      logo.style.objectFit =
        'contain';

      logo.style.marginBottom =
        '12px';

      body.appendChild(logo);
    }


    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';


    if (item.Category) {
      const categoryBadge =
        document.createElement('span');

      categoryBadge.className =
        'resource-badge';

      categoryBadge.textContent =
        item.Category;

      badges.appendChild(
        categoryBadge
      );
    }


    if (item.PricingType) {
      const pricingBadge =
        document.createElement('span');

      pricingBadge.className =
        'resource-badge';

      pricingBadge.textContent =
        item.PricingType;

      badges.appendChild(
        pricingBadge
      );
    }


    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {
      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(
        featuredBadge
      );
    }


    if (badges.children.length > 0) {
      body.appendChild(badges);
    }


    const title =
      document.createElement('h4');

    title.textContent =
      item.Name ||
      'AI Tool';

    body.appendChild(title);


    if (item.BestFor) {
      const bestFor =
        document.createElement('p');

      bestFor.textContent =
        'Best for: ' +
        item.BestFor;

      bestFor.style.fontWeight =
        'bold';

      body.appendChild(bestFor);
    }


    if (item.Description) {
      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop =
        '10px';

      body.appendChild(description);
    }


    const toolURL=safePortalURL(item.ToolURL);
    if (toolURL) {
      const link =
        document.createElement('a');

      link.href = toolURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Open Tool';

      link.className =
        'resource-button';

      body.appendChild(link);
    }


    card.appendChild(body);

    content.appendChild(card);
  });
}
function showAIToolsError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load AI tools right now.</p>';

  console.error(
    'AI Tools error:',
    error
  );
}

function renderAnnouncements(announcements) {
  currentAnnouncements =
    announcements || [];

  buildAnnouncementFilters(
    currentAnnouncements
  );

  displayFilteredAnnouncements();
}
function buildAnnouncementFilters(announcements) {
  const filters =
    document.getElementById('resourceFilters');

  if (
    !announcements ||
    announcements.length === 0
  ) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const categories =
    getUniqueValues(
      announcements,
      'Category'
    );

  const priorities =
    getUniqueValues(
      announcements,
      'Priority'
    );

  filters.innerHTML = `
    ${createFilterSelect(
      'announcementCategory',
      'All Categories',
      categories
    )}

    ${createFilterSelect(
      'announcementPriority',
      'All Priorities',
      priorities
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredAnnouncements
      );
    });
}
function displayFilteredAnnouncements() {
  const category =
    document.getElementById(
      'announcementCategory'
    )?.value || '';

  const priority =
    document.getElementById(
      'announcementPriority'
    )?.value || '';

  const filtered =
    currentAnnouncements.filter(item => {
      return (
        (!category ||
          item.Category === category) &&

        (!priority ||
          item.Priority === priority)
      );
    });

  drawAnnouncementCards(filtered);
}
function drawAnnouncementCards(announcements) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (
    !announcements ||
    announcements.length === 0
  ) {
    content.innerHTML =
      '<p>No matching announcements found.</p>';

    return;
  }

  announcements.forEach(item => {

    const card =
      document.createElement('div');

    card.className =
      'card resource-card';


    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';


    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';


    if (item.Category) {

      const categoryBadge =
        document.createElement('span');

      categoryBadge.className =
        'resource-badge';

      categoryBadge.textContent =
        item.Category;

      badges.appendChild(
        categoryBadge
      );
    }


    if (item.Priority) {

      const priorityBadge =
        document.createElement('span');

      priorityBadge.className =
        'resource-badge';

      priorityBadge.textContent =
        item.Priority;

      badges.appendChild(
        priorityBadge
      );
    }


    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {

      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(
        featuredBadge
      );
    }


    if (badges.children.length > 0) {
      body.appendChild(badges);
    }


    const title =
      document.createElement('h4');

    title.textContent =
      item.Title ||
      'Announcement';

    body.appendChild(title);


    if (item.PublishDate) {

      const publishDate =
        document.createElement('p');

      publishDate.textContent =
        'Published: ' +
        formatPortalDate(
          item.PublishDate
        );

      body.appendChild(
        publishDate
      );
    }


    if (item.Summary) {

      const summary =
        document.createElement('p');

      summary.textContent =
        item.Summary;

      summary.style.marginTop =
        '10px';

      body.appendChild(summary);
    }


    if (item.Content) {

      const fullContent =
        document.createElement('p');

      fullContent.textContent =
        item.Content;

      fullContent.style.marginTop =
        '10px';

      body.appendChild(
        fullContent
      );
    }


    if (item.ExpiryDate) {

      const expiry =
        document.createElement('p');

      expiry.textContent =
        'Valid until: ' +
        formatPortalDate(
          item.ExpiryDate
        );

      expiry.style.marginTop =
        '10px';

      body.appendChild(expiry);
    }


    const announcementURL=safePortalURL(item.OfficialURL);
    if (announcementURL) {

      const link =
        document.createElement('a');

      link.href = announcementURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Official Details';

      link.className =
        'resource-button';

      body.appendChild(link);
    }


    card.appendChild(body);

    content.appendChild(card);
  });
}
function showAnnouncementsError(error) {
  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load announcements right now.</p>';

  console.error(
    'Announcements error:',
    error
  );
}

function renderOpportunities(opportunities) {
  currentOpportunities = opportunities || [];

  buildOpportunityFilters(currentOpportunities);

  displayFilteredOpportunities();
}
function buildOpportunityFilters(opportunities) {
  const filters =
    document.getElementById('resourceFilters');

  if (!opportunities || opportunities.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const organizations =
    getUniqueValues(opportunities, 'Organization');

  const types =
    getUniqueValues(opportunities, 'Type');

  const locations =
    getUniqueValues(opportunities, 'Location');

  filters.innerHTML = `
    ${createFilterSelect(
      'opportunityOrganization',
      'All Organizations',
      organizations
    )}

    ${createFilterSelect(
      'opportunityType',
      'All Types',
      types
    )}

    ${createFilterSelect(
      'opportunityLocation',
      'All Locations',
      locations
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredOpportunities
      );
    });
}


function displayFilteredOpportunities() {
  const organization =
    document.getElementById(
      'opportunityOrganization'
    )?.value || '';

  const type =
    document.getElementById(
      'opportunityType'
    )?.value || '';

  const location =
    document.getElementById(
      'opportunityLocation'
    )?.value || '';

  const filtered =
    currentOpportunities.filter(item => {
      return (
        (!organization ||
          item.Organization === organization) &&

        (!type ||
          item.Type === type) &&

        (!location ||
          item.Location === location)
      );
    });

  drawOpportunityCards(filtered);
}
function drawOpportunityCards(opportunities) {
  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML = '';

  if (!opportunities || opportunities.length === 0) {
    content.innerHTML =
      '<p>No matching opportunities found.</p>';
    return;
  }

  opportunities.forEach(item => {
    const card =
      document.createElement('div');

    card.className =
      'card resource-card';

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';

    if (item.Type) {
      const typeBadge =
        document.createElement('span');

      typeBadge.className =
        'resource-badge';

      typeBadge.textContent =
        item.Type;

      badges.appendChild(typeBadge);
    }

    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {
      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(featuredBadge);
    }

    if (badges.children.length > 0) {
      body.appendChild(badges);
    }

    const title =
      document.createElement('h4');

    title.textContent =
      item.Title ||
      'Student Opportunity';

    body.appendChild(title);

    if (item.Organization) {
      const organization =
        document.createElement('p');

      organization.textContent =
        item.Organization;

      organization.style.fontWeight =
        'bold';

      body.appendChild(organization);
    }

    if (item.Location) {
      const location =
        document.createElement('p');

      location.textContent =
        'Location: ' + item.Location;

      body.appendChild(location);
    }

    if (item.Eligibility) {
      const eligibility =
        document.createElement('p');

      eligibility.textContent =
        'Eligibility: ' +
        item.Eligibility;

      eligibility.style.marginTop =
        '10px';

      body.appendChild(eligibility);
    }

    if (item.Deadline) {
      const deadline =
        document.createElement('p');

      deadline.textContent =
        'Deadline: ' +
        formatPortalDate(item.Deadline);

      deadline.style.marginTop =
        '10px';

      body.appendChild(deadline);
    }

    if (item.Description) {
      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop =
        '10px';

      body.appendChild(description);
    }

    const opportunityURL=safePortalURL(item.OfficialURL);
    if (opportunityURL) {
      const link =
        document.createElement('a');

      link.href = opportunityURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Official Details';

      link.className =
        'resource-button';

      body.appendChild(link);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showOpportunitiesError(error) {
  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML =
    '<p>Unable to load opportunities right now.</p>';

  console.error('Opportunities error:', error);
}
function renderScholarships(scholarships) {
  currentScholarships = scholarships || [];

  buildScholarshipFilters(currentScholarships);

  displayFilteredScholarships();
}
function buildScholarshipFilters(scholarships) {
  const filters =
    document.getElementById('resourceFilters');

  if (!scholarships || scholarships.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const providers =
    getUniqueValues(scholarships, 'Provider');

  const types =
    getUniqueValues(scholarships, 'Type');

  const countries =
    getUniqueValues(scholarships, 'Country');

  filters.innerHTML = `
    ${createFilterSelect(
      'scholarshipProvider',
      'All Providers',
      providers
    )}

    ${createFilterSelect(
      'scholarshipType',
      'All Types',
      types
    )}

    ${createFilterSelect(
      'scholarshipCountry',
      'All Countries',
      countries
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {
      select.addEventListener(
        'change',
        displayFilteredScholarships
      );
    });
}


function displayFilteredScholarships() {
  const provider =
    document.getElementById(
      'scholarshipProvider'
    )?.value || '';

  const type =
    document.getElementById(
      'scholarshipType'
    )?.value || '';

  const country =
    document.getElementById(
      'scholarshipCountry'
    )?.value || '';

  const filtered =
    currentScholarships.filter(item => {
      return (
        (!provider ||
          item.Provider === provider) &&

        (!type ||
          item.Type === type) &&

        (!country ||
          item.Country === country)
      );
    });

  drawScholarshipCards(filtered);
}
function drawScholarshipCards(scholarships) {
  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML = '';

  if (!scholarships || scholarships.length === 0) {
    content.innerHTML =
      '<p>No matching scholarships found.</p>';
    return;
  }

  scholarships.forEach(item => {
    const card =
      document.createElement('div');

    card.className =
      'card resource-card';

    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';

    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';

    if (item.Type) {
      const typeBadge =
        document.createElement('span');

      typeBadge.className =
        'resource-badge';

      typeBadge.textContent =
        item.Type;

      badges.appendChild(typeBadge);
    }

    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {
      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(featuredBadge);
    }

    if (badges.children.length > 0) {
      body.appendChild(badges);
    }

    const title =
      document.createElement('h4');

    title.textContent =
      item.Name ||
      'Scholarship Opportunity';

    body.appendChild(title);

    if (item.Provider) {
      const provider =
        document.createElement('p');

      provider.textContent =
        item.Provider;

      provider.style.fontWeight =
        'bold';

      body.appendChild(provider);
    }

    if (item.Country) {
      const country =
        document.createElement('p');

      country.textContent =
        'Country: ' + item.Country;

      body.appendChild(country);
    }

    if (item.Eligibility) {
      const eligibility =
        document.createElement('p');

      eligibility.textContent =
        'Eligibility: ' +
        item.Eligibility;

      eligibility.style.marginTop =
        '10px';

      body.appendChild(eligibility);
    }

    if (item.Benefits) {
      const benefits =
        document.createElement('p');

      benefits.textContent =
        'Benefits: ' +
        item.Benefits;

      benefits.style.marginTop =
        '10px';

      body.appendChild(benefits);
    }

    if (item.Deadline) {
      const deadline =
        document.createElement('p');

      deadline.textContent =
        'Deadline: ' +
        formatPortalDate(item.Deadline);

      deadline.style.marginTop =
        '10px';

      body.appendChild(deadline);
    }

    if (item.Description) {
      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop =
        '10px';

      body.appendChild(description);
    }

    const scholarshipURL=safePortalURL(item.OfficialURL);
    if (scholarshipURL) {
      const link =
        document.createElement('a');

      link.href = scholarshipURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Official Details';

      link.className =
        'resource-button';

      body.appendChild(link);
    }

    card.appendChild(body);
    content.appendChild(card);
  });
}

function showScholarshipsError(error) {
  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML =
    '<p>Unable to load scholarships right now.</p>';

  console.error('Scholarships error:', error);
}
function renderAdmissions(admissions) {

  currentAdmissions = admissions || [];

  buildAdmissionsFilters(currentAdmissions);

  displayFilteredAdmissions();
}

function buildAdmissionsFilters(admissions) {

  const filters =
    document.getElementById(
      'resourceFilters'
    );

  if (!admissions || admissions.length === 0) {
    filters.innerHTML = '';
    filters.style.display = 'none';
    return;
  }

  filters.style.display = 'grid';

  const institutions =
    getUniqueValues(admissions, 'Institution');

  const degreeLevels =
    getUniqueValues(admissions, 'DegreeLevel');

  const admissionTypes =
    getUniqueValues(admissions, 'AdmissionType');

  const entryTests =
    getUniqueValues(admissions, 'EntryTest');

  filters.innerHTML = `
    ${createFilterSelect(
      'admissionInstitution',
      'All Institutions',
      institutions
    )}

    ${createFilterSelect(
      'admissionDegreeLevel',
      'All Degree Levels',
      degreeLevels
    )}

    ${createFilterSelect(
      'admissionType',
      'All Admission Types',
      admissionTypes
    )}

    ${createFilterSelect(
      'admissionEntryTest',
      'All Entry Tests',
      entryTests
    )}
  `;

  filters
    .querySelectorAll('select')
    .forEach(select => {

      select.addEventListener(
        'change',
        displayFilteredAdmissions
      );

    });
}
function displayFilteredAdmissions() {

  const institution =
    document.getElementById(
      'admissionInstitution'
    )?.value || '';

  const degreeLevel =
    document.getElementById(
      'admissionDegreeLevel'
    )?.value || '';

  const admissionType =
    document.getElementById(
      'admissionType'
    )?.value || '';

  const entryTest =
    document.getElementById(
      'admissionEntryTest'
    )?.value || '';

  const filtered =
    currentAdmissions.filter(item => {

      return (
        (!institution ||
          item.Institution === institution) &&

        (!degreeLevel ||
          item.DegreeLevel === degreeLevel) &&

        (!admissionType ||
          item.AdmissionType === admissionType) &&

        (!entryTest ||
          item.EntryTest === entryTest)
      );

    });

  drawAdmissionCards(filtered);
}
function drawAdmissionCards(admissions) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML = '';

  if (!admissions || admissions.length === 0) {

    content.innerHTML =
      '<p>No matching admissions found.</p>';

    return;
  }

  admissions.forEach(item => {

    const card =
      document.createElement('div');

    card.className =
      'card resource-card';


    const body =
      document.createElement('div');

    body.className =
      'resource-card-body';


    const badges =
      document.createElement('div');

    badges.className =
      'resource-badges';


    if (item.DegreeLevel) {

      const degreeBadge =
        document.createElement('span');

      degreeBadge.className =
        'resource-badge';

      degreeBadge.textContent =
        item.DegreeLevel;

      badges.appendChild(degreeBadge);
    }


    if (
      String(item.Featured || '')
        .toLowerCase() === 'yes'
    ) {

      const featuredBadge =
        document.createElement('span');

      featuredBadge.className =
        'resource-badge featured-badge';

      featuredBadge.textContent =
        'Featured';

      badges.appendChild(featuredBadge);
    }


    if (badges.children.length > 0) {
      body.appendChild(badges);
    }


    const title =
      document.createElement('h4');

    title.textContent =
      item.Program ||
      'Admission Opportunity';

    body.appendChild(title);


    if (item.Institution) {

      const institution =
        document.createElement('p');

      institution.textContent =
        item.Institution;

      institution.style.fontWeight =
        'bold';

      body.appendChild(institution);
    }


    const meta =
      document.createElement('div');

    meta.className =
      'resource-meta';

    meta.textContent = [
      item.AdmissionType,
      item.EntryTest
    ]
      .filter(Boolean)
      .join(' • ');

    if (meta.textContent) {
      body.appendChild(meta);
    }


    if (item.Eligibility) {

      const eligibility =
        document.createElement('p');

      eligibility.textContent =
        'Eligibility: ' +
        item.Eligibility;

      eligibility.style.marginTop =
        '12px';

      body.appendChild(eligibility);
    }


    if (item.Deadline) {

      const deadline =
        document.createElement('p');

      deadline.textContent =
        'Deadline: ' +
        formatPortalDate(
          item.Deadline
        );

      deadline.style.marginTop =
        '10px';

      body.appendChild(deadline);
    }


    if (item.Description) {

      const description =
        document.createElement('p');

      description.textContent =
        item.Description;

      description.style.marginTop =
        '10px';

      body.appendChild(description);
    }


    const admissionURL=safePortalURL(item.OfficialURL);
    if (admissionURL) {

      const link =
        document.createElement('a');

      link.href = admissionURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Official Details';

      link.className =
        'resource-button';

      body.appendChild(link);
    }


    card.appendChild(body);

    content.appendChild(card);
  });
}

function formatPortalDate(value) {

  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }
  );
}
function showAdmissionsError(error) {

  const content =
    document.getElementById(
      'dynamicPageContent'
    );

  content.innerHTML =
    '<p>Unable to load admissions right now.</p>';

  console.error(error);
}
const PORTAL_SEARCH_CACHE_KEY='icp-search-index-v1';
const PORTAL_SEARCH_ROUTES=new Set(['study','notes','past-papers','study-resources','videos','mcqs','admissions','scholarships','career','updates','ai-tools','islamic','hadith','blog','entry-tests','mdcat','nums','etea','ecat','nust-net','other-tests']);

function readPortalSearchCache() {
  try {
    const cached=JSON.parse(localStorage.getItem(PORTAL_SEARCH_CACHE_KEY));
    if (!cached || Date.now()-Number(cached.savedAt)>30*60*1000 || !Array.isArray(cached.data)) return null;
    return cached.data.filter(isValidSearchItem);
  } catch (_) { return null; }
}

function isValidSearchItem(item) {
  return item && typeof item==='object' && !Array.isArray(item) && typeof item.Title==='string' && item.Title.trim() &&
    typeof item.Kind==='string' && PORTAL_SEARCH_ROUTES.has(String(item.Route||''));
}

async function loadPortalSearchIndex(force=false) {
  if (!force && portalSearchIndex) return portalSearchIndex;
  if (!force) {
    const cached=readPortalSearchCache();
    if (cached && cached.length) { portalSearchIndex=cached; return cached; }
  }
  if (portalSearchPromise) return portalSearchPromise;
  portalSearchPromise=(async()=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),60000);
    try {
      const response=await fetch(API_BASE_URL+'?action=searchIndex',{signal:controller.signal});
      if (!response.ok) throw new Error('HTTP '+response.status);
      const result=await response.json();
      if (!result || result.success!==true || !Array.isArray(result.data)) throw new Error('Invalid search response.');
      const rows=result.data.filter(isValidSearchItem);
      portalSearchIndex=rows;
      try {
        const value=JSON.stringify({savedAt:Date.now(),data:rows});
        if (value.length<2000000) localStorage.setItem(PORTAL_SEARCH_CACHE_KEY,value);
      } catch (_) {}
      return rows;
    } finally { clearTimeout(timeout); }
  })();
  try { return await portalSearchPromise; }
  finally { portalSearchPromise=null; }
}

function normalizePortalSearch(value) {
  return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').trim();
}

function rankPortalSearch(items,query) {
  const normalized=normalizePortalSearch(query);
  const terms=[...new Set(normalized.split(/\s+/).filter(Boolean))];
  return items.map(item=>{
    const title=normalizePortalSearch(item.Title);
    const description=normalizePortalSearch(item.Description);
    const keywords=normalizePortalSearch(item.Keywords);
    const kind=normalizePortalSearch(item.Kind);
    const haystack=[title,description,keywords,kind].join(' ');
    if (!terms.every(term=>haystack.includes(term))) return null;
    let score=terms.reduce((total,term)=>total+(title.includes(term)?30:0)+(keywords.includes(term)?12:0)+(description.includes(term)?6:0)+(kind.includes(term)?4:0),0);
    if (title===normalized) score+=200;
    else if (title.startsWith(normalized)) score+=100;
    else if (title.includes(normalized)) score+=50;
    return {item,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score || a.item.Title.localeCompare(b.item.Title)).map(row=>row.item);
}

function showPortalSearchResults(query,items) {
  const content=document.getElementById('dynamicPageContent');
  content.replaceChildren();
  const total=items.length;
  const summary=document.createElement('p');summary.className='mdcat-wide';
  summary.textContent=total ? total+' result'+(total===1?'':'s')+' found.' : 'No published content matched “'+query+'”.';
  content.appendChild(summary);
  items.slice(0,50).forEach(item=>{
    const card=document.createElement('article');card.className='card resource-card';
    const badges=document.createElement('div');badges.className='resource-badges';
    const badge=document.createElement('span');badge.className='resource-badge';badge.textContent=item.Kind;badges.appendChild(badge);
    const title=document.createElement('h4');title.textContent=item.Title;
    const description=document.createElement('p');description.textContent=item.Description || item.Keywords || 'Open this portal result.';
    const button=document.createElement('button');button.type='button';button.className='resource-button';button.textContent='Open';
    button.setAttribute('aria-label','Open '+item.Title);button.onclick=()=>openPortalSearchResult(item);
    card.append(badges,title,description,button);content.appendChild(card);
  });
  if (total>50) {
    const limit=document.createElement('p');limit.className='mdcat-wide';limit.textContent='Showing the 50 most relevant results. Add another word to narrow your search.';content.appendChild(limit);
  }
}

function openPortalSearchResult(item) {
  if (item.Route!=='mdcat') {
    handleNavigation({Slug:item.Route,Label:item.Kind});
    return;
  }
  openMDCATHub();
  const subject={ID:item.SubjectID,Name:item.SubjectName || 'MDCAT'};
  const unit={ID:item.UnitID,SubjectID:item.SubjectID,Name:item.UnitName || 'Unit'};
  const chapter={ID:item.ChapterID,UnitID:item.UnitID,SubjectID:item.SubjectID,Name:item.ChapterName || 'Chapter'};
  if (item.MDCATLevel==='subject') return openMDCATUnits(subject);
  if (item.MDCATLevel==='unit' && item.SubjectID) return openMDCATChapters(subject,{ID:item.ID,SubjectID:item.SubjectID,Name:item.Title});
  if (item.MDCATLevel==='chapter' && item.UnitID) return openMDCATTopics(subject,unit,{ID:item.ID,UnitID:item.UnitID,SubjectID:item.SubjectID,Name:item.Title});
  if (['topic','question'].includes(item.MDCATLevel)) {
    const scope={SubjectID:item.SubjectID,UnitID:item.UnitID,ChapterID:item.ChapterID,TopicID:item.TopicID || (item.MDCATLevel==='topic'?item.ID:'')};
    return openMDCATPractice(Object.fromEntries(Object.entries(scope).filter(([,value])=>value)),item.Title);
  }
  if (item.MDCATLevel==='test') return openMDCATCollection('tests');
  if (item.MDCATLevel==='daily') return openMDCATCollection('daily');
  if (item.MDCATLevel==='update') return openMDCATCollection('updates');
}

async function portalSearch() {
  const input=document.getElementById('searchInput');
  const query=input.value.trim().slice(0,80);
  if (query.length<2) {
    input.setCustomValidity('Enter at least two characters to search.');input.reportValidity();input.focus();return;
  }
  input.setCustomValidity('');
  navigationVersion+=1;const requestVersion=navigationVersion;closeMDCATHub();
  document.getElementById('homeHero').style.display='none';document.getElementById('homeExplore').style.display='none';
  document.getElementById('dynamicPage').style.display='block';document.getElementById('dynamicPageTitle').textContent='Search results';
  document.getElementById('dynamicPageDescription').textContent='Searching ICP YOUTH CIRCLE for “'+query+'”.';
  document.getElementById('resourceFilters').style.display='none';
  const content=document.getElementById('dynamicPageContent');content.innerHTML='<p>Searching published portal content…</p>';
  window.location.hash='search='+encodeURIComponent(query);window.scrollTo({top:0,behavior:'smooth'});
  try {
    const index=await loadPortalSearchIndex();
    if (requestVersion!==navigationVersion) return;
    const results=rankPortalSearch(index,query);
    document.getElementById('dynamicPageDescription').textContent='Results for “'+query+'”.';
    showPortalSearchResults(query,results);
  } catch (error) {
    if (requestVersion!==navigationVersion) return;
    content.replaceChildren();
    const message=document.createElement('p');message.textContent='Search is temporarily unavailable. Please try again.';
    const retry=document.createElement('button');retry.type='button';retry.className='resource-button';retry.textContent='Retry search';retry.onclick=()=>{portalSearchIndex=null;portalSearch();};
    content.append(message,retry);console.error('Portal search error:',error);
  }
}


    function showError(error) {

      document.getElementById(
        'loading'
      ).innerHTML =
        'Unable to load the portal.<br><br>' +
        error.message;

    }
