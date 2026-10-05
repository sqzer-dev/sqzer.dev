// Every glass surface over the worst images a reader can drop, in light and dark (ADR-0003 D5):
// 4.5:1 for text and 3:1 for a line that marks a control, as WCAG 1.4.3 and 1.4.11 ask. The tint
// in `style.css` is the lowest step of its scale that passes here.
import type { ComponentType } from 'react';
import { afterEach, describe, expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { commands, page, server } from 'vitest/browser';

import { Badge } from '@/shared/ui/badge';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/shared/ui/drawer';
import { Input } from '@/shared/ui/input';
import { Slider } from '@/shared/ui/slider';

import { CornerLabel } from './corner-label';

type Media = {
  colorScheme?: 'light' | 'dark' | null;
  contrast?: 'more' | null;
  forcedColors?: 'active' | null;
};

declare module 'vitest/browser' {
  interface BrowserCommands {
    /** Defined in `vitest.config.ts`: a media query is the browser's to answer, not the page's. */
    emulateMedia: (media: Media) => Promise<void>;
  }
}

type Rgb = [red: number, green: number, blue: number];

const TEXT = 4.5;
const LINE = 3;

const backdrops: Record<string, string> = {
  white: new URL('../../../../tests/fixtures/white.png', import.meta.url).href,
  black: new URL('../../../../tests/fixtures/black.png', import.meta.url).href,
  noise: new URL('../../../../tests/fixtures/noise.png', import.meta.url).href,
};

/** A panel as ADR-0001 D2 has them: body text, a chip, a slider and a field, here with the focus on it. */
function Panel() {
  return (
    <section className="glass absolute top-16 left-4 flex w-64 flex-col items-start gap-3 rounded-xl p-4">
      <p className="text-sm">The target was reached in 4 trials.</p>
      <p className="text-xs text-muted-foreground">70, high: barely noticeable side by side</p>
      <Badge variant="outline">lossless</Badge>
      <Slider defaultValue={[70]} aria-label="Target" />
      {/* oxlint-disable-next-line jsx-a11y/no-autofocus -- the focus ring is one of the lines measured */}
      <Input autoFocus aria-label="Width" />
    </section>
  );
}

/** The bottom expander of a phone: the drawer, open over the image without dimming it. */
function Expander() {
  return (
    <Drawer open modal={false} showSwipeHandle>
      <DrawerContent>
        <div className="flex flex-col items-start gap-3 p-4">
          <DrawerTitle>19.3 KB, 96 % smaller</DrawerTitle>
          <DrawerDescription>The target was reached in 4 trials.</DrawerDescription>
          <Badge variant="outline">resized</Badge>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Label() {
  return <CornerLabel side="before" name="Before" size={{ width: 4032, height: 3024 }} />;
}

const surfaces: Record<string, { Surface: ComponentType; selector: string }> = {
  'a panel': { Surface: Panel, selector: 'section' },
  'the bottom expander': { Surface: Expander, selector: '[data-slot=drawer-popup]' },
  'a corner label': { Surface: Label, selector: 'span' },
};

// What is measured against the glass: the surface's own text, and inside it every text, chip, field and slider track.
const TEXTS = 'p, h2, [data-slot=badge]';
const BORDERS = '[data-slot=badge], [data-slot=input]';
const FILLS = '[data-slot=slider-track]';

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d', { willReadFrequently: true });

/** Any CSS colour as the sRGB the browser paints, and whether it is opaque. */
function paint(colour: string): { rgb: Rgb; opaque: boolean } {
  if (!context) throw new Error('the browser gives no canvas to measure on');
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = context.getImageData(0, 0, 1, 1).data;
  return { rgb: [red, green, blue], opaque: alpha === 255 };
}

function luminance(rgb: Rgb) {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrast(one: Rgb, other: Rgb) {
  const [darker = 0, lighter = 0] = [luminance(one), luminance(other)].toSorted((a, b) => a - b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Once nothing on the surface is in a transition. */
async function settled(surface: HTMLElement) {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
  await Promise.all(surface.getAnimations({ subtree: true }).map((animation) => animation.finished));
}

/** The colours of everything on the surface that has to be told from it, read before it is emptied. */
function foregrounds(surface: HTMLElement) {
  const colours = (selector: string, property: 'color' | 'borderTopColor' | 'backgroundColor') =>
    [...surface.querySelectorAll(selector)].map((element) => paint(getComputedStyle(element)[property]).rgb);
  return {
    texts: [paint(getComputedStyle(surface).color).rgb, ...colours(TEXTS, 'color')],
    lines: [...colours(BORDERS, 'borderTopColor'), ...colours(FILLS, 'backgroundColor')],
  };
}

/** Every colour the glass shows with nothing on it, sampled from a screenshot, inside its rounded corners. */
async function backgrounds(surface: HTMLElement): Promise<Rgb[]> {
  if (!context) throw new Error('the browser gives no canvas to measure on');
  surface.style.color = 'transparent';
  for (const child of surface.children) if (child instanceof HTMLElement) child.style.visibility = 'hidden';
  // a chip has a transition on everything, its visibility included
  await settled(surface);

  const shot = new Image();
  shot.src = `data:image/png;base64,${await page.screenshot({ element: surface, save: false })}`;
  await shot.decode();
  canvas.width = shot.naturalWidth;
  canvas.height = shot.naturalHeight;
  context.drawImage(shot, 0, 0);

  const scale = shot.naturalWidth / surface.getBoundingClientRect().width;
  const inset = Math.ceil((Number(getComputedStyle(surface).borderTopLeftRadius.replace('px', '')) + 1) * scale);
  const { data } = context.getImageData(inset, inset, canvas.width - 2 * inset, canvas.height - 2 * inset);
  const seen = new Set<number>();
  for (let index = 0; index < data.length; index += 4) {
    seen.add(((data[index] ?? 0) << 16) | ((data[index + 1] ?? 0) << 8) | (data[index + 2] ?? 0));
  }
  return [...seen].map((packed) => [packed >> 16, (packed >> 8) & 0xff, packed & 0xff]);
}

/** The surface on the page, over `backdrop`, once it has stopped moving. */
async function show(name: string, backdrop: string) {
  const found = surfaces[name];
  if (!found) throw new Error(`no surface is called ${name}`);
  const { Surface, selector } = found;
  await render(
    <div className="fixed inset-0 bg-(image:--backdrop)" style={{ '--backdrop': `url(${backdrops[backdrop] ?? ''})` }}>
      <Surface />
    </div>,
  );
  const surface = document.querySelector<HTMLElement>(`${selector}.glass`);
  if (!surface) throw new Error(`${name} is not glass`);
  // the drawer slides in
  await settled(surface);
  return surface;
}

const token = (name: string) => paint(getComputedStyle(document.documentElement).getPropertyValue(name)).rgb;

// Whether the stylesheet follows each media query, read from what it sets: in Firefox `matchMedia` and
// the styles do not change at the same moment under emulation.
const FOLLOWED = {
  colorScheme: () => token('--glass').join() === '0,0,0',
  contrast: () => token('--input').join() === token('--gray-11').join(),
  forcedColors: () => matchMedia('(forced-colors: active)').matches,
};

/** Has the browser answer its media queries as `media` says, and waits until the stylesheet has followed. */
async function emulate(media: Media) {
  await commands.emulateMedia(media);
  await Promise.all(
    Object.entries(FOLLOWED).map(async ([feature, followed]) => {
      if (!(feature in media)) return;
      const asked = Object.entries(media).find(([name]) => name === feature)?.[1];
      await expect.poll(followed).toBe(asked !== null && asked !== 'light');
    }),
  );
}

/** What makes a surface glass or not: its filter, its fill and its edge. */
function looks(surface: HTMLElement) {
  const style = getComputedStyle(surface);
  return { filter: style.backdropFilter, fill: paint(style.backgroundColor), edge: paint(style.borderTopColor) };
}

const worst = (colours: Rgb[], grounds: Rgb[]) =>
  Math.min(...colours.flatMap((colour) => grounds.map((ground) => contrast(colour, ground))));

afterEach(async () => {
  await emulate({ colorScheme: null, contrast: null, forcedColors: null });
  delete document.documentElement.dataset['panels'];
});

describe.for(['light', 'dark'] as const)('in %s', (scheme) => {
  describe.for(Object.keys(backdrops))('over %s', (backdrop) => {
    test.for(Object.keys(surfaces))('%s keeps its text and its lines legible', async (name) => {
      await emulate({ colorScheme: scheme });
      const surface = await show(name, backdrop);
      // the glass itself, and none of its fallbacks
      expect(getComputedStyle(surface).backdropFilter).toMatch(/^blur/u);

      const { texts, lines } = foregrounds(surface);
      const grounds = await backgrounds(surface);

      expect(worst(texts, grounds), 'text').toBeGreaterThanOrEqual(TEXT);
      // a corner label has no control on it
      expect(worst(lines, grounds), 'a line that marks a control').toBeGreaterThanOrEqual(LINE);
    });
  });
});

describe('the glass is opaque', () => {
  // Playwright's Firefox answers `matchMedia` for an emulated `prefers-contrast` and leaves the stylesheet as it was
  test.skipIf(server.browser === 'firefox')('under `prefers-contrast: more`, at `gray 2`', async () => {
    await emulate({ contrast: 'more' });
    const { filter, fill } = looks(await show('a panel', 'noise'));

    expect(filter).toBe('none');
    expect(fill).toEqual({ rgb: token('--gray-2'), opaque: true });
  });

  test('under forced colours', async () => {
    await emulate({ forcedColors: 'active' });
    const { filter, fill } = looks(await show('a panel', 'noise'));

    expect(filter).toBe('none');
    expect(fill.opaque).toBe(true);
  });

  test('by the "Solid panels" choice, at `gray 2` with a `gray 8` edge', async () => {
    document.documentElement.dataset['panels'] = 'solid';
    const { filter, fill, edge } = looks(await show('a corner label', 'noise'));

    expect(filter).toBe('none');
    expect(fill).toEqual({ rgb: token('--gray-2'), opaque: true });
    expect(edge).toEqual({ rgb: token('--gray-8'), opaque: true });
  });
});
