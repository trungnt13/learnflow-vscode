import * as vscode from "vscode";
import { LearnflowTemplateLoadResult } from "./LearnflowTemplateLoadResult";
import { parseLearnflowTemplate } from "./parseLearnflowTemplate";
import { readFileContent } from "../../vscode/readFileContent";

export const loadConversationFromFile = async (
  file: vscode.Uri
): Promise<LearnflowTemplateLoadResult> => {
  try {
    const parseResult = parseLearnflowTemplate(await readFileContent(file));

    if (parseResult.type === "error") {
      return {
        type: "error" as const,
        file,
        error: parseResult.error,
      };
    }

    return {
      type: "success" as const,
      file,
      template: parseResult.template,
    };
  } catch (error) {
    return {
      type: "error" as const,
      file,
      error,
    };
  }
};
