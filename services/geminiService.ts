import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION, MODEL_ID } from "../constants";

let chatSession: Chat | null = null;
let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not set.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const initializeChat = (): Chat => {
  const ai = getGenAI();
  chatSession = ai.chats.create({
    model: MODEL_ID,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, // Moderate creativity for wisdom
      topK: 40,
      topP: 0.95,
    },
  });
  return chatSession;
};

export const sendMessageStream = async (
  message: string,
  chat: Chat
): Promise<AsyncIterable<GenerateContentResponse>> => {
  try {
    const streamResult = await chat.sendMessageStream({ message });
    return streamResult;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  const ai = getGenAI();
  try {
    // We use a specific TTS model for high quality speech
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Fenrir' is a deep, dignified male voice suitable for Ratan Tata persona
            prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return audioData || null;
  } catch (error) {
    console.error("Gemini TTS error:", error);
    return null; // Return null to signal fallback to browser TTS
  }
};
