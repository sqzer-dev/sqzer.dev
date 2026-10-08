import { useSearch } from '../model/context';

type SearchFailureProps = {
  /**
   * Whose failure: the encoder's, before any image is on the page, where the empty state shows it,
   * or the image's, in the result panel. The empty state is also what the page shows while the
   * workspace is on its way, and an image that fails at once must not land there.
   */
  of: 'encoder' | 'image';
};

/**
 * Why the search failed, in the alert's colours (ADR-0001 D6), and nothing while it has not. Where
 * the search is otherwise, the loading, the reading, the trials and the result, is a toast (ADR-0005).
 */
export function SearchFailure({ of }: SearchFailureProps) {
  const error = useSearch((snapshot) => {
    const { image, error: message } = snapshot.context;
    const mine = (image !== null) === (of === 'image');
    return mine && snapshot.matches({ open: 'failed' }) ? message : null;
  });

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
