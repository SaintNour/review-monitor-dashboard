import type { StatusPageFilters } from '../components/EntriesFilterBar'
import * as store from './mockStore'

export type ApiEntriesResponse = {
  rows: Array<Record<string, unknown>>
  totalCount: number
  page: number
  pageSize: number
  pageCount: number
}

export async function fetchEntriesApi(params: {
  status?: 'Ongoing' | 'Resolved' | 'Social Media'
  filters: StatusPageFilters
  page: number
  pageSize: number
}): Promise<ApiEntriesResponse> {
  return store.listEntries(params)
}

export async function fetchEntryByIdApi(id: string) {
  return store.getEntryById(id)
}

export async function createEntryApi(payload: Record<string, unknown>) {
  return store.createEntry(payload)
}

export async function updateEntryApi(id: string, payload: Record<string, unknown>) {
  return store.updateEntry(id, payload)
}
