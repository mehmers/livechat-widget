import { FC, ReactNode } from 'react';

export interface LiveChatConfig {
  apiUrl: string;
  token: string;
}

export interface LiveChatProps {
  apiUrl: string;
  token: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  welcomeMessage?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot' | 'agent';
  timestamp: string;
  file?: {
    id: number;
    name: string;
    path: string;
  };
}

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

export interface Option {
  label: string;
  value: string;
}

export interface UseLiveChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  user: User | null;
  sessionId: number | null;
  isLiveAgentMode: boolean;
  currentOptions: Option[];
  currentInputType: string;
  widgetConfig: any;
  hasEnded: boolean;
  initSession: (userData: { name: string; phone: string; email?: string }) => Promise<boolean>;
  sendMessage: (message: string) => Promise<boolean>;
  sendFile: (file: File) => Promise<boolean>;
  resetChat: () => void;
  setError: (error: string | null) => void;
}

export interface LiveChatProviderProps {
  children: ReactNode;
  config: LiveChatConfig;
}

export declare const LiveChat: FC<LiveChatProps>;
export declare const LiveChatProvider: FC<LiveChatProviderProps>;
export declare function useLiveChat(config: LiveChatConfig): UseLiveChatReturn;

export declare class LiveChatAPI {
  constructor(config: LiveChatConfig);
  getConfig(): Promise<any>;
  initSession(userData: { name: string; phone: string; email?: string }): Promise<any>;
  sendMessage(externalUserId: number, message: string, object?: any): Promise<any>;
  sendFile(externalUserId: number, file: File, message?: string): Promise<any>;
  getHistory(externalUserId: number): Promise<any>;
}
