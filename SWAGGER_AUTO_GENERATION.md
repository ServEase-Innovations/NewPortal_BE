# 🤖 Automatic Swagger Documentation System

## Overview

Your project now has **automated Swagger documentation generation** through agent hooks. Whenever you create or modify route files, the system will automatically ensure proper API documentation.

## How It Works

### 🎯 Active Hooks

#### 1. Auto-Generate Swagger Docs (fileEdited)
**Triggers when:** You save changes to any file in `src/routes/*.ts`

**What it does:**
- Reviews the modified route file
- Checks all endpoints for complete Swagger documentation
- Adds missing documentation following project patterns
- Ensures proper response codes, schemas, and examples

#### 2. Generate Swagger for New Routes (fileCreated)
**Triggers when:** You create a new route file in `src/routes/`

**What it does:**
- Analyzes all endpoints in the new file
- Generates complete Swagger/OpenAPI JSDoc comments
- Follows the documentation style of existing routes
- Updates swagger.ts configuration if needed

## What Gets Generated

For each endpoint, the system ensures you have:

### ✅ Required Documentation
- **Summary** - Brief description of the endpoint
- **Description** - Detailed explanation of functionality
- **Tags** - Categorization (Employees, Teams, Attendance, etc.)
- **Security** - Authentication requirements (bearerAuth)
- **Request Body** - Complete schema with all fields
  - Required vs optional fields
  - Data types and formats
  - Example values
- **Response Codes** - All possible responses:
  - `200` - Success
  - `201` - Created
  - `400` - Validation failed
  - `401` - Authentication required
  - `403` - Insufficient permissions
  - `404` - Not found
  - `500` - Server error
- **Parameters** - Path and query parameters with types
- **Examples** - Sample request/response data

## Documentation Pattern

The system follows this Swagger/OpenAPI format:

```typescript
/**
 * @swagger
 * /endpoint-path:
 *   method:
 *     summary: Brief description
 *     description: Detailed description of what this endpoint does
 *     tags:
 *       - EntityName
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field1
 *               - field2
 *             properties:
 *               field1:
 *                 type: string
 *                 example: Sample value
 *               field2:
 *                 type: number
 *                 example: 123
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.method('/path', middleware, handler);
```

## Usage

### Automatic (Recommended)
Just write your routes normally! The system will:
1. Detect when you save a route file
2. Analyze the endpoints
3. Generate or update Swagger docs automatically
4. Present the documentation for your review

### Manual Trigger
If you want to manually trigger documentation generation:
```bash
# Open the Kiro Hook UI
# Find "Auto-Generate Swagger Docs" or "Generate Swagger for New Routes"
# Click "Run Hook"
```

## Example Workflow

### Creating a New Route File

1. **Create the file:**
   ```typescript
   // src/routes/project.routes.ts
   import { Router } from 'express';
   import { getProjects, createProject } from '../controllers/project.controller';
   import { authenticate, authorize } from '../middleware/auth.middleware';
   
   const router = Router();
   
   router.get('/', authenticate, getProjects);
   router.post('/', authenticate, authorize('SuperAdmin'), createProject);
   
   export default router;
   ```

2. **Save the file** - Hook triggers automatically

3. **Review generated docs** - The agent will add:
   ```typescript
   /**
    * @swagger
    * /projects:
    *   get:
    *     summary: Get all projects
    *     description: Returns a list of all projects
    *     tags:
    *       - Projects
    *     security:
    *       - bearerAuth: []
    *     responses:
    *       200:
    *         description: Projects retrieved successfully
    *       401:
    *         description: Authentication required
    *       500:
    *         description: Server error
    */
   router.get('/', authenticate, getProjects);
   ```

### Modifying an Existing Route

1. **Add a new endpoint:**
   ```typescript
   router.patch('/:id/status', authenticate, authorize('Manager'), updateProjectStatus);
   ```

2. **Save the file** - Hook triggers

3. **Documentation is added** automatically with proper schema

## Configuration

### Viewing Hooks
1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Search: "Open Kiro Hook UI"
3. View all active hooks

### Disabling Auto-Documentation
If you want to disable the automatic generation:
1. Open Kiro Hook UI
2. Find "Auto-Generate Swagger Docs"
3. Toggle it off

### Customizing the Hook
Edit `.kiro/hooks/auto-swagger-docs.json` or `.kiro/hooks/new-route-swagger.json`

## Best Practices

### 1. Write Descriptive Route Handlers
```typescript
// Good - Clear intent
router.post('/register', registerEmployee);

// Less clear
router.post('/reg', regEmp);
```

### 2. Use Meaningful Path Names
```typescript
// Good
router.get('/:employeeId/attendance', getEmployeeAttendance);

// Less clear
router.get('/:id/att', getAtt);
```

### 3. Group Related Routes
```typescript
// Group by feature
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteProfile);
```

### 4. Apply Middleware Consistently
```typescript
// All protected routes should use authenticate
router.get('/', authenticate, getItems);
router.post('/', authenticate, authorize('Admin'), createItem);
```

## Accessing Swagger UI

Once documented, access your API docs:

```
http://localhost:5000/api-docs
```

You'll see:
- ✅ All endpoints organized by tags
- ✅ Interactive "Try it out" buttons
- ✅ Request/response examples
- ✅ Authentication support
- ✅ Complete schemas

## Troubleshooting

### Hook Not Triggering
**Problem:** Documentation not generated after saving route file

**Solutions:**
1. Check if hooks are enabled in Kiro
2. Verify file pattern matches: `src/routes/*.ts`
3. Check Kiro Hook UI for errors
4. Manually trigger the hook

### Incomplete Documentation
**Problem:** Some endpoints missing docs

**Solutions:**
1. Re-save the file to trigger hook again
2. Manually ask: "Add Swagger docs to src/routes/myfile.ts"
3. Check if endpoints follow standard patterns

### Documentation Format Issues
**Problem:** Swagger UI shows errors

**Solutions:**
1. Validate YAML syntax in JSDoc comments
2. Check indentation (must be consistent)
3. Ensure schema properties match request/response structure
4. Verify all referenced types exist

## Advanced: Custom Documentation

### Adding Custom Response Schemas
```typescript
/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     responses:
 *       200:
 *         description: Employee found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */
```

### Defining Reusable Schemas
In `src/swagger/swagger.ts`:
```typescript
components: {
  schemas: {
    Employee: {
      type: 'object',
      properties: {
        employeeId: { type: 'string' },
        fullName: { type: 'string' },
        emailAddress: { type: 'string' }
      }
    }
  }
}
```

## Files Involved

### Hook Configuration
- `.kiro/hooks/auto-swagger-docs.json` - Auto-doc hook
- `.kiro/hooks/new-route-swagger.json` - New route hook

### Swagger Configuration
- `src/swagger/swagger.ts` - Swagger setup and config
- `src/app.ts` - Swagger UI route (`/api-docs`)

### Route Files
- `src/routes/*.ts` - All route definitions with JSDoc comments

## Benefits

✅ **Consistent Documentation** - All endpoints follow the same pattern
✅ **Time Saving** - No manual documentation writing
✅ **Always Up-to-Date** - Docs update when routes change
✅ **Complete Coverage** - No undocumented endpoints
✅ **Better API Testing** - Interactive Swagger UI for testing
✅ **Team Collaboration** - Clear API contracts for frontend devs

## Example: Before vs After

### Before (Manual)
```typescript
// No docs, unclear API contract
router.post('/create', createEmployee);
```

### After (Automatic)
```typescript
/**
 * @swagger
 * /employees/create:
 *   post:
 *     summary: Create a new employee
 *     description: Creates a new employee with the provided information
 *     tags:
 *       - Employees
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - emailAddress
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               emailAddress:
 *                 type: string
 *                 example: john.doe@company.com
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.post('/create', createEmployee);
```

## Support

Need help? Check:
1. Existing route files for documentation examples
2. Swagger UI at `/api-docs` for generated output
3. Kiro Hook UI for hook status and logs
4. This guide for best practices

---

**Your API documentation is now automated!** 🎉

Just write routes, save files, and let the system handle the documentation.
