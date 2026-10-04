const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec';
const PORTAL_CACHE_KEY = 'icp-public-portal-v1';
const PUBLIC_MODULE_CACHE_PREFIX = 'icp-public-module-v2:';
const PUBLIC_MODULE_CACHE_TTL = 30 * 60 * 1000;
const SCHEDULED_MODULE_CACHE_TTL = 60 * 1000;
const SCHEDULED_PUBLIC_MODULES = new Set(['resources','scholarships','announcements','countdowns','publicNotifications']);
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
    ['NAV-058','About','about','NAV-011'],['NAV-059','Contact','contact','NAV-011'],
    ['NAV-060','Frequently Asked Questions','faq','NAV-008']
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
  const action=new URLSearchParams(key).get('action') || '';
  const maxAge=SCHEDULED_PUBLIC_MODULES.has(action) ? SCHEDULED_MODULE_CACHE_TTL : PUBLIC_MODULE_CACHE_TTL;
  if (publicModuleMemory.has(key)) {
    const cached=publicModuleMemory.get(key);
    if (allowStale || Date.now()-cached.savedAt<=maxAge) return cached.data;
    publicModuleMemory.delete(key);
  }
  try {
    const cached = JSON.parse(localStorage.getItem(PUBLIC_MODULE_CACHE_PREFIX + key));
    if (!cached || !Array.isArray(cached.data)) return null;
    if (!allowStale && Date.now() - Number(cached.savedAt || 0) > maxAge) return null;
    publicModuleMemory.set(key, {savedAt:Number(cached.savedAt || 0),data:cached.data});
    return cached.data;
  } catch (_) { return null; }
}

function storePublicModuleCache(key, data) {
  if (!Array.isArray(data)) return;
  const savedAt=Date.now();
  publicModuleMemory.set(key, {savedAt,data});
  try {
    const value = JSON.stringify({ savedAt, data });
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
  const cached = readPublicModuleCache(key, !SCHEDULED_PUBLIC_MODULES.has(action));
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

  const start = async () => {
    try {
      await warmPublicBundle();
    } catch (_) {
      // Fallback: Parallel fetch of uncached modules using Promise.allSettled
      const moduleFetches = modules
        .map(([action, params]) => {
          const key = publicModuleKey(action, params || {});
          if (readPublicModuleCache(key)) return null;
          return refreshPublicModule(action, params || {});
        })
        .filter(Boolean);

      if (moduleFetches.length > 0) {
        await Promise.allSettled(moduleFetches);
      }
    }
  };

  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1500 });
  else setTimeout(start, 600);
}

document.addEventListener('DOMContentLoaded', loadPortal);

function readPortalCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(PORTAL_CACHE_KEY));
    if (!cached || Date.now() - Number(cached.savedAt) > 6 * 60 * 60 * 1000) return null;
    if (!cached.data || !Array.isArray(cached.data.navigation) || !Array.isArray(cached.data.categories)) return null;
    return cached.data;
  } catch (_) { return null; }
}

function fetchPortalDataRemote() {
  return fetchWithPortalTimeout(API_BASE_URL + '?action=portalData')
    .then(response => {
      if (!response.ok) throw new Error('HTTP error: ' + response.status);
      return response.json();
    })
    .then(result => {
      if (!result.success || !result.data || !Array.isArray(result.data.navigation) || !Array.isArray(result.data.categories)) {
        throw new Error(result.error || 'Invalid portal data structure.');
      }
      try {
        localStorage.setItem(PORTAL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data: result.data }));
      } catch (_) {}
      renderPortal(result.data);
      return result.data;
    });
}

function loadPortal() {
  // Render immediately from cache/bootstrap data
  renderPortal(readPortalCache() || PORTAL_BOOTSTRAP_DATA);

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => searchInput.setCustomValidity(''));
    searchInput.addEventListener('focus', () => loadPortalSearchIndex().catch(() => {}));
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        portalSearch();
      }
    });
  }

  // Parallel background network requests
  Promise.allSettled([
    fetchPortalDataRemote(),
    loadPublicModule('publicNotifications')
  ]).then((results) => {
    const notificationsResult = results[1];
    if (notificationsResult.status === 'fulfilled' && notificationsResult.value) {
      renderPublicNotifications(notificationsResult.value);
    }
  });

  warmPublicModules();
  registerPortalServiceWorker();
}

function registerPortalServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js?v=20260926-portal-suite').catch(() => {});
  }, {once: true});
}

function renderPortal(data) {
  const navigation = Array.isArray(data.navigation) ? data.navigation.slice() : [];
  if (!navigation.some(item => ['faq','faqs','frequently-asked-questions'].includes(String(item.Slug)))) {
    const community = navigation.find(item => String(item.Slug) === 'community');
    navigation.push({ ID: 'PORTAL-FAQ', Label: 'Frequently Asked Questions', Slug: 'faq', ParentID: community ? community.ID : '', DisplayOrder: 999 });
  }
  portalData = Object.assign({}, data, { navigation: navigation });

  let fingerprint = '';
  try {
    fingerprint = JSON.stringify({ settings: portalData.settings || {}, navigation: portalData.navigation || [], categories: portalData.categories || [] });
  } catch (_) {}
  if (fingerprint && fingerprint === portalRenderFingerprint) return;
  portalRenderFingerprint = fingerprint;

  const settings = data.settings || {};

  const elSiteName = document.getElementById('siteName');
  const elTagline = document.getElementById('tagline');
  const elHeroTitle = document.getElementById('heroTitle');
  const elHeroTagline = document.getElementById('heroTagline');
  const elHeroDesc = document.getElementById('heroDescription');
  const elFooterText = document.getElementById('footerText');

  if (elSiteName) elSiteName.textContent = settings.site_name || 'ICP YOUTH CIRCLE';
  if (elTagline) elTagline.textContent = settings.site_tagline || 'Learn • Connect • Grow';
  if (elHeroTitle) elHeroTitle.textContent = settings.site_name || 'ICP YOUTH CIRCLE';
  if (elHeroTagline) elHeroTagline.textContent = settings.site_tagline || 'Learn • Connect • Grow';
  if (elHeroDesc) elHeroDesc.textContent = settings.site_description || '';
  if (elFooterText) elFooterText.textContent = settings.footer_text || 'ICP YOUTH CIRCLE';

  renderNavigation(portalData.navigation || []);
  renderCategories(data.categories || []);

  if (!publicNotificationRequest) {
    publicNotificationRequest = loadPublicModule('publicNotifications')
      .catch(error => { publicNotificationRequest = null; throw error; });
  }
  publicNotificationRequest.then(renderPublicNotifications).catch(() => {});

  const elLoading = document.getElementById('loading');
  const elApp = document.getElementById('app');
  if (elLoading) elLoading.style.display = 'none';
  if (elApp) elApp.style.display = 'block';

  if (!portalInitialRouteApplied) {
    portalInitialRouteApplied = true;
    if (typeof navigatePortalLocation === 'function') {
      navigatePortalLocation();
    }
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
      const publishedAt = announcementTimestamp(item.PublishedAt || item.PublishAt || item.PublishDate || item.CreatedAt);
      return publishedAt > 0 && publishedAt <= now && now - publishedAt < PUBLIC_NOTIFICATION_LIFETIME;
    })
    .sort((a, b) => {
      const featured = String(b.Featured || '').toLowerCase() === 'yes' ? 1 : 0;
      const otherFeatured = String(a.Featured || '').toLowerCase() === 'yes' ? 1 : 0;
      return (featured - otherFeatured) ||
        ((priority[String(b.Priority || '').toLowerCase()] || 0) - (priority[String(a.Priority || '').toLowerCase()] || 0)) ||
        (announcementTimestamp(b.PublishedAt || b.PublishAt || b.PublishDate || b.CreatedAt) - announcementTimestamp(a.PublishedAt || a.PublishAt || a.PublishDate || a.CreatedAt));
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
    const empty = document.createElement('p'); empty.className = 'public-notification-empty'; empty.textContent = 'No new public updates.';
    list.appendChild(empty);
    return;
  }
  button.disabled = false;
  notifications.slice(0, 5).forEach(item => {
    const route=String(item.Route || 'announcements');const label=String(item.Label || item.Category || 'Announcements');
    const link = document.createElement('a'); link.href = '#/'+route; link.className = 'public-notification-item';
    const meta = document.createElement('span'); meta.className = 'public-notification-meta'; meta.textContent = String(item.Category || item.Type || 'Announcement');
    const title = document.createElement('strong'); title.textContent = String(item.Title || item.Summary || 'Portal update');
    link.append(meta, title);
    link.onclick = event => { event.preventDefault(); closePublicNotifications(); handleNavigation({Slug:route,Label:label,ParentID:String(item.ParentID || '')}); closeMobileNavigation(); };
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
  if (!nav || !menuToggle) return;

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
    .sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));

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
      if (typeof handleNavigation === 'function') handleNavigation(parent);
      closeMobileNavigation();
    };

    row.appendChild(link);

    const children = items
      .filter(item => item.ParentID === parent.ID)
      .sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));

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
          if (typeof handleNavigation === 'function') handleNavigation(child);
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
      <a class="public-notification-all" href="#/updates">View all updates</a>
    </div>`;
  publicNotifications.querySelector('.public-notification-button').onclick = togglePublicNotifications;
  publicNotifications.querySelector('.public-notification-all').onclick = event => { 
    event.preventDefault(); 
    closePublicNotifications(); 
    if (typeof handleNavigation === 'function') handleNavigation({Slug:'updates',Label:'Updates'}); 
    closeMobileNavigation(); 
  };
  
  const headerInner = document.querySelector('.header-inner');
  if (headerInner) headerInner.appendChild(publicNotifications);

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
  const homeHero = document.getElementById('homeHero');
  const homeExplore = document.getElementById('homeExplore');
  const dynamicPage = document.getElementById('dynamicPage');
  const mdcatHub = document.getElementById('mdcatHub');

  if (homeHero) homeHero.style.display = 'none';
  if (homeExplore) homeExplore.style.display = 'none';
  const homeTools=document.getElementById('homeTools');if(homeTools)homeTools.hidden=true;
  if (dynamicPage) dynamicPage.style.display = 'none';
  if (mdcatHub) mdcatHub.hidden = false;
  window.location.hash = 'account';
  if (typeof openUserAccount === 'function') openUserAccount(pending);
}

function setMobileNavigationOpen(open) {
  const nav=document.getElementById('mainNavigation');const toggle=document.getElementById('menuToggle');
  if (!nav || !toggle) return;
  nav.classList.toggle('is-open',Boolean(open));toggle.setAttribute('aria-expanded',String(Boolean(open)));
  if(!open){nav.querySelectorAll('.nav-item.submenu-open').forEach(item=>item.classList.remove('submenu-open'));nav.querySelectorAll('.submenu-toggle').forEach(button=>button.setAttribute('aria-expanded','false'));}
}

function closeMobileNavigation() { setMobileNavigationOpen(false); }

function renderCategories(categories) {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const mainCategories = categories
    .filter(item => !item.ParentCategory)
    .sort((a, b) => Number(a.DisplayOrder || 0) - Number(b.DisplayOrder || 0));

  mainCategories.forEach(category => {
    const card = document.createElement('div');
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

    const title = document.createElement('h4');
    title.textContent = category.Name;

    const description = document.createElement('p');
    description.textContent = category.Description || '';

    const action = document.createElement('span');
    action.className = 'category-action';
    action.innerHTML = 'Explore <span aria-hidden="true">→</span>';

    card.append(top, title, description, action);

    card.onclick = function() { if (typeof openCategory === 'function') openCategory(category); };
    card.onkeydown = function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (typeof openCategory === 'function') openCategory(category);
      }
    };

    grid.appendChild(card);
  });
}
