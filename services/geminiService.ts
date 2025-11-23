import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

// Initialize Gemini
// NOTE: Process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Detects the language of the input text and translates it.
 * If targetLanguage is provided, translates specifically to that language.
 * Otherwise toggles between Serbian and Turkish.
 */
export const detectAndTranslate = async (
  text: string,
  targetLanguage?: string
): Promise<{ detectedSource: Language; translatedText: string }> => {
  if (!text.trim()) return { detectedSource: 'sr', translatedText: "" };

  let prompt;
  if (targetLanguage) {
    // Guest Mode / Specific Target Mode
    prompt = `
      Analyze the following text.
      1. Detect the language code of the input text (e.g., 'sr', 'en', 'tr', 'de').
      2. Translate the text to the target language code: '${targetLanguage}'.
      
      Text: "${text}"
    `;
  } else {
    // Legacy/Default Mode (Toggle SR/TR)
    prompt = `
      Analyze the following text.
      1. Detect whether the text is in Serbian ('sr') or Turkish ('tr').
      2. Translate the text to the OTHER language (if sr -> tr, if tr -> sr).
      3. If the language is ambiguous, default to Serbian as source.
      
      Text: "${text}"
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSource: { 
              type: Type.STRING, 
              description: "The detected language code of the input text (e.g. 'sr', 'tr', 'en')." 
            },
            translatedText: { 
              type: Type.STRING,
              description: "The translated text in the target language."
            }
          },
          required: ["detectedSource", "translatedText"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      detectedSource: result.detectedSource as Language,
      translatedText: result.translatedText
    };

  } catch (error) {
    console.error("Translation/Detection error:", error);
    throw error;
  }
};

/**
 * Processes audio input to transcribe, detect language, and translate.
 * Uses Gemini 2.5 Flash Multimodal capabilities.
 */
export const processAudioAndTranslate = async (
  audioBase64: string,
  mimeType: string = "audio/webm",
  targetLanguage?: string
): Promise<{ detectedSource: Language; originalText: string; translatedText: string }> => {
  
  let prompt;
  if (targetLanguage) {
     prompt = `
      Listen to the provided audio.
      1. Transcribe the speech exactly.
      2. Detect the language code of the speech.
      3. Translate the transcription to the target language code: '${targetLanguage}'.
      Return JSON.
     `;
  } else {
     prompt = `
      Listen to the provided audio carefully.
      1. Transcribe the speech exactly as it is spoken.
      2. Detect whether the speech is in Serbian ('sr') or Turkish ('tr').
      3. Translate the transcribed text to the OTHER language (if sr -> tr, if tr -> sr).
      Return JSON.
     `;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSource: { 
              type: Type.STRING, 
              description: "The detected language code of the speech." 
            },
            originalText: {
              type: Type.STRING,
              description: "The verbatim transcription of what was said."
            },
            translatedText: { 
              type: Type.STRING,
              description: "The translated text."
            }
          },
          required: ["detectedSource", "originalText", "translatedText"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    return {
      detectedSource: result.detectedSource || 'sr',
      originalText: result.originalText || "(Nepoznat govor)",
      translatedText: result.translatedText || "..."
    };

  } catch (error) {
    console.error("Audio Processing error:", error);
    throw error;
  }
};

/**
 * Generates speech from text using Gemini TTS.
 * Returns an AudioBuffer ready to play.
 */
export const generateSpeech = async (
  text: string,
  audioContext: AudioContext,
  voiceName: string = 'Kore'
): Promise<AudioBuffer | null> => {
  if (!text.trim()) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        // We use the string literal 'AUDIO' cast as any to ensure compatibility
        // even if the Modality enum is not correctly exported in the browser bundle.
        responseModalities: ['AUDIO' as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;

    if (!base64Audio) {
        console.warn("TTS Warning: No audio data found in response.", response);
        // Sometimes the model returns text explaining why it can't generate audio (e.g. safety)
        if (part?.text) {
          console.warn("TTS returned text instead of audio:", part.text);
        }
        return null;
    }

    const audioBytes = decodeBase64(base64Audio);
    // Gemini TTS is 24kHz
    const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
    
    return audioBuffer;

  } catch (error) {
    console.error("TTS error:", error);
    return null;
  }
};
