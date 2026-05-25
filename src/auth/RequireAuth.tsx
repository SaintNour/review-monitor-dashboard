import { Outlet } from 'react-router-dom'

/** Demo build: no login gate — routes render directly. */
export function RequireAuth() {
  return <Outlet />
}

export function RequireRole({ allow }: { allow: Array<'admin' | 'moderator'> }) {
  void allow
  return <Outlet />
}
