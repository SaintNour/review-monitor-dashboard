import type { Role, UserProfile } from '../types'
import * as store from './mockStore'

export type ApiUserProfile = {
  id: string
  email: string
  displayName: string | null
  role: Role
  createdAt?: string
}

function toUserProfile(row: ApiUserProfile): { uid: string } & UserProfile {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.displayName ?? row.email.split('@')[0] ?? 'Moderator',
    role: row.role,
  }
}

export async function fetchUsersApi() {
  return store.listUsers().map(toUserProfile)
}

export async function fetchMeApi() {
  return toUserProfile(store.getMe())
}

export async function createUserProfileApi(payload: {
  id: string
  email: string
  displayName: string
  role: Role
}) {
  return toUserProfile(store.createUserProfile(payload))
}

export async function updateUserRoleApi(uid: string, role: Role) {
  return toUserProfile(store.updateUserRole(uid, role))
}
