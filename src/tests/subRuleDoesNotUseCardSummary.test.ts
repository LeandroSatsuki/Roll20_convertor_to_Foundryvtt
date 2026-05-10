import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('subRuleDoesNotUseCardSummary', () => {
  it('keeps extracted subrules on inline body sources instead of card summaries', () => {
    const raceFeatures = readJson<Array<Record<string, unknown>>>('data/bonfire/generated/race-features.seed.json')
    const predadorAgil = raceFeatures.find((entry) => entry.name === 'Predador Ágil')

    expect(predadorAgil).toBeTruthy()
    expect(predadorAgil?.descriptionStatus).toBe('complete')
    expect(predadorAgil?.descriptionSource).toBe('inline-bold-subrule')
    expect(predadorAgil?.shortDescription).not.toBe('Os Folken Limalumes demonstram raciocínio vivo, imaginação rápida e capacidade de conectar ideias improváveis.')
  })
})

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}
