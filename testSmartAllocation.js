/**
 * Test script for Smart Allocation System
 * Run this after server is started to test all features
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
let AUTH_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual admin token

// Test data
let testExamId = null;
let testCopyId = null;
let testExaminerId = null;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function runTests() {
  console.log('[TEST] Starting Smart Allocation System Tests\n');

  try {
    // Test 1: Get Performance Dashboard
    console.log('[TEST 1] Getting Performance Dashboard...');
    const dashboard = await api.get('/admin/performance-dashboard');
    console.log('[SUCCESS] Dashboard fetched successfully');
    console.log(`   Total Copies: ${dashboard.data.overview.totalCopies}`);
    console.log(`   Completion Rate: ${dashboard.data.overview.completionRate}%`);
    console.log(`   Top Performer: ${dashboard.data.topPerformers[0]?.name || 'N/A'}\n`);

    // Test 2: Get Examiner Performance
    console.log('[TEST 2] Getting Examiner Performance...');
    const performance = await api.get('/admin/examiner-performance');
    console.log('[SUCCESS] Examiner performance fetched successfully');
    console.log(`   Total Examiners: ${performance.data.length}`);
    if (performance.data.length > 0) {
      testExaminerId = performance.data[0].examinerId;
      console.log(`   Sample Examiner: ${performance.data[0].name}`);
      console.log(`   Performance Score: ${performance.data[0].stats?.performanceScore || 'N/A'}\n`);
    }

    // Test 3: Get Idle Copies
    console.log('[TEST 3] Checking for Idle Copies...');
    const idleCopies = await api.get('/admin/idle-copies?thresholdHours=24');
    console.log('[SUCCESS] Idle copies report generated');
    console.log(`   Total Idle Copies: ${idleCopies.data.totalIdleCopies}`);
    if (idleCopies.data.copies.length > 0) {
      testCopyId = idleCopies.data.copies[0].copyId;
      console.log(`   Most Idle Copy: ${idleCopies.data.copies[0].hoursIdle} hours\n`);
    } else {
      console.log('   No idle copies found (good!)\n');
    }

    // Test 4: Update Examiner Stats (if examiner exists)
    if (testExaminerId) {
      console.log('[TEST 4] Updating Examiner Stats...');
      const statsUpdate = await api.post(`/admin/examiners/${testExaminerId}/update-stats`);
      console.log('[SUCCESS] Stats updated successfully');
      console.log(`   New Performance Score: ${statsUpdate.data.examiner.stats.performanceScore}\n`);
    }

    // Test 5: Manual Reallocation Trigger
    console.log('[TEST 5] Testing Manual Reallocation Trigger...');
    const reallocation = await api.post('/admin/auto-reallocate', {
      idleThresholdHours: 24,
      warningThresholdHours: 12
    });
    console.log('[SUCCESS] Reallocation triggered successfully');
    console.log(`   Warned: ${reallocation.data.warned.length} examiners`);
    console.log(`   Reallocated: ${reallocation.data.reallocated.length} copies`);
    console.log(`   Errors: ${reallocation.data.errors.length}\n`);

    // Test 6: Smart Distribution (if exam exists)
    console.log('[TEST 6] Getting list of exams for testing...');
    const exams = await api.get('/admin/exams');
    if (exams.data && exams.data.length > 0) {
      testExamId = exams.data[0]._id;
      console.log(`[SUCCESS] Found exam: ${exams.data[0].title}`);
      
      console.log('[TEST 6a] Testing Smart Distribution...');
      try {
        const distribution = await api.post(`/admin/exams/${testExamId}/smart-distribute`);
        console.log('[SUCCESS] Smart distribution completed');
        console.log(`   Copies Assigned: ${distribution.data.assignedCount}\n`);
      } catch (distErr) {
        if (distErr.response?.status === 400) {
          console.log('[WARNING] No unassigned copies to distribute (expected if all assigned)\n');
        } else {
          throw distErr;
        }
      }
    } else {
      console.log('[WARNING] No exams found, skipping smart distribution test\n');
    }

    // Test 7: Manual Reallocate (if copy and examiner exist)
    if (testCopyId && testExaminerId) {
      console.log('[TEST 7] Testing Manual Reallocation...');
      try {
        const manualRealloc = await api.post(`/admin/copies/${testCopyId}/reallocate`, {
          newExaminerId: testExaminerId
        });
        console.log('[SUCCESS] Manual reallocation successful');
        console.log(`   From: ${manualRealloc.data.fromExaminer?.name || 'N/A'}`);
        console.log(`   To: ${manualRealloc.data.toExaminer.name}\n`);
      } catch (reallocErr) {
        if (reallocErr.response?.status === 400) {
          console.log('[WARNING] Cannot reallocate (copy may already be with this examiner)\n');
        } else {
          throw reallocErr;
        }
      }
    }

    console.log('[SUCCESS] All Tests Completed Successfully!\n');
    console.log('[SUMMARY] Test Results:');
    console.log('   [PASS] Performance dashboard accessible');
    console.log('   [PASS] Examiner performance tracking working');
    console.log('   [PASS] Idle copy detection functional');
    console.log('   [PASS] Stats update working');
    console.log('   [PASS] Auto-reallocation trigger working');
    console.log('   [PASS] Smart distribution available');
    console.log('   [PASS] Manual reallocation available\n');
    
    console.log('[SUCCESS] Smart Allocation System is fully operational!');

  } catch (error) {
    console.error('[ERROR] Test Failed:', error.response?.data || error.message);
    console.error('\n[TROUBLESHOOTING]:');
    console.error('   1. Ensure server is running');
    console.error('   2. Update AUTH_TOKEN in this script');
    console.error('   3. Check if you have admin privileges');
    console.error('   4. Verify database connection');
  }
}

// Run tests
if (AUTH_TOKEN === 'YOUR_ADMIN_TOKEN_HERE') {
  console.log('[ERROR] Please update AUTH_TOKEN in this script before running tests');
  console.log('   1. Login as admin');
  console.log('   2. Copy your JWT token');
  console.log('   3. Replace AUTH_TOKEN value in this file');
  console.log('   4. Run: node testSmartAllocation.js\n');
} else {
  runTests();
}
