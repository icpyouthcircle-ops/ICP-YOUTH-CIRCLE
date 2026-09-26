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
    TEST_CATALOG: 'Test_Catalog',
    NOTIFICATIONS: 'Notifications',
    NOTIFICATION_READS: 'Notification_Reads',
    NOTIFICATION_PREFERENCES: 'Notification_Preferences',
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

    if (action === 'portalBundle') {
      return cachedPublicJsonResponse_('portalBundle',getPublicPortalBundle_,300);
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
    if (action === 'testCatalog') {
      return cachedPublicJsonResponse_('testCatalog',getPublicTestCatalog_,300);
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
    ButtonText: item.ButtonText,
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

function getPublicPortalBundle_() {
  return {
    resources:getPublicResources_(''),
    mcqs:getPublicMCQs_(),
    videos:getPublicVideos_(),
    admissions:getPublicAdmissions_(),
    scholarships:getPublicScholarships_(),
    opportunities:getPublicOpportunities_(),
    announcements:getPublicAnnouncements_(),
    aiTools:getPublicAITools_(),
    islamicContent:getPublicIslamicContent_(),
    blog:getPublicBlog_(),
    entryTests:getPublicEntryTests_()
  };
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
  const settings=mdcatFirebaseSettings_();
  const enabled = settings.valid && settings.scoringEnabled;
  return {enabled:enabled, version:1, firebase: enabled ? {
    apiKey:settings.firebase.apiKey, authDomain:settings.firebase.authDomain, projectId:settings.firebase.projectId, appId:settings.firebase.appId
  } : null};
}

function mdcatFirebaseSettings_() {
  const properties=PropertiesService.getScriptProperties();
  let firebase;
  try { firebase=JSON.parse(properties.getProperty('MDCAT_FIREBASE_CONFIG') || '{}'); }
  catch (_) { firebase={}; }
  const valid=['apiKey','authDomain','projectId','appId'].every(key=>typeof firebase[key]==='string' && firebase[key].trim());
  return {firebase:firebase,valid:valid,scoringEnabled:properties.getProperty('MDCAT_SCORING_ENABLED')==='true'};
}

function firebaseAuthenticate_(token) {
  const settings=mdcatFirebaseSettings_();
  if (!settings.valid) mdcatError_('NOT_CONFIGURED','Google sign-in is not configured yet.');
  const config={firebase:settings.firebase};
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
  return {uid:String(account.localId),email:String(account.email || '').trim().toLowerCase()};
}

function mdcatAuthenticate_(token) {
  if (!mdcatAuthConfig_().enabled) mdcatError_('NOT_CONFIGURED','Scoring is not enabled yet.');
  return firebaseAuthenticate_(token).uid;
}

const PUBLIC_FORM_LIMITS_ = {
  resource: {sheet:'SUBMISSIONS',prefix:'SUBM',required:[['Name','SubmittedBy','SubmitterName','FullName'],['Email','ContactEmail'],['Title','ResourceTitle'],['ResourceType','Type','Category'],['URL','ResourceURL','Link']]},
  help: {sheet:'HELP_DESK',prefix:'HELP',required:[['Name','SubmittedBy','RequesterName','FullName'],['Email','ContactEmail'],['RequestType','Category','Type'],['Subject','Title'],['Message','Description','Request','Details']]}
};

function publicFormText_(value, label, maximum, required) {
  const text=String(value == null ? '' : value).replace(/\r\n?/g,'\n').trim();
  if (required && !text) mdcatError_('BAD_REQUEST',label+' is required.');
  if (text.length>maximum) mdcatError_('BAD_REQUEST',label+' is too long.');
  return text;
}

function publicFormEmail_(value) {
  const email=publicFormText_(value,'Email',160,true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) mdcatError_('BAD_REQUEST','Enter a valid email address.');
  return email;
}

function publicFormToken_(value, action) {
  const token=String(value || '');
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) mdcatError_('BAD_REQUEST','Refresh the page and try again.');
  const cache=CacheService.getScriptCache();
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,action+':'+token)
    .map(byte=>(byte<0?byte+256:byte).toString(16).padStart(2,'0')).join('').slice(0,32);
  const key='icp-public-form-'+digest;
  const count=Number(cache.get(key) || 0);
  if (count>=5) mdcatError_('RATE_LIMITED','Too many requests. Please wait ten minutes and try again.');
  cache.put(key,String(count+1),600);
}

function publicFormAppend_(kind, fields) {
  const definition=PUBLIC_FORM_LIMITS_[kind];
  const sheetName=CONFIG.SHEETS[definition.sheet];
  const sheet=getSheet_(sheetName);
  const values=sheet.getDataRange().getValues();
  const headers=(values[0] || []).map(value=>String(value).replace(/\uFEFF/g,'').trim());
  if (!headers.length || !headers.some(Boolean) || new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length) {
    mdcatError_('SETUP_REQUIRED',sheetName+' needs a valid header row.');
  }
  const lowerHeaders=new Set(headers.filter(Boolean).map(header=>header.toLowerCase()));
  const missing=definition.required.filter(group=>!group.some(key=>lowerHeaders.has(key.toLowerCase()))).map(group=>group[0]);
  if (missing.length) mdcatError_('SETUP_REQUIRED',sheetName+' is missing required field column(s): '+missing.join(', ')+'.');
  const now=new Date();
  const id=generateNextId_(sheetName,definition.prefix);
  const record=Object.assign({},fields,{ID:id,Status:'Pending Review',SubmittedAt:now,CreatedAt:now,UpdatedAt:now});
  const byLower={};Object.keys(record).forEach(key=>{byLower[key.toLowerCase()]=record[key];});
  const row=headers.map(header=>header ? mdcatCell_(byLower[header.toLowerCase()] == null ? '' : byLower[header.toLowerCase()]) : '');
  sheet.appendRow(row);
  return {id:id,status:'Pending Review'};
}

function publicSubmitResource_(body) {
  if (String(body.website || '').trim()) mdcatError_('BAD_REQUEST','Unable to accept this submission.');
  publicFormToken_(body.submissionToken,'resource');
  const title=publicFormText_(body.title,'Resource title',200,true);
  const url=publicFormText_(body.url,'Resource link',1000,true);
  if (!/^https?:\/\/[^\s]+$/i.test(url)) mdcatError_('BAD_REQUEST','Enter a complete http or https resource link.');
  const name=publicFormText_(body.name,'Name',120,true);
  const email=publicFormEmail_(body.email);
  const resourceType=publicFormText_(body.resourceType,'Resource type',80,true);
  return publicFormAppend_('resource',{
    Name:name,SubmittedBy:name,SubmitterName:name,FullName:name,
    Email:email,ContactEmail:email,
    Title:title,ResourceTitle:title,
    ResourceType:resourceType,Type:resourceType,Category:resourceType,
    Subject:publicFormText_(body.subject,'Subject',120,false),
    Level:publicFormText_(body.level,'Level',120,false),
    Description:publicFormText_(body.description,'Description',1500,false),
    URL:url,ResourceURL:url,Link:url,
    Consent:'Yes'
  });
}

function publicHelpRequest_(body) {
  if (String(body.website || '').trim()) mdcatError_('BAD_REQUEST','Unable to accept this request.');
  publicFormToken_(body.submissionToken,'help');
  const subject=publicFormText_(body.subject,'Subject',200,true);
  const message=publicFormText_(body.message,'Message',2000,true);
  const name=publicFormText_(body.name,'Name',120,true);
  const email=publicFormEmail_(body.email);
  const requestType=publicFormText_(body.requestType,'Request type',80,true);
  return publicFormAppend_('help',{
    Name:name,SubmittedBy:name,RequesterName:name,FullName:name,
    Email:email,ContactEmail:email,
    RequestType:requestType,Category:requestType,Type:requestType,
    Subject:subject,Title:subject,
    Message:message,Description:message,Request:message,Details:message,
    Consent:'Yes'
  });
}

function getOptionalSheetData_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) return [];
  return getSheetData_(sheetName);
}

function getPublicTestCatalog_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.TEST_CATALOG);
  const rows = sheet ? getActiveSheetData_(CONFIG.SHEETS.TEST_CATALOG) : [{
    ID:'TST-MDCAT',Name:'MDCAT',Slug:'mdcat',Description:'Medical and Dental College Admission Test preparation and scored practice.',
    TestType:'Entry Test',Route:'mdcat',Engine:'MDCAT',DisplayOrder:1
  }];
  return rows.map(row=>({
    ID:String(row.ID || '').slice(0,120),Name:String(row.Name || row.Title || '').slice(0,200),
    Slug:String(row.Slug || '').slice(0,120),Description:String(row.Description || '').slice(0,1000),
    TestType:String(row.TestType || row.Category || '').slice(0,120),Route:String(row.Route || row.Slug || '').slice(0,120),
    Engine:String(row.Engine || '').slice(0,80),DisplayOrder:Number(row.DisplayOrder || 0)
  })).filter(row=>row.ID && row.Name).sort((a,b)=>a.DisplayOrder-b.DisplayOrder || a.Name.localeCompare(b.Name));
}

function studentOwnedRows_(sheetName,email) {
  return getSheetData_(sheetName).filter(row=>{
    const owner=String(row.Email || row.ContactEmail || row.SubmitterEmail || row.RequesterEmail || '').trim().toLowerCase();
    return owner===email;
  }).sort((a,b)=>new Date(b.UpdatedAt || b.SubmittedAt || b.CreatedAt || 0).getTime()-new Date(a.UpdatedAt || a.SubmittedAt || a.CreatedAt || 0).getTime()).slice(0,100);
}

function studentNotificationPreferences_(uid) {
  const defaults={GeneralUpdates:true,TestNotices:true,DeadlineReminders:true,StudyPlanReminders:true};
  const sheet=getSpreadsheet_().getSheetByName(CONFIG.SHEETS.NOTIFICATION_PREFERENCES);
  if (!sheet) return defaults;
  const rows=getSheetData_(CONFIG.SHEETS.NOTIFICATION_PREFERENCES).filter(row=>String(row.UserID)===String(uid) && String(row.Status || 'Active').toLowerCase()==='active');
  if (!rows.length) return defaults;
  const value=(row,key)=>String(row[key]).trim().toLowerCase()!=='false';
  return Object.fromEntries(Object.keys(defaults).map(key=>[key,value(rows[0],key)]));
}

function studentNotificationReadIds_(uid) {
  const sheet=getSpreadsheet_().getSheetByName(CONFIG.SHEETS.NOTIFICATION_READS);
  if (!sheet) return [];
  return getSheetData_(CONFIG.SHEETS.NOTIFICATION_READS).filter(row=>String(row.UserID)===String(uid) && String(row.Status || 'Active').toLowerCase()==='active')
    .map(row=>String(row.NotificationID || '')).filter(Boolean).slice(-1000);
}

function studentNotifications_(preferences) {
  const now=Date.now();
  const timestamp=value=>{
    if (!value) return 0;
    const parsed=new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return getOptionalSheetData_(CONFIG.SHEETS.NOTIFICATIONS).filter(row=>{
    if (String(row.Status == null ? 'Active' : row.Status).trim().toLowerCase()!=='active') return false;
    const audience=String(row.Audience || 'All').trim().toLowerCase();
    if (!['all','everyone','registered users','students'].includes(audience)) return false;
    const publishAt=timestamp(row.PublishAt || row.PublishDate);
    const expiresAt=timestamp(row.ExpiresAt || row.ExpiryDate);
    if ((publishAt && publishAt>now) || (expiresAt && expiresAt<now)) return false;
    const category=String(row.Category || (row.TestID ? 'Test' : 'General')).trim().toLowerCase();
    const reminder=String(row.ReminderType || '').trim().toLowerCase();
    const pinned=/^(yes|true|1)$/i.test(String(row.IsPinned || '')) || /^(important|urgent)$/i.test(String(row.Priority || ''));
    if (pinned || !preferences) return true;
    if ((row.TestID || category==='test') && preferences.TestNotices===false) return false;
    if ((reminder==='deadline' || category==='deadline') && preferences.DeadlineReminders===false) return false;
    if ((reminder==='study plan' || reminder==='study-plan' || category==='study plan') && preferences.StudyPlanReminders===false) return false;
    return preferences.GeneralUpdates!==false;
  }).sort((a,b)=>{
    const pinnedA=/^(yes|true|1)$/i.test(String(a.IsPinned || '')) || /^(important|urgent)$/i.test(String(a.Priority || ''));
    const pinnedB=/^(yes|true|1)$/i.test(String(b.IsPinned || '')) || /^(important|urgent)$/i.test(String(b.Priority || ''));
    if (pinnedA!==pinnedB) return pinnedA ? -1 : 1;
    const order=Number(a.DisplayOrder || 0)-Number(b.DisplayOrder || 0);
    return order || timestamp(b.PublishAt || b.CreatedAt)-timestamp(a.PublishAt || a.CreatedAt);
  }).slice(0,50).map(row=>({
    ID:String(row.ID || '').slice(0,120),Title:String(row.Title || '').replace(/\s+/g,' ').trim().slice(0,240),
    Message:String(row.Message || row.Description || '').trim().slice(0,2000),
    TestID:String(row.TestID || '').slice(0,120),LinkURL:String(row.LinkURL || row.URL || '').trim().slice(0,1000),
    Category:String(row.Category || (row.TestID ? 'Test' : 'General')).trim().slice(0,80) || 'General',
    Priority:String(row.Priority || 'Normal').trim().slice(0,40) || 'Normal',
    IsPinned:/^(yes|true|1)$/i.test(String(row.IsPinned || '')) || /^(important|urgent)$/i.test(String(row.Priority || '')),
    ReminderType:String(row.ReminderType || '').trim().slice(0,80),ReminderAt:row.ReminderAt || '',
    PublishAt:row.PublishAt || row.PublishDate || row.CreatedAt || '',ExpiresAt:row.ExpiresAt || row.ExpiryDate || ''
  })).filter(row=>row.ID && row.Title);
}

function studentDashboardMetrics_(uid) {
  const empty={recentResults:[],questionsAttempted:0,overallAccuracy:0,accuracyBySubject:[],weakTopics:[]};
  try {
    const attempts=mdcatTable_(CONFIG.SHEETS.MDCAT_TEST_ATTEMPTS).rows.filter(row=>row.UserID===uid && row.Status==='Submitted')
      .sort((a,b)=>new Date(b.SubmittedAt)-new Date(a.SubmittedAt));
    const sessions=new Map(mdcatTable_(MDCAT_SCORING_.sessions).rows.map(row=>[String(row.ID),row]));
    const recentResults=attempts.slice(0,5).map(row=>({
      attemptId:String(row.ID),title:String((sessions.get(String(row.ID)) || {}).Title || 'MDCAT practice').slice(0,240),
      percentage:Number(row.Percentage || 0),score:Number(row.Score || 0),totalQuestions:Number(row.TotalQuestions || 0),
      attemptedQuestions:Number(row.AttemptedQuestions || 0),submittedAt:row.SubmittedAt || row.UpdatedAt || ''
    }));
    const progress=mdcatProgress_(uid,false);
    const questionsAttempted=progress.reduce((sum,row)=>sum+Number(row.QuestionsAttempted || 0),0);
    const correct=progress.reduce((sum,row)=>sum+Number(row.CorrectAnswers || 0),0);
    const bySubject={};
    progress.forEach(row=>{
      const key=String(row.SubjectID || row.SubjectName || 'Other');
      if(!bySubject[key])bySubject[key]={subjectId:String(row.SubjectID || ''),subjectName:String(row.SubjectName || 'Other'),questionsAttempted:0,correctAnswers:0};
      bySubject[key].questionsAttempted+=Number(row.QuestionsAttempted || 0);bySubject[key].correctAnswers+=Number(row.CorrectAnswers || 0);
    });
    const accuracyBySubject=Object.values(bySubject).map(row=>Object.assign(row,{accuracy:row.questionsAttempted?Math.round(row.correctAnswers/row.questionsAttempted*10000)/100:0}))
      .sort((a,b)=>b.questionsAttempted-a.questionsAttempted);
    const weakTopics=progress.filter(row=>Number(row.QuestionsAttempted || 0)>0).sort((a,b)=>Number(a.AccuracyPercentage)-Number(b.AccuracyPercentage) || Number(b.QuestionsAttempted)-Number(a.QuestionsAttempted)).slice(0,5)
      .map(row=>({topicId:String(row.TopicID || ''),topicName:String(row.TopicName || 'Topic'),subjectName:String(row.SubjectName || ''),questionsAttempted:Number(row.QuestionsAttempted || 0),accuracy:Number(row.AccuracyPercentage || 0)}));
    return {recentResults:recentResults,questionsAttempted:questionsAttempted,overallAccuracy:questionsAttempted?Math.round(correct/questionsAttempted*10000)/100:0,accuracyBySubject:accuracyBySubject,weakTopics:weakTopics};
  } catch (_) { return empty; }
}

function studentDashboard_(user) {
  const clean=(value,max)=>String(value == null ? '' : value).replace(/\s+/g,' ').trim().slice(0,max || 500);
  const submissions=studentOwnedRows_(CONFIG.SHEETS.SUBMISSIONS,user.email).map(row=>({
    ID:clean(row.ID,120),Title:clean(row.Title || row.ResourceTitle,240),ResourceType:clean(row.ResourceType || row.Type,100),
    Subject:clean(row.Subject,160),Status:clean(row.Status || 'Pending Review',80),
    SubmittedAt:row.SubmittedAt || row.CreatedAt || '',UpdatedAt:row.UpdatedAt || '',
    Response:clean(row.AdminResponse || row.ReviewNotes || row.Response,1000)
  }));
  const helpRequests=studentOwnedRows_(CONFIG.SHEETS.HELP_DESK,user.email).map(row=>({
    ID:clean(row.ID,120),RequestType:clean(row.RequestType || row.Category || row.Type,100),
    Subject:clean(row.Subject || row.Title,240),Status:clean(row.Status || 'Pending Review',80),
    SubmittedAt:row.SubmittedAt || row.CreatedAt || '',UpdatedAt:row.UpdatedAt || '',
    Response:clean(row.AdminResponse || row.Response || row.Resolution,1000)
  }));
  const preferences=studentNotificationPreferences_(user.uid);
  const readNotificationIds=studentNotificationReadIds_(user.uid);
  const readSet=new Set(readNotificationIds);
  const notifications=studentNotifications_(preferences).map(row=>Object.assign({},row,{IsRead:readSet.has(String(row.ID))}));
  return Object.assign({email:user.email,submissions:submissions,helpRequests:helpRequests,notifications:notifications,
    unreadNotificationCount:notifications.filter(row=>!row.IsRead).length,readNotificationIds:readNotificationIds,notificationPreferences:preferences},studentDashboardMetrics_(user.uid));
}

function notificationDigest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value)).map(byte=>('0'+(byte&255).toString(16)).slice(-2)).join('');
}

function studentMarkNotificationsRead_(user,body) {
  if (!Array.isArray(body.notificationIds) || !body.notificationIds.length || body.notificationIds.length>100) mdcatError_('BAD_REQUEST','Choose between 1 and 100 notifications.');
  const ids=[...new Set(body.notificationIds.map(value=>String(value || '').trim()))];
  if(ids.some(id=>!id || id.length>120 || !/^[A-Za-z0-9_-]+$/.test(id))) mdcatError_('BAD_REQUEST','A notification reference is invalid.');
  const now=new Date().toISOString();
  mdcatPutMany_(CONFIG.SHEETS.NOTIFICATION_READS,ids.map(id=>({ID:'NREAD-'+notificationDigest_(user.uid+':'+id),UserID:user.uid,NotificationID:id,ReadAt:now,Status:'Active',CreatedAt:now,UpdatedAt:now})));
  return {readNotificationIds:ids};
}

function studentSaveNotificationPreferences_(user,body) {
  const keys=['GeneralUpdates','TestNotices','DeadlineReminders','StudyPlanReminders'];
  if(!body.preferences || typeof body.preferences!=='object' || Array.isArray(body.preferences) || keys.some(key=>typeof body.preferences[key]!=='boolean')) mdcatError_('BAD_REQUEST','Choose valid notification preferences.');
  const now=new Date().toISOString();
  const preferences=Object.fromEntries(keys.map(key=>[key,body.preferences[key]]));
  mdcatPut_(CONFIG.SHEETS.NOTIFICATION_PREFERENCES,Object.assign({ID:'NPREF-'+notificationDigest_(user.uid),UserID:user.uid,Status:'Active',CreatedAt:now,UpdatedAt:now},preferences));
  return preferences;
}

const ADMIN_TABLES_ = [
  ['RESOURCES','Resources','RES'],['CATEGORIES','Categories','CAT'],['SUBJECTS','Subjects','SUB'],
  ['LEVELS','Levels','LVL'],['INSTITUTIONS','Institutions','INS'],['ENTRY_TESTS','Entry tests','TEST'],
  ['ADMISSIONS','Admissions','ADM'],['SCHOLARSHIPS','Scholarships','SCH'],['OPPORTUNITIES','Opportunities','OPP'],
  ['ANNOUNCEMENTS','Announcements','ANN'],['MCQS','MCQs','MCQ'],['VIDEOS','Videos','VID'],
  ['AI_TOOLS','AI tools','AIT'],['ISLAMIC_CONTENT','Islamic content','ISL'],['BLOG','Blog','BLOG'],
  ['NAVIGATION','Navigation','NAV'],['HOMEPAGE','Homepage','HOME'],['SOCIAL_LINKS','Social links','SOC'],
  ['SETTINGS','Settings','SET'],['SUBMISSIONS','Resource submissions','SUBM'],['HELP_DESK','Help desk','HELP'],
  ['TEST_CATALOG','Test catalog','TST'],['NOTIFICATIONS','Notifications','NTF'],
  ['MDCAT_SUBJECTS','MDCAT subjects','MDS'],['MDCAT_UNITS','MDCAT units','MDU'],
  ['MDCAT_CHAPTERS','MDCAT chapters','MDC'],['MDCAT_TOPICS','MDCAT topics','MDT'],
  ['MDCAT_QUESTION_BANK','MDCAT question bank','MDQ'],['MDCAT_TESTS','MDCAT tests','MDTEST'],
  ['MDCAT_TEST_QUESTIONS','MDCAT test questions','MDTQ'],['MDCAT_DAILY_PRACTICE','MDCAT daily practice','MDDP'],
  ['MDCAT_UPDATES','MDCAT updates','MDUP']
].map(row=>({key:row[0],label:row[1],prefix:row[2]}));

function adminTable_(key) {
  const table=ADMIN_TABLES_.find(item=>item.key===String(key || ''));
  if (!table || !CONFIG.SHEETS[table.key]) mdcatError_('BAD_REQUEST','This dashboard section is not available.');
  return Object.assign({},table,{sheetName:CONFIG.SHEETS[table.key]});
}

function adminHeaders_(sheetName) {
  const values=getSheet_(sheetName).getDataRange().getValues();
  if (!values.length) mdcatError_('SETUP_REQUIRED','The '+sheetName+' sheet needs a header row.');
  const headers=values[0].map(value=>String(value).replace(/\uFEFF/g,'').trim()).filter(Boolean);
  if (!headers.length) mdcatError_('SETUP_REQUIRED','The '+sheetName+' sheet needs a header row.');
  return headers;
}

function adminAuthenticate_(token) {
  const user=firebaseAuthenticate_(token);
  if (!user.email) mdcatError_('ADMIN_REQUIRED','Your Google account has no verified email address.');
  const rows=getSheetData_(CONFIG.SHEETS.ADMINS);
  const admin=rows.find(row=>{
    const email=String(row.Email || row.AdminEmail || row.GoogleEmail || '').trim().toLowerCase();
    const status=String(row.Status == null ? 'Active' : row.Status).trim().toLowerCase();
    return email===user.email && status==='active';
  });
  if (!admin) mdcatError_('ADMIN_REQUIRED','This Google account is not an active portal administrator.');
  return {uid:user.uid,email:user.email,role:String(admin.Role || admin.AdminRole || 'Editor').trim() || 'Editor'};
}

function adminManifest_(admin) {
  const spreadsheet=getSpreadsheet_();
  const optional={TEST_CATALOG:true,NOTIFICATIONS:true};
  return {
    email:admin.email,
    role:admin.role,
    tables:ADMIN_TABLES_.map(item=>{
      const sheet=spreadsheet.getSheetByName(CONFIG.SHEETS[item.key]);
      if (!sheet && optional[item.key]) return null;
      if (!sheet) getSheet_(CONFIG.SHEETS[item.key]);
      return {key:item.key,label:item.label,headers:adminHeaders_(CONFIG.SHEETS[item.key]),rowCount:Math.max(0,sheet.getLastRow()-1)};
    }).filter(Boolean)
  };
}

function adminList_(body) {
  const table=adminTable_(body.table);
  const rows=getSheetData_(table.sheetName);
  const query=String(body.query || '').trim().toLowerCase().slice(0,100);
  const filtered=query ? rows.filter(row=>Object.values(row).some(value=>String(value).toLowerCase().includes(query))) : rows;
  const offset=Math.max(0,Math.floor(Number(body.offset) || 0));
  const limit=Math.max(1,Math.min(100,Math.floor(Number(body.limit) || 50)));
  return {table:table.key,headers:adminHeaders_(table.sheetName),rows:filtered.slice(offset,offset+limit),total:filtered.length,offset:offset,limit:limit};
}

function adminCell_(value) {
  if (value == null) return '';
  if (typeof value==='number' || typeof value==='boolean') return value;
  const text=String(value).slice(0,20000);
  return (/^[=+@]/.test(text) || (/^-/.test(text) && !/^-\d+(\.\d+)?$/.test(text))) ? "'"+text : text;
}

function adminSaveRecord_(table, input, admin) {
  if (!input || Array.isArray(input) || typeof input!=='object') mdcatError_('BAD_REQUEST','A record is required.');
  const sheet=getSheet_(table.sheetName);
  const values=sheet.getDataRange().getValues();
  const rawHeaders=values[0] || [];
  const headers=rawHeaders.map(value=>String(value).replace(/\uFEFF/g,'').trim());
  if (!headers.filter(Boolean).length) mdcatError_('SETUP_REQUIRED','The '+table.sheetName+' sheet needs a header row.');
  const record={};
  headers.forEach(header=>{if(header && Object.prototype.hasOwnProperty.call(input,header)) record[header]=adminCell_(input[header]);});
  const keyField=headers.includes('ID') ? 'ID' : (headers.includes('Key') ? 'Key' : headers.find(Boolean));
  if (!keyField) mdcatError_('SETUP_REQUIRED','The sheet needs an ID or key column.');
  if (keyField==='ID' && !String(record.ID || '').trim()) record.ID=generateNextId_(table.sheetName,table.prefix);
  const key=String(record[keyField] || '').trim();
  if (!key) mdcatError_('BAD_REQUEST',keyField+' is required.');
  const keyIndex=headers.indexOf(keyField);
  const existingIndex=values.findIndex((row,index)=>index>0 && String(row[keyIndex] || '').trim()===key);
  const now=new Date();
  if (headers.includes('UpdatedAt')) record.UpdatedAt=now;
  if (existingIndex<0 && headers.includes('CreatedAt') && !record.CreatedAt) record.CreatedAt=now;
  if (existingIndex<0 && headers.includes('Status') && !String(record.Status || '').trim()) record.Status='Inactive';
  if (existingIndex>=0) {
    const updated=headers.map((header,index)=>{
      if (header==='CreatedAt' && values[existingIndex][index]) return values[existingIndex][index];
      return Object.prototype.hasOwnProperty.call(record,header) ? record[header] : values[existingIndex][index];
    });
    sheet.getRange(existingIndex+1,1,1,headers.length).setValues([updated]);
  } else {
    sheet.appendRow(headers.map(header=>record[header] == null ? '' : record[header]));
  }
  try {
    addRecord_(CONFIG.SHEETS.ACTIVITY_LOG,{ID:generateNextId_(CONFIG.SHEETS.ACTIVITY_LOG,'LOG'),AdminEmail:admin.email,Action:existingIndex>=0?'UPDATE':'CREATE',EntityType:table.key,EntityID:key,Details:'Admin dashboard',Timestamp:now});
  } catch (_) {}
  return {key:key,created:existingIndex<0};
}

function adminSave_(body,admin) {
  return adminSaveRecord_(adminTable_(body.table),body.record,admin);
}

function adminBulk_(body,admin) {
  const table=adminTable_(body.table);
  if (!Array.isArray(body.records) || !body.records.length || body.records.length>100) mdcatError_('BAD_REQUEST','Paste between 1 and 100 rows at a time.');
  const expected=adminHeaders_(table.sheetName);
  const supplied=Array.isArray(body.headers) ? body.headers.map(value=>String(value).trim()) : [];
  if (expected.length!==supplied.length || expected.some((header,index)=>header!==supplied[index])) mdcatError_('BAD_REQUEST','The pasted header row must exactly match the sheet headers shown in the dashboard.');
  const results=body.records.map(record=>adminSaveRecord_(table,record,admin));
  return {saved:results.length,created:results.filter(row=>row.created).length,updated:results.filter(row=>!row.created).length};
}

function adminArchive_(body,admin) {
  const table=adminTable_(body.table);
  const headers=adminHeaders_(table.sheetName);
  if (!headers.includes('Status')) mdcatError_('BAD_REQUEST','This section cannot be archived because it has no Status column.');
  const record={};
  const keyField=headers.includes('ID') ? 'ID' : (headers.includes('Key') ? 'Key' : headers[0]);
  record[keyField]=String(body.key || '').trim();record.Status='Inactive';
  if (!record[keyField]) mdcatError_('BAD_REQUEST','A record key is required.');
  return adminSaveRecord_(table,record,admin);
}

function adminUploadText_(value,label,max,required) {
  const text=String(value == null ? '' : value).replace(/\s+/g,' ').trim();
  if (required && !text) mdcatError_('BAD_REQUEST',label+' is required.');
  if (text.length>max) mdcatError_('BAD_REQUEST',label+' is too long.');
  return text;
}

function adminPdfFolder_() {
  const properties=PropertiesService.getScriptProperties();
  const key='PORTAL_PDF_FOLDER_ID';
  const existing=properties.getProperty(key);
  if (existing) {
    try { return DriveApp.getFolderById(existing); } catch (_) {}
  }
  const folder=DriveApp.createFolder('ICP YOUTH CIRCLE Portal PDFs');
  properties.setProperty(key,folder.getId());
  return folder;
}

function adminSlug_(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
}

function adminUploadPdf_(body,admin) {
  if (body.rightsConfirmed!==true) mdcatError_('BAD_REQUEST','Confirm that ICP YOUTH CIRCLE has permission to share this PDF.');
  const table=adminTable_('RESOURCES');
  const headers=adminHeaders_(table.sheetName);
  ['Title','Category','FileURL','Status'].forEach(header=>{if(!headers.includes(header)) mdcatError_('SETUP_REQUIRED','Resources is missing required column: '+header+'.');});
  const title=adminUploadText_(body.title,'Title',240,true);
  const category=adminUploadText_(body.category,'Category',80,true);
  if (!['Notes','Past Papers','Study Resources'].includes(category)) mdcatError_('BAD_REQUEST','Choose Notes, Past Papers or Study Resources.');
  const originalName=adminUploadText_(body.fileName,'File name',180,true);
  if (!/\.pdf$/i.test(originalName) || String(body.mimeType || 'application/pdf')!=='application/pdf') mdcatError_('BAD_REQUEST','Only PDF files are supported.');
  const encoded=String(body.dataBase64 || '');
  if (!encoded || encoded.length>11200000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) mdcatError_('BAD_REQUEST','The PDF data is invalid or larger than 8 MB.');
  let bytes;
  try { bytes=Utilities.base64Decode(encoded); } catch (_) { mdcatError_('BAD_REQUEST','The PDF data could not be decoded.'); }
  if (!bytes || bytes.length<5 || bytes.length>8*1024*1024 || bytes[0]!==37 || bytes[1]!==80 || bytes[2]!==68 || bytes[3]!==70 || bytes[4]!==45) mdcatError_('BAD_REQUEST','The selected file is not a valid PDF or is larger than 8 MB.');
  const safeName=originalName.replace(/[^A-Za-z0-9._() -]/g,'_').replace(/\s+/g,' ').slice(0,170);
  const now=new Date();
  let file;
  try {
    file=adminPdfFolder_().createFile(Utilities.newBlob(bytes,MimeType.PDF,safeName));
    file.setDescription('Published by '+admin.email+' through the ICP YOUTH CIRCLE admin dashboard.');
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
    const fileId=file.getId();
    const resource=adminSaveRecord_(table,{
      Title:title,Slug:adminSlug_(title),Category:category,
      Subject:adminUploadText_(body.subject,'Subject',160,false),
      Level:adminUploadText_(body.level,'Level',120,false),
      Institution:adminUploadText_(body.institution,'Institution',180,false),
      Year:adminUploadText_(body.year,'Year',20,false),ResourceType:'PDF',
      Description:adminUploadText_(body.description,'Description',2000,false),
      FileURL:file.getUrl(),Featured:'No',Status:'Active',CreatedAt:now,UpdatedAt:now
    },admin);
    let resourceKey='';
    try { resourceKey=file.getResourceKey() || ''; } catch (_) {}
    return {resourceId:resource.key,fileId:fileId,viewUrl:file.getUrl(),downloadUrl:'https://drive.google.com/uc?export=download&id='+encodeURIComponent(fileId)+(resourceKey?'&resourcekey='+encodeURIComponent(resourceKey):'')};
  } catch (error) {
    if (file) {try {file.setTrashed(true);} catch (_) {}}
    if (error.mdcatCode) throw error;
    mdcatError_('UPLOAD_FAILED','The PDF could not be stored or shared. Check the Apps Script Drive permission and sharing policy.');
  }
}

function adminClearPublicCache_() {
  try {
    const cache=CacheService.getScriptCache();
    cache.removeAll(['icp-public-v1-portalData','icp-public-v1-portalBundle','icp-public-v1-searchIndex','icp-public-v1-mcqs','icp-public-v1-videos','icp-public-v1-admissions','icp-public-v1-scholarships','icp-public-v1-opportunities','icp-public-v1-announcements','icp-public-v1-aiTools','icp-public-v1-islamicContent','icp-public-v1-blog','icp-public-v1-entryTests','icp-public-v1-testCatalog','icp-public-v1-mdcatSubjects','icp-public-v1-mdcatTests','icp-public-v1-mdcatDailyPractice','icp-public-v1-mdcatUpdates']);
  } catch (_) {}
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (typeof raw !== 'string' || raw.length > 11500000) mdcatError_('BAD_REQUEST','Invalid request.');
    let body;
    try { body = JSON.parse(raw); } catch (_) { mdcatError_('BAD_REQUEST','Invalid request.'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') mdcatError_('BAD_REQUEST','Invalid request.');
    if (body.action!=='adminUploadPdf' && raw.length>100000) mdcatError_('BAD_REQUEST','Invalid request.');
    if (body.action==='publicSubmitResource' || body.action==='publicHelpRequest') {
      const publicLock=LockService.getScriptLock();
      if (!publicLock.tryLock(10000)) mdcatError_('BUSY','The service is busy. Please retry.');
      try {
        return jsonResponse_(body.action==='publicSubmitResource' ? publicSubmitResource_(body) : publicHelpRequest_(body));
      } finally { publicLock.releaseLock(); }
    }
    if (['studentDashboard','studentMarkNotificationsRead','studentSaveNotificationPreferences'].includes(body.action)) {
      const student=firebaseAuthenticate_(body.idToken);
      if(body.action==='studentDashboard') return jsonResponse_(studentDashboard_(student));
      const studentLock=LockService.getScriptLock();
      if(!studentLock.tryLock(10000)) mdcatError_('BUSY','The service is busy. Please retry.');
      try {
        if(body.action==='studentMarkNotificationsRead') return jsonResponse_(studentMarkNotificationsRead_(student,body));
        return jsonResponse_(studentSaveNotificationPreferences_(student,body));
      } finally { studentLock.releaseLock(); }
    }
    const adminActions=['adminSession','adminList','adminSave','adminBulk','adminArchive','adminUploadPdf'];
    if (adminActions.includes(body.action)) {
      const admin=adminAuthenticate_(body.idToken);
      if (body.action==='adminSession') return jsonResponse_(adminManifest_(admin));
      if (body.action==='adminList') return jsonResponse_(adminList_(body));
      const adminLock=LockService.getScriptLock();
      if (!adminLock.tryLock(10000)) mdcatError_('BUSY','The service is busy. Please retry.');
      try {
        let adminData;
        if (body.action==='adminSave') adminData=adminSave_(body,admin);
        if (body.action==='adminBulk') adminData=adminBulk_(body,admin);
        if (body.action==='adminArchive') adminData=adminArchive_(body,admin);
        if (body.action==='adminUploadPdf') adminData=adminUploadPdf_(body,admin);
        adminClearPublicCache_();
        return jsonResponse_(adminData);
      } finally { adminLock.releaseLock(); }
    }
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

// Run once after deploying this version. It preserves existing sheets and records.
function setupUniversalTestsAndNotifications_() {
  const spreadsheet=getSpreadsheet_();
  const definitions=[
    [CONFIG.SHEETS.TEST_CATALOG,['ID','Name','Slug','Description','TestType','Route','Engine','DisplayOrder','Status','CreatedAt','UpdatedAt']],
    [CONFIG.SHEETS.NOTIFICATIONS,['ID','Title','Message','Audience','TestID','LinkURL','PublishAt','ExpiresAt','DisplayOrder','Status','CreatedAt','UpdatedAt','Category','Priority','IsPinned','ReminderType','ReminderAt']],
    [CONFIG.SHEETS.NOTIFICATION_READS,['ID','UserID','NotificationID','ReadAt','Status','CreatedAt','UpdatedAt']],
    [CONFIG.SHEETS.NOTIFICATION_PREFERENCES,['ID','UserID','GeneralUpdates','TestNotices','DeadlineReminders','StudyPlanReminders','Status','CreatedAt','UpdatedAt']]
  ];
  definitions.forEach(([name,headers])=>{
    let sheet=spreadsheet.getSheetByName(name);
    if (!sheet) sheet=spreadsheet.insertSheet(name);
    if (sheet.getLastRow()===0) sheet.getRange(1,1,1,headers.length).setValues([headers]);
    const actual=(sheet.getDataRange().getValues()[0] || []).map(value=>String(value).replace(/\uFEFF/g,'').trim()).filter(Boolean);
    if(new Set(actual).size!==actual.length || !actual.includes('ID')) mdcatError_('SETUP_REQUIRED',name+' has missing or duplicate headers.');
    const missing=headers.filter(header=>!actual.includes(header));
    if(missing.length) sheet.getRange(1,actual.length+1,1,missing.length).setValues([missing]);
  });
  const catalog=getSheetData_(CONFIG.SHEETS.TEST_CATALOG);
  if (!catalog.some(row=>String(row.Slug).trim().toLowerCase()==='mdcat')) {
    const now=new Date();
    getSheet_(CONFIG.SHEETS.TEST_CATALOG).appendRow([
      'TST-MDCAT','MDCAT','mdcat','Medical and Dental College Admission Test preparation and scored practice.',
      'Entry Test','mdcat','MDCAT',1,'Active',now,now
    ]);
  }
  adminClearPublicCache_();
  return 'Test_Catalog and Notifications are ready. MDCAT is connected to the universal test catalog.';
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
