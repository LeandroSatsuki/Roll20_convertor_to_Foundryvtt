import { describe, expect, it } from 'vitest'
import { buildGenericItem, getItemAutomationMeta } from '../lib/foundry/items'

describe('invalid activities are rejected', () => {
  it('never keeps an invalid activity in the exported item JSON', () => {
    const item = buildGenericItem({
      name: 'Broken Activity Item',
      type: 'feat',
      img: 'icons/svg/item-bag.svg',
      identifier: 'broken-activity-item',
      description: 'Temporary test item.',
      sourceBook: 'Test Suite',
      converterFlags: {
        source: 'test',
        confidence: 'high',
        ruleResolution: {
          rawName: 'Broken Activity Item',
          resolvedName: 'Broken Activity Item',
          kind: 'feat',
          confidence: 'high',
          score: 100,
          candidates: [],
          manuallyResolved: false,
        },
      },
      automation: {
        requestedLevel: 'full',
        activities: [{ _id: 'broken', type: 'attack', name: 'Broken Attack' } as any],
      },
    })

    expect(Object.values((item.system.activities as Record<string, unknown>) ?? {})).toHaveLength(0)
    expect(getItemAutomationMeta(item)?.invalidActivitiesCount).toBe(1)
    expect(getItemAutomationMeta(item)?.level).toBe('partial')
  })
})
