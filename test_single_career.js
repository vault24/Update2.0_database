/**
 * Test single career addition to debug the issue
 */

const API_BASE = 'http://127.0.0.1:8000/api';
const ALUMNI_ID = '26cda5ed-75e6-445a-9d5e-ce752caada58';

async function testSingleCareer() {
  console.log('🔍 Testing Single Career Addition...\n');
  
  // First, get current state
  console.log('📊 Current State:');
  try {
    const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/`);
    const alumni = await response.json();
    console.log(`Current Career Count: ${alumni.careerHistory.length}`);
    if (alumni.careerHistory.length > 0) {
      console.log(`Latest Career: ${alumni.careerHistory[0].positionTitle} at ${alumni.careerHistory[0].organizationName}`);
    }
  } catch (error) {
    console.log('❌ Failed to get current state:', error.message);
    return;
  }
  
  // Test adding a job with all fields
  console.log('\n📝 Adding Job Career with All Fields...');
  const jobData = {
    positionType: 'job',
    organizationName: 'New Test Company',
    positionTitle: 'Full Stack Developer',
    startDate: '2024-12-16',
    isCurrent: true,
    description: 'Working on full stack development projects',
    location: 'Dhaka, Bangladesh',
    salary: '120000 BDT'
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
        console.log('✅ Correct career entry returned');
      } else {
        console.log('❌ Wrong career entry returned');
        console.log(`Expected: ${jobData.positionTitle} at ${jobData.organizationName}`);
        console.log(`Got: ${latestCareer.positionTitle} at ${latestCareer.organizationName}`);
      }
      
    } else {
      const error = await response.json();
      console.log('❌ Failed to add career:', error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

// Run the test
testSingleCareer().catch(console.error);