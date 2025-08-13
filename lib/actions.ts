"use server";

import { createPartFromUri, GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/prompt";

interface Contents {
  role: "user" | "model";
  parts: any[];
}

// Initialize AI with server-side environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

export async function generateFileContent(files: File) {
  const pdfBuffer = await files.arrayBuffer();
  const displayName = files.name;

  const fileBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

  const file = await ai.files.upload({
    file: fileBlob,
    config: {
      displayName: displayName,
    },
  });

  // Ensure file.name is defined before proceeding
  if (!file.name) {
    throw new Error('Uploaded file does not have a name.');
  }

  // Wait for the file to be processed.
  let getFile = await ai.files.get({ name: file.name });
  while (getFile.state === 'PROCESSING') {
    getFile = await ai.files.get({ name: file.name });
    console.log(`current file status: ${getFile.state}`);
    console.log('File is still processing, retrying in 5 seconds');

    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  }
  if (file.state === 'FAILED') {
    throw new Error('File processing failed.');
  }

  return file;
}

export async function generateChatResponse(contents: Contents[]) {
  try {
    if (!contents || !Array.isArray(contents)) {
      throw new Error("Invalid contents provided");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    if (!response) {
      throw new Error("No response from AI");
    }

    return {
      success: true,
      text: response.text ?? "",
      error: null,
    };
  } catch (error) {
    console.error("Error in generateChatResponse:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
