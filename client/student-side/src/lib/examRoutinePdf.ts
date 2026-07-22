/** A single-page, phone-friendly exam-routine poster. */
import jsPDF from 'jspdf';
import type { RoutineExam } from '@/services/examRoutineService';

const PAGE_WIDTH = 150;
const PAGE_HEIGHT = 188;
const MARGIN = 9;
const NAVY: [number, number, number] = [4, 112, 83];
const GREEN: [number, number, number] = [5, 150, 105];
const CREAM: [number, number, number] = [255, 251, 242];
const INK: [number, number, number] = [31, 41, 55];
const MUTED: [number, number, number] = [100, 116, 139];
const RED: [number, number, number] = [185, 28, 28];

export interface RoutineSheetInfo {
  roll: string;
  studentName?: string;
  department?: string;
  semesterLabel?: string;
  regulationYear?: number | null;
  examSession?: string;
  examType?: string;
  source?: string;
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

function fitText(doc: jsPDF, text: string, width: number): string {
  if (doc.getTextWidth(text) <= width) return text;
  let result = text;
  while (result.length > 1 && doc.getTextWidth(`${result}…`) > width) result = result.slice(0, -1);
  return `${result}…`;
}

function chip(doc: jsPDF, label: string, value: string, x: number, width: number, y: number) {
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, 16, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(...MUTED);
  doc.text(label, x + 3.5, y + 5.5);
  doc.setFontSize(7.1);
  doc.setTextColor(...INK);
  doc.text(fitText(doc, value, width - 7), x + 3.5, y + 11.5);
}

function buildRoutineDoc(info: RoutineSheetInfo, exams: RoutineExam[]): jsPDF {
  // A 4:5 poster ratio keeps the complete routine readable on a mobile screen.
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PAGE_WIDTH, PAGE_HEIGHT] });
  const innerWidth = PAGE_WIDTH - MARGIN * 2;
  const examType = (info.examType || 'final') === 'mid' ? 'MID-TERM EXAMINATION' : 'SEMESTER FINAL EXAMINATION';

  doc.setFillColor(...CREAM);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  // restrained decoration, for a poster finish without distracting from the routine
  doc.setFillColor(236, 253, 245);
  doc.circle(-4, 8, 23, 'F');
  doc.circle(PAGE_WIDTH + 6, PAGE_HEIGHT - 4, 26, 'F');

  // A single green information panel keeps the routine details together.
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, 9, innerWidth, 69, 4, 4, 'F');
  doc.setFillColor(...GREEN);
  doc.circle(MARGIN + 13, 23.5, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('EXAM', MARGIN + 13, 22.3, { align: 'center' });
  doc.setFontSize(5.3);
  doc.text('ROUTINE', MARGIN + 13, 27, { align: 'center' });
  doc.setFontSize(16);
  doc.text('EXAM ROUTINE', MARGIN + 27, 21.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.text(examType, MARGIN + 27, 27.2);
  if (info.examSession) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(PAGE_WIDTH - MARGIN - 41, 16, 34, 14, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(...NAVY);
    doc.text('EXAM SESSION', PAGE_WIDTH - MARGIN - 24, 20.6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.text(fitText(doc, info.examSession, 29), PAGE_WIDTH - MARGIN - 24, 25.8, { align: 'center' });
  }

  const gap = 3;
  const half = (innerWidth - gap) / 2;
  chip(doc, 'STUDENT', info.studentName || 'Student', MARGIN + 3, half - 3, 40);
  chip(doc, 'ROLL NO.', info.roll, MARGIN + half + gap, half - 3, 40);
  chip(doc, 'TECHNOLOGY', info.department || 'Not specified', MARGIN + 3, half - 3, 59);
  const semester = [info.semesterLabel, info.regulationYear ? `${info.regulationYear} Regulation` : ''].filter(Boolean).join(' · ') || 'Not specified';
  chip(doc, 'SEMESTER', semester, MARGIN + half + gap, half - 3, 59);

  const tableTop = 85;
  const footerTop = PAGE_HEIGHT - 19;
  const headerHeight = 9;
  // Reserve space for the verification note as well as the footer.
  const available = footerTop - tableTop - headerHeight - 10;
  // Always remain on one poster page. The row height adapts for routines with many subjects.
  const rowHeight = Math.min(10, available / Math.max(exams.length, 1));
  const columns = [24, 19, 17, 57, 24];
  const headings = ['DATE', 'DAY', 'CODE', 'SUBJECT', 'TIME'];
  let x = MARGIN;
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN, tableTop, innerWidth, headerHeight, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  headings.forEach((heading, index) => {
    doc.text(heading, x + columns[index] / 2, tableTop + 5.8, { align: 'center' });
    x += columns[index];
  });

  const nameFont = Math.min(6.3, Math.max(3.7, rowHeight * 0.76));
  const valueFont = Math.min(5.8, Math.max(3.5, rowHeight * 0.65));
  exams.forEach((exam, index) => {
    const y = tableTop + headerHeight + 1 + index * rowHeight;
    doc.setFillColor(...(exam.isReferred ? [254, 242, 242] : index % 2 ? [255, 255, 255] : [247, 250, 252]));
    doc.roundedRect(MARGIN, y, innerWidth, rowHeight - 1.1, 1.3, 1.3, 'F');
    const values = [fmtDate(exam.date), exam.weekday, exam.subjectCode, exam.subjectName, to12h(exam.startTime)];
    let columnX = MARGIN;
    values.forEach((value, valueIndex) => {
      const width = columns[valueIndex];
      const centre = valueIndex !== 3;
      doc.setFont('helvetica', valueIndex === 3 ? 'bold' : 'normal');
      doc.setFontSize(valueIndex === 3 ? nameFont : valueFont);
      doc.setTextColor(...(exam.isReferred && valueIndex === 3 ? RED : INK));
      const padding = valueIndex === 3 ? 2.5 : 1.5;
      doc.text(
        fitText(doc, value, width - padding * 2),
        centre ? columnX + width / 2 : columnX + padding,
        y + rowHeight / 2 + 1.5,
        centre ? { align: 'center' } : undefined,
      );
      columnX += width;
    });
  });

  const routineEnd = tableTop + headerHeight + 1 + exams.length * rowHeight;
  if (exams.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.text('No matching exams are available for this routine.', PAGE_WIDTH / 2, routineEnd + 10, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...MUTED);
  const note = info.source === 'inferred'
    ? 'Subject matching is estimated. Verify every exam with the official BTEB notice.'
    : 'Please verify every date, subject code and time with the official BTEB notice.';
  doc.text(note, PAGE_WIDTH / 2, Math.min(routineEnd + 6, footerTop - 3), { align: 'center', maxWidth: innerWidth });

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, footerTop, PAGE_WIDTH - MARGIN, footerTop);
  doc.setFontSize(5.6);
  doc.setTextColor(...MUTED);
  doc.text('Powered by Sirajganj Government Polytechnic Institute, Sirajganj, Bangladesh · result.spisg.gov.bd', PAGE_WIDTH / 2, footerTop + 7, { align: 'center', maxWidth: innerWidth });
  doc.setFontSize(5);
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB')} · ${exams.length} exam${exams.length === 1 ? '' : 's'}`, PAGE_WIDTH / 2, footerTop + 11.5, { align: 'center' });
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
