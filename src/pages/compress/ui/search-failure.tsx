import { useSearch } from '../model/context';

/**
 * Why the search failed, in the alert's colours (ADR-0001 D6), and nothing while it has not. Where
 * the search is otherwise, the loading, the reading, the trials and the result, is a toast (ADR-0005).
 */
export function SearchFailure() {
  const error = useSearch((snapshot) => (snapshot.matches({ open: 'failed' }) ? snapshot.context.error : null));

  if (error === null) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive bg-alert px-3 py-1 font-mono text-xs/6 text-alert-foreground"
    >
      {error}
    </p>
  );
}
