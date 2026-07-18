import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'
import logoWhite from '@/assets/brand/fullLogoWhite.svg'

/*
  Login (global-cross-cutting §1). Full-bleed plantation background + deep-green
  overlay, centered card. Since this is a mock build with no real auth, the demo
  role selector below the form lets you sign in as each role to see §4 redirects.
  Card uses floating labels; the rest of the portal uses top-aligned (foundations §4).
*/
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('officer@harboost.lk')
  const [password, setPassword] = useState('demo')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const signIn = (role: Role) => {
    setLoading(true)
    setError(undefined)
    setTimeout(() => {
      login(role)
      navigate('/dashboard', { replace: true })
    }, 500)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("That email or password isn't right.")
      return
    }
    // Demo: map the well-known emails to roles.
    const role: Role = email.startsWith('admin')
      ? 'Administrator'
      : email.startsWith('manager')
        ? 'Manager'
        : 'Officer'
    signIn(role)
  }

  return (
    <div className="focus-ring-invert relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Plantation background — CSS gradient stand-in for the licensed photo (assets open-item). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #0f3d24 0%, #1b8b4e 55%, #53cf81 100%)',
        }}
      />
      <div className="absolute inset-0 bg-[#08120b]/55" />

      <div className="relative w-full max-w-[420px]">
        <div className="mb-6 flex justify-center">
          <img src={logoWhite} alt="Harboost" className="h-12" />
        </div>

        <div className="animate-fade-up rounded-[var(--radius-xl)] bg-surface p-8 shadow-[var(--shadow-4)]">
          <h1 className="text-2xl font-semibold tracking-tight text-text-heading">Welcome back</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to the factory portal.</p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <FloatingInput id="email" label="Email" type="email" value={email} onChange={setEmail} autoFocus />
            <FloatingInput id="password" label="Password" type="password" value={password} onChange={setPassword} />
            {error && <p className="text-[13px] text-danger-fg">{error}</p>}
            <div className="flex items-center justify-between">
              <Checkbox label="Remember me" defaultChecked />
              <button type="button" className="text-[13px] font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-center text-xs uppercase tracking-wide text-text-muted">Demo — sign in as</p>
            <div className="grid grid-cols-3 gap-2">
              {(['Administrator', 'Officer', 'Manager'] as Role[]).map((r) => (
                <Button key={r} variant="secondary" size="sm" onClick={() => signIn(r)} disabled={loading}>
                  {r === 'Administrator' ? 'Admin' : r}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/70">Harboost · v1.0 · Need help?</p>
      </div>
    </div>
  )
}

/* Floating-label input — used only on the login card. */
function FloatingInput({
  id,
  label,
  type,
  value,
  onChange,
  autoFocus,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        autoFocus={autoFocus}
        placeholder=" "
        onChange={(e) => onChange(e.target.value)}
        className="peer h-12 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 pt-4 text-sm text-text focus:border-primary focus:outline-none"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 top-1.5 text-xs text-text-muted transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs"
      >
        {label}
      </label>
    </div>
  )
}
