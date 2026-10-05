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

export function CompressPage() {
  const search = useSearchRef();
  const hasImage = useSearch((snapshot) => snapshot.context.image !== null);
  const form = useRef<HTMLFormElement>(null);

  // What the controls say now. They are read when a search starts, not kept in step with it.
  const options = () => (form.current ? optionsOf(form.current, search.getSnapshot().context.codecs) : {});

  const take = async (file: File) => {
    search.send({ type: 'picked', image: await pick(file), options: options() });
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
        <ControlPanel
          ref={form}
          onChange={() => {
            search.send({ type: 'options', options: options() });
          }}
        />
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
