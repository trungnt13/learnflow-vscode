import { marked } from "marked";
import secureJSON from "secure-json-parse";
import {
  LearnflowTemplate,
  learnflowTemplateSchema,
  Prompt,
} from "./LearnflowTemplate";

export type LearnflowTemplateParseResult =
  | {
    type: "success";
    template: LearnflowTemplate;
  }
  | {
    type: "error";
    error: unknown;
  };

class NamedCodeSnippetMap {
  private readonly contentByLangInfo = new Map<string, string>();

  set(langInfo: string, content: string): void {
    this.contentByLangInfo.set(langInfo, content);
  }

  get(langInfo: string): string {
    const content = this.contentByLangInfo.get(langInfo);

    if (content == null) {
      throw new Error(`Code snippet for lang info '${langInfo}' not found.`);
    }

    return content;
  }

  resolveTemplate(prompt: Prompt, templateId: string) {
    prompt.template = this.getHandlebarsTemplate(templateId);
  }

  private getHandlebarsTemplate(templateName: string): string {
    return this.get(`template-${templateName}`).replace(/\\`\\`\\`/g, "```");
  }
}

export const extractNamedCodeSnippets = (
  content: string
): NamedCodeSnippetMap => {
  const codeSnippets = new NamedCodeSnippetMap();

  marked
    .lexer(content)
    .filter((token) => token.type === "code")
    .forEach((token) => {
      const codeToken = token as marked.Tokens.Code;
      if (codeToken.lang != null) {
        codeSnippets.set(codeToken.lang, codeToken.text);
      }
    });

  return codeSnippets;
};

export function parseLearnflowTemplateOrThrow(
  templateAsRdtMarkdown: string
): LearnflowTemplate {
  const parseResult = parseLearnflowTemplate(templateAsRdtMarkdown);

  if (parseResult.type === "error") {
    throw parseResult.error;
  }

  return parseResult.template;
}

export function parseLearnflowTemplate(
  templateAsRdtMarkdown: string
): LearnflowTemplateParseResult {
  try {
    const namedCodeSnippets = extractNamedCodeSnippets(templateAsRdtMarkdown);

    const templateText = namedCodeSnippets.get("json conversation-template");

    const template = learnflowTemplateSchema.parse(
      secureJSON.parse(templateText)
    );

    if (template.initialMessage != null) {
      namedCodeSnippets.resolveTemplate(
        template.initialMessage as Prompt,
        "initial-message"
      );
    }

    namedCodeSnippets.resolveTemplate(template.response as Prompt, "response");

    return {
      type: "success",
      template: template as LearnflowTemplate,
    };
  } catch (error) {
    return {
      type: "error",
      error,
    };
  }
}
