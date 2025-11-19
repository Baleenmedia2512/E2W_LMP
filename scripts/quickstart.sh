#!/bin/bash

# E2W LMS Quick Start Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🚀 E2W Lead Management System - Quick Start"
echo "==========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be >= 18.0.0. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MySQL is running
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL command not found. Make sure MySQL is installed and running."
else
    echo "✅ MySQL is available"
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "📝 Step 2: Checking environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing."
    echo "   - Set DATABASE_URL"
    echo "   - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo "   - Generate NEXTAUTH_SECRET with: openssl rand -base64 32"
    echo ""
    read -p "Press Enter once you've configured .env file..."
else
    echo "✅ .env file exists"
fi

echo ""
echo "🗄️  Step 3: Setting up database..."

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=\"mysql://root:@localhost:3306/e2w_lms\"" .env; then
    echo "⚠️  Using default DATABASE_URL. Make sure MySQL is running on localhost:3306"
fi

echo "   Generating Prisma Client..."
npx prisma generate

echo "   Running database migrations..."
npx prisma migrate dev --name init

echo ""
echo "🌱 Step 4: Seeding database with test data..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start development server:"
echo "      npm run dev"
echo ""
echo "   2. Open your browser:"
echo "      http://localhost:3000"
echo ""
echo "   3. Sign in with Google OAuth"
echo ""
echo "📚 For more information:"
echo "   - README.md - General documentation"
echo "   - TESTING_GUIDE.md - Testing and deployment guide"
echo ""
echo "Happy coding! 🚀"
