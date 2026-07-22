import { apiClient } from './client'

/** Mirrors backend CurrencyResponse. */
export interface Currency {
  code: string
  name: string
}

interface CurrenciesResponse {
  items: Array<{
    code: string
    name: string
  }>
}

export function listCurrencies(): Promise<Currency[]> {
  return apiClient.get<CurrenciesResponse>('/currencies').then((response) =>
    response.items.map((item) => ({
      code: item.code,
      name: item.name,
    })),
  )
}
