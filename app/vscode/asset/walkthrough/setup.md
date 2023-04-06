# Set Up Learnflow

Learnflow uses the OpenAI API and requires an API key to work. You can get an API key from [platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys) (you'll need to sign up for an account).

Once you have an API key, enter it with the `Learnflow: Enter OpenAI API key` command.

# Learnflow Settings

- **learnflow.model**: Select the OpenAI model that you want to use. Supports GPT-3.5-Turbo and GPT-4.
- **learnflow.syntaxHighlighting.useVisualStudioCodeColors**: Use the Visual Studio Code Theme colors for syntax highlighting in the diff viewer. Might not work with all themes. Default is `false`.

- **learnflow.openAI.baseUrl**: Specify the URL to the OpenAI API. If you are using a proxy, you can set it here.
- **learnflow.logger.level**: Specify the verbosity of logs that will appear in 'Learnflow: Show Logs'.

- **learnflow.action.startChat.showInEditorContextMenu**: Show the "Start chat" action in the editor context menu, when you right-click on the code.
- **learnflow.action.startCustomChat.showInEditorContextMenu**: Show the "Start custom chat" action in the editor context menu, when you right-click on the code.
- **learnflow.action.editCode.showInEditorContextMenu**: Show the "Edit Code action in the editor context menu, when you right-click on the code.
- **learnflow.action.explainCode.showInEditorContextMenu**: Show the "Explain code" action in the editor context menu, when you right-click on the code.
- **learnflow.action.findBugs.showInEditorContextMenu**: Show the "Find bugs" action in the editor context menu, when you right-click on the code.
- **learnflow.action.generateUnitTest.showInEditorContextMenu**: Show the "Generate unit test" in the editor context menu, when you right-click on the code.
- **learnflow.action.diagnoseErrors.showInEditorContextMenu**: Show the "Diagnose errors" in the editor context menu, when you right-click on the code.
