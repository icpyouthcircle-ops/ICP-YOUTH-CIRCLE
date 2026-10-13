# ICP AI Assistant setup

The website keeps the OpenAI credential inside Google Apps Script. Never place the key in `index.html`, JavaScript, GitHub, or a public Google Sheet.

## One-time setup

1. Open the Google Apps Script project connected to the ICP YOUTH CIRCLE spreadsheet.
2. Replace `Code.gs` with the repository version in `backend/Code.gs`.
3. Run `setupAIAssistant()` once and approve the requested spreadsheet permission.
4. Open **Project Settings → Script Properties** and add:

   - `OPENAI_API_KEY`: the private OpenAI project API key
   - `ICP_AI_ENABLED`: `true`
   - `ICP_AI_MODEL`: `gpt-5.4-mini`

5. Open **Deploy → Manage deployments**, edit the existing web app, choose **New version**, and deploy it with the same public URL.
6. Confirm the web app still executes as its owner and access remains available to the website audience.

## Verification

Open this URL in a private browser window:

`https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec?action=aiAssistantConfig`

The JSON response should report `"success":true` and `"enabled":true`. Then open **AI & Smart Tools → AI Assistant**, sign in with Google, and send a short test question.

## Operational defaults

- 30 student messages per rolling 24 hours
- verified ICP sources enabled by default
- private conversation history scoped to the signed-in Firebase user
- moderation before generation
- structured responses with validated source IDs
- administrator-visible feedback, without exposing private conversations in the admin dashboard

To pause AI requests without changing the website, set `ICP_AI_ENABLED` to `false`.
