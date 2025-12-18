#!/bin/bash

echo "🚀 Setting up Poling System..."
echo ""

# Backend Setup
echo "📦 Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
fi

echo "📥 Downloading Go dependencies..."
go mod download
go mod tidy

echo ""
echo "✓ Backend setup complete!"
echo ""

# Frontend Setup
cd ../frontend

echo "📦 Setting up Frontend..."

if [ ! -d node_modules ]; then
    echo "📥 Installing npm dependencies..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ node_modules already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 To run the project:"
echo ""
echo "  Backend:"
echo "    cd backend && go run ./cmd"
echo ""
echo "  Frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo ""
echo "🔐 Default Admin Login:"
echo "    Username: admin"
echo "    Password: admin123"
echo ""
