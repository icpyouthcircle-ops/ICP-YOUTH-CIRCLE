"""Portal sheet schemas mirrored from the production Apps Script backend."""

SHEET_SCHEMAS = {
    "Admissions": [
        "ID", "Institution", "Program", "DegreeLevel", "AdmissionType",
        "Eligibility", "OpeningDate", "Deadline", "EntryTest", "MeritListDate",
        "OfficialURL", "Description", "Featured", "Status", "CreatedAt", "UpdatedAt",
    ],
    "Scholarships": [
        "ID", "Name", "Provider", "Type", "Country", "Eligibility", "Benefits",
        "OpeningDate", "Deadline", "OfficialURL", "Description", "Featured", "Status",
        "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Announcements": [
        "ID", "Title", "Category", "Summary", "Content", "PublishDate", "ExpiryDate",
        "OfficialURL", "ButtonText", "DisplayOrder", "Priority", "Featured", "Status",
        "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Countdowns": [
        "ID", "Title", "Description", "TargetDateTime", "AfterMessage", "OfficialURL",
        "ButtonText", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt", "PublishAt",
        "ExpiresAt",
    ],
    "Notifications": [
        "ID", "Title", "Message", "Audience", "TestID", "LinkURL", "PublishAt",
        "ExpiresAt", "DisplayOrder", "Status", "CreatedAt", "UpdatedAt", "Category",
        "Priority", "IsPinned", "ReminderType", "ReminderAt",
    ],
    "Resources": [
        "ID", "Title", "Slug", "Category", "Level", "Subject", "Institution", "Year",
        "ResourceType", "Description", "FileURL", "ThumbnailURL", "Featured",
        "DisplayOrder", "Status", "CreatedAt", "UpdatedAt", "PublishAt", "ExpiresAt",
    ],
    "Opportunities": [
        "ID", "Title", "Organization", "Type", "Location", "Eligibility", "OpeningDate",
        "Deadline", "OfficialURL", "Description", "Featured", "Status", "CreatedAt",
        "UpdatedAt",
    ],
}

SHEET_PREFIXES = {
    "Admissions": "ADM",
    "Scholarships": "SCH",
    "Announcements": "ANN",
    "Countdowns": "COUNT",
    "Notifications": "NTF",
    "Resources": "RES",
    "Opportunities": "OPP",
}

SHEET_HELP = {
    "Admissions": "University, college, degree and admission deadline information.",
    "Scholarships": "Scholarships, financial aid, benefits and eligibility.",
    "Announcements": "Results, exam notices, merit lists and general public updates.",
    "Countdowns": "Important results or events that need a public countdown.",
    "Notifications": "Short public or account notification messages.",
    "Resources": "Notes, past papers, study resources and useful files.",
    "Opportunities": "Internships, competitions, workshops and student programs.",
}
