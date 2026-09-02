import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { TwoFactorModal } from './components/TwoFactorModal';
import { SafetyNumberModal } from './components/SafetyNumberModal';
import { GroupModal } from './components/GroupModal';
import { NewChatModal } from './components/NewChatModal';
import { ScheduledMessagesDrawer } from './components/ScheduledMessagesDrawer';
import { SelfHostDocsModal } from './components/SelfHostDocsModal';
import { SettingsModal } from './components/SettingsModal';

function MainLayout() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { activeConversation, setActiveConversationId } = useChat();

  // Modals
  const [showNewChat, setShowNewChat] = useState<boolean>(false);
  const [showNewGroup, setShowNewGroup] = useState<boolean>(false);
  const [showScheduled, setShowScheduled] = useState<boolean>(false);
  const [show2FA, setShow2FA] = useState<boolean>(false);
  const [showSafetyNumber, setShowSafetyNumber] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  if (!isAuthenticated || !user) {
    return <AuthModal />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">
      {/* Sidebar: hidden on mobile if conversation is selected */}
      <div className={`h-full ${activeConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenNewGroup={() => setShowNewGroup(true)}
          onOpenScheduled={() => setShowScheduled(true)}
          onOpen2FA={() => setShow2FA(true)}
          onOpenDocs={() => setShowDocs(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Chat Area: hidden on mobile if no conversation selected */}
      <div className={`flex-1 h-full ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <ChatArea
          onOpenSafetyNumber={() => setShowSafetyNumber(true)}
          onBackToSidebar={() => setActiveConversationId(null)}
        />
      </div>

      {/* Modal Dialogs */}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <GroupModal onClose={() => setShowNewGroup(false)} />}
      {showScheduled && <ScheduledMessagesDrawer onClose={() => setShowScheduled(false)} />}
      {showDocs && <SelfHostDocsModal onClose={() => setShowDocs(false)} />}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpen2FA={() => {
            setShowSettings(false);
            setShow2FA(true);
          }}
        />
      )}
      {show2FA && (
        <TwoFactorModal
          user={user}
          onClose={() => setShow2FA(false)}
          onUpdateUser={updateUser}
        />
      )}
      {showSafetyNumber && activeConversation && (
        <SafetyNumberModal
          currentUser={user}
          conversation={activeConversation}
          onClose={() => setShowSafetyNumber(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainLayout />
      </ChatProvider>
    </AuthProvider>
  );
}
