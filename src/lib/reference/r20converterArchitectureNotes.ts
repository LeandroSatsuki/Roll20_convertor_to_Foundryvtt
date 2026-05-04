export const r20converterArchitectureNotes = {
  source: 'https://github.com/kakaroto/R20Converter',
  license: 'GPLv3',
  usefulIdeas: [
    'Separate input parsing from Foundry output generation.',
    'Represent Foundry world/module concerns as explicit output writers.',
    'Keep entity-specific conversion logic isolated.',
    'Preserve unmapped Roll20 data as notes or fallback text.',
  ],
  nonGoalsForThisProject: [
    'Do not copy code from R20Converter.',
    'Do not target legacy Foundry/dnd5e structures as the primary schema.',
    'Do not require R20Exporter ZIP/campaign.json for the PDF MVP.',
  ],
}
