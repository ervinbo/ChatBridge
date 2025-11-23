
import React, { useState, useEffect } from 'react';
import { db, dbFirestore } from './services/firebase';
import { ref, update } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { UserProfile, ChatRoom } from './types';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from './hooks/useTranslation';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom | null;
}

const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, room }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedUsers, setInvitedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      // Fetch users from Firestore
      const usersCollection = collection(dbFirestore, 'users');
      const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
        const userList: UserProfile[] = [];
        snapshot.forEach(doc => userList.push(doc.data() as UserProfile));
        
        // Filter out myself
        const filtered = userList.filter(u => u.uid !== currentUser.uid);
        setUsers(filtered);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, currentUser]);

  const handleSendInvite = async (targetUser: UserProfile) => {
    if (!currentUser || !room) return;

    try {
      // Write to the target user's invitations node in Realtime DB
      const invitationRef = ref(db, `users/${targetUser.uid}/invitations/${room.id}`);
      
      await update(invitationRef, {
        roomId: room.id,
        roomName: room.name,
        invitedBy: currentUser.displayName || currentUser.email || "User",
        timestamp: Date.now()
      });

      setInvitedUsers(prev => ({ ...prev, [targetUser.uid]: true }));

    } catch (error) {
      console.error("Error sending invite:", error);
      alert(t('error'));
    }
  };

  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-200">
        
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('invite_user')}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{room.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
             <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : users.length === 0 ? (
             <p className="text-center p-4 text-gray-500 text-sm">{t('no_users')}</p>
          ) : (
             <div className="space-y-1">
               {users.map(user => {
                 const isInvited = invitedUsers[user.uid];
                 const name = user.displayName || user.email || "Korisnik";
                 const initial = name.substring(0, 2).toUpperCase();

                 return (
                   <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {user.photoURL ? (
                          <img src={user.photoURL} className="w-8 h-8 rounded-full object-cover" alt={name} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {initial}
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {name}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleSendInvite(user)}
                        disabled={isInvited}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                          isInvited 
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                      >
                        {isInvited ? t('invite_sent') : t('invite')}
                      </button>
                   </div>
                 );
               })}
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default InviteModal;