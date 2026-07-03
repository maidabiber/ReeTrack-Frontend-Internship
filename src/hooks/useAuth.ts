import { useContext } from 'react'
import { AuthContext } from '../context/auth'
import type { AuthContextValue } from '../context/auth'

/** Access the current auth session. Must be used within an <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
