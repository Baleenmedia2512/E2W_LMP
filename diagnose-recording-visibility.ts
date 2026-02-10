/**
 * Diagnostic Script: Check Recording Visibility Issues
 * 
 * Run this to diagnose why recordings aren't showing in LMS
 * 
 * Usage: node diagnose-recording-visibility.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseRecordingIssues() {
  console.log('🔍 Diagnosing Recording Visibility Issues...\n');

  try {
    // Check 1: Recent call logs
    console.log('📊 Check 1: Recent Call Logs');
    console.log('─'.repeat(80));
    
    const recentCalls = await prisma.callLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        Lead: { select: { name: true, phone: true } },
        User: { select: { name: true } },
      },
    });

    if (recentCalls.length === 0) {
      console.log('❌ No call logs found in database\n');
    } else {
      console.log(`✅ Found ${recentCalls.length} recent calls\n`);
      
      recentCalls.forEach((call, index) => {
        console.log(`Call ${index + 1}:`);
        console.log(`  Lead: ${call.Lead.name} (${call.Lead.phone})`);
        console.log(`  Caller: ${call.User.name}`);
        console.log(`  Date: ${call.createdAt.toLocaleString()}`);
        console.log(`  Duration: ${call.duration || 0}s`);
        console.log(`  Status: ${call.callStatus}`);
        console.log(`  Recording Status: ${call.recordingStatus || 'NOT SET'}`);
        console.log(`  Recording URL: ${call.recordingUrl || 'NONE'}`);
        console.log(`  Phone Dialed: ${call.phoneDialed || 'NOT SET'}`);
        
        // Diagnose issues
        const issues = [];
        if (!call.phoneDialed) issues.push('⚠️ phoneDialed is NULL (needed for matching)');
        if (!call.recordingUrl) issues.push('⚠️ recordingUrl is NULL');
        if (call.recordingStatus === 'pending') issues.push('⚠️ Recording still pending');
        if (!call.duration || call.duration === 0) issues.push('ℹ️ No duration recorded');
        
        if (issues.length > 0) {
          console.log(`  Issues:`);
          issues.forEach(issue => console.log(`    ${issue}`));
        } else {
          console.log(`  ✅ All recording fields look good`);
        }
        console.log('');
      });
    }

    // Check 2: Calls with recordings
    console.log('─'.repeat(80));
    console.log('📊 Check 2: Calls WITH Recordings');
    console.log('─'.repeat(80));
    
    const callsWithRecordings = await prisma.callLog.count({
      where: {
        recordingUrl: { not: null },
      },
    });

    if (callsWithRecordings === 0) {
      console.log('❌ NO CALLS have recording URLs in database');
      console.log('   This is the main issue! Recording URLs are not being saved.\n');
    } else {
      console.log(`✅ ${callsWithRecordings} calls have recording URLs\n`);
    }

    // Check 3: Calls pending recording
    console.log('─'.repeat(80));
    console.log('📊 Check 3: Calls Pending Recording');
    console.log('─'.repeat(80));
    
    const pendingRecordings = await prisma.callLog.findMany({
      where: {
        recordingStatus: 'pending',
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        Lead: { select: { name: true } },
      },
    });

    if (pendingRecordings.length === 0) {
      console.log('ℹ️ No calls pending recording\n');
    } else {
      console.log(`⚠️ ${pendingRecordings.length} calls still pending:\n`);
      pendingRecordings.forEach((call, index) => {
        console.log(`  ${index + 1}. ${call.Lead.name} - ${call.createdAt.toLocaleString()}`);
        console.log(`     Phone Dialed: ${call.phoneDialed || 'MISSING'}`);
      });
      console.log('');
    }

    // Check 4: Recording status distribution
    console.log('─'.repeat(80));
    console.log('📊 Check 4: Recording Status Distribution');
    console.log('─'.repeat(80));
    
    const statusCounts = await prisma.$queryRaw`
      SELECT 
        "recordingStatus",
        COUNT(*) as count
      FROM "CallLog"
      GROUP BY "recordingStatus"
      ORDER BY count DESC
    `;

    console.log('Recording Status Counts:');
    (statusCounts as any[]).forEach((row: any) => {
      console.log(`  ${row.recordingStatus || 'NULL'}: ${row.count}`);
    });
    console.log('');

    // Summary and recommendations
    console.log('─'.repeat(80));
    console.log('📋 Summary & Recommendations');
    console.log('─'.repeat(80));
    
    const totalCalls = await prisma.callLog.count();
    const callsWithUrls = await prisma.callLog.count({ 
      where: { recordingUrl: { not: null } } 
    });
    const percentage = totalCalls > 0 ? ((callsWithUrls / totalCalls) * 100).toFixed(1) : '0';
    
    console.log(`Total Calls: ${totalCalls}`);
    console.log(`Calls with Recording URL: ${callsWithUrls} (${percentage}%)`);
    console.log('');

    if (callsWithUrls === 0) {
      console.log('🔴 CRITICAL ISSUE: No recordings are reaching LMS database');
      console.log('');
      console.log('Likely Causes:');
      console.log('  1. Call Monitor app not configured with LMS integration');
      console.log('  2. Network connectivity issues between phone and LMS');
      console.log('  3. API key mismatch between apps');
      console.log('  4. Recording app not calling update-recording endpoint');
      console.log('');
      console.log('Solutions:');
      console.log('  1. Follow RECORDING_NOT_SHOWING_FIX.md');
      console.log('  2. Add LMS integration to Call Monitor app');
      console.log('  3. Test with: npm run test-lms-connection');
    } else if (callsWithUrls < totalCalls) {
      console.log('🟡 PARTIAL ISSUE: Some recordings missing');
      console.log('');
      console.log('Possible Causes:');
      console.log('  1. Integration added recently (older calls missing)');
      console.log('  2. Network issues during some uploads');
      console.log('  3. Only LMS-initiated calls get recordings');
      console.log('');
      console.log('Check if missing recordings are:');
      console.log('  - Older than LMS integration setup');
      console.log('  - Regular calls (not from "Call Now" button)');
    } else {
      console.log('✅ GOOD: All calls have recording URLs');
      console.log('');
      console.log('If recordings still not visible in UI:');
      console.log('  1. Check if URLs are publicly accessible');
      console.log('  2. Verify CORS headers');
      console.log('  3. Check browser console for playback errors');
      console.log('  4. Try opening a recording URL directly in browser');
    }

    console.log('');
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ Error running diagnostics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostics
diagnoseRecordingIssues()
  .then(() => {
    console.log('✅ Diagnostics complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
