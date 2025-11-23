
import React, { useState } from 'react';
import { AppSettings } from './types';
import { useAuth } from './contexts/AuthContext';
import { requestForToken } from './services/firebase';
import { seedLanguages } from './services/languageSeeder';
import ConfirmationModal from './ConfirmationModal';
import { useTranslation } from './hooks/useTranslation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const VOICE_OPTIONS = [
  { value: 'Kore', label: 'Kore (Ženski, Balansiran)' },
  { value: 'Zephyr', label: 'Zephyr (Ženski, Mekan)' },
  { value: 'Puck', label: 'Puck (Muški, Neutralan)' },
  { value: 'Fenrir', label: 'Fenrir (Muški, Dubok)' },
  { value: 'Charon', label: 'Charon (Muški, Autoritativan)' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [seedingStatus, setSeedingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleEnableNotifications = async () => {
    if (!currentUser) return;
    setNotificationStatus('loading');
    const success = await requestForToken(currentUser.uid);
    if (success) {
      setNotificationStatus('success');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    } else {
      setNotificationStatus('error');
      setTimeout(() => setNotificationStatus('idle'), 3000);
    }
  };

  const handleSeedLanguages = () => {
    setConfirmConfig({
      isOpen: true,
      title: t('seed_db'),
      message: "Ovo će upisati/resetovati listu jezika u bazi podataka. Da li ste sigurni?",
      onConfirm: async () => {
        setSeedingStatus('loading');
        const success = await seedLanguages();
        if (success) {
          setSeedingStatus('success');
          setTimeout(() => setSeedingStatus('idle'), 3000);
        } else {
          setSeedingStatus('error');
          setTimeout(() => setSeedingStatus('idle'), 3000);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={t('confirm')}
        isDanger={true}
      />

      <div className="bg-white dark:bg-gray-800 w-full sm:w-[480px] h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-slide-up sm:animate-fade-in overflow-hidden transition-colors duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('settings')}</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Appearance Section */}
          <section>
             <h3 className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-4">{t('appearance')}</h3>
             <div className="bg-gray-50 dark:bg-gray-700/50 p-1 rounded-xl flex">
               <button
                 onClick={() => setLocalSettings({...localSettings, theme: 'light'})}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                    localSettings.theme === 'light' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                 }`}
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                 {t('light')}
               </button>
               <button
                 onClick={() => setLocalSettings({...localSettings, theme: 'dark'})}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
                    localSettings.theme === 'dark' 
                      ? 'bg-gray-600 text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                 }`}
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                 {t('dark')}
               </button>
             </div>
          </section>

          {/* Audio Section */}
          <section>
            <h3 className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-4">{t('audio_speech')}</h3>
            
            <div className="space-y-6">
              {/* Noise Suppression Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-gray-800 dark:text-white font-medium">{t('noise_suppression')}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('noise_desc')}</span>
                </div>
                <button 
                  onClick={() => setLocalSettings({...localSettings, noiseSuppression: !localSettings.noiseSuppression})}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localSettings.noiseSuppression ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.noiseSuppression ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Auto Play Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-gray-800 dark:text-white font-medium">{t('auto_play')}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('auto_play_desc')}</span>
                </div>
                <button 
                  onClick={() => setLocalSettings({...localSettings, autoPlay: !localSettings.autoPlay})}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${localSettings.autoPlay ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${localSettings.autoPlay ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Voice Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-800 dark:text-white font-medium">{t('voice')}</label>
                <select 
                  value={localSettings.voiceName}
                  onChange={(e) => setLocalSettings({...localSettings, voiceName: e.target.value})}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 dark:text-white"
                >
                  {VOICE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Speed Slider */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-gray-800 dark:text-white font-medium">{t('speech_rate')}</label>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {localSettings.speechRate}x
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.75" 
                  max="1.5" 
                  step="0.05"
                  value={localSettings.speechRate}
                  onChange={(e) => setLocalSettings({...localSettings, speechRate: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 px-1">
                  <span>{t('slow')}</span>
                  <span>{t('normal')}</span>
                  <span>{t('fast')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          {currentUser && (
            <section className="pt-4 border-t border-gray-100 dark:border-gray-700">
               <h3 className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-4">{t('notifications')}</h3>
               <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                   <span className="text-gray-800 dark:text-white font-medium">{t('push_notifications')}</span>
                   <span className="text-sm text-gray-500 dark:text-gray-400">{t('push_desc')}</span>
                 </div>
                 <button 
                   onClick={handleEnableNotifications}
                   disabled={notificationStatus === 'loading' || notificationStatus === 'success'}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors 
                     ${notificationStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                       notificationStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 
                       'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                 >
                    {notificationStatus === 'loading' ? t('loading') : 
                     notificationStatus === 'success' ? t('enabled') : 
                     notificationStatus === 'error' ? t('error') : t('enable')}
                 </button>
               </div>
               {notificationStatus === 'error' && (
                 <p className="text-xs text-red-500 mt-2">
                   Error: Permissions or VAPID key.
                 </p>
               )}
            </section>
          )}

          {/* Admin / DB Tools Section */}
          {currentUser && (
            <section className="pt-4 border-t border-gray-100 dark:border-gray-700">
               <h3 className="text-sm uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-4">{t('admin_tools')}</h3>
               <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                 <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-orange-800 dark:text-orange-300 text-sm">{t('language_db')}</span>
                 </div>
                 <button 
                   onClick={handleSeedLanguages}
                   disabled={seedingStatus === 'loading'}
                   className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                     seedingStatus === 'success' ? 'bg-green-500 text-white' : 
                     seedingStatus === 'error' ? 'bg-red-500 text-white' :
                     'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-300 dark:hover:bg-orange-700'
                   }`}
                 >
                   {seedingStatus === 'loading' ? t('processing') : 
                    seedingStatus === 'success' ? t('success') :
                    seedingStatus === 'error' ? t('error') : t('seed_db')}
                 </button>
               </div>
            </section>
          )}

          {/* About Section */}
          <section className="pt-4 border-t border-gray-100 dark:border-gray-700">
             <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200 flex gap-3 items-start">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
               <p>
                 {t('app_desc')}
               </p>
             </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 shrink-0 pb-8 sm:pb-4">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
          >
            {t('save_changes')}
          </button>
        </div>

      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default SettingsModal;
