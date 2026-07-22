/** A compact, phone-friendly poster PDF for a student's exam routine. */
import jsPDF from 'jspdf';
import type { RoutineExam } from '@/services/examRoutineService';

const PAGE_WIDTH = 108;
const PAGE_HEIGHT = 192;
const MARGIN = 7;
const INK: [number, number, number] = [22, 29, 46];
const MUTED: [number, number, number] = [100, 116, 139];
const GREEN: [number, number, number] = [5, 150, 105];
const GREEN_DARK: [number, number, number] = [4, 120, 87];
const PALE_GREEN: [number, number, number] = [236, 253, 245];
const RED: [number, number, number] = [220, 38, 38];
const PALE_RED: [number, number, number] = [254, 242, 242];

export interface RoutineSheetInfo {
  roll: string;
  studentName?: string;
  department?: string;
  semesterLabel?: string;
  regulationYear?: number | null;
  examSession?: string;
  examType?: string;
  /** 'enrolled' | 'selected' | 'inferred' - inferred adds an extra caveat. */
  source?: string;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

function ellipsis(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && doc.getTextWidth(`${result}...`) > maxWidth) result = result.slice(0, -1);
  return `${result}...`;
}

function footer(doc: jsPDF, page: number, total: number) {
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...MUTED);
  doc.text(
    `Powered by Sirajganj Government Polytechnic Institute, Sirajganj, Bangladesh · result.spisg.gov.bd`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 9,
    { align: 'center', maxWidth: PAGE_WIDTH - MARGIN * 2 },
  );
  doc.text(`Page ${page} of ${total}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: 'center' });
}

function addHeader(doc: jsPDF, info: RoutineSheetInfo, continuation = false) {
  doc.setFillColor(...GREEN);
  doc.roundedRect(MARGIN, 7, PAGE_WIDTH - MARGIN * 2, continuation ? 25 : 35, 4, 4, 'F');
  doc.setFillColor(...GREEN_DARK);
  doc.circle(PAGE_WIDTH - 10, 11, 15, 'F');
  doc.circle(PAGE_WIDTH - 1, 24, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(continuation ? 13 : 16);
  doc.text(continuation ? 'EXAM ROUTINE (CONT.)' : 'EXAM ROUTINE', MARGIN + 6, continuation ? 18 : 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const type = (info.examType || 'final') === 'mid' ? 'MID-TERM EXAMINATION' : 'SEMESTER FINAL EXAMINATION';
  doc.text(type, MARGIN + 6, continuation ? 23 : 25);
  if (!continuation && info.examSession) {
    doc.setFontSize(6.6);
    doc.text(ellipsis(doc, info.examSession.toUpperCase(), PAGE_WIDTH - 30), MARGIN + 6, 31);
  }
}

function addStudentCard(doc: jsPDF, info: RoutineSheetInfo): number {
  const top = 47;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, 30, 3, 3, 'FD');
  const fields = [
    ['STUDENT', info.studentName || 'Student'],
    ['ROLL NO.', info.roll],
    ['TECHNOLOGY', info.department || 'Not specified'],
    ['SEMESTER', [info.semesterLabel, info.regulationYear ? `${info.regulationYear} Regulation` : ''].filter(Boolean).join(' · ') || 'Not specified'],
  ];
  fields.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + 5 + column * 47;
    const y = top + 8 + row * 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...INK);
    doc.text(ellipsis(doc, value, 40), x, y + 4.5);
  });
  return top + 37;
}

function examCard(doc: jsPDF, exam: RoutineExam, index: number, top: number) {
  const height = 20;
  const bg = exam.isReferred ? PALE_RED : PALE_GREEN;
  doc.setFillColor(...bg);
  doc.setDrawColor(...(exam.isReferred ? RED : GREEN));
  doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, top, PAGE_WIDTH - MARGIN * 2, height, 3, 3, 'FD');
  doc.setFillColor(...(exam.isReferred ? RED : GREEN));
  doc.roundedRect(MARGIN, top, 19, height, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(exam.date.slice(8, 10), MARGIN + 9.5, top + 8.5, { align: 'center' });
  doc.setFontSize(5.6);
  doc.text(new Date(`${exam.date}T00:00:00`).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(), MARGIN + 9.5, top + 13, { align: 'center' });
  doc.setFontSize(5);
  doc.text(`#${index + 1}`, MARGIN + 9.5, top + 16.5, { align: 'center' });

  const contentX = MARGIN + 23;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.text(ellipsis(doc, exam.subjectName, 68), contentX, top + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...MUTED);
  doc.text(`${exam.subjectCode}  ·  ${exam.weekday}`, contentX, top + 10.6);
  doc.setFontSize(6.7);
  doc.setTextColor(...INK);
  doc.text(`${fmtDate(exam.date)}  |  ${to12h(exam.startTime)} - ${to12h(exam.endTime)}`, contentX, top + 15.8);
  if (exam.isReferred) {
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('REFERRED', PAGE_WIDTH - MARGIN - 3, top + 5, { align: 'right' });
  }
  return height;
}

function buildRoutineDoc(info: RoutineSheetInfo, exams: RoutineExam[]): jsPDF {
  // 9:16 poster proportions, designed to read naturally on a phone instead of A4.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_WIDTH, PAGE_HEIGHT] });
  let y = addHeader(doc, info);
  y = addStudentCard(doc, info);
  let page = 1;
  const pageBreakAt = PAGE_HEIGHT - 22;

  exams.forEach((exam, index) => {
    if (y + 23 > pageBreakAt) {
      doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
      page += 1;
      addHeader(doc, info, true);
      y = 39;
    }
    examCard(doc, exam, index, y);
    y += 23;
  });

  if (y + 17 <= pageBreakAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text(`${exams.length} exam${exams.length === 1 ? '' : 's'} listed · Verify each date and time with the official BTEB notice.`, MARGIN, y + 3, { maxWidth: PAGE_WIDTH - MARGIN * 2 });
    if (info.source === 'inferred') {
      doc.setTextColor(...RED);
      doc.text('Subject matching is estimated and may be incomplete.', MARGIN, y + 8);
    }
  }

  const pages = doc.getNumberOfPages();
  for (let current = 1; current <= pages; current += 1) {
    doc.setPage(current);
    footer(doc, current, pages);
  }
  return doc;
}

export function downloadRoutinePdf(info: RoutineSheetInfo, exams: RoutineExam[]) {
  buildRoutineDoc(info, exams).save(`exam-routine-${info.roll}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function printRoutinePdf(info: RoutineSheetInfo, exams: RoutineExam[]) {
  const doc = buildRoutineDoc(info, exams);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
