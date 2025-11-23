
import React, { useState, useEffect } from 'react';
import { db, dbFirestore } from './services/firebase';
import { ref, onValue, remove, push } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { ChatRoom, UserProfile, ChatMessage, Language } from './types';
import { useAuth } from './contexts/AuthContext';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from './hooks/useTranslation';

interface RoomMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom | null;
}

const RoomMembersModal: React.FC<RoomMembersModalProps> = ({ isOpen, onClose, room }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    userToKick: UserProfile | null;
  }>({ isOpen: false, userToKick: null });

  useEffect(() => {
    if (isOpen && room) {
      setLoading(true);
      const membersRef = ref(db, `chatRooms/${room.id}/members`);
      const unsubscribe = onValue(membersRef, async (snapshot) => {
        const membersData = snapshot.val();
        if (membersData) {
          const memberIds = Object.keys(membersData);
          const profiles: UserProfile[] = [];

          for (const uid of memberIds) {
             const userDoc = await getDoc(doc(dbFirestore, "users", uid));
             if (userDoc.exists()) {
                profiles.push(userDoc.data() as UserProfile);
             }
          }
          setMembers(profiles);
        } else {
          setMembers([]);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, room]);

  const confirmKickUser = (user: UserProfile) => {
    setConfirmConfig({ isOpen: true, userToKick: user });
  };

  const handleKickUser = async () => {
      const userToKick = confirmConfig.userToKick;
      if (!currentUser || !room || !userToKick) return;
      
      try {
          await remove(ref(db, `chatRooms/${room.id}/members/${userToKick.uid}`));

          const messagesRef = ref(db, `chats/${room.id}/messages`);
          const timestamp = Date.now();
          const systemMsg: ChatMessage = {
              id: timestamp.toString(),
              text: `${userToKick.displayName || userToKick.email} removed.`,
              isUser: false, 
              language: Language.SERBIAN,
              timestamp: timestamp,
              senderId: 'SYSTEM'
          };
          await push(messagesRef, systemMsg);

      } catch (error) {
          console.error("Error kicking user:", error);
          alert(t('error'));
      }
      setConfirmConfig({ isOpen: false, userToKick: null });
  };

  if (!isOpen || !room) return null;

  const isOwner = room.createdBy === currentUser?.uid;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ isOpen: false, userToKick: null })}
        onConfirm={handleKickUser}
        title={t('kick_user')}
        message={`Remove ${confirmConfig.userToKick?.displayName || confirmConfig.userToKick?.email}?`}
        confirmText={t('confirm')}
        isDanger={true}
      />

      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-colors duration-200">
        
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('room_members')}</h2>
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
          ) : members.length === 0 ? (
             <p className="text-center p-4 text-gray-500 text-sm">{t('no_members')}</p>
          ) : (
             <div className="space-y-1">
               {members.map(member => {
                 const name = member.displayName || member.email || "User";
                 const initial = name.substring(0, 2).toUpperCase();
                 const isMemberOwner = member.uid === room.createdBy;

                 return (
                   <div key={member.uid} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {member.photoURL ? (
                          <img src={member.photoURL} className="w-9 h-9 rounded-full object-cover" alt={name} />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                            {initial}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                             <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex items-center gap-1">
                                {name}
                                {isMemberOwner && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">{t('owner')}</span>}
                             </span>
                             {member.uid === currentUser?.uid && <span className="text-[10px] text-gray-400"> ({t('you')})</span>}
                        </div>
                      </div>
                      
                      {isOwner && !isMemberOwner && (
                        <button
                          onClick={() => confirmKickUser(member)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title={t('kick_user')}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      )}
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

export default RoomMembersModal;