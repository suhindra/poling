#!/bin/bash

echo "🔍 Testing Voter API Endpoints"
echo "================================"

# Test 1: Login as voter
echo -e "\n1️⃣ Login as voter..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8080/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"voter1","password":"password123"}' 2>&1)

echo "Response: $LOGIN_RESPONSE"

VOTER_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $VOTER_TOKEN"

if [ -z "$VOTER_TOKEN" ]; then
  echo "❌ Failed to get voter token. Checking database..."
  echo ""
  echo "2️⃣ Checking voters in database..."
  sqlite3 poling.db "SELECT username, password FROM voters LIMIT 3;"
  exit 1
fi

# Test 2: Check current period without token (should fail)
echo -e "\n2️⃣ Check current period (without token - should fail)..."
curl -s -X GET "http://localhost:8080/api/voter/current-period" | head -20

# Test 3: Check current period with token
echo -e "\n3️⃣ Check current period (with token - should work)..."
curl -s -X GET "http://localhost:8080/api/voter/current-period" \
  -H "Authorization: Bearer $VOTER_TOKEN" | head -20

# Test 4: Check voting status with token
echo -e "\n4️⃣ Check voting status (with token)..."
curl -s -X GET "http://localhost:8080/api/voter/voting-status" \
  -H "Authorization: Bearer $VOTER_TOKEN" | head -20

echo -e "\n✅ Tests completed!"
