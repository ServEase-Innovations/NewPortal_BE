# 🔐 Default Login Credentials

## Default Admin Account

After running the setup, a default admin account is created automatically.

### Login Details

```
Username: admin
Password: admin123
Role: SuperAdmin
```

## Important Security Notes

⚠️ **CHANGE THE DEFAULT PASSWORD IMMEDIATELY** after first login!

## How to Create the Default Admin User

If the admin user doesn't exist, run:

```bash
npm run create-admin
```

This script will:
- Check if the admin user exists
- Create it if it doesn't exist
- Display the credentials

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
