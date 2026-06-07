# Digimon Evolution Tree

Progetto statico per GitHub Pages + scraper locale una-tantum da Wikimon.

## Avvio rapido Windows

1. Installa Node.js 18 o superiore.
2. Estrai lo ZIP.
3. Fai doppio click su:

```text
AVVIA_DIGIMON_TREE.cmd
```

Il comando:

- installa le dipendenze se mancano;
- legge `data/digimon.xlsx`;
- visita Wikimon una sola volta per Digimon, con cache locale;
- usa 4 richieste in parallelo;
- genera `data/digimon_enriched.xlsx`;
- genera `data/digimon_graph.json`;
- apre il sito in locale su `http://localhost:8080`.

## Modifiche incluse in questa versione

- Scraping evoluzioni con parallelismo 4.
- In ogni riga `li` di `Evolves_From` / `Evolves_To`, se sono presenti più Digimon, viene preso solo il primo match valido e poi la riga viene ignorata per gli altri match.
- Interfaccia con immagine grande del Digimon selezionato, centrata su sfondo nero, alta almeno il 30% della pagina.
- Nelle card From/To:
  - click sul nome = apre Wikimon in nuova scheda;
  - click sull'immagine = seleziona quel Digimon.
- Impostazioni salvate nel browser:
  - dimensione immagine principale;
  - visualizzazione From/To in griglia, carosello o tabella;
  - tema chiaro/scuro.
- Minigame:
  - randomizza start/end solo se esiste un percorso calcolabile;
  - seleziona automaticamente lo start;
  - mostra immagine start a sinistra e immagine end a destra;
  - conta i salti dell'utente;
  - mostra confetti quando raggiungi l'end.

## File principali

```text
data/digimon.xlsx              Excel di partenza
data/digimon_enriched.xlsx     Excel generato con from/to IDs
data/digimon_graph.json        Dati usati dal sito
scripts/enrich-evolutions.js   Scraper Wikimon
index.html                     Sito statico
app.js                         Logica UI + minigame
style.css                      Stili
```

## Pubblicazione su GitHub Pages

Dopo aver generato `data/digimon_graph.json`, puoi caricare su GitHub Pages:

```text
index.html
app.js
style.css
data/digimon_graph.json
```

Non serve caricare `node_modules`.
