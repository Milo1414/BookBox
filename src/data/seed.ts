import rawSeed from '../../milo_library_seed.json'
import type { Book, SeedFile } from '../types'

const seedFile = rawSeed as SeedFile

export const seedBooks: Book[] = seedFile.books
