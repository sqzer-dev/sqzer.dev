import { useRef } from 'react';

import { optionsOf } from '../lib/options-of';
import { useSearch, useSearchRef } from '../model/context';
import { pick } from '../model/picked';
import { Comparison } from './comparison';
import { ControlPanel } from './control-panel';
import { DropZone } from './drop-zone';
import { ResultPanel } from './result-panel';
import { SearchStatus } from './search-status';

function Footer() {
  const version = useSearch((snapshot) => snapshot.context.version);

  return (
    <footer className="mt-auto text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground">
      <p>
        <a href="https://github.com/sqzer-dev/sqzer">sqzer</a> as a command line and a Rust library,{' '}
        <a href="https://www.npmjs.com/package/sqzer">
          <code>sqzer</code> on npm
        </a>
        {version !== null && ` ${version}`}, <a href="https://github.com/sqzer-dev/sqzer.dev">this page</a>,{' '}
        <a href="licenses.txt">the licences of what it carries</a>. No analytics, no error reporting.
      </p>
    </footer>
  );
}

// How long the controls rest before a search starts with what they say.
const TYPING_MS = 250;

export function CompressPage() {
  const search = useSearchRef();
  const hasImage = useSearch((snapshot) => snapshot.context.image !== null);
  const form = useRef<HTMLFormElement>(null);

  // What the controls say now. They are read when a search starts, not kept in step with it.
  const options = () => (form.current ? optionsOf(form.current, search.getSnapshot().context.codecs) : {});

  const resting = useRef(0);
  const settle = () => {
    clearTimeout(resting.current);
  };

  // A picked image starts its search with what the controls say at that moment. A change still at
  // rest has nothing left to report then, and reporting it would end the worker for no reason.
  const take = async (file: File) => {
    settle();
    const image = await pick(file);
    settle();
    search.send({ type: 'picked', image, options: options() });
  };

  const moved = () => {
    settle();
    resting.current = window.setTimeout(() => {
      search.send({ type: 'options', options: options() });
    }, TYPING_MS);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">sqzer</h1>
        <p className="text-sm text-muted-foreground">
          Drop an image, get a smaller one that looks the same. It is encoded in this tab: nothing is uploaded.
        </p>
      </header>

      <main className="flex flex-col gap-4">
        <DropZone
          onPick={(file) => {
            void take(file);
          }}
        />
        <ControlPanel ref={form} onChange={moved} />
        <SearchStatus />
        <section className="flex flex-col gap-4" hidden={!hasImage} aria-label="Result">
          <Comparison />
          <ResultPanel />
        </section>
      </main>

      <Footer />
    </div>
  );
}
