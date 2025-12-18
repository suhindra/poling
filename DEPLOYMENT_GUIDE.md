# 🚀 Production Deployment Guide - VPS 159.65.11.4

## Prerequisites

✅ VPS IP: `159.65.11.4`
✅ Assumed OS: Ubuntu 20.04 LTS atau lebih baru
✅ Need: SSH access to VPS

---

## Step 1: SSH ke VPS dan Setup Environment

### 1.1 SSH to VPS
```bash
ssh root@159.65.11.4
# atau jika ada user tertentu:
ssh your_username@159.65.11.4
```

### 1.2 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Required Software

**Install Go (for backend):**
```bash
# Download latest Go
wget https://golang.org/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz

# Add to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify
go version
```

**Install Node.js (for frontend build):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

**Install SQLite:**
```bash
sudo apt install -y sqlite3
sqlite3 --version
```

**Install Git:**
```bash
sudo apt install -y git
```

### 1.4 Create Application User
```bash
sudo useradd -m -s /bin/bash poling
sudo usermod -aG sudo poling
su - poling
```

---

## Step 2: Clone dan Setup Project

### 2.1 Clone Repository
```bash
cd /home/poling
git clone https://github.com/your_username/poling.git
cd poling
```

### 2.2 Setup Backend

**Install Go dependencies:**
```bash
cd backend
go mod download
go mod tidy
```

**Build Backend:**
```bash
go build -o bin/poling-api ./cmd
```

**Verify Build:**
```bash
./bin/poling-api --help
```

### 2.3 Setup Frontend

**Install npm packages:**
```bash
cd ../frontend
npm install
```

**Build Frontend (production build):**
```bash
npm run build
```

This creates `dist/` folder dengan static files yang siap production.

---

## Step 3: Setup Environment Variables

### 3.1 Create .env for Backend
```bash
cd /home/poling/poling/backend
cp .env.example .env
```

### 3.2 Edit .env
```bash
nano .env
```

**Set these values:**
```env
# Database
DATABASE_PATH=/home/poling/poling/poling.db

# Server
PORT=8080
GIN_MODE=release  # ← Important for production!

# JWT
JWT_SECRET=your_super_secret_key_here_change_this_to_something_random

# CORS (if needed)
CORS_ALLOWED_ORIGINS=http://159.65.11.4,http://159.65.11.4:3000,http://your_domain.com
```

**Generate secure JWT_SECRET:**
```bash
openssl rand -base64 32
```

Copy output dan gunakan sebagai JWT_SECRET value.

---

## Step 4: Setup Systemd Services

### 4.1 Create Backend Service
```bash
sudo nano /etc/systemd/system/poling-api.service
```

**Content:**
```ini
[Unit]
Description=Poling API Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=poling
WorkingDirectory=/home/poling/poling/backend
ExecStart=/home/poling/poling/backend/bin/poling-api
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=poling-api

# Resource limits
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
```

### 4.2 Create Frontend Service (Nginx)

**Install Nginx:**
```bash
sudo apt install -y nginx
```

**Create Nginx config:**
```bash
sudo nano /etc/nginx/sites-available/poling
```

**Content:**
```nginx
server {
    listen 80;
    server_name 159.65.11.4;
    
    # Frontend static files
    location / {
        root /home/poling/poling/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static uploads
    location /uploads/ {
        proxy_pass http://localhost:8080/uploads/;
        expires 30d;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/poling /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

---

## Step 5: Start Services

### 5.1 Enable and Start Backend Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable poling-api
sudo systemctl start poling-api
sudo systemctl status poling-api
```

### 5.2 Verify Nginx
```bash
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 5.3 Check Backend Running
```bash
curl http://localhost:8080/api/health
# Should return: {"status":"ok"}
```

### 5.4 Check Frontend
```bash
curl http://localhost/
# Should return HTML content
```

---

## Step 6: Setup SSL/HTTPS (Optional but Recommended)

### 6.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Get SSL Certificate
```bash
sudo certbot --nginx -d 159.65.11.4 -d your_domain.com
# OR jika ingin auto-renewal:
sudo certbot --nginx -d 159.65.11.4 --agree-tos -m your_email@example.com
```

### 6.3 Auto-renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 7: Database Setup

### 7.1 Initialize Database
```bash
cd /home/poling/poling
./backend/bin/poling-api

# Wait a few seconds, then Ctrl+C to stop
# Database (poling.db) will be created automatically
```

### 7.2 Verify Database
```bash
sqlite3 poling.db ".tables"
# Should show: admins candidates voters voting_periods votes
```

---

## Step 8: Setup Admin Credentials

### 8.1 Create script to setup admin
```bash
nano /home/poling/poling/setup_admin.sh
```

**Content:**
```bash
#!/bin/bash
sqlite3 /home/poling/poling/poling.db << EOF
-- Create default admin if not exists
INSERT OR IGNORE INTO admins (username, password, email)
VALUES ('admin', 'change_this_password', 'admin@example.com');

-- List all admins
SELECT * FROM admins;
EOF
```

### 8.2 Run setup
```bash
chmod +x /home/poling/poling/setup_admin.sh
./setup_admin.sh
```

---

## Step 9: Firewall Setup

### 9.1 Allow Required Ports
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 9.2 Verify
```bash
sudo ufw status
```

---

## Step 10: Verify Production Setup

### 10.1 Test from Local Machine
```bash
# Open browser and go to:
http://159.65.11.4

# Or test API:
curl http://159.65.11.4/api/health
```

### 10.2 Check Service Status
```bash
sudo systemctl status poling-api
sudo systemctl status nginx
```

### 10.3 View Logs
```bash
# Backend logs
sudo journalctl -u poling-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Step 11: Setup Monitoring & Backups

### 11.1 Daily Database Backup
```bash
sudo crontab -e
```

**Add:**
```cron
# Backup database daily at 2 AM
0 2 * * * cp /home/poling/poling/poling.db /home/poling/poling/backups/poling-$(date +\%Y\%m\%d).db
```

### 11.2 Monitor Services
```bash
# Create monitoring script
nano /home/poling/monitor.sh
```

**Content:**
```bash
#!/bin/bash
# Monitor services and restart if down

check_service() {
    if ! systemctl is-active --quiet $1; then
        echo "Service $1 is down, restarting..."
        sudo systemctl start $1
    fi
}

check_service poling-api
check_service nginx

# Check disk space
df -h

# Check memory
free -h
```

---

## Quick Reference Commands

### Check Status
```bash
sudo systemctl status poling-api
sudo systemctl status nginx
sudo netstat -tlnp | grep -E '8080|80|443'
```

### Restart Services
```bash
sudo systemctl restart poling-api
sudo systemctl restart nginx
```

### View Logs
```bash
sudo journalctl -u poling-api -n 50
sudo tail -f /var/log/nginx/access.log
```

### Stop Services
```bash
sudo systemctl stop poling-api
sudo systemctl stop nginx
```

### Rebuild & Deploy Updates
```bash
cd /home/poling/poling
git pull

# Backend
cd backend
go build -o bin/poling-api ./cmd
sudo systemctl restart poling-api

# Frontend
cd ../frontend
npm run build
sudo systemctl restart nginx
```

---

## Troubleshooting

### Problem: API not responding
```bash
# Check if service is running
sudo systemctl status poling-api

# View logs
sudo journalctl -u poling-api -n 100

# Check port 8080
sudo netstat -tlnp | grep 8080
```

### Problem: Frontend showing blank page
```bash
# Check nginx
sudo nginx -t

# View nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify frontend build exists
ls -la /home/poling/poling/frontend/dist/index.html
```

### Problem: Database locked
```bash
# Restart backend service
sudo systemctl restart poling-api

# Check processes
lsof | grep poling.db
```

### Problem: High CPU/Memory Usage
```bash
# Check processes
top -p $(pgrep -f poling-api)

# Check logs for errors
sudo journalctl -u poling-api -n 200
```

---

## Production Checklist

- [ ] SSH access to VPS verified
- [ ] Go installed and working
- [ ] Node.js installed and working
- [ ] Project cloned from git
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] Environment variables configured
- [ ] Database initialized
- [ ] Admin user created
- [ ] Backend service running
- [ ] Nginx configured and running
- [ ] Frontend accessible via browser
- [ ] API endpoints responding
- [ ] HTTPS/SSL configured (optional)
- [ ] Firewall properly configured
- [ ] Backups scheduled
- [ ] Monitoring in place

---

## Support

For issues:
1. Check logs: `sudo journalctl -u poling-api -f`
2. Verify services: `sudo systemctl status poling-api`
3. Check connectivity: `curl http://localhost:8080/api/health`
4. Review nginx config: `sudo nginx -t`

---

## Post-Deployment

### Update Frontend API URL
If using custom domain, update in `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = 'http://159.65.11.4/api'  // or your domain
```

Then rebuild:
```bash
cd frontend
npm run build
```

### Performance Tuning (Optional)

**Increase Node limits:**
```bash
sudo nano /etc/security/limits.conf
# Add:
poling soft nofile 65536
poling hard nofile 65536
```

**Tune Nginx:**
```bash
sudo nano /etc/nginx/nginx.conf
# Under http block, add:
worker_connections 4096;
keepalive_timeout 65;
```

---

**Status**: Ready for Production Deployment! 🚀

