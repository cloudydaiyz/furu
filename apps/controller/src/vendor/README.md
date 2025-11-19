## Playwright Vendor

This directory contains modules sourced directly from the [Node.js](https://github.com/nodejs/node) and [Playwright](https://github.com/microsoft/playwright) projects. These files have been vendored to support local modifications and ensure compatibility with our custom runtime environment.

Source References
- `node/await.js`: https://github.com/nodejs/node/blob/b5c9469d997f963fa87b2ebd2debdadc59094611/lib/internal/repl/await.js
- `node/primordials.js`: https://github.com/nodejs/node/blob/b5c9469d997f963fa87b2ebd2debdadc59094611/lib/internal/per_context/primordials.js
- `playwright/injected/src`: https://github.com/microsoft/playwright/tree/3089df7944029f8a09b4f3dd72de8a585cad148f/packages/injected/src
- `playwright/isomorphic`: https://github.com/microsoft/playwright/tree/3089df7944029f8a09b4f3dd72de8a585cad148f/packages/playwright-core/src/utils/isomorphic
- `playwright/protocol`: https://github.com/microsoft/playwright/tree/3089df7944029f8a09b4f3dd72de8a585cad148f/packages/protocol/src
- `playwright/recorder`: https://github.com/microsoft/playwright/tree/3089df7944029f8a09b4f3dd72de8a585cad148f/packages/recorder

Huge thanks to the Node.js and Playwright teams and its contributors for their outstanding open-source work! ❤️