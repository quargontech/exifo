import { EditTool } from "@/components/edit/EditTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("edit");

export default function Page() {
  return (
    <ToolPage id="edit">
      <EditTool />
    </ToolPage>
  );
}
