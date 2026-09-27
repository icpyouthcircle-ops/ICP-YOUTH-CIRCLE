"""Local OCR and conservative, review-first portal field extraction."""

from __future__ import annotations

import io
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from .schemas import SHEET_PREFIXES, SHEET_SCHEMAS


MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}
PROGRAM_PATTERN = re.compile(
    r"^(?:BS\b|BBA\b|MBA\b|MS\b|M\.?Phil\b|Ph\.?D\b|DPT\b|Pharm\.?-?D\b|"
    r"LLB\b|LLM\b|B\.?Ed\b|ADP\b|FSc\b|FA\b|ICS\b|DAE\b)(?:\s*[-:]?\s*.*)?$",
    re.IGNORECASE,
)
URL_PATTERN = re.compile(r"(?:https?://|www\.)[^\s<>]+", re.IGNORECASE)
DATE_PATTERN = re.compile(
    r"\b(\d{1,2})(?:st|nd|rd|th)?[\s./-]+"
    r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|"
    r"aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2})"
    r"[\s,./-]+(20\d{2})\b",
    re.IGNORECASE,
)


@dataclass
class ExtractionResult:
    rows: list[dict[str, Any]]
    warnings: list[str]
    detected: dict[str, Any]


def extract_text_from_image(image: Any) -> tuple[str, float | None]:
    """Run local OCR. Images stay on the machine running the Streamlit app."""
    try:
        import numpy as np
        from PIL import Image, ImageEnhance, ImageOps
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as exc:  # pragma: no cover - exercised in deployed app
        raise RuntimeError("OCR packages are not installed. Run: pip install -r requirements.txt") from exc

    if isinstance(image, (bytes, bytearray)):
        image = Image.open(io.BytesIO(image))
    elif not isinstance(image, Image.Image):
        image = Image.open(image)
    prepared = ImageOps.exif_transpose(image).convert("RGB")
    if max(prepared.size) > 2400:
        prepared.thumbnail((2400, 2400))
    prepared = ImageEnhance.Contrast(prepared).enhance(1.25)
    result, _ = RapidOCR()(np.asarray(prepared))
    if not result:
        return "", None
    lines = [str(item[1]).strip() for item in result if len(item) > 2 and str(item[1]).strip()]
    scores = [float(item[2]) for item in result if len(item) > 2]
    return "\n".join(lines), (sum(scores) / len(scores) if scores else None)


def _lines(text: str) -> list[str]:
    return [re.sub(r"\s+", " ", line).strip(" \t|•") for line in text.splitlines() if line.strip()]


def _clean(value: Any, limit: int = 1000) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def _safe_url(value: str) -> str:
    value = _clean(value, 2000).rstrip(".,);]")
    if value.startswith("www."):
        value = "https://" + value
    try:
        parsed = urlparse(value)
        return value if parsed.scheme in {"http", "https"} and parsed.netloc else ""
    except ValueError:
        return ""


def _all_urls(text: str) -> list[str]:
    values = []
    for match in URL_PATTERN.findall(text):
        url = _safe_url(match)
        if url and url not in values:
            values.append(url)
    return values


def _iso_date(match: re.Match[str]) -> str:
    day = int(match.group(1))
    raw_month = match.group(2).lower()
    month = int(raw_month) if raw_month.isdigit() else MONTHS.get(raw_month[:3], 0)
    year = int(match.group(3))
    try:
        return datetime(year, month, day).date().isoformat()
    except ValueError:
        return ""


def _dates(text: str) -> list[tuple[str, str]]:
    text = re.sub(r"\b0ct(?=ober\b)", "Oct", text, flags=re.IGNORECASE)
    found = []
    for match in DATE_PATTERN.finditer(text):
        value = _iso_date(match)
        if value:
            found.append((value, text[max(0, match.start() - 55):match.end() + 20].lower()))
    numeric = re.finditer(r"\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b", text)
    for match in numeric:
        try:
            value = datetime(int(match.group(3)), int(match.group(2)), int(match.group(1))).date().isoformat()
            found.append((value, text[max(0, match.start() - 55):match.end() + 20].lower()))
        except ValueError:
            pass
    return found


def _date_for(text: str, keywords: tuple[str, ...]) -> str:
    dated = _dates(text)
    for value, context in dated:
        if any(keyword in context for keyword in keywords):
            return value
    return dated[0][0] if len(dated) == 1 else ""


def _institution(lines: list[str], text: str) -> str:
    lowered = text.lower()
    compact = re.sub(r"[^a-z0-9]", "", lowered)
    if "cityuniversity" in compact and ("scienceandinformationtechnology" in compact or "cusit" in compact):
        return "City University of Science and Information Technology, Peshawar"
    candidates = [line for line in lines if re.search(r"\b(university|college|institute|academy|school)\b", line, re.I)]
    return max(candidates, key=len)[:240] if candidates else ""


def _programs(lines: list[str]) -> list[str]:
    programs = []
    for line in lines:
        candidate = re.sub(r"\s*\((?:with|accredited|for)\b.*$", "", line, flags=re.I).strip(" -–—:|")
        candidate = re.sub(r"^(BS|MS)(?=[A-Z])", r"\1 ", candidate)
        if not PROGRAM_PATTERN.match(candidate):
            continue
        program = _clean(candidate, 240)
        if len(program) < 3 or program.lower() in {value.lower() for value in programs}:
            continue
        programs.append(program)
    return programs[:30]


def _degree_level(program: str) -> str:
    value = program.lower()
    if re.match(r"^(fsc|fa\b|ics\b|dae\b)", value):
        return "Intermediate"
    if re.match(r"^(bs|bba|b\.ed|bed|adp|dpt|pharm|llb)", value):
        return "Undergraduate"
    if re.match(r"^(mba|ms\b|m\.phil|mphil|llm)", value):
        return "Postgraduate"
    if re.match(r"^ph\.?d", value):
        return "Doctoral"
    return ""


def _session(text: str) -> str:
    season = re.search(r"\b(fall|spring|summer|winter)\s*['’]?(20)?(\d{2})\b", text, re.I)
    result = ""
    if season:
        result = f"{season.group(1).title()} 20{season.group(3)}"
    phase = re.search(r"\b(1st|first|2nd|second|3rd|third)\s+phase\b", text, re.I)
    if phase:
        number = {"first": "First", "1st": "First", "second": "Second", "2nd": "Second", "third": "Third", "3rd": "Third"}[phase.group(1).lower()]
        result = (result + " - " if result else "") + number + " Phase"
    if re.search(r"\bweekend\b", text, re.I):
        result = (result + " - " if result else "") + "Weekend"
    return result


def _first_title(lines: list[str], fallback: str) -> str:
    ignored = re.compile(r"^(apply now|admissions? open|last date|deadline|official|www\.|https?://)$", re.I)
    for line in lines:
        if len(line) >= 5 and not ignored.match(line) and not re.fullmatch(r"[\d\W]+", line):
            return line[:240]
    return fallback


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:180]


def _labeled_values(text: str, headers: list[str]) -> dict[str, str]:
    """Read explicit lines such as `SubjectID: MDS-001` without guessing."""
    values: dict[str, str] = {}
    for header in headers:
        label = re.sub(r"(?<!^)(?=[A-Z])", r"[ _-]*", re.escape(header))
        match = re.search(rf"(?im)^\s*{label}\s*[:=]\s*(.+?)\s*$", text)
        if match:
            values[header] = _clean(match.group(1), 4000)
    return values


def _timestamp() -> tuple[str, str]:
    now = datetime.now(ZoneInfo("Asia/Karachi"))
    unique = now.strftime("%Y%m%d-%H%M%S") + f"-{now.microsecond // 1000:03d}"
    return unique, now.isoformat(timespec="seconds")


def suggest_sheet(text: str) -> str:
    """Suggest a destination while keeping the administrator in control."""
    value = text.lower()
    scores = {
        "Scholarships": sum(term in value for term in ("scholarship", "financial aid", "tuition waiver", "funded")),
        "Admissions": sum(term in value for term in ("admission", "apply now", "registration", "merit list")),
        "Opportunities": sum(term in value for term in ("internship", "competition", "workshop", "fellowship", "volunteer")),
        "Countdowns": sum(term in value for term in ("countdown", "result date", "will be announced")),
        "Resources": sum(term in value for term in ("notes", "past paper", "pdf", "study resource")),
        "Announcements": sum(term in value for term in ("result announced", "notice", "announcement", "update")),
        "Notifications": sum(term in value for term in ("reminder", "notification", "alert")),
        "FAQs": sum(term in value for term in ("frequently asked", "faq", "question:", "answer:")),
        "Videos": sum(term in value for term in ("youtube", "video tutorial", "watch video")),
        "AI_Tools": sum(term in value for term in ("ai tool", "artificial intelligence tool")),
        "Islamic_Content": sum(term in value for term in ("qur'an", "quran", "hadith", "dua")),
        "MCQs": sum(term in value for term in ("option a", "option b", "correct option", "mcq")),
        "Entry_Tests": sum(term in value for term in ("entry test", "registration deadline", "test date")),
    }
    best = max(scores, key=scores.get)
    return best if scores[best] else "Announcements"


def _base_row(sheet: str, index: int, status: str) -> dict[str, Any]:
    stamp, created = _timestamp()
    row = {header: "" for header in SHEET_SCHEMAS[sheet]}
    row["ID"] = f"{SHEET_PREFIXES[sheet]}-{stamp}-{index:02d}"
    if "Status" in row:
        row["Status"] = status
    if "CreatedAt" in row:
        row["CreatedAt"] = created
    if "UpdatedAt" in row:
        row["UpdatedAt"] = created
    if "Featured" in row:
        row["Featured"] = "No"
    if "DisplayOrder" in row:
        row["DisplayOrder"] = index
    return row


def build_rows(
    sheet: str,
    text: str,
    source_url: str = "",
    extra_details: str = "",
    status: str = "Draft",
) -> ExtractionResult:
    """Build reviewable sheet rows without inventing missing facts."""
    if sheet not in SHEET_SCHEMAS:
        raise ValueError(f"Unsupported sheet: {sheet}")
    combined = "\n".join(part for part in [text.strip(), extra_details.strip()] if part)
    lines = _lines(combined)
    urls = _all_urls(combined)
    official_url = _safe_url(source_url) or (urls[0] if urls else "")
    institution = _institution(lines, combined)
    deadline = _date_for(combined, ("last date", "deadline", "closing", "apply by", "registration"))
    opening = _date_for(combined, ("opening", "opens", "applications start"))
    session = _session(combined)
    programs = _programs(lines)
    warnings: list[str] = []
    rows: list[dict[str, Any]] = []

    if sheet == "Admissions":
        if not programs:
            programs = [""]
            warnings.append("No program name was confidently detected. Enter the Program manually.")
        for index, program in enumerate(programs, 1):
            row = _base_row(sheet, index, status)
            row.update({
                "Institution": institution,
                "Program": program,
                "DegreeLevel": _degree_level(program),
                "AdmissionType": session,
                "OpeningDate": opening,
                "Deadline": deadline,
                "OfficialURL": official_url,
                "Description": _clean(
                    f"{session + ' admissions are open' if session else 'Admissions are open'}"
                    f" for {program or 'this program'}"
                    f" at {institution or 'the listed institution'}. Confirm eligibility, fees and application requirements through the official source before applying.",
                    1200,
                ),
            })
            rows.append(row)
    elif sheet == "Scholarships":
        row = _base_row(sheet, 1, status)
        row.update({
            "Name": _first_title(lines, "Scholarship opportunity"),
            "Provider": institution,
            "Type": "Scholarship",
            "Country": "Pakistan" if re.search(r"\bpakistan\b", combined, re.I) else "",
            "Deadline": deadline,
            "OpeningDate": opening,
            "OfficialURL": official_url,
            "Description": _clean(extra_details or combined, 1500),
        })
        rows.append(row)
    elif sheet == "Announcements":
        row = _base_row(sheet, 1, status)
        title = _first_title(lines, "Portal announcement")
        category = "Results" if re.search(r"\bresult", combined, re.I) else "Admissions" if re.search(r"\badmission", combined, re.I) else "Announcement"
        row.update({"Title": title, "Category": category, "Summary": _clean(combined, 450), "Content": _clean(combined, 4000), "OfficialURL": official_url, "ButtonText": "View details", "Priority": "Normal", "PublishAt": row["CreatedAt"]})
        rows.append(row)
    elif sheet == "Countdowns":
        row = _base_row(sheet, 1, status)
        target = deadline or (_dates(combined)[0][0] if _dates(combined) else "")
        row.update({"Title": _first_title(lines, "Important event"), "Description": _clean(extra_details or combined, 1000), "TargetDateTime": target, "AfterMessage": "The event has been announced.", "OfficialURL": official_url, "ButtonText": "View details"})
        rows.append(row)
    elif sheet == "Notifications":
        row = _base_row(sheet, 1, status)
        row.update({"Title": _first_title(lines, "Portal update"), "Message": _clean(extra_details or combined, 1200), "Audience": "All", "LinkURL": official_url, "PublishAt": row["CreatedAt"], "Category": "General", "Priority": "Normal", "IsPinned": "No"})
        rows.append(row)
    elif sheet == "Resources":
        row = _base_row(sheet, 1, status)
        title = _first_title(lines, "Student resource")
        row.update({"Title": title, "Slug": _slug(title), "Category": "Study Resources", "Description": _clean(extra_details or combined, 1500), "FileURL": official_url, "ResourceType": "Link"})
        rows.append(row)
    elif sheet == "Opportunities":
        row = _base_row(sheet, 1, status)
        kind = "Internship" if re.search(r"\binternship\b", combined, re.I) else "Competition" if re.search(r"\bcompetition\b", combined, re.I) else "Student Program"
        row.update({"Title": _first_title(lines, "Student opportunity"), "Organization": institution, "Type": kind, "OpeningDate": opening, "Deadline": deadline, "OfficialURL": official_url, "Description": _clean(extra_details or combined, 1500)})
        rows.append(row)
    else:
        row = _base_row(sheet, 1, status)
        row.update(_labeled_values(combined, SHEET_SCHEMAS[sheet]))
        title = _first_title(lines, "")
        if "Title" in row and not row["Title"]:
            row["Title"] = title
        if "Name" in row and not row["Name"]:
            row["Name"] = title
        if "Label" in row and not row["Label"]:
            row["Label"] = title
        if "Slug" in row and not row["Slug"]:
            row["Slug"] = _slug(row.get("Title") or row.get("Name") or row.get("Label") or "")
        for header in ("OfficialURL", "FileURL", "VideoURL", "ToolURL", "SourceURL", "WebsiteURL", "URL", "ButtonURL"):
            if header in row and not row[header]:
                row[header] = official_url
        description = _clean(extra_details or combined, 4000)
        if "Description" in row and not row["Description"]:
            row["Description"] = description
        if "Content" in row and not row["Content"]:
            row["Content"] = description
        if "Summary" in row and not row["Summary"]:
            row["Summary"] = _clean(description, 450)
        if "Message" in row and not row["Message"]:
            row["Message"] = _clean(description, 1200)
        if "Deadline" in row and not row["Deadline"]:
            row["Deadline"] = deadline
        if "RegistrationDeadline" in row and not row["RegistrationDeadline"]:
            row["RegistrationDeadline"] = deadline
        if "OpeningDate" in row and not row["OpeningDate"]:
            row["OpeningDate"] = opening
        if "RegistrationStart" in row and not row["RegistrationStart"]:
            row["RegistrationStart"] = opening
        if "Featured" in row and not row["Featured"]:
            row["Featured"] = "No"
        if sheet == "FAQs":
            question_line = next((line for line in lines if line.endswith("?")), title)
            row["Question"] = row.get("Question") or question_line
            remaining = [line for line in lines if line != question_line]
            row["Answer"] = row.get("Answer") or _clean(" ".join(remaining), 5000)
            row["Category"] = row.get("Category") or "General"
        elif sheet in {"MCQs", "MDCAT_Question_Bank"}:
            row["Question"] = row.get("Question") or title
            for option in "ABCD":
                option_match = re.search(rf"(?im)^\s*(?:option\s*)?{option}[).:\-]\s*(.+?)\s*$", combined)
                key = f"Option{option}"
                if key in row and not row[key] and option_match:
                    row[key] = _clean(option_match.group(1), 1000)
        elif sheet == "Videos":
            row["Platform"] = row.get("Platform") or ("YouTube" if "youtube" in official_url.lower() or "youtu.be" in official_url.lower() else "")
        elif sheet == "Notifications":
            row["Audience"] = row.get("Audience") or "All"
            row["Priority"] = row.get("Priority") or "Normal"
            row["IsPinned"] = row.get("IsPinned") or "No"
        elif sheet == "MDCAT_Updates":
            row["Priority"] = row.get("Priority") or "Normal"
            row["Category"] = row.get("Category") or "Update"
        rows.append(row)

    if not combined:
        warnings.append("No source text was provided.")
    if not official_url:
        warnings.append("No valid official URL was detected. Add and verify the official source before publishing.")
    if sheet in {"Admissions", "Scholarships", "Opportunities"} and not deadline:
        warnings.append("No deadline was confidently detected. Check the poster and enter it manually if applicable.")
    if sheet in {"Admissions", "Scholarships"} and not institution:
        warnings.append("No institution or provider was confidently detected.")
    if sheet == "Countdowns":
        warnings.append("Enter the exact Pakistan date and time in TargetDateTime before publishing the countdown.")
    if status == "Scheduled" and sheet in {"Scholarships", "Announcements", "Countdowns", "Notifications", "Resources"}:
        warnings.append("Scheduled content requires a verified PublishAt date and time before it can be saved.")
    warnings.append("OCR can make mistakes. Review every field against the original poster before setting Status to Active.")
    return ExtractionResult(rows=rows, warnings=warnings, detected={"urls": urls, "institution": institution, "programs": programs, "deadline": deadline, "opening_date": opening, "session": session})
