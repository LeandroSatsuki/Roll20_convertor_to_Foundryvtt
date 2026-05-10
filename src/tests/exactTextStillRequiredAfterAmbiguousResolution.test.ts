import { describe, expect, it } from 'vitest'
import { buildRuleDescriptionMeta } from '../lib/foundry/items/ruleDescription'
import { getBonfireRuleEntity } from '../lib/rules/store/bonfireRuleStore'

describe('exactTextStillRequiredAfterAmbiguousResolution', () => {
  it('keeps exact-text Bonfire cases exact and leaves preview-like unresolved rules as placeholders', () => {
    const transe = getBonfireRuleEntity('elfo-da-lua-transe-elfico')
    const unresolved = getBonfireRuleEntity('paladino-segredos-misticos-de-9o-nivel-l17')
      ?? getBonfireRuleEntity('segredos-misticos-de-9o-nivel')

    expect(transe?.descriptionStatus).toBe('complete')
    expect(transe?.descriptionText).toContain('Elfos não precisam dormir.')

    if (unresolved) {
      const meta = buildRuleDescriptionMeta({
        itemName: unresolved.name,
        itemKind: unresolved.kind,
        ruleId: unresolved.id,
        sourceUrl: unresolved.sourceUrl,
      })
      expect(meta.html).toContain('Descricao Bonfire nao encontrada, CORRIGIR!')
    }
  })
})
