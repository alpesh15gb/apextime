#!/bin/bash

# Payroll Redesign - Database Migration Script
# This script applies all schema changes for the enhanced payroll system

echo "========================================="
echo "PAYROLL REDESIGN - DATABASE MIGRATION"
echo "========================================="
echo ""

echo "⚠️  WARNING: This will modify your database schema!"
echo "   - Backup your database before proceeding"
echo "   - Estimated downtime: 2-5 minutes"
echo ""

read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "📦 Step 1: Generating Prisma Client..."
cd /docker/apextime-saas/backend
npx prisma generate

echo ""
echo "🔄 Step 2: Creating migration..."
npx prisma migrate dev --name payroll_redesign_comprehensive

echo ""
echo "✅ Migration complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Restart backend: docker-compose restart backend"
echo "2. Populate employee state field (for PT calculation)"
echo "3. Test payroll calculation"
echo ""
echo "========================================="
