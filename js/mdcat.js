// The first MDCAT release reads only the public subject directory.
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
  if (mdcatRequest) mdcatRequest.abort();
  const controller = new AbortController();
  mdcatRequest = controller;
  const grid = document.getElementById('mdcatSubjects');
  const status = document.getElementById('mdcatStatus');
  const retry = document.getElementById('mdcatRetry');
  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading subjects…';
  retry.hidden = true;
  retry.onclick = loadMDCATSubjects;

  // A slow/unavailable deployment must not leave an endless loading state.
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(API_BASE_URL + '?action=mdcatSubjects', {
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result || result.success !== true || !Array.isArray(result.data)) {
      throw new Error('Invalid MDCAT subject response');
    }
    if (mdcatRequest !== controller) return;

    const subjects = result.data;
    if (subjects.some(subject => !subject || typeof subject.Name !== 'string' || !subject.Name.trim())) {
      throw new Error('Invalid MDCAT subject record');
    }
    const order = subject => {
      const value = Number(subject.DisplayOrder);
      return Number.isFinite(value) ? value : 0;
    };
    subjects.slice().sort((a, b) => order(a) - order(b)).forEach(subject => {
      const card = document.createElement('article');
      card.className = 'card mdcat-subject-card';
      if (subject.ID != null) card.dataset.subjectId = String(subject.ID);
      if (subject.Slug != null) card.dataset.subjectSlug = String(subject.Slug);

      const icon = document.createElement('span');
      icon.className = 'mdcat-subject-icon';
      icon.setAttribute('aria-hidden', 'true');
      // Sheet values remain text, never HTML or executable markup.
      icon.textContent = subject.Icon || subject.Name.trim().charAt(0);
      const heading = document.createElement('h3');
      heading.textContent = subject.Name;
      const description = document.createElement('p');
      description.textContent = subject.Description ||
        'Learning materials for this subject will be added here.';
      card.append(icon, heading, description);
      grid.appendChild(card);
    });
    status.textContent = subjects.length
      ? subjects.length + (subjects.length === 1 ? ' subject available.' : ' subjects available.')
      : 'No subjects are published yet. Please check again later.';
  } catch (error) {
    // Navigation or a newer request owns the screen now.
    if (mdcatRequest !== controller) return;
    console.error('MDCAT subjects error:', error);
    status.textContent = 'Unable to load subjects right now. Please try again.';
    retry.hidden = false;
  } finally {
    clearTimeout(timeout);
    if (mdcatRequest === controller) {
      grid.setAttribute('aria-busy', 'false');
      mdcatRequest = null;
    }
  }
}
