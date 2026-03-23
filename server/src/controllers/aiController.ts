import { Request, Response } from "express";
import { streamText, pipeUIMessageStreamToResponse, convertToModelMessages } from "ai";
import { getModel } from "../utils/aiConfig";
import { SURVEY_SYSTEM_PROMPT, surveyTools } from "../services/aiService";

export async function surveyAssistant(req: Request, res: Response): Promise<void> {
  const { messages, currentSchema } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const systemParts: string[] = [SURVEY_SYSTEM_PROMPT];

  if (currentSchema) {
    systemParts.push(
      `\nThe user is currently editing this survey:\n\`\`\`json\n${JSON.stringify(currentSchema, null, 2)}\n\`\`\``,
    );
  }

  // Client sends UIMessages (parts-based), streamText expects ModelMessages (content-based)
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: getModel(),
    system: systemParts.join("\n"),
    messages: modelMessages,
    tools: surveyTools,
  });

  pipeUIMessageStreamToResponse({
    response: res,
    stream: result.toUIMessageStream(),
  });
}

export async function uploadPdf(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "No PDF file uploaded" });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(req.file.buffer);
    res.json({ text: data.text });
  } catch {
    res.status(422).json({ error: "Failed to parse PDF" });
  }
}
