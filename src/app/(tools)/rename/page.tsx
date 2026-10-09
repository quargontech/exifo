import { RenameTool } from "@/components/rename/RenameTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("rename");

export default function Page() {
  return (
    <ToolPage id="rename">
      <RenameTool />
    </ToolPage>
  );
}
