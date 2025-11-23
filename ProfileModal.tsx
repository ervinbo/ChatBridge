
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { AppSettings, Language, UserProfile } from './types';
import { dbFirestore } from './services/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTranslation } from './hooks/useTranslation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile, logout } = useAuth();
  const { t } = useTranslation();
  
  const [displayName, setDisplayName] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState<string>('sr');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);

  useEffect(() => {
    // Load available languages
    const fetchLangs = async () => {
        try {
            const colRef = collection(dbFirestore, 'languages');
            const snap = await getDocs(colRef);
            const list: LanguageOption[] = [];
            snap.forEach(doc => {
               const d = doc.data();
               list.push({ code: d.code, name: d.name, nativeName: d.nativeName });
            });
            if (list.length > 0) setAvailableLanguages(list);
            else setAvailableLanguages([
                { code: 'sr', name: 'Srpski', nativeName: 'Српски' },
                { code: 'tr', name: 'Turski', nativeName: 'Türkçe' },
                { code: 'en', name: 'Engleski', nativeName: 'English' }
            ]);
        } catch (e) { console.error(e); }
    };
    fetchLangs();
  }, []);

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      
      const userRef = doc(dbFirestore, "users", currentUser.uid);
      getDoc(userRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setDisplayName(data.displayName || currentUser.displayName || '');
        } else {
          setDisplayName(currentUser.displayName || '');
        }
      });

      const settingsRef = doc(dbFirestore, "settings", currentUser.uid);
      getDoc(settingsRef).then((docSnap) => {
          if (docSnap.exists()) {
              const settings = docSnap.data() as AppSettings;
              if (settings.nativeLanguage) {
                  setNativeLanguage(settings.nativeLanguage);
              }
          }
      });

      setLoading(false);
      setPreviewImage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await updateUserProfile({
        displayName
      });

      const settingsRef = doc(dbFirestore, "settings", currentUser.uid);
      await setDoc(settingsRef, { nativeLanguage }, { merge: true });

      setMessage({ type: 'success', text: t('success') });
      setTimeout(() => {
         onClose();
         setMessage(null);
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: t('error') });
    } finally {
      setLoading(false);
    }
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return;
    
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    const storage = getStorage();
    const imageRef = storageRef(storage, `profile_images/${currentUser.uid}`);
    
    setLoading(true);
    try {
      await uploadBytes(imageRef, file);
      const photoURL = await getDownloadURL(imageRef);
      await updateUserProfile({ photoURL });
      setMessage({ type: 'success', text: t('success') });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: t('error') });
      setPreviewImage(null); 
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const displayImage = previewImage || currentUser.photoURL;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('profile')}</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer">
              {displayImage ? (
                <img src={displayImage} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-700 shadow-lg object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-2xl font-bold border-4 border-white dark:border-gray-700 shadow-lg">
                  {displayName.substring(0,2).toUpperCase() || "JA"}
                </div>
              )}
              {/* Overlay for upload */}
              <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                 <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-center ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
               {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('display_name')}</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white placeholder-gray-400"
                placeholder={t('display_name')}
              />
            </div>

            {/* Native Language Selector */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
                {t('native_language')}
              </label>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                {t('native_language_desc')}
              </p>
              
              <select
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              >
                  {availableLanguages.map(l => (
                     <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
                  ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white font-medium rounded-lg shadow-lg transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? t('processing') : t('save_changes')}
            </button>
          </form>

          <div className="mt-8 border-t border-gray-100 dark:border-gray-700 pt-4">
             <button 
               onClick={handleLogout}
               className="w-full py-2 text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
             >
               {t('sign_out')}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileModal;