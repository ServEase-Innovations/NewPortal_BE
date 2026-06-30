import prisma from "../prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const loginService = async (
  username: string,
  password: string
) => {
  const employee = await prisma.employee.findUnique({
    where: {
      username,
    },
  });

  if (!employee) {
    throw new Error("Invalid username or password");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    employee.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid username or password");
  }

 const token = jwt.sign(
  {
    employeeId: employee.employeeId,
    username: employee.username,
    role: employee.assignedRole,
  },
  process.env.JWT_SECRET as string,
  {
    expiresIn: "1d",
  }
);

  return {
    token,
    employee: {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      username: employee.username,
      emailAddress: employee.emailAddress,
      assignedRole: employee.assignedRole,
    },
  };
};