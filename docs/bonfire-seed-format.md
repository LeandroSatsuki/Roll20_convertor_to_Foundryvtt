# Bonfire Seed Format

Cada seed deve representar uma entidade pequena e revisavel.

Campos principais:

- `id`: identificador estavel do seed.
- `identifier`: slug Foundry-safe, apenas `a-z`, `0-9`, `_` e `-`.
- `name`: nome exibido, pode conter acentos.
- `aliases`: nomes alternativos em portugues ou ingles.
- `kind`: `class`, `subclass`, `race`, `essence`, `background`, `feat`, `originFeat`, `racialFeat`, `classFeature`, `subclassFeature`, `raceFeature`, `backgroundFeature`, `weapon`, `armor`, `equipment`, `consumable`, `spell` ou `spellOverride`.
- `sourceUrl`: URL de referencia.
- `description` ou `shortDescription`: resumo curto, sem copiar texto integral protegido.
- `foundry`: dicas de exportacao, como item type, ativacao, dano e usos.

O seed pode ser incompleto. Quando um campo nao existir, o conversor deve exportar algo seguro e criar warning de revisao.

