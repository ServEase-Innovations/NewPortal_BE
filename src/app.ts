// src/app.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth.routes';
import employeeRoutes from "./routes/employee.routes";
import swaggerSpec from "./swagger/swagger";
import teamRoutes from "./routes/team.routes";
import attendanceRoutes from "./routes/attendance.routes";
import dailyTaskRoutes from "./routes/daily-task.routes";
import payslipRoutes from "./routes/payslip.routes";
import payslipAutomationRoutes from "./routes/payslip-automation.routes";
import leaveRoutes from "./routes/leave.routes";
import { startPayslipScheduler } from "./services/payslip-scheduler.service";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Get frontend URL from environment
const FRONTEND_PORT = process.env.FRONTEND_PORT || '3000';
const FRONTEND_URL = process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`;

// ✅ Allow both frontend and backend origins (including the current server)
const allowedOrigins = [
  FRONTEND_URL,
  `http://localhost:${FRONTEND_PORT}`,
  `http://127.0.0.1:${FRONTEND_PORT}`,
  `http://localhost:${PORT}`, // ✅ Allow the backend itself
  `http://127.0.0.1:${PORT}`, // ✅ Allow the backend itself (IP variant)
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:4200',
  'http://localhost:8080',
  'http://localhost:4000', // ✅ Explicitly allow port 4000
  'http://127.0.0.1:4000', // ✅ Explicitly allow port 4000 (IP variant)
];

console.log('🔒 CORS: Allowing origins:', allowedOrigins);

// ✅ CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('✅ CORS: No origin allowed');
      return callback(null, true);
    }

    console.log(`📍 CORS: Request from origin: ${origin}`);

    // Check if the origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowed ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS: Blocked ${origin}`);
      callback(new Error(`CORS blocked: ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Serve static files
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Employee Management API Docs"
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use("/employees", employeeRoutes);
app.use("/teams", teamRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/daily-tasks", dailyTaskRoutes);
app.use("/payslips", payslipRoutes);
app.use("/payslips/automation", payslipAutomationRoutes);
app.use("/leave", leaveRoutes);
app.use("/auth", authRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: err.message,
      allowedOrigins: allowedOrigins
    });
  }
  
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Swagger UI available at: http://localhost:${PORT}/api-docs`);
  console.log(`📄 Swagger JSON available at: http://localhost:${PORT}/api-docs.json`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS: Allowing origins:`, allowedOrigins);
  
  try {
    startPayslipScheduler();
    console.log(`✅ Payslip automation scheduler initialized`);
  } catch (error) {
    console.error(`❌ Failed to initialize payslip scheduler:`, error);
  }
});

export default app;
