import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SheetImportPanel } from '../components/SheetImportPanel'

describe('pipkinDiagnosticDevOnly', () => {
  it('does not expose the Pipkin diagnostic action in the main sheet import UI', () => {
    const html = renderToStaticMarkup(createElement(SheetImportPanel, { onImported: () => undefined, onStatus: () => undefined }))
    expect(html).not.toContain('Rodar diagnostico Pipkin')
  })
})
