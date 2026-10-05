import { useSearch } from '../model/context';

/**
 * The privacy line and where the page comes from. It is said in both states (ADR-0001 D7):
 * at the bottom edge of the empty page, and behind a button once the image is the page.
 */
export function About() {
  const version = useSearch((snapshot) => snapshot.context.version);

  return (
    <div className="flex flex-col gap-1 text-xs/relaxed text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground">
      <p>The image is encoded in this tab, and nothing is sent anywhere. No analytics, no error reporting.</p>
      <p>
        <a href="https://github.com/sqzer-dev/sqzer">sqzer</a> as a command line and a Rust library,{' '}
        <a href="https://www.npmjs.com/package/sqzer">
          <code>sqzer</code> on npm
        </a>
        {version !== null && ` ${version}`}, <a href="https://github.com/sqzer-dev/sqzer.dev">this page</a>,{' '}
        <a href="licenses.txt">the licences of what it carries</a>.
      </p>
    </div>
  );
}
