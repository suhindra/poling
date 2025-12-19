import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { voterService, authService } from '../services/api'
import './VoterPage.css'

const LOGO_URL = 'https://play-lh.googleusercontent.com/WvXMgnFd0izSLUItWTp_WZf-BDPt_Wnjg8li-Kv87UUEB2VyGTGISKvrEMO2qeYovPA'

export default function VoterPage() {
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [votingStatus, setVotingStatus] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [periodClosed, setPeriodClosed] = useState(false)
  const [reloadMessage, setReloadMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    
    // Setup interval to check period status every 60 seconds
    // 60 seconds = ~5 requests/sec with 300 concurrent users
    // Reasonable balance between responsiveness and server load
    const interval = setInterval(() => {
      checkPeriodStatus()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const periodResponse = await voterService.getCurrentPeriod()
      console.log('Period Response:', periodResponse)
      // Handle both null and period objects (GORM returns lowercase "id")
      const period = periodResponse.data?.id ? periodResponse.data : null
      console.log('Current Period:', period)
      setCurrentPeriod(period)
      setPeriodClosed(false)

      if (period) {
        const candidatesResponse = await voterService.getCandidates()
        console.log('Candidates Response:', candidatesResponse)
        setCandidates(candidatesResponse.data?.candidates || [])
      }

      const statusResponse = await voterService.getVotingStatus()
      console.log('Voting Status Response:', statusResponse)
      setVotingStatus(statusResponse.data || [])
    } catch (err) {
      console.error('LoadData Error:', err)
      setError(err.response?.data?.error || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const checkPeriodStatus = async () => {
    try {
      const periodResponse = await voterService.getCurrentPeriod()
      // Handle both null and period objects (GORM returns lowercase "id")
      const newPeriod = periodResponse.data?.id ? periodResponse.data : null
      
      // Jika periode sebelumnya ada tapi sekarang tidak ada, periode ditutup
      if (currentPeriod && !newPeriod) {
        setError('⏸️ Periode voting telah ditutup oleh admin! Halaman akan di-refresh dalam 3 detik...')
        setReloadMessage('Periode telah ditutup. Sistem sedang memperbarui... (3 detik)')
        
        // Countdown dan reload
        setTimeout(() => {
          setReloadMessage('Periode telah ditutup. Sistem sedang memperbarui... (2 detik)')
        }, 1000)
        setTimeout(() => {
          setReloadMessage('Periode telah ditutup. Sistem sedang memperbarui... (1 detik)')
        }, 2000)
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else if (!currentPeriod && newPeriod) {
        // Periode baru dibuka
        setReloadMessage('Periode voting baru telah dibuka! Halaman akan di-refresh dalam 2 detik...')
        
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else if (currentPeriod && newPeriod && currentPeriod.position !== newPeriod.position) {
        // Posisi berubah (misalnya dari Ketua ke Sekretaris)
        setReloadMessage(`Periode telah berubah dari ${currentPeriod.position?.toUpperCase()} ke ${newPeriod.position?.toUpperCase()}. Halaman akan di-refresh dalam 2 detik...`)
        
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      console.error('Error checking period status:', err)
    }
  }

  const handleVote = async (e) => {
    e.preventDefault()

    if (!selectedCandidate) {
      setError('Silakan pilih satu kandidat')
      return
    }

    // Check current period status before submitting
    try {
      const periodResponse = await voterService.getCurrentPeriod()
      const period = periodResponse.data?.id ? periodResponse.data : null
      
      // Double-check jika periode masih berlangsung
      if (!period) {
        setError('⏸️ Periode voting telah ditutup oleh admin. Anda tidak dapat memilih.')
        setCurrentPeriod(null)
        setPeriodClosed(true)
        return
      }

      // Verify it's still the same period
      if (currentPeriod && period.id !== currentPeriod.id) {
        setError('⏸️ Periode voting telah berubah. Halaman akan di-refresh...')
        setTimeout(() => {
          window.location.reload()
        }, 2000)
        return
      }
    } catch (err) {
      setError('Gagal memverifikasi status periode. Coba lagi.')
      console.error('Error checking period before vote:', err)
      return
    }

    try {
      setLoading(true)
      await voterService.submitVote(selectedCandidate)
      setSubmitted(true)
      setSelectedCandidate(null)
      
      // Reload data
      setTimeout(() => {
        loadData()
        setSubmitted(false)
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit vote')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  if (loading) {
    return <div className="voter-container"><p>Loading...</p></div>
  }

  return (
    <div className="voter-container">
      <div className="voter-header">
        <div className="header-left">
          <img src={LOGO_URL} alt="Koperasi Logo" className="header-logo" />
          <div className="header-text">
            <h1>Pengurus Koperasi Konsumen Melati Husada Sejahtera</h1>
            <p className="header-subtitle">Sistem Poling Pemilihan Pengurus</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="voter-content">
        {reloadMessage && (
          <div className="reload-notification">
            <div className="reload-spinner"></div>
            <p>{reloadMessage}</p>
          </div>
        )}

        {currentPeriod ? (
          <>
            <div className="period-info">
              <h2>Pemilihan {currentPeriod.position?.toUpperCase()}</h2>
              <p>Status: <span className="status-badge">🟢 Periode Sedang Berlangsung</span></p>
            </div>

            <div className="voting-progress">
              <h3>Status Voting Anda:</h3>
              <div className="status-list">
                {votingStatus.map((status) => (
                  <div key={status.position} className="status-item">
                    <span className="position-name">{status.position.toUpperCase()}</span>
                    <span className={`status-badge ${status.has_voted ? 'voted' : 'not-voted'}`}>
                      {status.has_voted ? '✓ Sudah Memilih' : '○ Belum Memilih'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleVote} className="voting-form">
              <div className="voting-header">
                <h3>🗳️ Pilih Kandidat Anda</h3>
                <p className="voting-subtitle">Pilih satu kandidat yang akan mewakili posisi {currentPeriod.position?.toUpperCase()}</p>
                <button 
                  type="button"
                  className="btn-refresh"
                  onClick={() => loadData()}
                  title="Refresh daftar kandidat"
                >
                  🔄
                </button>
              </div>
              
              <div className="candidates-grid">
                {candidates.map((candidate) => (
                  <label key={candidate.id} className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="candidate"
                      value={candidate.id}
                      checked={selectedCandidate === candidate.id}
                      onChange={() => setSelectedCandidate(candidate.id)}
                      style={{display: 'none'}}
                    />
                    <div className="card-photo">
                      {candidate.photo_path ? (
                        <img src={`http://159.65.11.4${candidate.photo_path}`} alt={candidate.name} />
                      ) : (
                        <div className="placeholder-photo">
                          <span className="photo-icon">👤</span>
                        </div>
                      )}
                      <div className="card-number-badge">#{candidate.number}</div>
                    </div>
                    <div className="card-content">
                      <h4 className="candidate-name">{candidate.name}</h4>
                      <div className="card-check">
                        <div className={`radio-custom ${selectedCandidate === candidate.id ? 'checked' : ''}`}>
                          {selectedCandidate === candidate.id && <span>✓</span>}
                        </div>
                        <span className="select-text">
                          {selectedCandidate === candidate.id ? 'Terpilih' : 'Pilih'}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {error && <div className="error-message">❌ {error}</div>}
              {submitted && <div className="success-message">✅ Suara Anda telah tercatat dengan sukses!</div>}

              <div className="reminder-box">
                <span className="reminder-icon">⚠️</span>
                <div className="reminder-text">
                  <strong>Penting!</strong> Jangan lupa tekan tombol <strong>"Konfirmasi Pilihan"</strong> untuk memproses suara Anda
                </div>
              </div>

              <button type="submit" className="vote-btn" disabled={loading || !selectedCandidate || !currentPeriod}>
                <span className="btn-icon">🗳️</span>
                <span className="btn-text">{loading ? 'Memproses Suara...' : 'Konfirmasi Pilihan'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="no-period">
            {periodClosed ? (
              <>
                <div className="period-closed-icon">🏁</div>
                <p className="period-closed-title">Periode Voting Telah Ditutup</p>
                <p className="period-closed-message">Admin telah menutup periode voting. Anda tidak dapat lagi memilih untuk saat ini.</p>
                <p className="period-closed-info">Tunggu periode voting berikutnya untuk memilih kandidat lainnya.</p>
              </>
            ) : (
              <>
                <div className="waiting-icon">⏳</div>
                <p>Menunggu periode voting dibuka oleh admin...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
