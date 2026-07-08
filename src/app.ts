// src/index.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import employeeRoutes from "./routes/employee.routes";
import swaggerSpec from "./swagger/swagger";
import teamRoutes from "./routes/team.routes";
import attendanceRoutes from "./routes/attendance.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
  origin: "*",
  credentials: true,
}));

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
app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI available at: http://localhost:${PORT}/api-docs`);
  console.log(`Swagger JSON available at: http://localhost:${PORT}/api-docs.json`);
});
