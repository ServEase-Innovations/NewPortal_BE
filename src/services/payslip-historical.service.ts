import { generatePayslipsForMonth, BulkPayslipGenerationResult } from './payslip-bulk.service';
import { nowEpoch } from '../utils/epoch';

// System user ID for automated operations
const SYSTEM_USER_ID = BigInt(1);

export interface HistoricalGenerationResult {
  success: boolean;
  totalMonths: number;
  successfulMonths: number;
  failedMonths: number;
  monthResults: Array<{
    month: number;
    year: number;
    success: boolean;
    totalEmployees: number;
    successfulPayslips: number;
    failedPayslips: number;
    errors: Array<{ employeeId: string; error: string }>;
  }>;
  totalGenerationTime: number;
  overallErrors: string[];
}

/**
 * Generates payslips for all missing months from January 2026 to current month
 * This will create historical payslips for all active employees
 */
export const generateHistoricalPayslips = async (
  performedById: bigint = SYSTEM_USER_ID
): Promise<HistoricalGenerationResult> => {
  const startTime = Date.now();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
  const currentYear = currentDate.getFullYear();
  
  console.log(`[PAYSLIP-HISTORICAL] Starting historical payslip generation from January ${currentYear} to ${currentMonth}/${currentYear}`);
  
  const result: HistoricalGenerationResult = {
    success: false,
    totalMonths: 0,
    successfulMonths: 0,
    failedMonths: 0,
    monthResults: [],
    totalGenerationTime: 0,
    overallErrors: [],
  };

  try {
    // Generate list of months to process (January to current month of current year)
    const monthsToProcess: Array<{ month: number; year: number }> = [];
    
    for (let month = 1; month <= currentMonth; month++) {
      monthsToProcess.push({ month, year: currentYear });
    }
    
    result.totalMonths = monthsToProcess.length;
    console.log(`[PAYSLIP-HISTORICAL] Will process ${result.totalMonths} months: ${monthsToProcess.map(m => `${m.month}/${m.year}`).join(', ')}`);

    // Process each month
    for (const { month, year } of monthsToProcess) {
      try {
        console.log(`[PAYSLIP-HISTORICAL] 🚀 Processing ${month}/${year}...`);
        
        const monthResult = await generatePayslipsForMonth(month, year, performedById);
        
        result.monthResults.push({
          month,
          year,
          success: monthResult.success,
          totalEmployees: monthResult.totalEmployees,
          successfulPayslips: monthResult.successfulPayslips,
          failedPayslips: monthResult.failedPayslips,
          errors: monthResult.errors,
        });

        if (monthResult.success) {
          result.successfulMonths++;
          console.log(`[PAYSLIP-HISTORICAL] ✅ ${month}/${year} completed: ${monthResult.successfulPayslips}/${monthResult.totalEmployees} payslips generated`);
        } else {
          result.failedMonths++;
          console.log(`[PAYSLIP-HISTORICAL] ❌ ${month}/${year} failed: ${monthResult.failedPayslips} failures out of ${monthResult.totalEmployees}`);
        }

        // Small delay between months to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        result.failedMonths++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        result.overallErrors.push(`${month}/${year}: ${errorMessage}`);
        result.monthResults.push({
          month,
          year,
          success: false,
          totalEmployees: 0,
          successfulPayslips: 0,
          failedPayslips: 0,
          errors: [{ employeeId: 'SYSTEM', error: errorMessage }],
        });

        console.error(`[PAYSLIP-HISTORICAL] 🚨 ${month}/${year} failed completely: ${errorMessage}`);
      }
    }

    result.success = result.failedMonths === 0;
    result.totalGenerationTime = Date.now() - startTime;

    // Final summary
    console.log(`[PAYSLIP-HISTORICAL] Historical generation completed:`, {
      totalMonths: result.totalMonths,
      successful: result.successfulMonths,
      failed: result.failedMonths,
      duration: `${result.totalGenerationTime}ms`,
      success: result.success,
    });

    return result;

  } catch (error) {
    result.totalGenerationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[PAYSLIP-HISTORICAL] 🚨 Historical generation failed:`, errorMessage);
    result.overallErrors.push(`System error: ${errorMessage}`);

    throw new Error(`Historical payslip generation failed: ${errorMessage}`);
  }
};

/**
 * Generates payslips for a specific date range
 * Useful for custom historical generation
 */
export const generatePayslipsForDateRange = async (
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number,
  performedById: bigint = SYSTEM_USER_ID
): Promise<HistoricalGenerationResult> => {
  const startTime = Date.now();
  
  // Validation
  if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) {
    throw new Error('Invalid month. Months must be between 1 and 12.');
  }
  
  if (startYear < 2020 || endYear < 2020 || startYear > endYear) {
    throw new Error('Invalid year range.');
  }
  
  if (startYear === endYear && startMonth > endMonth) {
    throw new Error('Start month cannot be after end month in the same year.');
  }
  
  console.log(`[PAYSLIP-RANGE] Starting payslip generation from ${startMonth}/${startYear} to ${endMonth}/${endYear}`);
  
  const result: HistoricalGenerationResult = {
    success: false,
    totalMonths: 0,
    successfulMonths: 0,
    failedMonths: 0,
    monthResults: [],
    totalGenerationTime: 0,
    overallErrors: [],
  };

  try {
    // Generate list of months to process
    const monthsToProcess: Array<{ month: number; year: number }> = [];
    
    let currentMonth = startMonth;
    let currentYear = startYear;
    
    while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
      monthsToProcess.push({ month: currentMonth, year: currentYear });
      
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
    
    result.totalMonths = monthsToProcess.length;
    console.log(`[PAYSLIP-RANGE] Will process ${result.totalMonths} months`);

    // Process each month
    for (const { month, year } of monthsToProcess) {
      try {
        console.log(`[PAYSLIP-RANGE] 🚀 Processing ${month}/${year}...`);
        
        const monthResult = await generatePayslipsForMonth(month, year, performedById);
        
        result.monthResults.push({
          month,
          year,
          success: monthResult.success,
          totalEmployees: monthResult.totalEmployees,
          successfulPayslips: monthResult.successfulPayslips,
          failedPayslips: monthResult.failedPayslips,
          errors: monthResult.errors,
        });

        if (monthResult.success) {
          result.successfulMonths++;
          console.log(`[PAYSLIP-RANGE] ✅ ${month}/${year} completed successfully`);
        } else {
          result.failedMonths++;
          console.log(`[PAYSLIP-RANGE] ❌ ${month}/${year} had failures`);
        }

        // Small delay between months
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        result.failedMonths++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        result.overallErrors.push(`${month}/${year}: ${errorMessage}`);
        result.monthResults.push({
          month,
          year,
          success: false,
          totalEmployees: 0,
          successfulPayslips: 0,
          failedPayslips: 0,
          errors: [{ employeeId: 'SYSTEM', error: errorMessage }],
        });

        console.error(`[PAYSLIP-RANGE] 🚨 ${month}/${year} failed: ${errorMessage}`);
      }
    }

    result.success = result.failedMonths === 0;
    result.totalGenerationTime = Date.now() - startTime;

    console.log(`[PAYSLIP-RANGE] Range generation completed:`, {
      range: `${startMonth}/${startYear} to ${endMonth}/${endYear}`,
      totalMonths: result.totalMonths,
      successful: result.successfulMonths,
      failed: result.failedMonths,
      duration: `${result.totalGenerationTime}ms`,
    });

    return result;

  } catch (error) {
    result.totalGenerationTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[PAYSLIP-RANGE] 🚨 Range generation failed:`, errorMessage);
    throw new Error(`Date range payslip generation failed: ${errorMessage}`);
  }
};

/**
 * Gets a summary of existing payslips to identify missing months
 */
export const getPayslipCoverage = async (): Promise<{
  coverage: Array<{
    month: number;
    year: number;
    totalPayslips: number;
    totalEmployees: number;
    coveragePercentage: number;
  }>;
  missingMonths: Array<{ month: number; year: number }>;
  summary: {
    totalMonthsCovered: number;
    totalMonthsExpected: number;
    overallCoveragePercentage: number;
  };
}> => {
  console.log(`[PAYSLIP-COVERAGE] Analyzing payslip coverage...`);

  try {
    // Get total active employees count
    const totalEmployees = await prisma.employee.count({
      where: { isActive: true }
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const coverage = [];
    const missingMonths = [];

    // Check each month from January to current month
    for (let month = 1; month <= currentMonth; month++) {
      const payslipCount = await prisma.payslip.count({
        where: {
          payrollRun: {
            payrollMonth: month,
            payrollYear: currentYear,
          }
        }
      });

      const coveragePercentage = totalEmployees > 0 ? (payslipCount / totalEmployees) * 100 : 0;

      coverage.push({
        month,
        year: currentYear,
        totalPayslips: payslipCount,
        totalEmployees,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100,
      });

      if (payslipCount === 0) {
        missingMonths.push({ month, year: currentYear });
      }

      console.log(`[PAYSLIP-COVERAGE] ${month}/${currentYear}: ${payslipCount}/${totalEmployees} payslips (${Math.round(coveragePercentage)}%)`);
    }

    const totalMonthsCovered = coverage.filter(c => c.totalPayslips > 0).length;
    const overallCoveragePercentage = currentMonth > 0 ? (totalMonthsCovered / currentMonth) * 100 : 0;

    const result = {
      coverage,
      missingMonths,
      summary: {
        totalMonthsCovered,
        totalMonthsExpected: currentMonth,
        overallCoveragePercentage: Math.round(overallCoveragePercentage * 100) / 100,
      },
    };

    console.log(`[PAYSLIP-COVERAGE] Analysis complete:`, {
      totalEmployees,
      monthsCovered: totalMonthsCovered,
      monthsExpected: currentMonth,
      missingMonths: missingMonths.length,
      overallCoverage: `${result.summary.overallCoveragePercentage}%`,
    });

    return result;

  } catch (error) {
    console.error(`[PAYSLIP-COVERAGE] Coverage analysis failed:`, error);
    throw new Error(`Failed to analyze payslip coverage: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Import prisma for coverage analysis
import prisma from "../prisma";