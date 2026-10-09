import { CleanTool } from "@/components/clean/CleanTool";
import { ToolPage, toolMetadata } from "@/components/content/ToolPage";

export const metadata = toolMetadata("clean");

export default function Page() {
  return (
    <ToolPage id="clean">
      <CleanTool />
    </ToolPage>
  );
}
