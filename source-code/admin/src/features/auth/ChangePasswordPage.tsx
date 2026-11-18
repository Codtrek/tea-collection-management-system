import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import * as authService from '@/services/auth'

/*
  Change password (Users-Roles-Addendum §5). Reached after a sign-in with a temporary password
  (the server refuses every other route until this is done), or from Profile. Saving signs out
  every other session; this one continues on the fresh token the server returns.
*/
export function ChangePasswordPage() {
  const { user, loading, setSession, logout } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  const forced = !!user.mustChangePassword

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next.length < 8) return setError('The new password must be at least 8 characters.')
    if (next.length > 72) return setError('The new password can be at most 72 characters.')
    if (next !== confirm) return setError('The two new passwords don’t match.')
    if (next === current) return setError('Choose a new password different from the current one.')
    setError(undefined)
    setSaving(true)
    try {
      const res = await authService.changePassword(current, next)
      setSession(res.accessToken, { ...res.user, mustChangePassword: false })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[440px] rounded-[var(--radius-xl)] bg-surface p-8 shadow-[var(--shadow-2)]">
        <h1 className="text-2xl font-semibold tracking-tight text-text-heading">
          {forced ? 'Choose your own password' : 'Change password'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {forced
            ? `Hello ${user.name}. You signed in with a temporary password. Choose your own to continue; nothing else opens until you do.`
            : 'Saving signs you out on every other device.'}
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label={forced ? 'Temporary password' : 'Current password'}
            type="password"
            revealable
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoFocus
          />
          <Input
            label="New password"
            type="password"
            revealable
            autoComplete="new-password"
            hint="At least 8 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <Input
            label="Repeat new password"
            type="password"
            revealable
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-[13px] text-danger-fg">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={saving} className="w-full">
            Save password
          </Button>
          {forced ? (
            <button type="button" onClick={logout} className="text-[13px] font-medium text-primary hover:underline">
              Sign out instead
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-[13px] font-medium text-primary hover:underline"
            >
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
