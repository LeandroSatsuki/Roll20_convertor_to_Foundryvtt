# Known Limitations

- PDFs visuais podem gerar texto fora de ordem, duplicado ou truncado.
- OCR ainda não está implementado.
- O parser inicial é calibrado para o layout do PDF de exemplo.
- Alguns Items são exportados sem activities completas.
- Compatibilidade inicial mira Foundry core 13.351 e dnd5e 5.2.4.
- R20Exporter não é requisito do MVP.
- R20Converter não é dependência e não tem código copiado.
- Dados ausentes não são inventados; campos incertos recebem confidence baixo/médio e warnings.
- Actor export is blocked if any Item has an invalid `system.identifier`; use `fix-foundry-identifiers.mjs` for already-generated JSON files.
