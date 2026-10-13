# Student Q&A setup

The public Q&A interface and Apps Script backend must be released together. Do not merge the website change until the backend steps below are complete.

## 1. Update Apps Script

1. Back up the current Apps Script `Code.gs`.
2. Replace it with the complete repository `backend/Code.gs` file.
3. Save the Apps Script project.
4. Select `setupQASystem_` in the function menu and click **Run** once.
5. Approve the requested spreadsheet permission if Google asks.

The setup function preserves existing sheets and creates these tabs when missing:

- `QNA_Questions`
- `QNA_Answers`
- `QNA_Votes`
- `QNA_Reports`
- `QNA_Contributors`

## 2. Deploy the web app

1. Open **Deploy > Manage deployments**.
2. Edit the existing web-app deployment.
3. Choose **New version**.
4. Keep **Execute as: Me** and the existing public access setting.
5. Deploy without changing the current `/exec` URL.

Test `?action=qaQuestions` on the existing web-app URL. A successful empty installation returns `{"success":true,"data":[]}`.

## 3. Add verified contributors

Add teachers or trusted contributors to `QNA_Contributors` using the admin dashboard or the sheet. Use these fields:

| Field | Example |
| --- | --- |
| ID | QAC-001 |
| Email | teacher@example.com |
| DisplayName | Ms Ayesha |
| Role | Teacher |
| Status | Active |

Email matching is case-insensitive. Verified contributors receive a public badge and their answers can publish immediately. Ordinary student answers use `Pending Review` until an administrator changes their status to `Active`.

## 4. Moderate content

The existing admin dashboard includes Q&A questions, answers, reports, and verified contributors after setup. Administrators can:

- archive inappropriate questions;
- review and activate student answers;
- mark an answer as accepted by setting `IsAccepted` to `Yes`;
- review reports without exposing them publicly;
- add or remove verified contributors.

Votes remain private infrastructure and are intentionally excluded from the dashboard.
