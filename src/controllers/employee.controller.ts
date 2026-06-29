// src/controllers/employee.controller.ts
import { Request, Response } from "express";
import { createEmployeeService, deleteEmployeeService, getEmployeeByIdService, getEmployeesService, updateEmployeeService } from "../services/employee.service";
import { createEmployeeSchema } from "../validations/employee.validation";
import { hashPassword, generateUsername } from "../utils/auth.utils";

export const createEmployee = async (
  req: Request,
  res: Response
) => {
  try {
    const result = createEmployeeSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    // Generate username and hash password if not provided
    const username = generateUsername(result.data.fullName);
    
    // For employees created through this endpoint, set a default password
    // or require password in the request
    const defaultPassword = "Employee@123"; // Change this to something more secure
    const hashedPassword = await hashPassword(defaultPassword);

    const employeeData = {
      ...result.data,
      username: username,
      password: hashedPassword,
    };

    const employee = await createEmployeeService(employeeData);

    res.status(201).json({
      message: "Employee created successfully",
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        username: employee.username,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
      }
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
};

export const getEmployees = async (
  req: Request,
  res: Response
) => {
  try {
    const employees = await getEmployeesService();

    res.json(employees);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch employees",
    });
  }
};

export const getEmployeeById = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const employee = await getEmployeeByIdService(
      req.params.id
    );

    if (!employee) {
      res.status(404).json({
        message: "Employee not found",
      });
      return;
    }

    res.json(employee);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch employee",
    });
  }
};

export const updateEmployee = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const employee = await updateEmployeeService(
      req.params.id,
      req.body
    );

    res.json(employee);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update employee",
    });
  }
};

export const deleteEmployee = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    await deleteEmployeeService(req.params.id);

    res.json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete employee",
    });
  }
};