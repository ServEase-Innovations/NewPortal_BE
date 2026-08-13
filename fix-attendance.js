require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function fixAttendance() {
  try {
    console.log('🔧 Fixing attendance for employee ID 6...\n');
    
    // Find the corrupted record (today's record with wrong hours)
    const corruptedRecord = await prisma.attendance.findUnique({
      where: {
        attendanceId: BigInt(4)
      }
    });
    
    if (!corruptedRecord) {
      console.log('❌ Record not found!');
      return;
    }
    
    console.log('Found corrupted record:');
    console.log(`  ID: ${corruptedRecord.attendanceId}`);
    console.log(`  Total Hours: ${corruptedRecord.totalHoursComputed} (WRONG - should be ~0.06h)`);
    console.log(`  Clock In: ${new Date(Number(corruptedRecord.clockInTimestamp)).toISOString()}`);
    console.log('');
    
    // Option 1: Reset totalHoursComputed to 0
    console.log('Resetting totalHoursComputed to 0...');
    
    await prisma.attendance.update({
      where: {
        attendanceId: BigInt(4)
      },
      data: {
        totalHoursComputed: 0
      }
    });
    
    console.log('✅ Fixed! Hours reset to 0.');
    console.log('\nNow you can:');
    console.log('1. Refresh the page');
    console.log('2. You should see "Previous sessions: 0h"');
    console.log('3. The timer will count from 0');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAttendance();
