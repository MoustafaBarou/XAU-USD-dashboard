# AURUM — schone repo uploaden naar GitHub

Je vorige repo had de bestanden los in de root staan. Deze map heeft de JUISTE
structuur. Volg één van onderstaande methodes.

## STRUCTUUR (zo hoort het)
```
AURUM/
├── .github/workflows/deploy.yml
├── public/            (logo + favicons)
├── src/
│   ├── App.tsx  main.tsx  index.css  nav.ts
│   ├── components/   pages/   data/   feed/   hooks/
├── index.html  package.json  vite.config.ts  tailwind.config.js  ...
```
Belangrijk: alle .tsx/.ts horen IN src/ (en submappen), NIET in de root.

────────────────────────────────────────────────────────

## METHODE A — GitHub Desktop (aanbevolen, geen mappen-gedoe)
1. Maak op github.com een NIEUWE lege repo, bv. "AURUM" (zonder README).
2. Installeer GitHub Desktop (gratis) en log in.
3. File → Clone repository → kies je nieuwe lege AURUM repo → Clone.
4. Open de gekloonde map in Verkenner/Finder.
5. Kopieer ALLE inhoud van DEZE map (inclusief de mappen .github, public, src
   en alle losse config-bestanden) erin.
6. Terug in GitHub Desktop: typ een commit-bericht ("initial commit") →
   "Commit to main" → "Push origin".
Klaar. De mappenstructuur blijft automatisch behouden.

## METHODE B — Git via terminal
```bash
# maak eerst een lege repo op github.com aan, kopieer de URL
git init
git add -A
git commit -m "AURUM initial commit"
git branch -M main
git remote add origin https://github.com/<jouw-naam>/AURUM.git
git push -u origin main
```

## METHODE C — GitHub website (alleen als je geen Git hebt)
De webupload behoudt mappen ALS je hele mappen sleept, niet losse bestanden.
1. Nieuwe lege repo op github.com.
2. "uploading an existing file".
3. Sleep de MAPPEN (.github, public, src) en daarna de losse config-bestanden
   in het uploadvak. Sleep src als MAP, niet de losse .tsx-bestanden.
4. Commit.

────────────────────────────────────────────────────────

## GitHub Pages aanzetten
Settings → Pages → Build and deployment → Source: kies "GitHub Actions".
Daarna bij elke push automatisch live op:
https://<jouw-naam>.github.io/AURUM/

## Lokaal draaien
npm install
npm run dev
