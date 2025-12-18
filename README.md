# Poling Koperasi - Sistem Pemilihan

Sistem web untuk polling/pemilihan ketua, sekretaris, bendahara, dan pengawas pada organisasi koperasi.

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Go + Gin Framework
- **Database**: SQLite
- **Authentication**: JWT

## 📋 Fitur Utama

### Voter (Pemilih)
- Login dengan username & password
- Voting berurutan untuk 4 posisi (Ketua → Sekretaris → Bendahara → Pengawas)
- Lihat status voting Anda
- 1 suara per periode voting
- Real-time period status polling (setiap 60 detik)

### Admin
- Dashboard monitoring dengan voting statistics
- Buka/tutup periode voting
- Generate akun pemilih (username & password)
- Kelola daftar kandidat
- Lihat hasil voting real-time
- Kandidat terpilih otomatis dihapus untuk periode berikutnya

## 📁 Project Structure

```
poling/
├── backend/           # Go API Server
│   ├── cmd/
│   │   └── main.go
│   ├── internal/
│   │   ├── db/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   └── models/
│   ├── go.mod
│   ├── Makefile
│   └── .env.example
└── frontend/          # React + Vite
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   ├── services/
    │   └── App.jsx
    ├── package.json
    ├── vite.config.js
    └── index.html
```

## 🔧 Quick Start

### Development

**Backend:**
```bash
cd backend
cp .env.example .env
go mod download
go run ./cmd
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Production Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for comprehensive production setup on Ubuntu VPS.

Quick deployment to 159.65.11.4:
```bash
./deploy.sh
```

## 🔐 Default Admin Credentials

```
Username: admin
Password: admin123
```

⚠️ **CHANGE THIS IN PRODUCTION!**

## � Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete VPS deployment guide for Ubuntu
- **[QUICK_START.md](QUICK_START.md)** - Quick deployment script and manual steps
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and solutions

## 📝 Voting Flow

1. **Periode 1 - Ketua**: 7 kandidat tersedia
2. **Periode 2 - Sekretaris**: 6 kandidat (ketua dihapus)
3. **Periode 3 - Bendahara**: 5 kandidat (ketua + sekretaris dihapus)
4. **Periode 4 - Pengawas**: 4 kandidat (3 pemenang sebelumnya dihapus)

## 🗄️ Database Schema

- **Admin**: Admin users
- **Voter**: Voter accounts (username & password)
- **Candidate**: Daftar kandidat (7 orang)
- **VotingPeriod**: 4 periode voting
- **Vote**: Record voting

## 🚨 Catatan Penting

1. **Password Hashing**: Implement bcrypt di production
2. **JWT Secret**: Change JWT_SECRET di .env
3. **CORS**: Configure CORS sesuai domain production
4. **Database**: Use proper SQL database (PostgreSQL/MySQL) untuk production

## 📞 API Endpoints

### Public
- `POST /api/login` - Voter login
- `POST /api/admin-login` - Admin login

### Voter (Protected)
- `GET /api/voter/current-period` - Get active period
- `GET /api/voter/candidates` - Get candidates for active period
- `POST /api/voter/vote` - Submit vote
- `GET /api/voter/voting-status` - Get voting status

### Admin (Protected)
- `GET /api/admin/dashboard` - Dashboard data
- `POST /api/admin/period/open` - Open voting period
- `POST /api/admin/period/close` - Close period & determine winner
- `GET /api/admin/results` - Get voting results
- `POST /api/admin/generate-credentials` - Generate voter credentials
- `GET /api/admin/voters` - Get all voters
- `POST /api/admin/candidates` - Create candidate
- `GET /api/admin/candidates` - List candidates
- `DELETE /api/admin/candidates/:id` - Delete candidate

## 📧 Support

Untuk pertanyaan lebih lanjut, silakan hubungi tim development.
