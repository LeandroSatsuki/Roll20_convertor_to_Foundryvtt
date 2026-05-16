import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '..', '..')

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8')) as T
}

function readText(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

describe('missingSourcePlanQualityGate', () => {
  it('classifies present sources, true missing sources, and structural noise correctly', () => {
    const report = readJson<{
      summary: Record<string, number>
      entries: Array<{
        currentSourceFile: string | null
        classification: string
        nextAction: string
        affectedRulesCount: number
        affectedRules: Array<{ name: string }>
      }>
    }>('data/bonfire/review/missing-source-plan-quality-report.json')

    expect(report.summary.totalEntries).toBe(report.entries.length)

    const parserFixEntry = report.entries.find((entry) =>
      entry.currentSourceFile && entry.classification === 'source-present-needs-parser-fix')
    expect(parserFixEntry).toBeTruthy()
    expect(parserFixEntry?.nextAction).not.toBe('save-html')

    const noiseEntry = report.entries.find((entry) => entry.classification === 'structural-noise-ignore')
    expect(noiseEntry).toBeTruthy()
    expect(noiseEntry?.affectedRules.some((rule) =>
      ['Development', 'EVENTS', 'Our Shop', 'REACHING OUT', 'Resources', 'WHO WE ARE'].includes(rule.name))).toBe(true)

    for (const entry of report.entries.filter((entry) => entry.classification === 'source-missing-user-action-required')) {
      expect(entry.currentSourceFile).toBeFalsy()
      expect(entry.nextAction).toBe('save-html')
      expect(entry.affectedRulesCount).toBe(entry.affectedRules.length)
    }
  })

  it('renders actionable markdown sections for user action, parser fixes, manual review, and ignored noise', () => {
    const markdown = readText('docs/bonfire-missing-source-acquisition-plan.md')
    expect(markdown).toContain('## Ação do usuário: salvar HTML faltante')
    expect(markdown).toContain('## Ação técnica: parser precisa ler melhor HTML já existente')
    expect(markdown).toContain('## Revisão manual: seções ambíguas')
    expect(markdown).toContain('## Ignorados como ruído estrutural')
  })
})
