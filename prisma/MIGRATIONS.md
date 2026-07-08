# Prisma Migrations Guide (Prisma 7.x)

## Current Status
Your Prisma schema is properly configured with migrations tracking. The latest schema includes:
- Employee management with roles and departments
- Team management with projects
- Attendance tracking system
- Authentication fields (username, password, refresh_token)

## ⚠️ Important: Prisma 7 Configuration

This project uses **Prisma 7**, which has a different configuration approach:
- Database URL is configured in `prisma.config.ts` (NOT in schema.prisma)
- The connection string is loaded from the `.env` file
- Make sure your `.env` file has the correct `DATABASE_URL`

## Prerequisites

1. **Update DATABASE_URL in .env** with your actual database credentials:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/newportal_db?schema=public"
   ```
   
   For Supabase or remote databases, use the connection string provided by your database service.

2. **Verify your database connection**:
   ```bash
   # This should connect without errors
   npx prisma migrate status
   ```

## Migration Commands

### Generate Prisma Client
After any schema changes, regenerate the Prisma Client:
```bash
npm run prisma:generate
```

### Create a New Migration
When you modify `schema.prisma`, create a migration:
```bash
npm run prisma:migrate
# or
npx prisma migrate dev --name describe_your_changes
```

### Apply Migrations (Production)
Deploy pending migrations to production:
```bash
npm run prisma:migrate:deploy
```

### Reset Database (⚠️ DESTRUCTIVE)
This will drop the database, recreate it, and apply all migrations:
```bash
npm run prisma:migrate:reset
```

### Push Schema Without Migration (Development Only)
Push schema changes without creating a migration file:
```bash
npm run prisma:push
```

### Open Prisma Studio
View and edit your database through a GUI:
```bash
npm run prisma:studio
```

## Fixing Migration Issues

### Option 1: Reset and Start Fresh (Recommended for Development)
If your migrations are in a bad state and you're in development:

1. **Backup your data if needed**

2. **Reset the database and migrations**:
   ```bash
   npm run prisma:migrate:reset
   ```
   This will:
   - Drop the database
   - Create a new database
   - Apply all migrations from scratch
   - Run seed scripts if configured

### Option 2: Create a Baseline Migration
If you want to squash all existing migrations into one:

1. **Delete the migrations folder** (backup first!):
   ```bash
   rm -rf prisma/migrations
   ```

2. **Create a fresh baseline migration**:
   ```bash
   npx prisma migrate dev --name baseline_init
   ```

### Option 3: Fix Specific Migration
If only one migration is problematic:

1. **Identify the problematic migration** by checking error messages
2. **Edit the migration SQL file** manually
3. **Mark it as applied** (if needed):
   ```bash
   npx prisma migrate resolve --applied <migration_name>
   ```

## Common Issues

### Issue: "database schema is not in sync"
**Solution**: Run migrations to sync:
```bash
npm run prisma:migrate
```

### Issue: Migration conflicts
**Solution**: Either reset (dev) or create a new fixing migration (prod):
```bash
# Development
npm run prisma:migrate:reset

# Production - create a fix
npx prisma migrate dev --name fix_schema_conflict
```

### Issue: Prisma Client out of sync
**Solution**: Regenerate the client:
```bash
npm run prisma:generate
```

### Issue: Cannot connect to database
**Solution**: 
1. Check your DATABASE_URL in `.env`
2. Ensure PostgreSQL is running
3. Verify credentials and database exists

## Best Practices

1. **Always backup** before running destructive operations
2. **Test migrations** in development before deploying to production
3. **Never edit** applied migrations - create new ones instead
4. **Use descriptive names** for migrations
5. **Commit migrations** to version control
6. **Review migration SQL** before applying to production

## Schema Overview

### Models
- **Employee**: Core employee data with auth, salary, and relationships
- **Team**: Project teams that employees belong to
- **Attendance**: Daily attendance tracking with clock in/out times

### Enums
- **EmployeeRole**: SuperAdmin, Manager, Developer, Marketing, CustomStaff, HR
- **AttendanceStatus**: Working, OnLeave, Absent
- **AppraisalState**: Pristine, InProgress, Completed

### Key Relationships
- Employees can have managers (self-referential)
- Employees belong to teams
- Employees have attendance records
