# 🚀 Quick Deployment to VPS 159.65.11.4

## Prerequisites

```bash
# Ensure you have SSH access to VPS
ssh root@159.65.11.4
# or with user:
ssh your_user@159.65.11.4
```

---

## Option 1: Automated Deployment (Recommended)

### Step 1: Prepare Deploy Script
```bash
chmod +x deploy.sh
```

### Step 2: Configure Script
Edit `deploy.sh` and update:
- `VPS_IP`: Your VPS IP (already set to 159.65.11.4)
- `VPS_USER`: SSH user (default: poling)
- `REPO_URL`: Your git repository

### Step 3: Run Deploy
```bash
./deploy.sh
```

This will:
1. ✅ Build backend locally
2. ✅ Build frontend locally
3. ✅ Create archive
4. ✅ Upload to VPS
5. ✅ Deploy and restart services
6. ✅ Verify everything works

Done! Your app is live at http://159.65.11.4

---

## Option 2: Manual Deployment

### Step 1: SSH to VPS
```bash
ssh poling@159.65.11.4
```

### Step 2: Install Dependencies (First Time Only)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Go
wget https://golang.org/dl/go1.21.5.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Git & SQLite
sudo apt install -y git sqlite3
```

### Step 3: Clone Project
```bash
cd /home/poling
git clone https://github.com/your_username/poling.git
cd poling
```

### Step 4: Build Backend
```bash
cd backend
go mod download
go build -o bin/poling-api ./cmd
cd ..
```

### Step 5: Build Frontend
```bash
cd frontend
npm install --production
npm run build
cd ..
```

### Step 6: Setup Environment
```bash
cd backend
cat > .env << 'EOF'
DATABASE_PATH=/home/poling/poling/poling.db
PORT=8080
GIN_MODE=release
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

### Step 7: Setup Systemd Service
```bash
sudo tee /etc/systemd/system/poling-api.service > /dev/null << 'EOF'
[Unit]
Description=Poling API Server
After=network.target

[Service]
Type=simple
User=poling
WorkingDirectory=/home/poling/poling/backend
ExecStart=/home/poling/poling/backend/bin/poling-api
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable poling-api
sudo systemctl start poling-api
```

### Step 8: Setup Nginx
```bash
sudo tee /etc/nginx/sites-available/poling > /dev/null << 'EOF'
server {
    listen 80;
    server_name 159.65.11.4;
    
    location / {
        root /home/poling/poling/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /uploads/ {
        proxy_pass http://localhost:8080/uploads/;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/poling /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 9: Verify
```bash
curl http://localhost:8080/api/health
# Should return: {"status":"ok"}

curl http://localhost/
# Should return HTML
```

Done! Access at http://159.65.11.4

---

## Update Existing Deployment

To update code after initial deployment:

```bash
# On VPS
cd /home/poling/poling
git pull

# Rebuild backend
cd backend
go build -o bin/poling-api ./cmd
sudo systemctl restart poling-api

# Rebuild frontend
cd ../frontend
npm run build
sudo systemctl restart nginx
```

---

## Useful Commands

### Check Service Status
```bash
sudo systemctl status poling-api
sudo systemctl status nginx
```

### View Logs
```bash
# Backend logs
sudo journalctl -u poling-api -f

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
sudo systemctl restart poling-api
sudo systemctl restart nginx
```

### Check Ports
```bash
sudo netstat -tlnp | grep -E ':80|:8080'
```

---

## Troubleshooting

### API not responding
```bash
sudo systemctl status poling-api
sudo journalctl -u poling-api -n 50
```

### Frontend showing blank
```bash
sudo nginx -t
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### Permission denied
```bash
# Fix permissions
sudo chown -R poling:poling /home/poling/poling
```

---

## Add Domain Name (Optional)

If you have a domain, update Nginx:

```bash
sudo nano /etc/nginx/sites-available/poling

# Change:
# server_name 159.65.11.4;
# To:
# server_name your-domain.com www.your-domain.com;

sudo nginx -t
sudo systemctl restart nginx
```

Add SSL with Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Admin Credentials

Default admin already created during first run:
- Username: `admin`
- Password: `admin123` (CHANGE THIS!)

To change:
```bash
sqlite3 /home/poling/poling/poling.db
UPDATE admins SET password='new_password' WHERE username='admin';
.quit
```

---

## Final Checklist

- [ ] SSH access working
- [ ] Dependencies installed
- [ ] Project cloned & built
- [ ] Services running
- [ ] Frontend accessible
- [ ] API responding
- [ ] Database created
- [ ] Firewall configured (allow 80, 443, 22)
- [ ] Admin password changed

---

**Your app is now LIVE at http://159.65.11.4! 🎉**

