# 🔐 Default Login Credentials

## Default Admin Account

After running the setup, a default admin account is created automatically.

### Admin Login

```
Username: admin
Password: admin123
Role: SuperAdmin
```

## Test User Accounts

For testing different role permissions, use these accounts:

### 👨‍💼 Manager Account
```
Username: manager
Password: manager123
Role: Manager
Department: Engineering
```

### 👤 HR Account
```
Username: hr
Password: hr123
Role: HR
Department: Human Resources
```

### 👨‍💻 Employee/Developer Account
```
Username: employee
Password: employee123
Role: Developer
Department: Engineering
```

## Quick Reference Table

| Role        | Username  | Password     | Department        |
|-------------|-----------|--------------|-------------------|
| SuperAdmin  | admin     | admin123     | Administration    |
| Manager     | manager   | manager123   | Engineering       |
| HR          | hr        | hr123        | Human Resources   |
| Developer   | employee  | employee123  | Engineering       |

## Important Security Notes

⚠️ **CHANGE ALL DEFAULT PASSWORDS IMMEDIATELY** after first login!

These are test/development credentials only. Never use these in production!

## How to Create Users

### Create Default Admin User

```bash
npm run create-admin
```

### Create All Test Users (Employee, HR, Manager)

```bash
npm run create-test-users
```

Both scripts will:
- Check if users already exist
- Create them if they don't exist
- Display the credentials
- Can be run multiple times safely

## Creating Additional Users

Additional users can be created through:

1. **The Admin Panel** - Log in as admin and create new employees
2. **Direct Database** - Use Prisma Studio (`npm run prisma:studio`)
3. **API Endpoint** - Use the employee creation endpoint

## Valid User Roles

The system supports the following roles:

- `SuperAdmin` - Full system access
- `HR` - HR management capabilities
- `Manager` - Team and employee management
- `Developer` - Standard employee access
- `Marketing` - Marketing team member
- `CustomStaff` - Custom staff role

## Troubleshooting

### "Invalid username or password" Error

This usually means:
1. No users exist in the database - Run `npm run create-admin`
2. Wrong credentials - Check your username/password
3. User is inactive - Check the `isActive` field in the database

### Database Connection Issues

Make sure your `.env` file has the correct database connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

## First-Time Setup

1. **Run Migrations**
   ```bash
   npm run prisma:migrate:deploy
   npm run prisma:generate
   ```

2. **Create Default Admin**
   ```bash
   npm run create-admin
   ```

3. **Start the Server**
   ```bash
   npm run dev
   ```

4. **Login**
   - Go to the frontend login page
   - Use username: `admin`
   - Use password: `admin123`

5. **Change Password**
   - Navigate to your profile settings
   - Update your password immediately

---

**Need help?** Check the other documentation files in this directory.
