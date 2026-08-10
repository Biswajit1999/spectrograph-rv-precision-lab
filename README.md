# Spectrograph RV Precision Lab

Photon-limited Doppler precision, line density and instrumental resolution.

Created and maintained by Biswajit Jana.

## Scientific Purpose

This zero-build browser laboratory puts a compact reference-data bundle in front of the simulation. The app loads `data/reference.json`, renders those published anchors first, then sends the adjustable model to `physicsWorker.js` so numerical work stays off the UI thread.

## Architecture

- `index.html`: mission-control interface.
- `styles.css`: dense dark scientific dashboard.
- `app.js`: UI state, Canvas rendering and worker orchestration.
- `physicsWorker.js`: numerical model and heatmap generation.
- `data/reference.json`: small auditable reference-data bundle.
- `scripts/validate.js`: no-dependency repository validation.

## Run

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Validate

```bash
npm run check
```

The validation script checks required files, JSON reference data, worker syntax, citations and absence of unfinished scaffold tokens.

## Reference Data

Reference precision scale for stabilized optical echelle spectrographs.

## References

- Bouchy, F., Pepe, F. and Queloz, D., 2001. Fundamental photon noise limit to radial velocity measurements. Astronomy & Astrophysics, 374, pp.733-739.
- Pepe, F. et al., 2021. ESPRESSO at VLT - On-sky performance and first results. Astronomy & Astrophysics, 645, A96.

## Research Quality Upgrade

See [RESEARCH_QUALITY.md](RESEARCH_QUALITY.md) for the validation layer, reference anchors, equations and research boundaries added to this repository.
