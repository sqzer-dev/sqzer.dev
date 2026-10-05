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
    <footer>
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
    <>
      <header>
        <h1>sqzer</h1>
        <p>Drop an image, get a smaller one that looks the same. It is encoded in this tab: nothing is uploaded.</p>
      </header>

      <main>
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
        <section id="result" hidden={!hasImage} aria-label="Result">
          <Comparison />
          <ResultPanel />
        </section>
      </main>

      <Footer />
    </>
  );
}
