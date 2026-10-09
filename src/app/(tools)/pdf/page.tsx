import { PdfTool } from "@/components/pdf/PdfTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("pdf");

export default function Page() {
  return (
    <ToolPage id="pdf">
      <PdfTool />
    </ToolPage>
  );
}
