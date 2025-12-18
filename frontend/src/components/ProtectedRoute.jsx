import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ children, userType }) {
  const user = localStorage.getItem('user')
  const userData = user ? JSON.parse(user) : null

  if (!userData || userData.type !== userType) {
    return <Navigate to="/login" />
  }

  return children
}
