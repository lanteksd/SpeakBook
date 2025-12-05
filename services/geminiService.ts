
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceOption } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // A more user-friendly error should be displayed in the UI
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateSpeech = async (text: string, voice: VoiceOption): Promise<string> => {
  if (!text.trim()) {
    return "";
  }
  
  const voiceName = voice === VoiceOption.MALE ? 'Puck' : 'Kore';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return base64Audio;
    } else {
      throw new Error("No audio data received from API.");
    }
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};
