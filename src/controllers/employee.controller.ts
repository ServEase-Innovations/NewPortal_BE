// src/controllers/employee.controller.ts
import { Request, Response } from "express";
import { 
  createEmployeeService, 
  deleteEmployeeService, 
  getEmployeeByIdService, 
  getEmployeesService, 
  updateEmployeeService 
} from "../services/employee.service";
import { createEmployeeSchema } from "../validations/employee.validation";
import { hashPassword, generateUsername } from "../utils/auth.utils";
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';
import { registerService } from "../services/auth.service";
import { registerEmployeeSchema } from "../validations/auth.validation";

// REGISTER endpoint moved from auth
export const registerEmployee = async (req: Request, res: Response) => {
  try {
    console.log('Register request body:', req.body);
    const result = registerEmployeeSchema.safeParse(req.body);

    if (!result.success) {
      console.log('Validation error:', result.error);
      return res.status(400).json({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }

    const { confirmPassword, ...registerData } = result.data;
    console.log('Register data after validation:', registerData);
    
    const employee = await registerService(registerData);

    res.status(201).json({
      message: 'Employee registered successfully',
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        username: employee.username,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Username or email already exists',
      });
    }
    
    res.status(500).json({
      message: 'Failed to register employee',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// PROFILE endpoint moved from auth
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    console.log('Getting profile for:', req.employee);
    
    if (!req.employee) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId: req.employee.employeeId },
      select: {
        employeeId: true,
        fullName: true,
        username: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        baseSalary: true,
        allowances: true,
        deductions: true,
        joinedAt: true,
        last_login: true,
        isActive: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: 'Employee not found',
      });
    }

    res.json(employee);
  } catch (error: any) {
    console.error('Get profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

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

    // Generate username
    const username = generateUsername(result.data.fullName);
    
    // Hash the password if provided, otherwise use default
    let hashedPassword;
    if (result.data.password) {
      hashedPassword = await hashPassword(result.data.password);
    } else {
      // Default password for admin-created employees
      const defaultPassword = "Employee@123";
      hashedPassword = await hashPassword(defaultPassword);
    }

    const employeeData = {
      fullName: result.data.fullName,
      emailAddress: result.data.emailAddress,
      assignedRole: result.data.assignedRole,
      assignedDepartment: result.data.assignedDepartment,
      baseSalary: result.data.baseSalary || 0,
      allowances: result.data.allowances || 0,
      deductions: result.data.deductions || 0,
      username: username,
      password: hashedPassword, // Only the password is hashed
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

  } catch (error: any) {
    console.error('Create employee error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Username or email already exists',
      });
    }

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
    console.log('Getting employee by ID:', req.params.id);
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
  } catch (error: any) {
    console.error('Error in getEmployeeById:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      message: "Failed to fetch employee",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const updateEmployee = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    // If password is being updated, hash it
    if (req.body.password) {
      req.body.password = await hashPassword(req.body.password);
    }

    const employee = await updateEmployeeService(
      req.params.id,
      req.body
    );

    res.json({
      message: "Employee updated successfully",
      employee: {
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        emailAddress: employee.emailAddress,
        assignedRole: employee.assignedRole,
        assignedDepartment: employee.assignedDepartment,
        isActive: employee.isActive,
      }
    });
  } catch (error: any) {
    console.error('Update employee error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

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
  } catch (error: any) {
    console.error('Delete employee error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.status(500).json({
      message: "Failed to delete employee",
    });
  }
};