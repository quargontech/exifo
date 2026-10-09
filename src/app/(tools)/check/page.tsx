import { CheckTool } from "@/components/check/CheckTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("check");

export default function Page() {
  return (
    <ToolPage id="check">
      <CheckTool />
    </ToolPage>
  );
}
