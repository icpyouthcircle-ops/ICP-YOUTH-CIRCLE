// Read public MDCAT subjects, units and chapters; other modules stay separate.
let mdcatRequest = null;

function closeMDCATHub() {
  if (mdcatRequest) mdcatRequest.abort();
  mdcatRequest = null;
  document.getElementById('mdcatHub').hidden = true;
}

function openMDCATHub() {
  document.getElementById('homeHero').style.display = 'none';
  document.getElementById('homeExplore').style.display = 'none';
  document.getElementById('dynamicPage').style.display = 'none';
  document.getElementById('mdcatHub').hidden = false;
  window.location.hash = 'mdcat';
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

async function loadMDCATDirectory(subject = null, unit = null) {
  if (mdcatRequest) mdcatRequest.abort();
  const controller = new AbortController();
  mdcatRequest = controller;
  const grid = document.getElementById('mdcatSubjects');
  const status = document.getElementById('mdcatStatus');
  const retry = document.getElementById('mdcatRetry');
  const noun = unit ? 'chapters' : subject ? 'units' : 'subjects';
  document.getElementById('mdcatHubTitle').textContent = unit
    ? unit.Name + ' — Chapters' : subject
    ? subject.Name + ' — Units' : 'MDCAT 2027';
  document.getElementById('mdcatHubDescription').textContent = unit
    ? subject.Name + ' · Browse the published chapters for ' + unit.Name + '.' : subject
    ? 'Browse the published units for ' + subject.Name + '.'
    : 'Explore the subjects for your MDCAT preparation.';
  document.getElementById('mdcatBackToSubjects').hidden = !subject;
  const backToUnits = document.getElementById('mdcatBackToUnits');
  backToUnits.hidden = !unit;
  backToUnits.textContent = unit ? '← ' + subject.Name + ' units' : '← Units';
  backToUnits.onclick = unit ? () => openMDCATUnits(subject) : null;
  grid.setAttribute('aria-label', unit ? unit.Name + ' chapters' : subject ? subject.Name + ' units' : 'MDCAT subjects');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading ' + noun + '…';
  retry.hidden = true;
  retry.onclick = () => loadMDCATDirectory(subject, unit);

  // A slow/unavailable deployment must not leave an endless loading state.
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const query = unit
      ? '?action=mdcatChapters&subjectId=' + encodeURIComponent(subject.ID) +
        '&unitId=' + encodeURIComponent(unit.ID) : subject
      ? '?action=mdcatUnits&subjectId=' + encodeURIComponent(subject.ID)
      : '?action=mdcatSubjects';
    const response = await fetch(API_BASE_URL + query, {
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result || result.success !== true || !Array.isArray(result.data)) {
      throw new Error('Invalid MDCAT directory response');
    }
    if (mdcatRequest !== controller) return;

    const records = result.data;
    if (records.some(item => !item || typeof item.Name !== 'string' || !item.Name.trim() ||
      (!unit && (item.ID == null || !String(item.ID).trim())) ||
      (subject && String(item.SubjectID) !== String(subject.ID)) ||
      (unit && String(item.UnitID) !== String(unit.ID)))) {
      throw new Error('Invalid MDCAT directory record');
    }
    const order = subject => {
      const value = Number(subject.DisplayOrder);
      return Number.isFinite(value) ? value : 0;
    };
    records.slice().sort((a, b) => order(a) - order(b)).forEach(item => {
      const card = document.createElement('article');
      card.className = 'card mdcat-subject-card';
      // Chapters are display-only here; do not invent an ID if the API omits it.
      if (unit) {
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
      description.textContent = item.Description || (unit
        ? 'Learning materials for this chapter will be added here.' : subject
        ? 'Explore the available chapters for this unit.'
        : 'Explore the available units for this subject.');
      card.append(icon, heading, description);
      if (/^MD[UC]-DEMO-/i.test(String(item.ID)) || (unit && /^MDU-DEMO-/i.test(String(unit.ID)))) {
        const demo = document.createElement('p');
        demo.className = 'mdcat-demo';
        demo.textContent = 'Demo content — navigation test only, not official syllabus content.';
        card.appendChild(demo);
      }
      if (!unit) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'resource-button mdcat-open-units';
        button.textContent = subject ? 'View chapters' : 'View units';
        button.setAttribute('aria-label', 'View ' + item.Name + (subject ? ' chapters' : ' units'));
        button.onclick = subject ? () => openMDCATChapters(subject, item) : () => openMDCATUnits(item);
        card.appendChild(button);
      }
      grid.appendChild(card);
    });
    status.textContent = records.length
      ? records.length + ' ' + (records.length === 1 ? noun.slice(0, -1) : noun) + ' available.'
      : 'No ' + noun + ' are published' + (unit ? ' for ' + unit.Name : subject ? ' for ' + subject.Name : '') + ' yet. Please check again later.';
  } catch (error) {
    // Navigation or a newer request owns the screen now.
    if (mdcatRequest !== controller) return;
    console.error('MDCAT directory error:', error);
    status.textContent = 'Unable to load ' + noun + ' right now. Please try again.';
    retry.hidden = false;
  } finally {
    clearTimeout(timeout);
    if (mdcatRequest === controller) {
      grid.setAttribute('aria-busy', 'false');
      mdcatRequest = null;
    }
  }
}
