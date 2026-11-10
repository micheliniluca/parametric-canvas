# Parametric Canvas

Lavagna infinita per schizzi tecnici: si incollano screenshot, si disegna sopra a mano libera e si inseriscono elementi "intelligenti" con proprietà (profili in acciaio, bullonature, quote, bollini), come in un BIM leggero.

```bash
npm install
npm run dev
```

## Interfaccia

| Zona | Contenuto |
|---|---|
| Barra in alto | file (nuovo, apri, salva), annulla/ripeti, strumenti, azioni sull'oggetto selezionato, screenshot |
| Barra stili (flottante) | colore linea, riempimento, spessore, tipo linea. Senza selezione imposta lo stile dei prossimi oggetti, con selezione modifica l'oggetto |
| Pannello a destra | proprietà dell'oggetto selezionato, catalogo profili, esportazione |
| Barra di stato | SNAP / ORTO / GRIGLIA, passo griglia, coordinate, zoom, suggerimento dello strumento attivo |

## Scorciatoie

| Tasto | Azione |
|---|---|
| V | Seleziona |
| D | Mano libera (resta attiva, Esc per uscire) |
| L / P / A | Linea / Polilinea / Freccia |
| R / C | Rettangolo / Cerchio (trascina; Shift = quadrato) |
| T | Testo: clic e scrivi; doppio clic su un testo per modificarlo |
| N | Bollino numerato |
| K | Scala con due punti (clic su due punti dell'immagine, poi la misura reale) |
| Ctrl+L | Blocca / sblocca l'oggetto selezionato |
| B / Q / M | Bulloni / Quota / Misura |
| S / O / G | Attiva SNAP / ORTO / GRIGLIA |
| Ctrl (tenuto) / Shift (tenuto) | Snap / ortogonale temporanei |
| Ctrl+Z / Ctrl+Y | Annulla / Ripeti |
| Ctrl+C / Ctrl+V / Ctrl+D | Copia / Incolla (oggetti, immagini o testo; anche dal pulsante Incolla) / Duplica |
| Ctrl+S / Ctrl+O | Salva / Apri progetto (`.pcanvas.json`) |
| Ctrl+0, + / − | Adatta alla vista, zoom |
| Frecce (Shift) | Sposta di 1 (10) |
| Canc | Elimina |
| Esc | Torna alla selezione |
| Tasto centrale / trascina sfondo | Sposta la vista |

Il disegno viene salvato automaticamente nel browser (IndexedDB) e ripristinato alla riapertura.

## Struttura del codice

```
src/
  App.tsx              stato dell'app, file, appunti, scorciatoie
  Canvas.tsx           interazioni col puntatore e strumenti
  canvas/
    geometry.ts        snap, centri, ingombri, traslazione e scala (funzioni pure)
    ObjectView.tsx     disegno di ogni tipo di oggetto
    SelectionOverlay.tsx  riquadro di selezione e maniglie
    Overlays.tsx       pannelli bacchetta magica, misura, scala
    TextEditor.tsx     modifica del testo direttamente sulla tela
  Toolbar.tsx, StyleBar.tsx, StatusBar.tsx, RightPanel.tsx
  tools.ts             elenco strumenti (icona, scorciatoia, suggerimento)
  style.ts             palette e stile corrente
  hooks/useHistory.ts  annulla/ripeti
  utils/project.ts     salvataggio su file e autosalvataggio
  utils/export.ts      export SVG / DXF / STL
  profiles.ts, beamPath.ts, utils/boltUtils.ts  dati e geometria dei profili e dei bulloni
```
