import { CompareTool } from "@/components/compare/CompareTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("compare");

export default function Page() {
  return (
    <ToolPage id="compare">
      <CompareTool />
    </ToolPage>
  );
}
