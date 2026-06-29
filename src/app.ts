import express from "express";
import swaggerUi from "swagger-ui-express";

import employeeRoutes from "./routes/employee.routes";
import swaggerSpec from "./swagger/swagger";
import teamRoutes from "./routes/team.routes";
import attendanceRoutes from "./routes/attendance.routes";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);

app.use("/employees", employeeRoutes);
app.use("/teams", teamRoutes);
app.use("/attendance", attendanceRoutes);
app.listen(5000, () => {
  console.log("Server running on port 5000");
});