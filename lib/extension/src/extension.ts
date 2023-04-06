import * as vscode from "vscode";
import { ChatController } from "./chat/ChatController";
import { ChatModel } from "./chat/ChatModel";
import { ChatPanel } from "./chat/ChatPanel";
import { ConversationTypesProvider } from "./conversation/ConversationTypesProvider";
import { DiffEditorManager } from "./diff/DiffEditorManager";
import { indexRepository } from "./index/indexRepository";
import { getVSCodeLogLevel, LoggerUsingVSCodeOutput } from "./logger";
import { ApiKeyManager } from "./openai/ApiKeyManager";
import { getVSCodeOpenAIBaseUrl, OpenAIClient } from "./openai/OpenAIClient";

export const activate = async (context: vscode.ExtensionContext) => {
  const apiKeyManager = new ApiKeyManager({
    secretStorage: context.secrets,
  });

  const mainOutputChannel = vscode.window.createOutputChannel("Learnflow");
  const indexOutputChannel =
    vscode.window.createOutputChannel("Learnflow Index");

  const vscodeLogger = new LoggerUsingVSCodeOutput({
    outputChannel: mainOutputChannel,
    level: getVSCodeLogLevel(),
  });
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("learnflow.logger.level")) {
      vscodeLogger.setLevel(getVSCodeLogLevel());
    }
  });

  const hasOpenAIApiKey = await apiKeyManager.hasOpenAIApiKey();
  const chatPanel = new ChatPanel({
    extensionUri: context.extensionUri,
    apiKeyManager,
    hasOpenAIApiKey,
  });

  const chatModel = new ChatModel();

  const conversationTypesProvider = new ConversationTypesProvider({
    extensionUri: context.extensionUri,
  });

  await conversationTypesProvider.loadConversationTypes();

  const openAIClient = new OpenAIClient({
    apiKeyManager,
    logger: vscodeLogger,
    openAIBaseUrl: getVSCodeOpenAIBaseUrl(),
  });

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("learnflow.openAI.baseUrl")) {
      openAIClient.setOpenAIBaseUrl(getVSCodeOpenAIBaseUrl());
    }
  });

  const chatController = new ChatController({
    chatPanel,
    chatModel,
    openAIClient,
    diffEditorManager: new DiffEditorManager({
      extensionUri: context.extensionUri,
    }),
    getConversationType(id: string) {
      return conversationTypesProvider.getConversationType(id);
    },
    basicChatTemplateId: "chat-en",
  });

  chatPanel.onDidReceiveMessage(
    chatController.receivePanelMessage.bind(chatController)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("learnflow.chat", chatPanel),
    vscode.commands.registerCommand(
      "learnflow.enterOpenAIApiKey",
      apiKeyManager.enterOpenAIApiKey.bind(apiKeyManager)
    ),
    vscode.commands.registerCommand(
      "learnflow.clearOpenAIApiKey",
      async () => {
        await apiKeyManager.clearOpenAIApiKey();
        vscode.window.showInformationMessage("OpenAI API key cleared.");
      }
    ),

    vscode.commands.registerCommand(
      "learnflow.startConversation",
      (templateId) => chatController.createConversation(templateId)
    ),

    vscode.commands.registerCommand("learnflow.diagnoseErrors", () => {
      chatController.createConversation("diagnose-errors");
    }),
    vscode.commands.registerCommand("learnflow.explainCode", () => {
      chatController.createConversation("explain-code");
    }),
    vscode.commands.registerCommand("learnflow.findBugs", () => {
      chatController.createConversation("find-bugs");
    }),
    vscode.commands.registerCommand("learnflow.generateCode", () => {
      chatController.createConversation("generate-code");
    }),
    vscode.commands.registerCommand("learnflow.generateUnitTest", () => {
      chatController.createConversation("generate-unit-test");
    }),
    vscode.commands.registerCommand("learnflow.startChat", () => {
      chatController.createConversation("chat-en");
    }),
    vscode.commands.registerCommand("learnflow.editCode", () => {
      chatController.createConversation("edit-code");
    }),
    vscode.commands.registerCommand("learnflow.startCustomChat", async () => {
      const items = conversationTypesProvider
        .getConversationTypes()
        .map((conversationType) => ({
          id: conversationType.id,
          label: conversationType.label,
          description: (() => {
            const tags = conversationType.tags;
            return tags == null
              ? conversationType.source
              : `${conversationType.source}, ${tags.join(", ")}`;
          })(),
          detail: conversationType.description,
        }));

      const result = await vscode.window.showQuickPick(items, {
        title: `Start Custom Chat…`,
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Select conversation type…",
      });

      if (result == undefined) {
        return; // user cancelled
      }

      await chatController.createConversation(result.id);
    }),
    vscode.commands.registerCommand("learnflow.touchBar.startChat", () => {
      chatController.createConversation("chat-en");
    }),
    vscode.commands.registerCommand("learnflow.showChatPanel", async () => {
      await chatController.showChatPanel();
    }),
    vscode.commands.registerCommand("learnflow.getStarted", async () => {
      await vscode.commands.executeCommand("workbench.action.openWalkthrough", {
        category: `learnflow.learnflow-vscode#learnflow`,
      });
    }),
    vscode.commands.registerCommand("learnflow.reloadTemplates", async () => {
      await conversationTypesProvider.loadConversationTypes();
      vscode.window.showInformationMessage("Learnflow templates reloaded.");
    }),

    vscode.commands.registerCommand("learnflow.showLogs", () => {
      mainOutputChannel.show(true);
    }),

    vscode.commands.registerCommand("learnflow.indexRepository", () => {
      indexRepository({
        openAIClient,
        outputChannel: indexOutputChannel,
      });
    })
  );

  return Object.freeze({
    async registerTemplate({ template }: { template: string }) {
      conversationTypesProvider.registerExtensionTemplate({ template });
      await conversationTypesProvider.loadConversationTypes();
    },
  });
};

export const deactivate = async () => {
  // noop
};
