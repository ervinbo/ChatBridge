
import React, { useEffect, useState } from 'react';
import { db, dbFirestore } from './services/firebase';
import { ref, onValue, push, remove } from 'firebase/database';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from './contexts/AuthContext';
import { UserProfile, ChatMeta, ChatRoom } from './types';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from './hooks/useTranslation';

interface ContactsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (user: UserProfile) => void;
  onSelectRoom: (room: ChatRoom) => void;
  selectedContactId?: string;
  selectedRoomId?: string;
}

// --- Sub-component: Contact Item ---
const ContactItem: React.FC<{ 
  user: UserProfile; 
  currentUid: string; 
  isSelected: boolean; 
  onSelect: (user: UserProfile) => void;
  t: (key: string) => string;
}> = ({ user, currentUid, isSelected, onSelect, t }) => {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    // Determine Chat ID
    const chatId = [currentUid, user.uid].sort().join('_');
    const metaRef = ref(db, `chats/${chatId}/meta`);
    const unsubscribe = onValue(metaRef, (snapshot) => {
      const data = snapshot.val() as ChatMeta;
      if (data) {
        const lastMsgTime = data.lastMessageTimestamp || 0;
        const mySeenTime = data.seenBy?.[currentUid] || 0;
        const senderId = data.lastSenderId;
        
        if (!isSelected && senderId && senderId !== currentUid && lastMsgTime > mySeenTime) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      }
    });
    return () => unsubscribe();
  }, [user.uid, currentUid, isSelected]);

  const getInitials = (u: UserProfile) => {
    const name = u.displayName || u.email || "?";
    return name.substring(0, 2).toUpperCase();
  };

  const getDisplayName = (u: UserProfile) => {
    return u.displayName || u.email || "User";
  };

  return (
    <div 
      onClick={() => onSelect(user)} 
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group relative ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'}`}
    >
      <div className="relative shrink-0">
        {user.photoURL ? (
          <img src={user.photoURL} alt={getDisplayName(user)} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-800">
            {getInitials(user)}
          </div>
        )}
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-medium truncate transition-colors ${hasUnread ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
            {getDisplayName(user)}
          </p>
          {hasUnread && (
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </div>
        <p className={`text-xs truncate ${hasUnread ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
          {hasUnread ? t('new_message') : t('click_to_chat')}
        </p>
      </div>
    </div>
  );
};

// --- Sub-component: Room Item ---
const RoomItem: React.FC<{ 
  room: ChatRoom; 
  currentUid: string; 
  isSelected: boolean; 
  onSelect: (room: ChatRoom) => void;
  onDelete: (roomId: string) => void;
  t: (key: string) => string;
}> = ({ room, currentUid, isSelected, onSelect, onDelete, t }) => {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const metaRef = ref(db, `chats/${room.id}/meta`);
    const unsubscribe = onValue(metaRef, (snapshot) => {
      const data = snapshot.val() as ChatMeta;
      if (data) {
        const lastMsgTime = data.lastMessageTimestamp || 0;
        const mySeenTime = data.seenBy?.[currentUid] || 0;
        const senderId = data.lastSenderId;

        if (!isSelected && senderId && senderId !== currentUid && lastMsgTime > mySeenTime) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      }
    });
    return () => unsubscribe();
  }, [room.id, currentUid, isSelected]);

  return (
    <div 
      onClick={() => onSelect(room)} 
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group relative ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'}`}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 flex items-center justify-center font-bold border border-orange-200 dark:border-orange-800">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-medium truncate transition-colors ${hasUnread ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-800 dark:text-gray-200'}`}>
            {room.name}
          </p>
          {hasUnread && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {room.createdBy === currentUid ? t('owner') : t('member')}
        </p>
      </div>
      
      {room.createdBy === currentUid && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(room.id);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          title={t('delete_room')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      )}
    </div>
  );
};

const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onSelectContact, 
  onSelectRoom,
  selectedContactId,
  selectedRoomId
}) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  
  const [activeTab, setActiveTab] = useState<'users' | 'rooms'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Fetch Users from Firestore
  useEffect(() => {
    if (!isOpen) return;
    
    // Listen to 'users' collection in Firestore
    const usersCollection = collection(dbFirestore, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
        const userList: UserProfile[] = [];
        snapshot.forEach((doc) => {
           userList.push(doc.data() as UserProfile);
        });
        const filteredUsers = userList.filter(u => u && u.uid && u.uid !== currentUser?.uid);
        setUsers(filteredUsers);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  // Fetch Rooms (from Realtime DB)
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const roomsRef = ref(db, 'chatRooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
       const data = snapshot.val();
       if (data) {
         const roomList = Object.entries(data).map(([key, val]: [string, any]) => ({
             ...val,
             id: key
         }));

         const myRooms = roomList.filter(room => 
             room.members && room.members[currentUser.uid] === true
         );

         myRooms.sort((a, b) => b.createdAt - a.createdAt);
         setRooms(myRooms);
       } else {
         setRooms([]);
       }
    });
    return () => unsubscribe();
  }, [isOpen, currentUser]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !currentUser) return;
    
    const roomsRef = ref(db, 'chatRooms');
    await push(roomsRef, {
      name: newRoomName.trim(),
      createdBy: currentUser.uid,
      createdAt: Date.now(),
      members: { [currentUser.uid]: true }
    });
    
    setNewRoomName('');
    setShowCreateRoom(false);
  };

  const confirmDeleteRoom = (roomId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: t('confirm_delete_room'),
      message: t('confirm_delete_room_msg'),
      onConfirm: async () => {
        try {
          const roomRef = ref(db, `chatRooms/${roomId}`);
          const messagesRef = ref(db, `chats/${roomId}`);
          await remove(roomRef);
          await remove(messagesRef);
        } catch (error) {
          console.error("Error deleting room", error);
          alert(t('error'));
        }
      }
    });
  };

  const handleSelectContact = (user: UserProfile) => {
    onSelectContact(user);
    onClose();
  };

  const handleSelectRoom = (room: ChatRoom) => {
     onSelectRoom(room);
     onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <ConfirmationModal 
         isOpen={confirmConfig.isOpen}
         onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
         onConfirm={confirmConfig.onConfirm}
         title={confirmConfig.title}
         message={confirmConfig.message}
         confirmText={t('delete_room')}
         isDanger={true}
      />

      <div className="relative w-full max-w-xs h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right transition-colors duration-200">
        
        <div className="p-4 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('contacts')}</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            {t('users')}
          </button>
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'rooms' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50 dark:bg-orange-900/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
            {t('rooms')}
          </button>
        </div>

        {activeTab === 'rooms' && (
           <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              {!showCreateRoom ? (
                 <button 
                   onClick={() => setShowCreateRoom(true)}
                   className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-medium hover:border-orange-400 hover:text-orange-500 transition-colors flex items-center justify-center gap-2"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    {t('create_room')}
                 </button>
              ) : (
                 <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder={t('room_name')} 
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <button 
                      onClick={handleCreateRoom}
                      disabled={!newRoomName.trim()}
                      className="p-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button 
                       onClick={() => setShowCreateRoom(false)}
                       className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                 </div>
              )}
           </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {activeTab === 'users' ? (
             loading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-3">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-400">{t('loading')}</span>
                </div>
             ) : users.length === 0 ? (
                <div className="text-center p-8 text-gray-400 dark:text-gray-500">
                   <p>{t('no_users')}</p>
                </div>
             ) : (
               <div className="space-y-1">
                 {users.map((user) => (
                   <ContactItem 
                     key={user.uid} 
                     user={user} 
                     currentUid={currentUser?.uid || ''}
                     isSelected={user.uid === selectedContactId}
                     onSelect={handleSelectContact} 
                     t={t}
                   />
                 ))}
               </div>
             )
          ) : (
             rooms.length === 0 ? (
                <div className="text-center p-8 text-gray-400 dark:text-gray-500">
                   <p>{t('no_rooms')}</p>
                </div>
             ) : (
                <div className="space-y-1">
                   {rooms.map(room => (
                      <RoomItem 
                        key={room.id} 
                        room={room} 
                        currentUid={currentUser?.uid || ''}
                        isSelected={room.id === selectedRoomId}
                        onSelect={handleSelectRoom}
                        onDelete={confirmDeleteRoom}
                        t={t}
                      />
                   ))}
                </div>
             )
          )}
        </div>
        
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default ContactsSidebar;