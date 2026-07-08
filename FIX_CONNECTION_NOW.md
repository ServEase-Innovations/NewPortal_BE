# 🚨 Fix Database Connection Error - 2 Minutes

## The Problem
```
ERR_STREAM_PREMATURE_CLOSE
P1001: Can't reach database server
```

Your password contains `@` which breaks the URL. The pooler connection might also not be accessible.

## ✅ Quick Fix (Choose One)

### Option 1: Get Fresh Connection from Supabase (RECOMMENDED)

1. **Go to Supabase Dashboard:** https://app.supabase.com/
2. **Select your project**
3. **Go to: Settings → Database**
4. **Find "Connection string" section**
5. **Select "URI" format**
6. **Choose "Connection string" (NOT "Connection pooling")**
7. **Copy the connection string**
8. **Paste it into your `.env` file as `DATABASE_URL`**

It should look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.pgvzxlhdlwcnarfjoqtk.supabase.co:5432/postgres
```

### Option 2: Fix Current URL (If you know password is correct)

Your `.env` is already updated with:
```
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&schema=public"
```

Notice: `@` in password is now `%40`

**If still not working**, try the direct connection option in your `.env`:
```
DATABASE_URL="postgresql://postgres.pgvzxlhdlwcnarfjoqtk:Serveaso%401234@db.pgvzxlhdlwcnarfjoqtk.supabase.co:5432/postgres?schema=public"
```

## 🧪 Test Your Fix

```bash
# Run the test script
./test-connection.sh

# OR manually test
npx prisma migrate status
```

Should see: `Database schema is up to date!` ✅

## 🔄 After Fixing Connection

```bash
# 1. Sync your database
npm run prisma:push

# 2. Open Prisma Studio (should work now!)
npm run prisma:studio

# 3. Start your app
npm run dev
```

## 🆘 Still Having Issues?

### Issue: "Can't reach database server"
**Solution:** Use direct connection (not pooler). Get it from Supabase Dashboard.

### Issue: "Authentication failed"  
**Solution:** Your password might be wrong. Reset it in Supabase Dashboard.

### Issue: "Database doesn't exist"
**Solution:** Make sure your Supabase project is active and database is created.

## 📞 Get Help

1. **Run test script:** `./test-connection.sh`
2. **Read detailed guide:** `TROUBLESHOOTING_CONNECTION.md`
3. **Check Supabase status:** https://status.supabase.com/

## 🎯 Most Likely Solution

**Just get a fresh connection string from Supabase:**
- Supabase Dashboard → Settings → Database → Connection string (URI format)
- Copy and paste into `.env` as `DATABASE_URL`
- Run: `npx prisma migrate status`

That's it! 🎉
