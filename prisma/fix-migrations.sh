#!/bin/bash

# Prisma Migration Fix Script
# This script helps fix common Prisma migration issues

set -e

echo "🔧 Prisma Migration Fix Tool"
echo "============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please update DATABASE_URL with your credentials."
        echo ""
        echo "Edit .env and update this line:"
        echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/newportal_db?schema=public\""
        echo ""
        read -p "Press Enter after updating .env to continue..."
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo "🔍 Checking Prisma setup..."
echo ""

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Check migration status
echo "📊 Checking migration status..."
echo ""
if npx prisma migrate status; then
    echo ""
    echo "✅ Migrations are in sync!"
    echo ""
    echo "Available commands:"
    echo "  npm run prisma:studio    - Open database GUI"
    echo "  npm run prisma:migrate   - Create new migration"
    echo "  npm run prisma:generate  - Regenerate client"
else
    echo ""
    echo "⚠️  Migrations are out of sync!"
    echo ""
    echo "Choose a fix option:"
    echo "1. Reset database and reapply all migrations (Development only - DESTROYS DATA)"
    echo "2. Create a new migration to fix drift"
    echo "3. Push schema without migration (Development only)"
    echo "4. Exit and fix manually"
    echo ""
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1)
            echo ""
            echo "⚠️  WARNING: This will DELETE ALL DATA in your database!"
            read -p "Are you sure? Type 'yes' to continue: " confirm
            if [ "$confirm" = "yes" ]; then
                echo "🔄 Resetting database..."
                npx prisma migrate reset --force
                echo "✅ Database reset complete!"
            else
                echo "❌ Reset cancelled"
            fi
            ;;
        2)
            echo ""
            read -p "Enter migration name (e.g., fix_schema_drift): " migration_name
            npx prisma migrate dev --name "$migration_name"
            echo "✅ Migration created!"
            ;;
        3)
            echo ""
            echo "⚠️  This pushes schema without creating migration history"
            read -p "Continue? (y/n): " confirm
            if [ "$confirm" = "y" ]; then
                npx prisma db push
                echo "✅ Schema pushed!"
            else
                echo "❌ Push cancelled"
            fi
            ;;
        4)
            echo "Exiting. Check prisma/MIGRATIONS.md for manual fix instructions."
            exit 0
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
fi

echo ""
echo "🎉 All done! Your Prisma setup is ready."
echo ""
echo "Next steps:"
echo "  - Run 'npm run dev' to start your application"
echo "  - Run 'npm run prisma:studio' to view your database"
echo "  - Check prisma/MIGRATIONS.md for more information"
