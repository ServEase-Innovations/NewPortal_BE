// src/swagger/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Employee Management API',
      version: '2.0.0',
      description: `Employee Management System with Enhanced Authentication Security
      
**Authentication:**
- **Primary**: HTTP-only cookie-based JWT authentication (recommended)
- **Fallback**: Bearer token authentication (for backward compatibility)
- **Refresh Tokens**: Automatic token rotation with 7-day refresh tokens
- **CSRF Protection**: Enabled for cross-site deployments

**Security Features:**
- Short-lived access tokens (15 minutes by default)
- HTTP-only cookies prevent XSS attacks
- Configurable SameSite policy for cross-origin support
- Role-based authorization on sensitive endpoints

**Important Notes:**
- **Employee IDs**: Auto-incremented integers (1, 2, 3...) returned as strings in JSON
- **Timestamps**: All date/time fields are stored internally as epoch milliseconds (BigInt) but are automatically converted to/from ISO 8601 format in API requests and responses
- **Date Format**: Use ISO 8601 format for all date/time fields (e.g., "2026-07-10T14:30:00.000Z")
- **Authentication**: Cookies are set automatically on login and used for subsequent requests`,
      contact: {
        name: 'API Support',
        email: 'support@company.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development Server',
      },
      {
        url: 'http://localhost:5001',
        description: 'Alternative Development Server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'HTTP-only cookie containing JWT access token (primary authentication method)',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token authentication (fallback for API clients)',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'CSRF token for state-changing operations (required when CSRF protection is enabled)',
        },
      },
      schemas: {
        Employee: {
          type: 'object',
          properties: {
            employeeId: {
              type: 'string',
              description: 'Unique employee identifier',
              example: '1',
            },
            fullName: {
              type: 'string',
              description: 'Full name of the employee',
              example: 'John Doe',
            },
            username: {
              type: 'string',
              description: 'Unique username for login',
              example: 'johndoe',
            },
            emailAddress: {
              type: 'string',
              format: 'email',
              description: 'Employee email address',
              example: 'john.doe@company.com',
            },
            assignedRole: {
              type: 'string',
              enum: ['SuperAdmin', 'HR', 'Manager', 'Developer', 'Marketing', 'CustomStaff'],
              description: 'Employee role in the system',
              example: 'Developer',
            },
            assignedDepartment: {
              type: 'string',
              description: 'Department where employee works',
              example: 'Engineering',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the employee account is active',
              example: true,
            },
            baseSalary: {
              type: 'number',
              description: 'Base salary amount',
              example: 50000,
            },
            allowances: {
              type: 'number',
              description: 'Additional allowances',
              example: 5000,
            },
            deductions: {
              type: 'number',
              description: 'Salary deductions',
              example: 1000,
            },
            joinedAt: {
              type: 'string',
              description: 'Employee join date (epoch timestamp as string)',
              example: '1672531200000',
            },
            lastLogin: {
              type: 'string',
              description: 'Last login timestamp (epoch timestamp as string)',
              example: '1672617600000',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Login successful',
            },
            employee: {
              $ref: '#/components/schemas/Employee',
            },
            csrfToken: {
              type: 'string',
              description: 'CSRF token (only included when CSRF protection is enabled)',
              example: 'abc123def456',
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid credentials',
            },
            error: {
              type: 'string',
              description: 'Additional error details (optional)',
              example: 'Authentication failed',
            },
          },
        },
        BulkPayslipResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the bulk operation was successful',
              example: true,
            },
            totalEmployees: {
              type: 'number',
              description: 'Total number of active employees processed',
              example: 25,
            },
            successfulPayslips: {
              type: 'number',
              description: 'Number of payslips generated successfully',
              example: 24,
            },
            failedPayslips: {
              type: 'number',
              description: 'Number of payslips that failed to generate',
              example: 1,
            },
            generationTimeMs: {
              type: 'number',
              description: 'Total time taken for the operation in milliseconds',
              example: 5430,
            },
            errors: {
              type: 'array',
              description: 'List of errors encountered during generation',
              items: {
                type: 'object',
                properties: {
                  employeeId: {
                    type: 'string',
                    description: 'Employee ID that encountered the error',
                    example: '5',
                  },
                  error: {
                    type: 'string',
                    description: 'Error message',
                    example: 'Insufficient salary data for payslip calculation',
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Cookie-based authentication with JWT tokens and CSRF protection',
      },
      {
        name: 'Employees',
        description: 'Employee management endpoints (requires authentication)',
      },
      {
        name: 'Teams',
        description: 'Team management endpoints (requires authentication)',
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking endpoints (requires authentication)',
      },
      {
        name: 'Daily Tasks',
        description: 'Date-based employee work reports, Jira links, and attachments (requires authentication)',
      },
      {
        name: 'Payslips',
        description: 'Payslip review, employee self-service, adjustments, and PDF downloads (requires authentication)',
      },
      {
        name: 'Leave Management',
        description: 'Leave requests, balances, and approvals (requires authentication and role-based authorization)',
      },
      {
        name: 'Payslip Automation',
        description: 'Automatic payslip generation, scheduling, and bulk operations (requires SuperAdmin/Manager access)',
      },
    ],
  },
  // Use relative paths from project root
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options) as any;

// Log to help debug
const spec = swaggerSpec as any;
console.log('Swagger API paths found:', Object.keys(spec.paths || {}).length);
if (Object.keys(spec.paths || {}).length === 0) {
  console.warn('⚠️  No API paths found! Check route files have @swagger comments');
}

export default swaggerSpec;
