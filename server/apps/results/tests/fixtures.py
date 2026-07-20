"""
Synthetic BTEB notice pages for parser tests.

The pages reproduce every structural hazard observed on real notices:
- jumbled extraction order (page footer after records, "NOTICE" last)
- stray margin numerals ("1", "2", and one glued to an Expelled heading)
- a record whose subject list is split across a page boundary with the whole
  footer + next header interleaved
- a subject suffix wrapped mid-token: "28554(T,\\nP)"
- expelled records in both forms (with body, and a bare roll)
- a continuous-assessment failure record
- the "Copy of the published result" distribution block
- a final-semester cgpa record (institute B)
"""
from apps.results.parsing.extraction import PageText


class FakeExtractor:
    """TextExtractor stand-in that serves pre-baked page texts."""

    def __init__(self, pages: list[str]):
        self._pages = pages

    def extract_pages(self, source) -> list[PageText]:
        return [PageText(number=i + 1, text=t) for i, t in enumerate(self._pages)]


FOOTER = """Bangladesh Technical Education Board
Office of the Controller of Examinations
Agargaon, Sherebangla Nagar, Dhaka-1207
Memo No. 57.17.0000.301.31.002.25.300
Note:
1. The result is hereby published subject to the final approval of the Bangladesh Technical Education Board. If any inadvertent error/mistake is detected later on in the result, the board as per rule holds the
authority of correcting / altering / withdrawing the result at any time. Any comments from the Head of Institutes regarding the published result should be reported in written within 06 May, 2026. No complain
will be entertained after the expiry of the stipulated time.
2. The withheld student must have to clear their withheld status within 06 May, 2026, otherwise they will not get admit card for next examination. After clearing the withheld status the overall result of the
candidates will be published and their candidature in the next examination will be decided accordingly.
( Enrg. Md. Abul Kalam Azad )
Controller of Examinations
Bangladesh Technical Education Board,Dhaka
Phone : 02-55006525
Date : 28-04-2026
NOTICE"""

PAGE_1 = """Page 1 of 3
99001 - Testville Polytechnic Institute, Testville
1
2
It is to be notified all concerned that roll numbers who have passed in all subjects in the 5th Semester (2022 Regulation) Examination of DIPLOMA IN ENGINEERING, 2025 held in January-March, 2026 are
listed below in accordance with the regulation of the board. The obtained GPA of each semester are listed beside the respective roll numbers.
It is to be notified all concerned that roll numbers who have failed in three or less subjects in the 5th Semester (2022 Regulation) Examination of DIPLOMA IN ENGINEERING, 2025 held in January-March, 2026
are listed below in accordance with the regulation of the board. The obtained each semester GPA and referred subjects are listed beside the respective roll numbers.
100001 (gpa5: 3.36, gpa4: 3.27, gpa3: 3.45,
gpa2: 3.12, gpa1: 3.23)
100002 { gpa5: ref, gpa4: 3.20, gpa3: 3.38, gpa2:
2.95, gpa1: 3.25, ref_sub: 28551(T), 28554(T,
P) }
5 Expelled: (Combined Disciplinary Rule 1.3) -
100003 ( Expelled_sub - 26453;  reffered_sub -
25841(T), 25921(T) )
100004
100005 {  25921(T), 27043(T), 27051(T),
""" + FOOTER

PAGE_2 = """Page 2 of 3
27252(T) }
100006 ( continuousfail_sub- 26481; reffered_sub-
26454(T), 26464(T) )
Memo No. 57.17.0000.301.31.002.25.300(522)                                    Date : 28-04-2026
Copy of the published result is hereby sent for information and necessary action please:
1. Director General, Directorate of Technical Education, Agargaon, Dhaka.
6-55. Principal, Govt. Polytechnic Institute.
522. Guard file
( Mohammed Abul Shahin Kowser Sarker )
Deputy Controller of Examination
Bngladesh Technical Education Board, Dhaka
Phone: 02-55006531
""" + FOOTER

PAGE_3 = """Page 3 of 3
99002 - Example Institute of Technology, Sadar
1
It is to be notified all concerned that roll numbers who have passed in all subjects in the 5th Semester (2022 Regulation) Examination of DIPLOMA IN ENGINEERING, 2025 held in January-March, 2026 are
listed below in accordance with the regulation of the board. The obtained CGPA and each semester GPA are listed beside the respective roll numbers.
200001 cgpa: 3.28 (gpa8: 3.75, gpa7: 3.11, gpa6:
3.39, gpa5: 3.20, gpa4: 3.07, gpa3: 3.10, gpa2:
3.08, gpa1: 3.25)
200002 {  25851(T), 26447(T,P), 26475(P) }
""" + FOOTER

STANDARD_PAGES = [PAGE_1, PAGE_2, PAGE_3]


def parse_standard():
    from apps.results.parsing import parse_result_pdf

    return parse_result_pdf(b'', extractor=FakeExtractor(STANDARD_PAGES))
