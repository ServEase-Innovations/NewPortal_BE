// scripts/create-default-user.ts
// Creates a default admin user for testing and initial setup

import prisma from "../src/prisma";
import bcrypt from "bcryptjs";

async function createDefaultUser() {
  try {
    console.log("🔍 Checking for existing users...");
    
    const existingUser = await prisma.employee.findUnique({
      where: { username: "admin" }
    });

    if (existingUser) {
      console.log("✅ Default admin user already exists!");
      console.log("Username: admin");
      console.log("Role:", existingUser.assignedRole);
      return;
    }

    console.log("📝 Creating default admin user...");
    
    // Hash the default password
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // Create the admin user
    const admin = await prisma.employee.create({
      data: {
        username: "admin",
        password: hashedPassword,
        fullName: "System Administrator",
        emailAddress: "admin@servease.com",
        assignedRole: "SuperAdmin",
        assignedDepartment: "Administration",
        isActive: true,
        baseSalary: 100000,
        allowances: 20000,
        deductions: 5000,
        joinedAt: BigInt(Math.floor(Date.now() / 1000)),
      }
    });

    console.log("\n✅ Default admin user created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Username: admin");
    console.log("🔑 Password: admin123");
    console.log("👤 Role: Super Admin");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change this password after first login!");
    
  } catch (error) {
    console.error("❌ Error creating default user:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDefaultUser()
  .then(() => {
    console.log("\n✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
