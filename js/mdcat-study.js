// Public content and explicitly browser-local learning tools. No answer keys or private API routes.
let mdcatTimer = null;
let mdcatSession = null;
const MDCAT_LOCAL_KEY = 'icp-mdcat-local-v1';

function resetMDCATStudy() {
  clearInterval(mdcatTimer);
  mdcatTimer = null;
  mdcatSession = null;
}

function mdcatElement(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function mdcatButton(text, action) {
  const button = mdcatElement('button', text, 'resource-button');
  button.type = 'button';
  button.onclick = action;
  return button;
}

function mdcatStudyPage(title, description, back) {
  resetMDCATStudy();
  if (mdcatRequest) mdcatRequest.abort();
  const controller = new AbortController();
  mdcatRequest = controller;
  document.getElementById('mdcatHubTitle').textContent = title;
  document.getElementById('mdcatHubDescription').textContent = description;
  document.getElementById('mdcatBackToSubjects').hidden = false;
  document.getElementById('mdcatBackToUnits').hidden = true;
  document.getElementById('mdcatBackToChapters').hidden = true;
  const grid = document.getElementById('mdcatSubjects');
  grid.replaceChildren();
  grid.setAttribute('aria-label', title);
  grid.setAttribute('aria-busy', 'false');
  document.getElementById('mdcatRetry').hidden = true;
  document.getElementById('mdcatStatus').textContent = '';
  if (back) {
    const row = mdcatElement('div', null, 'mdcat-wide');
    row.appendChild(mdcatButton('← Back', back));
    grid.appendChild(row);
  }
  document.getElementById('mdcatHubTitle').focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: 'smooth'});
  return {controller, grid};
}

async function mdcatFetch(action, params, controller) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null && String(value).trim()) url.searchParams.set(key, String(value));
  }
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (!result || result.success !== true || !Array.isArray(result.data) ||
      result.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error('Invalid public MDCAT response');
    }
    return result.data;
  } finally { clearTimeout(timeout); }
}

function mdcatFailure(controller, retry) {
  if (mdcatRequest !== controller) return;
  document.getElementById('mdcatSubjects').setAttribute('aria-busy', 'false');
  document.getElementById('mdcatStatus').textContent = 'Unable to load this content right now. Please try again.';
  const button = document.getElementById('mdcatRetry');
  button.hidden = false;
  button.onclick = retry;
}

function mdcatScope(row) {
  return Object.fromEntries(['SubjectID', 'UnitID', 'ChapterID', 'TopicID']
    .filter(key => row[key] != null && String(row[key]).trim())
    .map(key => [key, String(row[key])]));
}

function mdcatParams(scope) {
  return Object.fromEntries(Object.entries(scope).map(([key, value]) => [key.charAt(0).toLowerCase() + key.slice(1).replace('ID', 'Id'), value]));
}

function mdcatValidateQuestions(rows, scope) {
  const ids = new Set();
  for (const row of rows) {
    if (row.ID == null || !String(row.ID).trim() || ids.has(String(row.ID)) ||
      typeof row.Question !== 'string' || !row.Question.trim() ||
      ['A', 'B', 'C', 'D'].some(key => row['Option' + key] == null || !String(row['Option' + key]).trim()) ||
      Object.entries(scope).some(([key, value]) => String(row[key]) !== String(value))) {
      throw new Error('Invalid question or hierarchy');
    }
    ids.add(String(row.ID));
  }
  return rows;
}

function mdcatDemo(card, row) {
  if (/-DEMO-/i.test(String(row.ID))) card.appendChild(mdcatElement('p', 'Demo content — not official syllabus or exam material.', 'mdcat-demo'));
}

// Date-only sheet cells serialize as midnight in Pakistan, which is the prior UTC day.
function mdcatCalendarDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-CA', {timeZone:'Asia/Karachi'});
}

async function openMDCATCollection(kind) {
  const configs = {
    tests: ['Tests', 'mdcatTests'], daily: ['Daily practice', 'mdcatDailyPractice'], updates: ['MDCAT updates', 'mdcatUpdates']
  };
  const config = configs[kind];
  if (!config) return;
  const {controller, grid} = mdcatStudyPage(config[0], kind === 'updates'
    ? 'Published notices and their source links.' : 'Browse published practice sets. Attempts are ungraded.');
  document.getElementById('mdcatStatus').textContent = 'Loading…';
  grid.setAttribute('aria-busy', 'true');
  try {
    const rows = await mdcatFetch(config[1], {}, controller);
    if (mdcatRequest !== controller) return;
    if (rows.some(row => !row.Title)) throw new Error('Missing title');
    const today = mdcatCalendarDate(new Date());
    const visible = rows.filter(row => {
      if (kind !== 'updates') return true;
      const date = mdcatCalendarDate;
      return (!date(row.PublishDate) || date(row.PublishDate) <= today) && (!date(row.ExpiryDate) || date(row.ExpiryDate) >= today);
    });
    for (const row of visible) {
      const card = mdcatElement('article', null, 'card mdcat-study-card');
      card.appendChild(mdcatElement('h3', row.Title));
      mdcatDemo(card, row);
      if (kind === 'updates') {
        if (row.Category) card.appendChild(mdcatElement('p', row.Category));
        if (mdcatCalendarDate(row.PublishDate)) card.appendChild(mdcatElement('p', 'Published: ' + mdcatCalendarDate(row.PublishDate)));
        if (row.Summary) card.appendChild(mdcatElement('p', row.Summary));
        if (row.Content) {
          const details = document.createElement('details');
          details.append(mdcatElement('summary', 'Read update'), mdcatElement('p', row.Content));
          card.appendChild(details);
        }
        try {
          const url = new URL(row.OfficialURL);
          if (['https:', 'http:'].includes(url.protocol)) {
            const link = mdcatElement('a', 'View source', 'resource-button');
            link.href = url.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            card.appendChild(link);
          }
        } catch (_) { /* No valid source link was supplied. */ }
      } else {
        if (row.Description) card.appendChild(mdcatElement('p', row.Description));
        if (mdcatCalendarDate(row.Date)) card.appendChild(mdcatElement('p', 'Scheduled date: ' + mdcatCalendarDate(row.Date)));
        const count = kind === 'tests' ? row.TotalQuestions : row.QuestionCount;
        if (count) card.appendChild(mdcatElement('p', count + ' questions'));
        if (Number(row.DurationMinutes) > 0) card.appendChild(mdcatElement('p', row.DurationMinutes + ' minutes'));
        if (kind === 'tests' && (row.ID == null || !String(row.ID).trim())) {
          card.appendChild(mdcatElement('p', 'This test is awaiting setup.'));
        } else card.appendChild(mdcatButton('Open practice set', () => openMDCATSet(kind, row)));
      }
      grid.appendChild(card);
    }
    grid.setAttribute('aria-busy', 'false');
    document.getElementById('mdcatStatus').textContent = visible.length ? visible.length + ' published items.' : 'No content is published here yet.';
  } catch (_) { mdcatFailure(controller, () => openMDCATCollection(kind)); }
}

async function openMDCATPractice(scope = {}, title = 'Question bank', back) {
  const {controller, grid} = mdcatStudyPage(title, 'Choose answers to practise. No score or answer key is available.', back);
  document.getElementById('mdcatStatus').textContent = 'Loading questions…';
  grid.setAttribute('aria-busy', 'true');
  try {
    const rows = mdcatValidateQuestions(await mdcatFetch('mdcatQuestions', mdcatParams(scope), controller), scope);
    if (mdcatRequest !== controller) return;
    grid.setAttribute('aria-busy', 'false');
    document.getElementById('mdcatStatus').textContent = rows.length ? rows.length + ' questions available.' : 'No questions are published here yet.';
    if (rows.length) mdcatPrepareSession(rows, {Title:title}, grid, false);
  } catch (_) { mdcatFailure(controller, () => openMDCATPractice(scope, title, back)); }
}

async function openMDCATSet(kind, row) {
  const {controller, grid} = mdcatStudyPage(row.Title, 'Timed practice — ungraded. Leaving this page discards an unfinished attempt.', () => openMDCATCollection(kind));
  grid.setAttribute('aria-busy', 'true');
  document.getElementById('mdcatStatus').textContent = 'Loading practice set…';
  try {
    const scope = mdcatScope(row);
    let questions;
    if (kind === 'tests') {
      const links = await mdcatFetch('mdcatTestQuestions', {testId:row.ID}, controller);
      if (mdcatRequest !== controller) return;
      const linked = new Set();
      for (const link of links) {
        if (String(link.TestID) !== String(row.ID) || !link.QuestionID || linked.has(String(link.QuestionID))) {
          throw new Error('Invalid test mapping');
        }
        linked.add(String(link.QuestionID));
      }
      if (!links.length) questions = [];
      else {
        const bank = mdcatValidateQuestions(await mdcatFetch('mdcatQuestions', {}, controller), {});
        const byId = new Map(bank.map(question => [String(question.ID), question]));
        questions = links.slice().sort((a,b) => (Number(a.DisplayOrder)||0)-(Number(b.DisplayOrder)||0)).map(link => byId.get(String(link.QuestionID)));
        if (questions.some(question => !question)) throw new Error('Unpublished linked question');
        mdcatValidateQuestions(questions, scope);
      }
    } else {
      questions = mdcatValidateQuestions(await mdcatFetch('mdcatQuestions', mdcatParams(scope), controller), scope);
      if (row.Difficulty) questions = questions.filter(question => String(question.Difficulty).toLowerCase() === String(row.Difficulty).toLowerCase());
    }
    if (mdcatRequest !== controller) return;
    const count = Number(kind === 'tests' ? row.TotalQuestions : row.QuestionCount);
    if (questions.length && (!Number.isInteger(count) || count <= 0 || (kind === 'tests' ? questions.length !== count : questions.length < count))) {
      throw new Error('Practice set count does not match published questions');
    }
    if (kind === 'daily') questions = questions.slice(0, count);
    grid.setAttribute('aria-busy', 'false');
    document.getElementById('mdcatStatus').textContent = questions.length ? questions.length + ' questions ready.' : 'No questions are published for this set yet.';
    if (questions.length) mdcatPrepareSession(questions, row, grid, true);
  } catch (_) { mdcatFailure(controller, () => openMDCATSet(kind, row)); }
}

function mdcatShuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mdcatPrepareSession(questions, settings, grid, timed) {
  const intro = mdcatElement('div', null, 'mdcat-wide mdcat-study-card');
  intro.appendChild(mdcatElement('p', 'Answers are not graded. Finish the session to review your selections; you can then save activity in this browser. Leaving discards the unfinished session.'));
  const minutes = Number(settings.DurationMinutes);
  const duration = timed && Number.isFinite(minutes) && minutes > 0 ? minutes * 60000 : null;
  intro.appendChild(mdcatElement('p', duration ? 'Time allowed: ' + minutes + ' minutes. The timer starts when you press Start.' : 'Untimed practice.'));
  intro.appendChild(mdcatButton('Start practice', () => {
    intro.remove();
    const yes = value => /^(yes|true)$/i.test(String(value));
    mdcatSession = {
      questions: yes(settings.RandomizeQuestions) ? mdcatShuffle(questions) : questions,
      title: settings.Title, answers: {}, startedAt: Date.now(), deadline: duration ? Date.now() + duration : null,
      finished: false, saved: false
    };
    const session = mdcatSession;
    const panel = mdcatElement('div', null, 'mdcat-wide');
    const timer = mdcatElement('p', '', 'mdcat-clock');
    timer.setAttribute('role', 'timer');
    panel.appendChild(timer);
    const form = document.createElement('form');
    session.questions.forEach((question, index) => {
      const fieldset = mdcatElement('fieldset', null, 'mdcat-question');
      fieldset.appendChild(mdcatElement('legend', (index + 1) + '. ' + question.Question));
      mdcatDemo(fieldset, question);
      const options = yes(settings.RandomizeOptions) ? mdcatShuffle(['A','B','C','D']) : ['A','B','C','D'];
      for (const key of options) {
        const label = mdcatElement('label', null, 'mdcat-option');
        const input = document.createElement('input');
        input.type = 'radio'; input.name = 'mdcat-q-' + index; input.value = key;
        input.onchange = () => {
          if (session.deadline && Date.now() >= session.deadline) {
            // Reject a late selection even if a background tab delayed the timer tick.
            input.checked = false;
            const selected = session.answers[String(question.ID)];
            if (selected) fieldset.querySelector('input[value="' + selected + '"]').checked = true;
            end(true);
          } else if (!session.finished) session.answers[String(question.ID)] = key;
        };
        label.append(input, mdcatElement('span', key + '. ' + question['Option' + key]));
        fieldset.appendChild(label);
      }
      fieldset.appendChild(mdcatButton('Save for revision', event => {
        const local = mdcatReadLocal();
        if (!local) return;
        if (!local.revision.some(item => String(item.ID) === String(question.ID))) local.revision.push(question);
        if (mdcatWriteLocal(local)) { event.currentTarget.textContent = 'Saved for revision'; event.currentTarget.disabled = true; }
      }));
      form.appendChild(fieldset);
    });
    const finish = mdcatElement('button', 'Finish practice', 'resource-button');
    finish.type = 'submit';
    form.appendChild(finish);
    const end = expired => {
      if (mdcatSession !== session || session.finished) return;
      session.finished = true;
      clearInterval(mdcatTimer); mdcatTimer = null;
      form.querySelectorAll('input').forEach(input => { input.disabled = true; });
      finish.disabled = true;
      const attempted = Object.keys(session.answers).length;
      const seconds = Math.max(0, Math.round(((session.deadline ? Math.min(Date.now(), session.deadline) : Date.now()) - session.startedAt) / 1000));
      timer.textContent = expired ? 'Time is up.' : 'Practice finished.';
      const result = mdcatElement('div', null, 'mdcat-result');
      result.setAttribute('role','status');
      result.appendChild(mdcatElement('h3', 'Attempt summary — ungraded'));
      result.appendChild(mdcatElement('p', attempted + ' answered · ' + (session.questions.length-attempted) + ' unanswered · ' + seconds + ' seconds. No score or accuracy is available.'));
      result.appendChild(mdcatButton('Save activity in this browser', event => {
        if (session.saved) return;
        const local = mdcatReadLocal();
        if (!local) return;
        local.attempts.push({title:session.title, total:session.questions.length, answered:attempted, seconds, date:new Date().toISOString()});
        local.attempts = local.attempts.slice(-100);
        if (mdcatWriteLocal(local)) { session.saved = true; event.currentTarget.disabled = true; event.currentTarget.textContent = 'Activity saved'; }
      }));
      panel.appendChild(result);
    };
    form.onsubmit = event => { event.preventDefault(); end(Boolean(session.deadline && Date.now() >= session.deadline)); };
    panel.appendChild(form); grid.appendChild(panel);
    const tick = () => {
      if (!session.deadline) { timer.textContent = 'Untimed practice'; return; }
      const remaining = Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000));
      timer.textContent = 'Time remaining: ' + Math.floor(remaining/60) + ':' + String(remaining%60).padStart(2,'0');
      if (remaining === 0) end(true);
    };
    if (duration) mdcatTimer = setInterval(tick, 250);
    tick();
  }));
  grid.appendChild(intro);
}

function mdcatReadLocal() {
  try {
    const stored = localStorage.getItem(MDCAT_LOCAL_KEY);
    const data = stored ? JSON.parse(stored) : {attempts:[], revision:[], plan:[]};
    if (!data || !['attempts','revision','plan'].every(key => Array.isArray(data[key]) && data[key].every(item => item && typeof item === 'object'))) throw new Error('Invalid saved data');
    return data;
  } catch (_) {
    document.getElementById('mdcatStatus').textContent = 'Browser storage is unavailable or unreadable. Nothing has been saved. Existing stored data has not been overwritten.';
    return null;
  }
}

function mdcatWriteLocal(data) {
  try { localStorage.setItem(MDCAT_LOCAL_KEY, JSON.stringify(data)); return true; }
  catch (_) { document.getElementById('mdcatStatus').textContent = 'Unable to save in this browser. Your change was not saved.'; return false; }
}

function openMDCATLocal(kind) {
  const titles = {progress:'My activity', revision:'Revision', plan:'Study plan'};
  if (!titles[kind]) return;
  const {grid} = mdcatStudyPage(titles[kind], 'Stored in this browser only. These records are not synced to an account or Google Sheets.');
  const data = mdcatReadLocal();
  if (!data) return;
  if (kind === 'progress') {
    const summary = mdcatElement('div', null, 'mdcat-wide');
    summary.appendChild(mdcatElement('p', data.attempts.length + ' saved sessions · ' + data.attempts.reduce((sum,row)=>sum+(Number(row.answered)||0),0) + ' answers selected. Accuracy, mastery and scores are not calculated.'));
    grid.appendChild(summary);
    for (const row of data.attempts.slice().reverse()) {
      const card = mdcatElement('article', null, 'card mdcat-study-card');
      card.append(mdcatElement('h3', row.title), mdcatElement('p', String(row.date).slice(0,10)), mdcatElement('p', row.answered + '/' + row.total + ' answered · ' + row.seconds + ' seconds · Ungraded'));
      grid.appendChild(card);
    }
  }
  if (kind === 'revision') {
    if (!data.revision.length) grid.appendChild(mdcatElement('p', 'No saved questions yet. Use Save for revision during practice.'));
    for (const question of data.revision) {
      const card = mdcatElement('article', null, 'card mdcat-study-card');
      card.appendChild(mdcatElement('h3', question.Question));
      card.appendChild(mdcatButton('Practise saved question', () => {
        const {grid:practiceGrid} = mdcatStudyPage('Revision practice', 'Saved question snapshot — ungraded.', () => openMDCATLocal('revision'));
        mdcatPrepareSession([question], {Title:'Revision practice'}, practiceGrid, false);
      }));
      card.appendChild(mdcatButton('Remove from revision', () => {
        const fresh = mdcatReadLocal(); if (!fresh) return;
        fresh.revision = fresh.revision.filter(item => String(item.ID) !== String(question.ID));
        if (mdcatWriteLocal(fresh)) openMDCATLocal('revision');
      }));
      grid.appendChild(card);
    }
  }
  if (kind === 'plan') {
    const form = mdcatElement('form', null, 'mdcat-wide mdcat-plan-form');
    const taskLabel = mdcatElement('label', 'Study task');
    const input = document.createElement('input'); input.required = true; input.maxLength = 200; input.type = 'text';
    taskLabel.appendChild(input);
    const dateLabel = mdcatElement('label', 'Target date (optional)');
    const date = document.createElement('input'); date.type = 'date'; dateLabel.appendChild(date);
    const add = mdcatElement('button','Add task','resource-button'); add.type = 'submit';
    form.append(taskLabel,dateLabel,add);
    form.onsubmit = event => {
      event.preventDefault(); if (!input.value.trim()) return;
      const fresh = mdcatReadLocal(); if (!fresh) return;
      fresh.plan.push({id:crypto.randomUUID(),title:input.value.trim(),date:date.value,done:false});
      if (mdcatWriteLocal(fresh)) openMDCATLocal('plan');
    };
    grid.appendChild(form);
    for (const task of data.plan) {
      const card = mdcatElement('article',null,'card mdcat-study-card');
      card.append(mdcatElement('h3',task.title),mdcatElement('p',(task.done ? 'Completed' : 'Planned') + (task.date ? ' · '+task.date : '')));
      const update = remove => {
        const fresh = mdcatReadLocal(); if (!fresh) return;
        if (remove) fresh.plan = fresh.plan.filter(item=>item.id!==task.id);
        else fresh.plan = fresh.plan.map(item=>item.id===task.id ? {...item,done:!item.done} : item);
        if (mdcatWriteLocal(fresh)) openMDCATLocal('plan');
      };
      card.append(mdcatButton(task.done ? 'Mark incomplete' : 'Mark complete',()=>update(false)),mdcatButton('Remove task',()=>update(true)));
      grid.appendChild(card);
    }
  }
}
