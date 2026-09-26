# ICP YOUTH CIRCLE Admin Dashboard

The admin dashboard is a private editing surface for the public portal. The page is visible at:

`https://icpyouthcircle-ops.github.io/ICP-YOUTH-CIRCLE/admin.html`

Seeing the page does not grant access. Every dashboard request is checked on the Apps Script server against the signed-in Google account and the `Admins` sheet.

## One-time setup

In the same Google Sheet used by the portal, open the `Admins` tab. Keep or create this header row exactly:

```text
ID	Email	Role	Status	CreatedAt	UpdatedAt
```

Paste this example row into Row 2, replacing the example email with the Google account that should administer the portal:

```text
ADMIN-001	YOUR-GOOGLE-EMAIL@gmail.com	Super Admin	Active	2026-09-25	2026-09-25
```

The email must be the same Google account used by the **Continue with Google** button. Only rows with `Status` equal to `Active` can sign in. Never put a password, Firebase private key, or service-account key in this sheet.

After adding the row, deploy the updated Apps Script `Code.gs` as a new web-app version while keeping the existing `/exec` URL, `Execute as: Me`, and the current public access setting.

## Editing records

Choose a portal section from the dashboard. Use **New record** for one row, or **Paste multiple rows** for a Google Sheets block. The dashboard displays the exact headers required for the selected sheet. Copy those headers into Row 1 of your pasted block without changing their spelling or order.

New records default to `Inactive` when the selected sheet has a `Status` column. Review the row and set it to `Active` only after checking the source, link, wording, dates and permissions. The dashboard archives records by changing `Status` to `Inactive`; it does not delete them.

The dashboard deliberately excludes `Admins`, `Notification_Reads`, `Notification_Preferences`, `MDCAT_Sessions`, `MDCAT_Session_Questions`, `MDCAT_Test_Attempts`, `MDCAT_Attempt_Answers`, and `MDCAT_Progress` from the editable list. Student notification state, preferences, attempts, and answer keys remain protected by authenticated routes.

## Publishing notifications

Use the **Notifications** dashboard section to publish an update. The advanced fields support:

- `Category`: `General`, `Test`, `Deadline`, or `Study Plan`
- `Priority`: use `Important` when the notice needs extra emphasis
- `IsPinned`: use `Yes` to place the notice first
- `TestID`: connect the notice to a test in `Test_Catalog`
- `ReminderType`: `Deadline` or `Study Plan`
- `ReminderAt`: the date shown as the reminder date

Keep `Audience` as `Registered Users` and `Status` as `Active`. `PublishAt` controls when a notice starts showing, while `ExpiresAt` removes it after the deadline. The portal stores each student's read status and preferences in the protected sheets automatically.
