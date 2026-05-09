import type { NormalizedFeature } from '../lib/normalize/normalizedCharacterTypes'

export function unresolvedFeature(name: string, sourceType: NormalizedFeature['sourceType'], inferredKind: NonNullable<NormalizedFeature['inferredKind']>, sourceCell: string): NormalizedFeature {
  return {
    name: { value: name, confidence: 'high', raw: name },
    sourceType,
    source: 'bonfire-v2.1',
    sourceCell,
    sourceRange: sourceType === 'race' ? 'LOG!R31:R42' : sourceType === 'feat' ? 'LOG!Z31:Z42' : 'LOG!AH31:AH42',
    sourceGroup: sourceType === 'feat' ? 'feats-and-extra-features' : 'core-features',
    rawName: name,
    cleanedName: name,
    inferredKind,
    classificationReason: 'test coverage for unresolved Bonfire rule',
    description: { value: '', confidence: 'low' },
    raw: name,
  }
}
