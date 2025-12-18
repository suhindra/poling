# 🔧 Troubleshooting Guide

## Backend Issues

### ❌ Error: "port 8080 is already in use"

**Solution:**

Find dan terminate process yang menggunakan port 8080:
```bash
# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Atau gunakan port berbeda
PORT=8081 go run ./cmd
```

Update `.env`:
```
PORT=8081
```

---

### ❌ Error: "could not import ... (no required module provides package)"

**Solution:**

Download Go modules:
```bash
cd backend
go mod download
go mod tidy
go run ./cmd
```

---

### ❌ Error: "database locked"

**Problem:** Database sedang diakses oleh process lain

**Solution:**

```bash
# Hapus database dan buat baru
cd backend
rm poling.db

# Jalankan backend lagi
go run ./cmd
```

---

### ❌ Database file not created

**Solution:**

Pastikan permission folder adalah writable:
```bash
cd backend
ls -la  # Check permissions
chmod 755 .  # If needed
```

---

### ❌ "Invalid JWT Secret"

**Problem:** JWT_SECRET tidak di-set atau salah

**Solution:**

Update `.env`:
```
JWT_SECRET=your_secret_key_here_change_in_production
```

---

### ❌ CORS Error di Frontend

**Problem:** 
```
Access to XMLHttpRequest at 'http://localhost:8080/api/...' 
blocked by CORS policy
```

**Solution:**

1. Pastikan backend running di `http://localhost:8080`
2. Check `vite.config.js` proxy config:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

---

## Frontend Issues

### ❌ Error: npm: command not found

**Solution:**

Install Node.js dari https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

---

### ❌ Error: "port 3000 is already in use"

**Solution:**

```bash
# Kill process
kill -9 $(lsof -ti :3000)

# Atau gunakan port berbeda
npm run dev -- --port 3001
```

Update `vite.config.js`:
```javascript
server: {
  port: 3001,
}
```

---

### ❌ Error: "Cannot find module react"

**Solution:**

Install dependencies:
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

---

### ❌ Blank page di browser

**Cause:** Webpack/Vite belum selesai compile

**Solution:**

```bash
# Restart dev server
cd frontend
npm run dev
```

Check browser console untuk error details.

---

### ❌ "Cannot GET /voter"

**Problem:** React router path tidak sesuai

**Solution:**

Pastikan Anda buka:
- `http://localhost:3000/login` (CORRECT)
- `http://localhost:3000/voter` (hanya bisa setelah login)

Bukan:
- `http://localhost:3000/voter` (belum ada token)

---

### ❌ Login berhasil tapi langsung logout

**Cause:** Token tidak tersimpan dengan benar

**Solution:**

1. Open DevTools (F12)
2. Go to Application → LocalStorage
3. Check apakah `token` dan `user` tersimpan
4. Jika tidak, check browser console untuk error

---

## Database Issues

### ❌ Error: "no such table"

**Problem:** Database belum di-migrate

**Solution:**

Hapus database dan jalankan backend lagi:
```bash
cd backend
rm poling.db
go run ./cmd
```

---

### ❌ Error: "UNIQUE constraint failed"

**Problem:** Username sudah exist

**Solution:**

Gunakan username unik saat generate credentials. Backend seharusnya auto-generate, tapi jika error:

```bash
# Reset database
rm poling.db
go run ./cmd
```

---

## Authentication Issues

### ❌ "Invalid Credentials" saat login

**Checklist:**

1. ✓ Username benar (case-sensitive)
2. ✓ Password benar (case-sensitive)
3. ✓ User sudah ada di database

**Debug:**

```bash
# Check users di database (memerlukan sqlite3)
sqlite3 poling.db
> SELECT username, password FROM voters;
```

---

### ❌ "Missing Authorization Header"

**Problem:** Token tidak dikirim di request

**Solution:**

Pastikan di `api.js`:
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

### ❌ Token expired

**Problem:** Token sudah lama (24 jam)

**Solution:**

Login lagi untuk mendapat token baru.

---

## Voting Issues

### ❌ "No Active Voting Period"

**Solution:**

Admin perlu buka periode terlebih dahulu:
1. Login sebagai admin
2. Go to Dashboard
3. Click "Buka" untuk periode yang diinginkan

---

### ❌ "You have already voted in this period"

**Problem:** Sudah vote di periode ini

**Solution:**

Tunggu admin close periode dan open periode berikutnya.

---

### ❌ Voting status tidak update

**Solution:**

Refresh halaman (F5) atau navigate ulang.

---

## Admin Dashboard Issues

### ❌ "Voters voted" count tidak berubah

**Problem:** Vote belum ter-record

**Solution:**

1. Refresh dashboard (F5)
2. Check backend logs untuk error
3. Check database apakah vote tersimpan

---

### ❌ Tidak bisa tutup periode

**Problem:** Belum ada yang vote

**Solution:**

Pastikan minimal 1 orang sudah vote. Jika belum:
1. Login sebagai voter
2. Vote untuk candidate
3. Kembali ke admin dashboard
4. Coba tutup periode lagi

---

## Performance Issues

### ❌ Aplikasi lambat

**Solutions:**

1. **Restart server:**
```bash
# Backend
cd backend && go run ./cmd

# Frontend
cd frontend && npm run dev
```

2. **Clear cache:**
```bash
# Browser: DevTools → Application → Storage → Clear All
# Terminal:
cd frontend
rm -rf node_modules
npm install
npm run dev
```

3. **Check database size:**
```bash
# Database sudah terlalu besar?
ls -lh backend/poling.db
```

---

## Build/Deployment Issues

### ❌ Build gagal

**Backend:**
```bash
cd backend
go build -o poling-api ./cmd
# Check for errors
```

**Frontend:**
```bash
cd frontend
npm run build
# Check for errors in terminal
```

---

### ❌ "Go version mismatch"

**Solution:**

Check Go version:
```bash
go version  # Must be 1.21 or higher
```

Update `go.mod` jika perlu:
```
go 1.21
```

---

## Getting Help

### 1. Check Logs

**Backend:**
```bash
# Run dengan verbose
go run ./cmd
# Look untuk error messages
```

**Frontend:**
```bash
# Open DevTools (F12)
# Check Console tab untuk error
# Check Network tab untuk API errors
```

---

### 2. Database Inspection

```bash
# Install sqlite3 (macOS)
brew install sqlite3

# Open database
sqlite3 backend/poling.db

# Useful queries:
> SELECT * FROM voters;
> SELECT * FROM candidates;
> SELECT * FROM votes;
> SELECT * FROM voting_periods;
> .tables  # List all tables
> .exit    # Exit
```

---

### 3. Common Commands

```bash
# Reset everything
cd backend && rm poling.db
cd frontend && rm -rf node_modules

# Fresh install
./setup.sh

# Run with logging
go run ./cmd 2>&1 | tee app.log
```

---

### 4. Check Configuration

**Backend (.env):**
```
PORT=8080
DATABASE_PATH=poling.db
JWT_SECRET=your_secret_key_here_change_in_production
```

**Frontend (vite.config.js):**
- Proxy target ke `http://localhost:8080`
- Port 3000

---

## 💡 Pro Tips

1. **Keep terminal open:** Backend & Frontend harus berjalan di terminal terpisah
2. **Check browser console:** Most frontend errors terlihat di sini
3. **Use DevTools:** Network tab sangat membantu debug API calls
4. **Database backup:** Backup `poling.db` sebelum testing
5. **Read error messages:** Biasanya error message sudah jelas

---

## ⚠️ Emergency Reset

Jika semuanya berantakan:

```bash
# Reset everything
./setup.sh

# Or manual reset:
cd backend
rm poling.db
rm go.sum
go mod download
go mod tidy

cd ../frontend
rm -rf node_modules
npm install

# Restart both
# Terminal 1: cd backend && go run ./cmd
# Terminal 2: cd frontend && npm run dev
```

---

**Last Updated:** 2025-12-18

**Still having issues?** Check:
- Backend logs di terminal
- Frontend console (F12)
- Database state (`sqlite3 backend/poling.db`)
- Network tab (F12 → Network)
