import express from 'express';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

import employeeRoutes from './routes/employee.routes';
import teamRoutes from './routes/team.routes';
import authRoutes from './routes/auth.routes';
import swaggerSpec from './swagger/swagger';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/employees', employeeRoutes);
app.use('/teams', teamRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});