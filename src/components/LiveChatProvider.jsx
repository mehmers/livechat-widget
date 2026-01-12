import React, { createContext, useContext } from 'react';
import { useLiveChat } from '../hooks/useLiveChat';

const LiveChatContext = createContext(null);

export function LiveChatProvider({ children, config }) {
  const liveChatState = useLiveChat(config);

  return (
    <LiveChatContext.Provider value={liveChatState}>
      {children}
    </LiveChatContext.Provider>
  );
}

export function useLiveChatContext() {
  const context = useContext(LiveChatContext);
  if (!context) {
    throw new Error('useLiveChatContext must be used within a LiveChatProvider');
  }
  return context;
}

export default LiveChatProvider;
