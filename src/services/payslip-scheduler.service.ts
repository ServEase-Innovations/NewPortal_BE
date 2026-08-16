import * as cron from 'node-cron';
import { generateMonthlyPayslipsForAllEmployees, BulkPayslipGenerationResult } from './payslip-bulk.service';
import { nowEpoch } from '../utils/epoch';

// Configuration for the scheduler
interface SchedulerConfig {
  enabled: boolean;
  cronExpression: string; // Default: Run on last day of month at 11:30 PM
  timezone: string;
  retryAttempts: number;
  retryDelayMs: number;
}

const defaultConfig: SchedulerConfig = {
  enabled: process.env.PAYSLIP_AUTO_GENERATION_ENABLED === 'true',
  cronExpression: process.env.PAYSLIP_CRON_EXPRESSION || '30 23 28-31 * *', // 11:30 PM on last days of month
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  retryAttempts: parseInt(process.env.PAYSLIP_RETRY_ATTEMPTS || '3'),
  retryDelayMs: parseInt(process.env.PAYSLIP_RETRY_DELAY_MS || '300000'), // 5 minutes
};

let scheduledTask: cron.ScheduledTask | null = null;
let isRunning = false;

/**
 * Starts the automatic payslip generation scheduler
 */
export const startPayslipScheduler = (config: Partial<SchedulerConfig> = {}): void => {
  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.enabled) {
    console.log('[PAYSLIP-SCHEDULER] Automatic payslip generation is disabled (PAYSLIP_AUTO_GENERATION_ENABLED=false)');
    return;
  }

  if (scheduledTask) {
    console.log('[PAYSLIP-SCHEDULER] Scheduler is already running. Stop it first before starting again.');
    return;
  }

  try {
    // Validate cron expression
    if (!cron.validate(finalConfig.cronExpression)) {
      throw new Error(`Invalid cron expression: ${finalConfig.cronExpression}`);
    }

    console.log(`[PAYSLIP-SCHEDULER] Starting payslip scheduler with config:`, {
      enabled: finalConfig.enabled,
      cronExpression: finalConfig.cronExpression,
      timezone: finalConfig.timezone,
      retryAttempts: finalConfig.retryAttempts,
    });

    scheduledTask = cron.schedule(
      finalConfig.cronExpression,
      async () => {
        await executeScheduledPayslipGeneration(finalConfig);
      },
      {
        timezone: finalConfig.timezone,
      }
    );

    console.log(`[PAYSLIP-SCHEDULER] ✅ Scheduler started successfully. Next run will be determined by cron: ${finalConfig.cronExpression}`);
    
  } catch (error) {
    console.error('[PAYSLIP-SCHEDULER] ❌ Failed to start scheduler:', error);
    throw error;
  }
};

/**
 * Stops the automatic payslip generation scheduler
 */
export const stopPayslipScheduler = (): void => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[PAYSLIP-SCHEDULER] 🛑 Scheduler stopped successfully');
  } else {
    console.log('[PAYSLIP-SCHEDULER] No active scheduler to stop');
  }
};

/**
 * Gets the current status of the scheduler
 */
export const getSchedulerStatus = () => {
  return {
    isActive: scheduledTask !== null,
    isRunning: isRunning,
    config: defaultConfig,
    taskName: 'monthly-payslip-generation',
  };
};

/**
 * Manually trigger payslip generation (useful for testing or manual runs)
 */
export const manualTriggerPayslipGeneration = async (): Promise<BulkPayslipGenerationResult> => {
  console.log('[PAYSLIP-SCHEDULER] Manual trigger initiated');
  return await executeScheduledPayslipGeneration(defaultConfig, true);
};

/**
 * Executes the scheduled payslip generation with retry logic
 */
const executeScheduledPayslipGeneration = async (
  config: SchedulerConfig,
  isManual: boolean = false
): Promise<BulkPayslipGenerationResult> => {
  const triggerType = isManual ? 'MANUAL' : 'SCHEDULED';
  
  if (isRunning) {
    console.log(`[PAYSLIP-SCHEDULER] ${triggerType} trigger skipped - generation already in progress`);
    throw new Error('Payslip generation is already in progress');
  }

  // Check if today is actually the last day of the month (for scheduled runs)
  if (!isManual && !isLastDayOfMonth()) {
    console.log(`[PAYSLIP-SCHEDULER] SCHEDULED trigger skipped - not the last day of the month`);
    return {
      success: false,
      totalEmployees: 0,
      successfulPayslips: 0,
      failedPayslips: 0,
      errors: [{ employeeId: 'SYSTEM', error: 'Not the last day of the month' }],
      generationTime: 0,
    };
  }

  isRunning = true;
  
  try {
    console.log(`[PAYSLIP-SCHEDULER] 🚀 Starting ${triggerType} payslip generation`);
    
    let lastError: Error | null = null;
    
    // Retry logic
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const result = await generateMonthlyPayslipsForAllEmployees();
        
        console.log(`[PAYSLIP-SCHEDULER] ✅ ${triggerType} payslip generation completed successfully on attempt ${attempt}`);
        
        // Send notification about successful generation
        await sendNotification('success', result, triggerType);
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        console.error(`[PAYSLIP-SCHEDULER] ❌ ${triggerType} generation failed on attempt ${attempt}/${config.retryAttempts}:`, lastError.message);
        
        // If not the last attempt, wait before retrying
        if (attempt < config.retryAttempts) {
          console.log(`[PAYSLIP-SCHEDULER] 🔄 Retrying in ${config.retryDelayMs / 1000} seconds...`);
          await delay(config.retryDelayMs);
        }
      }
    }

    // All retry attempts failed
    console.error(`[PAYSLIP-SCHEDULER] 🚨 ${triggerType} payslip generation failed after ${config.retryAttempts} attempts`);
    
    const failureResult: BulkPayslipGenerationResult = {
      success: false,
      totalEmployees: 0,
      successfulPayslips: 0,
      failedPayslips: 0,
      errors: [{ employeeId: 'SYSTEM', error: lastError?.message || 'Unknown error' }],
      generationTime: 0,
    };
    
    // Send notification about failure
    await sendNotification('error', failureResult, triggerType, lastError);
    
    throw lastError;
    
  } finally {
    isRunning = false;
  }
};

/**
 * Helper function to check if today is the last day of the month
 */
const isLastDayOfMonth = (): boolean => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  return today.getMonth() !== tomorrow.getMonth();
};

/**
 * Helper function for delays
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Send notifications about payslip generation results
 * This can be extended to send emails, Slack messages, etc.
 */
const sendNotification = async (
  type: 'success' | 'error',
  result: BulkPayslipGenerationResult,
  triggerType: string,
  error?: Error | null
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    if (type === 'success') {
      console.log(`[PAYSLIP-NOTIFICATION] 📧 SUCCESS: ${triggerType} payslip generation completed`, {
        timestamp,
        period: `${month}/${year}`,
        totalEmployees: result.totalEmployees,
        successful: result.successfulPayslips,
        failed: result.failedPayslips,
        duration: `${result.generationTime}ms`,
      });

      // TODO: Add email notification for HR/Admin users
      // await sendEmailNotification('payslip-generation-success', { result, month, year });
      
    } else {
      console.error(`[PAYSLIP-NOTIFICATION] 🚨 ERROR: ${triggerType} payslip generation failed`, {
        timestamp,
        period: `${month}/${year}`,
        error: error?.message,
        result,
      });

      // TODO: Add email notification for critical errors
      // await sendEmailNotification('payslip-generation-error', { error, result, month, year });
    }

  } catch (notificationError) {
    console.error(`[PAYSLIP-NOTIFICATION] Failed to send notification:`, notificationError);
  }
};

/**
 * Get information about the next scheduled run
 */
export const getNextScheduledRun = (): string | null => {
  if (!scheduledTask) {
    return null;
  }

  try {
    // This is a basic implementation - node-cron doesn't provide next run time directly
    // You might want to use a more sophisticated library like 'cron-parser' for this
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Find the last day of current month
    const lastDayThisMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lastDayDate = new Date(currentYear, currentMonth, lastDayThisMonth, 23, 30);
    
    if (now < lastDayDate) {
      return lastDayDate.toISOString();
    } else {
      // Next month
      const lastDayNextMonth = new Date(currentYear, currentMonth + 2, 0).getDate();
      const nextRunDate = new Date(currentYear, currentMonth + 1, lastDayNextMonth, 23, 30);
      return nextRunDate.toISOString();
    }
  } catch (error) {
    console.error('[PAYSLIP-SCHEDULER] Error calculating next run time:', error);
    return null;
  }
};

// Export configuration for external access
export { SchedulerConfig, defaultConfig as schedulerConfig };