import * as vscode from "vscode";
import { loadConversationFromFile } from "./loadLearnflowTemplateFromFile";
import { LearnflowTemplateLoadResult } from "./LearnflowTemplateLoadResult";

const TEMPLATE_GLOB = ".learnflow/template/**/*.rdt.md";

export async function loadLearnflowTemplatesFromWorkspace(): Promise<
  Array<LearnflowTemplateLoadResult>
> {
  const files = await vscode.workspace.findFiles(TEMPLATE_GLOB);
  return await Promise.all(files.map(loadConversationFromFile));
}
