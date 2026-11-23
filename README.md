## Diving LogBook v1.10.0

Verze 1.10.0 převádí hlavní databázi z omezeného `localStorage` do `IndexedDB` a zachovává kompletní mapu lokalit z verze 1.9.0.

### Změny
- hlavní data se ukládají do IndexedDB `DivingLogBookDB`, object store `appData`,
- data z klíče `divingLogBook.v1` se při prvním spuštění automaticky převedou,
- původní data se odstraní až po úspěšném zápisu a kontrolním načtení,
- JSON import je atomický: aktivní databáze se změní až po úspěšném zápisu celé zálohy,
- podporovány jsou úplné zálohy s fotografiemi licencí, pojištění a profilu,
- zachována je Mapa lokalit, shlukování značek, seznam lokalit bez souřadnic a parser SSI souřadnic.

### Bezpečný postup nasazení
1. Vytvoř aktuální úplnou JSON zálohu.
2. Ponech si předchozí zálohu verze 1.9.0.
3. Nahraj celý obsah balíčku včetně nového souboru `storage.js`.
4. Spusť aplikaci na zařízení s aktuálními daty a zkontroluj počet ponorů, lokalit, licence, pojištění a fotografie.
5. Vytvoř novou kontrolní JSON zálohu.
6. Potom importuj úplnou zálohu do webové aplikace na Macu.

### Kontrola zálohy se 406 ponory
Po importu očekávej 406 ponorů, 66 lokalit, 22 buddies, 7 profilů, 5 licencí a 1 pojištění včetně fotografií.

### Verze
- aplikace: **1.10.0**
- datum vydání: **23. 11. 2026**
