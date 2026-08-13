import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.middleware';
import { login, logout, refreshToken, getCurrentUser } from '../controllers/auth.controller';
import authRoutes from '../routes/auth.routes';

// Mock dependencies
jest.mock('../services/auth.service');
jest.mock('../prisma', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

import { loginService, generateRefreshToken, formatEmployeeData, refreshTokenService } from '../services/auth.service';
import prisma from '../prisma';

const mockedLoginService = loginService as jest.MockedFunction<typeof loginService>;
const mockedGenerateRefreshToken = generateRefreshToken as jest.MockedFunction<typeof generateRefreshToken>;
const mockedFormatEmployeeData = formatEmployeeData as jest.MockedFunction<typeof formatEmployeeData>;
const mockedRefreshTokenService = refreshTokenService as jest.MockedFunction<typeof refreshTokenService>;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Authentication Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Set required environment variables
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';
  });

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRoutes);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    const mockEmployee = {
      employeeId: '1',
      fullName: 'Test User',
      username: 'testuser',
      emailAddress: 'test@example.com',
      assignedRole: 'Employee',
      assignedDepartment: 'Engineering',
      isActive: true,
    };

    it('should login successfully with valid credentials', async () => {
      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockedLoginService.mockResolvedValue({
        token: mockToken,
        employee: mockEmployee,
      });
      mockedGenerateRefreshToken.mockReturnValue(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.employee).toEqual(mockEmployee);
      
      // Check cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.startsWith('refreshToken='))).toBe(true);
      
      // Verify httpOnly flag
      expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should return 401 for invalid credentials', async () => {
      mockedLoginService.mockRejectedValue(new Error('Invalid username or password'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';

      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockedLoginService.mockResolvedValue({
        token: mockToken,
        employee: mockEmployee,
      });
      mockedGenerateRefreshToken.mockReturnValue(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies.some((cookie: string) => cookie.includes('Secure'))).toBe(true);

      process.env.NODE_ENV = 'test';
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear cookies on logout', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // Check that cookies are being cleared
      expect(cookies.some((cookie: string) => 
        cookie.includes('accessToken=') && cookie.includes('Max-Age=0')
      )).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    const mockEmployee = {
      employeeId: '1',
      fullName: 'Test User',
      username: 'testuser',
      emailAddress: 'test@example.com',
      assignedRole: 'Employee',
      assignedDepartment: 'Engineering',
      isActive: true,
    };

    it('should refresh tokens successfully with valid refresh token', async () => {
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      mockedRefreshTokenService.mockResolvedValue({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        employee: mockEmployee,
      });

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=valid-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.employee).toEqual(mockEmployee);

      // Check new cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.startsWith('accessToken='))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.startsWith('refreshToken='))).toBe(true);
    });

    it('should return 401 if refresh token is missing', async () => {
      const response = await request(app)
        .post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Refresh token not found');
    });

    it('should return 401 for invalid refresh token', async () => {
      mockedRefreshTokenService.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired refresh token');

      // Check that refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies.some((cookie: string) => 
        cookie.includes('refreshToken=') && cookie.includes('Max-Age=0')
      )).toBe(true);
    });

    it('should not expose internal error details', async () => {
      mockedRefreshTokenService.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=some-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired refresh token');
      expect(response.body.message).not.toContain('Database');
    });
  });

  describe('GET /auth/me', () => {
    const mockEmployee = {
      employeeId: BigInt(1),
      fullName: 'Test User',
      username: 'testuser',
      emailAddress: 'test@example.com',
      assignedRole: 'Employee',
      assignedDepartment: 'Engineering',
      isActive: true,
      baseSalary: 50000,
      allowances: 5000,
      deductions: 1000,
      joinedAt: BigInt(Date.now()),
      last_login: BigInt(Date.now()),
      managerId: null,
      teamId: null,
      password: 'hashed',
    };

    it('should return current user with valid token', async () => {
      const token = jwt.sign(
        {
          employeeId: '1',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      mockedPrisma.employee.findUnique.mockResolvedValue(mockEmployee);
      mockedFormatEmployeeData.mockReturnValue({
        employeeId: '1',
        fullName: 'Test User',
        username: 'testuser',
        emailAddress: 'test@example.com',
        assignedRole: 'Employee',
        assignedDepartment: 'Engineering',
        isActive: true,
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.employeeId).toBe('1');
      expect(response.body.username).toBe('testuser');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', ['accessToken=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        {
          employeeId: '1',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '-1s' } // Already expired
      );

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`accessToken=${expiredToken}`]);

      expect(response.status).toBe(401);
    });

    it('should reject refresh tokens', async () => {
      const refreshToken = jwt.sign(
        {
          employeeId: '1',
          type: 'refresh',
        },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' }
      );

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`accessToken=${refreshToken}`]);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Refresh tokens cannot be used for API access');
    });

    it('should return 404 if employee not found', async () => {
      const token = jwt.sign(
        {
          employeeId: '999',
          username: 'nonexistent',
          emailAddress: 'none@example.com',
          assignedRole: 'Employee',
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      mockedPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Employee not found');
    });

    it('should not expose internal errors', async () => {
      const token = jwt.sign(
        {
          employeeId: '1',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      mockedPrisma.employee.findUnique.mockRejectedValue(new Error('Database connection lost'));

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', [`accessToken=${token}`]);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
      expect(response.body.message).not.toContain('Database');
    });
  });

  describe('Authorization Header Fallback', () => {
    const mockEmployee = {
      employeeId: BigInt(1),
      fullName: 'Test User',
      username: 'testuser',
      emailAddress: 'test@example.com',
      assignedRole: 'Employee',
      assignedDepartment: 'Engineering',
      isActive: true,
      baseSalary: 50000,
      allowances: 5000,
      deductions: 1000,
      joinedAt: BigInt(Date.now()),
      last_login: BigInt(Date.now()),
      managerId: null,
      teamId: null,
      password: 'hashed',
    };

    it('should accept Bearer token in Authorization header', async () => {
      const token = jwt.sign(
        {
          employeeId: '1',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
        },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      mockedPrisma.employee.findUnique.mockResolvedValue(mockEmployee);
      mockedFormatEmployeeData.mockReturnValue({
        employeeId: '1',
        fullName: 'Test User',
        username: 'testuser',
        emailAddress: 'test@example.com',
        assignedRole: 'Employee',
        assignedDepartment: 'Engineering',
        isActive: true,
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.employeeId).toBe('1');
    });
  });

  describe('Cookie Security', () => {
    it('should set HttpOnly flag on auth cookies', async () => {
      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockedLoginService.mockResolvedValue({
        token: mockToken,
        employee: {
          employeeId: '1',
          fullName: 'Test User',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
          assignedDepartment: 'Engineering',
          isActive: true,
        },
      });
      mockedGenerateRefreshToken.mockReturnValue(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      const cookies = response.headers['set-cookie'];
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('accessToken='));
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));

      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should set correct SameSite policy', async () => {
      const mockToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockedLoginService.mockResolvedValue({
        token: mockToken,
        employee: {
          employeeId: '1',
          fullName: 'Test User',
          username: 'testuser',
          emailAddress: 'test@example.com',
          assignedRole: 'Employee',
          assignedDepartment: 'Engineering',
          isActive: true,
        },
      });
      mockedGenerateRefreshToken.mockReturnValue(mockRefreshToken);

      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies.some((cookie: string) => cookie.includes('SameSite'))).toBe(true);
    });
  });
});
