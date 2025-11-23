
import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { dbFirestore } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useTranslation } from './hooks/useTranslation';
import { LanguageProvider } from './contexts/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path>
  </svg>
);

const AuthForm: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  // We use local language state here for unauthenticated user flow, 
  // but wrap this component in LanguageProvider so the hook picks it up.
  // Actually, the wrapper below handles it.
  const { t } = useTranslation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New: Native Language selection during registration
  // We use the LanguageProvider in the parent to control the text
  // BUT we need a state here to *change* the LanguageProvider value in the wrapper
  // This is handled by the wrapper component's state.

  useEffect(() => {
    if (isOpen) {
      const persistedPref = localStorage.getItem('gemini_is_logged_in');
      if (persistedPref === 'true') {
        setRememberMe(true);
      }
    }
  }, [isOpen]);
  
  // We access the setters from the wrapper component using props if we pass them?
  // No, we will define the language state in the Wrapper and pass setLanguage here?
  // Let's assume the wrapper passes `setLocalLang` via props?
  // We need to fetch languages list too.

  return null; // Logic moved to Wrapper
};

const AuthModalContent: React.FC<{ onClose: () => void, localLang: string, setLocalLang: (l: string) => void }> = ({ onClose, localLang, setLocalLang }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const { t } = useTranslation();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);

  useEffect(() => {
    // Load languages for dropdown
    const fetchLangs = async () => {
      try {
         const colRef = collection(dbFirestore, 'languages');
         const snap = await getDocs(colRef);
         const list: LanguageOption[] = [];
         snap.forEach(doc => {
            const d = doc.data();
            list.push({ code: d.code, name: d.name, nativeName: d.nativeName });
         });
         // Fallback if empty
         if (list.length === 0) {
            list.push({ code: 'sr', name: 'Srpski', nativeName: 'Српски' });
            list.push({ code: 'tr', name: 'Turski', nativeName: 'Türkçe' });
            list.push({ code: 'en', name: 'Engleski', nativeName: 'English' });
         }
         setAvailableLanguages(list);
      } catch (e) { console.error(e); }
    };
    fetchLangs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password, rememberMe);
      } else {
        await signUpWithEmail(email, password, localLang);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError("Neispravan email ili lozinka.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Ovaj email se već koristi.");
      } else if (err.code === 'auth/weak-password') {
        setError("Lozinka mora imati bar 6 karaktera.");
      } else {
        setError("Došlo je do greške. Pokušajte ponovo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle(rememberMe);
      onClose();
    } catch (err) {
      // Error handled in context
    }
  };

  return (
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in transition-colors duration-200">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            {t('login')}
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            {t('register')}
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            {isLogin ? t('welcome_back') : t('create_account')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center">
              <svg className="w-4 h-4 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="vase@ime.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
              <input 
                type="password" 
                required 
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>

            {/* Language Selector for Registration */}
            {!isLogin && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('select_language')}</label>
                  <select
                    required
                    value={localLang}
                    onChange={(e) => setLocalLang(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-white cursor-pointer"
                  >
                     {availableLanguages.map(l => (
                       <option key={l.code} value={l.code}>{l.nativeName} ({l.name})</option>
                     ))}
                  </select>
               </div>
            )}

            {isLogin && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer">
                  {t('remember_me')}
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                 <span className="flex items-center justify-center gap-2">
                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   {t('processing')}
                 </span>
              ) : (
                 isLogin ? t('login') : t('register')
              )}
            </button>
          </form>

          <div className="mt-6 relative flex items-center justify-center">
             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
             <span className="relative bg-white dark:bg-gray-800 px-4 text-xs text-gray-400 uppercase tracking-wider">{t('or_continue_with')}</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            type="button"
            className="mt-6 w-full py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Google
          </button>
          
          <button 
             onClick={onClose}
             className="mt-6 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 block mx-auto transition-colors"
          >
            {t('cancel')}
          </button>

        </div>
      </div>
  );
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [localLang, setLocalLang] = useState('sr'); // Default default

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <LanguageProvider value={localLang}>
         <AuthModalContent onClose={onClose} localLang={localLang} setLocalLang={setLocalLang} />
      </LanguageProvider>
    </div>
  );
};

export default AuthModal;