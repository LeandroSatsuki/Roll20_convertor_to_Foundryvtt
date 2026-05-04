# Bonfire Rule Store

O Rule Store e uma base local de regras Bonfire usada pelo conversor para funcionar offline. A fonte principal de curadoria e o World Anvil do Bonfire Tales, especialmente a categoria de jogadores:

https://www.worldanvil.com/w/bonfire-tales-rpg-bonfire-tales/c/jogadores-category

O app nao faz scraping em runtime. Regras novas devem entrar como seeds revisados ou overrides locais.

Tipos de seed:

- Seed local do projeto: arquivos em `data/bonfire` e seeds TypeScript em `src/lib/rules/bonfireSeedRules.ts`.
- Seed manual: dados resumidos importados por revisao humana a partir de artigos World Anvil.
- Override local: escolhas feitas pelo usuario para resolver nomes ambíguos, baixadas como `user-overrides.local.json`.

As entidades sao indexadas por identifier, nome normalizado, aliases, kind, classe, subclasse, raca, nivel, tags e URL de fonte.

