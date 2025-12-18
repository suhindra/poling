#!/bin/bash

# 🚀 Poling Production Deployment Script
# Usage: ./deploy.sh
# This script automates deployment to production VPS

set -e  # Exit on error

echo "🚀 Poling Production Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="159.65.11.4"
VPS_USER="poling"
REPO_URL="https://github.com/your_username/poling.git"
PROJECT_DIR="/home/poling/poling"

echo -e "${YELLOW}Configuration:${NC}"
echo "VPS IP: $VPS_IP"
echo "VPS User: $VPS_USER"
echo "Project Dir: $PROJECT_DIR"
echo ""

# Step 1: Build Backend Locally
echo -e "${YELLOW}Step 1: Building Backend...${NC}"
cd backend
go build -o bin/poling-api ./cmd
echo -e "${GREEN}✓ Backend built successfully${NC}"
cd ..

# Step 2: Build Frontend Locally
echo -e "${YELLOW}Step 2: Building Frontend...${NC}"
cd frontend
npm install --production
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"
cd ..

# Step 3: Create deployment archive
echo -e "${YELLOW}Step 3: Creating deployment archive...${NC}"
tar -czf poling-deployment.tar.gz \
  backend/bin/poling-api \
  backend/.env \
  frontend/dist/ \
  poling.db || true
echo -e "${GREEN}✓ Archive created${NC}"

# Step 4: Upload to VPS
echo -e "${YELLOW}Step 4: Uploading to VPS...${NC}"
scp -P 22 poling-deployment.tar.gz $VPS_USER@$VPS_IP:/tmp/
echo -e "${GREEN}✓ Upload completed${NC}"

# Step 5: Deploy on VPS
echo -e "${YELLOW}Step 5: Deploying on VPS...${NC}"
ssh $VPS_USER@$VPS_IP << 'REMOTE_SCRIPT'
set -e

echo "📦 Extracting files..."
cd /tmp
tar -xzf poling-deployment.tar.gz

echo "🛑 Stopping services..."
sudo systemctl stop poling-api || true

echo "📋 Copying files..."
cp backend/bin/poling-api /home/poling/poling/backend/bin/
cp -r frontend/dist/* /home/poling/poling/frontend/dist/
cp poling.db /home/poling/poling/ || true

echo "🔄 Starting services..."
sudo systemctl start poling-api
sudo systemctl restart nginx

echo "✅ Waiting for services to start..."
sleep 3

echo "🔍 Verifying services..."
sudo systemctl status poling-api
sudo systemctl status nginx

echo "📋 Testing API..."
curl -s http://localhost:8080/api/health || echo "⚠️  API not responding yet"

echo "🎉 Deployment completed!"
REMOTE_SCRIPT

echo -e "${GREEN}✓ Deployment completed${NC}"

# Step 6: Cleanup
echo -e "${YELLOW}Step 6: Cleanup...${NC}"
rm -f poling-deployment.tar.gz
ssh $VPS_USER@$VPS_IP "rm -f /tmp/poling-deployment.tar.gz"
echo -e "${GREEN}✓ Cleanup done${NC}"

echo ""
echo -e "${GREEN}🎉 Deployment Successful!${NC}"
echo ""
echo "Access your application at:"
echo "http://$VPS_IP"
echo ""
echo "To view logs:"
echo "ssh $VPS_USER@$VPS_IP"
echo "sudo journalctl -u poling-api -f"

