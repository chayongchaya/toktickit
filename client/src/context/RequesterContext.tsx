import React, { createContext, useContext, useState, useEffect } from "react";
import { getRequesters, RequesterUser } from "../api";

export interface RequesterContextType {
  currentRequester: RequesterUser | null;
  setCurrentRequester: (requester: RequesterUser | null) => void;
  requesters: RequesterUser[];
  loading: boolean;
}

export const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(() => {
    const saved = localStorage.getItem("selectedRequester");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getRequesters()
      .then((data) => {
        setRequesters(data);
        if (currentRequester) {
          const matched = data.find((r) => r.id === currentRequester.id);
          if (matched) setCurrentRequesterState(matched);
        }
      })
      .catch((err) => console.error("Failed to load requesters", err))
      .finally(() => setLoading(false));
  }, []);

  const setCurrentRequester = (requester: RequesterUser | null) => {
    setCurrentRequesterState(requester);
    if (requester) {
      localStorage.setItem("selectedRequester", JSON.stringify(requester));
    } else {
      localStorage.removeItem("selectedRequester");
    }
  };

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        setCurrentRequester,
        requesters,
        loading,
      }}
    >
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