import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('projectCleanliness', () => {
  it('keeps the repository root free of character-specific exports and local vite logs', () => {
    const rootFiles = readdirSync(repoRoot)

    const forbiddenPatterns = [
      /^Pipkin-.*\.json$/i,
      /^Nanna-.*\.json$/i,
      /^Johnny-.*\.json$/i,
      /^Laplace-.*\.json$/i,
      /^pipeline-diagnostic.*\.json$/i,
      /^vite.*\.log$/i,
      /^\.vite.*\.log$/i,
    ]

    const offenders = rootFiles.filter((name) => forbiddenPatterns.some((pattern) => pattern.test(name)))
    expect(offenders).toEqual([])
  })

  it('keeps primary test filenames generic instead of character-specific', () => {
    const testFiles = readdirSync(path.join(repoRoot, 'src', 'tests'))
    const offenders = testFiles.filter((name) => /(Pipkin|Nanna|Johnny|Laplace)/i.test(name))
    expect(offenders).toEqual([])
  })

  it('keeps debug-only controls out of the main product labels', () => {
    const html = renderToStaticMarkup(createElement(App))

    expect(html).toContain('Avançado / Debug')
    expect(html).not.toContain('Rodar diagnóstico Pipkin')
    expect(html).not.toContain('PDF fallback')
    expect(html).not.toContain('Roll20 PDF Conversion Notes')
    expect(html).toContain('Baixar Foundry Actor JSON')
    expect(html).toContain('Baixar Audit Report')
    expect(html).toContain('Baixar Normalized Character JSON — DEBUG, NÃO IMPORTAR')
    expect(html).toContain('Baixar Diagnostic Package — DEBUG AVANÇADO')
  })

  it('keeps generic class fixtures available for Bonfire archetype coverage', () => {
    const classesDir = path.join(repoRoot, 'tests', 'fixtures', 'characters', 'classes')

    expect(existsSync(classesDir)).toBe(true)
    expect(existsSync(path.join(classesDir, 'clerigo-level5.bonfire.xlsx'))).toBe(true)
  })
})
