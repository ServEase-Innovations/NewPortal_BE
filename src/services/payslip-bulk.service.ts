import { EmployeeRole, PayslipStatus } from "@prisma/client";
import prisma from "../prisma";
import { generatePayslipForEmployeeService, PayrollDomainError } from "./payslip.service";
import { currentDateOnly, nowEpoch } from "../utils/epoch";

// System user ID for automated operations - should match a SuperAdmin employee in DB
const SYSTEM_USER_ID = BigInt(1); // Adjust this to match your system admin employee ID

export interface BulkPayslipGenerationResult {
  success: boolean;
  totalEmployees: number;
  successfulPayslips: number;
  failedPayslips: number;
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
  generationTime: number; // milliseconds
}

/**
 * Generates payslips for all active employees for the current month
 * This is designed to run automatically on the last day of each month
 */
export const generateMonthlyPayslipsForAllEmployees = async (): Promise<BulkPayslipGenerationResult> => {
  const startTime = Date.now();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();
  const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
  const dateString = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  
  console.log(`[PAYSLIP-AUTO] Starting bulk payslip generation for ${currentMonth}/${currentYear}`);
  
  const result: BulkPayslipGenerationResult = {
    success: false,
    totalEmployees: 0,
    successfulPayslips: 0,
    failedPayslips: 0,
    errors: [],
    generationTime: 0,
  };

  try {
    // Get all active employees
    const activeEmployees = await prisma.employee.findMany({
      where: {
        isActive: true,
      },
      select: {
        employeeId: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
      },
      orderBy: {
        employeeId: 'asc',
      },
    });

    result.totalEmployees = activeEmployees.length;
    console.log(`[PAYSLIP-AUTO] Found ${result.totalEmployees} active employees`);

    if (result.totalEmployees === 0) {
      console.warn(`[PAYSLIP-AUTO] No active employees found for payslip generation`);
      result.success = true;
      result.generationTime = Date.now() - startTime;
      return result;
    }

    // Generate payslips for each employee
    for (const employee of activeEmployees) {
      try {
        // Check if payslip already exists for this employee and period
        const existingPayslip = await prisma.payslip.findFirst({
          where: {
            employeeId: employee.employeeId,
            payrollRun: {
              payrollMonth: currentMonth,
              payrollYear: currentYear,
            },
          },
          select: { payslipId: true, status: true },
        });

        if (existingPayslip) {
          console.log(`[PAYSLIP-AUTO] Payslip already exists for employee ${employee.employeeId} (${employee.fullName}) - Status: ${existingPayslip.status}`);
          result.successfulPayslips++;
          continue;
        }

        // Generate the payslip
        await generatePayslipForEmployeeService({
          employeeId: employee.employeeId,
          date: dateString,
          month: currentMonth,
          year: currentYear,
          performedById: SYSTEM_USER_ID,
          timestamp: nowEpoch(),
        });

        result.successfulPayslips++;
        console.log(`[PAYSLIP-AUTO] ✅ Generated payslip for employee ${employee.employeeId} (${employee.fullName})`);

      } catch (error) {
        result.failedPayslips++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        result.errors.push({
          employeeId: employee.employeeId.toString(),
          error: errorMessage,
        });

        console.error(`[PAYSLIP-AUTO] ❌ Failed to generate payslip for employee ${employee.employeeId} (${employee.fullName}): ${errorMessage}`);
      }
    }

    result.success = result.failedPayslips === 0;
    result.generationTime = Date.now() - startTime;

    // Log final summary
    console.log(`[PAYSLIP-AUTO] Bulk generation completed:`, {
      month: `${currentMonth}/${currentYear}`,
      totalEmployees: result.totalEmployees,
      successful: result.successfulPayslips,
      failed: result.failedPayslips,
      duration: `${result.generationTime}ms`,
      success: result.success,
    });

    // Create audit log entry for the bulk operation
    await createBulkGenerationAuditLog(result, currentMonth, currentYear);

    return result;

  } catch (error) {
    result.generationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[PAYSLIP-AUTO] 🚨 Bulk payslip generation failed:`, errorMessage);
    
    result.errors.push({
      employeeId: 'SYSTEM',
      error: `Bulk generation failed: ${errorMessage}`,
    });

    // Try to create audit log even for failures
    try {
      await createBulkGenerationAuditLog(result, currentMonth, currentYear);
    } catch (auditError) {
      console.error(`[PAYSLIP-AUTO] Failed to create audit log:`, auditError);
    }

    throw new PayrollDomainError(`Bulk payslip generation failed: ${errorMessage}`, 500);
  }
};

/**
 * Generates payslips for a specific month/year for all active employees
 * Useful for manual runs or catch-up operations
 */
export const generatePayslipsForMonth = async (
  month: number,
  year: number,
  performedById: bigint = SYSTEM_USER_ID
): Promise<BulkPayslipGenerationResult> => {
  const startTime = Date.now();
  
  // Validate month and year
  if (month < 1 || month > 12) {
    throw new PayrollDomainError('Invalid month. Must be between 1 and 12.', 400);
  }
  
  const currentYear = new Date().getFullYear();
  if (year < 2020 || year > currentYear + 1) {
    throw new PayrollDomainError(`Invalid year. Must be between 2020 and ${currentYear + 1}.`, 400);
  }

  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
  
  console.log(`[PAYSLIP-MANUAL] Starting manual payslip generation for ${month}/${year}`);
  
  const result: BulkPayslipGenerationResult = {
    success: false,
    totalEmployees: 0,
    successfulPayslips: 0,
    failedPayslips: 0,
    errors: [],
    generationTime: 0,
  };

  try {
    // Get all active employees
    const activeEmployees = await prisma.employee.findMany({
      where: {
        isActive: true,
      },
      select: {
        employeeId: true,
        fullName: true,
        emailAddress: true,
        assignedRole: true,
        assignedDepartment: true,
      },
      orderBy: {
        employeeId: 'asc',
      },
    });

    result.totalEmployees = activeEmployees.length;

    // Generate payslips for each employee
    for (const employee of activeEmployees) {
      try {
        await generatePayslipForEmployeeService({
          employeeId: employee.employeeId,
          date: dateString,
          month: month,
          year: year,
          performedById: performedById,
          timestamp: nowEpoch(),
        });

        result.successfulPayslips++;
        console.log(`[PAYSLIP-MANUAL] ✅ Generated payslip for employee ${employee.employeeId} (${employee.fullName})`);

      } catch (error) {
        result.failedPayslips++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        result.errors.push({
          employeeId: employee.employeeId.toString(),
          error: errorMessage,
        });

        console.error(`[PAYSLIP-MANUAL] ❌ Failed to generate payslip for employee ${employee.employeeId} (${employee.fullName}): ${errorMessage}`);
      }
    }

    result.success = result.failedPayslips === 0;
    result.generationTime = Date.now() - startTime;

    // Create audit log entry
    await createBulkGenerationAuditLog(result, month, year, performedById);

    return result;

  } catch (error) {
    result.generationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[PAYSLIP-MANUAL] 🚨 Manual payslip generation failed:`, errorMessage);
    
    throw new PayrollDomainError(`Manual payslip generation failed: ${errorMessage}`, 500);
  }
};

/**
 * Creates an audit log entry for bulk payslip generation operations
 * Note: Using console logging for now since we don't have a payroll run audit table
 */
const createBulkGenerationAuditLog = async (
  result: BulkPayslipGenerationResult,
  month: number,
  year: number,
  performedById: bigint = SYSTEM_USER_ID
) => {
  try {
    // Log the operation details to console for now
    console.log(`[PAYSLIP-AUDIT] Bulk Generation Completed:`, {
      timestamp: new Date().toISOString(),
      month,
      year,
      performedById: performedById.toString(),
      totalEmployees: result.totalEmployees,
      successfulPayslips: result.successfulPayslips,
      failedPayslips: result.failedPayslips,
      generationTimeMs: result.generationTime,
      success: result.success,
      errors: result.errors,
    });

    // TODO: Create a proper audit table for bulk operations
    // For now, we could use individual payslip audit logs if needed
    
  } catch (error) {
    console.error(`[PAYSLIP-AUDIT] Failed to create audit log:`, error);
  }
};

/**
 * Checks if today is the last day of the current month
 */
export const isLastDayOfMonth = (): boolean => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return today.getMonth() !== tomorrow.getMonth();
};

/**
 * Gets the last day of a specific month/year
 */
export const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};