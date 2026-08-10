# Spectrograph RV Precision Lab

Photon-limited Doppler precision, line density and instrumental resolution.

Created and maintained by Biswajit Jana.

A zero-build, browser-based research console for exploring how a precision radial-velocity
(RV) spectrograph's photon-noise limit and instrument systematic floor combine to set the
achievable Doppler measurement precision, as a function of signal-to-noise ratio (SNR),
spectral resolving power, line depth and stellar line density.

## Scientific Purpose

This lab puts a compact reference-data bundle in front of the simulation. The app loads
`data/reference.json` (precision anchors representative of HARPS/ESPRESSO-class stabilized
echelle spectrographs), renders those published anchors first, then sends the adjustable
model to `physicsWorker.js` so numerical work stays off the UI thread. The goal is a fast,
interactive feel for how spectrograph design and observing conditions trade off against each
other in the pursuit of sub-m/s radial-velocity precision — the regime needed to detect
Earth-mass exoplanets via the Doppler technique.

## Scientific Background

### The radial-velocity method

A planet orbiting a star induces a reflex wobble in the star's own motion. This wobble
periodically Doppler-shifts the star's absorption lines, which is measured as a tiny
line-of-sight velocity: fractions of a m/s for an Earth-mass planet around a Sun-like star,
versus tens of m/s for a Jupiter-mass planet. Extracting that signal from noisy stellar
spectra is fundamentally a problem of *how precisely can the centroid of a Doppler-shifted
absorption line be measured*, repeated over thousands of spectral lines and combined.

### The photon-noise limit

Bouchy, Pepe & Queloz (2001, A&A 374, 733) showed that, for a spectrum with per-pixel
signal-to-noise ratio `SNR`, the photon-noise-limited radial-velocity precision scales as

```
sigma_RV(photon) = c / (Q * SNR)
```

where `c` is the speed of light and `Q` is a dimensionless quality factor that encodes how
much Doppler information a spectrum actually carries. `Q` grows with:

- **Spectral resolving power `R`** — narrower, better-resolved lines have steeper flux
  gradients per unit velocity shift, so a given photon-noise fluctuation moves the apparent
  line centroid less.
- **Line depth** — deeper absorption lines (higher contrast against the continuum) give a
  steeper local flux gradient and therefore more leverage on the Doppler shift per photon.
- **Line density** (the number of usable spectral lines per unit wavelength, integrated
  across the instrument's wavelength coverage) — more independent lines means more
  independent centroid measurements to average over, improving the combined precision as
  roughly the square root of the number of lines.

This is exactly the photon-noise-only limit: it says nothing about calibration drift,
guiding errors, detector charge-transfer effects, telluric contamination, or stellar
activity (granulation, spots, oscillations) — all of which are addressed separately as an
**instrument/astrophysical floor**.

### The instrument systematic floor

In practice, no spectrograph reaches arbitrarily good precision just by collecting more
photons. Below some noise floor, wavelength-calibration stability (laser frequency combs or
Fabry-Pérot etalons in HARPS/ESPRESSO-class instruments), thermal and pressure control of
the spectrograph, fiber-scrambling and illumination stability, and detector systematics
dominate over photon noise. This is typically modelled as an SNR-independent term added in
quadrature to the photon-noise term:

```
sigma_RV(total) = sqrt( sigma_RV(photon)^2 + sigma_floor^2 )
```

ESPRESSO at VLT (Pepe et al. 2021, A&A 645, A96) demonstrated on-sky RV precision
approaching this regime, with photon noise dominating at moderate SNR and instrumental /
astrophysical stability terms dominating once photon noise is driven below roughly the
sub-m/s level. HARPS, HARPS-N, EXPRES and similar ultra-stable echelle spectrographs follow
the same two-term structure, differing mainly in their achieved `Q` factor (resolving power,
optical design, detector) and in how low their systematic floor sits.

### Why this matters

Detecting an Earth-twin around a Sun-like star requires isolating a ~9 cm/s reflex signal
buried in stellar noise and instrumental systematics of comparable or larger size. The two
terms above — the photon-noise limit and the instrument floor — define the two regimes an
instrument designer and an observer both have to reason about: "how many more photons do I
need" versus "what is the hard floor no amount of exposure time will get me below."

## How It Works

The lab is a static, dependency-free front end:

- `index.html` — the mission-control interface: a controls panel, a reference-data +
  simulation plot, a parameter-response heatmap, and a telemetry/metrics panel.
- `styles.css` — dense dark scientific dashboard styling.
- `app.js` — owns UI state, builds the control sliders from the `LAB` definition, loads
  `data/reference.json`, posts parameter updates to the worker, and renders both the line
  plot and the heatmap on `<canvas>` elements using vanilla Canvas 2D (no charting library).
- `physicsWorker.js` — runs the numerical model off the UI thread. On each parameter change
  it computes the RV-precision curve and a parameter-response heatmap and posts the result
  back to `app.js`.
- `data/reference.json` — a small, auditable bundle of published-style RV-precision anchor
  points (SNR vs. m/s) with source/citation metadata, plotted alongside the live model so the
  simulation can be visually sanity-checked against representative HARPS/ESPRESSO-class
  numbers.
- `scripts/validate.js` / `scripts/validate_repository.mjs` — no-dependency checks that
  required files exist, JSON reference data parses and has finite values, the worker/app
  syntax is valid, citations are present, and no unfinished scaffold markers remain.
- `research-overlay.js` — a non-invasive mission-control panel layered on top of the main UI
  that surfaces validation status and benchmark telemetry from `data/research-reference.json`.

### The model (`spectrograph` function in `physicsWorker.js`)

For an SNR sweep from 20 to 300 per pixel, the worker computes:

```js
const q = 1800 * resolution * lineDepth * Math.sqrt(lineDensity);
const sigma = Math.sqrt((c / (q * snr)) ** 2 + stability ** 2);
```

with `c` the speed of light in km/s, `resolution` the resolving power `R` in units of
100,000, `lineDepth` the mean fractional line depth, `lineDensity` a dimensionless scale on
the number of usable spectral lines, and `stability` the instrument systematic floor in m/s.
This is a direct implementation of the two-term photon-noise-plus-floor structure described
above, with the `1800 * R * depth * sqrt(density)` prefactor standing in for the empirical
`Q`-factor scaling (`Q` rises with resolving power, line contrast and the square root of the
number of independent lines, matching the Bouchy et al. 2001 derivation).

Alongside the precision curve, the worker also produces:

- `metrics.Q_factor` — the effective quality factor for the current parameters.
- `metrics.sigma_100` — the model's RV precision at SNR = 100, a standard benchmark point.
- `metrics.floor` — the current instrument floor parameter, echoed back for the telemetry panel.
- `metrics.snr_floor_crossover` — the SNR at which the photon-noise term equals the
  instrument floor (`c / (Q * stability)`), i.e. the point beyond which collecting more
  photons stops improving precision and the systematic floor dominates.
- a **parameter-response heatmap** — an illustrative 2D field (not a physical map) used to
  give the dashboard a live, information-dense visual alongside the 1D precision curve.

### Interactive controls

| Control | Meaning | Default | Range |
|---|---|---|---|
| `resolution` | Resolving power `R` / 100,000 | 1.15 | 0.4 - 2.5 |
| `lineDepth` | Mean spectral line depth | 0.45 | 0.05 - 0.85 |
| `lineDensity` | Line density scale | 1.0 | 0.2 - 2.5 |
| `stability` | Instrument floor [m/s] | 0.3 | 0.01 - 3 |

Moving any slider re-posts the parameter set to `physicsWorker.js`, which recomputes the
curve, metrics and heatmap and sends them back for redraw — the UI thread never blocks on
the numerics.

## Usage

```bash
python -m http.server 8080
```

Open `http://localhost:8080` and move the sliders to see how resolving power, line depth,
line density and instrument floor reshape the photon-noise-limited precision curve relative
to the plotted HARPS/ESPRESSO-class reference anchors.

## Validate

```bash
npm run check
npm run validate:research
```

`npm run check` verifies required files exist, `data/reference.json` parses with finite
values, `app.js` and `physicsWorker.js` have valid syntax, citations are present, and no
unfinished scaffold tokens remain. `npm run validate:research` runs the additional
research-quality checks described in [RESEARCH_QUALITY.md](RESEARCH_QUALITY.md) against
`data/research-reference.json`.

## Physics / Math Appendix

**Photon-noise RV precision (Bouchy et al. 2001):**

```
sigma_RV(photon) = c / (Q * SNR)
```

- `c` — speed of light
- `SNR` — signal-to-noise ratio per pixel (or per resolution element)
- `Q` — spectral quality factor, increasing with resolving power `R`, line contrast/depth,
  and the number of usable spectral lines (roughly `sqrt(N_lines)`)

**Combined precision with an SNR-independent instrument floor:**

```
sigma_RV(total) = sqrt( sigma_RV(photon)^2 + sigma_floor^2 )
```

This quadrature-sum structure is the standard way of combining an independent statistical
term (photon noise, which improves with more signal) and a systematic term (calibration,
thermal/mechanical stability, detector effects, stellar jitter) that does not improve with
exposure time or SNR.

**Model implementation in this repository:**

```
Q_effective = 1800 * R * lineDepth * sqrt(lineDensity)
sigma(SNR)  = sqrt( (c / (Q_effective * SNR))^2 + stability^2 )
```

where `R` is `resolution` in units of 100,000, and `stability` is the instrument floor in
m/s, directly exposed as UI controls.

## References

- Bouchy, F., Pepe, F. and Queloz, D., 2001. Fundamental photon noise limit to radial
  velocity measurements. *Astronomy & Astrophysics*, 374, pp.733-739.
- Pepe, F. et al., 2021. ESPRESSO at VLT - On-sky performance and first results.
  *Astronomy & Astrophysics*, 645, A96.
- Mayor, M. et al., 2003. Setting New Standards with HARPS. *The Messenger*, 114, pp.20-24.
- Fischer, D.A. et al., 2016. State of the Field: Extreme Precision Radial Velocities.
  *Publications of the Astronomical Society of the Pacific*, 128, 066001.
- Wilson, G. et al., 2017. Good enough practices in scientific computing. *PLOS
  Computational Biology*, 13(6), p.e1005510.

## Research Quality Upgrade

See [RESEARCH_QUALITY.md](RESEARCH_QUALITY.md) for the validation layer, reference anchors,
equations and research boundaries added to this repository.
