import { createContext, useContext, useState, ReactNode } from "react";

type AppState = {
  selectedTopicId: string | null;
  setSelectedTopicId: (id: string | null) => void;
  refreshKey: number;
  triggerRefresh: () => void;
};

const Ctx = createContext<AppState | undefined>(undefined);

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <Ctx.Provider value={{
      selectedTopicId, setSelectedTopicId,
      refreshKey, triggerRefresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAppState = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppState must be inside AppStateProvider");
  return c;
};
