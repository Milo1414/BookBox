import { CATEGORIES } from '../constants'
import { normalizeText } from './books'

type LibraryCategory = (typeof CATEGORIES)[number]

const CATEGORY_ALIASES: Record<LibraryCategory, string[]> = {
  Software: [
    'software',
    'programming',
    'programacion',
    'computers',
    'computer science',
    'computer programming',
    'informatica',
    'web development',
    'coding',
    'codigo',
    'developer',
    'desarrollo de software',
  ],
  Arquitectura: [
    'arquitectura',
    'architecture',
    'software architecture',
    'system design',
    'distributed systems',
    'microservices',
    'sistemas distribuidos',
  ],
  Datos: [
    'datos',
    'data',
    'database',
    'databases',
    'data science',
    'machine learning',
    'analytics',
    'estadistica',
    'statistics',
    'big data',
    'sql',
  ],
  Producto: ['producto', 'product management', 'product design', 'product development', 'gestion de producto'],
  UX: ['ux', 'user experience', 'usability', 'usabilidad', 'hci', 'human computer', 'interaction design', 'experiencia de usuario'],
  Diseño: ['diseno', 'design', 'graphic design', 'visual design', 'diseno grafico'],
  Liderazgo: ['liderazgo', 'leadership', 'leading people', 'executive'],
  Management: ['management', 'gestion', 'managing', 'organizational behavior', 'administracion'],
  Negocios: ['negocios', 'business', 'economics', 'economia', 'business economics', 'commerce'],
  Emprendimiento: ['emprendimiento', 'entrepreneurship', 'entrepreneur', 'emprendedor'],
  Startups: ['startup', 'startups', 'start up', 'start ups'],
  Estrategia: ['estrategia', 'strategy', 'strategic', 'competitive strategy'],
  Marketing: ['marketing', 'advertising', 'publicidad', 'branding', 'brand'],
  Ventas: ['ventas', 'sales', 'selling', 'salesmanship'],
  Negociación: ['negociacion', 'negotiation', 'negotiating'],
  Productividad: ['productividad', 'productivity', 'time management', 'habits', 'habitos', 'atomic habits'],
  Carrera: ['carrera', 'career', 'careers', 'professional development', 'job hunting', 'trabajo'],
  'Relaciones sociales': [
    'relaciones sociales',
    'relationships',
    'interpersonal',
    'social skills',
    'habilidades sociales',
    'dating',
  ],
  Comunicación: ['comunicacion', 'communication', 'public speaking', 'oratoria', 'writing skills'],
  Psicología: ['psicologia', 'psychology', 'cognitive', 'behavioral', 'cognitiva'],
  'Toma de decisiones': ['toma de decisiones', 'decision making', 'decision-making', 'judgment', 'thinking fast'],
  Trading: ['trading', 'trader', 'technical analysis', 'forex', 'day trading'],
  Inversión: ['inversion', 'inversiones', 'investing', 'investment', 'finance', 'personal finance', 'wealth', 'dinero'],
  Filosofía: ['filosofia', 'philosophy', 'stoicism', 'estoicismo'],
  Creatividad: ['creatividad', 'creativity', 'creative', 'innovation', 'innovacion'],
  'Desarrollo personal': [
    'desarrollo personal',
    'self help',
    'self-help',
    'autoayuda',
    'personal development',
    'self improvement',
    'motivational',
  ],
  Biografía: ['biografia', 'biography', 'autobiography', 'autobiografia', 'memoir', 'memorias'],
}

const JUNK_SUBJECT = /^(accessible book|protected daisy|in library|overdrive|large type|lending library|nyt |open library|popular print|internet archive|protected daisy)/i

function hasWord(haystack: string, needle: string): boolean {
  if (!needle) return false
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^| )${escaped}(?: |$)`).test(haystack)
}

function splitSubject(value: string): string[] {
  return value
    .split(/[/|,;]+/)
    .map((part) => part.replace(/\b(and|&)\b/gi, ' ').trim())
    .filter((part) => part.length >= 2 && !JUNK_SUBJECT.test(part))
}

export function mapSubjectsToCategories(subjects: string[]): string[] {
  const tokens = subjects
    .flatMap(splitSubject)
    .map(normalizeText)
    .filter((token) => token.length >= 2)

  if (!tokens.length) return []

  const scores = new Map<LibraryCategory, number>()

  for (const category of CATEGORIES) {
    const aliases = [normalizeText(category), ...(CATEGORY_ALIASES[category] ?? []).map(normalizeText)]
    let score = 0

    for (const token of tokens) {
      for (const alias of aliases) {
        if (!alias) continue
        if (token === alias) {
          score += alias.length <= 3 ? 5 : 8
          break
        }
        if (alias.length >= 4 && hasWord(token, alias)) {
          score += 6
          break
        }
        if (alias.length >= 6 && token.includes(alias)) {
          score += 4
          break
        }
        if (token.length >= 6 && alias.includes(token) && token.length / alias.length >= 0.6) {
          score += 3
          break
        }
      }
    }

    if (score >= 5) scores.set(category, score)
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 3)
    .map(([category]) => category)
}
