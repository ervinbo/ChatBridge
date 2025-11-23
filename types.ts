
export type Language = string;

export const Language = {
  SERBIAN: 'sr',
  TURKISH: 'tr'
};

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean; // true = user input, false = translation
  language: Language;
  timestamp: number;
  senderId?: string; // ID of the user who sent the message
}

export interface AppSettings {
  autoPlay: boolean;
  voiceName: string;
  speechRate: number;
  noiseSuppression: boolean;
  theme: 'light' | 'dark';
  nativeLanguage: Language;
}

export interface TranslationState {
  original: string;
  translated: string;
  isTranslating: boolean;
  isSpeaking: boolean;
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  lastSeen?: number;
  nativeLanguage?: Language; // Kept for backward compat/legacy structure if needed
}

export interface ChatMeta {
  lastMessageTimestamp: number;
  lastSenderId: string;
  seenBy: Record<string, number>; // Map of uid -> timestamp
}

export interface ChatRoom {
  id: string;
  name: string;
  createdBy: string; // uid of creator
  createdAt: number;
}

export interface RoomInvitation {
  roomId: string;
  roomName: string;
  invitedBy: string; // Display name of inviter
  timestamp: number;
}

export interface ToastMessage {
  title: string;
  body: string;
}

export interface TranslationKey {
  [key: string]: string;
}

// Global window extension for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    webkitAudioContext: typeof AudioContext;
  }
}
