# Authentication Testing Guide

## Overview

This document outlines the testing strategy for the authentication system. Jest and Supertest have been installed and configured.

## Test Framework Setup

- **Testing Framework**: Jest
- **HTTP Testing**: Supertest  
- **Configuration**: `jest.config.js`
- **Test Location**: `src/__tests__/`

## Running Tests

```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
```

## Critical Test Cases

### 1. Login Tests (`POST /auth/login`)

**Valid Credentials**
- ✅ Should return 200 status
- ✅ Should set `accessToken` cookie (HttpOnly, Secure in production)
- ✅ Should set `refreshToken` cookie (HttpOnly, Secure in production)
- ✅ Should return employee data without password
- ✅ Should include CSRF token if CSRF protection is enabled
- ✅ Cookies should have correct `sameSite` policy

**Invalid Credentials**
- ✅ Should return 401 status
- ✅ Should return generic error message
- ✅ Should not expose internal error details

**Cookie Security**
- ✅ Access token cookie should match JWT lifetime (15m default)
- ✅ Refresh token cookie should be 7 days
- ✅ Both cookies should have `httpOnly` flag
- ✅ Both cookies should have `secure` flag in production
- ✅ Cookies should have appropriate `sameSite` value

### 2. Logout Tests (`POST /auth/logout`)

- ✅ Should return 200 status
- ✅ Should clear `accessToken` cookie
- ✅ Should clear `refreshToken` cookie
- ✅ Should clear `csrfToken` cookie

### 3. Refresh Token Tests (`POST /auth/refresh`)

**Valid Refresh Token**
- ✅ Should return 200 status
- ✅ Should issue new access token
- ✅ Should issue new refresh token (rotation)
- ✅ Should return employee data

**Missing Refresh Token**
- ✅ Should return 401 status
- ✅ Should return "Refresh token not found" message

**Invalid/Expired Refresh Token**
- ✅ Should return 401 status
- ✅ Should clear refresh token cookie
- ✅ Should return generic error message
- ✅ Should not expose internal error details

### 4. Get Current User Tests (`GET /auth/me`)

**Valid Access Token**
- ✅ Should return 200 status
- ✅ Should return complete employee data
- ✅ Should fetch data from database (not just JWT)

**No Token**
- ✅ Should return 401 status
- ✅ Should return "No token provided" message

**Invalid Token**
- ✅ Should return 401 status
- ✅ Should return "Invalid or expired token" message

**Expired Token**
- ✅ Should return 401 status

**Refresh Token Used as Access Token**
- ✅ Should return 401 status
- ✅ Should return "Refresh tokens cannot be used for API access" message

**Employee Not Found**
- ✅ Should return 404 status
- ✅ Should return "Employee not found" message

**Database Error**
- ✅ Should return 500 status
- ✅ Should return "Internal server error"
- ✅ Should not expose database error details
- ✅ Should log error for debugging

### 5. CSRF Protection Tests

**When CSRF is Enabled**
- ✅ CSRF token cookie should be set on login
- ✅ CSRF token should be included in login response
- ✅ State-changing requests should require CSRF token
- ✅ Invalid CSRF token should return 403
- ✅ Missing CSRF token should return 403

**When CSRF is Disabled**
- ✅ Requests should work without CSRF token

### 6. Authentication Middleware Tests

**Cookie Authentication**
- ✅ Should extract token from `accessToken` cookie
- ✅ Should attach employee data to `req.employee`
- ✅ Should reject refresh tokens
- ✅ Should validate token expiry

**Bearer Token Fallback**
- ✅ Should accept `Authorization: Bearer <token>` header
- ✅ Should work when cookie is not present

**Token Type Validation**
- ✅ Access tokens should be accepted
- ✅ Refresh tokens should be rejected with specific error

### 7. Security Tests

**Error Handling**
- ✅ 500 errors should return "Internal server error"
- ✅ Database errors should not be exposed
- ✅ Prisma errors should not be exposed
- ✅ JWT errors should be generic

**Cookie Security Attributes**
- ✅ `HttpOnly` flag prevents JavaScript access
- ✅ `Secure` flag in production (HTTPS only)
- ✅ `SameSite` policy matches deployment configuration
- ✅ Cookie `maxAge` matches token lifetime

**Token Validation**
- ✅ Expired tokens are rejected
- ✅ Invalid signatures are rejected
- ✅ Malformed tokens are rejected
- ✅ Token type is validated

## Test Implementation Notes

### Mocking Strategy

1. **Mock Prisma Client**: Mock database calls
2. **Mock Auth Service**: Mock login/refresh logic
3. **Mock Environment Variables**: Set test-specific config

### Test Data

Create consistent test fixtures:
```typescript
const mockEmployee = {
  employeeId: BigInt(1),
  fullName: 'Test User',
  username: 'testuser',
  emailAddress: 'test@example.com',
  assignedRole: 'Employee',
  assignedDepartment: 'Engineering',
  isActive: true,
  // ... other fields
};
```

### Cookie Testing

Use Supertest's cookie handling:
```typescript
const response = await request(app)
  .get('/auth/me')
  .set('Cookie', [`accessToken=${token}`]);

const cookies = response.headers['set-cookie'];
```

### JWT Testing

Create valid/invalid tokens for testing:
```typescript
const validToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1s' });
```

## Coverage Goals

- **Minimum Coverage**: 80% line coverage
- **Critical Paths**: 100% coverage for auth endpoints
- **Edge Cases**: All error paths should be tested

## Current Status

- ✅ Jest and Supertest installed
- ✅ Jest configuration created
- ✅ Test structure defined
- ⚠️ Test implementation needs completion (TypeScript configuration issues)

## Next Steps

1. Fix TypeScript configuration for Jest
2. Implement test cases from this guide
3. Run tests and achieve minimum 80% coverage
4. Add to CI/CD pipeline

## Manual Testing Checklist

Until automated tests are complete, manually verify:

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout clears cookies
- [ ] Refresh token works after access token expires
- [ ] `/auth/me` returns current user
- [ ] Expired tokens are rejected
- [ ] Refresh tokens cannot be used as access tokens
- [ ] CSRF protection (if enabled)
- [ ] Cookie security attributes in production
- [ ] Error messages don't expose internal details
