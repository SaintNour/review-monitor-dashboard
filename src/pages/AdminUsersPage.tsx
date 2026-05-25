import React, { useEffect, useMemo, useState } from 'react'
import { Layout } from '../components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../auth/AuthProvider'
import type { Role, UserProfile } from '../types'
import { fetchAllUsers } from '../data/users'
import { createUserProfileApi, updateUserRoleApi } from '../data/users.api'
import { UserPlus } from 'lucide-react'

export function AdminUsersPage() {
  const { profile } = useAuth()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('moderator')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [roleEdits, setRoleEdits] = useState<Record<string, Role>>({})
  const [savingUid, setSavingUid] = useState<string | null>(null)
  const [users, setUsers] = useState<Array<{ uid: string } & UserProfile>>([])

  async function refreshUsers() {
    const all = await fetchAllUsers()
    setUsers(all)
    setRoleEdits(Object.fromEntries(all.map((u) => [u.uid, u.role])))
  }

  useEffect(() => {
    void refreshUsers()
  }, [])

  const canCreate = useMemo(() => email.trim() && displayName.trim(), [email, displayName])

  async function createUser() {
    if (!profile) return
    setBusy(true)
    setMsg(null)
    try {
      const id = `user-${Date.now()}`
      await createUserProfileApi({
        id,
        email: email.trim(),
        displayName: displayName.trim(),
        role,
      })
      setMsg(`Added ${email} (${role}) to the demo user list.`)
      setEmail('')
      setDisplayName('')
      setRole('moderator')
      await refreshUsers()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setBusy(false)
    }
  }

  async function saveRole(uid: string) {
    const nextRole = roleEdits[uid]
    if (!nextRole) return
    setSavingUid(uid)
    setMsg(null)
    try {
      await updateUserRoleApi(uid, nextRole)
      setMsg('Role updated.')
      await refreshUsers()
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed to update role')
    } finally {
      setSavingUid(null)
    }
  }

  return (
    <Layout>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-white">Admin: Users</div>
        <div className="mt-1.5 text-sm text-white/52">
          Manage demo team members (in-memory; resets on page refresh unless persisted in session).
        </div>
      </div>

      {msg ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">{msg}</div>
      ) : null}

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={18} />
              Add demo user
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </Select>
            <Button
              type="button"
              fullWidth
              disabled={!canCreate || busy}
              onClick={() => void createUser()}
            >
              Add user
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((u) => (
              <div
                key={u.uid}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
              >
                <div>
                  <div className="font-medium text-white/90">{u.displayName}</div>
                  <div className="text-xs text-white/50">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{u.role}</Badge>
                  <Select
                    value={roleEdits[u.uid] ?? u.role}
                    onChange={(e) => setRoleEdits((prev) => ({ ...prev, [u.uid]: e.target.value as Role }))}
                  >
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={savingUid === u.uid}
                    onClick={() => void saveRole(u.uid)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
