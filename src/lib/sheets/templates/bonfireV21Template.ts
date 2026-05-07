import type { SheetTemplateDefinition, TemplateFieldSpec } from './templateTypes'

export const bonfireV21IgnoredSheetNames = [
  'Aventuras',
  'Mercado',
  'Bau',
  'Baú',
  'Bestiario',
  'Bestiário',
  'Additional',
  'Sheet9',
  'Attack Info',
  'Gear Info',
  'Race Info',
  'Class Info',
]

export const bonfireV21Template: SheetTemplateDefinition = {
  id: 'bonfire-v2.1',
  readMode: 'bonfire-v2.1',
  displayName: 'Bonfire v2.1',
  workbookType: 'xlsx',
  selectedSheets: ['LOG', 'Personagem', 'Magias'],
  optionalSheets: ['Personagem', 'Magias'],
  ignoredSheets: bonfireV21IgnoredSheetNames,
}

export const bonfireV21FieldSpecs: TemplateFieldSpec[] = [
  {
    fieldPath: 'identity.name',
    required: true,
    sources: [
      { sourceType: 'namedRange', source: '=name' },
      { sourceType: 'cell', source: 'LOG!C6' },
      { sourceType: 'range', source: 'LOG!C6:R7' },
    ],
  },
  {
    fieldPath: 'identity.classText',
    required: true,
    sources: [
      { sourceType: 'namedRange', source: '=classAndLevel' },
      { sourceType: 'cell', source: 'LOG!T5' },
    ],
  },
  {
    fieldPath: 'identity.player',
    required: false,
    sources: [{ sourceType: 'cell', source: 'LOG!AE5' }],
  },
  {
    fieldPath: 'identity.race',
    required: true,
    sources: [{ sourceType: 'cell', source: 'LOG!T7' }],
  },
  {
    fieldPath: 'identity.background',
    required: true,
    sources: [
      { sourceType: 'cell', source: 'LOG!H11' },
      { sourceType: 'cell', source: 'LOG!C11' },
    ],
  },
  {
    fieldPath: 'proficiencyBonus',
    required: true,
    sources: [
      { sourceType: 'namedRange', source: '=proficiencyBonus' },
      { sourceType: 'cell', source: 'LOG!H14' },
      { sourceType: 'cell', source: 'LOG!T11', expectedLabels: ['BONUS DE PROFICIENCIA', 'PROFICIENCY BONUS'], requireExpectedLabels: true },
    ],
  },
  {
    fieldPath: 'attributes.ac',
    required: true,
    sources: [
      { sourceType: 'cell', source: 'LOG!R12', expectedLabels: ['CA', 'AC', 'ARMOR CLASS', 'CLASSE DE ARMADURA'], requireExpectedLabels: true },
      { sourceType: 'cell', source: 'LOG!Q16', expectedLabels: ['CA', 'AC', 'ARMOR CLASS', 'CLASSE DE ARMADURA'], requireExpectedLabels: true },
    ],
  },
  {
    fieldPath: 'attributes.hp.max',
    required: true,
    sources: [
      { sourceType: 'cell', source: 'LOG!U16', expectedLabels: ['PV MAXIMO', 'PONTOS DE VIDA', 'HIT POINTS'], requireExpectedLabels: true },
      { sourceType: 'cell', source: 'LOG!S16', expectedLabels: ['PV MAXIMO', 'PONTOS DE VIDA', 'HIT POINTS'], requireExpectedLabels: true },
    ],
  },
  {
    fieldPath: 'attributes.speed',
    required: true,
    sources: [
      { sourceType: 'cell', source: 'LOG!Z12' },
      { sourceType: 'cell', source: 'LOG!U16' },
    ],
  },
  {
    fieldPath: 'attributes.passivePerception',
    required: false,
    sources: [
      { sourceType: 'cell', source: 'LOG!C45' },
      { sourceType: 'cell', source: 'LOG!G45' },
    ],
  },
  {
    fieldPath: 'currency.gp',
    required: false,
    sources: [
      { sourceType: 'cell', source: 'LOG!Q93', expectedLabels: ['PO', 'GP', 'OURO'], requireExpectedLabels: true },
      { sourceType: 'cell', source: 'LOG!Q94', expectedLabels: ['PO', 'GP', 'OURO'], requireExpectedLabels: true },
    ],
  },
]

export const bonfireV21AbilitySpecs = {
  str: {
    modifierSources: [{ sourceType: 'namedRange', source: '=strMod' }, { sourceType: 'cell', source: 'LOG!C13' }, { sourceType: 'cell', source: 'LOG!I17' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=strength' }, { sourceType: 'namedRange', source: '=str' }, { sourceType: 'namedRange', source: '=strScore' }, { sourceType: 'cell', source: 'LOG!C15' }, { sourceType: 'cell', source: 'LOG!K17' }],
  },
  dex: {
    modifierSources: [{ sourceType: 'namedRange', source: '=dexMod' }, { sourceType: 'cell', source: 'LOG!C18' }, { sourceType: 'cell', source: 'LOG!I18' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=dexterity' }, { sourceType: 'namedRange', source: '=dex' }, { sourceType: 'namedRange', source: '=dexScore' }, { sourceType: 'cell', source: 'LOG!C20' }, { sourceType: 'cell', source: 'LOG!K18' }],
  },
  con: {
    modifierSources: [{ sourceType: 'namedRange', source: '=conMod' }, { sourceType: 'cell', source: 'LOG!C23' }, { sourceType: 'cell', source: 'LOG!I19' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=constitution' }, { sourceType: 'namedRange', source: '=con' }, { sourceType: 'namedRange', source: '=conScore' }, { sourceType: 'cell', source: 'LOG!C25' }, { sourceType: 'cell', source: 'LOG!K19' }],
  },
  int: {
    modifierSources: [{ sourceType: 'namedRange', source: '=intMod' }, { sourceType: 'cell', source: 'LOG!C28' }, { sourceType: 'cell', source: 'LOG!I20' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=intelligence' }, { sourceType: 'namedRange', source: '=int' }, { sourceType: 'namedRange', source: '=intScore' }, { sourceType: 'cell', source: 'LOG!C30' }, { sourceType: 'cell', source: 'LOG!K20' }],
  },
  wis: {
    modifierSources: [{ sourceType: 'namedRange', source: '=wisMod' }, { sourceType: 'cell', source: 'LOG!C33' }, { sourceType: 'cell', source: 'LOG!I21' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=wisdom' }, { sourceType: 'namedRange', source: '=wis' }, { sourceType: 'namedRange', source: '=wisScore' }, { sourceType: 'cell', source: 'LOG!C35' }, { sourceType: 'cell', source: 'LOG!K21' }],
  },
  cha: {
    modifierSources: [{ sourceType: 'namedRange', source: '=chaMod' }, { sourceType: 'cell', source: 'LOG!C38' }, { sourceType: 'cell', source: 'LOG!I22' }],
    scoreSources: [{ sourceType: 'namedRange', source: '=charisma' }, { sourceType: 'namedRange', source: '=cha' }, { sourceType: 'namedRange', source: '=chaScore' }, { sourceType: 'cell', source: 'LOG!C40' }, { sourceType: 'cell', source: 'LOG!K22' }],
  },
} as const

export const bonfireV21SaveRangeSources = ['LOG!I17:I22']
export const bonfireV21SkillProficiencyRangeSources = ['LOG!H25:H42', 'LOG!H44:H61']
export const bonfireV21SkillValueRangeSources = ['LOG!I25:I42', 'LOG!I44:I61']
export const bonfireV21EquipmentRangeSources = ['LOG!J60:J85', 'LOG!P86:P92']
export const bonfireV21FeatureRangeSources = ['LOG!R31:R42', 'LOG!Z31:Z42', 'LOG!AH31:AH42', 'LOG!R45:R56', 'LOG!Z45:Z56', 'LOG!AH45:AH56']

export const bonfireV21SpellRanges = {
  cantrips: ['Magias!M10:M14', 'Magias!W10:W14', 'Magias!AG10:AG14'],
  spell1: ['Magias!C20:C49'],
  spell2: ['Magias!R20:R49'],
  spell3: ['Magias!AG20:AG49'],
  spell4: ['Magias!C56:C85'],
  spell5: ['Magias!R56:R85'],
  spell6: ['Magias!AG56:AG85'],
  spell7: ['Magias!C92:C109'],
  spell8: ['Magias!R92:R109'],
  spell9: ['Magias!AG92:AG109'],
} as const
