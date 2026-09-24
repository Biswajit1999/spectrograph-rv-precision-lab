# Research quality contract

Version 2 treats research quality as a chain of inspectable evidence rather
than a visual label.

1. The question, grid, estimand, threshold, and boundary are frozen in
   `research/protocol.json`.
2. `src/rv-model.js` contains the same numerical implementation used by the
   browser and the offline study.
3. `npm run research` emits every scenario, a summary, and two SVG figures.
4. The test suite checks physical scaling, convolution, units, parameter
   rejection, and equivalence of the direct Fisher and quality-factor forms.
5. Repository validation binds the result to SHA-256 receipts for the protocol
   and model, checks numerical convergence, and rejects incomplete evidence.
6. `docs/CLAIMS.md` separates reproduced results from contextual literature
   statements and prohibited interpretations.

The maturity rubric is stored in `research/maturity-rubric.json`. Its 41→95
comparison is a repository-practice audit, not peer review.
