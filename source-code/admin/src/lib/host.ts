export function isAdminHost(): boolean {
  if (import.meta.env.VITE_APP_TARGET === 'admin') return true
  return window.location.hostname.split('.')[0] === 'admin'
}
