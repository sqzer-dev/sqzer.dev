// Where the picture stands on the screen (ADR-0001 D2): zoomed and panned, or fitted. Arithmetic only.

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

/** The picture's scale, in CSS pixels per image pixel, and its centre's offset from the screen's centre, in pixels. */
export type View = { scale: number; x: number; y: number };

/** What a view is held against: the screen, and the picture's own size. */
export type Frame = { screen: Size; picture: Size };

/** One move of the view: a pan by `dx` and `dy`, then a zoom by `factor` about `origin`, a point offset from the screen's centre. */
export type Change = { dx?: number; dy?: number; factor?: number; origin?: Point };

/** One step of the zoom buttons and keys, as on Squoosh. */
export const STEP = 1.25;
/** 32 screen pixels to an image pixel, which is as close as the view goes, and 32 image pixels to a screen pixel as far. */
export const MAX_SCALE = 32;
export const MIN_SCALE = 1 / MAX_SCALE;

/** The scale at which the picture fits the screen, and never larger than its own pixels. */
export function fitScale({ screen, picture }: Frame) {
  return Math.min(screen.width / picture.width, screen.height / picture.height, 1);
}

/** The picture fitted to the screen, in its middle. */
export function fitted(frame: Frame): View {
  return { scale: fitScale(frame), x: 0, y: 0 };
}

/** `view` with its scale between `MIN_SCALE` and `MAX_SCALE`. The picture goes wherever it is taken, out of sight included: fit brings it back. */
export function clamped(view: View): View {
  return { ...view, scale: Math.min(Math.max(view.scale, MIN_SCALE), MAX_SCALE) };
}

/** `view` after `change`: panned, then zoomed about the origin, so what is under the pointer stays under it. */
export function changed(view: View, { dx = 0, dy = 0, factor = 1, origin = { x: 0, y: 0 } }: Change): View {
  const { scale } = clamped({ ...view, scale: view.scale * factor });
  const ratio = scale / view.scale;
  return { scale, x: origin.x + (view.x + dx - origin.x) * ratio, y: origin.y + (view.y + dy - origin.y) * ratio };
}

/** `view` one step in or out, about the screen's centre. A step that would pass 100 % stops there, so the picture's own pixels are a step away. */
export function stepped(view: View, direction: 'in' | 'out'): View {
  const target = view.scale * (direction === 'in' ? STEP : 1 / STEP);
  const passesOne = (view.scale - 1) * (target - 1) < 0;
  return changed(view, { factor: (passesOne ? 1 : target) / view.scale });
}

/** Two fingers moved from `was` to `now`: their midpoint pans, and the distance between them zooms about it. */
export function pinched(was: [Point, Point], now: [Point, Point]): Change {
  const mid = ([a, b]: [Point, Point]): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const apart = ([a, b]: [Point, Point]) => Math.hypot(a.x - b.x, a.y - b.y);
  const from = mid(was);
  const to = mid(now);
  return { dx: to.x - from.x, dy: to.y - from.y, factor: apart(now) / apart(was), origin: to };
}

/** The scale as the view bar prints it, in whole percent. */
export function percent(scale: number) {
  return String(Math.round(scale * 100));
}
