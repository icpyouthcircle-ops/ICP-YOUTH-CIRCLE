# MDCAT browser checks

The portal remains a static site. These are development-only test dependencies; no build step or runtime package is required for GitHub Pages.

Install with `npm install`, then `npx playwright install chromium`, then run `npm test`.
To use an installed Edge browser instead, set `MDCAT_BROWSER_CHANNEL=msedge` before running tests.

The tests mock the public Apps Script routes from the demo pack. They do not write to Google Sheets or contact private student routes. The fixture deliberately omits the answer key. Screenshots are generated under ignored `test-results/`.

- `mdcat-navigation.cjs`: existing Entry Tests, NUMS, MDCAT information and Notes navigation; directory order, failure/retry, empty states, text escaping and stale-request cancellation.
- `mdcat-complete.cjs`: all five subject-to-question paths; nine public API actions; question choices and ungraded summaries; local persistence and failure handling; explicit test mappings; daily filtering; timers; safe update links and dates; mobile layout.

Live API empty-state checks are separate from fixtures. Populated live practice/test verification requires importing the rows in `docs/mdcat-demo-pack.md` into the matching tabs first. Correct `MDCAT_Chapters!A1` to exactly `ID`; a missing ID is never invented in the frontend.
