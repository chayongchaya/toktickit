import React, { createContext, useContext, useState, useEffect } from "react";

export interface Requester {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface RequesterContextType {
  currentRequester: Requester | null;
  setCurrentRequester: (user: Requester | null) => void;
  isLoading: boolean;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRequester, setCurrentRequesterState] = useState<Requester | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("toktickit_requester");
    if (saved) {
      try {
        setCurrentRequesterState(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse requester from localStorage", e);
      }
    }
    setIsLoading(false);
  }, []);

  const setCurrentRequester = (user: Requester | null) => {
    setCurrentRequesterState(user);
    if (user) {
      localStorage.setItem("toktickit_requester", JSON.stringify(user));
    } else {
      localStorage.removeItem("toktickit_requester");
    }
  };

  return (
    <RequesterContext.Provider value={{ currentRequester, setCurrentRequester, isLoading }}>
      {children}
    </RequesterContext.Provider>
  );
};

export const useRequester = () => {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
};