// Script to verify auto-close functionality
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAutoClose() {
  try {
    console.log('🔍 Checking attendance records for auto-close verification...\n');

    // Try to find your employee record
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: { contains: 'ronit', mode: 'insensitive' } },
          { fullName: { contains: 'Ronit', mode: 'insensitive' } },
          { email: { contains: 'maity', mode: 'insensitive' } },
        ]
      },
      select: {
        employeeId: true,
        fullName: true,
        email: true,
      }
    });

    let employeeId: bigint;
    let employeeName: string;

    if (!employee) {
      console.log('ℹ️  Using default employeeId 118...\n');
      employeeId = BigInt(118);
      employeeName = 'Employee ID 118';
    } else {
      console.log(`✅ Found employee: ${employee.fullName} (${employee.email})`);
      console.log(`   Employee ID: ${employee.employeeId}\n`);
      employeeId = employee.employeeId;
      employeeName = employee.fullName;
    }

    await checkAttendance(employeeId, employeeName);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkAttendance(employeeId: bigint, employeeName: string) {
  // Get last 5 attendance records
  const records = await prisma.attendance.findMany({
    where: { employeeId: employeeId },
    orderBy: { calendarDate: 'desc' },
    take: 5,
  });

  if (records.length === 0) {
    console.log(`📋 No attendance records found for ${employeeName}`);
    return;
  }

  console.log(`📋 Last ${records.length} attendance records for ${employeeName}:\n`);
  console.log('─'.repeat(100));

  records.forEach((record, index) => {
    const date = new Date(Number(record.calendarDate));
    const clockIn = record.clockInTimestamp ? new Date(Number(record.clockInTimestamp)) : null;
    const clockOut = record.clockOutTimestamp ? new Date(Number(record.clockOutTimestamp)) : null;
    
    console.log(`\n${index + 1}. Attendance ID: ${record.attendanceId}`);
    console.log(`   Date: ${date.toLocaleDateString()} (${date.toISOString().split('T')[0]})`);
    console.log(`   Status: ${record.shiftStatus}`);
    
    if (clockIn) {
      console.log(`   Clock In:  ${clockIn.toLocaleString()} (${clockIn.toISOString()})`);
    } else {
      console.log(`   Clock In:  NULL`);
    }
    
    if (clockOut) {
      const clockOutTime = clockOut.toTimeString().split(' ')[0];
      const isAutoClose = clockOutTime === '23:59:59';
      console.log(`   Clock Out: ${clockOut.toLocaleString()} (${clockOut.toISOString()})`);
      
      if (isAutoClose) {
        console.log(`   ⚠️  AUTO-CLOSED at end of day (23:59:59) ✅`);
      }
    } else {
      console.log(`   Clock Out: NULL (Session still open)`);
    }
    
    console.log(`   Total Hours: ${record.totalHoursComputed || 0} hours`);
    console.log('   ' + '─'.repeat(90));
  });

  console.log('\n');

  // Check for any still-open records from previous days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = BigInt(today.getTime());

  const openRecords = await prisma.attendance.findMany({
    where: {
      employeeId: employeeId,
      clockInTimestamp: { not: null },
      clockOutTimestamp: null,
      calendarDate: { lt: todayStart },
    },
  });

  if (openRecords.length > 0) {
    console.log(`⚠️  Found ${openRecords.length} OPEN record(s) from previous days that should be auto-closed:`);
    openRecords.forEach((record) => {
      const date = new Date(Number(record.calendarDate));
      const clockIn = new Date(Number(record.clockInTimestamp));
      console.log(`   - Attendance ID ${record.attendanceId}: ${date.toLocaleDateString()} (Clock In: ${clockIn.toLocaleString()})`);
    });
    console.log('\n   💡 These will be auto-closed next time you fetch today\'s attendance!\n');
  } else {
    console.log(`✅ No open records from previous days - all previous days are properly closed!\n`);
  }

  // Summary
  const autoClosed = records.filter(r => {
    if (!r.clockOutTimestamp) return false;
    const clockOut = new Date(Number(r.clockOutTimestamp));
    const time = clockOut.toTimeString().split(' ')[0];
    return time === '23:59:59';
  });

  console.log('📊 SUMMARY:');
  console.log(`   Total records checked: ${records.length}`);
  console.log(`   Auto-closed records (23:59:59): ${autoClosed.length}`);
  console.log(`   Open from previous days: ${openRecords.length}`);
  
  if (autoClosed.length > 0) {
    console.log('\n✅ AUTO-CLOSE FEATURE IS WORKING! Records show 23:59:59 closure times.');
  }
  
  if (openRecords.length === 0 && records.some(r => r.clockOutTimestamp !== null)) {
    console.log('✅ DATABASE STATE: All previous days properly closed!');
  }
}

// Run the verification
verifyAutoClose();
