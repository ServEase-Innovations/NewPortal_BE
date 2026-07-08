# 🔧 Database Connection Troubleshooting

## Current Error
```
ERR_STREAM_PREMATURE_CLOSE
Authentication failed against database server
```

## Issue Diagnosis

Your `.env` currently has:
```
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso@1234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### Potential Issues:
1. **Password contains special character `@`** - This can break URL parsing
2. **Using connection pooler** - May have different auth requirements
3. **Invalid credentials** - Password may have been reset

## 🔄 Solutions (Try in Order)

### Solution 1: URL Encode Special Characters in Password

If your password contains special characters like `@`, `#`, `!`, etc., they must be URL-encoded:

| Character | Encoded |
|-----------|---------|
| @ | %40 |
| # | %23 |
| ! | %21 |
| $ | %24 |
| & | %26 |
| space | %20 |

**Your password appears to be:** `Serveaso@1234`
**URL-encoded version:** `Serveaso%401234`

Update your `.env`:
```env
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

### Solution 2: Use Direct Connection (Not Pooler)

Supabase provides two connection strings:
- **Session pooler** (default): For serverless/edge functions
- **Direct connection**: For long-running processes (better for Prisma)

Get your direct connection string from Supabase:
1. Go to Supabase Dashboard
2. Settings → Database
3. Look for **"Connection string"** section
4. Choose **"Connection string"** (not "Connection pooling")
5. Copy the direct connection URL

It should look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Update your `.env` with the direct connection.

### Solution 3: Use Transaction Mode Pooler

If you must use the pooler, add `?pgbouncer=true` and use transaction mode:

```env
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true"
```

### Solution 4: Add Connection Parameters

Add these parameters to improve stability:

```env
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?schema=public&connection_limit=1&pool_timeout=0"
```

### Solution 5: Verify Credentials in Supabase

1. Go to Supabase Dashboard
2. Settings → Database
3. Reset your database password if needed
4. Copy the new connection string
5. Update `.env` with the new credentials

## 🧪 Test Your Connection

After updating `.env`, test each change:

### Test 1: Check Migration Status
```bash
npx prisma migrate status
```
Should connect without authentication errors.

### Test 2: Generate Prisma Client
```bash
npm run prisma:generate
```
Should complete successfully.

### Test 3: Push Schema
```bash
npm run prisma:push
```
Should sync your schema to the database.

### Test 4: Open Prisma Studio
```bash
npm run prisma:studio
```
Should open without stream errors.

## 🎯 Quick Fix Command

Try this complete DATABASE_URL with all fixes:

```env
# Use direct connection (recommended for Prisma)
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@db.pgvzxlhdlwcnarfjoqtk.supabase.co:5432/postgres?schema=public"

# OR if using pooler, add pgbouncer flag
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&schema=public"
```

## 📋 Checklist

- [ ] URL-encode special characters in password (especially `@`)
- [ ] Try direct connection instead of pooler
- [ ] Add `?pgbouncer=true` if using pooler
- [ ] Verify credentials in Supabase dashboard
- [ ] Test connection with `npx prisma migrate status`
- [ ] Restart Prisma Studio after fixing `.env`

## 🆘 Still Not Working?

### Get Fresh Connection String from Supabase:

1. Login to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **URI** format
6. Click **Copy**
7. Paste into `.env` as `DATABASE_URL`

### Manual Test with psql:

```bash
# Test if you can connect with psql
psql "postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso@1234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

If this fails, your credentials are definitely incorrect.

## 💡 Common Issues

### "password authentication failed"
→ Password is wrong or needs URL encoding

### "no pg_hba.conf entry"
→ IP address not allowed (check Supabase network settings)

### "too many connections"
→ Add `connection_limit=1` to URL

### "prepared statement already exists"
→ Add `?pgbouncer=true` to URL

## ✅ Success Indicators

When fixed, you should see:
```
✔ Generated Prisma Client
Datasource "db": PostgreSQL database "postgres"...
Database schema is up to date!
```

And Prisma Studio should open without errors.
