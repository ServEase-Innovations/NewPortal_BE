import { Request, Response } from "express";
import { loginService } from "../services/auth.service";

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { username, password } = req.body;

    const result = await loginService(
      username,
      password
    );

    res.status(200).json({
      message: "Login successful",
      ...result,
    });
  } catch (error: any) {
    res.status(401).json({
      message: error.message,
    });
  }
};

export const logout = async (
  req: Request,
  res: Response
) => {
  res.status(200).json({
    message: "Logout successful",
  });
};