import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage, AppSettings, UserProfile, ChatMeta, ToastMessage, ChatRoom } from './types';
import { detectAndTranslate, generateSpeech, processAudioAndTranslate } from './services/geminiService';
import { blobToBase64 } from './services/audioUtils';
import SettingsModal from './SettingsModal';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import InviteModal from './InviteModal';
import IncomingInviteModal from './IncomingInviteModal';
import ContactsSidebar from './ContactsSidebar';
import RoomMembersModal from './RoomMembersModal';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from './contexts/AuthContext';
import { db, dbFirestore, messaging, onForegroundMessage } from './services/firebase';
import { ref, onValue, push, set, remove, update, get } from 'firebase/database';
import { doc, onSnapshot, collection, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { LanguageProvider } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';

// --- EMOJI LIST ---
const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "💀", "👻", "👽", "🤖", "💩", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
  "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🧠", "🦴", "👀", "👁", "👅", "👄", "💋", "❤", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🔥", "✨", "⭐", "🌟", "💫", "💥", "💯", "💢", "💨", "💦", "💤", "🕳", "🎉", "🎊", "🎈", "🎂"
];

// --- Icons ---
const MicIcon = ({ active, processing }: { active: boolean, processing: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-all ${active ? "text-white" : (processing ? "text-blue-500 animate-spin" : "text-gray-500 dark:text-gray-400")}`}>
    {processing ? (
       <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    ) : (
      <>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </>
    )}
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white transform rotate-45 translate-x-[-2px] translate-y-[2px]">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const EmojiIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line>
    <line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);

const SpeakerIcon = ({ playing }: { playing: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={playing ? "#3b82f6" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${playing ? "scale-110" : ""}`}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);

const CopyIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
   </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const ContactsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const RoomIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const UserPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="8.5" cy="7" r="4"></circle>
    <line x1="20" y1="8" x2="20" y2="14"></line>
    <line x1="23" y1="11" x2="17" y2="11"></line>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const Toast = ({ title, body, onClose }: { title: string, body: string, onClose: () => void }) => (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-blue-100 dark:border-gray-700 p-4 w-11/12 max-w-sm z-[100] animate-slide-up-fade flex gap-3">
     <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"></path></svg>
     </div>
     <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{body}</p>
     </div>
     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0 self-start">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
     </button>
  </div>
);

const Logo = () => (
  <div className="flex items-center gap-2">
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      {/* Bubble */}
      <path d="M44 24C44 12.95 35.05 4 24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C26.3 44 28.5 43.6 30.6 42.9L38 46L36.2 38.5C40.9 35.2 44 30 44 24Z" fill="#0088FF" />
      {/* Bridge */}
      <path d="M12 32H36" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 32C14 32 19 18 24 18C29 18 34 32 34 32" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 18V32" stroke="white" strokeWidth="2" />
      <path d="M19 22V32" stroke="white" strokeWidth="2" />
      <path d="M29 22V32" stroke="white" strokeWidth="2" />
    </svg>
    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-200 bg-clip-text text-transparent hidden sm:block">
      ChatBridge
    </h1>
  </div>
);

const AppMain: React.FC<{ settings: AppSettings, setSettings: React.Dispatch<React.SetStateAction<AppSettings>> }> = ({ settings, setSettings }) => {
  const { currentUser, logout, loading } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sourceLang, setSourceLang] = useState<Language>(Language.SERBIAN);
  const [targetLang, setTargetLang] = useState<Language>(Language.TURKISH);
  const [guestTargetLang, setGuestTargetLang] = useState<string>('tr');
  const [availableLanguages, setAvailableLanguages] = useState<{code:string, name:string}[]>([]);

  const [inputText, setInputText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [roomUserCache, setRoomUserCache] = useState<Record<string, UserProfile>>({});
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [hasGlobalUnread, setHasGlobalUnread] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [recordingVolume, setRecordingVolume] = useState(0);
  
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isIncomingInviteOpen, setIsIncomingInviteOpen] = useState(false);
  const [isRoomMembersOpen, setIsRoomMembersOpen] = useState(false);
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPlayedIdRef = useRef<string | null>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const isDeletingRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const selectedContactRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    // Fetch Languages for Guest Dropdown
    const fetchLanguages = async () => {
      try {
        const langCol = collection(dbFirestore, 'languages');
        const snap = await getDocs(langCol);
        const list: {code:string, name:string}[] = [];
        snap.forEach(d => {
           const data = d.data();
           list.push({ code: data.code, name: data.name });
        });
        if (list.length === 0) {
           list.push({code: 'en', name: 'Engleski'}, {code: 'tr', name: 'Turski'}, {code: 'sr', name: 'Srpski'});
        }
        setAvailableLanguages(list);
      } catch (e) { console.error(e); }
    };
    fetchLanguages();
  }, []);

  useEffect(() => {
    // Keep ref in sync for event listeners
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Sync Settings from Firestore on Login
  useEffect(() => {
    if (currentUser) {
      const settingsRef = doc(dbFirestore, "settings", currentUser.uid);
      const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AppSettings;
          // Merge with defaults
          setSettings(prev => ({ ...prev, ...data }));
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, setSettings]);

  useEffect(() => {
    if (selectedContact) {
      selectedChatIdRef.current = [currentUser?.uid || '', selectedContact.uid].sort().join('_');
    } else if (selectedRoom) {
      selectedChatIdRef.current = selectedRoom.id;
    } else {
      selectedChatIdRef.current = null;
    }
  }, [selectedContact, selectedRoom, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const invitesRef = ref(db, `users/${currentUser.uid}/invitations`);
      const unsubscribe = onValue(invitesRef, (snapshot) => {
         const hasInvites = snapshot.exists();
         if (hasInvites) {
            setIsIncomingInviteOpen(true);
         }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    }

    const unsubscribe = onForegroundMessage((payload: any) => {
      if (payload.notification) {
        setToastMessage({
          title: payload.notification.title || t('new_message'),
          body: payload.notification.body || t('click_to_chat')
        });
        setTimeout(() => setToastMessage(null), 4000);
      }
    });

    return () => unsubscribe();
  }, [t]);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Fetch Full User Profile from Firestore
  useEffect(() => {
    if (currentUser) {
       const userRef = doc(dbFirestore, "users", currentUser.uid);
       const unsubscribe = onSnapshot(userRef, (docSnap) => {
         if (docSnap.exists()) {
           setUserProfile(docSnap.data() as UserProfile);
         } else {
           setUserProfile({
             uid: currentUser.uid,
             displayName: currentUser.displayName || undefined,
             email: currentUser.email || undefined
           });
         }
       });
       return () => unsubscribe();
    } else {
      setUserProfile(null);
    }
  }, [currentUser]);

  const getChatId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  useEffect(() => {
    if (!currentUser) {
      setHasGlobalUnread(false);
      return;
    }

    const unreadStatusMap = new Map<string, boolean>();
    const unsubscribeMap = new Map<string, () => void>();

    const roomsRef = ref(db, 'chatRooms');
    const unsubRooms = onValue(roomsRef, (snapshot) => {
       const roomsData = snapshot.val();
       if (!roomsData) return;
       
       Object.keys(roomsData).forEach(roomId => {
           if (!unsubscribeMap.has(roomId)) {
               const metaRef = ref(db, `chats/${roomId}/meta`);
               const unsubRoom = onValue(metaRef, (metaSnap) => {
                   const data = metaSnap.val() as ChatMeta;
                   let isUnread = false;

                   if (roomId !== selectedChatIdRef.current && data) {
                       const lastMsgTime = data.lastMessageTimestamp || 0;
                       const mySeenTime = data.seenBy?.[currentUser.uid] || 0;
                       const senderId = data.lastSenderId;

                       if (senderId && senderId !== currentUser.uid && lastMsgTime > mySeenTime) {
                           isUnread = true;
                       }
                   }
                   unreadStatusMap.set(roomId, isUnread);
                   updateGlobalStatus();
               });
               unsubscribeMap.set(roomId, unsubRoom);
           }
       });
    });
    
    const usersCollection = collection(dbFirestore, 'users');
    const unsubUsers = onSnapshot(usersCollection, (snapshot) => {
       snapshot.forEach(doc => {
           const uid = doc.id;
           if (uid === currentUser.uid) return;
           
           const chatId = getChatId(currentUser.uid, uid);
           if (!unsubscribeMap.has(chatId)) {
               const metaRef = ref(db, `chats/${chatId}/meta`);
               const unsub = onValue(metaRef, (metaSnap) => {
                   const data = metaSnap.val() as ChatMeta;
                   let isUnread = false;
                   
                   // Check if this chat is currently open
                   const isCurrentChat = selectedContactRef.current && selectedContactRef.current.uid === uid;

                   if (!isCurrentChat && data) {
                       const lastMsgTime = data.lastMessageTimestamp || 0;
                       const mySeenTime = data.seenBy?.[currentUser.uid] || 0;
                       const senderId = data.lastSenderId;

                       if (senderId && senderId !== currentUser.uid && lastMsgTime > mySeenTime) {
                           isUnread = true;
                       }
                   }
                   unreadStatusMap.set(chatId, isUnread);
                   updateGlobalStatus();
               });
               unsubscribeMap.set(chatId, unsub);
           }
       });
    });

    const updateGlobalStatus = () => {
        const anyUnread = Array.from(unreadStatusMap.values()).some(s => s === true);
        setHasGlobalUnread(anyUnread);
    };

    return () => {
      unsubRooms();
      unsubUsers();
      unsubscribeMap.forEach(unsub => unsub());
      unsubscribeMap.clear();
    };
  }, [currentUser]);

  const markChatAsSeen = (chatId: string) => {
    if (!currentUser) return;
    const seenRef = ref(db, `chats/${chatId}/meta/seenBy`);
    update(seenRef, {
      [currentUser.uid]: Date.now()
    }).catch(err => console.error("Error marking chat as seen:", err));
  };

  const fetchMemberProfile = async (uid: string) => {
     if (uid === 'SYSTEM') return null;
     if (roomUserCache[uid]) return roomUserCache[uid];
     
     const docSnap = await getDoc(doc(dbFirestore, "users", uid));
     if (docSnap.exists()) {
         const u = docSnap.data() as UserProfile;
         setRoomUserCache(prev => ({ ...prev, [uid]: u }));
         return u;
     }
     return null;
  };

  useEffect(() => {
    if (selectedRoom && currentUser) {
      const roomRef = ref(db, `chatRooms/${selectedRoom.id}`);
      
      const unsub = onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
           if (isDeletingRef.current) return;
           setSelectedRoom(null);
           alert(t('error')); 
           return;
        }

        const roomData = snapshot.val();
        if (roomData.members && !roomData.members[currentUser.uid]) {
            setSelectedRoom(null);
            alert(t('error')); 
        }
      });
      return () => unsub();
    }
  }, [selectedRoom, currentUser, t]);

  useEffect(() => {
    if (currentUser) {
      let messagesRef;
      let chatId = '';
      
      if (selectedContact) {
        chatId = getChatId(currentUser.uid, selectedContact.uid);
      } else if (selectedRoom) {
        chatId = selectedRoom.id;
      }

      if (chatId) {
        messagesRef = ref(db, `chats/${chatId}/messages`);
        markChatAsSeen(chatId);
      } else {
        messagesRef = ref(db, `users/${currentUser.uid}/messages`);
      }

      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const loadedMessages = Object.values(data) as ChatMessage[];
          loadedMessages.sort((a, b) => a.timestamp - b.timestamp);
          setMessages(loadedMessages);
          
          if (selectedRoom) {
              loadedMessages.forEach(msg => {
                  if (msg.senderId && msg.senderId !== currentUser.uid && !roomUserCache[msg.senderId] && msg.senderId !== 'SYSTEM') {
                      fetchMemberProfile(msg.senderId);
                  }
              });
          }

          if (chatId) {
             markChatAsSeen(chatId);
          }
        } else {
          setMessages([]);
        }
      });
      return () => unsubscribe(); 
    } else {
      setMessages([]);
      setSelectedContact(null);
      setSelectedRoom(null);
    }
  }, [currentUser, selectedContact, selectedRoom]); 

  useEffect(() => {
    if (messages.length === 0 || !settings.autoPlay) return;
    
    const lastMsg = messages[messages.length - 1];

    if (lastPlayedIdRef.current === lastMsg.id) return;

    if (lastMsg.senderId === 'SYSTEM') return;

    const myNativeLang = settings.nativeLanguage || 'sr';
    let shouldPlay = false;

    if (selectedContact || selectedRoom) {
      if (lastMsg.senderId !== currentUser?.uid && lastMsg.language === myNativeLang) {
        shouldPlay = true;
      }
    } else {
      if (!lastMsg.isUser && lastMsg.language === myNativeLang) {
        shouldPlay = true;
      }
    }

    if (shouldPlay) {
      setTimeout(() => {
        playAudio(lastMsg.text, lastMsg.id);
      }, 300);
      lastPlayedIdRef.current = lastMsg.id;
    }
  }, [messages, selectedContact, selectedRoom, settings.autoPlay, currentUser, settings.nativeLanguage]);


  const handleSaveSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    if (currentUser) {
       try {
         const settingsRef = doc(dbFirestore, "settings", currentUser.uid);
         await setDoc(settingsRef, newSettings, { merge: true });
       } catch (error) {
         console.error("Error saving settings to Firestore:", error);
       }
    } else {
       localStorage.setItem('geminiTranslatorSettings', JSON.stringify(newSettings));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTranslating, editingId]); 

  const updateConversation = (detectedSource: Language, originalText: string, translatedText: string) => {
      if (detectedSource !== sourceLang) {
        setSourceLang(detectedSource);
        setTargetLang(detectedSource === 'sr' ? 'tr' : 'sr');
      }
      const correctTargetLang = detectedSource === 'sr' ? 'tr' : 'sr';

      const timestamp = Date.now();
      const userMsgId = timestamp.toString();
      const userMessage: ChatMessage = {
        id: userMsgId,
        text: originalText,
        isUser: true,
        language: detectedSource,
        timestamp: timestamp,
        senderId: currentUser?.uid
      };

      const botMsgId = (timestamp + 1).toString();
      const botMessage: ChatMessage = {
        id: botMsgId,
        text: translatedText,
        isUser: false,
        language: currentUser ? correctTargetLang : guestTargetLang, // Use selected guest target lang if not logged in
        timestamp: timestamp + 1,
        senderId: currentUser?.uid
      };

      if (currentUser) {
        let messagesRef;
        let chatId = '';

        if (selectedContact) {
          chatId = getChatId(currentUser.uid, selectedContact.uid);
        } else if (selectedRoom) {
          chatId = selectedRoom.id;
        }

        if (chatId) {
          messagesRef = ref(db, `chats/${chatId}/messages`);
          const metaRef = ref(db, `chats/${chatId}/meta`);
          update(metaRef, {
            lastMessageTimestamp: timestamp + 1,
            lastSenderId: currentUser.uid,
            [`seenBy/${currentUser.uid}`]: timestamp + 1 
          });
        } else {
          messagesRef = ref(db, `users/${currentUser.uid}/messages`);
        }

        push(messagesRef, userMessage);
        push(messagesRef, botMessage);
      } else {
        setMessages(prev => [...prev, userMessage, botMessage]);
        if (settings.autoPlay) {
          playAudio(translatedText, botMsgId);
          lastPlayedIdRef.current = botMsgId;
        }
      }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToAnalyze = inputText.trim();
    setInputText(''); 
    setIsTranslating(true);
    
    try {
      // If guest, pass the selected target language
      const target = !currentUser ? guestTargetLang : undefined;
      const { detectedSource, translatedText } = await detectAndTranslate(textToAnalyze, target);
      updateConversation(detectedSource, textToAnalyze, translatedText);
    } catch (error) {
      console.error("Translation failed", error);
      const fallbackMsg = {
        id: Date.now().toString(),
        text: textToAnalyze,
        isUser: true,
        language: sourceLang,
        timestamp: Date.now(),
        senderId: currentUser?.uid
      };
      
      if (currentUser) {
         let messagesRef;
         if (selectedContact) {
            const chatId = getChatId(currentUser.uid, selectedContact.uid);
            messagesRef = ref(db, `chats/${chatId}/messages`);
         } else if (selectedRoom) {
            messagesRef = ref(db, `chats/${selectedRoom.id}/messages`);
         } else {
            messagesRef = ref(db, `users/${currentUser.uid}/messages`);
         }
         push(messagesRef, fallbackMsg);
      } else {
         setMessages(prev => [...prev, fallbackMsg]);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const findMessageKey = async (msgId: string) => {
     if (!currentUser) return null;
     let msgsRef;
     if (selectedContact) {
       const chatId = getChatId(currentUser.uid, selectedContact.uid);
       msgsRef = ref(db, `chats/${chatId}/messages`);
     } else if (selectedRoom) {
       msgsRef = ref(db, `chats/${selectedRoom.id}/messages`);
     } else {
       msgsRef = ref(db, `users/${currentUser.uid}/messages`);
     }
     
     try {
       const snapshot = await new Promise<any>((resolve) => onValue(msgsRef, resolve, { onlyOnce: true }));
       if (snapshot.exists()) {
          const data = snapshot.val();
          for (const [key, val] of Object.entries(data)) {
             if ((val as ChatMessage).id === msgId) {
                return key;
             }
          }
       }
     } catch (e) { console.error(e); }
     return null;
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!currentUser) return;
    
    setConfirmConfig({
      isOpen: true,
      title: t('confirm_delete_msg'),
      message: t('confirm_delete_msg_desc'),
      confirmText: t('delete_chat'), // Reusing "Delete chat" as "Delete" button text or generic delete
      isDanger: true,
      onConfirm: async () => {
        const key = await findMessageKey(msgId);
        if (key) {
           let path = '';
           if (selectedContact) {
              const chatId = getChatId(currentUser.uid, selectedContact.uid);
              path = `chats/${chatId}/messages/${key}`;
           } else if (selectedRoom) {
              path = `chats/${selectedRoom.id}/messages/${key}`;
           } else {
              path = `users/${currentUser.uid}/messages/${key}`;
           }
           remove(ref(db, path));
        }
      }
    });
  };

  const startEditing = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditContent(msg.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveMessageEdit = async () => {
    if (!currentUser || !editingId || !editContent.trim()) return;

    const key = await findMessageKey(editingId);
    if (key) {
       let path = '';
       if (selectedContact) {
          const chatId = getChatId(currentUser.uid, selectedContact.uid);
          path = `chats/${chatId}/messages/${key}`;
       } else if (selectedRoom) {
          path = `chats/${selectedRoom.id}/messages/${key}`;
       } else {
          path = `users/${currentUser.uid}/messages/${key}`;
       }
       update(ref(db, path), { text: editContent });
    }
    setEditingId(null);
    setEditContent('');
  };

  const startRecording = async () => {
    try {
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }
      mimeTypeRef.current = mimeType;

      const constraints = {
        audio: {
          echoCancellation: settings.noiseSuppression,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.noiseSuppression
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setupVisualizer(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setRecordingVolume(0);
        stream.getTracks().forEach(track => track.stop());
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        if (audioBlob.size > 0) {
          await handleAudioUpload(audioBlob);
        } else {
           setIsListening(false);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      console.error("Could not start recording", err);
      alert(t('error'));
      setIsListening(false);
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const scaled = Math.min(100, Math.max(0, (average - 10) * 1.5));
      setRecordingVolume(scaled);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const WIDTH = canvas.width;
          const HEIGHT = canvas.height;
          ctx.clearRect(0, 0, WIDTH, HEIGHT);

          const barCount = 20;
          const barWidth = 4;
          const gap = 4;
          const totalWidth = barCount * (barWidth + gap);
          const startX = (WIDTH - totalWidth) / 2;
          const step = Math.floor(bufferLength / barCount);

          ctx.fillStyle = '#ef4444';

          for (let i = 0; i < barCount; i++) {
            const dataIndex = i * step;
            const value = dataArray[dataIndex];
            let percent = value / 255;
            percent = Math.max(0.1, percent);
            const barHeight = percent * HEIGHT * 0.8; 
            const x = startX + i * (barWidth + gap);
            const y = (HEIGHT - barHeight) / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 20);
            ctx.fill();
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setIsProcessingAudio(true);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsTranslating(true);
    try {
       const base64Audio = await blobToBase64(audioBlob);
       // Pass target language for guest mode
       const target = !currentUser ? guestTargetLang : undefined;
       const { detectedSource, originalText, translatedText } = await processAudioAndTranslate(base64Audio, mimeTypeRef.current, target);
       updateConversation(detectedSource, originalText, translatedText);
    } catch (error) {
       console.error("Audio processing failed", error);
       alert(t('error'));
    } finally {
       setIsTranslating(false);
       setIsProcessingAudio(false);
    }
  };

  const playAudio = async (text: string, msgId: string) => {
    if (!text || !audioContextRef.current) return;

    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
    }
    setCurrentlyPlayingId(msgId);

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      const audioBuffer = await generateSpeech(text, audioContextRef.current, settings.voiceName);

      if (audioBuffer) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = settings.speechRate;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
          setCurrentlyPlayingId(null);
          activeSourceRef.current = null;
        };
        activeSourceRef.current = source;
        source.start();
      } else {
        setCurrentlyPlayingId(null);
      }
    } catch (err) {
      console.error("Audio playback failed", err);
      setCurrentlyPlayingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setConfirmConfig({
      isOpen: true,
      title: t('confirm_delete_chat'),
      message: t('confirm_delete_chat_desc'),
      confirmText: t('delete_chat'),
      isDanger: true,
      onConfirm: () => {
        if (currentUser) {
          let messagesRef;
          let metaRef;

          if (selectedContact) {
             const chatId = getChatId(currentUser.uid, selectedContact.uid);
             messagesRef = ref(db, `chats/${chatId}/messages`);
             metaRef = ref(db, `chats/${chatId}/meta`);
             remove(metaRef);
          } else if (selectedRoom) {
             messagesRef = ref(db, `chats/${selectedRoom.id}/messages`);
             metaRef = ref(db, `chats/${selectedRoom.id}/meta`);
          } else {
             messagesRef = ref(db, `users/${currentUser.uid}/messages`);
          }
          if (messagesRef) remove(messagesRef);
        } else {
          setMessages([]);
        }
      }
    });
  };

  const handleDeleteRoom = () => {
      if (selectedRoom && selectedRoom.createdBy === currentUser?.uid) {
        setConfirmConfig({
            isOpen: true,
            title: t('confirm_delete_room'),
            message: t('confirm_delete_room_msg'),
            confirmText: t('delete_room'),
            isDanger: true,
            onConfirm: async () => {
                isDeletingRef.current = true;
                try {
                    const roomId = selectedRoom.id;
                    setSelectedRoom(null); // Close view first
                    
                    const roomRef = ref(db, `chatRooms/${roomId}`);
                    const messagesRef = ref(db, `chats/${roomId}`);
                    await remove(roomRef);
                    await remove(messagesRef);
                } catch (error) {
                    console.error("Error deleting room", error);
                    alert(t('error'));
                } finally {
                    isDeletingRef.current = false;
                }
            }
        });
      }
  };

  const onEmojiClick = (emoji: string) => {
     setInputText(prev => prev + emoji);
     setShowEmojiPicker(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast title={toastMessage.title} body={toastMessage.body} onClose={() => setToastMessage(null)} />
      )}
      
      {/* Modals */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDanger={confirmConfig.isDanger}
      />
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={handleSaveSettings} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <ContactsSidebar 
         isOpen={isContactsOpen} 
         onClose={() => setIsContactsOpen(false)} 
         onSelectContact={(user) => {
            setSelectedContact(user);
            setSelectedRoom(null);
         }}
         onSelectRoom={(room) => {
            setSelectedRoom(room);
            setSelectedContact(null);
         }}
         selectedContactId={selectedContact?.uid}
         selectedRoomId={selectedRoom?.id}
      />
      <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} room={selectedRoom} />
      <IncomingInviteModal 
         isOpen={isIncomingInviteOpen} 
         onClose={() => setIsIncomingInviteOpen(false)}
         onJoin={(room) => {
             setSelectedRoom(room);
             setSelectedContact(null);
         }} 
      />
      <RoomMembersModal isOpen={isRoomMembersOpen} onClose={() => setIsRoomMembersOpen(false)} room={selectedRoom} />

      {/* Header */}
      <header className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {(selectedContact || selectedRoom) && (
            <button 
              onClick={() => {
                setSelectedContact(null);
                setSelectedRoom(null);
              }}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <BackIcon />
            </button>
          )}

          {selectedContact ? (
            <div className="flex items-center gap-3 animate-fade-in min-w-0">
              {selectedContact.photoURL ? (
                <img src={selectedContact.photoURL} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold shrink-0">
                   {selectedContact.displayName?.substring(0,2).toUpperCase() || "US"}
                </div>
              )}
              <div className="min-w-0">
                 <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                   {selectedContact.displayName || selectedContact.email}
                 </h1>
                 <p className="text-xs text-green-500 font-medium">{t('chat_active')}</p>
              </div>
            </div>
          ) : selectedRoom ? (
             <div className="flex items-center gap-3 animate-fade-in min-w-0">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold shrink-0">
                  <RoomIcon />
                </div>
                <div className="min-w-0">
                   <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                     {selectedRoom.name}
                   </h1>
                   <p className="text-xs text-gray-500 dark:text-gray-400">
                     {selectedRoom.createdBy === currentUser?.uid ? t('owner') : t('member')}
                   </p>
                </div>
             </div>
          ) : (
            <Logo />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {selectedRoom && (
             <>
                <button 
                  onClick={() => setIsRoomMembersOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative"
                  title={t('room_members')}
                >
                   <UsersIcon />
                </button>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors relative"
                  title={t('invite_user')}
                >
                   <UserPlusIcon />
                </button>
                {selectedRoom.createdBy === currentUser?.uid && (
                   <button 
                     onClick={handleDeleteRoom}
                     className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                     title={t('delete_room')}
                   >
                     <TrashIcon />
                   </button>
                )}
             </>
          )}

          {!selectedRoom && !selectedContact && !currentUser && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
               <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1 hidden sm:inline">Translate to:</span>
               <select
                 value={guestTargetLang}
                 onChange={(e) => setGuestTargetLang(e.target.value)}
                 className="bg-transparent text-sm font-bold text-gray-800 dark:text-white outline-none cursor-pointer max-w-[100px]"
               >
                  {availableLanguages.map(lang => (
                     <option key={lang.code} value={lang.code} className="text-gray-800 bg-white dark:bg-gray-800 dark:text-white">
                       {lang.name}
                     </option>
                  ))}
               </select>
            </div>
          )}

          {currentUser ? (
            <>
               <button 
                 onClick={() => setIsContactsOpen(true)}
                 className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
               >
                 <ContactsIcon />
                 {hasGlobalUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></span>
                 )}
               </button>

               <button 
                 onClick={() => setIsProfileOpen(true)}
                 className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
               >
                 {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                 ) : (
                    <UserIcon />
                 )}
               </button>
            </>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-full text-sm font-medium hover:bg-black dark:hover:bg-gray-600 transition-colors"
            >
              <UserIcon />
              <span className="hidden sm:inline">{t('login')}</span>
            </button>
          )}
          
          <button 
            onClick={() => {
              if (messages.length > 0) clearChat();
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
            title={t('delete_chat')}
          >
            <TrashIcon />
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 w-full max-w-2xl p-4 overflow-y-auto no-scrollbar space-y-6 pb-24">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4 opacity-50 mt-20">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <div className="text-center">
               <p className="text-lg font-medium">{t('start_conversation')}</p>
               <p className="text-sm">{selectedRoom ? t('public_room') : t('type_message')}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
             const isMe = currentUser ? msg.senderId === currentUser.uid : msg.isUser;
             const isSystem = msg.senderId === 'SYSTEM';
             
             // Magic Logic:
             // If shared chat (Contact/Room):
             //   If I sent it: Show original (Native)
             //   If They sent it: Show translation (My Native)
             // If Personal Mode:
             //   Show both bubbles side-by-side
             
             const isSharedChat = !!selectedContact || !!selectedRoom;
             let showBubble = true;

             if (isSharedChat && !isSystem) {
                const myNativeLang = settings.nativeLanguage || 'sr';
                
                if (isMe) {
                   // I only want to see my Original text (User message)
                   // Hide translation bubble
                   if (!msg.isUser) showBubble = false;
                } else {
                   // I only want to see the Translation (Bot message) in my language
                   // Hide their original message (User message)
                   if (msg.language !== myNativeLang) showBubble = false;
                }
             }

             if (!showBubble) return null;

             if (isSystem) {
                 return (
                    <div key={msg.id} className="flex justify-center my-4">
                       <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                          {msg.text}
                       </span>
                    </div>
                 );
             }

             // Align: Me -> Right, Them -> Left
             const alignClass = isMe ? 'justify-end' : 'justify-start';
             
             // Avatar Logic
             let senderProfile = currentUser;
             if (!isMe) {
                 if (msg.senderId && roomUserCache[msg.senderId]) {
                     senderProfile = roomUserCache[msg.senderId];
                 } else if (selectedContact) {
                     senderProfile = selectedContact;
                 } else {
                     // Fallback for personal mode bot
                     senderProfile = null; 
                 }
             }

             return (
              <div key={msg.id} className={`flex ${alignClass} group mb-2`}>
                 <div className={`flex gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className="shrink-0 self-end mb-1">
                       {senderProfile ? (
                          senderProfile.photoURL ? (
                             <img src={senderProfile.photoURL} className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-700" alt="" />
                          ) : (
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${isMe ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                {senderProfile.displayName?.substring(0,2).toUpperCase() || (isMe ? "JA" : "US")}
                             </div>
                          )
                       ) : (
                          // AI Icon for Personal Mode Bot
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M12 16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2z"/><path d="M5 9v6"/><path d="M19 9v6"/><path d="M9 2h6"/><path d="M9 22h6"/><path d="M12 8a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0v-2a5 5 0 0 0-5-5z"/></svg>
                          </div>
                       )}
                    </div>

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       {/* Name */}
                       {!isMe && (selectedRoom || !selectedContact) && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 ml-1">
                             {senderProfile?.displayName || senderProfile?.email || t('ai_translator')}
                          </span>
                       )}

                       {/* Bubble */}
                       {editingId === msg.id ? (
                          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-lg border border-blue-500 w-full min-w-[200px]">
                             <input 
                               type="text" 
                               value={editContent} 
                               onChange={(e) => setEditContent(e.target.value)}
                               className="w-full bg-transparent outline-none text-gray-800 dark:text-white mb-2"
                               autoFocus
                             />
                             <div className="flex justify-end gap-2">
                                <button onClick={cancelEditing} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><CloseIcon /></button>
                                <button onClick={saveMessageEdit} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><CheckIcon /></button>
                             </div>
                          </div>
                       ) : (
                          <div className={`
                             relative px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm max-w-full break-words
                             ${isMe 
                               ? 'bg-blue-600 text-white rounded-tr-sm' 
                               : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm'}
                          `}>
                             {msg.text}

                             {/* Metadata & Actions */}
                             <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'justify-end text-blue-100' : 'justify-start text-gray-400'}`}>
                                <button 
                                  onClick={() => playAudio(msg.text, msg.id)}
                                  className={`hover:text-white transition-colors ${currentlyPlayingId === msg.id ? 'animate-pulse text-white' : ''}`}
                                >
                                   <SpeakerIcon playing={currentlyPlayingId === msg.id} />
                                </button>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(msg.text)}
                                  className="hover:text-white transition-colors"
                                >
                                   <CopyIcon />
                                </button>
                                <span className="text-[10px] opacity-70">
                                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className={`text-[9px] font-bold px-1 rounded ${isMe ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                   {msg.language.toUpperCase()}
                                </span>
                             </div>

                             {/* Owner Actions */}
                             {isMe && (
                                <div className="absolute -top-3 -right-2 hidden group-hover:flex bg-white dark:bg-gray-800 shadow-md rounded-lg border border-gray-100 dark:border-gray-700 p-1 gap-1">
                                   <button onClick={() => startEditing(msg)} className="p-1 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                                      <EditIcon />
                                   </button>
                                   <button onClick={() => handleDeleteMessage(msg.id)} className="p-1 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                      <TrashIcon />
                                   </button>
                                </div>
                             )}
                          </div>
                       )}
                    </div>
                 </div>
              </div>
             );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Footer Input */}
      <footer className="w-full max-w-2xl p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 sticky bottom-0 z-30 transition-colors">
        
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-100 dark:border-gray-700 p-2 w-64 h-64 overflow-y-auto grid grid-cols-6 gap-1 z-50 animate-scale-up">
             {EMOJI_LIST.map(emoji => (
               <button 
                 key={emoji} 
                 onClick={() => onEmojiClick(emoji)}
                 className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 text-xl transition-colors"
               >
                 {emoji}
               </button>
             ))}
          </div>
        )}

        <div className="relative flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-[24px] shadow-inner border border-gray-200 dark:border-gray-600 transition-colors">
          
          <button 
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <EmojiIcon />
          </button>

          {isListening ? (
             <div className="flex-1 h-10 flex items-center justify-center relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <canvas ref={canvasRef} width="300" height="40" className="w-full h-full absolute inset-0"></canvas>
                <span className="relative z-10 text-xs font-bold text-red-500 animate-pulse bg-white/80 dark:bg-black/50 px-2 py-0.5 rounded">
                   {t('processing')}...
                </span>
             </div>
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('type_message')}
              className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-white placeholder-gray-400 px-2 font-medium"
              disabled={isTranslating}
            />
          )}

          <div className="flex items-center gap-1">
             <button
                onClick={toggleListening}
                className={`p-3 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-none scale-105' : 'text-gray-400 hover:text-blue-500 hover:bg-white dark:hover:bg-gray-600'}`}
             >
                <MicIcon active={isListening} processing={isProcessingAudio} />
             </button>

             <button
                onClick={handleSend}
                disabled={!inputText.trim() || isTranslating}
                className={`p-3 rounded-full transition-all duration-200 ${inputText.trim() ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95' : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'}`}
             >
                {isTranslating ? (
                  <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <SendIcon />
                )}
             </button>
          </div>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Powered by <span className="text-blue-500">Gemini 2.5 Flash</span> • {settings.nativeLanguage === 'sr' ? 'Serbian' : settings.nativeLanguage === 'tr' ? 'Turkish' : (settings.nativeLanguage as string).toUpperCase()}
           </p>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    autoPlay: true,
    voiceName: 'Kore',
    speechRate: 1.0,
    noiseSuppression: true,
    theme: 'dark',
    nativeLanguage: Language.SERBIAN
  });

  // Fetch settings when user logs in to set correct language context
  useEffect(() => {
    if (currentUser) {
      const settingsRef = doc(dbFirestore, "settings", currentUser.uid);
      getDoc(settingsRef).then((docSnap) => {
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() } as AppSettings));
        }
      });
    }
  }, [currentUser]);

  return (
    <LanguageProvider value={settings.nativeLanguage || 'sr'}>
      <AppMain settings={settings} setSettings={setSettings} />
    </LanguageProvider>
  );
};

export default App;