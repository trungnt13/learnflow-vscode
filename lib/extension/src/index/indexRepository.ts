import fs from "node:fs/promises";
import { simpleGit } from "simple-git";
import * as vscode from "vscode";
import { ChunkWithContent } from "../conversation/retrieval-augmentation/EmbeddingFile";
import { OpenAIClient } from "../openai/OpenAIClient";
import { createSplitLinearLines } from "./chunk/splitLinearLines";

export async function indexRepository({
  openAIClient,
  outputChannel,
}: {
  openAIClient: OpenAIClient;
  outputChannel: vscode.OutputChannel;
}) {
  const repositoryPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (repositoryPath == undefined) {
    vscode.window.showErrorMessage("Learnflow: No workspace folder is open.");
    return;
  }

  outputChannel.show(true);
  outputChannel.appendLine(`Indexing repository ${repositoryPath}`);

  const git = simpleGit({
    baseDir: repositoryPath,
    binary: "git",
    maxConcurrentProcesses: 6,
    trimmed: false,
  });

  const files = (await git.raw(["ls-files"])).split("\n");
  const chunksWithEmbedding: Array<ChunkWithContent> = [];

  let tokenCount = 0;
  let cancelled = false;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Indexing repository",
      cancellable: true,
    },
    async (progress, cancellationToken) => {
      for (const file of files) {
        progress.report({
          message: `Indexing ${file}`,
          increment: 100 / files.length,
        });

        if (cancellationToken.isCancellationRequested) {
          cancelled = true;
          break;
        }

        if (!isSupportedFile(file)) {
          continue;
        }

        // TODO potential bug on windows
        const content = await fs.readFile(`${repositoryPath}/${file}`, "utf8");

        const chunks = createSplitLinearLines({
          maxChunkCharacters: 500, // ~4 char per token
        })(content);

        for (const chunk of chunks) {
          if (cancellationToken.isCancellationRequested) {
            cancelled = true;
            break;
          }

          outputChannel.appendLine(
            `Generating embedding for chunk '${file}' ${chunk.startPosition}:${chunk.endPosition}`
          );

          try {
            const embeddingResult = await openAIClient.generateEmbedding({
              input: chunk.content,
            });

            if (embeddingResult.type === "error") {
              outputChannel.appendLine(
                `Failed to generate embedding for chunk '${file}' ${chunk.startPosition}:${chunk.endPosition} - ${embeddingResult.errorMessage}}`
              );

              console.error(embeddingResult.errorMessage);
              continue;
            }

            chunksWithEmbedding.push({
              file,
              start_position: chunk.startPosition,
              end_position: chunk.endPosition,
              content: chunk.content,
              embedding: embeddingResult.embedding,
            });

            tokenCount += embeddingResult.totalTokenCount;
          } catch (error) {
            console.error(error);

            outputChannel.appendLine(
              `Failed to generate embedding for chunk '${file}' ${chunk.startPosition}:${chunk.endPosition}`
            );
          }
        }
      }
    }
  );

  if (!cancelled) {
    // TODO potential bug on windows
    const filename = `${repositoryPath}/.learnflow/embedding/repository.json`;

    // TODO potential bug on windows
    await fs.mkdir(`${repositoryPath}/.learnflow/embedding`, {
      recursive: true,
    });

    await fs.writeFile(
      filename,
      JSON.stringify({
        version: 0,
        embedding: {
          source: "openai",
          model: "text-embedding-ada-002",
        },
        chunks: chunksWithEmbedding,
      })
    );
  }

  outputChannel.appendLine("");

  if (cancelled) {
    outputChannel.appendLine("Indexing cancelled");
  }

  outputChannel.appendLine(`Tokens used: ${tokenCount}`);
  outputChannel.appendLine(`Cost: ${(tokenCount / 1000) * 0.0004} USD`);
}

function isSupportedFile(file: string) {
  return (
    (file.endsWith(".js") ||
      file.endsWith(".ts") ||
      file.endsWith(".tsx") ||
      file.endsWith(".sh") ||
      file.endsWith(".yaml") ||
      file.endsWith(".yml") ||
      file.endsWith(".md") ||
      file.endsWith(".css") ||
      file.endsWith(".json") ||
      file.endsWith(".toml") ||
      file.endsWith(".config")) &&
    !(
      file.endsWith(".min.js") ||
      file.endsWith(".min.css") ||
      file.endsWith("pnpm-lock.yaml")
    )
  );
}
