"""Administrator-maintained portal sheet schemas.

Transactional, identity, log, submission, preference, attempt, answer and progress
sheets are deliberately excluded because the portal maintains them automatically.
"""

COMMON_DIRECTORY = ["ID", "Name", "Slug", "Description", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"]

SHEET_GROUPS = {
    "Admissions & public updates": [
        "Admissions", "Scholarships", "Opportunities", "Announcements", "Countdowns",
        "Notifications", "FAQs", "Blog",
    ],
    "Study library": ["Resources", "MCQs", "Videos", "AI_Tools", "Islamic_Content"],
    "Portal directories": ["Categories", "Subjects", "Levels", "Institutions", "Entry_Tests"],
    "Portal layout & settings": ["Navigation", "Homepage", "Social_Links", "Settings"],
    "Tests": ["Test_Catalog"],
    "MDCAT content": [
        "MDCAT_Subjects", "MDCAT_Units", "MDCAT_Chapters", "MDCAT_Topics",
        "MDCAT_Question_Bank", "MDCAT_Tests", "MDCAT_Test_Questions",
        "MDCAT_Daily_Practice", "MDCAT_Updates",
    ],
}

SHEET_SCHEMAS = {
    "Admissions": [
        "ID", "Institution", "Program", "DegreeLevel", "AdmissionType", "Eligibility",
        "OpeningDate", "Deadline", "EntryTest", "MeritListDate", "OfficialURL",
        "Description", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Scholarships": [
        "ID", "Name", "Provider", "Type", "Country", "Eligibility", "Benefits",
        "OpeningDate", "Deadline", "OfficialURL", "Description", "Featured", "Status",
        "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Opportunities": [
        "ID", "Title", "Organization", "Type", "Location", "Eligibility", "OpeningDate",
        "Deadline", "OfficialURL", "Description", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Announcements": [
        "ID", "Title", "Category", "Summary", "Content", "PublishDate", "ExpiryDate",
        "OfficialURL", "ButtonText", "DisplayOrder", "Priority", "Featured", "Status",
        "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Countdowns": [
        "ID", "Title", "Description", "TargetDateTime", "AfterMessage", "OfficialURL",
        "ButtonText", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Notifications": [
        "ID", "Title", "Message", "Audience", "TestID", "LinkURL", "PublishAt", "ExpiresAt",
        "DisplayOrder", "Status", "CreatedAt", "UpdatedAt", "Category", "Priority",
        "IsPinned", "ReminderType", "ReminderAt",
    ],
    "FAQs": ["ID", "Question", "Answer", "Category", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "Blog": [
        "ID", "Title", "Slug", "Category", "Author", "Summary", "Content", "ThumbnailURL",
        "PublishDate", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Resources": [
        "ID", "Title", "Slug", "Category", "Level", "Subject", "Institution", "Year",
        "ResourceType", "Description", "FileURL", "ThumbnailURL", "Featured", "DisplayOrder",
        "Status", "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "MCQs": [
        "ID", "Question", "OptionA", "OptionB", "OptionC", "OptionD", "CorrectOption",
        "Explanation", "Subject", "Topic", "Level", "EntryTest", "Difficulty", "Status",
        "CreatedAt", "UpdatedAt",
    ],
    "Videos": [
        "ID", "Title", "Category", "Subject", "Level", "Platform", "VideoURL",
        "ThumbnailURL", "Duration", "Description", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "AI_Tools": [
        "ID", "Name", "Category", "Description", "ToolURL", "LogoURL", "PricingType",
        "BestFor", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Islamic_Content": [
        "ID", "Title", "Type", "ArabicText", "UrduTranslation", "EnglishTranslation",
        "Reference", "SourceURL", "Description", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Categories": [
        "ID", "Name", "Slug", "ParentCategory", "Description", "Icon", "DisplayOrder",
        "Status", "CreatedAt", "UpdatedAt",
    ],
    "Subjects": COMMON_DIRECTORY,
    "Levels": COMMON_DIRECTORY,
    "Institutions": [
        "ID", "Name", "Slug", "Type", "City", "Province", "WebsiteURL", "LogoURL",
        "Description", "Featured", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Entry_Tests": [
        "ID", "Name", "Slug", "Organization", "Description", "Eligibility", "RegistrationStart",
        "RegistrationDeadline", "TestDate", "OfficialURL", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Navigation": ["ID", "Label", "Slug", "ParentID", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "Homepage": [
        "ID", "Section", "Title", "Subtitle", "Description", "ButtonText", "ButtonURL",
        "ImageURL", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Social_Links": ["ID", "Platform", "Label", "URL", "Icon", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "Settings": ["ID", "Key", "Value", "Description", "UpdatedAt"],
    "Test_Catalog": [
        "ID", "Name", "Slug", "Description", "TestType", "Route", "Engine",
        "DisplayOrder", "Status", "CreatedAt", "UpdatedAt",
    ],
    "MDCAT_Subjects": ["ID", "Name", "Slug", "Description", "Icon", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "MDCAT_Units": ["ID", "SubjectID", "Name", "Slug", "Description", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "MDCAT_Chapters": ["ID", "UnitID", "SubjectID", "Name", "Slug", "Description", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "MDCAT_Topics": ["ID", "ChapterID", "UnitID", "SubjectID", "Name", "Slug", "Description", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt"],
    "MDCAT_Question_Bank": [
        "ID", "SubjectID", "UnitID", "ChapterID", "TopicID", "Question", "OptionA", "OptionB",
        "OptionC", "OptionD", "CorrectOption", "Explanation", "Difficulty", "QuestionType",
        "Source", "Status", "CreatedAt", "UpdatedAt",
    ],
    "MDCAT_Tests": [
        "ID", "Title", "Slug", "TestType", "SubjectID", "UnitID", "ChapterID", "TopicID",
        "Description", "TotalQuestions", "DurationMinutes", "PassingPercentage",
        "RandomizeQuestions", "RandomizeOptions", "Status", "Featured", "CreatedAt", "UpdatedAt",
    ],
    "MDCAT_Test_Questions": [
        "ID", "TestID", "QuestionID", "DisplayOrder", "Marks", "NegativeMarks", "Status", "CreatedAt", "UpdatedAt",
    ],
    "MDCAT_Daily_Practice": [
        "ID", "Date", "Title", "Description", "SubjectID", "UnitID", "ChapterID", "TopicID",
        "QuestionCount", "DurationMinutes", "Difficulty", "Status", "Featured", "CreatedAt", "UpdatedAt",
    ],
    "MDCAT_Updates": [
        "ID", "Title", "Category", "Summary", "Content", "PublishDate", "ExpiryDate",
        "OfficialURL", "Priority", "Status", "Featured", "CreatedAt", "UpdatedAt",
    ],
}

SHEET_PREFIXES = {
    "Admissions": "ADM", "Scholarships": "SCH", "Opportunities": "OPP", "Announcements": "ANN",
    "Countdowns": "COUNT", "Notifications": "NTF", "FAQs": "FAQ", "Blog": "BLOG",
    "Resources": "RES", "MCQs": "MCQ", "Videos": "VID", "AI_Tools": "AIT",
    "Islamic_Content": "ISL", "Categories": "CAT", "Subjects": "SUB", "Levels": "LVL",
    "Institutions": "INS", "Entry_Tests": "TEST", "Navigation": "NAV", "Homepage": "HOME",
    "Social_Links": "SOC", "Settings": "SET", "Test_Catalog": "TST", "MDCAT_Subjects": "MDS",
    "MDCAT_Units": "MDU", "MDCAT_Chapters": "MDC", "MDCAT_Topics": "MDT",
    "MDCAT_Question_Bank": "MDQ", "MDCAT_Tests": "MDTEST", "MDCAT_Test_Questions": "MDTQ",
    "MDCAT_Daily_Practice": "MDDP", "MDCAT_Updates": "MDUP",
}

SHEET_HELP = {
    "Admissions": "University, college, degree and admission deadline information.",
    "Scholarships": "Scholarships, financial aid, benefits and eligibility.",
    "Opportunities": "Internships, competitions, workshops and student programs.",
    "Announcements": "Results, exam notices, merit lists and general public updates.",
    "Countdowns": "Important results or events that need a public countdown.",
    "Notifications": "Short public or account notification messages.",
    "FAQs": "Searchable questions and answers.", "Blog": "Long-form articles and guides.",
    "Resources": "Notes, past papers, study resources and useful files.",
    "MCQs": "Questions, options, answers and explanations.",
    "Videos": "Learning videos and their links.",
    "AI_Tools": "Recommended AI tools and their verified links.",
    "Islamic_Content": "Verified Islamic content with source references.",
    "Categories": "Top-level portal content categories.", "Subjects": "Subjects used to classify learning content.",
    "Levels": "Education levels used in filters.", "Institutions": "Schools, colleges, universities and organizations.",
    "Entry_Tests": "Entry test dates, eligibility and official links.",
    "Navigation": "Public navigation labels and routes.", "Homepage": "Homepage sections, buttons and images.",
    "Social_Links": "Official ICP YOUTH CIRCLE social links.", "Settings": "Portal text and configuration values.",
    "Test_Catalog": "Tests displayed in the universal test platform.",
    "MDCAT_Subjects": "MDCAT subject directory.", "MDCAT_Units": "Units linked to an MDCAT subject.",
    "MDCAT_Chapters": "Chapters linked to unit and subject IDs.",
    "MDCAT_Topics": "Topics linked to chapter, unit and subject IDs.",
    "MDCAT_Question_Bank": "MDCAT questions, answer options and explanations.",
    "MDCAT_Tests": "MDCAT test definitions and timing.",
    "MDCAT_Test_Questions": "Links existing questions to an MDCAT test.",
    "MDCAT_Daily_Practice": "Scheduled MDCAT daily practice sets.",
    "MDCAT_Updates": "MDCAT notices and official updates.",
}

SYSTEM_MANAGED_SHEETS = [
    "Submissions", "Help_Desk", "Feedback", "Admins", "Activity_Log", "Notification_Reads",
    "Notification_Preferences", "MDCAT_Sessions", "MDCAT_Session_Questions",
    "MDCAT_Test_Attempts", "MDCAT_Attempt_Answers", "MDCAT_Progress", "MDCAT_Revision",
    "MDCAT_Study_Plan",
]
