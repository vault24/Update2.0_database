/**
 * Test script to identify career addition issues
 */

const API_BASE = 'http://127.0.0.1:8000/api';
const ALUMNI_ID = '26cda5ed-75e6-445a-9d5e-ce752caada58';

async function testCareerAddition() {
  console.log('🔍 Testing Career Addition Issues...\n');
  
  // Test different career types
  const careerTests = [
    {
      name: 'Job Holder',
      data: {
        positionType: 'job',
        organizationName: 'Test Company',
        positionTitle: 'Senior Developer',
        startDate: '2024-12-15',
        isCurrent: true,
        description: 'Working as a senior developer',
        location: 'Dhaka, Bangladesh',
        salary: '100000 BDT'
      }
    },
    {
      name: 'Higher Studies',
      data: {
        positionType: 'higherStudies',
        organizationName: 'MIT',
        positionTitle: 'PhD in Computer Science',
        startDate: '2024-01-01',
        isCurrent: true,
        description: 'Research in AI',
        location: 'Boston, USA',
        degree: 'PhD',
        field: 'Computer Science',
        institution: 'MIT'
      }
    },
    {
      name: 'Business',
      data: {
        positionType: 'business',
        organizationName: 'Tech Startup',
        positionTitle: 'TechCorp Solutions',
        startDate: '2023-06-01',
        isCurrent: false,
        endDate: '2024-05-31',
        description: 'Founded a tech startup',
        location: 'Dhaka, Bangladesh',
        businessName: 'TechCorp Solutions',
        businessType: 'Software Development'
      }
    },
    {
      name: 'Other',
      data: {
        positionType: 'other',
        organizationName: 'Freelance',
        positionTitle: 'Freelance Consultant',
        startDate: '2023-01-01',
        isCurrent: false,
        endDate: '2023-12-31',
        description: 'Providing consulting services',
        location: 'Remote',
        otherType: 'Freelance Consultant'
      }
    }
  ];
  
  for (const test of careerTests) {
    console.log(`\n📝 Testing ${test.name}...`);
    
    try {
      const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/add_career_position/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${test.name} added successfully`);
        
        // Check if all fields are preserved
        const latestCareer = result.careerHistory[0]; // Should be the most recent
        console.log(`   Position Type: ${latestCareer.positionType}`);
        console.log(`   Organization: ${latestCareer.organizationName}`);
        console.log(`   Position Title: ${latestCareer.positionTitle}`);
        console.log(`   Start Date: ${latestCareer.startDate}`);
        console.log(`   Location: ${latestCareer.location || 'Not set'}`);
        
        // Check type-specific fields
        if (test.data.positionType === 'job') {
          console.log(`   Salary: ${latestCareer.salary || 'Not set'}`);
        } else if (test.data.positionType === 'higherStudies') {
          console.log(`   Degree: ${latestCareer.degree || 'Not set'}`);
          console.log(`   Field: ${latestCareer.field || 'Not set'}`);
          console.log(`   Institution: ${latestCareer.institution || 'Not set'}`);
        } else if (test.data.positionType === 'business') {
          console.log(`   Business Name: ${latestCareer.businessName || 'Not set'}`);
          console.log(`   Business Type: ${latestCareer.businessType || 'Not set'}`);
        } else if (test.data.positionType === 'other') {
          console.log(`   Other Type: ${latestCareer.otherType || 'Not set'}`);
        }
        
        console.log(`   Total Careers: ${result.careerHistory.length}`);
        
        // Check sorting (most recent first)
        if (result.careerHistory.length > 1) {
          const dates = result.careerHistory.map(c => c.startDate);
          console.log(`   Career dates (should be newest first): ${dates.join(', ')}`);
        }
        
      } else {
        const error = await response.json();
        console.log(`❌ ${test.name} failed:`, error);
      }
    } catch (error) {
      console.log(`❌ ${test.name} network error:`, error.message);
    }
  }
  
  // Get final state
  console.log('\n📊 Final Alumni State...');
  try {
    const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/`);
    const alumni = await response.json();
    
    console.log(`Total Career Entries: ${alumni.careerHistory.length}`);
    console.log('Career History (should be sorted by date, newest first):');
    alumni.careerHistory.forEach((career, index) => {
      console.log(`  ${index + 1}. ${career.positionTitle} at ${career.organizationName} (${career.startDate})`);
    });
    
  } catch (error) {
    console.log('❌ Failed to get final state:', error.message);
  }
}

// Run the test
testCareerAddition().catch(console.error);