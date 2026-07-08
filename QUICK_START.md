# 🚀 Quick Start - Get Running in 3 Steps

## Step 1: Update Database Connection (1 minute)

Edit `.env` and update your DATABASE_URL:

```bash
# Open the file
nano .env

# Update this line with your credentials:
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

**Tip:** You already have a Supabase database. Get your connection string from:
Supabase Dashboard → Settings → Database → Connection String

## Step 2: Sync Database (30 seconds)

Run ONE of these commands:

```bash
# For development (destroys data):
npm run prisma:migrate:reset

# OR for production (safe):
npm run prisma:migrate

# OR just push schema:
npm run prisma:push
```

## Step 3: Start Your App (10 seconds)

```bash
npm run dev
```

---

## 🎯 That's It!

Your app should now be running with a fully synced database.

## 🔍 Verify Setup

```bash
# Open database GUI
npm run prisma:studio

# Check migration status
npx prisma migrate status
```

## 📚 Need More Help?

- **Quick guide:** Read `MIGRATION_FIX_README.md`
- **Full details:** Read `PRISMA_SETUP_COMPLETE.md`
- **Deep dive:** Read `prisma/MIGRATIONS.md`
- **Interactive fix:** Run `./prisma/fix-migrations.sh`

## 💡 Common Commands

```bash
npm run dev                    # Start dev server
npm run prisma:studio          # Open database GUI
npm run prisma:generate        # Regenerate Prisma Client
npm run prisma:migrate         # Create new migration
npx prisma migrate status      # Check migration status
```

---

**Everything is configured!** Just update your DATABASE_URL and run migrations. 🎉
