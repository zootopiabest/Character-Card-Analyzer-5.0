# jsonrepair 3.15.0

Vendored regular ESM implementation from the npm `jsonrepair@3.15.0` package
(https://github.com/josdejong/jsonrepair), ISC licensed; see LICENSE.md.
Only the regular parser and its two utility modules are included. Relative
imports carry the Analyzer's version query for consistent offline caching;
unavailable source-map references are removed. No CDN, npm install, or build
step is needed at runtime. Use through model-output.js, which rejects open-ended
responses and validates against the schema for the actual request.
