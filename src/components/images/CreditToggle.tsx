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
      description="Writes a small “Software: Exifo” tag to the file’s metadata, visible in Inspect. JPEG, PNG and WebP only."
    />
  );
}
