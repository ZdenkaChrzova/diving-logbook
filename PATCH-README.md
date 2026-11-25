# Diving LogBook 1.11.0a-dev1

Kompletní patch nad stabilní verzí 1.10.4c.

## Obsah
- číselník Země
- číselník Servisní intervaly
- počty použití
- filtry Aktivní / Skryté / Vše
- kontrola duplicit při přidání i přejmenování

## Záměrně bez
- slučování a mazání položek číselníků
- SSI katalogů
- migrace historických dat

## Instalace
Nahraď soubory v aplikaci soubory z tohoto balíčku. Před nasazením vytvoř JSON zálohu. Po nasazení zavři všechna okna PWA a spusť aplikaci znovu, aby se aktivoval nový service worker a cache `diving-logbook-v1.11.0a-dev1`.
