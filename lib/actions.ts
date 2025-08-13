"use server";

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "@/lib/prompt";

interface Contents {
  role: "user" | "model";
  parts: any[];
}

// Initialize AI with server-side environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});

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
