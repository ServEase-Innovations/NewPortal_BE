// src/swagger/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Employee Management API',
      version: '1.0.0',
      description: 'Employee Management System with HR Role Support',
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
    ],
  },
  // Use relative paths from project root
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

// Log to help debug
console.log('Swagger API paths found:', Object.keys(swaggerSpec.paths || {}).length);
if (Object.keys(swaggerSpec.paths || {}).length === 0) {
  console.warn('⚠️  No API paths found! Check route files have @swagger comments');
}

export default swaggerSpec;