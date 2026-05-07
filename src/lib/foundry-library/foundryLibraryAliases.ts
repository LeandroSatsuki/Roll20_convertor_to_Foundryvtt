import { toFoundryIdentifier } from '../foundry/identifiers'

const aliases: Record<string, string> = {
  'mind-sliver-taumaturgo': 'mind-sliver',
  'protetion-from-evil-and-good': 'protection-from-evil-and-good',
  algury: 'augury',
  'forca-fantasma': 'phantasmal-force',
  'risada-histerica-de-tasha': 'tashas-hideous-laughter',
  'travessura-de-nathair': 'nathairs-mischief',
  'conceder-maldicao': 'bestow-curse',
  'ilusao-menor': 'minor-illusion',
  'agua-benta': 'agua-benta',
  orientacao: 'guidance',
  'palavra-curativa': 'healing-word',
  'raio-guiador': 'guiding-bolt',
  comando: 'command',
  barksin: 'barkskin',
  'pele-de-arvore': 'barkskin',
  'calm-emotion': 'calm-emotions',
  'emocoes-calmas': 'calm-emotions',
  'curar-ferimentos': 'cure-wounds',
  'detectar-bem-e-mal': 'detect-evil-and-good',
  invisibilidade: 'invisibility',
  'raio-lunar': 'moonbeam',
  'crescer-plantas': 'plant-growth',
  revivificar: 'revivify',
  scimiliar: 'scimitar',
  cimitarra: 'scimitar',
  conjuracao: 'spellcasting',
  'forma-selvagem': 'wild-shape',
  'companheiro-selvagem': 'wild-companion',
  'ressurgencia-selvagem': 'wild-resurgence',
  'melhoria-no-valor-de-atributo': 'ability-score-improvement',
  'incremento-no-valor-de-atributo': 'ability-score-improvement',
  talento: 'ability-score-improvement',
  'sentido-primitivo': 'primal-order',
  'ordem-primal': 'primal-order',
  'studded-leather-armor': 'studded-leather',
  'yew-wand': 'wand',
  'herbalism-kit': 'herbalism-kit',
  'woodcarver-tools': 'woodcarvers-tools',
  'woodcarvers-tools': 'woodcarvers-tools',
  'climbers-kit': 'climbers-kit',
}

const alternateAliases: Record<string, string[]> = {
  'studded-leather-armor': ['studded-leather-armor', 'studded-leather'],
  'yew-wand': ['wand', 'druidic-focus', 'spellcasting-focus'],
  'woodcarver-tools': ['woodcarvers-tools'],
  'woodcarvers-tools': ['woodcarvers-tools'],
  scimiliar: ['scimitar'],
}

function normalizeBaseName(value: unknown, keepParentheses: boolean): string {
  const compact = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(keepParentheses ? /$^/ : /\([^)]*\)/g, ' ')
    .replace(keepParentheses ? /[^\p{L}\p{N}&'() -]+/gu : /[^\p{L}\p{N}&' -]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return toFoundryIdentifier(compact)
}

export function normalizeFoundryLibraryName(value: unknown): string {
  const key = normalizeBaseName(value, false)
  return aliases[key] ?? key
}

export function normalizeFoundryLibraryNameKeepingParentheses(value: unknown): string {
  const key = normalizeBaseName(value, true)
  return aliases[key] ?? key
}

export function foundryLibraryAliasKeys(value: string, extraAliases: string[] = []): string[] {
  const baseKey = normalizeBaseName(value, false)
  const withParensKey = normalizeBaseName(value, true)
  return Array.from(
    new Set(
      [value, ...extraAliases]
        .flatMap((candidate) => {
          const rawBaseKey = normalizeBaseName(candidate, false)
          const rawParensKey = normalizeBaseName(candidate, true)
          return [
            normalizeFoundryLibraryName(candidate),
            normalizeFoundryLibraryNameKeepingParentheses(candidate),
            ...(alternateAliases[rawBaseKey] ?? []),
            ...(alternateAliases[rawParensKey] ?? []),
          ]
        })
        .concat(alternateAliases[baseKey] ?? [])
        .concat(alternateAliases[withParensKey] ?? [])
        .filter(Boolean),
    ),
  )
}

export function aliasesForFoundryLibraryName(value: string): string[] {
  const normalized = normalizeFoundryLibraryName(value)
  return Object.entries(aliases)
    .filter(([, target]) => target === normalized)
    .map(([source]) => source)
}
