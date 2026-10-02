// The checks of `checks.js` again, inside a worker.
import { run } from "./checks.js";

run((text) => postMessage(text))
  .catch((e) => postMessage(`FAIL   worker  the checks did not run: ${e?.message ?? e}`))
  .then(() => postMessage(null));
