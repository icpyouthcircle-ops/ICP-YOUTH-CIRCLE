# Portal enhancements setup

This release adds an installable portal, sharing, exam countdown, a first-visit tour, Friday reminders, closing-soon filters, request tracking, anonymous feedback, searchable FAQs, background refresh and an on-demand performance dashboard.

## One-time backend setup

1. Replace the Apps Script `Code.gs` with the repository version.
2. Save and deploy a **New version** of the web app.
3. In the Apps Script editor, select `setupPortalEnhancements_` and click **Run** once.
4. Approve access if Google requests it.

The setup function preserves existing sheets and creates:

- `FAQs`: `ID Question Answer Category DisplayOrder Status CreatedAt UpdatedAt`
- `Feedback`: `ID Category Message PageURL Status SubmittedAt CreatedAt UpdatedAt`

Both sections appear automatically in the private admin dashboard after setup.

## Publish an FAQ

Create a row in `FAQs` or use the admin dashboard. Use a unique ID such as `FAQ-001`, enter the question and answer, and set `Status` to `Active`. The public FAQ page searches Question, Answer and Category.

## Publish a Friday reminder

Use the existing `Announcements` section:

- `Category`: `Friday Reminder`
- `Title`: the short reminder heading
- `Summary` or `Content`: the reminder text
- `PublishDate`: optional first date
- `ExpiryDate`: optional final date
- `OfficialURL`: optional reliable source
- `ButtonText`: optional link label
- `Status`: `Active`

The banner appears publicly only on Friday in the `Asia/Karachi` timezone and only inside the optional publish/expiry window. Keep religious reminders accurately sourced in the announcement text or official link.

## Anonymous feedback

The Community → Suggestions page asks for a category and feedback only. It does not request a name or email. Administrators review submissions in the `Feedback` dashboard section.

## Help-request tracking

Students submit a help-desk request with their email, sign in with the same Google email, and open **My account → My requests**. Administrators update `Status` and `Response` in `Help_Desk`.

## Performance dashboard

Open the admin dashboard and select **Performance check**. Checks run only when requested and show timings from the administrator's current device. The public portal does not send visitor performance tracking data.
