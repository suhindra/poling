#!/bin/bash

# 🔍 Pre-Deployment Verification Script
# Run this BEFORE deployment to ensure everything is ready

set -e

echo "🔍 Poling Pre-Deployment Verification"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo -e "${BLUE}=== Local Environment Checks ===${NC}"
echo ""

# Check 1: Go version
if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}')
    check_pass "Go installed: $GO_VERSION"
else
    check_fail "Go not installed - required for backend build"
fi

# Check 2: Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not installed - required for frontend build"
fi

# Check 3: npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not installed - required for frontend build"
fi

# Check 4: Git installed
if command -v git &> /dev/null; then
    check_pass "Git installed"
else
    check_fail "Git not installed - required for deployment"
fi

echo ""
echo -e "${BLUE}=== Project Structure Checks ===${NC}"
echo ""

# Check 5: Backend directory
if [ -d "backend" ]; then
    check_pass "Backend directory exists"
else
    check_fail "Backend directory not found"
fi

# Check 6: Frontend directory
if [ -d "frontend" ]; then
    check_pass "Frontend directory exists"
else
    check_fail "Frontend directory not found"
fi

# Check 7: go.mod
if [ -f "backend/go.mod" ]; then
    check_pass "Backend go.mod exists"
else
    check_fail "Backend go.mod not found"
fi

# Check 8: package.json
if [ -f "frontend/package.json" ]; then
    check_pass "Frontend package.json exists"
else
    check_fail "Frontend package.json not found"
fi

# Check 9: Backend binary directory
if [ -d "backend/bin" ]; then
    check_pass "Backend bin directory exists"
else
    mkdir -p backend/bin
    check_pass "Backend bin directory created"
fi

echo ""
echo -e "${BLUE}=== Build Verification ===${NC}"
echo ""

# Check 10: Build backend
echo "Testing backend build..."
if cd backend && go build -o bin/test-build ./cmd 2>/dev/null && cd ..; then
    check_pass "Backend builds successfully"
    rm -f backend/bin/test-build
else
    check_fail "Backend build failed - fix errors before deployment"
fi

# Check 11: Check frontend dependencies
echo "Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    check_pass "Frontend node_modules exists"
else
    check_warn "Frontend node_modules not found - will be installed during deploy"
fi

# Check 12: Frontend build
echo "Testing frontend build..."
if cd frontend && npm run build 2>/dev/null && cd ..; then
    check_pass "Frontend builds successfully"
else
    check_fail "Frontend build failed - fix errors before deployment"
fi

echo ""
echo -e "${BLUE}=== Configuration Checks ===${NC}"
echo ""

# Check 13: Backend .env
if [ -f "backend/.env" ]; then
    check_pass "Backend .env exists"
    
    # Check .env contents
    if grep -q "DATABASE_PATH" backend/.env; then
        check_pass "DATABASE_PATH configured"
    else
        check_fail "DATABASE_PATH not in .env"
    fi
    
    if grep -q "JWT_SECRET" backend/.env; then
        JWT_VAL=$(grep "JWT_SECRET" backend/.env | cut -d'=' -f2)
        if [ -z "$JWT_VAL" ] || [ "$JWT_VAL" = "your_secret_here" ]; then
            check_warn "JWT_SECRET is default/empty - should be changed for production"
        else
            check_pass "JWT_SECRET configured"
        fi
    else
        check_fail "JWT_SECRET not in .env"
    fi
else
    if [ -f "backend/.env.example" ]; then
        check_warn "Backend .env not found but .env.example exists - copy and configure it"
    else
        check_fail "Backend .env and .env.example not found"
    fi
fi

echo ""
echo -e "${BLUE}=== VPS Connectivity Checks ===${NC}"
echo ""

VPS_IP="159.65.11.4"
VPS_USER="poling"

# Check 14: SSH connectivity
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH OK'" &>/dev/null; then
    check_pass "SSH connection to $VPS_IP successful"
else
    check_fail "Cannot SSH to $VPS_IP - check SSH keys and firewall"
fi

# Check 15: SSH key
if [ -f "$HOME/.ssh/id_rsa" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
    check_pass "SSH key found"
else
    check_fail "SSH key not found - generate with: ssh-keygen -t ed25519"
fi

echo ""
echo -e "${BLUE}=== Deployment Script Checks ===${NC}"
echo ""

# Check 16: deploy.sh exists and is executable
if [ -f "deploy.sh" ]; then
    check_pass "deploy.sh exists"
    if [ -x "deploy.sh" ]; then
        check_pass "deploy.sh is executable"
    else
        check_warn "deploy.sh is not executable - run: chmod +x deploy.sh"
    fi
else
    check_fail "deploy.sh not found"
fi

echo ""
echo -e "${BLUE}=== Repository Checks ===${NC}"
echo ""

# Check 17: Git status
if git status &>/dev/null; then
    check_pass "Git repository initialized"
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        check_pass "No uncommitted changes"
    else
        check_warn "Uncommitted changes found - consider committing before deploy"
        git status --short
    fi
else
    check_fail "Not a git repository"
fi

# Check 18: Remote configured
if git remote -v | grep -q "origin"; then
    check_pass "Git remote 'origin' configured"
else
    check_warn "Git remote 'origin' not configured - may be needed for VPS deployment"
fi

echo ""
echo "======================================"
echo -e "${BLUE}Verification Results${NC}"
echo "======================================"
echo -e "${GREEN}✓ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
echo -e "${RED}✗ Failed: $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Fix the errors above before deploying${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Fix the warnings above for best results${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All checks passed! Ready to deploy${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review DEPLOYMENT_CHECKLIST.md"
    echo "2. Run: ./deploy.sh"
    echo "3. Monitor deployment progress"
    exit 0
fi
