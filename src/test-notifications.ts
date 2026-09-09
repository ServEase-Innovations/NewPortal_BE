// Test script to generate sample notifications for testing
import prisma from "./prisma";
import {
  notifyLeaveApproved,
  notifyLeaveRejected,
  notifyManagerNewLeaveRequest,
  notifyAttendanceReminder,
  notifyTimesheetReminder,
  notifyWelcomeEmployee,
  notifyManagerAssignment,
} from "./services/notification.service";

async function testNotifications() {
  try {
    console.log("🧪 Testing notification system...\n");

    // Get a test employee (employee ID 18 from the context)
    const testEmployee = await prisma.employee.findUnique({
      where: { employeeId: 18n },
      select: {
        employeeId: true,
        fullName: true,
        managerId: true,
      },
    });

    if (!testEmployee) {
      console.error("❌ Test employee (ID: 18) not found");
      return;
    }

    console.log(`✅ Found test employee: ${testEmployee.fullName} (ID: ${testEmployee.employeeId})\n`);

    // Test 1: Leave Approved Notification
    console.log("1️⃣ Creating leave approved notification...");
    await notifyLeaveApproved(
      testEmployee.employeeId,
      testEmployee.fullName,
      "Privilege",
      "2026-08-15",
      "2026-08-17",
      3,
      "HR Manager",
      12345n
    );
    console.log("   ✓ Leave approved notification created\n");

    // Test 2: Leave Rejected Notification
    console.log("2️⃣ Creating leave rejected notification...");
    await notifyLeaveRejected(
      testEmployee.employeeId,
      testEmployee.fullName,
      "Casual",
      "2026-08-20",
      "2026-08-21",
      2,
      "Team Manager",
      "Insufficient notice period",
      12346n
    );
    console.log("   ✓ Leave rejected notification created\n");

    // Test 3: Attendance Reminder
    console.log("3️⃣ Creating attendance reminder...");
    await notifyAttendanceReminder(testEmployee.employeeId, testEmployee.fullName);
    console.log("   ✓ Attendance reminder created\n");

    // Test 4: Timesheet Reminder
    console.log("4️⃣ Creating timesheet reminder...");
    await notifyTimesheetReminder(testEmployee.employeeId, testEmployee.fullName, "August 5, 2026");
    console.log("   ✓ Timesheet reminder created\n");

    // Test 5: Welcome Notification
    console.log("5️⃣ Creating welcome notification...");
    await notifyWelcomeEmployee(testEmployee.employeeId, testEmployee.fullName);
    console.log("   ✓ Welcome notification created\n");

    // Test 6: Manager Assignment (if employee has a manager)
    if (testEmployee.managerId) {
      const manager = await prisma.employee.findUnique({
        where: { employeeId: testEmployee.managerId },
        select: { fullName: true },
      });

      if (manager) {
        console.log("6️⃣ Creating manager assignment notification...");
        await notifyManagerAssignment(
          testEmployee.employeeId,
          testEmployee.fullName,
          manager.fullName
        );
        console.log("   ✓ Manager assignment notification created\n");

        // Test 7: Manager notification (new leave request)
        console.log("7️⃣ Creating manager notification for new leave request...");
        await notifyManagerNewLeaveRequest(
          testEmployee.managerId,
          testEmployee.fullName,
          "Sick Leave",
          "2026-08-10",
          "2026-08-11",
          2,
          12347n
        );
        console.log("   ✓ Manager notification created\n");
      }
    }

    // Fetch and display all notifications for the employee
    console.log("📊 Fetching all notifications for employee...");
    const notifications = await prisma.notification.findMany({
      where: { employeeId: testEmployee.employeeId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log(`\n✅ Total notifications: ${notifications.length}\n`);
    
    notifications.forEach((notif: any, index: number) => {
      const unreadBadge = notif.isRead ? "" : "🔴 ";
      console.log(`${index + 1}. ${unreadBadge}${notif.type} - ${notif.title}`);
      console.log(`   ${notif.detail}`);
      console.log(`   Created: ${new Date(Number(notif.createdAt)).toLocaleString()}\n`);
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        employeeId: testEmployee.employeeId,
        isRead: false,
      },
    });

    console.log(`📬 Unread notifications: ${unreadCount}`);
    console.log("\n✨ Test completed successfully!");
    console.log("\n💡 Now test in the UI:");
    console.log("   1. Login as employee ID 000018");
    console.log("   2. Check the notification bell in the header");
    console.log("   3. Click notifications to mark them as read");
    console.log("   4. Test the 'Mark all as read' button");
    console.log("   5. Wait 30 seconds to see auto-refresh in action\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNotifications();
