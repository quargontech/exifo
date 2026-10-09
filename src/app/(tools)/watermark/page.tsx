import { WatermarkTool } from "@/components/watermark/WatermarkTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("watermark");

export default function Page() {
  return (
    <ToolPage id="watermark">
      <WatermarkTool />
    </ToolPage>
  );
}
