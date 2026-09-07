import prisma from "../src/prisma";

async function seedTeams() {
  console.log('🌱 Seeding teams...');

  const teams = [
    {
      teamName: 'Alpha Team',
      projectTitle: 'Employee Management System',
      projectSummary: 'Building a comprehensive HRMS platform with attendance, payroll, and performance tracking',
      milestoneDeadline: new Date('2026-12-31').getTime(),
    },
    {
      teamName: 'Beta Team',
      projectTitle: 'Customer Portal Enhancement',
      projectSummary: 'Redesigning the customer-facing portal with modern UI/UX and improved performance',
      milestoneDeadline: new Date('2026-09-30').getTime(),
    },
    {
      teamName: 'Gamma Team',
      projectTitle: 'Mobile App Development',
      projectSummary: 'Developing native mobile applications for iOS and Android platforms',
      milestoneDeadline: new Date('2027-03-31').getTime(),
    },
    {
      teamName: 'Delta Team',
      projectTitle: 'Data Analytics Dashboard',
      projectSummary: 'Creating real-time analytics and reporting dashboard for business intelligence',
      milestoneDeadline: new Date('2026-11-30').getTime(),
    },
    {
      teamName: 'Epsilon Team',
      projectTitle: 'Infrastructure Modernization',
      projectSummary: 'Migrating legacy systems to cloud infrastructure with improved scalability',
      milestoneDeadline: new Date('2027-06-30').getTime(),
    },
  ];

  for (const team of teams) {
    try {
      const existingTeam = await prisma.team.findUnique({
        where: { teamName: team.teamName },
      });

      if (existingTeam) {
        console.log(`⏭️  Team "${team.teamName}" already exists, skipping...`);
        continue;
      }

      const now = Date.now();
      await prisma.team.create({
        data: {
          ...team,
          createdAt: now,
          updatedAt: now,
        },
      });

      console.log(`✅ Created team: ${team.teamName}`);
    } catch (error) {
      console.error(`❌ Error creating team "${team.teamName}":`, error);
    }
  }

  console.log('✨ Team seeding complete!');
}

seedTeams()
  .catch((error) => {
    console.error('❌ Error seeding teams:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
