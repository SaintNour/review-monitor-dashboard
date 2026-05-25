import * as store from './mockStore'

export type DashboardMetricsApiResponse = {
  total: number
  resolved: number
  ongoing: number
  unresolved: number
  unresolvedOver7: number
  avgStars: number
  aging: {
    '0-3': number
    '4-7': number
    '8+': number
  }
  byPlatform: Array<{ key: string; value: number }>
  byError: Array<{ key: string; value: number }>
  byRating: Array<{ key: string; value: number }>
}

export async function fetchDashboardMetricsApi(
  filters: {
    selectedPlatforms: string[]
    fromDate: string
    toDate: string
    starsFilter: string
    errorFilter: string
  },
): Promise<DashboardMetricsApiResponse> {
  return store.getDashboardMetrics(filters)
}
