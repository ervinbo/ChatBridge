
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, dbFirestore } from '../services/firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
  signInWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, nativeLanguage?: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      // Save/Update user profile in Firestore on login
      if (user) {
        const userRef = doc(dbFirestore, "users", user.uid);
        try {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            lastSeen: Date.now(),
            ...(user.displayName ? { displayName: user.displayName } : {}),
            ...(user.photoURL ? { photoURL: user.photoURL } : {})
          }, { merge: true });
        } catch (e) {
          console.error("Error updating user profile in Firestore:", e);
        }
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (rememberMe: boolean = true) => {
    try {
      const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceMode);
      
      if (rememberMe) {
        localStorage.setItem('gemini_is_logged_in', 'true');
      } else {
        localStorage.removeItem('gemini_is_logged_in');
      }

      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      handleAuthError(error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string, rememberMe: boolean = true) => {
    try {
      const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceMode);

      if (rememberMe) {
        localStorage.setItem('gemini_is_logged_in', 'true');
      } else {
        localStorage.removeItem('gemini_is_logged_in');
      }

      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Error signing in with Email", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, nativeLanguage: string = 'sr') => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      localStorage.setItem('gemini_is_logged_in', 'true');
      
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = credential.user;

      if (user) {
         // Save settings immediately
         const settingsRef = doc(dbFirestore, "settings", user.uid);
         await setDoc(settingsRef, { 
             nativeLanguage: nativeLanguage,
             theme: 'dark', // default
             autoPlay: true,
             voiceName: 'Kore',
             speechRate: 1.0,
             noiseSuppression: true
         }, { merge: true });
      }

    } catch (error: any) {
      console.error("Error signing up", error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    
    const userRef = doc(dbFirestore, "users", currentUser.uid);
    try {
      await setDoc(userRef, data, { merge: true });
      
      if (data.displayName || data.photoURL) {
        await updateProfile(currentUser, {
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL
        });
        
        const updatedUser = Object.create(Object.getPrototypeOf(currentUser));
        Object.assign(updatedUser, currentUser);
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const handleAuthError = (error: any) => {
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      alert(
        `GREŠKA: Domena aplikacije ("${currentDomain}") nije autorizovana.\n\n` +
        `1. Idite na Firebase Console -> Authentication -> Settings -> Authorized Domains\n` +
        `2. Kliknite na "Add Domain"\n` +
        `3. Dodajte: ${currentDomain}`
      );
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('gemini_is_logged_in');
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    updateUserProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};