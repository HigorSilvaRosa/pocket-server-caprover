import { createContext, useContext } from 'react';
import type { StorageMode } from './api-key-storage';

export interface AppContextValue {
  activeApiKey: string;
  apiKeySourceMode: StorageMode | null;
  saveApiKey: (value: string, mode: StorageMode) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppContext.Provider.');
  }

  return context;
}

export default AppContext;
