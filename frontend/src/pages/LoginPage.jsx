import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import './LoginPage.css'

import logoImage from '../assets/koperasi-logo.jpeg'
const LOGO_URL = logoImage

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState('voter')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const loginFn = loginType === 'voter' ? authService.voterLogin : authService.adminLogin
      const response = await loginFn(username, password)

      const user = {
        id: response.data.user.id,
        username: response.data.user.username,
        type: loginType
      }

      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(user))

      if (loginType === 'voter') {
        navigate('/voter')
      } else {
        navigate('/admin')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="logo-section">
          <img src={LOGO_URL} alt="Koperasi Logo" className="koperasi-logo" />
        </div>
        <h1 className="main-title">Pengurus Koperasi Konsumen</h1>
        <p className="koperasi-name">Melati Husada Sejahtera</p>
        <p className="subtitle">Sistem Poling - Pemilihan Pengurus</p>
      </div>

      <div className="login-card">

        <div className="login-type-selector">
          <button
            className={`type-btn ${loginType === 'voter' ? 'active' : ''}`}
            onClick={() => setLoginType('voter')}
          >
            Pemilih
          </button>
          <button
            className={`type-btn ${loginType === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginType('admin')}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
