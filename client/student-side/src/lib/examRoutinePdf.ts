/**
 * Exam-routine sheet (PDF) — a properly designed, printable routine.
 *
 * One layout serves both actions: `downloadRoutinePdf` saves the file,
 * `printRoutinePdf` opens the same sheet with the print dialog ready.
 * The sheet is system-generated from the imported BTEB routine, so it
 * always carries a "verify against the official notice" warning.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RoutineExam } from '@/services/examRoutineService';

const INSTITUTE_NAME = 'Sirajganj Government Polytechnic Institute';
const INSTITUTE_SUB = 'Sirajganj, Bangladesh · spisg.gov.bd';

const EMERALD: [number, number, number] = [5, 150, 105];
const EMERALD_DARK: [number, number, number] = [4, 120, 87];
const AMBER_BG: [number, number, number] = [255, 251, 235];
const AMBER_BORDER: [number, number, number] = [217, 119, 6];
const RED: [number, number, number] = [220, 38, 38];
const SLATE: [number, number, number] = [71, 85, 105];

export interface RoutineSheetInfo {
  roll: string;
  studentName?: string;
  department?: string;
  semesterLabel?: string;
  regulationYear?: number | null;
  examSession?: string;
  examType?: string;
  /** 'enrolled' | 'selected' | 'inferred' — inferred adds an extra caveat. */
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

function buildRoutineDoc(info: RoutineSheetInfo, exams: RoutineExam[]): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // ---- Header band ---------------------------------------------------
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setFillColor(...EMERALD_DARK);
  doc.rect(0, 30, pageWidth, 1.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(INSTITUTE_NAME, pageWidth / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(INSTITUTE_SUB, pageWidth / 2, 17.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const examTypeLabel = (info.examType || 'final') === 'mid' ? 'Mid-Term' : 'Semester Final';
  doc.text(`BTEB ${examTypeLabel} Examination — Exam Routine`, pageWidth / 2, 25, {
    align: 'center',
  });

  // ---- Info panel ----------------------------------------------------
  const infoPairs: Array<[string, string]> = [['Roll No', info.roll]];
  if (info.studentName) infoPairs.push(['Name', info.studentName]);
  if (info.department) infoPairs.push(['Technology', info.department]);
  if (info.semesterLabel) infoPairs.push(['Semester', info.semesterLabel]);
  if (info.regulationYear) infoPairs.push(['Regulation', `${info.regulationYear} Probidhan`]);
  if (info.examSession) infoPairs.push(['Exam Session', info.examSession]);

  let y = 38;
  doc.setFontSize(9);
  const colWidth = (pageWidth - margin * 2) / 2;
  infoPairs.forEach(([label, value], i) => {
    const x = margin + (i % 2) * colWidth;
    if (i % 2 === 0 && i > 0) y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE);
    doc.text(`${label}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(value, x + 26, y, { maxWidth: colWidth - 30 });
  });
  y += 8;

  // ---- Exam table ----------------------------------------------------
  const referredCount = exams.filter((e) => e.isReferred).length;
  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Day', 'Time', 'Subject', 'Code', 'Type']],
    body: exams.map((e, i) => [
      String(i + 1),
      fmtDate(e.date),
      e.weekday,
      `${to12h(e.startTime)} – ${to12h(e.endTime)}`,
      e.subjectName,
      e.subjectCode,
      e.isReferred ? 'Referred' : 'Regular',
    ]),
    styles: { fontSize: 9, cellPadding: 2.6, valign: 'middle' },
    headStyles: { fillColor: EMERALD, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 26 },
      2: { cellWidth: 24 },
      3: { cellWidth: 36 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6
          && data.cell.raw === 'Referred') {
        data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  let afterTable = ((doc as unknown as { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? y) + 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    `Total exams: ${exams.length}` +
      (referredCount ? `  ·  Referred: ${referredCount}` : ''),
    margin, afterTable,
  );
  afterTable += 6;

  // ---- Warning box ---------------------------------------------------
  const warningLines = [
    'This routine is SYSTEM-GENERATED from the published BTEB exam routine and your',
    'subject records. Always double-check the date, time and subject codes against the',
    'official BTEB notice / your institute notice board before each exam.',
  ];
  if (info.source === 'inferred') {
    warningLines.push(
      'This roll is not a registered student of this institute — the subject list is',
      'estimated from published results and may be incomplete.',
    );
  }
  const boxHeight = 8 + warningLines.length * 4.4;
  if (afterTable + boxHeight > pageHeight - 20) {
    doc.addPage();
    afterTable = 16;
  }
  doc.setFillColor(...AMBER_BG);
  doc.setDrawColor(...AMBER_BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, afterTable, pageWidth - margin * 2, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER_BORDER);
  doc.text('IMPORTANT — PLEASE VERIFY', margin + 4, afterTable + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 70, 10);
  warningLines.forEach((line, i) => {
    doc.text(line, margin + 4, afterTable + 10.5 + i * 4.4);
  });

  // ---- Footer (every page) -------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(
      `Generated ${new Date().toLocaleString('en-GB')} · result.spisg.gov.bd · Page ${p} of ${pageCount}`,
      pageWidth / 2, pageHeight - 7, { align: 'center' },
    );
  }
  doc.setTextColor(0, 0, 0);
  return doc;
}

export function downloadRoutinePdf(info: RoutineSheetInfo, exams: RoutineExam[]) {
  const doc = buildRoutineDoc(info, exams);
  doc.save(`exam-routine-${info.roll}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function printRoutinePdf(info: RoutineSheetInfo, exams: RoutineExam[]) {
  const doc = buildRoutineDoc(info, exams);
  doc.autoPrint();
  const url = doc.output('bloburl');
  window.open(url, '_blank');
}
