import { Field, FieldLabel } from '@/shared/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

import { useSearch } from '../model/context';
import type { FieldOf } from './form';

/** Every format the package can write, as `codecs()` lists them, or the one it chooses per image. */
export function FormatField({ field }: { field: FieldOf<string> }) {
  const codecs = useSearch((snapshot) => snapshot.context.codecs);
  const items = [
    { value: 'auto', label: 'chosen per image' },
    ...codecs.flatMap(({ format: value, encoder }) =>
      encoder
        ? [{ value, label: `${value.toUpperCase()}${encoder.lossy ? '' : ', lossless'} (${encoder.backend})` }]
        : [],
    ),
  ];

  return (
    <Field>
      <FieldLabel htmlFor="format">Format</FieldLabel>
      <Select
        items={items}
        value={field.state.value}
        onValueChange={(value) => {
          if (value !== null) field.handleChange(value);
        }}
      >
        <SelectTrigger id="format" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
