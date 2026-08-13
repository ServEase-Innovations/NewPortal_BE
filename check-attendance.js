require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function checkAttendance() {
  try {
    console.log('🔍 Checking attendance for employee ID 6...\n');
    
    const records = await prisma.attendance.findMany({
      where: {
        employeeId: BigInt(6)
      },
      orderBy: {
        calendarDate: 'desc'
      },
      take: 5
    });
    
    console.log(`Found ${records.length} records:\n`);
    
    records.forEach((record, index) => {
      const calendarDate = new Date(Number(record.calendarDate));
      const clockIn = record.clockInTimestamp ? new Date(Number(record.clockInTimestamp)) : null;
      const clockOut = record.clockOutTimestamp ? new Date(Number(record.clockOutTimestamp)) : null;
      
      console.log(`Record ${index + 1}:`);
      console.log(`  ID: ${record.attendanceId}`);
      console.log(`  Calendar Date: ${calendarDate.toISOString()} (${calendarDate.toLocaleDateString()})`);
      console.log(`  Clock In: ${clockIn ? clockIn.toISOString() : 'NULL'}`);
      console.log(`  Clock Out: ${clockOut ? clockOut.toISOString() : 'NULL'}`);
      console.log(`  Total Hours: ${record.totalHoursComputed}`);
      console.log(`  Status: ${record.shiftStatus}`);
      console.log('');
    });
    
    // Check if today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    
    console.log('\n🕒 Today check:');
    console.log(`Today start: ${today.toISOString()}`);
    console.log(`Today timestamp: ${todayMs}`);
    
    records.forEach((record, index) => {
      const recordDateMs = Number(record.calendarDate);
      const recordDate = new Date(recordDateMs);
      recordDate.setHours(0, 0, 0, 0);
      const recordDateOnly = recordDate.getTime();
      
      const isToday = recordDateOnly === todayMs;
      console.log(`Record ${index + 1}: ${isToday ? '✅ IS TODAY' : '❌ NOT TODAY'} (${new Date(recordDateMs).toLocaleDateString()})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAttendance();
