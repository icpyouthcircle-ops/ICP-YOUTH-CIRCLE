# MDCAT complete demo-data pack

Purpose: populate one connected demo path for every subject and exercise all currently supported public MDCAT screens in one pass. These rows are original interface tests, not official learning material.

## Paste once, without duplicates

1. Make a backup copy of your Google spreadsheet first. Do not change the original 23 portal tabs.
2. In each named MDCAT tab, compare Row 1 with the header block below. Headers must match exactly, with no extra spaces. In particular, set MDCAT_Chapters!A1 to ID and A2 to MDC-DEMO-001 for your existing Biology demo row.
3. If the tab is empty, paste its header block into A1, then its data block into A2. Blank cells between tabs are intentional.
4. If the tab contains only the demo rows created in this conversation, replace those demo rows with the complete block, rather than appending duplicates. The existing Biology demo IDs are reused.
5. If a tab contains real records, preserve them and append only demo IDs that are not already present, mapping columns to the exact headers. Never replace real content.
6. Your five subject rows already exist. Use that section only to check or repair them; do not append duplicate subject IDs.
7. The date on the daily-practice demo can be changed to the date you want to test. It is displayed as a scheduled date, not presented as today's official challenge.
8. Keep all Status values Active. CreatedAt and UpdatedAt can stay blank. No Apps Script redeploy is needed for data-only edits.

## What this update does

- Subject → unit → chapter → topic → questions.
- Question bank with selectable answers and revision bookmarks.
- Tests use explicit MDCAT_Test_Questions links; daily practice uses its subject/topic/difficulty filters and question count.
- Start-controlled timer, option/question randomization, finish/expiry, answer-selection review and an ungraded completion summary.
- Updates with safe source links and publication/expiry filtering.
- My activity, revision bookmarks and study tasks saved only in the current browser. Saving is explicit; private Sheets are not read or written.

## Backend limits — not completed by this frontend update

The existing public API intentionally omits CorrectOption and Explanation. There is no authenticated submission, grading or student-storage route in the supplied backend contract. Therefore scores, correctness explanations, accuracy/mastery, weak-topic analytics, synced attempts and server-backed study plans are not implemented. PassingPercentage and marks remain configuration for future grading; they are not used to produce a result now. Admin editing remains in Google Sheets. Topic-linked lesson/resource URLs also need a defined data contract before they can be connected. Do not expose private sheets or answer keys as a shortcut.

The five private sheets below stay header-only; no invented student rows are provided. Browser-local records are a convenience, not an account or a secure shared-device profile. Clearing site data removes them.

## MDCAT_Subjects

Header — paste in A1 only if creating or repairing the header row:

```text
ID	Name	Slug	Description	Icon	DisplayOrder	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDS-001	Biology	biology	MDCAT Biology subject directory.		1	Active
MDS-002	Chemistry	chemistry	MDCAT Chemistry subject directory.		2	Active
MDS-003	Physics	physics	MDCAT Physics subject directory.		3	Active
MDS-004	English	english	MDCAT English subject directory.		4	Active
MDS-005	Logical Reasoning	logical-reasoning	MDCAT Logical Reasoning subject directory.		5	Active
```

## MDCAT_Units

Header — paste in A1 only if creating or repairing the header row:

```text
ID	SubjectID	Name	Slug	Description	DisplayOrder	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDU-DEMO-001	MDS-001	Demo Biology Unit	demo-biology-unit	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDU-DEMO-002	MDS-002	Demo Chemistry Unit	demo-chemistry-unit	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDU-DEMO-003	MDS-003	Demo Physics Unit	demo-physics-unit	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDU-DEMO-004	MDS-004	Demo English Unit	demo-english-unit	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDU-DEMO-005	MDS-005	Demo Logical Reasoning Unit	demo-logical-reasoning-unit	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
```

## MDCAT_Chapters

Header — paste in A1 only if creating or repairing the header row:

```text
ID	UnitID	SubjectID	Name	Slug	Description	DisplayOrder	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDC-DEMO-001	MDU-DEMO-001	MDS-001	Demo Biology Chapter	demo-biology-chapter	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDC-DEMO-002	MDU-DEMO-002	MDS-002	Demo Chemistry Chapter	demo-chemistry-chapter	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDC-DEMO-003	MDU-DEMO-003	MDS-003	Demo Physics Chapter	demo-physics-chapter	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDC-DEMO-004	MDU-DEMO-004	MDS-004	Demo English Chapter	demo-english-chapter	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDC-DEMO-005	MDU-DEMO-005	MDS-005	Demo Logical Reasoning Chapter	demo-logical-reasoning-chapter	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
```

## MDCAT_Topics

Header — paste in A1 only if creating or repairing the header row:

```text
ID	ChapterID	UnitID	SubjectID	Name	Slug	Description	DisplayOrder	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDT-DEMO-001	MDC-DEMO-001	MDU-DEMO-001	MDS-001	Demo Biology Topic	demo-biology-topic	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDT-DEMO-002	MDC-DEMO-002	MDU-DEMO-002	MDS-002	Demo Chemistry Topic	demo-chemistry-topic	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDT-DEMO-003	MDC-DEMO-003	MDU-DEMO-003	MDS-003	Demo Physics Topic	demo-physics-topic	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDT-DEMO-004	MDC-DEMO-004	MDU-DEMO-004	MDS-004	Demo English Topic	demo-english-topic	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
MDT-DEMO-005	MDC-DEMO-005	MDU-DEMO-005	MDS-005	Demo Logical Reasoning Topic	demo-logical-reasoning-topic	Demo navigation content only - not official MDCAT syllabus or exam material.	1	Active
```

## MDCAT_Question_Bank

Header — paste in A1 only if creating or repairing the header row:

```text
ID	SubjectID	UnitID	ChapterID	TopicID	Question	OptionA	OptionB	OptionC	OptionD	CorrectOption	Explanation	Difficulty	QuestionType	Source	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDQ-DEMO-001	MDS-001	MDU-DEMO-001	MDC-DEMO-001	MDT-DEMO-001	Interface demo: select the option labelled B.	This is option A	This is option B	This is option C	This is option D	B	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
MDQ-DEMO-002	MDS-002	MDU-DEMO-002	MDC-DEMO-002	MDT-DEMO-002	Interface demo: select the option labelled B.	This is option A	This is option B	This is option C	This is option D	B	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
MDQ-DEMO-003	MDS-003	MDU-DEMO-003	MDC-DEMO-003	MDT-DEMO-003	Interface demo: select the option labelled B.	This is option A	This is option B	This is option C	This is option D	B	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
MDQ-DEMO-004	MDS-004	MDU-DEMO-004	MDC-DEMO-004	MDT-DEMO-004	Interface demo: select the option labelled B.	This is option A	This is option B	This is option C	This is option D	B	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
MDQ-DEMO-005	MDS-005	MDU-DEMO-005	MDC-DEMO-005	MDT-DEMO-005	Interface demo: select the option labelled B.	This is option A	This is option B	This is option C	This is option D	B	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
MDQ-DEMO-006	MDS-001	MDU-DEMO-001	MDC-DEMO-001	MDT-DEMO-001	Interface demo: select the option labelled D.	This is option A	This is option B	This is option C	This is option D	D	This is an interface test, not a subject knowledge question.	Easy	Practice	Original interface demo - not official exam content	Active
```

## MDCAT_Tests

Header — paste in A1 only if creating or repairing the header row:

```text
ID	Title	Slug	TestType	SubjectID	UnitID	ChapterID	TopicID	Description	TotalQuestions	DurationMinutes	PassingPercentage	RandomizeQuestions	RandomizeOptions	Status	Featured	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDTEST-DEMO-001	Demo full practice set - ungraded	demo-full-practice	Full Mock					Demo navigation content only - not official MDCAT syllabus or exam material.	6	5	50	Yes	Yes	Active	Yes
```

## MDCAT_Test_Questions

Header — paste in A1 only if creating or repairing the header row:

```text
ID	TestID	QuestionID	DisplayOrder	Marks	NegativeMarks	Status	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDTQ-DEMO-001	MDTEST-DEMO-001	MDQ-DEMO-001	1	1	0	Active
MDTQ-DEMO-002	MDTEST-DEMO-001	MDQ-DEMO-002	2	1	0	Active
MDTQ-DEMO-003	MDTEST-DEMO-001	MDQ-DEMO-003	3	1	0	Active
MDTQ-DEMO-004	MDTEST-DEMO-001	MDQ-DEMO-004	4	1	0	Active
MDTQ-DEMO-005	MDTEST-DEMO-001	MDQ-DEMO-005	5	1	0	Active
MDTQ-DEMO-006	MDTEST-DEMO-001	MDQ-DEMO-006	6	1	0	Active
```

## MDCAT_Daily_Practice

Header — paste in A1 only if creating or repairing the header row:

```text
ID	Date	Title	Description	SubjectID	UnitID	ChapterID	TopicID	QuestionCount	DurationMinutes	Difficulty	Status	Featured	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDDP-DEMO-001	2026-09-24	Demo Biology daily practice	Demo navigation content only - not official MDCAT syllabus or exam material.	MDS-001	MDU-DEMO-001	MDC-DEMO-001	MDT-DEMO-001	2	2	Easy	Active	Yes
```

## MDCAT_Updates

Header — paste in A1 only if creating or repairing the header row:

```text
ID	Title	Category	Summary	Content	PublishDate	ExpiryDate	OfficialURL	Priority	Status	Featured	CreatedAt	UpdatedAt
```

Demo data — paste into A2 for a new/demo-only tab; otherwise merge by ID:

```text
MDUP-DEMO-001	Demo portal notice	Demo	Testing the updates screen only.	This is not an official registration, syllabus or examination notice.	2026-09-24			Normal	Active	No
```

## MDCAT_Test_Attempts

Header — paste in A1 only if creating or repairing the header row:

```text
ID	UserID	TestID	StartedAt	SubmittedAt	TotalQuestions	AttemptedQuestions	CorrectAnswers	WrongAnswers	Unanswered	Score	Percentage	TimeTakenSeconds	Status	CreatedAt	UpdatedAt
```

**No demo rows. Leave this private sheet header-only.** It requires authenticated backend integration.

## MDCAT_Attempt_Answers

Header — paste in A1 only if creating or repairing the header row:

```text
ID	AttemptID	UserID	TestID	QuestionID	SelectedOption	CorrectOption	IsCorrect	MarksAwarded	TimeSpentSeconds	AnsweredAt	CreatedAt	UpdatedAt
```

**No demo rows. Leave this private sheet header-only.** It requires authenticated backend integration.

## MDCAT_Progress

Header — paste in A1 only if creating or repairing the header row:

```text
ID	UserID	SubjectID	UnitID	ChapterID	TopicID	QuestionsAttempted	CorrectAnswers	WrongAnswers	AccuracyPercentage	AverageTimeSeconds	LastPracticedAt	WeaknessScore	MasteryLevel	Status	CreatedAt	UpdatedAt
```

**No demo rows. Leave this private sheet header-only.** It requires authenticated backend integration.

## MDCAT_Revision

Header — paste in A1 only if creating or repairing the header row:

```text
ID	UserID	SubjectID	UnitID	ChapterID	TopicID	RevisionType	Priority	Reason	ScheduledDate	CompletedDate	Status	CreatedAt	UpdatedAt
```

**No demo rows. Leave this private sheet header-only.** It requires authenticated backend integration.

## MDCAT_Study_Plan

Header — paste in A1 only if creating or repairing the header row:

```text
ID	UserID	Title	Description	StartDate	EndDate	SubjectID	UnitID	ChapterID	TopicID	TargetType	TargetValue	Priority	Status	CompletedAt	CreatedAt	UpdatedAt
```

**No demo rows. Leave this private sheet header-only.** It requires authenticated backend integration.

## One-pass check after pasting

Refresh the portal with Ctrl + Shift + R. For each subject, open its demo unit, chapter, topic, then questions. In Biology there are two demo questions; each other subject has one. Start the six-question demo test and the two-question Biology daily set. Select answers, finish, and save activity. Save a question for revision, add/complete/remove a study task, and open the demo notice. Verify the timer starts only when Start practice is pressed. All outcomes must say ungraded.

If a card says content is awaiting setup, check the exact ID header and its nonempty cell. If a set fails, check linked IDs, Active statuses and counts (six mapped test questions, two Biology daily questions). A missing or inactive linked question is treated as a setup error, never silently replaced with another question.

After testing, set demo content rows to Inactive in the content tabs to remove them from public APIs. Keep the five real subjects Active.
