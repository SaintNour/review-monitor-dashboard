import React, { createContext, useContext, useMemo } from 'react'
import type { Role, UserProfile } from '../types'

export type DemoUser = {
  uid: string
  email: string
  displayName: string
}

type AuthState = {
  user: DemoUser
  profile: UserProfile & { uid: string }
  role: Role
  loading: boolean
}

const DEMO_USER: DemoUser = {
  uid: 'demo-admin',
  email: 'demo@example.com',
  displayName: 'Demo Admin',
}

const DEMO_PROFILE: UserProfile & { uid: string } = {
  uid: DEMO_USER.uid,
  email: DEMO_USER.email,
  displayName: DEMO_USER.displayName,
  role: 'admin',
}

const Ctx = createContext<AuthState>({
  user: DEMO_USER,
  profile: DEMO_PROFILE,
  role: 'admin',
  loading: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AuthState>(
    () => ({
      user: DEMO_USER,
      profile: DEMO_PROFILE,
      role: 'admin',
      loading: false,
    }),
    [],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
