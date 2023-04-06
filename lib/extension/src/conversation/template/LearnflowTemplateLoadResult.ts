import * as vscode from "vscode";
import { LearnflowTemplate } from "./LearnflowTemplate";

export type LearnflowTemplateLoadResult =
  | {
    type: "success";
    file: vscode.Uri;
    template: LearnflowTemplate;
  }
  | {
    type: "error";
    file: vscode.Uri;
    error: unknown;
  };
