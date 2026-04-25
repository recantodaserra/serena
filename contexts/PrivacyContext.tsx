import React, { createContext, useContext, useState } from 'react';

interface PrivacyContextValue {
  privacy: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({ privacy: false, togglePrivacy: () => {} });

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [privacy, setPrivacy] = useState(false);
  return (
    <PrivacyContext.Provider value={{ privacy, togglePrivacy: () => setPrivacy(p => !p) }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => useContext(PrivacyContext);
