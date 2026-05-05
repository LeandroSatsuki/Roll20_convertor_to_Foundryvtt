import { parseA1Address } from '../lib/sheets/templates/cellRange'
import { createWorkbookData } from './sheetTestWorkbook'

type WorkbookOverride = {
  sheetName: string
  address: string
  value: string
}

type BonfireWorkbookOptions = {
  includeMagias?: boolean
  includeAuxiliary?: boolean
  overrides?: WorkbookOverride[]
  namedRanges?: Array<{ name: string; ref: string; sheetIndex?: number }>
}

export function createBonfireV21Workbook(options: BonfireWorkbookOptions = {}): Uint8Array {
  const logRows = createGrid(120, 40)
  setA1(logRows, 'C6', 'Pipkin "Sorte Grande"')
  setA1(logRows, 'T5', 'Clérigo 5')
  setA1(logRows, 'T7', 'Folken')
  setA1(logRows, 'H11', 'Espião')
  setA1(logRows, 'H14', '+3')
  setA1(logRows, 'S11', 'BONUS DE PROFICIENCIA')
  setA1(logRows, 'T11', '+3')
  setA1(logRows, 'P16', 'CA')
  setA1(logRows, 'Q16', '18')
  setA1(logRows, 'R16', 'PV MAXIMO')
  setA1(logRows, 'S16', '33')
  setA1(logRows, 'T16', 'VELOCIDADE')
  setA1(logRows, 'U16', '25')
  setA1(logRows, 'Z12', '25 ft')
  setA1(logRows, 'C45', '14')
  setA1(logRows, 'F45', 'PERCEPCAO PASSIVA')
  setA1(logRows, 'G45', '14')

  const abilityRows = [
    ['C13', '-1', 'C15', '8', 'I17', '-1', 'K17', '8'],
    ['C18', '+2', 'C20', '14', 'I18', '+2', 'K18', '14'],
    ['C23', '+1', 'C25', '12', 'I19', '+1', 'K19', '12'],
    ['C28', '+0', 'C30', '10', 'I20', '+0', 'K20', '10'],
    ['C33', '+4', 'C35', '18', 'I21', '+4', 'K21', '18'],
    ['C38', '+2', 'C40', '14', 'I22', '+2', 'K22', '14'],
  ]
  for (const [modAddressPrimary, modValuePrimary, scoreAddressPrimary, scoreValuePrimary, modAddressLegacy, modValueLegacy, scoreAddressLegacy, scoreValueLegacy] of abilityRows) {
    setA1(logRows, modAddressPrimary, modValuePrimary)
    setA1(logRows, scoreAddressPrimary, scoreValuePrimary)
    setA1(logRows, modAddressLegacy, modValueLegacy)
    setA1(logRows, scoreAddressLegacy, scoreValueLegacy)
  }

  const skillLabels = [
    'Acrobacia',
    'Lidar com Animais',
    'Arcana',
    'Atletismo',
    'Enganacao',
    'Historia',
    'Intuicao',
    'Intimidacao',
    'Investigacao',
    'Medicina',
    'Natureza',
    'Percepcao',
    'Atuacao',
    'Persuasao',
    'Religiao',
    'Prestidigitacao',
    'Furtividade',
    'Sobrevivencia',
  ]
  const skillValues = ['2', '4', '0', '-1', '2', '0', '7', '2', '0', '4', '0', '4', '2', '5', '0', '5', '6', '7']
  skillLabels.forEach((label, index) => {
    setA1(logRows, `H${25 + index}`, label)
    setA1(logRows, `I${25 + index}`, skillValues[index] ?? '0')
    setA1(logRows, `H${44 + index}`, label)
    setA1(logRows, `I${44 + index}`, skillValues[index] ?? '0')
  })

  const equipment = ['Scale Mail', 'Shield', 'Potion of Healing', 'Shortbow', "Explorer's Pack", 'Holy Symbol', 'Água Benta']
  equipment.forEach((item, index) => setA1(logRows, `P${86 + index}`, item))

  const personagemRows = createGrid(20, 10)
  setA1(personagemRows, 'A1', 'Personagem')

  const sheets: Array<{ name: string; rows: string[][] }> = [
    { name: 'LOG', rows: logRows },
    { name: 'Personagem', rows: personagemRows },
  ]

  if (options.includeMagias) {
    const magiasRows = createGrid(120, 35)
    setA1(magiasRows, 'M10', 'Thaumaturgy')
    setA1(magiasRows, 'W10', 'Guidance')
    setA1(magiasRows, 'AG10', 'Sacred Flame')
    setA1(magiasRows, 'C20', 'Bless')
    setA1(magiasRows, 'C21', 'Cure Wounds')
    setA1(magiasRows, 'R20', 'Aid')
    setA1(magiasRows, 'AG20', 'Spirit Guardians')
    sheets.push({ name: 'Magias', rows: magiasRows })
  }

  if (options.includeAuxiliary) {
    sheets.push({
      name: 'Attack Info',
      rows: [['Artífice', 'Associated Skills', 'bludgeoning', 'piercing']],
    })
    sheets.push({
      name: 'Gear Info',
      rows: [['ITEM', 'CUSTO', 'PESO']],
    })
    sheets.push({
      name: 'Race Info',
      rows: [['Artífice']],
    })
    sheets.push({
      name: 'Class Info',
      rows: [['Associated Skills']],
    })
  }

  for (const override of options.overrides ?? []) {
    const sheet = sheets.find((candidate) => candidate.name === override.sheetName)
    if (!sheet) continue
    setA1(sheet.rows, override.address, override.value)
  }

  return createWorkbookData(sheets, { namedRanges: options.namedRanges })
}

function createGrid(rowCount: number, colCount: number): string[][] {
  return Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ''))
}

function setA1(rows: string[][], address: string, value: string) {
  const parsed = parseA1Address(address)
  if (!parsed) throw new Error(`Invalid A1 address: ${address}`)
  rows[parsed.row] ??= []
  rows[parsed.row][parsed.col] = value
}
