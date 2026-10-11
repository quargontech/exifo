"use client";

import { useCreditSetting } from "@/lib/credit";
import { Switch } from "@/components/ui/controls";

/** Opt-out switch for the Exifo metadata credit, shared by the re-encoding image tools. */
export function CreditToggle() {
  const [on, setOn] = useCreditSetting();
  return (
    <Switch
      checked={on}
      onChange={setOn}
      label="Add Exifo credit"
      description="Adds a short XMP tag (about 0.4 KB) naming Exifo as the creator tool, visible in Inspect. JPEG, PNG and WebP only."
    />
  );
}
