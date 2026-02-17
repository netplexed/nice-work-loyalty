const EXTERNAL_SCHEME_REGEX = /^(https?:\/\/|mailto:|tel:)/i
const DOMAIN_LIKE_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:[/?#].*)?$/i

export function isExternalActionUrl(url: string): boolean {
    return EXTERNAL_SCHEME_REGEX.test(url)
}

export function normalizeActionUrl(input?: string | null): string | undefined {
    if (!input) return undefined

    const value = input.trim()
    if (!value) return undefined

    if (value.startsWith('//')) return `https:${value}`
    if (isExternalActionUrl(value)) return value
    if (value.startsWith('/') || value.startsWith('?') || value.startsWith('#')) return value
    if (DOMAIN_LIKE_REGEX.test(value)) return `https://${value}`

    return `/${value}`
}
