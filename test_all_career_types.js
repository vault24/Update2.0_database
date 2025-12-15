/**
 * Test all career types with their specific fields
 */

const API_BASE = 'http://127.0.0.1:8000/api';
const ALUMNI_ID = '26cda5ed-75e6-445a-9d5e-ce752caada58';

async function testAllCareerTypes() {
  console.log('🔍 Testing All Career Types with Specific Fields...\n');
  
  const careerTests = [
    {
      name: 'Job Holder',
      data: {
        positionType: 'job',
        organizationName: 'Google Inc',
        positionTitle: 'Senior Software Engineer',
        startDate: '2025-02-01',
        isCurrent: true,
        description: 'Working on cloud infrastructure',
        location: 'Mountain View, CA',
        salary: '180000 USD'
      },
      expectedFields: ['salary', 'location']
    },
    {
      name: 'Higher Studies',
      data: {
        positionType: 'higherStudies',
        organizationName: 'Stanford University',
        positionTitle: 'PhD in Artificial Intelligence',
        startDate: '2025-03-01',
        isCurrent: true,
        description: 'Research in machine learning',
        location: 'Stanford, CA',
        degree: 'PhD',
        field: 'Artificial Intelligence',
        institution: 'Stanford University'
      },
      expectedFields: ['degree', 'field', 'institution', 'location']
    },
    {
      name: 'Business',
      data: {
        positionType: 'business',
        organizationName: 'Tech Startup',
        positionTitle: 'AI Solutions Inc',
        startDate: '2025-04-01',
        isCurrent: true,
        description: 'Founded an AI consulting company',
        location: 'San Francisco, CA',
        businessName: 'AI Solutions Inc',
        businessType: 'AI Consulting'
      },
      expectedFields: ['businessName', 'businessType', 'location']
    },
    {
      name: 'Other',
      data: {
        positionType: 'other',
        organizationName: 'Freelance',
        positionTitle: 'Independent Consultant',
        startDate: '2025-05-01',
        isCurrent: true,
        description: 'Providing independent consulting services',
        location: 'Remote',
        otherType: 'Independent Consultant'
      },
      expectedFields: ['otherType', 'location']
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
        const latestCareer = result.careerHistory[0];
        
        console.log(`✅ ${test.name} added successfully`);
        console.log(`   Position: ${latestCareer.positionTitle}`);
        console.log(`   Organization: ${latestCareer.organizationName}`);
        console.log(`   Start Date: ${latestCareer.startDate}`);
        
        // Check type-specific fields
        let allFieldsPresent = true;
        for (const field of test.expectedFields) {
          const value = latestCareer[field];
          if (value && value !== '') {
            console.log(`   ${field}: ${value} ✅`);
          } else {
            console.log(`   ${field}: MISSING ❌`);
            allFieldsPresent = false;
          }
        }
        
        if (allFieldsPresent) {
          console.log(`   🎉 All ${test.name} fields present!`);
        } else {
          console.log(`   ⚠️  Some ${test.name} fields missing`);
        }
        
      } else {
        const error = await response.json();
        console.log(`❌ ${test.name} failed:`, error);
      }
    } catch (error) {
      console.log(`❌ ${test.name} network error:`, error.message);
    }
  }
  
  // Final verification
  console.log('\n📊 Final Verification - Latest 4 Careers:');
  try {
    const response = await fetch(`${API_BASE}/alumni/${ALUMNI_ID}/`);
    const alumni = await response.json();
    
    alumni.careerHistory.slice(0, 4).forEach((career, index) => {
      console.log(`  ${index + 1}. ${career.positionTitle} (${career.positionType}) - ${career.startDate}`);
      if (career.location) console.log(`     Location: ${career.location}`);
      if (career.salary) console.log(`     Salary: ${career.salary}`);
      if (career.degree) console.log(`     Degree: ${career.degree}`);
      if (career.field) console.log(`     Field: ${career.field}`);
      if (career.businessName) console.log(`     Business: ${career.businessName}`);
      if (career.otherType) console.log(`     Type: ${career.otherType}`);
    });
    
  } catch (error) {
    console.log('❌ Failed to get final state:', error.message);
  }
}

// Run the test
testAllCareerTypes().catch(console.error);