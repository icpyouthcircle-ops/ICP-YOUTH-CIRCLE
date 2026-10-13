# ICP AI Assistant setup

The website keeps OpenAI and Gemini credentials inside Google Apps Script. Never place either key in `index.html`, JavaScript, GitHub, or a public Google Sheet.

## One-time setup

1. Open the Google Apps Script project connected to the ICP YOUTH CIRCLE spreadsheet.
2. Replace `Code.gs` with the repository version in `backend/Code.gs`.
3. Run `setupAIAssistant()` once and approve the requested spreadsheet permission.
4. Open **Project Settings → Script Properties** and add:

   - `OPENAI_API_KEY`: the private OpenAI project API key
   - `ICP_AI_ENABLED`: `true`
   - `ICP_AI_MODEL`: `gpt-5.4-mini`
   - `GEMINI_API_KEY`: the private Google AI Studio API key
   - `ICP_GEMINI_ENABLED`: `true`
   - `ICP_GEMINI_MODEL`: `gemini-3.8-flash`

5. Open **Deploy → Manage deployments**, edit the existing web app, choose **New version**, and deploy it with the same public URL.
6. Confirm the web app still executes as its owner and access remains available to the website audience.

## Verification

Open this URL in a private browser window:

`https://script.google.com/macros/s/AKfycbwfIALyzy8rVPAyIyTj-RkFdjX5f92uaVpESOGHrBIsnsFQLH14uoYeAdggXKNEhQUo/exec?action=aiAssistantConfig`

The JSON response should report `"success":true`, `"enabled":true`, and both names in `"availableProviders"`. Then open **AI & Smart Tools → AI Assistant**, sign in with Google, and test **Auto**, **OpenAI**, and **Gemini**.

## Operational defaults

- 30 student messages per rolling 24 hours
- verified ICP sources enabled by default
- private conversation history scoped to the signed-in Firebase user
- OpenAI moderation and provider safety controls
- automatic fallback from OpenAI to Gemini for temporary service, rate-limit, or configuration failures
- structured responses with validated source IDs
- administrator-visible feedback, without exposing private conversations in the admin dashboard

To pause one provider without changing the website, set its `ICP_AI_ENABLED` or `ICP_GEMINI_ENABLED` property to `false`.
