# Security policy

The page at `sqzer.dev` takes an image from your device, encodes it in your browser and never sends it anywhere. Anything that breaks that promise is a security bug.

## Reporting a vulnerability

Report it privately through [GitHub's private vulnerability reporting](https://github.com/sqzer-dev/sqzer.dev/security/advisories/new). Do not open a public issue. Include:

```text
the browser and its version, and the operating system
the steps, or the file that triggers it (or how to make one)
what happened: a request that left the page, a script that ran, an error
```

The page is maintained by one person. Expect an acknowledgement within a week, and a fix or a plan once the cause is known. A fix goes live with the next merge to `main` and gets an advisory that credits you, unless you ask not to be named.

## Scope

In scope:

- anything that makes the page send image data, or anything else, to a host other than its own origin
- a way to run script or load a resource from a dropped, pasted or picked file: its name, an SVG's content, anything the page puts on screen
- a way around the `Content-Security-Policy`, which `vite.config.ts` writes into the built `index.html`
- a page that keeps running the previous visitor's data, or leaks it between tabs

> **Note**: A crafted image that crashes the encoder, hangs it or makes it allocate without bound is a bug in the `sqzer` package, not in this page. Report it to [`sqzer-dev/sqzer`](https://github.com/sqzer-dev/sqzer/security/advisories/new) instead; the page picks up the fix with the next version bump.

Out of scope: a large but bounded amount of memory or time on a large input within the package's limits, and anything that needs an attacker who already controls the browser or the device.
