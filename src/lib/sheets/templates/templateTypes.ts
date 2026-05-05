import type { SheetReadMode, SheetTemplateId } from '../sheetTypes'

export type TemplateWorkbookRef = `=${string}` | string

export type TemplateFieldSpec = {
  fieldPath: string
  sources: TemplateSourceSpec[]
  required?: boolean
}

export type TemplateSourceSpec = {
  sourceType: 'namedRange' | 'cell' | 'range'
  source: TemplateWorkbookRef
  description?: string
  expectedLabels?: string[]
  requireExpectedLabels?: boolean
}

export type TemplateSheetUsage = {
  selectedSheets: string[]
  optionalSheets: string[]
  ignoredSheets: string[]
}

export type SheetTemplateDefinition = {
  id: SheetTemplateId
  readMode: SheetReadMode
  displayName: string
  workbookType: 'xlsx'
  selectedSheets: string[]
  optionalSheets?: string[]
  ignoredSheets?: string[]
}
