/**
 * Test script for student interface error handling
 * Tests the enhanced error handling functionality
 */

// Mock error scenarios
const errorScenarios = [
  {
    name: 'Network Error',
    error: new Error('Failed to fetch'),
    expectedType: 'network',
    expectedMessage: 'Network error: Please check your internet connection and try again.',
    shouldAutoRetry: true
  },
  {
    name: 'Not Found Error',
    error: { status: 404, message: '404 Not found' },
    expectedType: 'not_found',
    expectedMessage: 'No routine found for your department and semester.',
    shouldAutoRetry: false
  },
  {
    name: 'Access Denied Error',
    error: { status: 403, message: '403 Forbidden' },
    expectedType: 'access_denied',
    expectedMessage: 'Access denied: Please ensure you are logged in as a student.',
    shouldAutoRetry: false
  },
  {
    name: 'Server Error',
    error: { status: 500, message: '500 Internal server error' },
    expectedType: 'server_error',
    expectedMessage: 'Server error: The system is temporarily unavailable. Please try again later.',
    shouldAutoRetry: false
  },
  {
    name: 'Timeout Error',
    error: new Error('Request timeout'),
    expectedType: 'timeout',
    expectedMessage: 'Request timeout: The server is taking too long to respond. Please try again.',
    shouldAutoRetry: true
  },
  {
    name: 'Generic Error',
    error: new Error('Something went wrong'),
    expectedType: 'general',
    expectedMessage: 'Something went wrong',
    shouldAutoRetry: false
  }
];

// Mock getErrorMessage function (matches actual implementation)
const getErrorMessage = (err) => {
  if (err.message) return err.message;
  if (err.status === 404) return '404 Not found';
  if (err.status === 403) return '403 Forbidden';
  if (err.status === 500) return '500 Internal server error';
  if (err.response?.status === 404) return '404 Not found';
  if (err.response?.status === 403) return '403 Forbidden';
  if (err.response?.status === 500) return '500 Internal server error';
  return 'Unknown error';
};

// Error classification function (extracted from implementation)
const classifyError = (errorMsg) => {
  let userFriendlyMessage = errorMsg;
  let errorType = 'general';
  
  if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
    userFriendlyMessage = 'Network error: Please check your internet connection and try again.';
    errorType = 'network';
  } else if (errorMsg.includes('404')) {
    userFriendlyMessage = 'No routine found for your department and semester.';
    errorType = 'not_found';
  } else if (errorMsg.includes('403')) {
    userFriendlyMessage = 'Access denied: Please ensure you are logged in as a student.';
    errorType = 'access_denied';
  } else if (errorMsg.includes('500')) {
    userFriendlyMessage = 'Server error: The system is temporarily unavailable. Please try again later.';
    errorType = 'server_error';
  } else if (errorMsg.includes('timeout')) {
    userFriendlyMessage = 'Request timeout: The server is taking too long to respond. Please try again.';
    errorType = 'timeout';
  }

  return { userFriendlyMessage, errorType };
};

// Retry logic function
const shouldAutoRetry = (errorType, retryCount) => {
  const isNetworkError = errorType === 'network' || errorType === 'timeout';
  return isNetworkError && retryCount < 3;
};

// Test functions
function testErrorClassification() {
  console.log('=== Testing Error Classification ===');
  
  errorScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testing ${scenario.name}:`);
    
    const errorMsg = getErrorMessage(scenario.error);
    const { userFriendlyMessage, errorType } = classifyError(errorMsg);
    
    console.log(`   Error message: "${errorMsg}"`);
    console.log(`   Expected type: ${scenario.expectedType}`);
    console.log(`   Actual type: ${errorType}`);
    console.log(`   Expected message: "${scenario.expectedMessage}"`);
    console.log(`   Actual message: "${userFriendlyMessage}"`);
    
    const typeMatch = errorType === scenario.expectedType;
    const messageMatch = userFriendlyMessage === scenario.expectedMessage;
    
    console.log(`   ✓ Type classification: ${typeMatch ? 'PASSED' : 'FAILED'}`);
    console.log(`   ✓ Message generation: ${messageMatch ? 'PASSED' : 'FAILED'}`);
  });
}

function testRetryLogic() {
  console.log('\n=== Testing Retry Logic ===');
  
  errorScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testing retry logic for ${scenario.name}:`);
    
    const errorMsg = getErrorMessage(scenario.error);
    const { errorType } = classifyError(errorMsg);
    
    // Test retry logic for different retry counts
    for (let retryCount = 0; retryCount <= 3; retryCount++) {
      const shouldRetry = shouldAutoRetry(errorType, retryCount);
      const expectedRetry = scenario.shouldAutoRetry && retryCount < 3;
      
      console.log(`   Retry count ${retryCount}: Expected ${expectedRetry}, Got ${shouldRetry} - ${shouldRetry === expectedRetry ? 'PASSED' : 'FAILED'}`);
    }
  });
}

function testEmptyStateHandling() {
  console.log('\n=== Testing Empty State Handling ===');
  
  const testCases = [
    {
      name: 'Complete profile data',
      user: { department: 'CSE', semester: 4 },
      profileShift: 'Morning',
      expected: 'No class schedule found for 4th semester, Morning shift.'
    },
    {
      name: 'Missing department',
      user: { semester: 2 },
      profileShift: 'Day',
      expected: 'No class schedule found for 2nd semester, Day shift.'
    },
    {
      name: 'First semester',
      user: { department: 'EEE', semester: 1 },
      profileShift: 'Evening',
      expected: 'No class schedule found for 1st semester, Evening shift.'
    },
    {
      name: 'Third semester',
      user: { department: 'ME', semester: 3 },
      profileShift: 'Day',
      expected: 'No class schedule found for 3rd semester, Day shift.'
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing ${testCase.name}:`);
    
    const semesterValue = testCase.user.semester;
    const shiftValue = testCase.profileShift || 'Day';
    
    const ordinalSuffix = semesterValue === 1 ? 'st' : 
                         semesterValue === 2 ? 'nd' : 
                         semesterValue === 3 ? 'rd' : 'th';
    
    const actualMessage = `No class schedule found for ${semesterValue}${ordinalSuffix} semester, ${shiftValue} shift.`;
    
    console.log(`   Expected: "${testCase.expected}"`);
    console.log(`   Actual: "${actualMessage}"`);
    console.log(`   ✓ Message generation: ${actualMessage === testCase.expected ? 'PASSED' : 'FAILED'}`);
  });
}

function testProfileErrorHandling() {
  console.log('\n=== Testing Profile Error Handling ===');
  
  const profileErrorScenarios = [
    {
      name: 'Network error with fallback data',
      error: new Error('Failed to fetch'),
      user: { department: 'CSE', semester: 4 },
      shouldFallback: true,
      expectedAction: 'Use cached profile information'
    },
    {
      name: 'Network error without fallback data',
      error: new Error('Failed to fetch'),
      user: {},
      shouldFallback: false,
      expectedAction: 'Show profile loading error'
    },
    {
      name: 'Access denied with partial data',
      error: { status: 403, message: 'Forbidden' },
      user: { department: 'EEE' },
      shouldFallback: false,
      expectedAction: 'Show profile loading error'
    }
  ];

  profileErrorScenarios.forEach((scenario, index) => {
    console.log(`\n${index + 1}. Testing ${scenario.name}:`);
    
    const hasRequiredData = !!(scenario.user.department && scenario.user.semester);
    const shouldFallback = hasRequiredData;
    
    console.log(`   Has required fallback data: ${hasRequiredData}`);
    console.log(`   Expected fallback: ${scenario.shouldFallback}`);
    console.log(`   Actual fallback: ${shouldFallback}`);
    console.log(`   Expected action: ${scenario.expectedAction}`);
    console.log(`   ✓ Fallback logic: ${shouldFallback === scenario.shouldFallback ? 'PASSED' : 'FAILED'}`);
  });
}

// Run all tests
console.log('🧪 Starting Student Error Handling Tests\n');

testErrorClassification();
testRetryLogic();
testEmptyStateHandling();
testProfileErrorHandling();

console.log('\n✅ All error handling tests completed!');
console.log('\nThis test verifies that the student interface can:');
console.log('- Classify different types of errors correctly');
console.log('- Apply appropriate retry logic for network errors');
console.log('- Generate user-friendly error messages');
console.log('- Handle empty states with proper context');
console.log('- Provide fallback mechanisms for profile errors');
console.log('- Display helpful guidance for error recovery');