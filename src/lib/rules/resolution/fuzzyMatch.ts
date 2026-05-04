import { normalizeRuleLookupKey } from '../store/bonfireAliases'

export function fuzzyIncludesMatch(query: string, candidate: string): boolean {
  const left = normalizeRuleLookupKey(query)
  const right = normalizeRuleLookupKey(candidate)
  if (!left || !right) return false
  return left.includes(right) || right.includes(left) || levenshtein(left, right) <= Math.max(2, Math.floor(Math.min(left.length, right.length) / 4))
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) => [row])
  for (let col = 1; col <= b.length; col += 1) matrix[0][col] = col
  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(matrix[row - 1][col] + 1, matrix[row][col - 1] + 1, matrix[row - 1][col - 1] + cost)
    }
  }
  return matrix[a.length][b.length]
}

