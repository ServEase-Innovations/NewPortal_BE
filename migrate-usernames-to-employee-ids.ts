import prisma from './src/prisma';

/**
 * Migration Script: Convert existing usernames to 6-digit employee ID format
 * 
 * This script updates all existing employee usernames to use the new 6-digit
 * employee ID format (e.g., 000001, 000002, 000017, etc.)
 * 
 * IMPORTANT: This is a one-time migration. Back up your database before running!
 */

// Helper to convert BigInt to string for JSON serialization
function serializeBigInt(obj: any): any {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

async function migrateUsernames() {
  console.log('\n🔄 Starting username migration to 6-digit employee IDs...\n');
  
  try {
    // Fetch all employees
    const employees = await prisma.employee.findMany({
      select: {
        employeeId: true,
        username: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true
      },
      orderBy: {
        employeeId: 'asc'
      }
    });
    
    if (employees.length === 0) {
      console.log('❌ No employees found in database.');
      return;
    }
    
    console.log(`📊 Found ${employees.length} employees to migrate:\n`);
    
    // Display current state
    console.log('Current usernames:');
    console.log('─────────────────────────────────────────────────────────');
    employees.forEach(emp => {
      console.log(`  Employee ID: ${emp.employeeId.toString().padStart(6)} | Username: ${emp.username.padEnd(20)} | ${emp.fullName}`);
    });
    console.log('─────────────────────────────────────────────────────────\n');
    
    // Prepare updates
    const updates = employees.map(emp => {
      const newUsername = emp.employeeId.toString().padStart(6, '0');
      return {
        employeeId: emp.employeeId,
        oldUsername: emp.username,
        newUsername,
        fullName: emp.fullName,
        needsUpdate: emp.username !== newUsername
      };
    });
    
    const employeesToUpdate = updates.filter(u => u.needsUpdate);
    
    if (employeesToUpdate.length === 0) {
      console.log('✅ All usernames are already in 6-digit format. No updates needed.');
      return;
    }
    
    console.log(`🔧 Will update ${employeesToUpdate.length} usernames:\n`);
    employeesToUpdate.forEach(u => {
      console.log(`  ${u.oldUsername.padEnd(20)} → ${u.newUsername}  (${u.fullName})`);
    });
    console.log('');
    
    // Perform updates
    console.log('⏳ Updating usernames...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const update of employeesToUpdate) {
      try {
        await prisma.employee.update({
          where: { employeeId: update.employeeId },
          data: { username: update.newUsername }
        });
        console.log(`  ✓ Updated: ${update.oldUsername} → ${update.newUsername}`);
        successCount++;
      } catch (error: any) {
        console.error(`  ✗ Failed to update ${update.oldUsername}:`, error.message);
        failCount++;
      }
    }
    
    console.log('\n─────────────────────────────────────────────────────────');
    console.log(`✅ Migration complete!`);
    console.log(`   - Successfully updated: ${successCount}`);
    console.log(`   - Failed: ${failCount}`);
    console.log(`   - Total processed: ${employeesToUpdate.length}`);
    console.log('─────────────────────────────────────────────────────────\n');
    
    // Display final state
    const updatedEmployees = await prisma.employee.findMany({
      select: {
        employeeId: true,
        username: true,
        fullName: true,
        assignedRole: true
      },
      orderBy: {
        employeeId: 'asc'
      }
    });
    
    console.log('Final usernames after migration:');
    console.log('─────────────────────────────────────────────────────────');
    updatedEmployees.forEach(emp => {
      console.log(`  Employee ID: ${emp.employeeId.toString().padStart(6)} | Username: ${emp.username.padEnd(10)} | ${emp.fullName} (${emp.assignedRole})`);
    });
    console.log('─────────────────────────────────────────────────────────\n');
    
    console.log('🎉 All employees can now log in using their 6-digit employee ID!\n');
    console.log('Example logins:');
    updatedEmployees.slice(0, 3).forEach(emp => {
      console.log(`  - Username: ${emp.username} | Employee: ${emp.fullName}`);
    });
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateUsernames();
