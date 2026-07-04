/**
 * Attendance export helpers — professionally formatted PDF and Excel reports.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportMeta {
  title: string;
  subtitle?: string;
  filters?: Array<{ label: string; value: string }>;
}

const INSTITUTE_NAME = 'Sirajganj Polytechnic Institute';

const buildFileName = (title: string, ext: string) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${stamp}.${ext}`;
};

export function exportAttendancePdf(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Array<Record<string, unknown>>,
  summaryLines: string[] = []
) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(INSTITUTE_NAME, pageWidth / 2, 16, { align: 'center' });
  doc.setFontSize(12);
  doc.text(meta.title, pageWidth / 2, 23, { align: 'center' });
  if (meta.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(meta.subtitle, pageWidth / 2, 29, { align: 'center' });
  }

  let cursorY = meta.subtitle ? 35 : 30;

  // Filter block
  if (meta.filters && meta.filters.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const filterText = meta.filters.map(f => `${f.label}: ${f.value}`).join('   |   ');
    doc.text(filterText, pageWidth / 2, cursorY, { align: 'center', maxWidth: pageWidth - 24 });
    cursorY += 6;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [columns.map(c => c.header)],
    body: rows.map(row => columns.map(c => String(row[c.key] ?? ''))),
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 12, right: 12 },
    didDrawPage: (data) => {
      // Footer with page number + generation timestamp
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `Generated ${new Date().toLocaleString()}  ·  Page ${doc.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
      doc.setTextColor(0);
    },
  });

  if (summaryLines.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? cursorY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    summaryLines.forEach((line, i) => {
      doc.text(line, 12, finalY + 8 + i * 5);
    });
  }

  doc.save(buildFileName(meta.title, 'pdf'));
}

// ---------------------------------------------------------------------------
// Attendance register (matrix) exports — rows = students, columns = dates,
// footer rows = per-date present/absent totals, last column = attendance rate.
// ---------------------------------------------------------------------------

export interface RegisterExportData {
  subject: {
    subject_code: string;
    subject_name: string;
    department: string;
    semester: number;
    shift: string;
    session: string;
  };
  dates: string[];
  students: Array<{
    name: string;
    roll: string;
    cells: Record<string, string>;
    present: number;
    absent: number;
    percentage: number;
  }>;
  totalsByDate: Record<string, { present: number; absent: number }>;
}

const CELL_MARKS: Record<string, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  leave: 'Lv',
};

const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

export function exportRegisterPdf(data: RegisterExportData, teacherName?: string) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const title = `Attendance Register — ${data.subject.subject_name} (${data.subject.subject_code})`;
  const subtitle = `${data.subject.department} · Semester ${data.subject.semester} · ${data.subject.shift} Shift` +
    (data.subject.session ? ` · Session ${data.subject.session}` : '') +
    (teacherName ? ` · Teacher: ${teacherName}` : '');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(INSTITUTE_NAME, pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(11);
  doc.text(title, pageWidth / 2, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth / 2, 27, { align: 'center' });

  // Chunk date columns so wide semesters stay readable across pages.
  const DATES_PER_TABLE = 20;
  const chunks: string[][] = [];
  for (let i = 0; i < data.dates.length; i += DATES_PER_TABLE) {
    chunks.push(data.dates.slice(i, i + DATES_PER_TABLE));
  }
  if (chunks.length === 0) chunks.push([]);

  let startY = 32;
  chunks.forEach((chunk, chunkIndex) => {
    const isLast = chunkIndex === chunks.length - 1;
    const head = [
      ['Roll', 'Student Name', ...chunk.map(shortDate), ...(isLast ? ['Present', 'Absent', 'Rate'] : [])],
    ];
    const body = data.students.map(s => [
      s.roll,
      s.name,
      ...chunk.map(d => CELL_MARKS[s.cells[d]] ?? '—'),
      ...(isLast ? [String(s.present), String(s.absent), `${s.percentage}%`] : []),
    ]);
    const foot = [
      ['', 'Total Present', ...chunk.map(d => String(data.totalsByDate[d]?.present ?? '')), ...(isLast ? ['', '', ''] : [])],
      ['', 'Total Absent', ...chunk.map(d => String(data.totalsByDate[d]?.absent ?? '')), ...(isLast ? ['', '', ''] : [])],
    ];

    autoTable(doc, {
      startY,
      head,
      body,
      foot,
      styles: { fontSize: 7, cellPadding: 1.2, halign: 'center' },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
      footStyles: { fillColor: [226, 232, 240], textColor: 30, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left', cellWidth: 18 },
        1: { halign: 'left', cellWidth: 40 },
      },
      alternateRowStyles: { fillColor: [246, 248, 251] },
      margin: { left: 8, right: 8 },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(7.5);
        doc.setTextColor(120);
        doc.text(
          `P = Present, A = Absent, L = Late, Lv = Leave · Generated ${new Date().toLocaleString()}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
        doc.setTextColor(0);
      },
    });
    startY = ((doc as any).lastAutoTable?.finalY ?? startY) + 8;
  });

  doc.save(buildFileName(`attendance-register-${data.subject.subject_code}`, 'pdf'));
}

export function exportRegisterExcel(data: RegisterExportData, teacherName?: string) {
  const title = `Attendance Register — ${data.subject.subject_name} (${data.subject.subject_code})`;
  const subtitle = `${data.subject.department} | Semester ${data.subject.semester} | ${data.subject.shift} Shift` +
    (data.subject.session ? ` | Session ${data.subject.session}` : '') +
    (teacherName ? ` | Teacher: ${teacherName}` : '');

  const header = ['Roll', 'Student Name', ...data.dates.map(shortDate), 'Present', 'Absent', 'Rate'];
  const body = data.students.map(s => [
    s.roll,
    s.name,
    ...data.dates.map(d => CELL_MARKS[s.cells[d]] ?? '—'),
    s.present,
    s.absent,
    `${s.percentage}%`,
  ]);
  const footPresent = ['', 'Total Present', ...data.dates.map(d => data.totalsByDate[d]?.present ?? ''), '', '', ''];
  const footAbsent = ['', 'Total Absent', ...data.dates.map(d => data.totalsByDate[d]?.absent ?? ''), '', '', ''];

  const rows: Array<Array<unknown>> = [
    [INSTITUTE_NAME],
    [title],
    [subtitle],
    ['P = Present, A = Absent, L = Late, Lv = Leave'],
    [],
    header,
    ...body,
    footPresent,
    footAbsent,
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    ...data.dates.map(() => ({ wch: 6 })),
    { wch: 9 },
    { wch: 9 },
    { wch: 8 },
  ];
  ws['!merges'] = [0, 1, 2, 3].map(r => ({
    s: { r, c: 0 },
    e: { r, c: header.length - 1 },
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, data.subject.subject_code.slice(0, 28) || 'Register');
  XLSX.writeFile(wb, buildFileName(`attendance-register-${data.subject.subject_code}`, 'xlsx'));
}

export function exportAttendanceExcel(
  meta: ExportMeta,
  columns: ExportColumn[],
  rows: Array<Record<string, unknown>>,
  summaryLines: string[] = []
) {
  const headerRows: Array<Array<string>> = [
    [INSTITUTE_NAME],
    [meta.title],
  ];
  if (meta.subtitle) headerRows.push([meta.subtitle]);
  if (meta.filters && meta.filters.length > 0) {
    headerRows.push(meta.filters.map(f => `${f.label}: ${f.value}`).join('  |  ').split('\n'));
  }
  headerRows.push([]);

  const tableHeader = columns.map(c => c.header);
  const tableRows = rows.map(row => columns.map(c => row[c.key] ?? ''));

  const data: Array<Array<unknown>> = [...headerRows, tableHeader, ...tableRows];
  if (summaryLines.length > 0) {
    data.push([]);
    summaryLines.forEach(line => data.push([line]));
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? Math.max(c.header.length + 4, 12) }));
  // Merge title rows across all columns
  ws['!merges'] = headerRows
    .map((_, idx) => ({ s: { r: idx, c: 0 }, e: { r: idx, c: Math.max(columns.length - 1, 0) } }))
    .slice(0, headerRows.length - 1);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, buildFileName(meta.title, 'xlsx'));
}
