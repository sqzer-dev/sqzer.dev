import { Button } from '@/shared/ui/button';

/** In the workspace's place when its chunk did not download. */
export function WorkspaceMissing() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-md border border-destructive bg-alert px-3 py-2 text-xs/relaxed text-alert-foreground"
      >
        <p>The rest of the page did not load. Reloading it fetches it again.</p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            location.reload();
          }}
        >
          Reload the page
        </Button>
      </div>
    </main>
  );
}
