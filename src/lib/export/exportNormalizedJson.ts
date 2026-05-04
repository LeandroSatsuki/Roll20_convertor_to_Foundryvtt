import type { NormalizedCharacter } from '../normalize/normalizedCharacterTypes'

export function exportNormalizedJson(character: NormalizedCharacter): string {
  return JSON.stringify(character, null, 2)
}
