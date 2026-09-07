import prisma from "../src/prisma";

const defaultRoles = [
  {
    roleName: "SuperAdmin",
    displayName: "Super Administrator",
    description: "Full system access with all privileges",
    isSystemRole: true,
    privileges: {
      // Employee Management
      canViewEmployees: true,
      canCreateEmployees: true,
      canEditEmployees: true,
      canDeleteEmployees: true,
      
      // Department Management
      canViewDepartments: true,
      canCreateDepartments: true,
      canEditDepartments: true,
      canDeleteDepartments: true,
      
      // Team Management
      canViewTeams: true,
      canCreateTeams: true,
      canEditTeams: true,
      canDeleteTeams: true,
      
      // Role Management
      canViewRoles: true,
      canCreateRoles: true,
      canEditRoles: true,
      canDeleteRoles: true,
      
      // Attendance & Leave
      canViewAllAttendance: true,
      canEditAttendance: true,
      canApproveLeave: true,
      canViewLeaveRequests: true,
      
      // Payroll
      canViewPayroll: true,
      canGeneratePayslips: true,
      canApprovePayslips: true,
      
      // Reports & Analytics
      canViewReports: true,
      canExportData: true,
      
      // System Settings
      canManageSettings: true,
    },
  },
  {
    roleName: "HR",
    displayName: "Human Resources",
    description: "HR management with employee and leave management privileges",
    isSystemRole: true,
    privileges: {
      // Employee Management
      canViewEmployees: true,
      canCreateEmployees: true,
      canEditEmployees: true,
      canDeleteEmployees: false,
      
      // Department Management
      canViewDepartments: true,
      canCreateDepartments: false,
      canEditDepartments: false,
      canDeleteDepartments: false,
      
      // Team Management
      canViewTeams: true,
      canCreateTeams: false,
      canEditTeams: false,
      canDeleteTeams: false,
      
      // Role Management
      canViewRoles: true,
      canCreateRoles: false,
      canEditRoles: false,
      canDeleteRoles: false,
      
      // Attendance & Leave
      canViewAllAttendance: true,
      canEditAttendance: true,
      canApproveLeave: true,
      canViewLeaveRequests: true,
      
      // Payroll
      canViewPayroll: true,
      canGeneratePayslips: true,
      canApprovePayslips: false,
      
      // Reports & Analytics
      canViewReports: true,
      canExportData: true,
      
      // System Settings
      canManageSettings: false,
    },
  },
  {
    roleName: "Manager",
    displayName: "Manager",
    description: "Team management with approval and oversight privileges",
    isSystemRole: true,
    privileges: {
      // Employee Management
      canViewEmployees: true,
      canCreateEmployees: false,
      canEditEmployees: false,
      canDeleteEmployees: false,
      
      // Department Management
      canViewDepartments: true,
      canCreateDepartments: false,
      canEditDepartments: false,
      canDeleteDepartments: false,
      
      // Team Management
      canViewTeams: true,
      canCreateTeams: false,
      canEditTeams: true,
      canDeleteTeams: false,
      
      // Role Management
      canViewRoles: false,
      canCreateRoles: false,
      canEditRoles: false,
      canDeleteRoles: false,
      
      // Attendance & Leave
      canViewAllAttendance: true,
      canEditAttendance: false,
      canApproveLeave: true,
      canViewLeaveRequests: true,
      
      // Payroll
      canViewPayroll: false,
      canGeneratePayslips: false,
      canApprovePayslips: false,
      
      // Reports & Analytics
      canViewReports: true,
      canExportData: false,
      
      // System Settings
      canManageSettings: false,
    },
  },
  {
    roleName: "Employee",
    displayName: "Employee",
    description: "Basic employee access with self-service capabilities",
    isSystemRole: true,
    privileges: {
      // Employee Management
      canViewEmployees: true,
      canCreateEmployees: false,
      canEditEmployees: false,
      canDeleteEmployees: false,
      
      // Department Management
      canViewDepartments: true,
      canCreateDepartments: false,
      canEditDepartments: false,
      canDeleteDepartments: false,
      
      // Team Management
      canViewTeams: true,
      canCreateTeams: false,
      canEditTeams: false,
      canDeleteTeams: false,
      
      // Role Management
      canViewRoles: false,
      canCreateRoles: false,
      canEditRoles: false,
      canDeleteRoles: false,
      
      // Attendance & Leave
      canViewAllAttendance: false,
      canEditAttendance: false,
      canApproveLeave: false,
      canViewLeaveRequests: false,
      
      // Payroll
      canViewPayroll: false,
      canGeneratePayslips: false,
      canApprovePayslips: false,
      
      // Reports & Analytics
      canViewReports: false,
      canExportData: false,
      
      // System Settings
      canManageSettings: false,
    },
  },
];

async function seedRoles() {
  console.log('🌱 Seeding roles...');

  for (const role of defaultRoles) {
    try {
      const existingRole = await prisma.role.findUnique({
        where: { roleName: role.roleName },
      });

      if (existingRole) {
        console.log(`⏭️  Role "${role.roleName}" already exists, updating...`);
        await prisma.role.update({
          where: { roleName: role.roleName },
          data: {
            displayName: role.displayName,
            description: role.description,
            privileges: role.privileges,
            isSystemRole: role.isSystemRole,
            updatedAt: BigInt(Date.now()),
          },
        });
        console.log(`✅ Updated role: ${role.roleName}`);
      } else {
        const now = Date.now();
        await prisma.role.create({
          data: {
            ...role,
            createdAt: BigInt(now),
            updatedAt: BigInt(now),
          },
        });
        console.log(`✅ Created role: ${role.roleName}`);
      }
    } catch (error) {
      console.error(`❌ Error creating/updating role "${role.roleName}":`, error);
    }
  }

  console.log('✨ Role seeding complete!');
  console.log('\n📋 Created/Updated roles:');
  console.log('  1. SuperAdmin - Full system access');
  console.log('  2. HR - Employee & leave management');
  console.log('  3. Manager - Team management & approvals');
  console.log('  4. Employee - Basic self-service access');
}

seedRoles()
  .catch((error) => {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
