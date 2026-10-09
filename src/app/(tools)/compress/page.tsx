import { CompressTool } from "@/components/compress/CompressTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("compress");

export default function Page() {
  return (
    <ToolPage id="compress">
      <CompressTool />
    </ToolPage>
  );
}
