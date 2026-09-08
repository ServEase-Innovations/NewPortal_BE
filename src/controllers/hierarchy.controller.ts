// src/controllers/hierarchy.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../prisma';

/**
 * Get employee hierarchy (manager chain + direct reports)
 * Accessible by the employee themselves
 */
export const getMyHierarchy = async (req: AuthRequest, res: Response) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const userId = employee.employeeId;

    // Get current user
    const currentEmployee = await prisma.employee.findUnique({
      where: { employeeId: BigInt(userId) },
      select: {
        employeeId: true,
        username: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        isActive: true,
        joinedAt: true,
        lastLogin: true,
        managerId: true,
        teamId: true,
      }
    });

    if (!currentEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const hierarchy: any = {
      currentEmployee: serializeEmployee(currentEmployee),
      managers: [],
      directReports: [],
      subReports: []
    };

    // Get manager chain (up to 3 levels)
    let currentManagerId = currentEmployee.managerId;
    let level = 0;

    while (currentManagerId && level < 3) {
      const manager = await prisma.employee.findUnique({
        where: { employeeId: currentManagerId },
        select: {
          employeeId: true,
          username: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
          assignedDepartment: true,
          isActive: true,
          joinedAt: true,
          lastLogin: true,
          managerId: true,
        }
      });

      if (manager) {
        hierarchy.managers.push(serializeEmployee(manager));
        currentManagerId = manager.managerId;
        level++;
      } else {
        break;
      }
    }

    // Reverse so top manager is first
    hierarchy.managers.reverse();

    // Get direct reports
    const directReports = await prisma.employee.findMany({
      where: { managerId: currentEmployee.employeeId },
      select: {
        employeeId: true,
        username: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
        isActive: true,
        joinedAt: true,
        lastLogin: true,
        managerId: true,
      }
    });

    hierarchy.directReports = directReports.map(serializeEmployee);

    // Get sub-reports (reports of reports)
    for (const report of directReports) {
      const subReports = await prisma.employee.findMany({
        where: { managerId: report.employeeId },
        select: {
          employeeId: true,
          username: true,
          fullName: true,
          emailAddress: true,
          assignedRole: true,
          assignedDepartment: true,
          isActive: true,
          joinedAt: true,
          lastLogin: true,
          managerId: true,
        }
      });

      hierarchy.subReports.push(...subReports.map(serializeEmployee));
    }

    return res.json(hierarchy);

  } catch (error) {
    console.error('Error fetching hierarchy:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch hierarchy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper to serialize BigInt fields
function serializeEmployee(employee: any) {
  return {
    ...employee,
    employeeId: employee.employeeId.toString(),
    managerId: employee.managerId ? employee.managerId.toString() : null,
    teamId: employee.teamId ? employee.teamId.toString() : null,
  };
}
