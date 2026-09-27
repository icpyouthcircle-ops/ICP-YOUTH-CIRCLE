from __future__ import annotations

import io

import pandas as pd
import streamlit as st
from portal_assistant import SHEET_SCHEMAS, build_rows, extract_text_from_image, suggest_sheet
from portal_assistant.schemas import SHEET_HELP

try:
    from streamlit_paste_button import paste_image_button
except ImportError:  # The uploader remains available if the optional component fails.
    paste_image_button = None


st.set_page_config(
    page_title="Portal Content Assistant | ICP YOUTH CIRCLE",
    page_icon="🧭",
    layout="wide",
    initial_sidebar_state="auto",
)

st.markdown(
    """
    <style>
      :root { --icp:#a71936; --ink:#101828; --muted:#667085; --line:#e4e7ec; }
      .stApp { background:linear-gradient(180deg,#f7f9fc 0%,#fff 42%); color:var(--ink); }
      .block-container { max-width:1440px; padding-top:2rem; padding-bottom:4rem; }
      .icp-hero { padding:2rem 2.2rem; border:1px solid #e8d6dc; border-radius:24px;
        background:linear-gradient(135deg,#111a2d 0%,#1d2941 68%,#8f1831 100%); color:#fff;
        box-shadow:0 22px 55px rgba(16,24,40,.14); margin-bottom:1.5rem; }
      .icp-hero small { letter-spacing:.18em; font-weight:800; color:#f3bac6; }
      .icp-hero h1 { margin:.55rem 0 .65rem; font-size:clamp(2rem,4vw,3.2rem); color:#fff; }
      .icp-hero p { max-width:850px; color:#dce3ef; font-size:1.05rem; }
      .step-card { padding:1rem 1.1rem; border:1px solid var(--line); border-radius:14px; background:#fff; height:100%; }
      .step-card strong { color:var(--icp); }
      div[data-testid="stDataEditor"] { border:1px solid var(--line); border-radius:14px; overflow:hidden; }
      .stButton>button[kind="primary"] { background:var(--icp); border-color:var(--icp); }
      .privacy-note { padding:.8rem 1rem; border-left:4px solid var(--icp); background:#fff4f6; border-radius:8px; }
    </style>
    <div class="icp-hero">
      <small>ICP YOUTH CIRCLE • PRIVATE ADMIN TOOL</small>
      <h1>Portal Content Assistant</h1>
      <p>Paste text or a poster, extract its details, review every field, and generate rows that can be pasted directly into your portal sheets.</p>
    </div>
    """,
    unsafe_allow_html=True,
)

for key, default in {
    "image_bytes": None,
    "review_text": "",
    "rows": [],
    "warnings": [],
    "detected": {},
    "prepared_sheet": "",
    "rows_revision": 0,
    "upload_revision": 0,
}.items():
    st.session_state.setdefault(key, default)


with st.sidebar:
    st.header("Output settings")
    selected_sheet = st.selectbox("Portal sheet", list(SHEET_SCHEMAS), index=0)
    st.caption(SHEET_HELP[selected_sheet])
    timed_sheets = {"Scholarships", "Announcements", "Countdowns", "Notifications", "Resources"}
    status_options = ["Draft", "Scheduled", "Active", "Archived"] if selected_sheet in timed_sheets else ["Draft", "Active", "Archived"]
    status = st.selectbox("Initial status", status_options, index=0)
    include_headers = st.checkbox("Include header row", value=True)
    st.divider()
    st.markdown("**Safe publishing rule**")
    st.caption("Keep the generated record as Draft until you compare every field with the original official source.")


steps = st.columns(3)
steps[0].markdown('<div class="step-card"><strong>1 · Add source</strong><br>Paste text, paste an image, or upload a poster.</div>', unsafe_allow_html=True)
steps[1].markdown('<div class="step-card"><strong>2 · Review extraction</strong><br>Correct OCR text and choose the destination sheet.</div>', unsafe_allow_html=True)
steps[2].markdown('<div class="step-card"><strong>3 · Copy rows</strong><br>Edit the table and paste the TSV output into Google Sheets.</div>', unsafe_allow_html=True)

st.subheader("1. Add the source")
left, right = st.columns([1, 1], gap="large")
with left:
    uploaded = st.file_uploader("Upload or drag a poster", type=["png", "jpg", "jpeg", "webp"], help="For best OCR results, use a clear, straight image under 10 MB.", key=f"poster_upload_{st.session_state.upload_revision}")
    if uploaded is not None:
        st.session_state.image_bytes = uploaded.getvalue()
    if paste_image_button is not None:
        pasted = paste_image_button(
            label="📋 Paste image from clipboard",
            text_color="#ffffff",
            background_color="#a71936",
            hover_background_color="#7f1229",
        )
        if pasted.image_data is not None:
            buffer = io.BytesIO()
            pasted.image_data.convert("RGB").save(buffer, format="PNG")
            st.session_state.image_bytes = buffer.getvalue()
    else:
        st.caption("Clipboard image support is unavailable; use the uploader above.")
    if st.session_state.image_bytes:
        st.image(st.session_state.image_bytes, caption="Source poster", width="stretch")
        clear_col, ocr_col = st.columns(2)
        if clear_col.button("Remove image", width="stretch"):
            st.session_state.image_bytes = None
            st.session_state.upload_revision += 1
            st.rerun()
        if ocr_col.button("Read poster text", type="primary", width="stretch"):
            with st.spinner("Reading the poster locally…"):
                try:
                    text, confidence = extract_text_from_image(st.session_state.image_bytes)
                    st.session_state.review_text = text
                    if confidence is not None:
                        st.toast(f"OCR finished · average confidence {confidence:.0%}")
                    st.rerun()
                except Exception as exc:
                    st.error(str(exc))

with right:
    manual_text = st.text_area(
        "Paste the announcement or details",
        height=220,
        placeholder="Paste the complete official post, caption, message or admission details here…",
    )
    source_url = st.text_input("Official source or application URL", placeholder="https://official-website.example/apply")
    extra_details = st.text_area(
        "Your additional notes",
        height=100,
        placeholder="Add anything that was not clear in the poster. Do not add unverified claims.",
    )

st.subheader("2. Review the extracted text")
review_text = st.text_area(
    "Correct any OCR spelling or date mistakes before preparing rows",
    key="review_text",
    height=260,
    placeholder="Poster text will appear here after OCR. You may also paste or type text directly here.",
)

source_text = "\n".join(part for part in [review_text.strip(), manual_text.strip()] if part)
suggested = suggest_sheet(source_text) if source_text else selected_sheet
if source_text and suggested != selected_sheet:
    st.info(f"Suggested destination: **{suggested}**. You selected **{selected_sheet}**; your selection will be respected.")

prepare_col, reset_col = st.columns([1, 4])
if prepare_col.button("Prepare sheet rows", type="primary", width="stretch"):
    result = build_rows(selected_sheet, source_text, source_url, extra_details, status)
    st.session_state.rows = result.rows
    st.session_state.warnings = result.warnings
    st.session_state.detected = result.detected
    st.session_state.prepared_sheet = selected_sheet
    st.session_state.rows_revision += 1

def reset_assistant():
    for key in ["image_bytes", "review_text", "rows", "warnings", "detected", "prepared_sheet"]:
        st.session_state[key] = None if key == "image_bytes" else [] if key in {"rows", "warnings"} else {} if key == "detected" else ""
    st.session_state.rows_revision += 1
    st.session_state.upload_revision += 1

reset_col.button("Start over", on_click=reset_assistant)

if st.session_state.rows:
    st.subheader("3. Check and edit every field")
    st.markdown('<div class="privacy-note"><strong>Nothing is written to Google Sheets automatically.</strong> You remain in control and must approve the final rows.</div>', unsafe_allow_html=True)
    for warning in st.session_state.warnings:
        st.warning(warning, icon="⚠️")
    frame = pd.DataFrame(st.session_state.rows, columns=SHEET_SCHEMAS[st.session_state.prepared_sheet])
    edited = st.data_editor(frame, width="stretch", hide_index=True, num_rows="dynamic", key=f"portal_rows_editor_{st.session_state.rows_revision}")
    output = edited.fillna("").astype(str).to_csv(sep="\t", index=False, header=include_headers, lineterminator="\n")
    st.markdown("#### Copy-ready Google Sheets data")
    st.caption("Use the copy icon in the top-right of this box. If headers are included, paste into A1; otherwise paste into A2.")
    st.code(output, language=None)
    filename = f"{st.session_state.prepared_sheet.lower()}-portal-import.tsv"
    st.download_button("Download TSV file", output.encode("utf-8"), file_name=filename, mime="text/tab-separated-values", width="stretch")
    with st.expander("Detected information"):
        st.json(st.session_state.detected)
else:
    st.info("Add a source and select **Prepare sheet rows**. Your editable table will appear here.")

st.divider()
st.caption("ICP YOUTH CIRCLE Portal Content Assistant · OCR runs on the app server. Always verify dates, eligibility, official URLs and accreditation claims before publishing.")
