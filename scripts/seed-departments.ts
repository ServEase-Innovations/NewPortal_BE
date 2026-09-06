// scripts/seed-departments.ts
// Seeds initial departments for the organization

import prisma from "../src/prisma";

const departments = [
  {
    name: "Engineering",
    code: "ENG",
    description: "Software development and technical operations",
    budget: 5000000,
  },
  {
    name: "Human Resources",
    code: "HR",
    description: "Employee management and organizational development",
    budget: 1500000,
  },
  {
    name: "Administration",
    code: "ADMIN",
    description: "Administrative and management operations",
    budget: 2000000,
  },
  {
    name: "Marketing",
    code: "MKT",
    description: "Marketing, branding, and customer outreach",
    budget: 3000000,
  },
  {
    name: "Sales",
    code: "SALES",
    description: "Business development and client relations",
    budget: 4000000,
  },
];

async function seedDepartments() {
  try {
    console.log("🌱 Seeding departments...\n");

    const now = BigInt(Math.floor(Date.now() / 1000));
    const created = [];
    const skipped = [];

    for (const dept of departments) {
      // Check if department already exists
      const existing = await prisma.department.findFirst({
        where: {
          OR: [
            { name: dept.name },
            { code: dept.code },
          ],
        },
      });

      if (existing) {
        console.log(`⏭️  Department '${dept.name}' already exists, skipping...`);
        skipped.push(dept);
        continue;
      }

      // Create department
      const department = await prisma.department.create({
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          budget: dept.budget,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      });

      console.log(`✅ Created department: ${dept.name} (${dept.code})`);
      created.push(dept);
    }

    // Print summary
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 SUMMARY");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (created.length > 0) {
      console.log(`\n✅ ${created.length} department(s) created successfully!\n`);

      created.forEach(dept => {
        console.log(`┌─ ${dept.name}`);
        console.log(`├─ 🏷️  Code: ${dept.code}`);
        console.log(`├─ 📝 Description: ${dept.description}`);
        console.log(`└─ 💰 Budget: ₹${dept.budget.toLocaleString('en-IN')}\n`);
      });
    }

    if (skipped.length > 0) {
      console.log(`⏭️  ${skipped.length} department(s) already existed (skipped)`);
      skipped.forEach(dept => {
        console.log(`   - ${dept.name} (${dept.code})`);
      });
      console.log();
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Error seeding departments:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedDepartments()
  .then(() => {
    console.log("✨ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
