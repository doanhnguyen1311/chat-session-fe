import { useEffect, useMemo, useState } from "react";
import { AccountPage } from "./pages/AccountPage";
import { ChatPage } from "./pages/ChatPage";
import { api } from "./services/api";
import { connectSocket, socket } from "./services/socket";
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

  useEffect(() => {
    const token = state.account?.accountToken;
    if (!token) return;
    const client = connectSocket(token);
    const onDirectChatCreated = (room: JoinResponse): void => {
      client.emit("auth:resume", { token: room.token });
      setState((current) => {
        const rooms = current.rooms.filter((item) => item.session.id !== room.session.id);
        const existingRoom = current.rooms.find((item) => item.session.id === room.session.id);
        const nextRoom: RoomAuth = { ...room, accessKey: room.accessKey ?? room.session.id, unread: existingRoom?.unread ?? 0 };
        return {
          ...current,
          displayName: room.user.displayName,
          rooms: [nextRoom, ...rooms],
          activeRoomId: current.activeRoomId ?? room.session.id,
          recentRoomIds: [room.session.id, ...current.recentRoomIds.filter((id) => id !== room.session.id)].slice(0, 12)
        };
      });
    };
    client.on("direct-chat:created", onDirectChatCreated);
    return () => {
      socket.off("direct-chat:created", onDirectChatCreated);
    };
  }, [state.account?.accountToken]);

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

  if (!activeRoom) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Session Chat</p>
            <h1>Dashboard</h1>
          </div>
          <div className="account-note">Signed in as {state.displayName}</div>
          <p className="account-note">Bạn chưa có cuộc trò chuyện nào. Khi có người nhắn riêng cho bạn, cuộc trò chuyện sẽ tự xuất hiện ở đây.</p>
          <button className="primary-button" type="button" onClick={() => setState(emptyState)}>
            Sign out
          </button>
        </section>
      </main>
    );
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
