import { ResizeTool } from "@/components/resize/ResizeTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("resize");

export default function Page() {
  return (
    <ToolPage id="resize">
      <ResizeTool />
    </ToolPage>
  );
}
