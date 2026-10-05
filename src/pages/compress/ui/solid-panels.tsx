import { Switch } from '@/shared/ui/switch';

import { useSolidPanels } from '../model/solid-panels';

/** Makes every glass surface opaque, in any browser (ADR-0003 D5). It is no option of the search. */
export function SolidPanels() {
  const [solid, setSolid] = useSolidPanels();

  return (
    <label className="flex items-center gap-2 text-xs/relaxed font-medium">
      <Switch checked={solid} onCheckedChange={setSolid} /> Solid panels
    </label>
  );
}
