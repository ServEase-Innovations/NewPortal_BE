// src/swagger/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Employee Management API',
      version: '1.0.0',
      description: `Employee Management System with HR Role Support
      
**Important Notes:**
- **Employee IDs**: Auto-incremented integers (1, 2, 3...) returned as strings in JSON
- **Timestamps**: All date/time fields are stored internally as epoch milliseconds (BigInt) but are automatically converted to/from ISO 8601 format in API requests and responses
- **Date Format**: Use ISO 8601 format for all date/time fields (e.g., "2026-07-10T14:30:00.000Z")`,
      contact: {
        name: 'API Support',
        email: 'support@company.com',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current server (resolves relative to whatever host/port you loaded Swagger UI from)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      // ✅ ADDED: Missing schemas section
      schemas: {
        // Authentication schemas
        AuthResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token',
            },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'User ID',
                },
                username: {
                  type: 'string',
                  description: 'Username',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Email address',
                },
                fullName: {
                  type: 'string',
                  description: 'Full name of the user',
                },
                role: {
                  type: 'string',
                  description: 'User role',
                  enum: ['SuperAdmin', 'Manager', 'HR', 'Developer', 'Marketing', 'CustomStaff'],
                },
                department: {
                  type: 'string',
                  description: 'Department name',
                },
                teamId: {
                  type: 'string',
                  description: 'Team ID',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Detailed error information (only in development)',
            },
            errors: {
              type: 'object',
              description: 'Validation errors',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
        // Daily Task schemas
        DailyTask: {
          type: 'object',
          properties: {
            dailyTaskSubmissionId: {
              type: 'string',
              description: 'Unique ID of the daily task submission',
            },
            employeeId: {
              type: 'string',
              description: 'ID of the employee who submitted the report',
            },
            workDescription: {
              type: 'string',
              description: 'Description of work done',
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Completed'],
              description: 'Status of the task',
            },
            newIdeas: {
              type: 'string',
              nullable: true,
              description: 'New ideas or improvements',
            },
            submissionDate: {
              type: 'string',
              format: 'date',
              description: 'Date of submission',
            },
            submissionDateEpoch: {
              type: 'string',
              description: 'Submission date in epoch milliseconds',
            },
            submittedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of submission',
            },
            submittedAtEpoch: {
              type: 'string',
              description: 'Submission timestamp in epoch milliseconds',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
            updatedAtEpoch: {
              type: 'string',
              description: 'Last update timestamp in epoch milliseconds',
            },
            jiraLinks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dailyTaskJiraLinkId: {
                    type: 'string',
                  },
                  label: {
                    type: 'string',
                    nullable: true,
                  },
                  url: {
                    type: 'string',
                    format: 'uri',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                  createdAtEpoch: {
                    type: 'string',
                  },
                },
              },
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dailyTaskAttachmentId: {
                    type: 'string',
                  },
                  fileName: {
                    type: 'string',
                  },
                  fileUrl: {
                    type: 'string',
                    format: 'uri',
                  },
                  fileType: {
                    type: 'string',
                  },
                  mimeType: {
                    type: 'string',
                  },
                  fileSize: {
                    type: 'number',
                  },
                  uploadedAt: {
                    type: 'string',
                    format: 'date-time',
                  },
                  uploadedAtEpoch: {
                    type: 'string',
                  },
                },
              },
            },
            employee: {
              type: 'object',
              properties: {
                employeeId: {
                  type: 'string',
                },
                fullName: {
                  type: 'string',
                },
                emailAddress: {
                  type: 'string',
                  format: 'email',
                },
                username: {
                  type: 'string',
                },
                assignedRole: {
                  type: 'string',
                },
                assignedDepartment: {
                  type: 'string',
                },
                teamId: {
                  type: 'string',
                },
              },
            },
          },
        },
        DailyTaskListResponse: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Date for which tasks are fetched',
            },
            count: {
              type: 'integer',
              description: 'Number of tasks returned',
            },
            dailyTasks: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/DailyTask',
              },
            },
          },
        },
        DailyTaskCreateResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            dailyTask: {
              $ref: '#/components/schemas/DailyTask',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            limit: {
              type: 'integer',
              description: 'Records per page',
            },
            totalCount: {
              type: 'integer',
              description: 'Total number of records',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
            hasNextPage: {
              type: 'boolean',
              description: 'Whether there is a next page',
            },
            hasPreviousPage: {
              type: 'boolean',
              description: 'Whether there is a previous page',
            },
          },
        },
        // Payslip schemas
        Payslip: {
          type: 'object',
          properties: {
            payslipId: {
              type: 'string',
            },
            employeeId: {
              type: 'string',
            },
            month: {
              type: 'integer',
              minimum: 1,
              maximum: 12,
            },
            year: {
              type: 'integer',
            },
            status: {
              type: 'string',
              enum: ['Draft', 'Approved', 'Paid', 'Cancelled'],
            },
            workingDays: {
              type: 'integer',
            },
            payableDays: {
              type: 'integer',
            },
            unpaidLeaveDays: {
              type: 'integer',
            },
            totalEarnings: {
              type: 'number',
            },
            totalDeductions: {
              type: 'number',
            },
            netPay: {
              type: 'number',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PayslipListResponse: {
          type: 'object',
          properties: {
            payslips: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Payslip',
              },
            },
            pagination: {
              $ref: '#/components/schemas/Pagination',
            },
          },
        },
        PayslipGenerateResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
            },
            payslip: {
              $ref: '#/components/schemas/Payslip',
            },
          },
        },
        GeneratePayslipPayload: {
          type: 'object',
          required: ['employeeId', 'month', 'year'],
          properties: {
            employeeId: {
              type: 'string',
              description: 'Employee ID',
            },
            month: {
              type: 'integer',
              minimum: 1,
              maximum: 12,
              description: 'Month (1-12)',
            },
            year: {
              type: 'integer',
              description: 'Year',
            },
          },
        },
        // Employee schema
        Employee: {
          type: 'object',
          properties: {
            employeeId: {
              type: 'string',
            },
            fullName: {
              type: 'string',
            },
            emailAddress: {
              type: 'string',
              format: 'email',
            },
            username: {
              type: 'string',
            },
            assignedRole: {
              type: 'string',
              enum: ['SuperAdmin', 'Manager', 'HR', 'Developer', 'Marketing', 'CustomStaff'],
            },
            assignedDepartment: {
              type: 'string',
            },
            teamId: {
              type: 'string',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        // Attendance schemas
        Attendance: {
          type: 'object',
          properties: {
            attendanceId: {
              type: 'string',
            },
            employeeId: {
              type: 'string',
            },
            date: {
              type: 'string',
              format: 'date',
            },
            checkIn: {
              type: 'string',
              format: 'date-time',
            },
            checkOut: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            totalHours: {
              type: 'number',
            },
            status: {
              type: 'string',
              enum: ['Present', 'Absent', 'Half-Day', 'Holiday'],
            },
          },
        },
        // Team schemas
        Team: {
          type: 'object',
          properties: {
            teamId: {
              type: 'string',
            },
            teamName: {
              type: 'string',
            },
            teamLead: {
              type: 'string',
            },
            department: {
              type: 'string',
            },
            memberCount: {
              type: 'integer',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        // Leave schemas
        LeaveRequest: {
          type: 'object',
          properties: {
            leaveRequestId: {
              type: 'string',
            },
            employeeId: {
              type: 'string',
            },
            leaveType: {
              type: 'string',
              enum: ['Sick', 'Casual', 'Privilege', 'Other'],
            },
            fromDate: {
              type: 'string',
              format: 'date',
            },
            toDate: {
              type: 'string',
              format: 'date',
            },
            reason: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['Pending', 'Approved', 'Rejected'],
            },
            attachmentUrl: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication endpoints',
      },
      {
        name: 'Employees',
        description: 'Employee management endpoints',
      },
      {
        name: 'Teams',
        description: 'Team management endpoints',
      },
      {
        name: 'Attendance',
        description: 'Attendance tracking endpoints',
      },
      {
        name: 'Daily Tasks',
        description: 'Date-based employee work reports, Jira links, and attachments',
      },
      {
        name: 'Payslips',
        description: 'Payslip review, employee self-service, adjustments, and PDF downloads',
      },
      {
        name: 'Payslip Automation',
        description: 'Automated payslip generation and management',
      },
      {
        name: 'Leave',
        description: 'Leave management endpoints',
      },
    ],
  },
  // Use relative paths from project root
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './src/swagger/docs/*.ts',
    './src/swagger/docs/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options) as any;

// Log to help debug
const spec = swaggerSpec as any;
console.log('Swagger API paths found:', Object.keys(spec.paths || {}).length);
if (Object.keys(spec.paths || {}).length === 0) {
  console.warn('⚠️  No API paths found! Check route files have @swagger comments');
}

export default swaggerSpec;