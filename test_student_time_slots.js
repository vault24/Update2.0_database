/**
 * Test script for student interface time slot generation
 * Tests the improved time slot generation functionality
 */

// Mock routine data with various time formats
const mockRoutineData = [
  {
    id: '1',
    day_of_week: 'Sunday',
    start_time: '08:00:00',
    end_time: '08:45:00',
    subject_name: 'Mathematics',
    subject_code: 'MATH101',
    room_number: 'Room 101',
    shift: 'Morning',
    teacher: {
      fullNameEnglish: 'Dr. John Smith'
    }
  },
  {
    id: '2',
    day_of_week: 'Sunday',
    start_time: '08:45:00',
    end_time: '09:30:00',
    subject_name: 'Physics',
    subject_code: 'PHY101',
    room_number: 'Room 102',
    shift: 'Morning',
    teacher: {
      fullNameEnglish: 'Dr. Jane Doe'
    }
  },
  {
    id: '3',
    day_of_week: 'Monday',
    start_time: '13:30:00',
    end_time: '14:15:00',
    subject_name: 'Chemistry',
    subject_code: 'CHEM101',
    room_number: 'Lab 201',
    shift: 'Day',
    teacher: {
      fullNameEnglish: 'Prof. Alice Johnson'
    }
  },
  {
    id: '4',
    day_of_week: 'Monday',
    start_time: '14:15:00',
    end_time: '15:00:00',
    subject_name: 'English',
    subject_code: 'ENG101',
    room_number: 'Room 103',
    shift: 'Day',
    teacher: {
      fullNameEnglish: 'Ms. Sarah Wilson'
    }
  }
];

// Mock invalid routine data
const invalidRoutineData = [
  {
    id: '5',
    day_of_week: 'Tuesday',
    start_time: '', // Invalid empty time
    end_time: '10:00:00',
    subject_name: 'Invalid Subject',
    subject_code: 'INV101',
    room_number: 'Room 999',
    shift: 'Morning'
  },
  {
    id: '6',
    day_of_week: 'Wednesday',
    start_time: '15:00:00',
    end_time: '14:00:00', // Invalid: end before start
    subject_name: 'Another Invalid',
    subject_code: 'INV102',
    room_number: 'Room 998',
    shift: 'Day'
  }
];

// Time slot utility functions (copied from implementation)
const timeSlotUtils = {
  timeToMinutes: (time) => {
    if (!time || typeof time !== 'string') return 0;
    const parts = time.split(':');
    if (parts.length < 2) return 0;
    const [h, m] = parts.map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  },

  formatTime: (time) => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const [h, m] = parts;
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  },

  generateTimeSlots: (routines) => {
    const timePeriods = new Set();
    
    routines.forEach(routine => {
      if (routine.start_time && routine.end_time) {
        // Validate time slot before adding
        if (timeSlotUtils.validateTimeSlot(routine.start_time, routine.end_time)) {
          const startTime = timeSlotUtils.formatTime(routine.start_time);
          const endTime = timeSlotUtils.formatTime(routine.end_time);
          timePeriods.add(`${startTime}-${endTime}`);
        }
      }
    });

    const sortedSlots = Array.from(timePeriods)
      .filter(slot => slot && slot.includes('-'))
      .sort((a, b) => {
        const [aStart] = a.split('-');
        const [bStart] = b.split('-');
        return timeSlotUtils.timeToMinutes(aStart) - timeSlotUtils.timeToMinutes(bStart);
      });

    return sortedSlots;
  },

  generateFallbackTimeSlots: (shift) => {
    const fallbackSlots = {
      Morning: [
        '08:00-08:45',
        '08:45-09:30',
        '09:30-10:15',
        '10:15-11:00',
        '11:00-11:45',
        '11:45-12:30',
        '12:30-13:15',
      ],
      Day: [
        '13:30-14:15',
        '14:15-15:00',
        '15:00-15:45',
        '15:45-16:30',
        '16:30-17:15',
        '17:15-18:00',
        '18:00-18:45',
      ],
      Evening: [
        '18:30-19:15',
        '19:15-20:00',
        '20:00-20:45',
        '20:45-21:30',
      ],
    };
    
    return fallbackSlots[shift] || fallbackSlots.Day;
  },

  validateTimeSlot: (startTime, endTime) => {
    // Check for empty or invalid strings
    if (!startTime || !endTime || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return false;
    }
    
    // Check if strings contain valid time format
    if (!startTime.includes(':') || !endTime.includes(':')) {
      return false;
    }
    
    const start = timeSlotUtils.timeToMinutes(startTime);
    const end = timeSlotUtils.timeToMinutes(endTime);
    
    // Validate that start is before end and both are within valid 24-hour range
    return start < end && start >= 0 && end <= 24 * 60 && start !== 0 && end !== 0;
  }
};

// Test functions
function testTimeSlotGeneration() {
  console.log('=== Testing Time Slot Generation ===');
  
  // Test 1: Valid routine data
  console.log('\n1. Testing with valid routine data:');
  const timeSlots = timeSlotUtils.generateTimeSlots(mockRoutineData);
  console.log('Generated time slots:', timeSlots);
  console.log('Expected: 4 unique time slots');
  console.log('Actual:', timeSlots.length, 'time slots');
  console.log('✓ Test 1:', timeSlots.length === 4 ? 'PASSED' : 'FAILED');

  // Test 2: Empty routine data
  console.log('\n2. Testing with empty routine data:');
  const emptySlots = timeSlotUtils.generateTimeSlots([]);
  console.log('Generated time slots:', emptySlots);
  console.log('Expected: 0 time slots');
  console.log('Actual:', emptySlots.length, 'time slots');
  console.log('✓ Test 2:', emptySlots.length === 0 ? 'PASSED' : 'FAILED');

  // Test 3: Invalid routine data
  console.log('\n3. Testing with invalid routine data:');
  const invalidSlots = timeSlotUtils.generateTimeSlots(invalidRoutineData);
  console.log('Generated time slots:', invalidSlots);
  console.log('Expected: 0 time slots (all invalid)');
  console.log('Actual:', invalidSlots.length, 'time slots');
  console.log('✓ Test 3:', invalidSlots.length === 0 ? 'PASSED' : 'FAILED');

  // Test 4: Mixed valid and invalid data
  console.log('\n4. Testing with mixed valid and invalid data:');
  const mixedData = [...mockRoutineData, ...invalidRoutineData];
  const mixedSlots = timeSlotUtils.generateTimeSlots(mixedData);
  console.log('Generated time slots:', mixedSlots);
  console.log('Expected: 4 time slots (only valid ones)');
  console.log('Actual:', mixedSlots.length, 'time slots');
  console.log('✓ Test 4:', mixedSlots.length === 4 ? 'PASSED' : 'FAILED');
}

function testFallbackTimeSlots() {
  console.log('\n=== Testing Fallback Time Slots ===');
  
  // Test Morning shift
  console.log('\n1. Testing Morning shift fallback:');
  const morningSlots = timeSlotUtils.generateFallbackTimeSlots('Morning');
  console.log('Morning slots:', morningSlots.length, 'slots');
  console.log('First slot:', morningSlots[0]);
  console.log('Last slot:', morningSlots[morningSlots.length - 1]);
  console.log('✓ Morning test:', morningSlots.length === 7 ? 'PASSED' : 'FAILED');

  // Test Day shift
  console.log('\n2. Testing Day shift fallback:');
  const daySlots = timeSlotUtils.generateFallbackTimeSlots('Day');
  console.log('Day slots:', daySlots.length, 'slots');
  console.log('First slot:', daySlots[0]);
  console.log('Last slot:', daySlots[daySlots.length - 1]);
  console.log('✓ Day test:', daySlots.length === 7 ? 'PASSED' : 'FAILED');

  // Test Evening shift
  console.log('\n3. Testing Evening shift fallback:');
  const eveningSlots = timeSlotUtils.generateFallbackTimeSlots('Evening');
  console.log('Evening slots:', eveningSlots.length, 'slots');
  console.log('First slot:', eveningSlots[0]);
  console.log('Last slot:', eveningSlots[eveningSlots.length - 1]);
  console.log('✓ Evening test:', eveningSlots.length === 4 ? 'PASSED' : 'FAILED');

  // Test unknown shift (should default to Day)
  console.log('\n4. Testing unknown shift (should default to Day):');
  const unknownSlots = timeSlotUtils.generateFallbackTimeSlots('Unknown');
  console.log('Unknown shift slots:', unknownSlots.length, 'slots');
  console.log('✓ Unknown shift test:', unknownSlots.length === 7 ? 'PASSED' : 'FAILED');
}

function testTimeValidation() {
  console.log('\n=== Testing Time Validation ===');
  
  const testCases = [
    { start: '08:00:00', end: '08:45:00', expected: true, desc: 'Valid morning time' },
    { start: '13:30:00', end: '14:15:00', expected: true, desc: 'Valid afternoon time' },
    { start: '08:45:00', end: '08:00:00', expected: false, desc: 'End before start' },
    { start: '', end: '08:45:00', expected: false, desc: 'Empty start time' },
    { start: '08:00:00', end: '', expected: false, desc: 'Empty end time' },
    { start: '25:00:00', end: '26:00:00', expected: false, desc: 'Invalid hours' },
    { start: '23:30:00', end: '23:45:00', expected: true, desc: 'Late evening time' }
  ];

  testCases.forEach((testCase, index) => {
    const result = timeSlotUtils.validateTimeSlot(testCase.start, testCase.end);
    const passed = result === testCase.expected;
    console.log(`${index + 1}. ${testCase.desc}: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Start: ${testCase.start}, End: ${testCase.end}, Expected: ${testCase.expected}, Got: ${result}`);
  });
}

function testTimeFormatting() {
  console.log('\n=== Testing Time Formatting ===');
  
  const testCases = [
    { input: '08:00:00', expected: '08:00', desc: 'Standard format with seconds' },
    { input: '8:0:0', expected: '08:00', desc: 'Single digit format' },
    { input: '13:30:45', expected: '13:30', desc: 'Afternoon with seconds' },
    { input: '08:00', expected: '08:00', desc: 'Already formatted' },
    { input: '', expected: '', desc: 'Empty string' },
    { input: null, expected: '', desc: 'Null input' }
  ];

  testCases.forEach((testCase, index) => {
    const result = timeSlotUtils.formatTime(testCase.input);
    const passed = result === testCase.expected;
    console.log(`${index + 1}. ${testCase.desc}: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`   Input: "${testCase.input}", Expected: "${testCase.expected}", Got: "${result}"`);
  });
}

// Run all tests
console.log('🧪 Starting Student Time Slot Generation Tests\n');

testTimeSlotGeneration();
testFallbackTimeSlots();
testTimeValidation();
testTimeFormatting();

console.log('\n✅ All tests completed!');
console.log('\nThis test verifies that the student interface can:');
console.log('- Generate time slots dynamically from routine data');
console.log('- Handle invalid or missing time data gracefully');
console.log('- Provide fallback time slots for consistency');
console.log('- Validate time formats properly');
console.log('- Format times consistently across interfaces');