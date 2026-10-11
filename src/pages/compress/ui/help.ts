/** What each option does, in the package's words, under its control. */
export const HELP = {
  resize: 'A box to fit, a factor, and the filter. Off, the image keeps its size.',
  effort: '0 to 10. Higher is slower and smaller.',
  subsampling: 'For codecs that have it. auto lets the backend decide from the quality.',
  fast: 'One encode at the calibrated seed quality for the target, no search.',
  keepIcc: 'Instead of converting to sRGB.',
  keepMetadata: 'EXIF and XMP, instead of stripping them.',
  fit: 'How the image meets the width and height box, as CSS object-fit. Every fit but inside needs both sides.',
  position: 'Where cover crops and contain places the image.',
  background:
    'The padding of contain: #rrggbb, #rrggbbaa, white, black or transparent. The default is transparent where the format has alpha, white where it has not.',
  scale: 'A factor instead of a box: 0.5 halves both sides. Above 1 needs enlarging.',
  enlarge: 'Without it, no fit ever scales up.',
  filter: 'The resampling filter. nearest keeps the exact colours of pixel art.',
  maxPixels: 'Refuse a larger image, decoded or resized. The tab may run out of memory above the default.',
};

/** The choices of a select, from the record that lists them. */
export function choices<Value extends string>(record: Record<Value, string>) {
  // the keys of a record typed by its keys
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (Object.entries(record) as [Value, string][]).map(([value, label]) => ({ value, label }));
}
