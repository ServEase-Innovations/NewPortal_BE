import { Request, Response } from "express";
import { loginSchema } from "../validations/auth.validation";
import { loginService } from "../services/auth.service";

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { username, password } = result.data;

    const response = await loginService(
      username,
      password
    );

    return res.status(200).json({
      message: "Login successful",
      token: response.token,
      employee: response.employee,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(401).json({
      message: error.message || "Invalid username or password",
    });
  }
};