import { clampPageCount, normalizeIsbn, normalizeText } from '../lib/books'
import { mapSubjectsToCategories } from '../lib/categories'
import type { BookFacts, CoverCandidate, ExternalBookHit } from '../types'

const SEARCH_TIMEOUT_MS = 8000

function httpsUrl(url?: string | null): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

function uniqueByUrl(items: CoverCandidate[]): CoverCandidate[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

function uniqueSubjects(values?: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const subjects: string[] = []
  for (const value of values ?? []) {
    const trimmed = value?.trim()
    if (!trimmed) continue
    const key = normalizeText(trimmed)
    if (!key || seen.has(key)) continue
    seen.add(key)
    subjects.push(trimmed)
  }
  return subjects
}

function subjectsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return uniqueSubjects(
    value.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') return item.name
      return null
    }),
  )
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function collect<T extends { hits: ExternalBookHit[]; covers: CoverCandidate[] }>(jobs: Array<Promise<T>>): Promise<{ hits: ExternalBookHit[]; covers: CoverCandidate[] }> {
  const settled = await Promise.allSettled(jobs)
  const hits: ExternalBookHit[] = []
  const covers: CoverCandidate[] = []
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue
    hits.push(...result.value.hits)
    covers.push(...result.value.covers)
  }
  return { hits, covers }
}

async function openLibraryByIsbn(isbn: string): Promise<{ hits: ExternalBookHit[]; covers: CoverCandidate[] }> {
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  const covers: CoverCandidate[] = [{ url: coverUrl, source: 'Open Library', label: 'Open Library (ISBN)' }]
  const data = await fetchJson<{
    title?: string
    publishers?: string[]
    publish_date?: string
    number_of_pages?: number
    authors?: { key: string }[]
    subjects?: unknown
    works?: { key: string }[]
  }>(`https://openlibrary.org/isbn/${isbn}.json`)
  if (!data) return { hits: [], covers }

  let author = ''
  const authorKey = data.authors?.[0]?.key
  if (authorKey) {
    const authorData = await fetchJson<{ name?: string }>(`https://openlibrary.org${authorKey}.json`)
    author = authorData?.name ?? ''
  }

  let subjects = subjectsFromUnknown(data.subjects)
  const workKey = data.works?.[0]?.key
  if (workKey && subjects.length < 3) {
    const work = await fetchJson<{ subjects?: unknown }>(`https://openlibrary.org${workKey}.json`)
    subjects = uniqueSubjects([...subjects, ...subjectsFromUnknown(work?.subjects)])
  }

  return {
    hits: [
      {
        title: data.title ?? '',
        author,
        isbn,
        coverUrl,
        publisher: data.publishers?.[0] ?? null,
        published: data.publish_date ?? null,
        pageCount: clampPageCount(data.number_of_pages),
        subjects,
        source: 'Open Library',
      },
    ],
    covers,
  }
}

async function openLibrarySearch(query: string): Promise<{ hits: ExternalBookHit[]; covers: CoverCandidate[] }> {
  const data = await fetchJson<{
    docs?: Array<{
      title?: string
      author_name?: string[]
      isbn?: string[]
      cover_i?: number
      publisher?: string[]
      first_publish_year?: number
      number_of_pages_median?: number
      subject?: string[]
    }>
  }>(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,isbn,cover_i,publisher,first_publish_year,number_of_pages_median,subject,key`)
  if (!data) return { hits: [], covers: [] }

  const hits: ExternalBookHit[] = []
  const covers: CoverCandidate[] = []
  for (const doc of data.docs ?? []) {
    const isbn = doc.isbn?.find((value) => /97[89]\d{10}|\d{9}[\dX]/i.test(value)) ?? doc.isbn?.[0] ?? null
    const coverUrl = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null
    hits.push({
      title: doc.title ?? '',
      author: doc.author_name?.join(', ') ?? '',
      isbn: isbn ? normalizeIsbn(isbn) : null,
      coverUrl,
      publisher: doc.publisher?.[0] ?? null,
      published: doc.first_publish_year ? String(doc.first_publish_year) : null,
      pageCount: clampPageCount(doc.number_of_pages_median),
      subjects: uniqueSubjects(doc.subject),
      source: 'Open Library',
    })
    if (coverUrl) covers.push({ url: coverUrl, source: 'Open Library', label: doc.title || 'Open Library' })
  }
  return { hits, covers }
}

async function googleBooksSearch(query: string): Promise<{ hits: ExternalBookHit[]; covers: CoverCandidate[] }> {
  const data = await fetchJson<{
    items?: Array<{
      volumeInfo?: {
        title?: string
        authors?: string[]
        industryIdentifiers?: Array<{ type: string; identifier: string }>
        imageLinks?: { thumbnail?: string; smallThumbnail?: string }
        publisher?: string
        publishedDate?: string
        pageCount?: number
        categories?: string[]
      }
    }>
  }>(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8`)
  if (!data) return { hits: [], covers: [] }

  const hits: ExternalBookHit[] = []
  const covers: CoverCandidate[] = []
  for (const item of data.items ?? []) {
    const info = item.volumeInfo
    if (!info?.title) continue
    const isbn13 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier
    const isbn10 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier
    const cover = httpsUrl(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail)?.replace('zoom=1', 'zoom=2')
    hits.push({
      title: info.title,
      author: info.authors?.join(', ') ?? '',
      isbn: normalizeIsbn(isbn13 ?? isbn10),
      coverUrl: cover,
      publisher: info.publisher ?? null,
      published: info.publishedDate ?? null,
      pageCount: clampPageCount(info.pageCount),
      subjects: uniqueSubjects(info.categories),
      source: 'Google Books',
    })
    if (cover) covers.push({ url: cover, source: 'Google Books', label: info.title })
  }
  return { hits, covers }
}

function searchJobs(input: { title?: string; author?: string; isbn?: string }) {
  const isbn = normalizeIsbn(input.isbn)
  const text = [input.title, input.author].filter(Boolean).join(' ').trim()
  const jobs: Array<Promise<{ hits: ExternalBookHit[]; covers: CoverCandidate[] }>> = []
  if (isbn) {
    jobs.push(openLibraryByIsbn(isbn), googleBooksSearch(`isbn:${isbn}`))
  }
  if (text) {
    jobs.push(openLibrarySearch(text), googleBooksSearch(text))
  }
  return jobs
}

export async function searchExternalBooks(input: { title?: string; author?: string; isbn?: string }): Promise<ExternalBookHit[]> {
  const { hits } = await collect(searchJobs(input))
  const seen = new Set<string>()
  return hits.filter((hit) => {
    const key = `${(hit.isbn || '').toLowerCase()}|${hit.title.toLowerCase()}|${hit.author.toLowerCase()}`
    if (seen.has(key) || !hit.title) return false
    seen.add(key)
    return true
  })
}

export async function searchCoverCandidates(input: { title?: string; author?: string; isbn?: string }): Promise<CoverCandidate[]> {
  const { covers } = await collect(searchJobs(input))
  return uniqueByUrl(covers).slice(0, 12)
}

const factsCache = new Map<string, BookFacts>()

interface OpenLibraryDoc {
  title?: string
  author_name?: string[]
  isbn?: string[]
  publisher?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  subject?: string[]
  key?: string
}

function emptyFacts(): BookFacts {
  return { pageCount: null, publisher: null, published: null }
}

function firstAuthor(author?: string): string {
  return (author ?? '').split(',')[0]?.trim() || ''
}

function isJunkTitle(title?: string): boolean {
  const normalized = normalizeText(title ?? '')
  return /^(resumen|summary|analisis|analysis|study guide|book review)\b/.test(normalized) || /\b(resumen completo|summary of|analisis de|complete summary)\b/.test(normalized)
}

function altTitlesFrom(title?: string): string[] {
  if (!title) return []
  return [...title.matchAll(/\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .filter((inner) => inner.length >= 4 && !/^\d{4}$/.test(inner) && !isJunkTitle(inner))
}

function authorMatches(hitAuthors: string[] | undefined, author: string): boolean {
  const last = normalizeText(firstAuthor(author)).split(' ').filter((word) => word.length > 1).pop()
  if (!last) return true
  return (hitAuthors ?? []).some((name) => normalizeText(name).includes(last))
}

function factsCacheKey(input: { title?: string; author?: string; isbn?: string }): string {
  return `${normalizeIsbn(input.isbn) ?? ''}|${normalizeText([input.title, input.author].filter(Boolean).join(' '))}`
}

export function clearBookFactsCache(input?: { title?: string; author?: string; isbn?: string }): void {
  if (!input) {
    factsCache.clear()
    return
  }
  factsCache.delete(factsCacheKey(input))
}

function scoreDoc(doc: OpenLibraryDoc, title: string, author: string): number {
  if (isJunkTitle(doc.title)) return -100
  let score = 0
  if (clampPageCount(doc.number_of_pages_median)) score += 5
  const wanted = normalizeText(title)
  const got = normalizeText(doc.title ?? '')
  if (got && wanted && got === wanted) score += 10
  else if (got && wanted && (got.includes(wanted) || wanted.includes(got))) score += 6
  else {
    const words = wanted.split(' ').filter((word) => word.length > 3)
    score += words.filter((word) => got.includes(word)).length
  }
  if (authorMatches(doc.author_name, author)) score += 4
  else score -= 2
  return score
}

function factsFromDoc(doc: OpenLibraryDoc): BookFacts {
  return {
    pageCount: clampPageCount(doc.number_of_pages_median),
    publisher: doc.publisher?.[0]?.trim() || null,
    published: doc.first_publish_year ? String(doc.first_publish_year) : null,
  }
}

async function openLibraryDocs(params: string): Promise<OpenLibraryDoc[]> {
  const data = await fetchJson<{ docs?: OpenLibraryDoc[] }>(
    `https://openlibrary.org/search.json?${params}&limit=8&fields=title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,subject,key`,
  )
  return data?.docs ?? []
}

function pickDoc(docs: OpenLibraryDoc[], title: string, author: string): OpenLibraryDoc | null {
  const ranked = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, title, author) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.doc.number_of_pages_median ?? 0) - (a.doc.number_of_pages_median ?? 0))
  const withPages = ranked.find((item) => clampPageCount(item.doc.number_of_pages_median))
  return (withPages ?? ranked[0])?.doc ?? null
}

async function lookupOpenLibrary(title: string, author: string): Promise<BookFacts> {
  const who = firstAuthor(author)
  const plain = normalizeText(title)
  const queries = [
    `title=${encodeURIComponent(title)}&author=${encodeURIComponent(who)}`,
    `q=${encodeURIComponent(`${title} ${who}`.trim())}`,
  ]
  if (/[\u0300-\u036f]/.test(title.normalize('NFD'))) {
    queries.push(`q=${encodeURIComponent(`${plain} ${who}`.trim())}`)
  }

  const seen = new Set<string>()
  for (const query of queries) {
    if (seen.has(query)) continue
    seen.add(query)
    const docs = await openLibraryDocs(query)
    const picked = pickDoc(docs, title, author)
    if (picked && clampPageCount(picked.number_of_pages_median)) return factsFromDoc(picked)

    const junk = docs.find((doc) => isJunkTitle(doc.title))
    for (const alt of altTitlesFrom(junk?.title)) {
      const altDocs = await openLibraryDocs(`q=${encodeURIComponent(`${alt} ${who}`.trim())}`)
      const altPicked = pickDoc(altDocs, alt, author)
      if (altPicked && clampPageCount(altPicked.number_of_pages_median)) return factsFromDoc(altPicked)
    }
  }

  return emptyFacts()
}

async function lookupGoogleBooks(title: string, author: string): Promise<BookFacts> {
  const who = firstAuthor(author)
  const query = [title, who].filter(Boolean).join(' ').trim()
  if (!query) return emptyFacts()
  const { hits } = await googleBooksSearch(query)
  const ranked = hits
    .filter((hit) => !isJunkTitle(hit.title) && hit.pageCount)
    .sort((a, b) => {
      const aScore = scoreDoc({ title: a.title, author_name: a.author ? [a.author] : [], number_of_pages_median: a.pageCount ?? undefined }, title, author)
      const bScore = scoreDoc({ title: b.title, author_name: b.author ? [b.author] : [], number_of_pages_median: b.pageCount ?? undefined }, title, author)
      return bScore - aScore
    })
  const best = ranked[0]
  if (!best?.pageCount) return emptyFacts()
  return {
    pageCount: best.pageCount,
    publisher: best.publisher ?? null,
    published: best.published ?? null,
  }
}

export async function lookupBookFacts(input: { title?: string; author?: string; isbn?: string }): Promise<BookFacts> {
  const isbn = normalizeIsbn(input.isbn)
  const title = input.title?.trim() ?? ''
  const author = input.author?.trim() ?? ''
  const cacheKey = factsCacheKey(input)
  const cached = factsCache.get(cacheKey)
  if (cached) return cached

  let facts = emptyFacts()
  if (isbn) {
    const { hits } = await openLibraryByIsbn(isbn)
    const hit = hits.find((item) => item.pageCount)
    if (hit?.pageCount) {
      facts = { pageCount: hit.pageCount, publisher: hit.publisher ?? null, published: hit.published ?? null }
    }
  }

  if (!facts.pageCount && title) {
    facts = await lookupOpenLibrary(title, author)
  }

  if (!facts.pageCount && title) {
    facts = await lookupGoogleBooks(title, author)
  }

  if (facts.pageCount) factsCache.set(cacheKey, facts)
  return facts
}

export async function lookupSuggestedCategories(input: {
  title?: string
  author?: string
  isbn?: string
  subjects?: string[]
}): Promise<string[]> {
  const title = input.title?.trim() ?? ''
  const author = input.author?.trim() ?? ''
  const collected = [...(input.subjects ?? [])]
  const jobs = searchJobs(input)

  if (jobs.length) {
    const { hits } = await collect(jobs)
    const ranked = hits
      .map((hit) => ({
        hit,
        score:
          scoreDoc(
            {
              title: hit.title,
              author_name: hit.author ? hit.author.split(',').map((name) => name.trim()) : [],
              number_of_pages_median: hit.pageCount ?? undefined,
              subject: hit.subjects,
            },
            title || hit.title,
            author,
          ) + (hit.source === 'Google Books' && hit.subjects?.length ? 2 : 0),
      }))
      .filter((item) => item.hit.subjects?.length)
      .sort((a, b) => b.score - a.score)

    for (const item of ranked.slice(0, 4)) {
      collected.push(...(item.hit.subjects ?? []))
    }
  }

  return mapSubjectsToCategories(collected)
}
