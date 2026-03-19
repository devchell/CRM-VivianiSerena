import { getGoogleAccessToken } from './googleCalendar'

export type GoogleBusinessLocation = {
  accountName: string
  accountId: string
  accountLabel: string
  locationName: string
  locationId: string
  title: string
  address: string
}

export type GoogleBusinessReview = {
  id: string
  rating: number
  comment: string
  reviewerName: string
  reviewerPhotoUrl: string | null
  updateTime: string | null
  createTime: string | null
  locationTitle: string
  locationId: string
}

type GoogleBusinessAccount = {
  name: string
  accountName?: string
  type?: string
}

type GoogleBusinessLocationResponse = {
  locations?: Array<{
    name?: string
    title?: string
    storefrontAddress?: {
      addressLines?: string[]
      locality?: string
      administrativeArea?: string
      postalCode?: string
      regionCode?: string
    }
  }>
  nextPageToken?: string
}

type GoogleBusinessLocationItem = NonNullable<GoogleBusinessLocationResponse['locations']>[number]

type GoogleBusinessAccountsResponse = {
  accounts?: GoogleBusinessAccount[]
  nextPageToken?: string
}

type GoogleBusinessReviewsResponse = {
  reviews?: Array<{
    reviewId?: string
    starRating?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
    comment?: string
    createTime?: string
    updateTime?: string
    reviewer?: {
      displayName?: string
      profilePhotoUrl?: string
    }
  }>
  nextPageToken?: string
}

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

function normalizeAccountLabel(account: GoogleBusinessAccount) {
  return account.accountName?.trim() || account.name.replace('accounts/', 'Conta ')
}

function formatAddress(location: GoogleBusinessLocationItem | undefined) {
  const address = location?.storefrontAddress
  if (!address) return ''

  return [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ]
    .filter(Boolean)
    .join(', ')
}

function parseLocationId(locationName: string) {
  return locationName.replace('locations/', '')
}

async function googleApiFetch<T>(url: string): Promise<T> {
  const accessToken = await getGoogleAccessToken()
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Google API ${response.status}: ${body || response.statusText}`)
  }

  return response.json() as Promise<T>
}

export async function listGoogleBusinessLocations(): Promise<GoogleBusinessLocation[]> {
  const accounts: GoogleBusinessAccount[] = []
  let nextAccountPageToken: string | undefined

  do {
    const url = new URL('https://mybusinessaccountmanagement.googleapis.com/v1/accounts')
    url.searchParams.set('pageSize', '100')
    if (nextAccountPageToken) {
      url.searchParams.set('pageToken', nextAccountPageToken)
    }

    const payload = await googleApiFetch<GoogleBusinessAccountsResponse>(url.toString())
    accounts.push(...(payload.accounts ?? []).filter((account) => account.type !== 'PERSONAL'))
    nextAccountPageToken = payload.nextPageToken
  } while (nextAccountPageToken)

  const locations = await Promise.all(
    accounts.map(async (account) => {
      const items: GoogleBusinessLocation[] = []
      let nextLocationPageToken: string | undefined

      do {
        const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`)
        url.searchParams.set('pageSize', '100')
        url.searchParams.set('readMask', 'title,storefrontAddress')
        if (nextLocationPageToken) {
          url.searchParams.set('pageToken', nextLocationPageToken)
        }

        const payload = await googleApiFetch<GoogleBusinessLocationResponse>(url.toString())
        for (const location of payload.locations ?? []) {
          if (!location.name) continue

          items.push({
            accountName: account.name,
            accountId: account.name.replace('accounts/', ''),
            accountLabel: normalizeAccountLabel(account),
            locationName: location.name,
            locationId: parseLocationId(location.name),
            title: location.title?.trim() || 'Perfil sem titulo',
            address: formatAddress(location),
          })
        }

        nextLocationPageToken = payload.nextPageToken
      } while (nextLocationPageToken)

      return items
    })
  )

  return locations.flat().sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}

export async function fetchGoogleBusinessReviews(locations: GoogleBusinessLocation[]) {
  const allReviews = await Promise.all(
    locations.map(async (location) => {
      const reviews: GoogleBusinessReview[] = []
      let nextPageToken: string | undefined

      do {
        const url = new URL(`https://mybusiness.googleapis.com/v4/${location.accountName}/locations/${location.locationId}/reviews`)
        url.searchParams.set('pageSize', '50')
        url.searchParams.set('orderBy', 'updateTime desc')
        if (nextPageToken) {
          url.searchParams.set('pageToken', nextPageToken)
        }

        const payload = await googleApiFetch<GoogleBusinessReviewsResponse>(url.toString())

        reviews.push(
          ...(payload.reviews ?? []).map((review) => ({
            id: review.reviewId ?? `${location.locationId}-${review.updateTime ?? Math.random().toString(36).slice(2)}`,
            rating: STAR_RATING_MAP[review.starRating ?? 'FIVE'] ?? 5,
            comment: review.comment?.trim() || 'Avaliação publicada no Google.',
            reviewerName: review.reviewer?.displayName?.trim() || 'Cliente Google',
            reviewerPhotoUrl: review.reviewer?.profilePhotoUrl?.trim() || null,
            updateTime: review.updateTime ?? null,
            createTime: review.createTime ?? null,
            locationTitle: location.title,
            locationId: location.locationId,
          }))
        )

        nextPageToken = payload.nextPageToken
      } while (nextPageToken)

      return reviews
    })
  )

  const reviews = allReviews.flat().sort((a, b) => {
    const aTime = a.updateTime ? new Date(a.updateTime).getTime() : 0
    const bTime = b.updateTime ? new Date(b.updateTime).getTime() : 0
    return bTime - aTime
  })

  const count = reviews.length
  const averageRating = count > 0
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / count).toFixed(1))
    : null

  return {
    count,
    averageRating,
    reviews,
  }
}
