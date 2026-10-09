import { ConvertTool } from "@/components/convert/ConvertTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("convert");

export default function Page() {
  return (
    <ToolPage id="convert">
      <ConvertTool />
    </ToolPage>
  );
}
