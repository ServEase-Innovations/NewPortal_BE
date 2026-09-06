// scripts/create-test-users.ts
// Creates test users for different roles: Employee, HR, and Manager

import prisma from "../src/prisma";
import bcrypt from "bcryptjs";

interface TestUser {
  username: string;
  password: string;
  fullName: string;
  emailAddress: string;
  assignedRole: "SuperAdmin" | "Manager" | "Developer" | "Marketing" | "CustomStaff" | "HR";
  assignedDepartment: string;
  baseSalary: number;
}

const testUsers: TestUser[] = [
  {
    username: "employee",
    password: "employee123",
    fullName: "John Developer",
    emailAddress: "employee@servease.com",
    assignedRole: "Developer",
    assignedDepartment: "Engineering",
    baseSalary: 50000,
  },
  {
    username: "hr",
    password: "hr123",
    fullName: "Sarah HR Manager",
    emailAddress: "hr@servease.com",
    assignedRole: "HR",
    assignedDepartment: "Human Resources",
    baseSalary: 60000,
  },
  {
    username: "manager",
    password: "manager123",
    fullName: "Mike Team Lead",
    emailAddress: "manager@servease.com",
    assignedRole: "Manager",
    assignedDepartment: "Engineering",
    baseSalary: 80000,
  },
];

async function createTestUsers() {
  try {
    console.log("🔍 Creating test users for different roles...\n");
    
    const createdUsers = [];
    const skippedUsers = [];

    for (const user of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.employee.findUnique({
        where: { username: user.username }
      });

      if (existingUser) {
        console.log(`⏭️  User '${user.username}' already exists, skipping...`);
        skippedUsers.push(user);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Create the user
      const newUser = await prisma.employee.create({
        data: {
          username: user.username,
          password: hashedPassword,
          fullName: user.fullName,
          emailAddress: user.emailAddress,
          assignedRole: user.assignedRole,
          assignedDepartment: user.assignedDepartment,
          isActive: true,
          baseSalary: user.baseSalary,
          allowances: user.baseSalary * 0.2, // 20% of base salary
          deductions: user.baseSalary * 0.05, // 5% of base salary
          joinedAt: BigInt(Math.floor(Date.now() / 1000)),
        }
      });

      console.log(`✅ Created user: ${user.username} (${user.assignedRole})`);
      createdUsers.push(user);
    }

    // Print summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (createdUsers.length > 0) {
      console.log(`\n✅ ${createdUsers.length} user(s) created successfully!\n`);
      
      createdUsers.forEach(user => {
        console.log(`┌─ ${user.fullName} (${user.assignedRole})`);
        console.log(`├─ 📧 Username: ${user.username}`);
        console.log(`├─ 🔑 Password: ${user.password}`);
        console.log(`├─ 📨 Email: ${user.emailAddress}`);
        console.log(`└─ 🏢 Department: ${user.assignedDepartment}\n`);
      });
    }

    if (skippedUsers.length > 0) {
      console.log(`⏭️  ${skippedUsers.length} user(s) already existed (skipped)`);
      skippedUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.assignedRole})`);
      });
      console.log();
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("⚠️  IMPORTANT: Change these passwords after first login!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Print quick reference
    if (createdUsers.length > 0) {
      console.log("📝 QUICK REFERENCE - Test Login Credentials:");
      console.log("┌─────────────┬──────────────┬─────────────────┐");
      console.log("│ Role        │ Username     │ Password        │");
      console.log("├─────────────┼──────────────┼─────────────────┤");
      
      testUsers.forEach(user => {
        const isNew = createdUsers.some(cu => cu.username === user.username);
        const status = isNew ? "NEW" : "EXISTS";
        console.log(`│ ${user.assignedRole.padEnd(11)} │ ${user.username.padEnd(12)} │ ${user.password.padEnd(15)} │ ${status}`);
      });
      
      console.log("└─────────────┴──────────────┴─────────────────┘\n");
    }

  } catch (error) {
    console.error("❌ Error creating test users:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createTestUsers()
  .then(() => {
    console.log("✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
