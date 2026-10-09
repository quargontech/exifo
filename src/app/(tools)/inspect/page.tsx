import { InspectTool } from "@/components/inspect/InspectTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("inspect");

export default function Page() {
  return (
    <ToolPage id="inspect">
      <InspectTool />
    </ToolPage>
  );
}
