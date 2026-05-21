import { useEffect, useMemo, useState } from "react";
import { AccountPage } from "./pages/AccountPage";
import { ChatPage } from "./pages/ChatPage";
import { LoginPage } from "./pages/LoginPage";
import { api } from "./services/api";
import type { AccountAuthResponse, JoinResponse } from "./types/chat";

export type RoomAuth = JoinResponse & {
  unread: number;
};

export type AccountState = {
  accountToken: string;
  account: AccountAuthResponse["account"];
};

export type AppState = {
  account: AccountState | null;
  displayName: string;
  rooms: RoomAuth[];
  activeRoomId: string | null;
  recentRoomIds: string[];
};

const STORAGE_KEY = "chat-session-state";

const emptyState: AppState = {
  account: null,
  displayName: "",
  rooms: [],
  activeRoomId: null,
  recentRoomIds: []
};

export function App(): JSX.Element {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? ({ ...emptyState, ...JSON.parse(saved) } as AppState) : emptyState;
  });
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem("chat-theme") ?? "dark";
  }, []);

  useEffect(() => {
    const token = state.account?.accountToken;
    if (!token || bootstrapped) return;

    void api
      .me(token)
      .then(applyAccountAuth)
      .catch(() => setState(emptyState))
      .finally(() => setBootstrapped(true));
  }, [state.account?.accountToken, bootstrapped]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeRoom = useMemo(
    () => state.rooms.find((room) => room.session.id === state.activeRoomId) ?? state.rooms[0] ?? null,
    [state.activeRoomId, state.rooms]
  );

  function applyAccountAuth(result: AccountAuthResponse): void {
    const rooms = result.rooms.map((room) => ({ ...room, accessKey: room.accessKey ?? room.session.id, unread: 0 }));
    setState((current) => ({
      ...current,
      account: {
        accountToken: result.accountToken,
        account: result.account
      },
      displayName: result.account.displayName,
      rooms,
      activeRoomId: current.activeRoomId && rooms.some((room) => room.session.id === current.activeRoomId)
        ? current.activeRoomId
        : rooms[0]?.session.id ?? null,
      recentRoomIds: rooms.map((room) => room.session.id).slice(0, 12)
    }));
    setBootstrapped(true);
  }

  function upsertRoom(room: JoinResponse): void {
    setState((current) => {
      const rooms = current.rooms.filter((item) => item.session.id !== room.session.id);
      const nextRoom: RoomAuth = { ...room, accessKey: room.accessKey ?? room.session.id, unread: 0 };
      return {
        ...current,
        displayName: room.user.displayName,
        rooms: [...rooms, nextRoom],
        activeRoomId: room.session.id,
        recentRoomIds: [room.session.id, ...current.recentRoomIds.filter((id) => id !== room.session.id)].slice(0, 12)
      };
    });
  }

  if (!state.account) {
    return <AccountPage onAuthenticated={applyAccountAuth} />;
  }

  if (state.rooms.length === 0 || !activeRoom) {
    return <LoginPage onJoined={upsertRoom} defaultDisplayName={state.displayName} accountToken={state.account.accountToken} />;
  }

  return (
    <ChatPage
      state={state}
      activeRoom={activeRoom}
      onStateChange={setState}
      onJoined={upsertRoom}
      onLogout={() => setState(emptyState)}
    />
  );
}
