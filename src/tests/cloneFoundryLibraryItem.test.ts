import { describe, expect, it } from 'vitest'
import { cloneFoundryLibraryItem } from '../lib/foundry-library/cloneFoundryLibraryItem'
import { matchFoundryLibraryItem } from '../lib/foundry-library/foundryLibraryMatcher'
import { loadMegaLibraryFixture } from './foundryMegaLibraryFixture'

describe('cloneFoundryLibraryItem', () => {
  it('clones a library item safely while preserving Foundry mechanics', () => {
    const library = loadMegaLibraryFixture()
    const match = matchFoundryLibraryItem(library, { requestedName: 'Healing Word', requestedType: 'spell', spellLevel: 1 })
    const original = match.best?.entry
    const cloned = cloneFoundryLibraryItem(match, 'Healing Word', 'spell')
    const meta = (cloned.flags['roll20-to-foundry'] as Record<string, unknown>).hydration as Record<string, unknown>

    expect(cloned._id).not.toBe(original?.itemId)
    expect(cloned.name).toBe(original?.name)
    expect(cloned.type).toBe(original?.type)
    expect(Object.keys((cloned.system.activities as Record<string, unknown>) ?? {}).length).toBeGreaterThan(0)
    expect(cloned.flags.plutonium).toBeTruthy()
    expect((cloned as any).folder).toBeUndefined()
    expect((cloned as any).ownership).toBeUndefined()
    expect((cloned as any).permission).toBeUndefined()
    expect(JSON.stringify(cloned)).not.toContain('undefined')
    expect(meta.hydrated).toBe(true)
  })
})
