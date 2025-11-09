const fs = require('fs');
const path = require('path');

// Read coverage summary
const coverageSummary = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'coverage/coverage-summary.json'), 'utf8')
);

// Story mapping to frontend components
const storyMapping = {
  'User Management & Security': [
    'src/pages/Auth/Login.jsx',
    'src/pages/Auth/Register.jsx',
  ],
  'Room Management': [
    'src/pages/Rooms/RoomList.jsx',
    'src/pages/Rooms/RoomDetails.jsx',
    'src/pages/Rooms/ManageRooms.jsx'
  ],
  'Booking & Notifications': [
    'src/pages/Bookings/BookingForm.jsx',
    'src/pages/Bookings/BookingHistory.jsx',
    'src/pages/Bookings/ManageBookings.jsx'
  ]
};

// Calculate coverage per story
const storyCoverage = {};
Object.entries(storyMapping).forEach(([story, files]) => {
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalLines = 0;
  let coveredLines = 0;

  files.forEach(file => {
    if (coverageSummary[file]) {
      const coverage = coverageSummary[file];
      totalStatements += coverage.statements.total;
      coveredStatements += coverage.statements.covered;
      totalBranches += coverage.branches.total;
      coveredBranches += coverage.branches.covered;
      totalFunctions += coverage.functions.total;
      coveredFunctions += coverage.functions.covered;
      totalLines += coverage.lines.total;
      coveredLines += coverage.lines.covered;
    }
  });

  storyCoverage[story] = {
    statements: (coveredStatements / totalStatements * 100).toFixed(2),
    branches: (coveredBranches / totalBranches * 100).toFixed(2),
    functions: (coveredFunctions / totalFunctions * 100).toFixed(2),
    lines: (coveredLines / totalLines * 100).toFixed(2)
  };
});

// Generate markdown report
const report = `# Frontend Test Coverage Report by Story

## Coverage Thresholds
- Overall: 75%
- Components: 75%
- User Interactions: 80%

## Coverage Results

${Object.entries(storyCoverage)
  .map(([story, coverage]) => `
### ${story}
- Statements: ${coverage.statements}%
- Branches: ${coverage.branches}%
- Functions: ${coverage.functions}%
- Lines: ${coverage.lines}%
${Number(coverage.lines) >= 75 ? '✅' : '❌'} Coverage threshold ${Number(coverage.lines) >= 75 ? 'met' : 'not met'}
`)
  .join('\n')}
`;

fs.writeFileSync(path.join(__dirname, 'coverage/story-coverage.md'), report);
console.log('Frontend story coverage report generated!');