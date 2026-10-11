import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';

import { useSearch } from '../model/context';

// The policy the page is served with, as the build wrote it into `index.html` (ADR-0002 D3). The
// development server leaves it out, and the note says so then.
const POLICY = document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')?.content ?? null;

/**
 * The privacy claim, and the way to check it (ADR-0001 D7): the note quotes the policy the browser
 * enforces, which names no origin but the page's own, and says where to watch the requests. The
 * page claims no more than the policy enforces.
 */
function TrustNote() {
  return (
    <Collapsible className="flex flex-col gap-1">
      <p>
        The image is encoded in this tab, and nothing is sent anywhere. No analytics, no error reporting.{' '}
        <CollapsibleTrigger className="rounded-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          Don&apos;t trust us?
        </CollapsibleTrigger>
      </p>
      <CollapsibleContent className="mx-auto flex w-full max-w-3xl flex-col gap-2 py-1 text-left">
        {POLICY === null ? (
          <p>
            This copy of the page carries no <code>Content-Security-Policy</code>: the development server leaves it out,
            and the build writes it in.
          </p>
        ) : (
          <>
            <p>
              The page is served with this <code>Content-Security-Policy</code>, which the browser enforces. Nothing in
              it names another origin: the page can load its own files, and send a request nowhere.
            </p>
            <pre className="rounded-md border px-2 py-1 font-mono text-[0.625rem]/relaxed break-all whitespace-pre-wrap">
              {POLICY}
            </pre>
          </>
        )}
        <p>
          To check it, open the browser&apos;s developer tools at the Network panel and drop an image: every request is
          to this origin, and none is made while the image is encoded. The policy is in the page&apos;s source, in the{' '}
          <code>meta</code> tag at its top.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * The privacy line and where the page comes from. It is said in both states (ADR-0001 D7):
 * at the bottom edge of the empty page, and behind a button once the image is the page.
 */
export function About() {
  const version = useSearch((snapshot) => snapshot.context.version);

  return (
    // the links take the page's focus ring, not the browser's
    <div className="flex flex-col gap-1 text-xs/relaxed text-muted-foreground [&_a]:rounded-sm [&_a]:underline [&_a]:underline-offset-4 [&_a]:outline-none [&_a]:hover:text-foreground [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-ring">
      <TrustNote />
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
