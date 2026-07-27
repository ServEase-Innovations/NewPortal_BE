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
        url: 'http://localhost:5001',
        description: 'Development Server',
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
        name: 'Payroll',
        description: 'Monthly payroll generation, approval, and payment processing',
      },
      {
        name: 'Payslips',
        description: 'Payslip review, employee self-service, adjustments, and PDF downloads',
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
