import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { 
  generatePayslipsForMonth, 
  generateMonthlyPayslipsForAllEmployees,
  BulkPayslipGenerationResult 
} from "../services/payslip-bulk.service";
import {
  generateHistoricalPayslips,
  generatePayslipsForDateRange,
  getPayslipCoverage,
  HistoricalGenerationResult
} from "../services/payslip-historical.service";
import {
  getSchedulerStatus,
  manualTriggerPayslipGeneration,
  startPayslipScheduler,
  stopPayslipScheduler,
  getNextScheduledRun
} from "../services/payslip-scheduler.service";

/**
 * Manually trigger payslip generation for all employees for the current month
 * SuperAdmin and Manager only
 */
export const triggerMonthlyPayslipGeneration = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    console.log(`[PAYSLIP-MANUAL] Manual payslip generation triggered by ${req.employee.username} (${req.employee.assignedRole})`);
    
    const result = await manualTriggerPayslipGeneration();
    
    return res.status(200).json({
      message: "Monthly payslip generation completed",
      result: {
        success: result.success,
        totalEmployees: result.totalEmployees,
        successfulPayslips: result.successfulPayslips,
        failedPayslips: result.failedPayslips,
        generationTimeMs: result.generationTime,
        errors: result.errors,
      },
    });

  } catch (error) {
    console.error(`[PAYSLIP-MANUAL] Manual trigger failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to generate monthly payslips",
      error: errorMessage,
    });
  }
};

/**
 * Generate payslips for a specific month/year for all employees
 * SuperAdmin and Manager only
 */
export const generatePayslipsForSpecificMonth = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { month, year } = req.body;

  // Validation
  if (!month || !year) {
    return res.status(400).json({ 
      message: "Month and year are required",
      example: { month: 12, year: 2026 }
    });
  }

  if (typeof month !== 'number' || month < 1 || month > 12) {
    return res.status(400).json({ message: "Invalid month. Must be between 1 and 12." });
  }

  if (typeof year !== 'number' || year < 2020 || year > new Date().getFullYear() + 1) {
    return res.status(400).json({ 
      message: `Invalid year. Must be between 2020 and ${new Date().getFullYear() + 1}.` 
    });
  }

  try {
    console.log(`[PAYSLIP-SPECIFIC] Manual payslip generation for ${month}/${year} triggered by ${req.employee.username}`);
    
    const result = await generatePayslipsForMonth(
      month, 
      year, 
      BigInt(req.employee.employeeId)
    );
    
    return res.status(200).json({
      message: `Payslip generation for ${month}/${year} completed`,
      period: { month, year },
      result: {
        success: result.success,
        totalEmployees: result.totalEmployees,
        successfulPayslips: result.successfulPayslips,
        failedPayslips: result.failedPayslips,
        generationTimeMs: result.generationTime,
        errors: result.errors,
      },
    });

  } catch (error) {
    console.error(`[PAYSLIP-SPECIFIC] Generation failed for ${month}/${year}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: `Failed to generate payslips for ${month}/${year}`,
      error: errorMessage,
    });
  }
};

/**
 * Get the status of the automatic payslip scheduler
 * SuperAdmin and Manager only
 */
export const getPayslipSchedulerStatus = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const status = getSchedulerStatus();
    const nextRun = getNextScheduledRun();
    
    return res.status(200).json({
      scheduler: {
        isActive: status.isActive,
        isRunning: status.isRunning,
        nextScheduledRun: nextRun,
        taskName: status.taskName,
      },
      configuration: {
        enabled: status.config.enabled,
        cronExpression: status.config.cronExpression,
        timezone: status.config.timezone,
        retryAttempts: status.config.retryAttempts,
        retryDelayMs: status.config.retryDelayMs,
      },
    });

  } catch (error) {
    console.error(`[PAYSLIP-STATUS] Failed to get scheduler status:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to get scheduler status",
      error: errorMessage,
    });
  }
};

/**
 * Start the automatic payslip scheduler
 * SuperAdmin only
 */
export const startScheduler = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.employee.assignedRole !== 'SuperAdmin') {
    return res.status(403).json({ 
      message: "Only SuperAdmin can control the scheduler" 
    });
  }

  try {
    startPayslipScheduler();
    
    console.log(`[PAYSLIP-SCHEDULER] Scheduler started by ${req.employee.username}`);
    
    return res.status(200).json({
      message: "Payslip scheduler started successfully",
      status: getSchedulerStatus(),
    });

  } catch (error) {
    console.error(`[PAYSLIP-SCHEDULER] Failed to start scheduler:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to start scheduler",
      error: errorMessage,
    });
  }
};

/**
 * Stop the automatic payslip scheduler
 * SuperAdmin only
 */
export const stopScheduler = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.employee.assignedRole !== 'SuperAdmin') {
    return res.status(403).json({ 
      message: "Only SuperAdmin can control the scheduler" 
    });
  }

  try {
    stopPayslipScheduler();
    
    console.log(`[PAYSLIP-SCHEDULER] Scheduler stopped by ${req.employee.username}`);
    
    return res.status(200).json({
      message: "Payslip scheduler stopped successfully",
      status: getSchedulerStatus(),
    });

  } catch (error) {
    console.error(`[PAYSLIP-SCHEDULER] Failed to stop scheduler:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to stop scheduler",
      error: errorMessage,
    });
  }
};

/**
 * Generate historical payslips from January 2026 to current month
 * SuperAdmin and Manager only
 */
export const generateHistoricalPayslipsController = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    console.log(`[PAYSLIP-HISTORICAL] Historical payslip generation triggered by ${req.employee.username} (${req.employee.assignedRole})`);
    
    const result = await generateHistoricalPayslips(BigInt(req.employee.employeeId));
    
    return res.status(200).json({
      message: "Historical payslip generation completed",
      result: {
        success: result.success,
        totalMonths: result.totalMonths,
        successfulMonths: result.successfulMonths,
        failedMonths: result.failedMonths,
        totalGenerationTime: result.totalGenerationTime,
        monthResults: result.monthResults,
        overallErrors: result.overallErrors,
      },
    });

  } catch (error) {
    console.error(`[PAYSLIP-HISTORICAL] Historical generation failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to generate historical payslips",
      error: errorMessage,
    });
  }
};

/**
 * Generate payslips for a custom date range
 * SuperAdmin and Manager only
 */
export const generatePayslipsForDateRangeController = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const { startMonth, startYear, endMonth, endYear } = req.body;

  // Validation
  if (!startMonth || !startYear || !endMonth || !endYear) {
    return res.status(400).json({ 
      message: "startMonth, startYear, endMonth, and endYear are required",
      example: { 
        startMonth: 1, 
        startYear: 2026, 
        endMonth: 6, 
        endYear: 2026 
      }
    });
  }

  try {
    console.log(`[PAYSLIP-RANGE] Date range generation ${startMonth}/${startYear} to ${endMonth}/${endYear} triggered by ${req.employee.username}`);
    
    const result = await generatePayslipsForDateRange(
      startMonth, 
      startYear, 
      endMonth, 
      endYear, 
      BigInt(req.employee.employeeId)
    );
    
    return res.status(200).json({
      message: `Payslip generation for ${startMonth}/${startYear} to ${endMonth}/${endYear} completed`,
      dateRange: { startMonth, startYear, endMonth, endYear },
      result: {
        success: result.success,
        totalMonths: result.totalMonths,
        successfulMonths: result.successfulMonths,
        failedMonths: result.failedMonths,
        totalGenerationTime: result.totalGenerationTime,
        monthResults: result.monthResults,
        overallErrors: result.overallErrors,
      },
    });

  } catch (error) {
    console.error(`[PAYSLIP-RANGE] Date range generation failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to generate payslips for date range",
      error: errorMessage,
    });
  }
};

/**
 * Get payslip coverage analysis to see what months are missing
 * SuperAdmin and Manager only
 */
export const getPayslipCoverageController = async (req: AuthRequest, res: Response) => {
  if (!req.employee) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const coverage = await getPayslipCoverage();
    
    return res.status(200).json({
      message: "Payslip coverage analysis completed",
      ...coverage,
    });

  } catch (error) {
    console.error(`[PAYSLIP-COVERAGE] Coverage analysis failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      message: "Failed to analyze payslip coverage",
      error: errorMessage,
    });
  }
};