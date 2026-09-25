const CONFIG = {
  APP_NAME: 'ICP YOUTH CIRCLE',
  TIMEZONE: 'Asia/Karachi',

  SHEETS: {
    RESOURCES: 'Resources',
    CATEGORIES: 'Categories',
    SUBJECTS: 'Subjects',
    LEVELS: 'Levels',
    INSTITUTIONS: 'Institutions',
    ENTRY_TESTS: 'Entry_Tests',
    ADMISSIONS: 'Admissions',
    SCHOLARSHIPS: 'Scholarships',
    OPPORTUNITIES: 'Opportunities',
    ANNOUNCEMENTS: 'Announcements',
    MCQS: 'MCQs',
    VIDEOS: 'Videos',
    AI_TOOLS: 'AI_Tools',
    ISLAMIC_CONTENT: 'Islamic_Content',
    BLOG: 'Blog',
    NAVIGATION: 'Navigation',
    HOMEPAGE: 'Homepage',
    SOCIAL_LINKS: 'Social_Links',
    SUBMISSIONS: 'Submissions',
    HELP_DESK: 'Help_Desk',
    ADMINS: 'Admins',
    ACTIVITY_LOG: 'Activity_Log',
    SETTINGS: 'Settings',
    MDCAT_SUBJECTS: 'MDCAT_Subjects',
    MDCAT_UNITS: 'MDCAT_Units',
    MDCAT_CHAPTERS: 'MDCAT_Chapters',
    MDCAT_TOPICS: 'MDCAT_Topics',
    MDCAT_QUESTION_BANK: 'MDCAT_Question_Bank',
    MDCAT_TESTS: 'MDCAT_Tests',
    MDCAT_TEST_QUESTIONS: 'MDCAT_Test_Questions',
    MDCAT_TEST_ATTEMPTS: 'MDCAT_Test_Attempts',
    MDCAT_ATTEMPT_ANSWERS: 'MDCAT_Attempt_Answers',
    MDCAT_PROGRESS: 'MDCAT_Progress',
    MDCAT_DAILY_PRACTICE: 'MDCAT_Daily_Practice',
    MDCAT_REVISION: 'MDCAT_Revision',
    MDCAT_STUDY_PLAN: 'MDCAT_Study_Plan',
    MDCAT_UPDATES: 'MDCAT_Updates',
  }
};


function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}


function getSheet_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }

  return sheet;
}


function verifyPortalSetup_() {
  const spreadsheet = getSpreadsheet_();
  const results = [];
  const missingSheets = [];

  Object.entries(CONFIG.SHEETS).forEach(([key, sheetName]) => {
    const sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
      results.push('✅ ' + sheetName);
    } else {
      results.push('❌ ' + sheetName);
      missingSheets.push(sheetName);
    }
  });

  Logger.log(results.join('\n'));

  if (missingSheets.length > 0) {
    throw new Error(
      'Missing sheet(s): ' + missingSheets.join(', ')
    );
  }

  Logger.log('✅ ICP YOUTH CIRCLE database connection verified successfully.');

  return true;
}
function getSheetData_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(header =>
    String(header).replace(/\uFEFF/g, '').trim()
  );

  return values
    .slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const item = {};

      headers.forEach((header, index) => {
        if (header) {
          item[header] = row[index];
        }
      });

      return item;
    });
}
function testGetCategories_() {
  const data = getSheetData_(CONFIG.SHEETS.CATEGORIES);
  Logger.log(JSON.stringify(data, null, 2));
}
function getActiveSheetData_(sheetName) {
  const data = getSheetData_(sheetName);

  return data.filter(item => {
    if (!Object.prototype.hasOwnProperty.call(item, 'Status')) {
      return true;
    }

    return String(item.Status).trim().toLowerCase() === 'active';
  });
}
function testGetActiveCategories_() {
  const data = getActiveSheetData_(CONFIG.SHEETS.CATEGORIES);
  Logger.log(JSON.stringify(data, null, 2));
}
function getFeaturedSheetData_(sheetName) {
  const data = getActiveSheetData_(sheetName);

  return data.filter(item => {
    if (!Object.prototype.hasOwnProperty.call(item, 'Featured')) {
      return false;
    }

    return String(item.Featured).trim().toLowerCase() === 'yes';
  });
}
function testGetFeaturedResources_() {
  const data = getFeaturedSheetData_(CONFIG.SHEETS.RESOURCES);
  Logger.log(JSON.stringify(data, null, 2));
}
function getRecordById_(sheetName, id) {
  const data = getSheetData_(sheetName);

  if (!data.length) {
    return null;
  }

  const idField = Object.keys(data[0]).find(
    key => key.trim().toLowerCase() === 'id'
  );

  if (!idField) {
    throw new Error('ID column not found in sheet: ' + sheetName);
  }

  return (
    data.find(item => String(item[idField]).trim() === String(id).trim()) ||
    null
  );
}
function testGetCategoryById_() {
  const item = getRecordById_(CONFIG.SHEETS.CATEGORIES, 'CAT-001');
  Logger.log(JSON.stringify(item, null, 2));
}
function generateNextId_(sheetName, prefix) {
  const data = getSheetData_(sheetName);

  if (!data.length) {
    return prefix + '-001';
  }

  const numbers = data
    .map(item => item.ID)
    .filter(Boolean)
    .map(id => {
      const match = String(id).match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    });

  const nextNumber = Math.max(...numbers, 0) + 1;

  return prefix + '-' + String(nextNumber).padStart(3, '0');
}
function testGenerateCategoryId_() {
  const nextId = generateNextId_(CONFIG.SHEETS.CATEGORIES, 'CAT');
  Logger.log(nextId);
}
function addRecord_(sheetName, record) {
  const sheet = getSheet_(sheetName);
  const data = sheet.getDataRange().getValues();

  if (!data.length) {
    throw new Error('Sheet has no header row: ' + sheetName);
  }

  const headers = data[0];

  const row = headers.map(header => {
    return Object.prototype.hasOwnProperty.call(record, header)
      ? record[header]
      : '';
  });

  sheet.appendRow(row);

  return record;
}
function testAddCategory_() {
  const newId = generateNextId_(CONFIG.SHEETS.CATEGORIES, 'CAT');

  const record = {
    ID: newId,
    Name: 'TEST CATEGORY',
    Slug: 'test-category',
    ParentCategory: '',
    Description: 'Temporary backend test record',
    Icon: '',
    DisplayOrder: 999,
    Status: 'Inactive',
    CreatedAt: new Date(),
    UpdatedAt: new Date()
  };

  const result = addRecord_(CONFIG.SHEETS.CATEGORIES, record);

  Logger.log(JSON.stringify(result, null, 2));
}
function updateRecordById_(sheetName, id, updates) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error('No data found in sheet: ' + sheetName);
  }

  const headers = values[0];
  const idColumnIndex = headers.indexOf('ID');

  if (idColumnIndex === -1) {
    throw new Error('ID column not found in sheet: ' + sheetName);
  }

  const targetRowIndex = values.findIndex((row, index) => {
    if (index === 0) return false;
    return String(row[idColumnIndex]).trim() === String(id).trim();
  });

  if (targetRowIndex === -1) {
    throw new Error('Record not found: ' + id);
  }

  const updatedRow = headers.map((header, columnIndex) => {
    if (Object.prototype.hasOwnProperty.call(updates, header)) {
      return updates[header];
    }

    return values[targetRowIndex][columnIndex];
  });

  sheet
    .getRange(targetRowIndex + 1, 1, 1, headers.length)
    .setValues([updatedRow]);

  return getRecordById_(sheetName, id);
}
function testUpdateCategory_() {
  const result = updateRecordById_(
    CONFIG.SHEETS.CATEGORIES,
    'CAT-059',
    {
      Name: 'UPDATED TEST CATEGORY',
      Description: 'Temporary record successfully updated',
      UpdatedAt: new Date()
    }
  );

  Logger.log(JSON.stringify(result, null, 2));
}
function deleteRecordById_(sheetName, id) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    throw new Error('No data found in sheet: ' + sheetName);
  }

  const headers = values[0];
  const idColumnIndex = headers.indexOf('ID');

  if (idColumnIndex === -1) {
    throw new Error('ID column not found in sheet: ' + sheetName);
  }

  const targetRowIndex = values.findIndex((row, index) => {
    if (index === 0) return false;
    return String(row[idColumnIndex]).trim() === String(id).trim();
  });

  if (targetRowIndex === -1) {
    throw new Error('Record not found: ' + id);
  }

  const deletedRecord = {};

  headers.forEach((header, columnIndex) => {
    deletedRecord[header] = values[targetRowIndex][columnIndex];
  });

  sheet.deleteRow(targetRowIndex + 1);

  return deletedRecord;
}
function testDeleteCategory_() {
  const result = deleteRecordById_(
    CONFIG.SHEETS.CATEGORIES,
    'CAT-059'
  );

  Logger.log(JSON.stringify(result, null, 2));
}
function logActivity_(action, entityType, entityId, details) {
  const sheet = getSheet_(CONFIG.SHEETS.ACTIVITY_LOG);

  const id = generateNextId_(
    CONFIG.SHEETS.ACTIVITY_LOG,
    'LOG'
  );

  let adminEmail = '';

  try {
    adminEmail = Session.getActiveUser().getEmail() || '';
  } catch (error) {
    adminEmail = '';
  }

  const record = {
    ID: id,
    AdminEmail: adminEmail,
    Action: action,
    EntityType: entityType,
    EntityID: entityId,
    Details: details || '',
    Timestamp: new Date()
  };

  addRecord_(CONFIG.SHEETS.ACTIVITY_LOG, record);

  return record;
}
function testActivityLog_() {
  const result = logActivity_(
    'TEST',
    'System',
    'TEST-001',
    'ICP YOUTH CIRCLE activity logging test'
  );

  Logger.log(JSON.stringify(result, null, 2));
}
function getSettingsObject_() {
  const rows = getSheetData_(CONFIG.SHEETS.SETTINGS);
  const settings = {};

  rows.forEach(row => {
    const key = String(row.Key || '').trim();

    if (key) {
      settings[key] = row.Value;
    }
  });

  return settings;
}
function getPublicPortalData_() {
  return {
    settings: getSettingsObject_(),

    navigation: getActiveSheetData_(
      CONFIG.SHEETS.NAVIGATION
    ),

    homepage: getActiveSheetData_(
      CONFIG.SHEETS.HOMEPAGE
    ),

    categories: getActiveSheetData_(
      CONFIG.SHEETS.CATEGORIES
    ),

    socialLinks: getActiveSheetData_(
      CONFIG.SHEETS.SOCIAL_LINKS
    )
  };
}
function testPublicPortalData_() {
  const data = getPublicPortalData_();

  Logger.log(
    JSON.stringify(data, null, 2)
  );
}
function jsonResponse_(data, status) {
  const payload = {
    success: status !== false,
    data: data
  };
  if (status === false) payload.error = data && data.error ? data.error : "Request failed.";

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cachedPublicJsonResponse_(key, loader, seconds) {
  const cacheKey = 'icp-public-v1-' + String(key).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 200);
  let cache = null;
  try {
    cache = CacheService.getScriptCache();
    const cached = cache.get(cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  } catch (_) {}
  const payload = JSON.stringify({success:true,data:loader()});
  try {
    if (cache && payload.length < 95000) cache.put(cacheKey,payload,seconds || 300);
  } catch (_) {}
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}
// ==========================================
// MDCAT 2027 - PUBLIC DATA FUNCTIONS
// ==========================================

function getPublicMDCATSubjects_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_SUBJECTS
    );

  return rows
    .map(item => ({
      ID: item.ID,
      Name: item.Name,
      Slug: item.Slug,
      Description: item.Description,
      Icon: item.Icon,
      DisplayOrder: item.DisplayOrder
    }))
    .sort((a, b) =>
      Number(a.DisplayOrder || 0) -
      Number(b.DisplayOrder || 0)
    );
}


function getPublicMDCATUnits_(subjectId) {
  let rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_UNITS
    );

  if (subjectId) {
    rows = rows.filter(
      item =>
        String(item.SubjectID) ===
        String(subjectId)
    );
  }

  return rows
    .map(item => ({
      ID: item.ID,
      SubjectID: item.SubjectID,
      Name: item.Name,
      Slug: item.Slug,
      Description: item.Description,
      DisplayOrder: item.DisplayOrder
    }))
    .sort((a, b) =>
      Number(a.DisplayOrder || 0) -
      Number(b.DisplayOrder || 0)
    );
}


function getPublicMDCATChapters_(
  subjectId,
  unitId
) {
  let rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_CHAPTERS
    );

  if (subjectId) {
    rows = rows.filter(
      item =>
        String(item.SubjectID) ===
        String(subjectId)
    );
  }

  if (unitId) {
    rows = rows.filter(
      item =>
        String(item.UnitID) ===
        String(unitId)
    );
  }

  return rows
    .map(item => ({
      ID: item.ID,
      UnitID: item.UnitID,
      SubjectID: item.SubjectID,
      Name: item.Name,
      Slug: item.Slug,
      Description: item.Description,
      DisplayOrder: item.DisplayOrder
    }))
    .sort((a, b) =>
      Number(a.DisplayOrder || 0) -
      Number(b.DisplayOrder || 0)
    );
}


function getPublicMDCATTopics_(
  subjectId,
  unitId,
  chapterId
) {
  let rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_TOPICS
    );

  if (subjectId) {
    rows = rows.filter(
      item =>
        String(item.SubjectID) ===
        String(subjectId)
    );
  }

  if (unitId) {
    rows = rows.filter(
      item =>
        String(item.UnitID) ===
        String(unitId)
    );
  }

  if (chapterId) {
    rows = rows.filter(
      item =>
        String(item.ChapterID) ===
        String(chapterId)
    );
  }

  return rows
    .map(item => ({
      ID: item.ID,
      ChapterID: item.ChapterID,
      UnitID: item.UnitID,
      SubjectID: item.SubjectID,
      Name: item.Name,
      Slug: item.Slug,
      Description: item.Description,
      DisplayOrder: item.DisplayOrder
    }))
    .sort((a, b) =>
      Number(a.DisplayOrder || 0) -
      Number(b.DisplayOrder || 0)
    );
}


// IMPORTANT:
// CorrectOption and Explanation are intentionally
// NOT exposed publicly here.
function getPublicMDCATQuestions_(
  subjectId,
  unitId,
  chapterId,
  topicId
) {
  let rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_QUESTION_BANK
    );

  if (subjectId) {
    rows = rows.filter(
      item =>
        String(item.SubjectID) ===
        String(subjectId)
    );
  }

  if (unitId) {
    rows = rows.filter(
      item =>
        String(item.UnitID) ===
        String(unitId)
    );
  }

  if (chapterId) {
    rows = rows.filter(
      item =>
        String(item.ChapterID) ===
        String(chapterId)
    );
  }

  if (topicId) {
    rows = rows.filter(
      item =>
        String(item.TopicID) ===
        String(topicId)
    );
  }

  return rows.map(item => ({
    ID: item.ID,
    SubjectID: item.SubjectID,
    UnitID: item.UnitID,
    ChapterID: item.ChapterID,
    TopicID: item.TopicID,
    Question: item.Question,
    OptionA: item.OptionA,
    OptionB: item.OptionB,
    OptionC: item.OptionC,
    OptionD: item.OptionD,
    Difficulty: item.Difficulty,
    QuestionType: item.QuestionType,
    Source: item.Source
  }));
}


function getPublicMDCATTests_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_TESTS
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Slug: item.Slug,
    TestType: item.TestType,
    SubjectID: item.SubjectID,
    UnitID: item.UnitID,
    ChapterID: item.ChapterID,
    TopicID: item.TopicID,
    Description: item.Description,
    TotalQuestions: item.TotalQuestions,
    DurationMinutes: item.DurationMinutes,
    PassingPercentage: item.PassingPercentage,
    RandomizeQuestions:
      item.RandomizeQuestions,
    RandomizeOptions:
      item.RandomizeOptions,
    Featured: item.Featured
  }));
}


function getPublicMDCATTestQuestions_(
  testId
) {
  let rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_TEST_QUESTIONS
    );

  if (testId) {
    rows = rows.filter(
      item =>
        String(item.TestID) ===
        String(testId)
    );
  }

  return rows
    .map(item => ({
      ID: item.ID,
      TestID: item.TestID,
      QuestionID: item.QuestionID,
      DisplayOrder: item.DisplayOrder,
      Marks: item.Marks,
      NegativeMarks: item.NegativeMarks
    }))
    .sort((a, b) =>
      Number(a.DisplayOrder || 0) -
      Number(b.DisplayOrder || 0)
    );
}


function getPublicMDCATDailyPractice_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_DAILY_PRACTICE
    );

  return rows.map(item => ({
    ID: item.ID,
    Date: item.Date,
    Title: item.Title,
    Description: item.Description,
    SubjectID: item.SubjectID,
    UnitID: item.UnitID,
    ChapterID: item.ChapterID,
    TopicID: item.TopicID,
    QuestionCount: item.QuestionCount,
    DurationMinutes: item.DurationMinutes,
    Difficulty: item.Difficulty,
    Featured: item.Featured
  }));
}


function getPublicMDCATUpdates_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.MDCAT_UPDATES
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Category: item.Category,
    Summary: item.Summary,
    Content: item.Content,
    PublishDate: item.PublishDate,
    ExpiryDate: item.ExpiryDate,
    OfficialURL: item.OfficialURL,
    Priority: item.Priority,
    Featured: item.Featured
  }));
}


// ==========================================
// MDCAT - PRIVATE / INTERNAL DATA FUNCTIONS
// DO NOT EXPOSE THESE THROUGH PUBLIC doGet()
// ==========================================

function getMDCATTestAttempts_() {
  return getSheetData_(
    CONFIG.SHEETS.MDCAT_TEST_ATTEMPTS
  );
}


function getMDCATAttemptAnswers_() {
  return getSheetData_(
    CONFIG.SHEETS.MDCAT_ATTEMPT_ANSWERS
  );
}


function getMDCATProgress_() {
  return getSheetData_(
    CONFIG.SHEETS.MDCAT_PROGRESS
  );
}


function getMDCATRevision_() {
  return getSheetData_(
    CONFIG.SHEETS.MDCAT_REVISION
  );
}


function getMDCATStudyPlan_() {
  return getSheetData_(
    CONFIG.SHEETS.MDCAT_STUDY_PLAN
  );
}
function doGet(e) {
  const action =
    e && e.parameter
      ? String(e.parameter.action || '')
      : '';

  try {

    if (action === 'mdcatAccountConfig') return jsonResponse_(mdcatAuthConfig_());

    if (action === 'searchIndex') return cachedPublicJsonResponse_('searchIndex',getPublicSearchIndex_,300);

    if (action === 'portalData') {
      return cachedPublicJsonResponse_('portalData',getPublicPortalData_,300);
    }

    if (action === 'mcqs') {
      return cachedPublicJsonResponse_('mcqs',getPublicMCQs_,300);
    }

    if (action === 'videos') {
      return cachedPublicJsonResponse_('videos',getPublicVideos_,300);
    }

    if (action === 'admissions') {
      return cachedPublicJsonResponse_('admissions',getPublicAdmissions_,300);
    }

    if (action === 'scholarships') {
      return cachedPublicJsonResponse_('scholarships',getPublicScholarships_,300);
    }

    if (action === 'opportunities') {
      return cachedPublicJsonResponse_('opportunities',getPublicOpportunities_,300);
    }

    if (action === 'announcements') {
      return cachedPublicJsonResponse_('announcements',getPublicAnnouncements_,300);
    }

    if (action === 'aiTools') {
      return cachedPublicJsonResponse_('aiTools',getPublicAITools_,300);
    }

    if (action === 'islamicContent') {
      return cachedPublicJsonResponse_('islamicContent',getPublicIslamicContent_,300);
    }
    if (action === 'blog') {
      return cachedPublicJsonResponse_('blog',getPublicBlog_,300);
    }
    if (action === 'entryTests') {
      return cachedPublicJsonResponse_('entryTests',getPublicEntryTests_,300);
    }
    if (action === 'resources') {
      const category =
        e.parameter.category || '';

      return cachedPublicJsonResponse_('resources-' + category,function(){return getPublicResources_(category);},300);
    }
    // ==========================================
// MDCAT 2027 API ROUTES
// ==========================================

if (action === 'mdcatSubjects') {
  return cachedPublicJsonResponse_('mdcatSubjects',getPublicMDCATSubjects_,300);
}


if (action === 'mdcatUnits') {
  const subjectId =
    e.parameter.subjectId || '';

  return cachedPublicJsonResponse_('mdcatUnits-' + subjectId,function(){return getPublicMDCATUnits_(subjectId);},300);
}


if (action === 'mdcatChapters') {
  const subjectId =
    e.parameter.subjectId || '';

  const unitId =
    e.parameter.unitId || '';

  return cachedPublicJsonResponse_('mdcatChapters-' + subjectId + '-' + unitId,function(){return getPublicMDCATChapters_(subjectId,unitId);},300);
}


if (action === 'mdcatTopics') {
  const subjectId =
    e.parameter.subjectId || '';

  const unitId =
    e.parameter.unitId || '';

  const chapterId =
    e.parameter.chapterId || '';

  return cachedPublicJsonResponse_('mdcatTopics-' + subjectId + '-' + unitId + '-' + chapterId,function(){return getPublicMDCATTopics_(subjectId,unitId,chapterId);},300);
}


if (action === 'mdcatQuestions') {
  const subjectId =
    e.parameter.subjectId || '';

  const unitId =
    e.parameter.unitId || '';

  const chapterId =
    e.parameter.chapterId || '';

  const topicId =
    e.parameter.topicId || '';

  return cachedPublicJsonResponse_('mdcatQuestions-' + subjectId + '-' + unitId + '-' + chapterId + '-' + topicId,function(){return getPublicMDCATQuestions_(subjectId,unitId,chapterId,topicId);},300);
}


if (action === 'mdcatTests') {
  return cachedPublicJsonResponse_('mdcatTests',getPublicMDCATTests_,300);
}


if (action === 'mdcatTestQuestions') {
  const testId =
    e.parameter.testId || '';

  return cachedPublicJsonResponse_('mdcatTestQuestions-' + testId,function(){return getPublicMDCATTestQuestions_(testId);},300);
}


if (action === 'mdcatDailyPractice') {
  return cachedPublicJsonResponse_('mdcatDailyPractice',getPublicMDCATDailyPractice_,300);
}


if (action === 'mdcatUpdates') {
  return cachedPublicJsonResponse_('mdcatUpdates',getPublicMDCATUpdates_,300);
}
    return HtmlService
      .createTemplateFromFile('Index')
      .evaluate()
      .setTitle('ICP YOUTH CIRCLE');

  } catch (error) {

    return jsonResponse_({error: 'Unable to load portal data.'}, false);
  }
}

function testDoGet_() {
  const response = doGet({
    parameter: {
      action: 'portalData'
    }
  });

  Logger.log(response.getContent());
}
function getPublicResources_(categoryName) {
  const resources = getActiveSheetData_(
    CONFIG.SHEETS.RESOURCES
  );

  const category = String(
    categoryName || ''
  ).trim().toLowerCase();

  return resources
    .filter(resource => {

      if (!category) {
        return true;
      }

      return String(
        resource.Category || ''
      ).trim().toLowerCase() === category;

    })
    .map(resource => ({
      ID: resource.ID || '',
      Title: resource.Title || '',
      Slug: resource.Slug || '',
      Category: resource.Category || '',
      Level: resource.Level || '',
      Subject: resource.Subject || '',
      Institution: resource.Institution || '',
      Year: resource.Year || '',
      ResourceType: resource.ResourceType || '',
      Description: resource.Description || '',
      FileURL: resource.FileURL || '',
      ThumbnailURL: resource.ThumbnailURL || '',
      Featured: resource.Featured || '',
      DisplayOrder: resource.DisplayOrder || ''
    }))
    .sort(
      (a, b) =>
        Number(a.DisplayOrder || 9999) -
        Number(b.DisplayOrder || 9999)
    );
}
function getPublicMCQs_() {
  const mcqs = getActiveSheetData_(
    CONFIG.SHEETS.MCQS
  );

  return mcqs
    .map(item => ({
      ID: item.ID || '',
      Question: item.Question || '',
      OptionA: item.OptionA || '',
      OptionB: item.OptionB || '',
      OptionC: item.OptionC || '',
      OptionD: item.OptionD || '',
      CorrectOption: item.CorrectOption || '',
      Explanation: item.Explanation || '',
      Subject: item.Subject || '',
      Topic: item.Topic || '',
      Level: item.Level || '',
      EntryTest: item.EntryTest || '',
      Difficulty: item.Difficulty || ''
    }));
}
function getPublicVideos_() {
  const videos = getActiveSheetData_(
    CONFIG.SHEETS.VIDEOS
  );

  return videos
    .map(video => ({
      ID: video.ID || '',
      Title: video.Title || '',
      Category: video.Category || '',
      Subject: video.Subject || '',
      Level: video.Level || '',
      Platform: video.Platform || '',
      VideoURL: video.VideoURL || '',
      ThumbnailURL: video.ThumbnailURL || '',
      Duration: video.Duration || '',
      Description: video.Description || '',
      Featured: video.Featured || ''
    }));
}

function getPublicAdmissions_() {
  const admissions = getActiveSheetData_(
    CONFIG.SHEETS.ADMISSIONS
  );

  return admissions
    .map(item => ({
      ID: item.ID || '',
      Institution: item.Institution || '',
      Program: item.Program || '',
      DegreeLevel: item.DegreeLevel || '',
      AdmissionType: item.AdmissionType || '',
      Eligibility: item.Eligibility || '',
      OpeningDate: item.OpeningDate || '',
      Deadline: item.Deadline || '',
      EntryTest: item.EntryTest || '',
      MeritListDate: item.MeritListDate || '',
      OfficialURL: item.OfficialURL || '',
      Description: item.Description || '',
      Featured: item.Featured || ''
    }));
}

function getPublicScholarships_() {
  const rows = getActiveSheetData_(CONFIG.SHEETS.SCHOLARSHIPS);

  return rows.map(item => ({
    ID: item.ID,
    Name: item.Name,
    Provider: item.Provider,
    Type: item.Type,
    Country: item.Country,
    Eligibility: item.Eligibility,
    Benefits: item.Benefits,
    OpeningDate: item.OpeningDate,
    Deadline: item.Deadline,
    OfficialURL: item.OfficialURL,
    Description: item.Description,
    Featured: item.Featured
  }));
}
function getPublicOpportunities_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.OPPORTUNITIES
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Organization: item.Organization,
    Type: item.Type,
    Location: item.Location,
    Eligibility: item.Eligibility,
    OpeningDate: item.OpeningDate,
    Deadline: item.Deadline,
    OfficialURL: item.OfficialURL,
    Description: item.Description,
    Featured: item.Featured
  }));
}
function getPublicAnnouncements_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.ANNOUNCEMENTS
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Category: item.Category,
    Summary: item.Summary,
    Content: item.Content,
    PublishDate: item.PublishDate,
    ExpiryDate: item.ExpiryDate,
    OfficialURL: item.OfficialURL,
    Priority: item.Priority,
    Featured: item.Featured
  }));
}
function getPublicAITools_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.AI_TOOLS
    );

  return rows.map(item => ({
    ID: item.ID,
    Name: item.Name,
    Category: item.Category,
    Description: item.Description,
    ToolURL: item.ToolURL,
    LogoURL: item.LogoURL,
    PricingType: item.PricingType,
    BestFor: item.BestFor,
    Featured: item.Featured
  }));
}
function getPublicIslamicContent_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.ISLAMIC_CONTENT
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Type: item.Type,
    ArabicText: item.ArabicText,
    UrduTranslation: item.UrduTranslation,
    EnglishTranslation: item.EnglishTranslation,
    Reference: item.Reference,
    SourceURL: item.SourceURL,
    Description: item.Description,
    Featured: item.Featured
  }));
}
function getPublicBlog_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.BLOG
    );

  return rows.map(item => ({
    ID: item.ID,
    Title: item.Title,
    Slug: item.Slug,
    Category: item.Category,
    Author: item.Author,
    Summary: item.Summary,
    Content: item.Content,
    ThumbnailURL: item.ThumbnailURL,
    PublishDate: item.PublishDate,
    Featured: item.Featured
  }));
}
function getPublicEntryTests_() {
  const rows =
    getActiveSheetData_(
      CONFIG.SHEETS.ENTRY_TESTS
    );

  return rows.map(item => ({
    ID: item.ID,
    Name: item.Name,
    Slug: item.Slug,
    Organization: item.Organization,
    Description: item.Description,
    Eligibility: item.Eligibility,
    RegistrationStart: item.RegistrationStart,
    RegistrationDeadline: item.RegistrationDeadline,
    TestDate: item.TestDate,
    OfficialURL: item.OfficialURL
  }));
}

function searchText_(value, limit) {
  return String(value == null ? '' : value).replace(/\s+/g,' ').trim().slice(0,limit || 500);
}

function searchRows_(loader) {
  try { const rows=loader(); return Array.isArray(rows) ? rows : []; }
  catch (_) { return []; }
}

function getPublicSearchIndex_() {
  const index=[];
  const add=(kind,title,description,route,row,keywords,level)=>{
    const cleanTitle=searchText_(title,240);
    if (!cleanTitle || index.length >= 10000) return;
    index.push({
      ID:searchText_(row && row.ID,120),Kind:kind,Title:cleanTitle,
      Description:searchText_(description,500),Keywords:searchText_(keywords,600),Route:route,
      MDCATLevel:level || '',SubjectID:searchText_(row && row.SubjectID,120),UnitID:searchText_(row && row.UnitID,120),
      ChapterID:searchText_(row && row.ChapterID,120),TopicID:searchText_(row && row.TopicID,120),
      SubjectName:searchText_(row && row.SubjectName,160),UnitName:searchText_(row && row.UnitName,160),ChapterName:searchText_(row && row.ChapterName,160)
    });
  };
  const resourceRoute=category=>({notes:'notes','past papers':'past-papers','study resources':'study-resources'}[String(category||'').trim().toLowerCase()] || 'study');
  searchRows_(()=>getPublicResources_('')).forEach(row=>add('Resource',row.Title,row.Description,resourceRoute(row.Category),row,[row.Category,row.Subject,row.Level,row.Institution,row.Year,row.ResourceType].join(' ')));
  searchRows_(getPublicVideos_).forEach(row=>add('Video',row.Title,row.Description,'videos',row,[row.Category,row.Subject,row.Level,row.Platform].join(' ')));
  // Search only public question text and labels; never index answers or explanations.
  searchRows_(getPublicMCQs_).forEach(row=>add('MCQ',row.Question,[row.Subject,row.Topic,row.Difficulty].filter(Boolean).join(' • '),'mcqs',row,[row.Subject,row.Topic,row.Level,row.EntryTest,row.Difficulty].join(' ')));
  searchRows_(getPublicAdmissions_).forEach(row=>add('Admission',row.Program || row.Institution,row.Description,'admissions',row,[row.Institution,row.DegreeLevel,row.AdmissionType,row.Eligibility,row.EntryTest].join(' ')));
  searchRows_(getPublicScholarships_).forEach(row=>add('Scholarship',row.Name,row.Description,'scholarships',row,[row.Provider,row.Type,row.Country,row.Eligibility,row.Benefits].join(' ')));
  searchRows_(getPublicOpportunities_).forEach(row=>add('Opportunity',row.Title,row.Description,'career',row,[row.Organization,row.Type,row.Location,row.Eligibility].join(' ')));
  searchRows_(getPublicAnnouncements_).forEach(row=>add('Announcement',row.Title,row.Summary || row.Content,'updates',row,[row.Category,row.Priority].join(' ')));
  searchRows_(getPublicAITools_).forEach(row=>add('AI Tool',row.Name,row.Description,'ai-tools',row,[row.Category,row.PricingType,row.BestFor].join(' ')));
  searchRows_(getPublicIslamicContent_).forEach(row=>add('Islamic Content',row.Title,row.Description,String(row.Type||'').toLowerCase()==='hadith'?'hadith':'islamic',row,[row.Type,row.Reference,row.EnglishTranslation,row.UrduTranslation].join(' ')));
  searchRows_(getPublicBlog_).forEach(row=>add('Blog',row.Title,row.Summary || row.Content,'blog',row,[row.Category,row.Author].join(' ')));
  searchRows_(getPublicEntryTests_).forEach(row=>add('Entry Test',row.Name,row.Description,row.Slug || 'entry-tests',row,[row.Organization,row.Eligibility].join(' ')));

  const subjects=searchRows_(getPublicMDCATSubjects_);
  const units=searchRows_(()=>getPublicMDCATUnits_(''));
  const chapters=searchRows_(()=>getPublicMDCATChapters_('',''));
  const topics=searchRows_(()=>getPublicMDCATTopics_('','',''));
  const subjectNames=new Map(subjects.map(row=>[String(row.ID),row.Name]));
  const unitNames=new Map(units.map(row=>[String(row.ID),row.Name]));
  const chapterNames=new Map(chapters.map(row=>[String(row.ID),row.Name]));
  const names=row=>Object.assign({},row,{SubjectName:subjectNames.get(String(row.SubjectID))||'',UnitName:unitNames.get(String(row.UnitID))||'',ChapterName:chapterNames.get(String(row.ChapterID))||''});
  subjects.forEach(row=>add('MDCAT Subject',row.Name,row.Description,'mdcat',Object.assign({},row,{SubjectID:row.ID,SubjectName:row.Name}),'MDCAT 2027','subject'));
  units.forEach(original=>{const row=names(original);add('MDCAT Unit',row.Name,row.Description,'mdcat',row,[row.SubjectName,'MDCAT 2027'].join(' '),'unit');});
  chapters.forEach(original=>{const row=names(original);add('MDCAT Chapter',row.Name,row.Description,'mdcat',row,[row.SubjectName,row.UnitName,'MDCAT 2027'].join(' '),'chapter');});
  topics.forEach(original=>{const row=names(original);add('MDCAT Topic',row.Name,row.Description,'mdcat',row,[row.SubjectName,row.UnitName,row.ChapterName,'MDCAT 2027'].join(' '),'topic');});
  searchRows_(()=>getPublicMDCATQuestions_('','','','')).forEach(original=>{const row=names(original);add('MDCAT Question',row.Question,[row.SubjectName,row.UnitName,row.ChapterName,row.Difficulty].filter(Boolean).join(' • '),'mdcat',row,[row.Source,row.QuestionType,'MDCAT 2027'].join(' '),'question');});
  searchRows_(getPublicMDCATTests_).forEach(row=>add('MDCAT Test',row.Title,row.Description,'mdcat',row,[row.TestType,'MDCAT 2027'].join(' '),'test'));
  searchRows_(getPublicMDCATDailyPractice_).forEach(row=>add('MDCAT Daily Practice',row.Title,row.Description,'mdcat',row,[row.Difficulty,'MDCAT 2027'].join(' '),'daily'));
  searchRows_(getPublicMDCATUpdates_).forEach(row=>add('MDCAT Update',row.Title,row.Summary || row.Content,'mdcat',row,[row.Category,'MDCAT 2027'].join(' '),'update'));
  return index;
}

// Authenticated MDCAT scoring. All helpers end in _ to block google.script.run calls.
const MDCAT_SCORING_ = {
  version: 1,
  sessions: 'MDCAT_Sessions',
  snapshots: 'MDCAT_Session_Questions',
  maxQuestions: 200,
  maxStartsPerDay: 20,
  sessionHeaders: 'ID UserID RequestID Mode ContextID Title StartedAt DeadlineAt SubmittedAt Status AnswersJSON TotalQuestions PassingPercentage RandomizeOptions'.split(' '),
  snapshotHeaders: 'ID AttemptID QuestionID SubjectID UnitID ChapterID TopicID Question OptionA OptionB OptionC OptionD CorrectOption Explanation Marks NegativeMarks DisplayOrder'.split(' '),
  attemptHeaders: 'ID UserID TestID StartedAt SubmittedAt TotalQuestions AttemptedQuestions CorrectAnswers WrongAnswers Unanswered Score Percentage TimeTakenSeconds Status CreatedAt UpdatedAt'.split(' '),
  answerHeaders: 'ID AttemptID UserID TestID QuestionID SelectedOption CorrectOption IsCorrect MarksAwarded TimeSpentSeconds AnsweredAt CreatedAt UpdatedAt'.split(' '),
  progressHeaders: 'ID UserID SubjectID UnitID ChapterID TopicID QuestionsAttempted CorrectAnswers WrongAnswers AccuracyPercentage AverageTimeSeconds LastPracticedAt WeaknessScore MasteryLevel Status CreatedAt UpdatedAt'.split(' ')
};

function mdcatError_(code, message) {
  const error = new Error(message);
  error.mdcatCode = code;
  throw error;
}

function mdcatAuthConfig_() {
  const properties = PropertiesService.getScriptProperties();
  let firebase;
  try { firebase = JSON.parse(properties.getProperty('MDCAT_FIREBASE_CONFIG') || '{}'); }
  catch (_) { firebase = {}; }
  const valid = ['apiKey','authDomain','projectId','appId'].every(key => typeof firebase[key] === 'string' && firebase[key].trim());
  const enabled = valid && properties.getProperty('MDCAT_SCORING_ENABLED') === 'true';
  return {enabled:enabled, version:1, firebase: enabled ? {
    apiKey:firebase.apiKey, authDomain:firebase.authDomain, projectId:firebase.projectId, appId:firebase.appId
  } : null};
}

function mdcatAuthenticate_(token) {
  const config = mdcatAuthConfig_();
  if (!config.enabled) mdcatError_('NOT_CONFIGURED','Scoring is not enabled yet.');
  if (typeof token !== 'string' || token.length < 100 || token.length > 12000) mdcatError_('AUTH_REQUIRED','Please sign in again.');
  // Google validates the ID token on the account lookup endpoint. Never trust a submitted UserID.
  const response = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(config.firebase.apiKey), {
    method:'post', contentType:'application/json', payload:JSON.stringify({idToken:token}), muteHttpExceptions:true
  });
  if (response.getResponseCode() !== 200) mdcatError_('AUTH_REQUIRED','Your sign-in could not be verified. Please sign in again.');
  let account, claims;
  try {
    const users = JSON.parse(response.getContentText()).users;
    if (!Array.isArray(users) || users.length !== 1) throw new Error('Invalid account');
    account = users[0];
    claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString());
  } catch (_) { mdcatError_('AUTH_REQUIRED','Your sign-in could not be verified.'); }
  const now = Math.floor(Date.now()/1000);
  if (!account.localId || account.disabled || account.emailVerified !== true ||
    claims.sub !== account.localId || claims.aud !== config.firebase.projectId ||
    claims.iss !== 'https://securetoken.google.com/' + config.firebase.projectId ||
    !Number.isFinite(claims.exp) || claims.exp <= now ||
    !Number.isFinite(claims.iat) || claims.iat > now + 60 ||
    !Number.isFinite(claims.auth_time) || claims.auth_time > now + 60 ||
    claims.auth_time < Number(account.validSince || 0) ||
    !claims.firebase || claims.firebase.sign_in_provider !== 'google.com') {
    mdcatError_('AUTH_REQUIRED','A current, verified Google sign-in is required.');
  }
  return String(account.localId);
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 100000) mdcatError_('BAD_REQUEST','Invalid request.');
    let body;
    try { body = JSON.parse(raw); } catch (_) { mdcatError_('BAD_REQUEST','Invalid request.'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') mdcatError_('BAD_REQUEST','Invalid request.');
    if (!['mdcatStart','mdcatSubmit','mdcatMyResults','mdcatResult','mdcatMyProgress','mdcatResume'].includes(body.action)) mdcatError_('BAD_REQUEST','Unknown action.');
    const uid = mdcatAuthenticate_(body.idToken);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) mdcatError_('BUSY','The service is busy. Please retry.');
    try {
      let data;
      if (body.action === 'mdcatStart') data = mdcatStart_(uid, body);
      if (body.action === 'mdcatSubmit') data = mdcatSubmit_(uid, body);
      if (body.action === 'mdcatResume') data = mdcatResume_(uid, body.attemptId);
      if (body.action === 'mdcatResult') data = mdcatResult_(uid, body.attemptId);
      if (body.action === 'mdcatMyResults') data = mdcatMyResults_(uid);
      if (body.action === 'mdcatMyProgress') data = mdcatProgress_(uid, false);
      return jsonResponse_(data);
    } finally { lock.releaseLock(); }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success:false,error:{
      code:error.mdcatCode || 'SERVICE_ERROR', message:error.mdcatCode ? error.message : 'Unable to complete the request. Please retry.'
    }})).setMimeType(ContentService.MimeType.JSON);
  }
}

// Run once from the Apps Script editor. Never called by the public website.
function setupMDCATScoring_() {
  const spreadsheet = getSpreadsheet_();
  const definitions = [
    [MDCAT_SCORING_.sessions,MDCAT_SCORING_.sessionHeaders],
    [MDCAT_SCORING_.snapshots,MDCAT_SCORING_.snapshotHeaders],
    [CONFIG.SHEETS.MDCAT_TEST_ATTEMPTS,MDCAT_SCORING_.attemptHeaders],
    [CONFIG.SHEETS.MDCAT_ATTEMPT_ANSWERS,MDCAT_SCORING_.answerHeaders],
    [CONFIG.SHEETS.MDCAT_PROGRESS,MDCAT_SCORING_.progressHeaders]
  ];
  definitions.forEach(([name,headers]) => {
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    if (sheet.getLastRow() === 0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
    mdcatTable_(name,headers);
  });
  return 'Scoring sheets validated. Firebase configuration and enablement are separate steps.';
}

function mdcatTable_(name, required) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getValues();
  const headers = (values[0] || []).map(value=>String(value).replace(/\uFEFF/g,'').trim());
  if ((required || ['ID']).some(key=>!headers.includes(key)) || new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) mdcatError_('SETUP_REQUIRED','A scoring sheet has missing or duplicate headers.');
  const rows = values.slice(1).map((row,index)=>{
    const record = {_row:index+2};
    headers.forEach((key,i)=>{if(key) record[key]=row[i];});
    return record;
  }).filter(row=>row.ID);
  return {sheet:sheet,headers:headers,rows:rows};
}

function mdcatCell_(value) {
  if (value == null) return '';
  if (typeof value === 'string' && /^[=+@\-]/.test(value)) return "'"+value;
  return value;
}

function mdcatPut_(name, record) {
  const table = mdcatTable_(name);
  const matches = table.rows.filter(row=>String(row.ID)===String(record.ID));
  if (matches.length>1) mdcatError_('SETUP_REQUIRED','Duplicate record IDs need administrator review.');
  const old=matches[0];
  const merged=Object.assign({},old || {},record);
  const values=table.headers.map(key=>mdcatCell_(merged[key]));
  table.sheet.getRange(old ? old._row : table.sheet.getLastRow()+1,1,1,values.length).setValues([values]);
  return merged;
}

function mdcatPutMany_(name,records) {
  const table=mdcatTable_(name);
  const byId=new Map();
  table.rows.forEach(row=>{if(byId.has(String(row.ID))) mdcatError_('SETUP_REQUIRED','Duplicate saved record IDs.');byId.set(String(row.ID),row);});
  const append=[];
  records.forEach(record=>{
    const old=byId.get(String(record.ID));
    const merged=Object.assign({},old || {},record);
    const row=table.headers.map(key=>mdcatCell_(merged[key]));
    if(old)table.sheet.getRange(old._row,1,1,row.length).setValues([row]);else append.push(row);
  });
  if(append.length)table.sheet.getRange(table.sheet.getLastRow()+1,1,append.length,table.headers.length).setValues(append);
}

function mdcatSession_(uid,id) {
  if (typeof id !== 'string' || !/^MDA-[a-zA-Z0-9-]{20,80}$/.test(id)) mdcatError_('NOT_FOUND','Attempt not found.');
  const matches=mdcatTable_(MDCAT_SCORING_.sessions).rows.filter(row=>row.ID===id && row.UserID===uid);
  if (matches.length!==1) mdcatError_('NOT_FOUND','Attempt not found.');
  return matches[0];
}

function mdcatScopeMatches_(question,context) {
  return ['SubjectID','UnitID','ChapterID','TopicID'].every(key=>!context[key] || String(context[key])===String(question[key]));
}

function mdcatActiveRecord_(sheet,id) {
  const rows=getActiveSheetData_(sheet).filter(row=>String(row.ID)===String(id));
  if(rows.length!==1) mdcatError_('CONTENT_UNAVAILABLE','This content is unavailable.');
  return rows[0];
}

function mdcatNumber_(value,min,max) {
  const number=Number(value);
  if(value === '' || value == null || !Number.isFinite(number) || number<min || number>max) mdcatError_('CONTENT_UNAVAILABLE','The practice set configuration needs review.');
  return number;
}

function mdcatSelect_(mode,contextId) {
  const bank=getActiveSheetData_(CONFIG.SHEETS.MDCAT_QUESTION_BANK);
  let context,questions,links=[],minutes,title,passing=0;
  if(mode==='test') {
    context=mdcatActiveRecord_(CONFIG.SHEETS.MDCAT_TESTS,contextId);
    links=getActiveSheetData_(CONFIG.SHEETS.MDCAT_TEST_QUESTIONS).filter(row=>String(row.TestID)===String(contextId))
      .sort((a,b)=>(Number(a.DisplayOrder)||0)-(Number(b.DisplayOrder)||0));
    if(new Set(links.map(row=>String(row.QuestionID))).size!==links.length) mdcatError_('CONTENT_UNAVAILABLE','Duplicate test question links.');
    questions=links.map(link=>{
      const matches=bank.filter(question=>String(question.ID)===String(link.QuestionID));
      if(matches.length!==1) mdcatError_('CONTENT_UNAVAILABLE','A linked question is unavailable.');
      return Object.assign({},matches[0],{Marks:mdcatNumber_(link.Marks,0.01,100),NegativeMarks:mdcatNumber_(link.NegativeMarks,0,100)});
    });
    if(questions.length!==mdcatNumber_(context.TotalQuestions,1,MDCAT_SCORING_.maxQuestions)) mdcatError_('CONTENT_UNAVAILABLE','Test question count is inconsistent.');
    passing=mdcatNumber_(context.PassingPercentage,0,100);
    minutes=mdcatNumber_(context.DurationMinutes,1,240);
    title=context.Title;
  } else if(mode==='daily') {
    context=mdcatActiveRecord_(CONFIG.SHEETS.MDCAT_DAILY_PRACTICE,contextId);
    const count=mdcatNumber_(context.QuestionCount,1,MDCAT_SCORING_.maxQuestions);
    if(!Number.isInteger(count)) mdcatError_('CONTENT_UNAVAILABLE','Question count must be a whole number.');
    questions=bank.filter(question=>mdcatScopeMatches_(question,context) && (!context.Difficulty || String(question.Difficulty).toLowerCase()===String(context.Difficulty).toLowerCase())).slice(0,count);
    if(questions.length!==count) mdcatError_('CONTENT_UNAVAILABLE','Not enough published questions for this set.');
    minutes=mdcatNumber_(context.DurationMinutes,1,240);
    title=context.Title;
  } else if(mode==='topic') {
    context=mdcatActiveRecord_(CONFIG.SHEETS.MDCAT_TOPICS,contextId);
    context=Object.assign({},context,{TopicID:context.ID});
    questions=bank.filter(question=>mdcatScopeMatches_(question,context));
    minutes=120;
    title=context.Name;
  } else mdcatError_('BAD_REQUEST','Choose a test, daily set or topic.');
  if(!questions.length || questions.length>MDCAT_SCORING_.maxQuestions || new Set(questions.map(row=>String(row.ID))).size!==questions.length) mdcatError_('CONTENT_UNAVAILABLE','Question selection needs review.');
  questions=questions.map(question=>{
    if(!question.ID || !mdcatScopeMatches_(question,context) || !String(question.Question || '').trim() ||
      !/^[ABCD]$/.test(String(question.CorrectOption).trim().toUpperCase()) ||
      ['OptionA','OptionB','OptionC','OptionD'].some(key=>!String(question[key] || '').trim())) mdcatError_('CONTENT_UNAVAILABLE','A question needs administrator review.');
    for(const key of ['Question','OptionA','OptionB','OptionC','OptionD','Explanation']) {
      if(String(question[key] || '').length>12000) mdcatError_('CONTENT_UNAVAILABLE','Question text exceeds the supported length.');
    }
    return Object.assign({},question,{CorrectOption:String(question.CorrectOption).trim().toUpperCase(),Marks:mode==='test'?question.Marks:1,NegativeMarks:mode==='test'?question.NegativeMarks:0});
  });
  if(/^yes$/i.test(String(context.RandomizeQuestions))) {
    for(let i=questions.length-1;i>0;i--) {const j=Math.floor(Math.random()*(i+1)); [questions[i],questions[j]]=[questions[j],questions[i]];}
  }
  return {questions:questions,minutes:minutes,title:String(title || 'MDCAT practice'),passing:passing,randomizeOptions:/^yes$/i.test(String(context.RandomizeOptions))};
}

function mdcatStart_(uid,body) {
  if(typeof body.requestId!=='string' || !/^[a-zA-Z0-9-]{20,80}$/.test(body.requestId) || typeof body.contextId!=='string' || body.contextId.length>100) mdcatError_('BAD_REQUEST','Invalid start request.');
  const sessions=mdcatTable_(MDCAT_SCORING_.sessions).rows;
  const existing=sessions.find(row=>row.UserID===uid && row.RequestID===body.requestId);
  if(existing) {
    if(existing.Mode!==body.mode || existing.ContextID!==body.contextId) mdcatError_('BAD_REQUEST','Start request has already been used for different content.');
    if(existing.Status==='Building') mdcatError_('SETUP_REQUIRED','This start was interrupted. Start a new attempt.');
    return mdcatResume_(uid,existing.ID);
  }
  const now=Date.now();
  if(sessions.filter(row=>row.UserID===uid && now-new Date(row.StartedAt).getTime()<86400000).length>=MDCAT_SCORING_.maxStartsPerDay) mdcatError_('RATE_LIMIT','Daily practice-start limit reached. Please return later.');
  const selected=mdcatSelect_(body.mode,body.contextId);
  const id='MDA-'+Utilities.getUuid();
  const session={ID:id,UserID:uid,RequestID:body.requestId,Mode:body.mode,ContextID:body.contextId,Title:selected.title,StartedAt:new Date(now).toISOString(),DeadlineAt:new Date(now+selected.minutes*60000).toISOString(),SubmittedAt:'',Status:'Building',AnswersJSON:'',TotalQuestions:selected.questions.length,PassingPercentage:selected.passing,RandomizeOptions:selected.randomizeOptions?'Yes':'No'};
  mdcatPut_(MDCAT_SCORING_.sessions,session);
  // Store answer keys only in the private snapshot sheet, never the start response.
  const table=mdcatTable_(MDCAT_SCORING_.snapshots,MDCAT_SCORING_.snapshotHeaders);
  const snapshots=selected.questions.map((question,index)=>Object.assign({},question,{ID:id+':'+index,AttemptID:id,QuestionID:String(question.ID),DisplayOrder:index+1}));
  table.sheet.getRange(table.sheet.getLastRow()+1,1,snapshots.length,table.headers.length).setValues(snapshots.map(row=>table.headers.map(key=>mdcatCell_(row[key]))));
  SpreadsheetApp.flush();
  session.Status='Open'; mdcatPut_(MDCAT_SCORING_.sessions,session);
  return mdcatResume_(uid,id);
}

function mdcatSnapshots_(session) {
  const rows=mdcatTable_(MDCAT_SCORING_.snapshots).rows.filter(row=>row.AttemptID===session.ID).sort((a,b)=>Number(a.DisplayOrder)-Number(b.DisplayOrder));
  if(rows.length!==Number(session.TotalQuestions) || new Set(rows.map(row=>row.QuestionID)).size!==rows.length) mdcatError_('SETUP_REQUIRED','Attempt snapshot is incomplete.');
  return rows;
}

function mdcatResume_(uid,id) {
  const session=mdcatSession_(uid,id);
  if(session.Status==='Submitted' || session.Status==='Finalizing') return mdcatSubmit_(uid,{attemptId:id});
  if(session.Status!=='Open') mdcatError_('CONTENT_UNAVAILABLE','Attempt is unavailable.');
  if(Date.now()>new Date(session.DeadlineAt).getTime()) mdcatError_('EXPIRED','This attempt has expired. Start a new attempt.');
  const questions=mdcatSnapshots_(session).map(row=>({ID:row.QuestionID,Question:row.Question,OptionA:row.OptionA,OptionB:row.OptionB,OptionC:row.OptionC,OptionD:row.OptionD,SubjectID:row.SubjectID,UnitID:row.UnitID,ChapterID:row.ChapterID,TopicID:row.TopicID}));
  return {attemptId:session.ID,title:session.Title,questions:questions,deadline:session.DeadlineAt,serverNow:new Date().toISOString(),randomizeOptions:session.RandomizeOptions==='Yes',status:'Open'};
}

function mdcatSubmit_(uid,body) {
  const session=mdcatSession_(uid,body.attemptId);
  if(session.Status==='Submitted') return mdcatResult_(uid,session.ID);
  const snapshots=mdcatSnapshots_(session);
  if(session.Status==='Open') {
    // A small transport allowance is explicit; the browser stops input at the displayed deadline.
    if(Date.now()>new Date(session.DeadlineAt).getTime()+30000) mdcatError_('EXPIRED','Submission arrived after the time allowance. This attempt was not graded.');
    if(!Array.isArray(body.answers) || body.answers.length>snapshots.length) mdcatError_('BAD_REQUEST','Invalid answers.');
    const allowed=new Set(snapshots.map(row=>String(row.QuestionID)));
    const answers=Object.create(null);
    body.answers.forEach(answer=>{
      if(!answer || !allowed.has(String(answer.questionId)) || Object.prototype.hasOwnProperty.call(answers,String(answer.questionId)) || !/^[ABCD]$/.test(answer.option)) mdcatError_('BAD_REQUEST','Invalid or duplicate answer.');
      answers[String(answer.questionId)]=answer.option;
    });
    session.AnswersJSON=JSON.stringify(answers);
    session.SubmittedAt=new Date().toISOString();
    session.Status='Finalizing';
    mdcatPut_(MDCAT_SCORING_.sessions,session);
  }
  if(session.Status!=='Finalizing') mdcatError_('CONTENT_UNAVAILABLE','Attempt is unavailable.');
  const result=mdcatGrade_(session,snapshots,JSON.parse(session.AnswersJSON));
  mdcatPutMany_(CONFIG.SHEETS.MDCAT_ATTEMPT_ANSWERS,result.answers.map((answer,index)=>({
    ID:session.ID+':'+index,AttemptID:session.ID,UserID:uid,TestID:session.Mode==='test'?session.ContextID:'',QuestionID:answer.questionId,
    SelectedOption:answer.selectedOption,CorrectOption:answer.correctOption,IsCorrect:answer.isCorrect,MarksAwarded:answer.marksAwarded,
    TimeSpentSeconds:'',AnsweredAt:session.SubmittedAt,CreatedAt:session.SubmittedAt,UpdatedAt:session.SubmittedAt
  })));
  mdcatPut_(CONFIG.SHEETS.MDCAT_TEST_ATTEMPTS,{
    ID:session.ID,UserID:uid,TestID:session.Mode==='test'?session.ContextID:'',StartedAt:session.StartedAt,SubmittedAt:session.SubmittedAt,
    TotalQuestions:result.total,AttemptedQuestions:result.answered,CorrectAnswers:result.correct,WrongAnswers:result.wrong,
    Unanswered:result.unanswered,Score:result.score,Percentage:result.percentage,TimeTakenSeconds:result.seconds,
    Status:'Submitted',CreatedAt:session.StartedAt,UpdatedAt:session.SubmittedAt
  });
  // Rebuild from committed answers, so replay after partial writes cannot double-count progress.
  mdcatProgress_(uid,true);
  session.Status='Submitted'; mdcatPut_(MDCAT_SCORING_.sessions,session);
  return result;
}

function mdcatGrade_(session,questions,answers) {
  let correct=0,wrong=0,score=0,maxScore=0,answered=0;
  const review=questions.map(question=>{
    const selected=answers[String(question.QuestionID)] || '';
    const isCorrect=Boolean(selected && selected===question.CorrectOption);
    const marks=selected ? (isCorrect ? Number(question.Marks) : -Number(question.NegativeMarks)) : 0;
    if(selected) {answered++; if(isCorrect) correct++; else wrong++;}
    score+=marks; maxScore+=Number(question.Marks);
    return {questionId:question.QuestionID,question:question.Question,options:{A:question.OptionA,B:question.OptionB,C:question.OptionC,D:question.OptionD},selectedOption:selected,correctOption:question.CorrectOption,isCorrect:isCorrect,marksAwarded:marks,explanation:question.Explanation || ''};
  });
  const percentage=Math.max(0,Math.round(score/maxScore*10000)/100);
  return {attemptId:session.ID,status:'Submitted',title:session.Title,total:questions.length,answered:answered,correct:correct,wrong:wrong,unanswered:questions.length-answered,
    score:Math.round(score*100)/100,maxScore:maxScore,percentage:percentage,passed:session.Mode==='test'?percentage>=Number(session.PassingPercentage):null,
    seconds:Math.max(0,Math.round((Math.min(new Date(session.SubmittedAt).getTime(),new Date(session.DeadlineAt).getTime())-new Date(session.StartedAt).getTime())/1000)),answers:review};
}

function mdcatResult_(uid,id) {
  const session=mdcatSession_(uid,id);
  if(session.Status!=='Submitted') mdcatError_('NOT_READY','This attempt has not been submitted.');
  return mdcatGrade_(session,mdcatSnapshots_(session),JSON.parse(session.AnswersJSON));
}

function mdcatMyResults_(uid) {
  return mdcatTable_(MDCAT_SCORING_.sessions).rows.filter(row=>row.UserID===uid && ['Submitted','Open','Finalizing'].includes(row.Status))
    .sort((a,b)=>new Date(b.StartedAt)-new Date(a.StartedAt)).slice(0,100)
    .map(row=>({attemptId:row.ID,title:row.Title,status:row.Status,startedAt:row.StartedAt,deadline:row.DeadlineAt}));
}

function mdcatProgress_(uid,persist) {
  const topicNames=new Map(getActiveSheetData_(CONFIG.SHEETS.MDCAT_TOPICS).map(row=>[String(row.ID),row.Name]));
  const subjectNames=new Map(getActiveSheetData_(CONFIG.SHEETS.MDCAT_SUBJECTS).map(row=>[String(row.ID),row.Name]));
  const committed=new Map(mdcatTable_(CONFIG.SHEETS.MDCAT_TEST_ATTEMPTS).rows.filter(row=>row.UserID===uid && row.Status==='Submitted').map(row=>[row.ID,row]));
  const snapshotMap=new Map(mdcatTable_(MDCAT_SCORING_.snapshots).rows.filter(row=>committed.has(row.AttemptID)).map(row=>[row.AttemptID+':'+row.QuestionID,row]));
  const groups={};
  mdcatTable_(CONFIG.SHEETS.MDCAT_ATTEMPT_ANSWERS).rows.filter(row=>row.UserID===uid && committed.has(row.AttemptID) && row.SelectedOption).forEach(row=>{
    const question=snapshotMap.get(row.AttemptID+':'+row.QuestionID);
    if(!question) mdcatError_('SETUP_REQUIRED','Progress snapshot missing.');
    const key=JSON.stringify([question.SubjectID,question.UnitID,question.ChapterID,question.TopicID]);
    if(!groups[key]) groups[key]={SubjectID:question.SubjectID,UnitID:question.UnitID,ChapterID:question.ChapterID,TopicID:question.TopicID,QuestionsAttempted:0,CorrectAnswers:0,WrongAnswers:0,LastPracticedAt:''};
    const group=groups[key]; group.QuestionsAttempted++;
    if(row.IsCorrect===true || String(row.IsCorrect).toLowerCase()==='true') group.CorrectAnswers++; else group.WrongAnswers++;
    if(String(row.AnsweredAt)>String(group.LastPracticedAt)) group.LastPracticedAt=row.AnsweredAt;
  });
  const result=Object.keys(groups).map(key=>{
    const row=groups[key]; row.AccuracyPercentage=Math.round(row.CorrectAnswers/row.QuestionsAttempted*10000)/100;
    row.TopicName=topicNames.get(String(row.TopicID)) || 'Topic progress';
    row.SubjectName=subjectNames.get(String(row.SubjectID)) || '';
    if(persist) {
      const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,uid+':'+key).map(byte=>('0'+(byte&255).toString(16)).slice(-2)).join('');
      mdcatPut_(CONFIG.SHEETS.MDCAT_PROGRESS,Object.assign({},row,{ID:'MDP-'+digest,UserID:uid,AverageTimeSeconds:'',WeaknessScore:'',MasteryLevel:'',Status:'Active',UpdatedAt:new Date().toISOString()}));
    }
    return row;
  });
  return result;
}
