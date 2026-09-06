// src/controllers/department.controller.ts
import { Request, Response } from 'express';
import prisma from '../prisma';

// Get all departments
export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get employee count for each department
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await prisma.employee.count({
          where: {
            assignedDepartment: dept.name,
            isActive: true,
          },
        });

        // Get department head details if exists
        let headEmployee = null;
        if (dept.headEmployeeId) {
          headEmployee = await prisma.employee.findUnique({
            where: { employeeId: dept.headEmployeeId },
            select: {
              employeeId: true,
              fullName: true,
              emailAddress: true,
              assignedRole: true,
            },
          });
        }

        return {
          departmentId: dept.departmentId.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          budget: dept.budget ? Number(dept.budget) : null,
          headEmployeeId: dept.headEmployeeId?.toString(),
          headEmployee,
          employeeCount,
          isActive: dept.isActive,
          createdAt: new Date(Number(dept.createdAt) * 1000).toISOString(),
          updatedAt: new Date(Number(dept.updatedAt) * 1000).toISOString(),
        };
      })
    );

    res.status(200).json(departmentsWithCount);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get single department by ID
export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { departmentId: BigInt(id) },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Get employee count
    const employeeCount = await prisma.employee.count({
      where: {
        assignedDepartment: department.name,
        isActive: true,
      },
    });

    // Get department head details if exists
    let headEmployee = null;
    if (department.headEmployeeId) {
      headEmployee = await prisma.employee.findUnique({
        where: { employeeId: department.headEmployeeId },
        select: {
          employeeId: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
        },
      });
    }

    res.status(200).json({
      departmentId: department.departmentId.toString(),
      name: department.name,
      code: department.code,
      description: department.description,
      budget: department.budget ? Number(department.budget) : null,
      headEmployeeId: department.headEmployeeId?.toString(),
      headEmployee,
      employeeCount,
      isActive: department.isActive,
      createdAt: new Date(Number(department.createdAt) * 1000).toISOString(),
      updatedAt: new Date(Number(department.updatedAt) * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
};

// Create new department
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, code, description, headEmployeeId, budget } = req.body;

    // Validation
    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    // Check if department with same name or code already exists
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: name.trim() },
          { code: code.trim().toUpperCase() },
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ 
        error: existing.name === name.trim() 
          ? 'Department with this name already exists' 
          : 'Department with this code already exists' 
      });
    }

    const now = BigInt(Math.floor(Date.now() / 1000));

    const department = await prisma.department.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        headEmployeeId: headEmployeeId ? BigInt(headEmployeeId) : null,
        budget: budget ? Number(budget) : null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    res.status(201).json({
      message: 'Department created successfully',
      department: {
        departmentId: department.departmentId.toString(),
        name: department.name,
        code: department.code,
        description: department.description,
        budget: department.budget ? Number(department.budget) : null,
        headEmployeeId: department.headEmployeeId?.toString(),
        employeeCount: 0,
        isActive: department.isActive,
        createdAt: new Date(Number(department.createdAt) * 1000).toISOString(),
        updatedAt: new Date(Number(department.updatedAt) * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

// Update department
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, headEmployeeId, budget, isActive } = req.body;

    const department = await prisma.department.findUnique({
      where: { departmentId: BigInt(id) },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if new name/code conflicts with existing departments
    if (name || code) {
      const existing = await prisma.department.findFirst({
        where: {
          AND: [
            { departmentId: { not: BigInt(id) } },
            {
              OR: [
                ...(name ? [{ name: name.trim() }] : []),
                ...(code ? [{ code: code.trim().toUpperCase() }] : []),
              ],
            },
          ],
        },
      });

      if (existing) {
        return res.status(409).json({ 
          error: existing.name === name?.trim() 
            ? 'Department with this name already exists' 
            : 'Department with this code already exists' 
        });
      }
    }

    const now = BigInt(Math.floor(Date.now() / 1000));

    const updated = await prisma.department.update({
      where: { departmentId: BigInt(id) },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.trim().toUpperCase() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(headEmployeeId !== undefined && { headEmployeeId: headEmployeeId ? BigInt(headEmployeeId) : null }),
        ...(budget !== undefined && { budget: budget ? Number(budget) : null }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: now,
      },
    });

    // Get employee count
    const employeeCount = await prisma.employee.count({
      where: {
        assignedDepartment: updated.name,
        isActive: true,
      },
    });

    res.status(200).json({
      message: 'Department updated successfully',
      department: {
        departmentId: updated.departmentId.toString(),
        name: updated.name,
        code: updated.code,
        description: updated.description,
        budget: updated.budget ? Number(updated.budget) : null,
        headEmployeeId: updated.headEmployeeId?.toString(),
        employeeCount,
        isActive: updated.isActive,
        createdAt: new Date(Number(updated.createdAt) * 1000).toISOString(),
        updatedAt: new Date(Number(updated.updatedAt) * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

// Delete department (soft delete)
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const department = await prisma.department.findUnique({
      where: { departmentId: BigInt(id) },
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if any employees are assigned to this department
    const employeeCount = await prisma.employee.count({
      where: {
        assignedDepartment: department.name,
        isActive: true,
      },
    });

    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department. ${employeeCount} active employee(s) are assigned to this department.` 
      });
    }

    // Soft delete by setting isActive to false
    const now = BigInt(Math.floor(Date.now() / 1000));
    await prisma.department.update({
      where: { departmentId: BigInt(id) },
      data: {
        isActive: false,
        updatedAt: now,
      },
    });

    res.status(200).json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};
