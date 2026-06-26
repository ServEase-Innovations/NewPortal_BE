import prisma from "./prisma";

async function main() {
  const employees = await prisma.employee.findMany();

  console.log(employees);
}

main();