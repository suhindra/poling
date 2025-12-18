#!/bin/bash

# ✅ Post-Deployment Verification Script
# Run this AFTER deployment to verify everything is working

echo "✅ Poling Post-Deployment Verification"
echo "======================================"
echo ""

# Configuration
VPS_IP="159.65.11.4"
VPS_USER="poling"
API_URL="http://$VPS_IP:8080"
WEB_URL="http://$VPS_IP"

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

test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_status=$3
    
    echo "Testing $name..."
    response=$(curl -s -w "\n%{http_code}" "$endpoint" 2>/dev/null)
    status=$(echo "$response" | tail -n1)
    
    if [ "$status" = "$expected_status" ]; then
        check_pass "$name (HTTP $status)"
    else
        check_fail "$name (HTTP $status, expected $expected_status)"
    fi
}

echo -e "${BLUE}=== VPS Connectivity ===${NC}"
echo ""

# Check SSH connection
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'Connected'" &>/dev/null; then
    check_pass "SSH connection to $VPS_IP"
else
    check_fail "Cannot SSH to $VPS_IP"
    exit 1
fi

echo ""
echo -e "${BLUE}=== System Resources (on VPS) ===${NC}"
echo ""

# Check system resources
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'REMOTE_CHECK'
echo "CPU Usage:"
top -b -n 1 | head -3

echo ""
echo "Memory Usage:"
free -h | head -2

echo ""
echo "Disk Usage:"
df -h | grep -E "^/dev|Filesystem"

echo ""
echo "Running Services:"
sudo systemctl status poling-api --no-pager | grep Active
sudo systemctl status nginx --no-pager | grep Active
REMOTE_CHECK

echo ""
echo -e "${BLUE}=== Backend Service ===${NC}"
echo ""

# Check backend service status
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sudo systemctl is-active poling-api" &>/dev/null && \
    check_pass "poling-api service is running" || \
    check_fail "poling-api service is not running"

# Check if port 8080 is listening
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "netstat -tuln 2>/dev/null | grep -q :8080 || ss -tuln 2>/dev/null | grep -q :8080" && \
    check_pass "Port 8080 is listening" || \
    check_fail "Port 8080 is not listening"

echo ""
echo -e "${BLUE}=== Nginx Service ===${NC}"
echo ""

# Check Nginx service status
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sudo systemctl is-active nginx" &>/dev/null && \
    check_pass "Nginx service is running" || \
    check_fail "Nginx service is not running"

# Check if port 80 is listening
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "netstat -tuln 2>/dev/null | grep -q :80 || ss -tuln 2>/dev/null | grep -q :80" && \
    check_pass "Port 80 is listening" || \
    check_fail "Port 80 is not listening"

echo ""
echo -e "${BLUE}=== API Endpoints ===${NC}"
echo ""

# Test API health endpoint
test_endpoint "API Health" "$API_URL/api/health" "200"

# Test API current period endpoint
test_endpoint "API Current Period" "$API_URL/api/current-period" "200"

# Test API dashboard endpoint (should be 200 or 401 without auth)
echo "Testing Dashboard API..."
response=$(curl -s -w "\n%{http_code}" "$API_URL/api/dashboard" 2>/dev/null)
status=$(echo "$response" | tail -n1)
if [ "$status" = "200" ] || [ "$status" = "401" ]; then
    check_pass "Dashboard API (HTTP $status)"
else
    check_fail "Dashboard API (HTTP $status)"
fi

echo ""
echo -e "${BLUE}=== Frontend ===${NC}"
echo ""

# Test frontend homepage
test_endpoint "Frontend Homepage" "$WEB_URL/" "200"

# Check if React app is loaded
echo "Checking frontend build..."
response=$(curl -s "$WEB_URL/" 2>/dev/null)
if echo "$response" | grep -q "<!DOCTYPE html\|<html\|</html>"; then
    if echo "$response" | grep -q "React\|script.*src=\|div.*id.*root"; then
        check_pass "Frontend HTML structure looks good"
    else
        check_warn "Frontend HTML loaded but React structure may be missing"
    fi
else
    check_fail "Frontend not returning valid HTML"
fi

echo ""
echo -e "${BLUE}=== Database ===${NC}"
echo ""

# Check database file
echo "Checking database file..."
db_info=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "ls -lh /home/poling/poling-app/poling.db 2>/dev/null" || echo "")

if [ ! -z "$db_info" ]; then
    check_pass "Database file exists: $db_info"
else
    check_warn "Database file not found - check path or first run"
fi

# Check if database has tables
echo "Checking database integrity..."
tables=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sqlite3 /home/poling/poling-app/poling.db '.tables' 2>/dev/null" || echo "")

if [ ! -z "$tables" ]; then
    check_pass "Database tables found: $tables"
else
    check_warn "Cannot verify database tables - may not be initialized yet"
fi

echo ""
echo -e "${BLUE}=== Logs & Errors ===${NC}"
echo ""

# Check for recent errors in backend logs
echo "Checking backend logs..."
errors=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sudo journalctl -u poling-api -n 50 2>/dev/null | grep -i 'error\|panic\|fatal'" || echo "")

if [ -z "$errors" ]; then
    check_pass "No errors in backend logs"
else
    check_warn "Errors found in backend logs:"
    echo "$errors" | head -5
fi

# Check for Nginx errors
echo "Checking Nginx logs..."
nginx_errors=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sudo tail -20 /var/log/nginx/error.log 2>/dev/null | grep -v 'test-connection\|binary_remote_addr'" || echo "")

if [ -z "$nginx_errors" ] || [ "$nginx_errors" = "Binary file (standard input) matches" ]; then
    check_pass "No Nginx errors"
else
    check_warn "Errors found in Nginx logs:"
    echo "$nginx_errors" | head -5
fi

echo ""
echo -e "${BLUE}=== Configuration ===${NC}"
echo ""

# Check environment variables
echo "Checking environment configuration..."
env_check=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "[ -f /home/poling/poling-app/backend/.env ] && echo 'exists' || echo 'missing'" 2>/dev/null)

if [ "$env_check" = "exists" ]; then
    check_pass "Backend .env file exists"
else
    check_fail "Backend .env file not found"
fi

# Check Nginx config
nginx_test=$(ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "sudo nginx -t 2>&1" | grep -q "successful" && echo "valid" || echo "invalid")

if [ "$nginx_test" = "valid" ]; then
    check_pass "Nginx configuration is valid"
else
    check_fail "Nginx configuration has errors"
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
    echo -e "${RED}❌ Deployment has issues. Troubleshoot using:${NC}"
    echo ""
    echo "View backend logs:"
    echo "  ssh $VPS_USER@$VPS_IP"
    echo "  sudo journalctl -u poling-api -f"
    echo ""
    echo "View Nginx logs:"
    echo "  sudo tail -f /var/log/nginx/error.log"
    echo ""
    echo "Check service status:"
    echo "  sudo systemctl status poling-api"
    echo "  sudo systemctl status nginx"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Deployment complete with warnings - monitor logs${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Deployment successful! All systems operational${NC}"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: http://$VPS_IP"
    echo "   Admin Dashboard: http://$VPS_IP/admin"
    echo "   Voter Page: http://$VPS_IP/voter"
    echo "   API: http://$VPS_IP/api/health"
    echo ""
    echo "📊 Monitoring commands:"
    echo "   ssh $VPS_USER@$VPS_IP"
    echo "   sudo journalctl -u poling-api -f     # Backend logs (live)"
    echo "   sudo tail -f /var/log/nginx/access.log  # Nginx access"
    echo "   sudo systemctl status poling-api     # Service status"
    exit 0
fi
