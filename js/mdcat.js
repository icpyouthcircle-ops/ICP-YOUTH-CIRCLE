// Read only public MDCAT subjects and units; other portal modules stay separate.
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

async function loadMDCATDirectory(subject = null) {
  if (mdcatRequest) mdcatRequest.abort();
  const controller = new AbortController();
  mdcatRequest = controller;
  const grid = document.getElementById('mdcatSubjects');
  const status = document.getElementById('mdcatStatus');
  const retry = document.getElementById('mdcatRetry');
  const noun = subject ? 'units' : 'subjects';
  document.getElementById('mdcatHubTitle').textContent = subject
    ? subject.Name + ' — Units' : 'MDCAT 2027';
  document.getElementById('mdcatHubDescription').textContent = subject
    ? 'Browse the published units for ' + subject.Name + '.'
    : 'Explore the subjects for your MDCAT preparation.';
  document.getElementById('mdcatBackToSubjects').hidden = !subject;
  grid.setAttribute('aria-label', subject ? subject.Name + ' units' : 'MDCAT subjects');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading ' + noun + '…';
  retry.hidden = true;
  retry.onclick = () => loadMDCATDirectory(subject);

  // A slow/unavailable deployment must not leave an endless loading state.
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const query = subject
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
      item.ID == null || !String(item.ID).trim() ||
      (subject && String(item.SubjectID) !== String(subject.ID)))) {
      throw new Error('Invalid MDCAT directory record');
    }
    const order = subject => {
      const value = Number(subject.DisplayOrder);
      return Number.isFinite(value) ? value : 0;
    };
    records.slice().sort((a, b) => order(a) - order(b)).forEach(item => {
      const card = document.createElement('article');
      card.className = 'card mdcat-subject-card';
      if (subject) card.dataset.unitId = String(item.ID);
      else card.dataset.subjectId = String(item.ID);

      const icon = document.createElement('span');
      icon.className = 'mdcat-subject-icon';
      icon.setAttribute('aria-hidden', 'true');
      // Sheet values remain text, never HTML or executable markup.
      icon.textContent = item.Icon || item.Name.trim().charAt(0);
      const heading = document.createElement('h3');
      heading.textContent = item.Name;
      const description = document.createElement('p');
      description.textContent = item.Description || (subject
        ? 'Learning materials for this unit will be added here.'
        : 'Explore the available units for this subject.');
      card.append(icon, heading, description);
      if (subject && /^MDU-DEMO-/i.test(String(item.ID))) {
        const demo = document.createElement('p');
        demo.className = 'mdcat-demo';
        demo.textContent = 'Demo content — navigation test only, not official syllabus content.';
        card.appendChild(demo);
      }
      if (!subject) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'resource-button mdcat-open-units';
        button.textContent = 'View units';
        button.setAttribute('aria-label', 'View ' + item.Name + ' units');
        button.onclick = () => openMDCATUnits(item);
        card.appendChild(button);
      }
      grid.appendChild(card);
    });
    status.textContent = records.length
      ? records.length + ' ' + (records.length === 1 ? noun.slice(0, -1) : noun) + ' available.'
      : 'No ' + noun + ' are published' + (subject ? ' for ' + subject.Name : '') + ' yet. Please check again later.';
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
