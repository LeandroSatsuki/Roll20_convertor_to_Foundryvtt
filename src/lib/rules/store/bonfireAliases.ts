import { toFoundryIdentifier } from '../../foundry/identifiers'

export function normalizeRuleLookupKey(input: unknown): string {
  return toFoundryIdentifier(String(input ?? '')).replace(/[-_]+/g, '-')
}

export function ruleLookupKeys(rule: { id: string; name: string; aliases?: string[] }): string[] {
  return Array.from(new Set([rule.id, rule.name, ...(rule.aliases ?? [])].map(normalizeRuleLookupKey).filter(Boolean)))
}

