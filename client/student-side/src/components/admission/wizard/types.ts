export interface AdmissionFormState {
  fullNameBangla: string;
  fullNameEnglish: string;
  fatherName: string;
  fatherNID: string;
  motherName: string;
  motherNID: string;
  dateOfBirth: string;
  gender: string;
  religion: string;
  nationality: string;
  nid: string;
  birthCertificate: string;
  bloodGroup: string;
  maritalStatus: string;

  mobile: string;
  email: string;
  guardianMobile: string;
  presentAddress: string;
  presentDivision: string;
  presentDistrict: string;
  presentUpazila: string;
  presentPoliceStation: string;
  presentPostOffice: string;
  presentMunicipalityUnion: string;
  presentVillageNeighborhood: string;
  presentWard: string;
  permanentAddress: string;
  permanentDivision: string;
  permanentDistrict: string;
  permanentUpazila: string;
  permanentPoliceStation: string;
  permanentPostOffice: string;
  permanentMunicipalityUnion: string;
  permanentVillageNeighborhood: string;
  permanentWard: string;
  sameAsPresent: boolean;

  sscBoard: string;
  sscRoll: string;
  sscYear: string;
  sscGPA: string;
  sscGroup: string;
  sscInstitution: string;

  department: string;
  shift: string;
  session: string;
  semester: string;
  admissionType: string;
  group: string;

  photo: File | null;
  signature: File | null;
  sscMarksheet: File | null;
  sscCertificate: File | null;
  birthCertificateDoc: File | null;
  studentNIDCopy: File | null;
  fatherNIDFront: File | null;
  fatherNIDBack: File | null;
  motherNIDFront: File | null;
  motherNIDBack: File | null;
  testimonial: File | null;
  medicalCertificate: File | null;
  quotaDocument: File | null;
  extraCertificates: File | null;
}

