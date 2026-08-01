import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import logoWhite from '@/assets/brand/fullLogoWhite.svg'

/*
  Login (global-cross-cutting §1). Full-bleed plantation background + deep-green
  overlay, centered card. Card uses floating labels; the rest of the portal uses
  top-aligned (foundations §4). Users authenticate by phone — the DB's login
  identifier, correct for rural mobile users without email.
*/
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      setError('Please enter your phone number.')
      return
    }
    if (!password) {
      setError('Please enter the password.')
      return
    }
    setError(undefined)
    setLoading(true)
    try {
      await login(phone, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
            <FloatingInput id="phone" label="Phone number" type="tel" value={phone} onChange={setPhone} autoFocus />
            <FloatingInput id="password" label="Password" type="password" value={password} onChange={setPassword} revealable />
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
  revealable,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
  /** Adds a show/hide eye toggle for password fields (mirrors ui/Input `revealable`). */
  revealable?: boolean
}) {
  const [show, setShow] = useState(false)
  const resolvedType = revealable ? (show ? 'text' : 'password') : type

  return (
    <div className="relative">
      <input
        id={id}
        type={resolvedType}
        value={value}
        autoFocus={autoFocus}
        placeholder=" "
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'peer h-12 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 pt-4 text-sm text-text focus:border-primary focus:outline-none',
          revealable && 'pr-11',
        )}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 top-1.5 text-xs text-text-muted transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-xs"
      >
        {label}
      </label>
      {revealable && (
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-xs)] text-text-muted hover:text-text"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  )
}
