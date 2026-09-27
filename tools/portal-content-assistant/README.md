# ICP YOUTH CIRCLE Portal Content Assistant

A separate, private Streamlit app that turns posters and copied information into reviewable rows for the ICP YOUTH CIRCLE portal sheets.

## What it does

- Accepts pasted text, uploaded images, drag-and-drop images, and clipboard images.
- Reads English poster text locally with OCR.
- Suggests the appropriate portal sheet.
- Creates one Admissions row per detected program.
- Supports Admissions, Scholarships, Announcements, Countdowns, Notifications, Resources, and Opportunities.
- Produces an editable table and tab-separated output for direct Google Sheets pasting.
- Generates unique IDs and Pakistan timestamps.
- Defaults every generated record to `Draft`.
- Never writes to Google Sheets automatically.

The extractor deliberately leaves uncertain fields blank. OCR cannot verify eligibility, fees, accreditation, legal claims, deadlines, or URLs.

## Start it on Windows

1. Double-click `run_windows.bat`.
2. Wait while the private environment and packages are installed the first time.
3. The app opens in the browser at `http://localhost:8501`.

Manual commands:

```powershell
cd tools\portal-content-assistant
py -m venv "$env:USERPROFILE\.icp-portal-assistant-venv"
& "$env:USERPROFILE\.icp-portal-assistant-venv\Scripts\Activate.ps1"
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

## Recommended workflow

1. Select the intended portal sheet.
2. Paste or upload the official poster.
3. Add the official application or source URL.
4. Select **Read poster text**.
5. Correct OCR mistakes in the extracted text.
6. Select **Prepare sheet rows**.
7. Review every cell in the editable table.
8. Keep `Status` as `Draft` until verification is complete.
9. Copy the TSV block into Google Sheets:
   - Paste into `A1` when the header row is included.
   - Paste into `A2` when your sheet already has headers.
10. Change the record to `Active` or `Scheduled` only after checking the official source.

## Streamlit Community Cloud deployment

1. Push this folder to the GitHub repository.
2. In Streamlit Community Cloud, create an app from the repository.
3. Set the main file path to:

   `tools/portal-content-assistant/app.py`

4. Deploy the app.
5. Keep the deployed URL private because this is an administrator preparation tool.

No API key or Google account credential is required. OCR runs on the machine or Streamlit server that hosts the app.

## Test the extraction rules

From this folder, run:

```powershell
python -m unittest discover -s tests -v
```
