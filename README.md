# Diving LogBook 1.4.1

Mobilní PWA aplikace pro evidenci ponorů a import dat z QR kódů SSI. Data zůstávají v prohlížeči uživatele.

## Funkce

- skenování SSI QR fotoaparátem, načtení QR z obrázku a ruční vložení textu,
- evidence, detail a lokální statistiky ponorů,
- přílohy, mapování lokalit, buddy, výstroj a poznámky,
- kompletní export a import JSON zálohy,
- export ponorů do CSV a import CSV s kontrolou chyb a duplicit,
- automatická kontrola nové verze,
- instalace jako PWA a offline cache.

## Opravy ve verzi 1.4.1

- opraveno zobrazení tlačítek CSV importu a exportu,
- `csv-import.js` a `settings-data-layout.js` se načítají přímo z `index.html`,
- Service Worker používá novou cache `diving-logbook-v1.4.1` a aktivuje se ihned,
- opraveno zobrazování čísla verze v aplikaci.

## Nasazení na GitHub Pages

1. Nahraj všechny soubory do kořene repozitáře a nahraď původní soubory.
2. V **Settings → Pages** použij **Deploy from a branch**, větev `main`, složku `/ (root)`.
3. Po dokončení deploymentu otevři aplikaci. Při prvním načtení se může stránka jednou automaticky obnovit.
4. Pokud prohlížeč stále ukazuje 1.4.0, zavři všechny otevřené karty aplikace a spusť ji znovu. V krajním případě odinstaluj PWA a nainstaluj ji znovu.

Aplikace potřebuje HTTPS pro přístup k fotoaparátu. GitHub Pages HTTPS poskytuje.

## Data a zálohy

Data jsou v `localStorage` konkrétního prohlížeče a zařízení. Pro úplnou zálohu používej **Nastavení → Exportovat JSON**. CSV je určeno pro tabulkovou práci a přenos údajů o ponorech.

## Struktura projektu

- `index.html` – obrazovky a načtení skriptů
- `styles.css` – vzhled
- `app.js` – hlavní logika a QR import
- `csv-import.js` – CSV import a export
- `settings-data-layout.js` – rozložení datových akcí
- `manifest.webmanifest` – PWA metadata
- `sw.js` – offline cache a aktualizace
- `version.json` – aktuální verze a historie změn

## Verze

**1.4.1, 11. listopadu 2026**
