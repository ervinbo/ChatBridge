
import React, { useEffect, useState } from 'react';
import { db } from './services/firebase';
import { ref, update, remove, push, onValue, get } from 'firebase/database';
import { useAuth } from './contexts/AuthContext';
import { RoomInvitation, ChatMessage, Language, ChatRoom } from './types';
import { useTranslation } from './hooks/useTranslation';

interface IncomingInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (room: ChatRoom) => void;
}

const IncomingInviteModal: React.FC<IncomingInviteModalProps> = ({ isOpen, onClose, onJoin }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState<RoomInvitation[]>([]);

  useEffect(() => {
    if (currentUser) {
      const invitesRef = ref(db, `users/${currentUser.uid}/invitations`);
      const unsubscribe = onValue(invitesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const inviteList: RoomInvitation[] = Object.values(data);
          inviteList.sort((a, b) => b.timestamp - a.timestamp);
          setInvitations(inviteList);
        } else {
          setInvitations([]);
          if (isOpen) onClose();
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, isOpen, onClose]);

  const handleAccept = async (invite: RoomInvitation) => {
    if (!currentUser) return;
    try {
        const memberRef = ref(db, `chatRooms/${invite.roomId}/members`);
        await update(memberRef, { [currentUser.uid]: true });

        const inviteRef = ref(db, `users/${currentUser.uid}/invitations/${invite.roomId}`);
        await remove(inviteRef);

        const messagesRef = ref(db, `chats/${invite.roomId}/messages`);
        const timestamp = Date.now();
        const systemMsg: ChatMessage = {
            id: timestamp.toString(),
            text: `${currentUser.displayName || currentUser.email} joined.`,
            isUser: false, 
            language: Language.SERBIAN,
            timestamp: timestamp,
            senderId: 'SYSTEM'
        };
        await push(messagesRef, systemMsg);

        const roomSnapshot = await get(ref(db, `chatRooms/${invite.roomId}`));
        if (roomSnapshot.exists()) {
            const roomData = roomSnapshot.val();
            const roomObj: ChatRoom = {
                id: invite.roomId,
                name: roomData.name,
                createdBy: roomData.createdBy,
                createdAt: roomData.createdAt
            };
            onJoin(roomObj);
            onClose();
        }

    } catch (error) {
        console.error("Error accepting invite:", error);
    }
  };

  const handleDecline = async (invite: RoomInvitation) => {
    if (!currentUser) return;
    try {
        const inviteRef = ref(db, `users/${currentUser.uid}/invitations/${invite.roomId}`);
        await remove(inviteRef);
    } catch (error) {
        console.error("Error declining invite:", error);
    }
  };

  if (!isOpen || invitations.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-200">
          
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
               </div>
               <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('join_room_invite')}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('new_message')}</p>
               </div>
             </div>
          </div>

          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
             {invitations.map((invite) => (
               <div key={invite.roomId} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-700/30 shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                     <span className="font-bold text-gray-900 dark:text-white">{invite.invitedBy}</span> {t('has_invited_you')}
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4 truncate">
                     {invite.roomName}
                  </p>
                  
                  <div className="flex gap-2">
                     <button 
                       onClick={() => handleDecline(invite)}
                       className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                     >
                        {t('decline')}
                     </button>
                     <button 
                       onClick={() => handleAccept(invite)}
                       className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md transition-colors"
                     >
                        {t('accept')}
                     </button>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-center">
             <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                {t('close')}
             </button>
          </div>
       </div>
    </div>
  );
};

export default IncomingInviteModal;
