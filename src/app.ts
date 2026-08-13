// src/index.ts
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
import leaveRoutes from "./routes/leave.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(cookieParser()); // Parse cookies from requests

// CORS configuration with credentials support
const allowedOrigins = [
  'http://localhost:3000', // Development frontend
  'http://localhost:8080', // Alternative dev port
  process.env.FRONTEND_URL, // Production frontend URL from env
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

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
app.use("/leave", leaveRoutes);
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI available at: http://localhost:${PORT}/api-docs`);
  console.log(`Swagger JSON available at: http://localhost:${PORT}/api-docs.json`);
});
