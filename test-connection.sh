#!/bin/bash

echo "🔍 Testing Prisma Database Connection"
echo "======================================"
echo ""

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

echo "📊 Current DATABASE_URL (masked):"
echo "$DATABASE_URL" | sed 's/:\/\/.*:/@USERNAME:PASSWORD@/g'
echo ""

echo "🧪 Test 1: Generating Prisma Client..."
if npx prisma generate 2>&1 | grep -q "Generated Prisma Client"; then
    echo "✅ Prisma Client generated successfully"
else
    echo "❌ Failed to generate Prisma Client"
    echo "Check your prisma.config.ts and schema.prisma files"
fi
echo ""

echo "🧪 Test 2: Checking Database Connection..."
if npx prisma migrate status 2>&1 | tee /tmp/prisma-test.log | grep -q "Database schema is up to date"; then
    echo "✅ Database connection successful and migrations are up to date!"
    echo ""
    echo "🎉 All tests passed! You can now:"
    echo "   - Run: npm run prisma:studio (to view database)"
    echo "   - Run: npm run dev (to start your app)"
elif grep -q "P1000" /tmp/prisma-test.log; then
    echo "❌ Authentication Failed"
    echo ""
    echo "🔧 Possible fixes:"
    echo "   1. Your password contains @ - make sure it's encoded as %40"
    echo "   2. Get fresh connection string from Supabase Dashboard"
    echo "   3. Try the direct connection (not pooler)"
    echo ""
    echo "📖 Read TROUBLESHOOTING_CONNECTION.md for detailed steps"
elif grep -q "P1001" /tmp/prisma-test.log; then
    echo "❌ Cannot reach database server"
    echo ""
    echo "🔧 Possible fixes:"
    echo "   1. Check if your internet connection is working"
    echo "   2. Verify the database host in Supabase Dashboard"
    echo "   3. Try using direct connection instead of pooler"
    echo ""
    echo "Get your connection string from:"
    echo "   Supabase Dashboard → Settings → Database → Connection string"
elif grep -q "P3005" /tmp/prisma-test.log; then
    echo "⚠️  Database schema is not in sync"
    echo ""
    echo "🔧 Run one of these commands:"
    echo "   npm run prisma:migrate      (create migration)"
    echo "   npm run prisma:push         (push without migration)"
    echo "   npm run prisma:migrate:reset (reset database)"
else
    echo "❌ Connection failed"
    echo ""
    cat /tmp/prisma-test.log
    echo ""
    echo "📖 Read TROUBLESHOOTING_CONNECTION.md for help"
fi

# Cleanup
rm -f /tmp/prisma-test.log

echo ""
echo "💡 Quick Fixes:"
echo "   - Update .env with correct DATABASE_URL"
echo "   - URL-encode special chars: @ = %40, # = %23, ! = %21"
echo "   - Get fresh connection from Supabase Dashboard"
echo "   - Read: TROUBLESHOOTING_CONNECTION.md"
