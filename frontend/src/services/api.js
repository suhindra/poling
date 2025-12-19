import axios from 'axios'

const API_BASE_URL = 'http://159.65.11.4/api'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  console.log('API Request:', {
    method: config.method,
    url: config.url,
    hasToken: !!token,
    headers: config.headers
  })
  return config
})

// Add response error interceptor for debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)

// Auth Service
export const authService = {
  voterLogin: (username, password) =>
    api.post('/login', { username, password }),
  
  adminLogin: (username, password) =>
    api.post('/admin-login', { username, password }),
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

// Voter Service
export const voterService = {
  getCurrentPeriod: () => api.get('/voter/current-period'),
  
  getCandidates: () => api.get('/voter/candidates'),
  
  submitVote: (candidateId) =>
    api.post('/voter/vote', { candidate_id: candidateId }),
  
  getVotingStatus: () => api.get('/voter/voting-status')
}

// Admin Service
export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  openVotingPeriod: (position) =>
    api.post('/admin/period/open', { position }),
  
  closeVotingPeriod: (position) =>
    api.post('/admin/period/close', { position }),
  
  getResults: () => api.get('/admin/results'),
  
  generateCredentials: (count) =>
    api.post('/admin/generate-credentials', { count }),
  
  getVoters: () => api.get('/admin/voters'),
  
  exportVotersCSV: () => api.get('/admin/voters/export'),
  
  resetVoters: () => api.post('/admin/voters/reset', {}),
  
  createCandidate: (name, number, positions = []) =>
    api.post('/admin/candidates', { name, number, positions }),
  
  createCandidateWithPhoto: (formData, positions = []) => {
    if (positions.length > 0) {
      formData.append('positions', positions.join(','))
    }
    return api.post('/admin/candidates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  listCandidates: () => api.get('/admin/candidates'),
  
  deleteCandidate: (id) =>
    api.delete(`/admin/candidates/${id}`),
  
  updateCandidate: (id, name, positions = []) =>
    api.put(`/admin/candidates/${id}`, { name, positions }),
  
  updateCandidateWithPhoto: (id, formData, positions = []) => {
    if (positions.length > 0) {
      formData.append('positions', positions.join(','))
    } else if (!formData.has('positions')) {
      formData.append('positions', '')
    }
    return api.put(`/admin/candidates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  
  resetVoting: () =>
    api.post('/admin/reset-voting', {}),
  
  generateDummyVotes: () =>
    api.post('/admin/generate-dummy-votes', {})
}

export default api
