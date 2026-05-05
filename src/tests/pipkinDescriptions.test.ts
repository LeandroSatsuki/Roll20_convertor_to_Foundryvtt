import { describe, expect, it } from 'vitest'
import { loadPipkinFoundry } from './pipkinFoundryFixture'

describe('pipkinDescriptions', () => {
  it('keeps Pipkin exportable while enriching item descriptions', async () => {
    const { actor, audit } = await loadPipkinFoundry()
    const descriptions = actor.items.map((item) => String(((item.system as any).description as any)?.value ?? '').trim())

    expect(descriptions.every(Boolean)).toBe(true)
    expect(audit.summary.describedItemCount).toBe(audit.summary.itemCount)
    expect(audit.summary.missingDescriptionCount).toBe(0)
    expect(audit.summary.errorCount).toBe(0)
    expect(audit.summary.invalidIdentifierCount).toBe(0)
    expect(audit.importReadiness.canExport).toBe(true)
  })
})
