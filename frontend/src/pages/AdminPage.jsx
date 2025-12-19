import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, authService } from '../services/api'
import './AdminPage.css'

import logoImage from '../assets/koperasi-logo.jpeg'
const LOGO_URL = logoImage

export default function AdminPage() {
  const [dashboard, setDashboard] = useState(null)
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [candidates, setCandidates] = useState([])
  const [generateCount, setGenerateCount] = useState(10)
  const [newCandidate, setNewCandidate] = useState({ name: '', number: '', photo: null, positions: [] })
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatedCredentials, setGeneratedCredentials] = useState([])
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', photo: null, positions: [] })
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [participants, setParticipants] = useState([])
  const positionOptions = ['ketua', 'sekretaris', 'bendahara', 'pengawas']
  const navigate = useNavigate()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const dashResponse = await adminService.getDashboard()
      console.log('Dashboard response:', dashResponse.data)
      setDashboard(dashResponse.data)

      const resultsResponse = await adminService.getResults()
      console.log('Results response:', resultsResponse.data)
      setResults(resultsResponse.data)

      const candidatesResponse = await adminService.listCandidates()
      console.log('Candidates response:', candidatesResponse.data)
      setCandidates(candidatesResponse.data || [])

      const participantsResponse = await adminService.getParticipants()
      console.log('Participants response:', participantsResponse.data)
      setParticipants(participantsResponse.data.participants || [])
    } catch (err) {
      console.error('LoadDashboard Error:', err)
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load dashboard'
      console.error('Error message:', errorMsg)
      setError(errorMsg)
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPeriod = async (position) => {
    try {
      await adminService.openVotingPeriod(position)
      loadDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to open period')
    }
  }

  const handleClosePeriod = async (position) => {
    try {
      await adminService.closeVotingPeriod(position)
      loadDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close period')
    }
  }

  const handleGenerateCredentials = async () => {
    try {
      const response = await adminService.generateCredentials(generateCount)
      setGeneratedCredentials(response.data.credentials)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate credentials')
    }
  }

  const handleCreateCandidate = async (e) => {
    e.preventDefault()
    try {
      if (!newCandidate.positions || newCandidate.positions.length === 0) {
        setError('Pilih minimal satu posisi untuk kandidat')
        return
      }

      if (newCandidate.photo) {
        // Upload with photo
        const formData = new FormData()
        formData.append('name', newCandidate.name)
        formData.append('number', newCandidate.number)
        formData.append('photo', newCandidate.photo)
        await adminService.createCandidateWithPhoto(formData, newCandidate.positions)
      } else {
        // Upload without photo
        await adminService.createCandidate(newCandidate.name, parseInt(newCandidate.number), newCandidate.positions)
      }
      setNewCandidate({ name: '', number: '', photo: null, positions: [] })
      setPhotoPreview(null)
      loadDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create candidate')
    }
  }

  const handlePositionToggle = (position) => {
    setNewCandidate(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }))
  }

  const handleEditPositionToggle = (position) => {
    setEditForm(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setNewCandidate({ ...newCandidate, photo: file })
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteCandidate = async (id) => {
    if (window.confirm('Hapus kandidat ini?')) {
      try {
        await adminService.deleteCandidate(id)
        loadDashboard()
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete candidate')
      }
    }
  }

  const handleEditClick = (candidate) => {
    setEditingCandidate(candidate)
    // Parse positions from candidate.positions (string format "ketua,sekretaris")
    const positions = candidate.positions ? candidate.positions.split(',').map(p => p.trim()) : []
    setEditForm({ name: candidate.name, photo: null, positions })
    setEditPhotoPreview(candidate.photo_path ? `http://159.65.11.4${candidate.photo_path}` : null)
    setShowEditModal(true)
  }

  const handleEditPhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditForm({ ...editForm, photo: file })
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateCandidate = async (e) => {
    e.preventDefault()
    if (!editingCandidate) return
    
    try {
      if (editForm.photo) {
        // Update with photo
        const formData = new FormData()
        formData.append('name', editForm.name)
        formData.append('photo', editForm.photo)
        if (editForm.positions.length > 0) {
          formData.append('positions', JSON.stringify(editForm.positions))
        }
        await adminService.updateCandidateWithPhoto(editingCandidate.id, formData)
      } else {
        // Update name and positions (no photo)
        await adminService.updateCandidate(editingCandidate.id, editForm.name, editForm.positions)
      }
      setShowEditModal(false)
      setEditingCandidate(null)
      loadDashboard()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update candidate')
    }
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditingCandidate(null)
    setEditForm({ name: '', photo: null })
    setEditPhotoPreview(null)
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleResetVoting = async () => {
    if (window.confirm('⚠️ Reset semua data voting? Tindakan ini tidak bisa dibatalkan!')) {
      try {
        await adminService.resetVoting()
        setError('') 
        loadDashboard()
        alert('✅ Data voting berhasil direset!')
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to reset voting')
      }
    }
  }

  const handleExportVoters = async () => {
    try {
      const response = await adminService.exportVotersCSV()
      // Create blob from response
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'voters.csv')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export voters')
    }
  }

  const handleResetVoters = async () => {
    if (window.confirm('⚠️ HAPUS SEMUA VOTER? Semua akun pemilih akan dihapus!\nTindakan ini tidak bisa dibatalkan!')) {
      try {
        await adminService.resetVoters()
        setError('')
        loadDashboard()
        alert('✅ Semua voter berhasil dihapus!')
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to reset voters')
      }
    }
  }

  const positions = ['ketua', 'sekretaris', 'bendahara', 'pengawas']

  if (loading) {
    return <div className="admin-container"><p>⏳ Loading dashboard...</p></div>
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="header-left">
          <img src={LOGO_URL} alt="Koperasi Logo" className="header-logo" />
          <div className="header-text">
            <h1>Pengurus Koperasi Konsumen Melati Husada Sejahtera</h1>
            <p className="header-subtitle">Dashboard Poling Pemilihan Pengurus</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="reset-btn" onClick={handleResetVoting} title="Reset semua voting data">
            🔄 Reset Voting
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fee',
          color: '#c33',
          padding: '15px',
          margin: '20px',
          borderRadius: '5px',
          maxWidth: '1200px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <strong>❌ Error:</strong> {error}
          <button onClick={() => setError('')} style={{float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px'}}>
            ✕
          </button>
        </div>
      )}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidates')}
        >
          Kandidat
        </button>
        <button
          className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
          onClick={() => setActiveTab('credentials')}
        >
          Generate Akun
        </button>
        <button
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          Peserta
        </button>
      </div>

      <div className="admin-content">
        {error && <div className="error-message">{error}</div>}

        {activeTab === 'dashboard' && (
          !dashboard ? (
            <div className="dashboard-section">
              <p style={{padding: '20px', color: '#c33'}}>⚠️ Failed to load dashboard data</p>
            </div>
          ) : (
          <div className="dashboard-section">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Pemilih</h3>
                <p className="stat-value">{dashboard.total_voters}</p>
              </div>
              <div className="stat-card">
                <h3>Sudah Memilih</h3>
                <p className="stat-value">{dashboard.voters_voted}</p>
              </div>
              <div className="stat-card">
                <h3>Periode Aktif</h3>
                <p className="stat-value">{dashboard.current_period || '—'}</p>
              </div>
            </div>

            <div className="periods-control">
              <h2>Demo & Testing</h2>
              <div className="demo-buttons-container">
                <button 
                  className="btn-generate-dummy"
                  onClick={async () => {
                    try {
                      await adminService.generateDummyVotes()
                      alert('✅ Dummy voting data generated successfully!')
                      loadDashboard()
                    } catch (err) {
                      setError('Failed to generate dummy votes: ' + (err.response?.data?.error || err.message))
                    }
                  }}
                >
                  📊 Generate Dummy Votes
                </button>
                <button 
                  className="btn-reset-voting"
                  onClick={async () => {
                    if (window.confirm('Yakin reset semua voting data? Ini akan menghapus semua suara.')) {
                      try {
                        await adminService.resetVoting()
                        alert('✅ Voting data reset successfully!')
                        loadDashboard()
                      } catch (err) {
                        setError('Failed to reset voting: ' + (err.response?.data?.error || err.message))
                      }
                    }
                  }}
                >
                  🔄 Reset Voting
                </button>
              </div>
            </div>

            <div className="periods-control">
              <h2>Kontrol Periode Voting</h2>
              <div className="periods-grid">
                {positions.map((position) => (
                  <div key={position} className="period-card">
                    <h3>{position.toUpperCase()}</h3>
                    <p className={`status ${dashboard.period_status[position] ? 'open' : 'closed'}`}>
                      {dashboard.period_status[position] ? '🔴 TERBUKA' : '🔵 TERTUTUP'}
                    </p>
                    <div className="period-buttons">
                      <button
                        className="btn-open"
                        onClick={() => handleOpenPeriod(position)}
                        disabled={dashboard.period_status[position]}
                      >
                        Buka
                      </button>
                      <button
                        className="btn-close"
                        onClick={() => handleClosePeriod(position)}
                        disabled={!dashboard.period_status[position]}
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {results && (
              <div className="results-section">
                <h2>📊 Hasil Voting</h2>
                <div className="results-positions-grid">
                  {Array.isArray(results) ? (
                    // New format: array of position objects
                    results.map((positionResult) => (
                      <div key={positionResult.position} className="result-position-card">
                        <h3>{positionResult.position.toUpperCase()}</h3>
                        <div className="votes-candidates-container">
                          {positionResult.votes && Array.isArray(positionResult.votes) && positionResult.votes.length > 0 ? (
                            positionResult.votes.map((vote, index) => (
                              <div key={index} className={`vote-candidate-item rank-${index + 1}`}>
                                <div className="vote-rank-badge">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                
                                <div className="vote-candidate-photo">
                                  {vote.photo_path ? (
                                    <img 
                                      src={`http://159.65.11.4${vote.photo_path}`} 
                                      alt={vote.name}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="%239ca3af" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E'
                                      }}
                                    />
                                  ) : (
                                    <div className="no-photo">
                                      <span style={{fontSize: '32px'}}>📷</span>
                                    </div>
                                  )}
                                </div>

                                <div className="vote-candidate-info">
                                  <div className="candidate-name">{vote.name}</div>
                                  <div className="candidate-number">No. {vote.number}</div>
                                </div>

                                <div className="vote-count-badge">
                                  <div className="count-number">{vote.vote_count}</div>
                                  <div className="count-label">suara</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px'}}>
                              📭 Belum ada suara untuk posisi ini
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Legacy format: map object (fallback)
                    Object.entries(results).map(([position, votes]) => (
                      <div key={position} className="result-position-card">
                        <h3>{position.toUpperCase()}</h3>
                        <div className="votes-candidates-container">
                          {votes && Array.isArray(votes) && votes.length > 0 ? (
                            votes.map((vote, index) => (
                              <div key={index} className={`vote-candidate-item rank-${index + 1}`}>
                                <div className="vote-rank-badge">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                </div>
                                
                                <div className="vote-candidate-photo">
                                  {vote.photo_path ? (
                                    <img 
                                      src={`http://159.65.11.4${vote.photo_path}`} 
                                      alt={vote.name}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="40" fill="%239ca3af" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E'
                                      }}
                                    />
                                  ) : (
                                    <div className="no-photo">
                                      <span style={{fontSize: '32px'}}>📷</span>
                                    </div>
                                  )}
                                </div>

                                <div className="vote-candidate-info">
                                  <div className="candidate-name">{vote.name}</div>
                                  <div className="candidate-number">No. {vote.number}</div>
                                </div>

                                <div className="vote-count-badge">
                                  <div className="count-number">{vote.vote_count}</div>
                                  <div className="count-label">suara</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p style={{color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px'}}>
                              📭 Belum ada suara untuk posisi ini
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {activeTab === 'candidates' && (
          <div className="candidates-section">
            <h2>Kelola Kandidat</h2>

            <form onSubmit={handleCreateCandidate} className="add-candidate-form">
              <h3>Tambah Kandidat Baru</h3>
              <input
                type="text"
                placeholder="Nama Kandidat"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Nomor Urut"
                value={newCandidate.number}
                onChange={(e) => setNewCandidate({ ...newCandidate, number: e.target.value })}
                required
              />
              <div className="positions-selection">
                <label><strong>Posisi Kandidat (Pilih minimal 1)</strong></label>
                <div className="positions-checkboxes">
                  {positionOptions.map((position) => (
                    <label key={position} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newCandidate.positions.includes(position)}
                        onChange={() => handlePositionToggle(position)}
                      />
                      <span>{position.charAt(0).toUpperCase() + position.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="photo-upload">
                <label htmlFor="photo-input">📷 Upload Foto (Optional)</label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <div className="photo-preview">
                    <img src={photoPreview} alt="Preview" />
                  </div>
                )}
              </div>
              <button type="submit">Tambah</button>
            </form>

            <div className="candidates-list">
              <h3>Daftar Kandidat</h3>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Foto</th>
                    <th>Nama</th>
                    <th>Posisi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td>#{candidate.number}</td>
                      <td>
                        {candidate.photo_path ? (
                          <img 
                            src={`http://159.65.11.4${candidate.photo_path}`} 
                            alt={candidate.name}
                            className="candidate-thumbnail"
                            style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px'}}
                          />
                        ) : (
                          <span style={{color: '#ccc'}}>Tidak ada foto</span>
                        )}
                      </td>
                      <td>{candidate.name}</td>
                      <td>
                        <div className="positions-badge">
                          {candidate.positions ? (
                            typeof candidate.positions === 'string'
                              ? candidate.positions.split(',').map((pos) => (
                                  <span key={pos} className="badge">{pos.trim()}</span>
                                ))
                              : Array.isArray(candidate.positions)
                              ? candidate.positions.map((pos) => (
                                  <span key={pos} className="badge">{pos}</span>
                                ))
                              : <span style={{color: '#999'}}>—</span>
                          ) : (
                            <span style={{color: '#999'}}>—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${candidate.is_active ? 'active' : 'inactive'}`}>
                          {candidate.is_active ? '✓ Aktif' : '✗ Tidak Aktif'}
                        </span>
                      </td>
                      <td style={{display: 'flex', gap: '5px'}}>
                        <button
                          className="btn-edit"
                          onClick={() => handleEditClick(candidate)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteCandidate(candidate.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="credentials-section">
            <h2>Generate Akun Pemilih</h2>

            <div className="generate-form">
              <label>
                Jumlah Akun:
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value))}
                />
              </label>
              <button onClick={handleGenerateCredentials}>Generate</button>
            </div>

            <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
              <button 
                className="btn-export"
                onClick={handleExportVoters}
                title="Download voter credentials sebagai CSV"
              >
                📥 Download CSV
              </button>
              <button 
                className="btn-danger"
                onClick={handleResetVoters}
                title="Hapus semua voter"
              >
                🗑️ Reset Voter
              </button>
            </div>

            {generatedCredentials.length > 0 && (
              <div className="credentials-result">
                <h3>Akun Terbuat ({generatedCredentials.length})</h3>
                <p>⚠️ Catat credential berikut sebelum ditutup!</p>
                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Username</th>
                      <th>Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedCredentials.map((cred, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td><code>{cred.username}</code></td>
                        <td><code>{cred.password}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!['dashboard', 'candidates', 'credentials'].includes(activeTab) && (
          <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
            <p>Pilih tab untuk melihat konten</p>
          </div>
        )}
        {activeTab === 'participants' && (
          <div className="participants-section">
            <h2>Manajemen Peserta</h2>
            
            <div className="participants-list">
              <div className="participants-header">
                <h3>Daftar Peserta</h3>
                <div className="participants-actions">
                  <button
                    className="btn-export"
                    onClick={async () => {
                      try {
                        const response = await adminService.exportParticipantsCSV()
                        const url = window.URL.createObjectURL(new Blob([response.data]))
                        const link = document.createElement('a')
                        link.href = url
                        link.setAttribute('download', 'participants.csv')
                        document.body.appendChild(link)
                        link.click()
                        link.remove()
                      } catch (err) {
                        setError('Failed to export participants')
                      }
                    }}
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {participants.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Nama</th>
                      <th>NIK</th>
                      <th>Satuan Kerja</th>
                      <th>Status</th>
                      <th>Terdaftar</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant, index) => (
                      <tr key={participant.id}>
                        <td>{index + 1}</td>
                        <td>{participant.name}</td>
                        <td><code>{participant.nik}</code></td>
                        <td>{participant.satuan_kerja}</td>
                        <td>
                          <span className={`status-badge ${participant.is_processed ? 'active' : 'inactive'}`}>
                            {participant.is_processed ? '✓ Diproses' : '⏳ Menunggu'}
                          </span>
                        </td>
                        <td style={{fontSize: '12px'}}>{new Date(participant.created_at).toLocaleDateString('id-ID')}</td>
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => {
                              if (window.confirm('Hapus peserta ini?')) {
                                adminService.deleteParticipant(participant.id)
                                  .then(() => loadDashboard())
                                  .catch(err => setError(err.response?.data?.error || 'Failed to delete'))
                              }
                            }}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{textAlign: 'center', color: '#999', padding: '20px'}}>
                  📭 Belum ada peserta terdaftar
                </p>
              )}

              <div className="participants-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Peserta</span>
                  <span className="stat-value">{participants.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sudah Diproses</span>
                  <span className="stat-value">{participants.filter(p => p.is_processed).length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Menunggu</span>
                  <span className="stat-value">{participants.filter(p => !p.is_processed).length}</span>
                </div>
              </div>
            </div>
          </div>
        )}      </div>

      {/* Edit Candidate Modal */}
      {showEditModal && editingCandidate && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Kandidat - {editingCandidate.name}</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>✕</button>
            </div>
            <form onSubmit={handleUpdateCandidate} className="edit-candidate-form">
              <div className="form-group">
                <label>Nama Kandidat</label>
                <input
                  type="text"
                  placeholder="Nama Kandidat"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label><strong>Posisi Kandidat (Pilih minimal 1)</strong></label>
                <div className="positions-checkboxes">
                  {positionOptions.map((position) => (
                    <label key={position} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.positions.includes(position)}
                        onChange={() => handleEditPositionToggle(position)}
                      />
                      <span>{position.charAt(0).toUpperCase() + position.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>📷 Upload Foto Baru (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditPhotoChange}
                />
              </div>
              {editPhotoPreview && (
                <div className="photo-preview-modal">
                  <img src={editPhotoPreview} alt="Preview" />
                </div>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn-save">Simpan</button>
                <button type="button" className="btn-cancel" onClick={handleCloseEditModal}>Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
