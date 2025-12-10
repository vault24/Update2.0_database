import { AdmissionFormState } from './types';
import { toast } from 'sonner';

export function generateAdmissionPDF(formData: AdmissionFormState, applicationId: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Please allow popups to download PDF');
    return;
  }

  const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admission Application - ${applicationId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .header-logo {
            width: 100px;
            height: 100px;
            margin-bottom: 15px;
            object-fit: contain;
          }
          .header h1 {
            margin: 0;
            color: #333;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .app-id {
            background: #f0f0f0;
            padding: 15px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
          }
          .app-id strong {
            font-size: 20px;
            color: #333;
          }
          .section {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          .section-title {
            background: #333;
            color: white;
            padding: 10px 15px;
            margin-bottom: 15px;
            font-weight: bold;
            border-radius: 4px;
          }
          .field-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
          }
          .field {
            margin-bottom: 10px;
          }
          .field-label {
            font-weight: bold;
            color: #555;
            font-size: 12px;
            margin-bottom: 3px;
          }
          .field-value {
            color: #000;
            font-size: 14px;
            padding: 5px 0;
            border-bottom: 1px solid #ddd;
          }
          .full-width {
            grid-column: 1 / -1;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #333;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/spi-logo.png" alt="SPI Logo" class="header-logo" />
          <h1>SIRAJGANJ POLYTECHNIC INSTITUTE</h1>
          <p>Admission Application Form</p>
          <p>Academic Session: ${formData.session || 'N/A'}</p>
        </div>

        <div class="app-id">
          <strong>Application ID: ${applicationId}</strong>
          <p style="margin: 5px 0; color: #666;">Submitted on: ${new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="field-group">
            <div class="field">
              <div class="field-label">Full Name (Bangla)</div>
              <div class="field-value">${formData.fullNameBangla || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Full Name (English)</div>
              <div class="field-value">${formData.fullNameEnglish || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Father's Name</div>
              <div class="field-value">${formData.fatherName || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Father's NID</div>
              <div class="field-value">${formData.fatherNID || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Mother's Name</div>
              <div class="field-value">${formData.motherName || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Mother's NID</div>
              <div class="field-value">${formData.motherNID || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Date of Birth</div>
              <div class="field-value">${formData.dateOfBirth || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Gender</div>
              <div class="field-value">${formData.gender || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Blood Group</div>
              <div class="field-value">${formData.bloodGroup || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Religion</div>
              <div class="field-value">${formData.religion || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Nationality</div>
              <div class="field-value">${formData.nationality || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Marital Status</div>
              <div class="field-value">${formData.maritalStatus || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">NID Number</div>
              <div class="field-value">${formData.nid || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Birth Certificate No.</div>
              <div class="field-value">${formData.birthCertificate || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Contact Information</div>
          <div class="field-group">
            <div class="field">
              <div class="field-label">Mobile Number</div>
              <div class="field-value">${formData.mobile || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Email Address</div>
              <div class="field-value">${formData.email || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Guardian's Mobile</div>
              <div class="field-value">${formData.guardianMobile || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Present Address</div>
          <div class="field-group">
            <div class="field full-width">
              <div class="field-label">Address</div>
              <div class="field-value">${formData.presentAddress || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Division</div>
              <div class="field-value">${formData.presentDivision || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">District</div>
              <div class="field-value">${formData.presentDistrict || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Upazila</div>
              <div class="field-value">${formData.presentUpazila || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Police Station</div>
              <div class="field-value">${formData.presentPoliceStation || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Post Office</div>
              <div class="field-value">${formData.presentPostOffice || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Municipality/Union</div>
              <div class="field-value">${formData.presentMunicipalityUnion || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Village/Neighborhood</div>
              <div class="field-value">${formData.presentVillageNeighborhood || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Ward</div>
              <div class="field-value">${formData.presentWard || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Permanent Address</div>
          <div class="field-group">
            <div class="field full-width">
              <div class="field-label">Address</div>
              <div class="field-value">${formData.sameAsPresent ? 'Same as Present Address' : (formData.permanentAddress || 'N/A')}</div>
            </div>
            ${!formData.sameAsPresent ? `
            <div class="field">
              <div class="field-label">Division</div>
              <div class="field-value">${formData.permanentDivision || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">District</div>
              <div class="field-value">${formData.permanentDistrict || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Upazila</div>
              <div class="field-value">${formData.permanentUpazila || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Police Station</div>
              <div class="field-value">${formData.permanentPoliceStation || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Post Office</div>
              <div class="field-value">${formData.permanentPostOffice || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Municipality/Union</div>
              <div class="field-value">${formData.permanentMunicipalityUnion || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Village/Neighborhood</div>
              <div class="field-value">${formData.permanentVillageNeighborhood || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Ward</div>
              <div class="field-value">${formData.permanentWard || 'N/A'}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Educational Background (SSC/Equivalent)</div>
          <div class="field-group">
            <div class="field">
              <div class="field-label">Board</div>
              <div class="field-value">${formData.sscBoard || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Roll Number</div>
              <div class="field-value">${formData.sscRoll || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Passing Year</div>
              <div class="field-value">${formData.sscYear || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">GPA</div>
              <div class="field-value">${formData.sscGPA || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Group</div>
              <div class="field-value">${formData.sscGroup || 'N/A'}</div>
            </div>
            <div class="field full-width">
              <div class="field-label">Institution Name</div>
              <div class="field-value">${formData.sscInstitution || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Academic Information</div>
          <div class="field-group">
            <div class="field">
              <div class="field-label">Department</div>
              <div class="field-value">${formData.department || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Shift</div>
              <div class="field-value">${formData.shift || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Session</div>
              <div class="field-value">${formData.session || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Semester</div>
              <div class="field-value">${formData.semester || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Admission Type</div>
              <div class="field-value">${formData.admissionType || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Group</div>
              <div class="field-value">${formData.group || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Declaration:</strong> I hereby declare that all the information provided above is true and correct to the best of my knowledge.</p>
          <p style="margin-top: 40px;">_______________________</p>
          <p>Applicant's Signature</p>
          <p style="margin-top: 20px; font-size: 10px;">Generated on: ${new Date().toLocaleString('en-GB')}</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Print / Save as PDF</button>
        </div>
      </body>
      </html>
    `;

  printWindow.document.write(pdfContent);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 250);
}

