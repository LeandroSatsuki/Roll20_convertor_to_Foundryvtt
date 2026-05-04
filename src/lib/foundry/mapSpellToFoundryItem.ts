import type { NormalizedSpell } from '../character/normalizedCharacterTypes'
import type { FoundryItem } from './foundryTypes'
import { foundryId } from './ids'
import { toFoundryIdentifier } from './identifiers'
import { itemStats } from './mapWeapons'
import { resolveRuleName } from '../rules/resolution/featureResolutionPipeline'

export function mapSpellToFoundryItem(spell: NormalizedSpell): FoundryItem {
  const resolution = resolveRuleName(spell.name.value, { section: 'spell' })
  return {
    _id: foundryId(),
    name: spell.name.value,
    type: 'spell',
    img: 'icons/svg/book.svg',
    system: {
      identifier: toFoundryIdentifier(spell.name.value, 'spell'),
      description: { value: `<p>${spell.raw}</p>`, chat: '' },
      level: spell.level,
      activities: {},
    },
    effects: [],
    folder: null,
    flags: {
      'roll20-to-foundry': {
        source: 'sheet',
        confidence: spell.name.confidence,
        raw: spell.raw,
        ruleResolution: {
          rawName: spell.name.value,
          resolvedName: resolution.resolvedName,
          kind: resolution.kind,
          confidence: resolution.confidence,
          score: resolution.score,
          ruleId: resolution.ruleId,
          sourceUrl: resolution.sourceUrl,
          candidates: resolution.candidates.slice(0, 5).map((candidate) => ({
            ruleId: candidate.entity.id,
            name: candidate.entity.name,
            kind: candidate.entity.kind,
            score: candidate.score,
            confidence: candidate.confidence,
          })),
          manuallyResolved: false,
        },
      },
    },
    _stats: itemStats(),
  }
}
