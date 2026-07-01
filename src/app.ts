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

app.use(express.json());

app.use(cors({
  origin: "*",
  credentials: true,
}));

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/employees", employeeRoutes);
app.use("/teams", teamRoutes);
app.use("/attendance", attendanceRoutes);
app.use('/auth', authRoutes);

app.listen(5000, () => {
  console.log("Server running on port 5000");
});