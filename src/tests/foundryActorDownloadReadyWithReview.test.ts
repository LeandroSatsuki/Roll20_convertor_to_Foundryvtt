import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DownloadButtons } from '../components/DownloadButtons'
import { buildBonfireBundle } from './bonfireBundleFixture'
import { unresolvedFeature } from './unresolvedBonfireTestUtils'

describe('Foundry Actor download with review issues', () => {
  it('keeps the Actor JSON download enabled when the audit is ready-with-review', async () => {
    const { bundle } = await buildBonfireBundle({}, (character) => {
      character.features.push(unresolvedFeature('Pendência Exportável', 'class', 'classFeature', 'R34'))
    })

    const html = renderToStaticMarkup(
      createElement(DownloadButtons, {
        normalized: bundle.normalized,
        actor: bundle.actor,
        auditReport: bundle.audit,
        debug: bundle.debug,
        actorExportBlocked: !bundle.audit.importReadiness.canExport,
      }),
    )

    expect(bundle.audit.importReadiness.status).toBe('ready-with-review')
    expect(html).toContain('Baixar Foundry Actor JSON')
    expect(html).not.toContain('disabled=""')
    expect(html).not.toContain('Baixar Normalized Character JSON — DEBUG, NÃO IMPORTAR</button><button type="button" disabled')
  })
})
