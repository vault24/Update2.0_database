/**
 * Test career addition with future date
 */

const API_BASE = 'http://127.0.0.1:8000/api';
const ALUMNI_ID = '26cda5ed-75e6-445a-9d5e-ce752caada58';

async function testFutureCareer() {
  console.log('🔍 Testing Career Addition with Future Date...\n');
  
  // Test adding a job with future date
  console.log('📝 Adding Job Career with Future Date...');
  const jobData = {
    positionType: 'job',
    organizationName: 'Future Tech Company',
    positionTitle: 'Senior Software Architect',
    startDate: '2025-01-15', // Future date
    isCurrent: true,
    description: 'Leading software architecture initiatives',
    location: 'San Francisco, USA',
    salary: '200000 USD'
  };
  
  console.log('Sending data:', JSON.stringify(jobData, null, 2));
  
  try {
    const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/add_career_position/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jobData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Career added successfully');
      
      // Check the latest career entry
      const latestCareer = result.careerHistory[0];
      console.log('\n📋 Latest Career Entry:');
      console.log(`  ID: ${latestCareer.id || 'Not set'}`);
      console.log(`  Position Type: ${latestCareer.positionType}`);
      console.log(`  Organization: ${latestCareer.organizationName}`);
      console.log(`  Position Title: ${latestCareer.positionTitle}`);
      console.log(`  Start Date: ${latestCareer.startDate}`);
      console.log(`  Location: ${latestCareer.location || 'Not set'}`);
      console.log(`  Salary: ${latestCareer.salary || 'Not set'}`);
      console.log(`  Description: ${latestCareer.description || 'Not set'}`);
      console.log(`  Is Current: ${latestCareer.isCurrent}`);
      
      console.log(`\n📊 Total Careers: ${result.careerHistory.length}`);
      
      // Verify it's actually the new entry
      if (latestCareer.positionTitle === jobData.positionTitle && 
          latestCareer.organizationName === jobData.organizationName) {
        console.log('✅ Correct career entry returned - NEW ENTRY IS LATEST');
      } else {
        console.log('❌ Wrong career entry returned');
        console.log(`Expected: ${jobData.positionTitle} at ${jobData.organizationName}`);
        console.log(`Got: ${latestCareer.positionTitle} at ${latestCareer.organizationName}`);
      }
      
      // Show first few careers to verify sorting
      console.log('\n📋 First 3 Career Entries (should be sorted newest first):');
      result.careerHistory.slice(0, 3).forEach((career, index) => {
        console.log(`  ${index + 1}. ${career.positionTitle} at ${career.organizationName} (${career.startDate})`);
      });
      
    } else {
      const error = await response.json();
      console.log('❌ Failed to add career:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Run the test
testFutureCareer().catch(console.error);