import { toFoundryIdentifier } from '../../foundry/identifiers'

const canonicalRuleAliases: Record<string, string> = {
  'mind-sliver-taumaturgo': 'mind-sliver',
  'protetion-from-evil-and-good': 'protection-from-evil-and-good',
  algury: 'augury',
  'agua-benta': 'agua-benta',
  conjuracao: 'spellcasting',
  'forma-selvagem': 'wild-shape',
  'forma-silvestre': 'wild-shape',
  'wild-shape': 'wild-shape',
  'companheiro-selvagem': 'wild-companion',
  'melhoria-no-valor-de-atributo': 'ability-score-improvement',
  'incremento-no-valor-de-atributo': 'ability-score-improvement',
  'lider-inspirador': 'inspiring-leader',
  'teletransporte-feerico': 'fey-teleportation',
  'iniciado-em-magia': 'magic-initiate',
  sortudo: 'lucky',
  robusto: 'tough',
  alerta: 'alert',
  'sentidos-agucados': 'keen-senses',
}

export function normalizeRuleLookupKey(input: unknown): string {
  const compact = stripFeatureLevelPrefix(String(input ?? ''))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const normalized = toFoundryIdentifier(compact).replace(/[-_]+/g, '-')
  return canonicalRuleAliases[normalized] ?? normalized
}

export function ruleLookupKeys(rule: { id: string; name: string; aliases?: string[] }): string[] {
  return Array.from(new Set([rule.id, rule.name, ...(rule.aliases ?? [])].flatMap((value) => {
    const raw = String(value ?? '')
    const stripped = stripFeatureLevelPrefix(raw)
    return [normalizeRuleLookupKey(raw), normalizeRuleLookupKey(stripped)]
  }).filter(Boolean)))
}

export function stripFeatureLevelPrefix(name: string): string {
  const trimmed = String(name ?? '').trim()
  const stripped = trimmed.replace(/^(?:n[ií]vel|level)\s+\d+\s*[:\-–—]\s*/i, '').trim()
  return stripped || trimmed
}
