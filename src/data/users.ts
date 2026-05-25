import { fetchUsersApi } from './users.api'

export async function fetchAllUsers() {
  return fetchUsersApi()
}
