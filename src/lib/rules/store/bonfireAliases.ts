import { toFoundryIdentifier } from '../../foundry/identifiers'

const canonicalRuleAliases: Record<string, string> = {
  'mind-sliver-taumaturgo': 'mind-sliver',
  'protetion-from-evil-and-good': 'protection-from-evil-and-good',
  algury: 'augury',
  'agua-benta': 'agua-benta',
}

export function normalizeRuleLookupKey(input: unknown): string {
  const compact = String(input ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const normalized = toFoundryIdentifier(compact).replace(/[-_]+/g, '-')
  return canonicalRuleAliases[normalized] ?? normalized
}

export function ruleLookupKeys(rule: { id: string; name: string; aliases?: string[] }): string[] {
  return Array.from(new Set([rule.id, rule.name, ...(rule.aliases ?? [])].map(normalizeRuleLookupKey).filter(Boolean)))
}
