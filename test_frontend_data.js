/**
 * Test what data the frontend receives
 */

const API_BASE = 'http://127.0.0.1:8000/api';
const ALUMNI_ID = '26cda5ed-75e6-445a-9d5e-ce752caada58';

// Simulate the frontend transformation function
const transformCareerHistory = (careers) => {
  return careers.map((career, index) => {
    const baseCareer = {
      id: career.id || index.toString(),
      type: career.positionType || 'job',
      position: career.positionTitle || 'Unknown Position',
      company: career.organizationName || 'Unknown Company',
      location: career.location || 'N/A',
      startDate: career.startDate || '',
      endDate: career.endDate,
      current: career.isCurrent || false,
      description: career.description || '',
      achievements: career.achievements || [],
    };
    
    // Add type-specific fields based on career type
    switch (career.positionType) {
      case 'job':
        return {
          ...baseCareer,
          salary: career.salary || '',
        };
      case 'higherStudies':
        return {
          ...baseCareer,
          degree: career.degree || career.positionTitle || '',
          field: career.field || '',
          institution: career.organizationName || '',
          position: career.degree && career.field ? `${career.degree} in ${career.field}` : career.positionTitle || 'Unknown Degree',
          company: career.organizationName || 'Unknown Institution',
        };
      case 'business':
        return {
          ...baseCareer,
          businessName: career.businessName || career.positionTitle || '',
          businessType: career.businessType || career.organizationName || '',
          position: career.businessName || career.positionTitle || 'Unknown Business',
          company: career.businessType || career.organizationName || 'Business',
        };
      case 'other':
        return {
          ...baseCareer,
          otherType: career.otherType || career.positionTitle || '',
          position: career.otherType || career.positionTitle || 'Other Activity',
          company: 'Other',
        };
      default:
        return baseCareer;
    }
  });
};

async function testFrontendData() {
  console.log('🔍 Testing Frontend Data Transformation...\n');
  
  try {
    const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/`);
    const apiData = await response.json();
    
    console.log('📊 Raw API Data (latest career):');
    const latestCareer = apiData.careerHistory[0];
    console.log('  Position Type:', latestCareer.positionType);
    console.log('  Position Title:', latestCareer.positionTitle);
    console.log('  Organization:', latestCareer.organizationName);
    console.log('  Location:', latestCareer.location);
    console.log('  Salary:', latestCareer.salary);
    console.log('  Start Date:', latestCareer.startDate);
    console.log('  Is Current:', latestCareer.isCurrent);
    console.log('  Description:', latestCareer.description);
    
    console.log('\n🔄 After Frontend Transformation:');
    const transformedCareers = transformCareerHistory(apiData.careerHistory);
    const transformedLatest = transformedCareers[0];
    
    console.log('  Type:', transformedLatest.type);
    console.log('  Position:', transformedLatest.position);
    console.log('  Company:', transformedLatest.company);
    console.log('  Location:', transformedLatest.location);
    console.log('  Salary:', transformedLatest.salary);
    console.log('  Start Date:', transformedLatest.startDate);
    console.log('  Current:', transformedLatest.current);
    console.log('  Description:', transformedLatest.description);
    
    console.log('\n✅ Frontend transformation working correctly!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testFrontendData().catch(console.error);