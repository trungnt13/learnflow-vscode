import * as vscode from "vscode";
import { DiffEditorManager } from "../diff/DiffEditorManager";
import { OpenAIClient } from "../openai/OpenAIClient";
import { Conversation } from "./Conversation";
import { DiffData } from "./DiffData";
import { LearnflowTemplate } from "./template/LearnflowTemplate";

export type CreateConversationResult =
  | {
    type: "success";
    conversation: Conversation;
    shouldImmediatelyAnswer: boolean;
  }
  | {
    type: "unavailable";
    display?: undefined;
  }
  | {
    type: "unavailable";
    display: "info" | "error";
    message: string;
  };

export class ConversationType {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: "built-in" | "local-workspace" | "extension";
  readonly variables: LearnflowTemplate["variables"];

  private template: LearnflowTemplate;

  constructor({
    template,
    source,
  }: {
    template: LearnflowTemplate;
    source: ConversationType["source"];
  }) {
    this.template = template;

    this.id = template.id;
    this.label = template.label;
    this.description = template.description;
    this.source = source;
    this.variables = template.variables;
  }

  get tags(): LearnflowTemplate["tags"] {
    return this.template.tags;
  }

  async createConversation({
    conversationId,
    openAIClient,
    updateChatPanel,
    initVariables,
    diffEditorManager,
  }: {
    conversationId: string;
    openAIClient: OpenAIClient;
    updateChatPanel: () => Promise<void>;
    initVariables: Record<string, unknown>;
    diffEditorManager: DiffEditorManager;
  }): Promise<CreateConversationResult> {
    return {
      type: "success",
      conversation: new Conversation({
        id: conversationId,
        initVariables,
        openAIClient,
        updateChatPanel,
        template: this.template,
        diffEditorManager,
        diffData: await this.getDiffData(),
      }),
      shouldImmediatelyAnswer: this.template.initialMessage != null,
    };
  }

  hasDiffCompletionHandler(): boolean {
    const template = this.template;
    return (
      template.initialMessage?.completionHandler?.type ===
      "active-editor-diff" ||
      template.response.completionHandler?.type === "active-editor-diff"
    );
  }

  async getDiffData(): Promise<undefined | DiffData> {
    if (!this.hasDiffCompletionHandler()) {
      return undefined;
    }

    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor == null) {
      throw new Error("active editor required");
    }

    const document = activeEditor.document;
    const range = activeEditor.selection;
    const selectedText = document.getText(range);

    if (selectedText.trim().length === 0) {
      throw new Error("no selection");
    }

    const filename = document.fileName.split("/").pop();

    if (filename == undefined) {
      throw new Error("no filename");
    }

    return {
      filename,
      language: document.languageId,
      selectedText,
      range,
      editor: activeEditor,
    };
  }
}
