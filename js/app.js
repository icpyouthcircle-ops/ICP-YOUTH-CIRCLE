const API_BASE_URL =
  'https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec';
    let portalData = null;
    let currentResources = [];
    let currentVideos = [];
    let currentAdmissions = [];
    let currentScholarships = [];
    let currentOpportunities = [];
    let currentAnnouncements = [];
    let currentAITools = [];
    let currentIslamicContent = [];

    let mcqScore = 0;
    let mcqAnswered = 0;
    let currentMCQs = [];

    let activeQuizMCQs = [];
    let currentMCQIndex = 0;
    let mockTestActive = false;

    let mockTestSubmitted = false;
    let mockTestAnswers = {};
    document.addEventListener(
      'DOMContentLoaded',
      loadPortal
    );


   function loadPortal() {
  fetch(API_BASE_URL + '?action=portalData')
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

      renderPortal(result.data);
    })
    .catch(error => {
      console.error(
        'Portal data error:',
        error
      );

      showError(error);
    });
}


    function renderPortal(data) {

      portalData = data;

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


      document.getElementById(
        'loading'
      ).style.display = 'none';


      document.getElementById(
        'app'
      ).style.display = 'block';

    }

function renderNavigation(items) {

  const nav = document.getElementById('mainNavigation');

  nav.innerHTML = '';

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

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = parent.Label;

    link.onclick = function(event) {
      event.preventDefault();
      handleNavigation(parent);
    };

    wrapper.appendChild(link);

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

      children.forEach(child => {

        const childLink = document.createElement('a');

        childLink.href = '#';
        childLink.textContent = child.Label;

        childLink.onclick = function(event) {
          event.preventDefault();
          handleNavigation(child);
        };

        dropdown.appendChild(childLink);

      });

      wrapper.appendChild(dropdown);
    }

    nav.appendChild(wrapper);
  });
}

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

        card.className = 'card';


        const title =
          document.createElement('h4');

        title.textContent =
          category.Name;


        const description =
          document.createElement('p');

        description.textContent =
          category.Description || '';


        card.appendChild(title);
        card.appendChild(description);

        card.onclick = function() {
          openCategory(category);
        };

        grid.appendChild(card);

      });

    }




    function openCategory(category) {

      console.log(
        'Category:',
        category
      );

      alert(
        category.Name +
        ' section will open here.'
      );

    }
function handleNavigation(item) {

  if (item.Slug === 'home') {
    showHome();
    return;
  }

  const title =
    document.getElementById('dynamicPageTitle');

  const description =
    document.getElementById('dynamicPageDescription');

  const content =
    document.getElementById('dynamicPageContent');

  title.textContent = item.Label;

  description.textContent =
    'Explore ' + item.Label +
    ' content from ICP YOUTH CIRCLE.';

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
}
if (item.Slug === 'mcqs') {
  loadMCQs();
}
if (item.Slug === 'videos') {
  loadVideos();
}
if (item.Slug === 'admissions') {
  loadAdmissions();
}
if (item.Slug === 'scholarships') {
  loadScholarships();
}
if (item.Slug === 'career') {
  loadOpportunities();
}
if (
  item.Slug === 'updates' ||
  item.Slug === 'announcements'
) {
  loadAnnouncements();
}
if (
  item.Slug === 'ai-smart-tools' ||
  item.Slug === 'ai-tools'
) {
  loadAITools();
}
if (
  item.Slug === 'islamic' ||
  item.Slug === 'hadith' ||
  item.Slug === 'islamic-reminders' ||
  item.Slug === 'duas-motivation'
) {
  loadIslamicContent(item.Slug);
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

  window.location.hash =
    item.TargetURL || item.Slug;

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
function showHome() {

  document.getElementById(
    'dynamicPage'
  ).style.display = 'none';

  document.getElementById(
    'homeHero'
  ).style.display = 'block';

  document.getElementById(
    'homeExplore'
  ).style.display = 'block';

  history.replaceState(
    null,
    '',
    window.location.pathname
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}
function loadResourcesByCategory(categoryName) {

  const content =
    document.getElementById('dynamicPageContent');

  content.innerHTML =
    '<p>Loading resources...</p>';

fetch(
  API_BASE_URL +
  '?action=resources&category=' +
  encodeURIComponent(categoryName)
)
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
        'Unable to load resources.'
      );
    }

    renderResourceCards(result.data);
  })
  .catch(error => {
    console.error(
      'Resources error:',
      error
    );

  showResourceError(error);
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


    if (resource.ThumbnailURL) {

      const image =
        document.createElement('img');

      image.src =
        resource.ThumbnailURL;

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


    if (resource.FileURL) {

      const link =
        document.createElement('a');

      link.href =
        resource.FileURL;

      link.target =
        '_blank';

      link.rel =
        'noopener noreferrer';

      link.textContent =
        'Open Resource';

      link.className =
        'resource-button';

      body.appendChild(link);
    }


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

 fetch(
  API_BASE_URL + '?action=mcqs'
)
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
        'Unable to load MCQs.'
      );
    }

    renderMCQs(result.data);
  })
  .catch(error => {
    console.error(
      'MCQ error:',
      error
    );

  showMCQError(error);
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

fetch(
  API_BASE_URL + '?action=videos'
)
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
        'Unable to load videos.'
      );
    }

    renderVideos(result.data);
  })
  .catch(error => {
    console.error(
      'Videos error:',
      error
    );

  showVideoError(error);
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

    if (video.ThumbnailURL) {

      const image =
        document.createElement('img');

      image.src = video.ThumbnailURL;
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

    if (video.VideoURL) {

      const link =
        document.createElement('a');

      link.href = video.VideoURL;
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
function loadAdmissions() {

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

fetch(
  API_BASE_URL + '?action=admissions'
)
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
        'Unable to load admissions.'
      );
    }

    renderAdmissions(result.data);
  })
  .catch(error => {
    console.error(
      'Admissions error:',
      error
    );

  showAdmissionsError(error);
  });
  }
  
function loadScholarships() {
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  title.textContent = 'Scholarships';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading scholarships...</p>';

 fetch(
  API_BASE_URL + '?action=scholarships'
)
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
        'Unable to load scholarships.'
      );
    }

    renderScholarships(result.data);
  })
  .catch(error => {
    console.error(
      'Scholarships error:',
      error
    );

  showScholarshipsError(error);
  });
  }
  
function loadOpportunities() {
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  title.textContent = 'Career Opportunities';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading opportunities...</p>';

 fetch(
  API_BASE_URL + '?action=opportunities'
)
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
        'Unable to load opportunities.'
      );
    }

    renderOpportunities(result.data);
  })
  .catch(error => {
    console.error(
      'Opportunities error:',
      error
    );

  showOpportunitiesError(error);
  });
  }
  
function loadAnnouncements() {
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  title.textContent =
    'Updates & Announcements';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading announcements...</p>';

 fetch(
  API_BASE_URL + '?action=announcements'
)
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
        'Unable to load announcements.'
      );
    }

    renderAnnouncements(result.data);
  })
  .catch(error => {
    console.error(
      'Announcements error:',
      error
    );

  showAnnouncementsError(error);
  });
  }
  
function loadAITools() {
  const title =
    document.getElementById('dynamicPageTitle');

  const content =
    document.getElementById('dynamicPageContent');

  const filters =
    document.getElementById('resourceFilters');

  title.textContent =
    'AI & Smart Tools';

  filters.innerHTML = '';
  filters.style.display = 'none';

  content.innerHTML =
    '<p>Loading AI tools...</p>';

 fetch(
  API_BASE_URL + '?action=aiTools'
)
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
        'Unable to load AI tools.'
      );
    }

    renderAITools(result.data);
  })
  .catch(error => {
    console.error(
      'AI Tools error:',
      error
    );

  showAIToolsError(error);
  });
  }
  
function loadIslamicContent(slug) {
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

  fetch(
    API_BASE_URL + '?action=islamicContent'
  )
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
          'Unable to load Islamic content.'
        );
      }

      renderIslamicContent(
        result.data,
        slug
      );
    })
    .catch(error => {
      console.error(
        'Islamic Content error:',
        error
      );

      showIslamicContentError(error);
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

    if (item.SourceURL) {
      const link =
        document.createElement('a');

      link.href = item.SourceURL;
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


    if (item.LogoURL) {
      const logo =
        document.createElement('img');

      logo.src =
        item.LogoURL;

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


    if (item.ToolURL) {
      const link =
        document.createElement('a');

      link.href =
        item.ToolURL;

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


    if (item.OfficialURL) {

      const link =
        document.createElement('a');

      link.href =
        item.OfficialURL;

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

    if (item.OfficialURL) {
      const link =
        document.createElement('a');

      link.href =
        item.OfficialURL;

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

    if (item.OfficialURL) {
      const link =
        document.createElement('a');

      link.href =
        item.OfficialURL;

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


    if (item.OfficialURL) {

      const link =
        document.createElement('a');

      link.href =
        item.OfficialURL;

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
    function portalSearch() {

      const query =
        document
          .getElementById(
            'searchInput'
          )
          .value
          .trim();

      if (!query) {
        alert(
          'Please enter something to search.'
        );

        return;
      }

      alert(
        'Search for: ' + query
      );

    }


    function showError(error) {

      document.getElementById(
        'loading'
      ).innerHTML =
        'Unable to load the portal.<br><br>' +
        error.message;

    }
