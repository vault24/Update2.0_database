import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdmissionFormState } from './types';
import { toast } from 'sonner';
import { semesterOptions, admissionTypeOptions, ADMISSION_DOCUMENT_FIELDS } from './stepConfig';

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

type Field = { label: string; value: string; full?: boolean; bangla?: boolean };
interface Section { title: string; fields: Field[]; }

const capitalize = (text: string): string => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const formatShift = (shift: string): string => (shift ? shift.replace(/(\d+)(st|nd|rd|th)/, '$1$2 Shift') : shift);
const val = (v: unknown): string => {
  const s = (v ?? '').toString().trim();
  return s.length ? s : '-';
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
        { label: 'Full Name (Bangla)', value: val(formData.fullNameBangla), bangla: true },
        { label: "Father's Name", value: val(formData.fatherName) },
        { label: "Mother's Name", value: val(formData.motherName) },
        { label: "Father's NID", value: val(formData.fatherNID) },
        { label: "Mother's NID", value: val(formData.motherNID) },
        { label: 'Date of Birth', value: val(formData.dateOfBirth) },
        { label: 'Gender', value: val(capitalize(formData.gender)) },
        { label: 'Blood Group', value: val(formData.bloodGroup) },
        { label: 'Religion', value: val(capitalize(formData.religion)) },
        { label: 'Nationality', value: val(formData.nationality || 'Bangladeshi') },
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

  // Attached documents — list every document the applicant added, so the form
  // records exactly what was submitted with the application.
  const attachedDocs = ADMISSION_DOCUMENT_FIELDS
    .filter((d) => !!(formData as unknown as Record<string, unknown>)[d.key])
    .map((d) => d.label);
  sections.push({
    title: 'Attached Documents',
    fields: attachedDocs.length
      ? attachedDocs.map((name, i) => ({ label: String(i + 1), value: name, full: true }))
      : [{ label: '-', value: 'No documents were attached with this application.', full: true }],
  });

  return sections;
}

// ---------------------------------------------------------------------------
// Bangla rendering. jsPDF's built-in fonts are Latin-1 only, so Bangla Unicode
// turns into mojibake. Instead we paint the Bangla string onto a canvas (the
// browser shapes Bengali conjuncts/matras correctly) and embed it as an image.
// ---------------------------------------------------------------------------
function renderBanglaToImage(text: string): { dataUrl: string; ratio: number } | null {
  if (typeof document === 'undefined' || !text) return null;
  try {
    const fontPx = 40;
    const fontStack = `${fontPx}px "Noto Sans Bengali","Nikosh","Vrinda","SolaimanLipi","Kalpurush","Siyam Rupali",sans-serif`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.font = fontStack;
    const w = Math.max(1, Math.ceil(ctx.measureText(text).width) + 10);
    const h = Math.ceil(fontPx * 1.5);
    canvas.width = w;
    canvas.height = h;
    ctx.font = fontStack; // resizing the canvas resets the context
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e1e1e';
    ctx.fillText(text, 5, h / 2);
    return { dataUrl: canvas.toDataURL('image/png'), ratio: w / h };
  } catch {
    return null;
  }
}

function drawBanglaInCell(doc: jsPDF, cell: { x: number; y: number; width: number; height: number }, text: string) {
  const img = renderBanglaToImage(text);
  if (!img) return;
  const pad = 1.6;
  const maxW = cell.width - pad * 2;
  let h = Math.min(cell.height - pad, 4.2);
  let w = h * img.ratio;
  if (w > maxW) { w = maxW; h = w / img.ratio; }
  const x = cell.x + pad;
  const y = cell.y + (cell.height - h) / 2;
  try { doc.addImage(img.dataUrl, 'PNG', x, y, w, h); } catch { /* ignore draw errors */ }
}

const makeDeptResolver = (departments?: Department[]) => (deptId: string): string => {
  if (!departments || departments.length === 0) return deptId;
  const dept = departments.find((d) => d.id === deptId);
  return dept ? dept.name : deptId;
};

// ---------------------------------------------------------------------------
// Single source of truth: ONE jsPDF document builder used by BOTH the
// Download and Print actions, so the two outputs can never drift apart.
// ---------------------------------------------------------------------------
function buildAdmissionDoc(
  formData: AdmissionFormState,
  applicationId: string,
  departments?: Department[]
): jsPDF {
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
    doc.text(applicationId || '-', margin + 4, y + 11);
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

    const labelCell = (label: string) => ({
      content: label,
      styles: { fillColor: LABEL_BG, fontStyle: 'bold' as const, textColor: NAVY },
    });
    const valueCell = (f: Field, colSpan?: number) => {
      const cell: any = { content: f.value };
      if (colSpan) cell.colSpan = colSpan;
      // Blank the mojibake text and flag the cell so didDrawCell paints the
      // Bangla string as an image instead.
      if (f.bangla && f.value && f.value !== '-') {
        cell.content = '';
        cell._bangla = f.value;
      }
      return cell;
    };

    sections.forEach((section) => {
      const body: any[] = [];
      const fields = section.fields;
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (f.full) {
          body.push([labelCell(f.label), valueCell(f, 3)]);
        } else {
          const next = fields[i + 1];
          if (next && !next.full) {
            body.push([labelCell(f.label), valueCell(f), labelCell(next.label), valueCell(next)]);
            i++;
          } else {
            body.push([labelCell(f.label), valueCell(f, 3)]);
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
        didDrawCell: (data: any) => {
          const raw = data.cell.raw;
          if (raw && typeof raw === 'object' && raw._bangla) {
            drawBanglaInCell(doc, data.cell, raw._bangla as string);
          }
        },
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

    return doc;
}

// ---------------------------------------------------------------------------
// 1) DOWNLOAD — saves the shared jsPDF document to the user's device.
// ---------------------------------------------------------------------------
export function downloadAdmissionPDF(
  formData: AdmissionFormState,
  applicationId: string,
  departments?: Department[]
) {
  try {
    const doc = buildAdmissionDoc(formData, applicationId, departments);
    doc.save(`Admission-Form-${applicationId || 'application'}.pdf`);
    toast.success('Admission form downloaded');
  } catch (err) {
    console.error('Failed to generate admission PDF:', err);
    toast.error('Could not generate the PDF. Please try again.');
  }
}

// ---------------------------------------------------------------------------
// 2) PRINT — opens the EXACT same jsPDF document and triggers the print
//    dialog, so the printed form is pixel-identical to the downloaded one.
// ---------------------------------------------------------------------------
export function printAdmissionForm(
  formData: AdmissionFormState,
  applicationId: string,
  departments?: Department[]
) {
  try {
    const doc = buildAdmissionDoc(formData, applicationId, departments);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the application');
      return;
    }
    toast.success('Opening print dialog…');
  } catch (err) {
    console.error('Failed to generate admission PDF for printing:', err);
    toast.error('Could not open the print view. Please try again.');
  }
}


// Backwards-compatible alias (older callers used a single generator that printed).
export const generateAdmissionPDF = printAdmissionForm;
