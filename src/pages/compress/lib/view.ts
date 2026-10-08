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
/** 32 screen pixels to an image pixel, which is as close as the buttons go. */
export const MAX_SCALE = 32;

/** The scale at which the picture fits the screen, and never larger than its own pixels. */
export function fitScale({ screen, picture }: Frame) {
  return Math.min(screen.width / picture.width, screen.height / picture.height, 1);
}

/** The picture fitted to the screen, in its middle. */
export function fitted(frame: Frame): View {
  return { scale: fitScale(frame), x: 0, y: 0 };
}

const within = (value: number, limit: number) => Math.min(Math.max(value, -limit), limit);

/**
 * `view` within bounds: no further out than fitted, no closer than `MAX_SCALE`, and the picture never
 * off the screen. While it is smaller than the screen it stays inside; once larger, it covers it.
 */
export function clamped(view: View, frame: Frame): View {
  const scale = Math.min(Math.max(view.scale, fitScale(frame)), MAX_SCALE);
  const room = (axis: keyof Size) => Math.abs(frame.screen[axis] - frame.picture[axis] * scale) / 2;
  return { scale, x: within(view.x, room('width')), y: within(view.y, room('height')) };
}

/** `view` after `change`: panned, then zoomed about the origin, so what is under the pointer stays under it. */
export function changed(
  view: View,
  frame: Frame,
  { dx = 0, dy = 0, factor = 1, origin = { x: 0, y: 0 } }: Change,
): View {
  const { scale } = clamped({ ...view, scale: view.scale * factor }, frame);
  const ratio = scale / view.scale;
  return clamped(
    { scale, x: origin.x + (view.x + dx - origin.x) * ratio, y: origin.y + (view.y + dy - origin.y) * ratio },
    frame,
  );
}

/** `view` one step in or out, about the screen's centre. A step that would pass 100 % stops there, so the picture's own pixels are a step away. */
export function stepped(view: View, frame: Frame, direction: 'in' | 'out'): View {
  const target = view.scale * (direction === 'in' ? STEP : 1 / STEP);
  const passesOne = (view.scale - 1) * (target - 1) < 0;
  return changed(view, frame, { factor: (passesOne ? 1 : target) / view.scale });
}

/** Two fingers moved from `was` to `now`: their midpoint pans, and the distance between them zooms about it. */
export function pinched(was: [Point, Point], now: [Point, Point]): Change {
  const mid = ([a, b]: [Point, Point]): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const apart = ([a, b]: [Point, Point]) => Math.hypot(a.x - b.x, a.y - b.y);
  const from = mid(was);
  const to = mid(now);
  return { dx: to.x - from.x, dy: to.y - from.y, factor: apart(now) / apart(was), origin: to };
}

/** Whether the picture reaches past the screen, so a drag has somewhere to take it. */
export function overflows(view: View, { screen, picture }: Frame) {
  return picture.width * view.scale > screen.width || picture.height * view.scale > screen.height;
}

/** The scale as the view bar prints it. */
export function percent(scale: number) {
  return `${Math.round(scale * 100)} %`;
}
