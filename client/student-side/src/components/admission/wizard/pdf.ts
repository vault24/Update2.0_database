import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdmissionFormState } from './types';
import { toast } from 'sonner';
import { semesterOptions, admissionTypeOptions } from './stepConfig';

const semesterLabel = (v: string): string => semesterOptions.find((o) => o.value === v)?.label || v;
const admissionTypeLabel = (v: string): string => admissionTypeOptions.find((o) => o.value === v)?.label || v;

interface Department {
  id: string;
  name: string;
  code?: string;
}

const INSTITUTE_NAME = 'SIRAJGANJ POLYTECHNIC INSTITUTE';
const INSTITUTE_SUB = 'Directorate of Technical Education · Ministry of Education, Bangladesh';

// Brand palette (RGB) used across the PDF.
const NAVY: [number, number, number] = [15, 42, 76];
const ACCENT: [number, number, number] = [180, 130, 30];
const LABEL_BG: [number, number, number] = [240, 243, 248];
const BORDER: [number, number, number] = [214, 221, 232];

type Field = { label: string; value: string; full?: boolean };
interface Section { title: string; fields: Field[]; }

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const formatShift = (shift: string): string => (shift ? shift.replace(/(\d+)(st|nd|rd|th)/, '$1$2 Shift') : shift);
const val = (v: unknown): string => {
  const s = (v ?? '').toString().trim();
  return s.length ? s : '—';
};

/**
 * Build the ordered list of sections shared by both the downloadable PDF and
 * the printable HTML so the two never drift apart.
 */
function buildSections(
  formData: AdmissionFormState,
  getDepartmentName: (id: string) => string
): Section[] {
  const sections: Section[] = [
    {
      title: 'Personal Information',
      fields: [
        { label: 'Full Name (English)', value: val(formData.fullNameEnglish) },
        { label: 'Full Name (Bangla)', value: val(formData.fullNameBangla) },
        { label: "Father's Name", value: val(formData.fatherName) },
        { label: "Mother's Name", value: val(formData.motherName) },
        { label: "Father's NID", value: val(formData.fatherNID) },
        { label: "Mother's NID", value: val(formData.motherNID) },
        { label: 'Date of Birth', value: val(formData.dateOfBirth) },
        { label: 'Gender', value: val(capitalize(formData.gender)) },
        { label: 'Blood Group', value: val(formData.bloodGroup) },
        { label: 'Religion', value: val(capitalize(formData.religion)) },
        { label: 'Nationality', value: val(formData.nationality) },
        { label: 'Marital Status', value: val(capitalize(formData.maritalStatus)) },
        { label: 'NID Number', value: val(formData.nid) },
        { label: 'Birth Certificate No.', value: val(formData.birthCertificate) },
      ],
    },
    {
      title: 'Contact Information',
      fields: [
        { label: 'Mobile Number', value: val(formData.mobile) },
        { label: 'Email Address', value: val(formData.email) },
        { label: "Guardian's Mobile", value: val(formData.guardianMobile) },
      ],
    },
    {
      title: 'Present Address',
      fields: [
        { label: 'Address', value: val(formData.presentAddress), full: true },
        { label: 'Division', value: val(formData.presentDivision) },
        { label: 'District', value: val(formData.presentDistrict) },
        { label: 'Upazila', value: val(formData.presentUpazila) },
        { label: 'Police Station', value: val(formData.presentPoliceStation) },
        { label: 'Post Office', value: val(formData.presentPostOffice) },
        { label: 'Municipality/Union', value: val(formData.presentMunicipalityUnion) },
        { label: 'Village/Neighborhood', value: val(formData.presentVillageNeighborhood) },
        { label: 'Ward', value: val(formData.presentWard) },
      ],
    },
    {
      title: 'Permanent Address',
      fields: formData.sameAsPresent
        ? [{ label: 'Address', value: 'Same as Present Address', full: true }]
        : [
            { label: 'Address', value: val(formData.permanentAddress), full: true },
            { label: 'Division', value: val(formData.permanentDivision) },
            { label: 'District', value: val(formData.permanentDistrict) },
            { label: 'Upazila', value: val(formData.permanentUpazila) },
            { label: 'Police Station', value: val(formData.permanentPoliceStation) },
            { label: 'Post Office', value: val(formData.permanentPostOffice) },
            { label: 'Municipality/Union', value: val(formData.permanentMunicipalityUnion) },
            { label: 'Village/Neighborhood', value: val(formData.permanentVillageNeighborhood) },
            { label: 'Ward', value: val(formData.permanentWard) },
          ],
    },
    {
      title: 'Educational Background (SSC / Equivalent)',
      fields: [
        { label: 'Board', value: val(formData.sscBoard) },
        { label: 'Roll Number', value: val(formData.sscRoll) },
        { label: 'Passing Year', value: val(formData.sscYear) },
        { label: 'GPA', value: val(formData.sscGPA) },
        { label: 'Group', value: val(formData.sscGroup) },
        { label: 'Institution Name', value: val(formData.sscInstitution), full: true },
      ],
    },
    {
      title: 'Academic Information (Applied For)',
      fields: [
        { label: 'Department', value: val(getDepartmentName(formData.department)) },
        { label: 'Shift', value: val(formatShift(formData.shift)) },
        { label: 'Session', value: val(formData.session) },
        { label: 'Semester', value: val(semesterLabel(formData.semester)) },
        { label: 'Admission Type', value: val(admissionTypeLabel(formData.admissionType)) },
        { label: 'Group', value: val(capitalize(formData.group)) },
      ],
    },
  ];
  return sections;
}

const makeDeptResolver = (departments?: Department[]) => (deptId: string): string => {
  if (!departments || departments.length === 0) return deptId;
  const dept = departments.find((d) => d.id === deptId);
  return dept ? dept.name : deptId;
};

// ---------------------------------------------------------------------------
// 1) DOWNLOAD — real, crisp vector PDF via jsPDF (downloads immediately).
// ---------------------------------------------------------------------------
export function downloadAdmissionPDF(
  formData: AdmissionFormState,
  applicationId: string,
  departments?: Department[]
) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // ---- Header band ----
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setFillColor(...ACCENT);
    doc.rect(0, 34, pageWidth, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.text(INSTITUTE_NAME, pageWidth / 2, 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(INSTITUTE_SUB, pageWidth / 2, 21, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...[255, 224, 150] as [number, number, number]);
    doc.text('ADMISSION APPLICATION FORM', pageWidth / 2, 29, { align: 'center' });

    // ---- Application ID / meta strip ----
    let y = 42;
    doc.setDrawColor(...BORDER);
    doc.setFillColor(...LABEL_BG);
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Application ID', margin + 4, y + 5.5);
    doc.setFontSize(12);
    doc.text(applicationId || '—', margin + 4, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Session: ${val(formData.session)}`,
      pageWidth - margin - 4,
      y + 5.5,
      { align: 'right' }
    );
    doc.text(
      `Submitted: ${new Date().toLocaleDateString('en-GB')}`,
      pageWidth - margin - 4,
      y + 11,
      { align: 'right' }
    );
    y += 20;

    // ---- Sections as key/value tables ----
    const sections = buildSections(formData, makeDeptResolver(departments));
    const colLabel1 = 33;
    const colVal1 = contentWidth / 2 - colLabel1;
    const colLabel2 = 33;
    const colVal2 = contentWidth / 2 - colLabel2;

    sections.forEach((section) => {
      const body: any[] = [];
      const fields = section.fields;
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.full) {
          body.push([
            { content: f.label, styles: { fillColor: LABEL_BG, fontStyle: 'bold', textColor: NAVY } },
            { content: f.value, colSpan: 3 },
          ]);
        } else {
          const next = fields[i + 1];
          if (next && !next.full) {
            body.push([
              { content: f.label, styles: { fillColor: LABEL_BG, fontStyle: 'bold', textColor: NAVY } },
              { content: f.value },
              { content: next.label, styles: { fillColor: LABEL_BG, fontStyle: 'bold', textColor: NAVY } },
              { content: next.value },
            ]);
            i++;
          } else {
            body.push([
              { content: f.label, styles: { fillColor: LABEL_BG, fontStyle: 'bold', textColor: NAVY } },
              { content: f.value, colSpan: 3 },
            ]);
          }
        }
      }

      autoTable(doc, {
        startY: y,
        head: [[{ content: section.title, colSpan: 4 }]],
        body,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: BORDER, lineWidth: 0.1, textColor: [30, 30, 30] },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 9.5, halign: 'left', cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: colLabel1 },
          1: { cellWidth: colVal1 },
          2: { cellWidth: colLabel2 },
          3: { cellWidth: colVal2 },
        },
        margin: { left: margin, right: margin },
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    });

    // ---- Declaration + signatures (keep together at the bottom) ----
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(...BORDER);
    doc.setFillColor(250, 251, 253);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Declaration', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(
      'I hereby declare that all the information provided above is true and correct to the best of my knowledge and belief.',
      margin + 4,
      y + 11,
      { maxWidth: contentWidth - 8 }
    );
    y += 24 + 16;

    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(margin + 6, y, margin + 66, y);
    doc.line(pageWidth - margin - 66, y, pageWidth - margin - 6, y);
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text("Applicant's Signature", margin + 36, y + 5, { align: 'center' });
    doc.text('Authorized Officer', pageWidth - margin - 36, y + 5, { align: 'center' });

    // ---- Footer with page numbers on every page ----
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(
        `${INSTITUTE_NAME} · Official Admission Document`,
        margin,
        pageHeight - 8
      );
      doc.text(
        `Generated ${new Date().toLocaleString('en-GB')}  ·  Page ${p} of ${pageCount}`,
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    }

    doc.save(`Admission-Form-${applicationId || 'application'}.pdf`);
    toast.success('Admission form downloaded');
  } catch (err) {
    console.error('Failed to generate admission PDF:', err);
    toast.error('Could not generate the PDF. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// 2) PRINT — redesigned, print-optimized HTML opened directly in a print dialog.
// ---------------------------------------------------------------------------
export function printAdmissionForm(
  formData: AdmissionFormState,
  applicationId: string,
  departments?: Department[]
) {
  const getDepartmentName = makeDeptResolver(departments);
  const sections = buildSections(formData, getDepartmentName);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to print the application');
    return;
  }

  const renderFields = (fields: Field[]) =>
    fields
      .map(
        (f) => `
        <div class="field${f.full ? ' full' : ''}">
          <div class="label">${f.label}</div>
          <div class="value">${f.value}</div>
        </div>`
      )
      .join('');

  const renderSections = sections
    .map(
      (s) => `
      <section class="section">
        <div class="section-title">${s.title}</div>
        <div class="grid">${renderFields(s.fields)}</div>
      </section>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Admission Form - ${applicationId}</title>
  <style>
    :root { --navy:#0f2a4c; --accent:#b4821e; --label:#f0f3f8; --border:#d6dde8; --muted:#5a5a5a; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1a1a1a; margin:0; background:#fff; }
    .page { max-width: 820px; margin: 0 auto; padding: 24px; }
    .header { background: var(--navy); color:#fff; border-radius:10px; padding:18px 20px; display:flex; align-items:center; gap:16px; border-bottom:3px solid var(--accent); }
    .header img { width:64px; height:64px; object-fit:contain; background:#fff; border-radius:8px; padding:4px; }
    .header .titles { flex:1; text-align:center; }
    .header h1 { margin:0; font-size:20px; letter-spacing:.5px; }
    .header .sub { margin:3px 0 0; font-size:10px; opacity:.85; }
    .header .form-name { margin-top:6px; font-size:12px; font-weight:700; color:#ffe096; letter-spacing:1px; }
    .meta { display:flex; justify-content:space-between; align-items:center; background:var(--label); border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin:14px 0; }
    .meta .id-label { font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase; }
    .meta .id-value { font-size:18px; font-weight:800; color:var(--navy); font-family:'Courier New',monospace; }
    .meta .right { text-align:right; font-size:12px; color:var(--muted); }
    .meta .right div { margin:2px 0; }
    .section { margin:14px 0; page-break-inside: avoid; border:1px solid var(--border); border-radius:8px; overflow:hidden; }
    .section-title { background:var(--navy); color:#fff; padding:8px 14px; font-weight:700; font-size:13px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:0; }
    .field { padding:8px 14px; border-top:1px solid var(--border); border-right:1px solid var(--border); }
    .field:nth-child(2n) { border-right:none; }
    .field.full { grid-column:1 / -1; border-right:none; }
    .field .label { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.3px; margin-bottom:2px; }
    .field .value { font-size:13px; color:#111; }
    .declaration { margin-top:18px; border:1px solid var(--border); border-radius:8px; padding:14px 16px; background:#fafbfd; page-break-inside:avoid; }
    .declaration h3 { margin:0 0 6px; font-size:12px; color:var(--navy); }
    .declaration p { margin:0; font-size:11px; color:var(--muted); }
    .signatures { display:flex; justify-content:space-between; margin-top:44px; page-break-inside:avoid; }
    .sign { text-align:center; width:45%; }
    .sign .line { border-top:1px solid #888; margin-bottom:5px; }
    .sign span { font-size:11px; color:var(--muted); }
    .footer { margin-top:22px; border-top:1px solid var(--border); padding-top:8px; display:flex; justify-content:space-between; font-size:9px; color:#999; }
    @page { size: A4; margin: 12mm; }
    @media print { .page { padding:0; max-width:none; } .no-print { display:none !important; } }
    .toolbar { text-align:center; margin:20px 0; }
    .toolbar button { padding:10px 22px; background:var(--navy); color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="/spi-logo.png" alt="SPI Logo" onerror="this.style.display='none'" />
      <div class="titles">
        <h1>${INSTITUTE_NAME}</h1>
        <p class="sub">${INSTITUTE_SUB}</p>
        <div class="form-name">ADMISSION APPLICATION FORM</div>
      </div>
    </div>

    <div class="meta">
      <div>
        <div class="id-label">Application ID</div>
        <div class="id-value">${applicationId || '—'}</div>
      </div>
      <div class="right">
        <div>Session: <strong>${val(formData.session)}</strong></div>
        <div>Submitted: ${new Date().toLocaleDateString('en-GB')}</div>
      </div>
    </div>

    ${renderSections}

    <div class="declaration">
      <h3>Declaration</h3>
      <p>I hereby declare that all the information provided above is true and correct to the best of my knowledge and belief.</p>
    </div>

    <div class="signatures">
      <div class="sign"><div class="line">&nbsp;</div><span>Applicant's Signature</span></div>
      <div class="sign"><div class="line">&nbsp;</div><span>Authorized Officer</span></div>
    </div>

    <div class="footer">
      <span>${INSTITUTE_NAME} · Official Admission Document</span>
      <span>Generated ${new Date().toLocaleString('en-GB')}</span>
    </div>

    <div class="toolbar no-print">
      <button onclick="window.print()">Print this form</button>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}

// Backwards-compatible alias (older callers used a single generator that printed).
export const generateAdmissionPDF = printAdmissionForm;
