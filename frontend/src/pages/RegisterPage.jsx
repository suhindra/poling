import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import './RegisterPage.css'

const LOGO_URL = 'https://play-lh.googleusercontent.com/WvXMgnFd0izSLUItWTp_WZf-BDPt_Wnjg8li-Kv87UUEB2VyGTGISKvrEMO2qeYovPA'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    satuan_kerja: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://159.65.11.4/api/register-participant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          nik: formData.nik,
          satuan_kerja: formData.satuan_kerja
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setSuccess(true)
      setFormData({ name: '', nik: '', satuan_kerja: '' })
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <img src={LOGO_URL} alt="Logo" className="register-logo" />
          <h1>Registrasi Peserta</h1>
          <p className="register-subtitle">Daftarkan data pribadi Anda</p>
        </div>

        {success && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>Registrasi Berhasil!</p>
            <p className="success-subtitle">Data Anda telah disimpan dalam sistem</p>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="register-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">Nama Lengkap</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="nik">NIK (Nomor Induk Kependudukan)</label>
              <input
                type="text"
                id="nik"
                name="nik"
                value={formData.nik}
                onChange={handleChange}
                placeholder="Masukkan NIK (16 digit)"
                pattern="[0-9]{16}"
                required
                disabled={loading}
              />
              <small>Masukkan 16 digit NIK tanpa spasi</small>
            </div>

            <div className="form-group">
              <label htmlFor="satuan_kerja">Satuan Kerja / Departemen</label>
              <input
                type="text"
                id="satuan_kerja"
                name="satuan_kerja"
                value={formData.satuan_kerja}
                onChange={handleChange}
                placeholder="Contoh: IT, HR, Finance, dll"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn-register"
              disabled={loading}
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>

            <div className="register-footer">
              <p><a href="/login">Kembali ke Login</a></p>
            </div>
          </form>
        )}
      </div>

      <div className="register-info">
        <h3>Informasi Penting</h3>
        <ul>
          <li>✓ Pendaftaran untuk semua peserta acara</li>
          <li>✓ Isi data pribadi Anda dengan benar</li>
          <li>✓ Data akan disimpan dan diverifikasi</li>
          <li>✓ Pastikan NIK dan informasi sudah akurat</li>
        </ul>
      </div>
    </div>
  )
}
