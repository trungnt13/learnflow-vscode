import { util, webviewApi } from "@learnflow/common";
import * as vscode from "vscode";
import { Conversation } from "../conversation/Conversation";
import { ConversationType } from "../conversation/ConversationType";
import { resolveVariables } from "../conversation/input/resolveVariables";
import { DiffEditorManager } from "../diff/DiffEditorManager";
import { OpenAIClient } from "../openai/OpenAIClient";
import { ChatModel } from "./ChatModel";
import { ChatPanel } from "./ChatPanel";

export class ChatController {
  private readonly chatPanel: ChatPanel;
  private readonly chatModel: ChatModel;
  private readonly openAIClient: OpenAIClient;
  private readonly getConversationType: (
    id: string
  ) => ConversationType | undefined;
  private readonly diffEditorManager: DiffEditorManager;
  private readonly basicChatTemplateId: string;
  private readonly generateConversationId: () => string;

  constructor({
    chatPanel,
    chatModel,
    openAIClient,
    getConversationType,
    diffEditorManager,
    basicChatTemplateId,
  }: {
    chatPanel: ChatPanel;
    chatModel: ChatModel;
    openAIClient: OpenAIClient;
    getConversationType: (id: string) => ConversationType | undefined;
    diffEditorManager: DiffEditorManager;
    basicChatTemplateId: string;
  }) {
    this.chatPanel = chatPanel;
    this.chatModel = chatModel;
    this.openAIClient = openAIClient;
    this.getConversationType = getConversationType;
    this.diffEditorManager = diffEditorManager;
    this.basicChatTemplateId = basicChatTemplateId;

    this.generateConversationId = util.createNextId({
      prefix: "conversation-",
    });
  }

  private async updateChatPanel() {
    await this.chatPanel.update(this.chatModel);
  }

  private async addAndShowConversation<T extends Conversation>(
    conversation: T
  ): Promise<T> {
    this.chatModel.addAndSelectConversation(conversation);

    await this.showChatPanel();
    await this.updateChatPanel();

    return conversation;
  }

  async showChatPanel() {
    await vscode.commands.executeCommand("learnflow.chat.focus");
  }

  async receivePanelMessage(rawMessage: unknown) {
    const message = webviewApi.outgoingMessageSchema.parse(rawMessage);
    const type = message.type;

    switch (type) {
      case "enterOpenAIApiKey": {
        await vscode.commands.executeCommand("learnflow.enterOpenAIApiKey");
        break;
      }
      case "clickCollapsedConversation": {
        this.chatModel.selectedConversationId = message.data.id;
        await this.updateChatPanel();
        break;
      }
      case "sendMessage": {
        await this.chatModel
          .getConversationById(message.data.id)
          ?.answer(message.data.message);
        break;
      }
      case "startChat": {
        await this.createConversation(this.basicChatTemplateId);
        break;
      }
      case "deleteConversation": {
        this.chatModel.deleteConversation(message.data.id);
        await this.updateChatPanel();
        break;
      }
      case "exportConversation": {
        await this.chatModel
          .getConversationById(message.data.id)
          ?.exportMarkdown();
        break;
      }
      case "retry": {
        await this.chatModel.getConversationById(message.data.id)?.retry();
        break;
      }
      case "dismissError":
        await this.chatModel
          .getConversationById(message.data.id)
          ?.dismissError();
        break;
      case "applyDiff":
      case "reportError": {
        // Architecture debt: there are 2 views, but 1 outgoing message type
        // These are handled in the Conversation
        break;
      }
      default: {
        const exhaustiveCheck: never = type;
        throw new Error(`unsupported type: ${exhaustiveCheck}`);
      }
    }
  }

  async createConversation(conversationTypeId: string) {
    try {
      const conversationType = this.getConversationType(conversationTypeId);

      if (conversationType == undefined) {
        throw new Error(`No conversation type found for ${conversationTypeId}`);
      }

      const variableValues = await resolveVariables(
        conversationType.variables,
        {
          time: "conversation-start",
        }
      );

      const result = await conversationType.createConversation({
        conversationId: this.generateConversationId(),
        openAIClient: this.openAIClient,
        updateChatPanel: this.updateChatPanel.bind(this),
        diffEditorManager: this.diffEditorManager,
        initVariables: variableValues,
      });

      if (result.type === "unavailable") {
        if (result.display === "info") {
          await vscode.window.showInformationMessage(result.message);
        } else if (result.display === "error") {
          await vscode.window.showErrorMessage(result.message);
        } else {
          await vscode.window.showErrorMessage("Required input unavailable");
        }

        return;
      }

      await this.addAndShowConversation(result.conversation);

      if (result.shouldImmediatelyAnswer) {
        await result.conversation.answer();
      }
    } catch (error: any) {
      console.log(error);
      await vscode.window.showErrorMessage(error?.message ?? error);
    }
  }
}
