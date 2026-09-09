import prisma from "./src/prisma";

async function main() {
  const managerIdCol = await prisma.$queryRawUnsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'manager_id';
  `);
  console.log("teams.manager_id column:", managerIdCol);

  const tasksTable = await prisma.$queryRawUnsafe(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'tasks';
  `);
  console.log("tasks table:", tasksTable);

  const migrations = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at, rolled_back_at, applied_steps_count, logs
    FROM _prisma_migrations
    ORDER BY started_at DESC
    LIMIT 5;
  `);
  console.log("recent migrations:", JSON.stringify(migrations, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});