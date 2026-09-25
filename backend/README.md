# MDCAT account scoring setup

This update adds Google sign-in, server-calculated scores, saved attempts, answer review, and topic progress. Existing public portal and guest MDCAT routes continue to work.

## Files

- `Code.gs` is the complete Apps Script backend. Replace the entire current `Code.gs` with this file rather than pasting only the new section.
- The GitHub frontend is already wired to the new `mdcatAccountConfig` GET route and authenticated POST actions.

## Universal tests and notifications setup

After replacing `Code.gs`, temporarily add this wrapper at the bottom:

```javascript
function runUniversalPortalSetup() {
  return setupUniversalTestsAndNotifications_();
}
```

Save, select `runUniversalPortalSetup`, and run it once. It safely creates and validates:

- `Test_Catalog` — tests shown under **My tests**
- `Notifications` — updates shown to signed-in users

It also adds MDCAT to the test catalog without changing MDCAT questions, attempts, or results. Delete the temporary wrapper and save before deploying the web app.

Notification rows use these exact columns:

`ID | Title | Message | Audience | TestID | LinkURL | PublishAt | ExpiresAt | DisplayOrder | Status | CreatedAt | UpdatedAt`

Use `Registered Users` for `Audience` and `Active` for `Status`. `LinkURL`, `PublishAt`, `ExpiresAt`, and `TestID` may be left empty.

## 1. Back up the current Apps Script

Open the Apps Script project, copy the current `Code.gs` into a local backup, and keep the spreadsheet unchanged.

## 2. Create Firebase web sign-in

1. Open the Firebase console and create or select a project.
2. Open **Authentication**, select **Get started**, then enable the **Google** sign-in provider and choose the support email.
3. Open **Project settings > General > Your apps**, register a Web app, and copy these four values from the web configuration:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
4. Open **Authentication > Settings > Authorized domains** and add:

   `icpyouthcircle-ops.github.io`

The web configuration is a public client identifier. Do not create, paste, or upload a service-account private key for this feature.

## 3. Add Apps Script properties

In **Apps Script > Project Settings > Script properties**, add:

| Property | Initial value |
| --- | --- |
| `MDCAT_FIREBASE_CONFIG` | `{"apiKey":"YOUR_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT_ID","appId":"YOUR_APP_ID"}` |
| `MDCAT_SCORING_ENABLED` | `false` |

Use one valid JSON line for `MDCAT_FIREBASE_CONFIG`, replacing all four sample values.

## 4. Install and validate the backend

1. Replace the entire Apps Script `Code.gs` with the supplied `backend/Code.gs`.
2. Save the project.
3. Temporarily add this wrapper at the bottom of `Code.gs`:

   ```javascript
   function runMDCATScoringSetup() {
     return setupMDCATScoring_();
   }
   ```

4. Save, select `runMDCATScoringSetup` in the function menu, and run it once.
5. Approve the Apps Script permissions requested by Google and confirm that the execution completes successfully.
6. Delete the temporary `runMDCATScoringSetup` wrapper and save again before deploying.

The setup preserves existing rows and validates the existing attempt, answer, and progress sheets. It creates these two internal sheets if they do not exist:

- `MDCAT_Sessions`
- `MDCAT_Session_Questions`

Do not publish or manually edit these internal sheets.

## 5. Deploy and enable

1. In Apps Script, select **Deploy > Manage deployments**.
2. Edit the existing web app deployment and select **New version**.
3. Keep **Execute as: Me** and the same public access setting used by the working portal.
4. Deploy the new version. The `/exec` URL must remain the existing portal API URL.
5. Return to Script properties and change `MDCAT_SCORING_ENABLED` to `true`.

Script-property changes do not require another deployment.

## 6. Verify before entering real results

Open this URL:

`https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec?action=mdcatAccountConfig`

It should return JSON with `"success":true`, `"enabled":true`, and the four Firebase web fields. It must not show the portal HTML page.

Then open the portal, choose **Sign in** from the main navigation, and test:

1. Continue with Google.
2. Open a test, daily set, or topic and choose **Scored practice with account**.
3. Submit an answer.
4. Open **My tests**, then confirm the result appears in **My test results** and the counts appear in **My test progress**.
5. Confirm guest question-bank practice still works without signing in.

## Operational limits

- A student can start at most 20 scored attempts per day.
- An attempt can contain at most 200 questions.
- Answers submitted after the deadline plus the 30-second network allowance are rejected.
- Sign-in survives page refreshes during the browser session; submitted results remain saved after sign-out.
- Never expose spreadsheet editing access to students.

## Performance behavior

- The homepage renders from a safe static snapshot and refreshes from Sheets in the background.
- Public Apps Script responses are cached for up to 5 minutes.
- Public MDCAT lists are cached in the student's browser for up to 15 minutes.
- Authentication, scored attempts, answers, results, and progress are never stored in the public cache.
