import re
import unittest

from portal_assistant.extractor import build_rows, suggest_sheet
from portal_assistant.schemas import SHEET_GROUPS, SHEET_SCHEMAS, SYSTEM_MANAGED_SHEETS


POSTER = """
CITY UNIVERSITY OF SCIENCE AND INFORMATION TECHNOLOGY
ADMISSIONS OPEN FALL '26
1ST PHASE
BS Accounting & Finance
BBA (Bachelor of Business Administration)
BS Business Analytics
BS Economics
LAST DATE OF REGISTRATION: 5th October, 2026
https://cityuniversity.edu.pk/
"""


class ExtractorTests(unittest.TestCase):
    def test_admission_poster_creates_one_reviewable_row_per_program(self):
        result = build_rows("Admissions", POSTER, "https://cup.edu.pk/registration.php")
        self.assertEqual(len(result.rows), 4)
        self.assertEqual(result.rows[0]["Program"], "BS Accounting & Finance")
        self.assertTrue(result.rows[1]["Program"].startswith("BBA"))
        self.assertEqual(result.rows[0]["Institution"], "City University of Science and Information Technology, Peshawar")
        self.assertEqual(result.rows[0]["Deadline"], "2026-10-05")
        self.assertEqual(result.rows[0]["AdmissionType"], "Fall 2026 - First Phase")
        self.assertEqual(result.rows[0]["OfficialURL"], "https://cup.edu.pk/registration.php")
        self.assertEqual(result.rows[0]["Status"], "Draft")
        self.assertEqual(list(result.rows[0]), SHEET_SCHEMAS["Admissions"])
        self.assertRegex(result.rows[0]["CreatedAt"], r"^20\d{2}-\d{2}-\d{2}T")

    def test_unknown_facts_stay_blank(self):
        row = build_rows("Admissions", "Admissions open for BS English").rows[0]
        self.assertEqual(row["Eligibility"], "")
        self.assertEqual(row["EntryTest"], "")
        self.assertEqual(row["MeritListDate"], "")
        self.assertTrue(any("official URL" in warning for warning in build_rows("Admissions", "Admissions open for BS English").warnings))

    def test_scholarship_and_announcement_outputs_match_schemas(self):
        scholarship = build_rows("Scholarships", "HEC Need Based Scholarship Pakistan\nDeadline 15 November 2026", "https://example.edu/scholarship")
        self.assertEqual(list(scholarship.rows[0]), SHEET_SCHEMAS["Scholarships"])
        self.assertEqual(scholarship.rows[0]["Deadline"], "2026-11-15")
        announcement = build_rows("Announcements", "MDCAT result announced", "https://example.edu/result")
        self.assertEqual(list(announcement.rows[0]), SHEET_SCHEMAS["Announcements"])
        self.assertEqual(announcement.rows[0]["Category"], "Results")

    def test_unsafe_urls_are_not_exported(self):
        row = build_rows("Notifications", "Important reminder javascript:alert(1)", "javascript:alert(1)").rows[0]
        self.assertEqual(row["LinkURL"], "")

    def test_sheet_suggestions(self):
        self.assertEqual(suggest_sheet("Admissions are open for BS English"), "Admissions")
        self.assertEqual(suggest_sheet("Fully funded scholarship opportunity"), "Scholarships")
        self.assertEqual(suggest_sheet("Student internship applications"), "Opportunities")

    def test_generated_ids_are_sheet_specific_and_unique(self):
        rows = build_rows("Admissions", POSTER).rows
        self.assertTrue(all(re.match(r"^ADM-\d{8}-\d{6}-\d{3}-\d{2}$", row["ID"]) for row in rows))
        self.assertEqual(len({row["ID"] for row in rows}), len(rows))

    def test_every_admin_content_sheet_builds_an_exact_schema_row(self):
        text = "Sample official item\nSubjectID: MDS-001\nhttps://example.edu/item"
        for sheet, headers in SHEET_SCHEMAS.items():
            with self.subTest(sheet=sheet):
                result = build_rows(sheet, text, "https://example.edu/item")
                self.assertTrue(result.rows)
                self.assertEqual(list(result.rows[0]), headers)

    def test_groups_cover_content_sheets_without_system_managed_tables(self):
        grouped = [sheet for sheets in SHEET_GROUPS.values() for sheet in sheets]
        self.assertEqual(set(grouped), set(SHEET_SCHEMAS))
        self.assertEqual(len(grouped), len(set(grouped)))
        self.assertFalse(set(grouped).intersection(SYSTEM_MANAGED_SHEETS))

    def test_explicit_linked_ids_are_preserved_for_mdcat_rows(self):
        row = build_rows(
            "MDCAT_Chapters",
            "Cell structure\nSubjectID: MDS-001\nUnitID: MDU-001",
        ).rows[0]
        self.assertEqual(row["SubjectID"], "MDS-001")
        self.assertEqual(row["UnitID"], "MDU-001")


if __name__ == "__main__":
    unittest.main()
