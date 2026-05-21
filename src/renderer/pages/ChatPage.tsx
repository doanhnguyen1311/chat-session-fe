import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  AtSign,
  Copy,
  Image,
  Mic,
  Moon,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  Smile,
  Sun,
  UserCircle,
  Wifi,
  WifiOff,
  X
} from "lucide-react";
import type { AppState, RoomAuth } from "../App";
import { api } from "../services/api";
import { connectSocket, socket } from "../services/socket";
import { playNotificationSound } from "../services/notifications";
import type { Attachment, JoinResponse, Message, OnlineUser, TypingUser } from "../types/chat";
import { MessageBubble } from "../components/MessageBubble";
import { OnlineUsers } from "../components/OnlineUsers";
import { RoomsSidebar } from "../components/RoomsSidebar";
import { Toast, ToastHost } from "../components/ToastHost";
import { UpdateSettings } from "../components/UpdateSettings";

type Props = {
  state: AppState;
  activeRoom: RoomAuth;
  onStateChange: Dispatch<SetStateAction<AppState>>;
  onJoined: (auth: JoinResponse) => void;
  onLogout: () => void;
};

export function ChatPage({ state, activeRoom, onStateChange, onJoined, onLogout }: Props): JSX.Element {
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>({});
  const [onlineByRoom, setOnlineByRoom] = useState<Record<string, OnlineUser[]>>({});
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [groupModal, setGroupModal] = useState<"create" | "join" | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("chat-theme") as "dark" | "light") ?? "dark");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [profileName, setProfileName] = useState(state.account?.account.displayName ?? activeRoom.user.displayName);
  const [profileAvatar, setProfileAvatar] = useState<File | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const toastTimers = useRef<number[]>([]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
    }, 500);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => {
    return () => {
      toastTimers.current.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("chat-theme", theme);
  }, [theme]);

  useEffect(() => {
    setProfileName(state.account?.account.displayName ?? activeRoom.user.displayName);
  }, [activeRoom.user.displayName, state.account?.account.displayName]);

  useEffect(() => {
    for (const room of state.rooms) {
      void api.messages(room.token).then((result) => {
        setMessagesByRoom((current) => ({ ...current, [room.session.id]: result.messages }));
      });
    }
  }, [state.rooms.map((room) => room.session.id).join("|")]);

  useEffect(() => {
    const syncOnlineUsers = (): void => {
      for (const room of state.rooms) {
        void api.onlineUsers(room.token).then((result) => {
          setOnlineByRoom((current) => ({ ...current, [room.session.id]: result.users }));
        });
      }
    };

    syncOnlineUsers();
    const timer = window.setInterval(syncOnlineUsers, 60_000);
    return () => window.clearInterval(timer);
  }, [state.rooms.map((room) => `${room.session.id}:${room.token}`).join("|")]);

  useEffect(() => {
    const client = connectSocket(state.account?.accountToken);

    const resumeAll = (): void => {
      setConnected(true);
      for (const room of state.rooms) {
        client.emit("auth:resume", { token: room.token });
      }
    };

    const onDisconnect = (): void => {
      setConnected(false);
    };
    const onMessage = async (message: Message): Promise<void> => {
      setMessagesByRoom((current) => ({
        ...current,
        [message.sessionId]: [...(current[message.sessionId] ?? []), message]
      }));

      const room = state.rooms.find((item) => item.session.id === message.sessionId);
      if (message.sessionId !== activeRoom.session.id) {
        onStateChange((current) => ({
          ...current,
          rooms: current.rooms.map((item) =>
            item.session.id === message.sessionId ? { ...item, unread: item.unread + 1 } : item
          )
        }));
      }

      if (message.senderId !== room?.user.id) {
        playNotificationSound();
        const active = await window.electronAPI.isWindowActive();
        if (!active) {
          await window.electronAPI.showNotification({
            title: `${room?.session.name ?? "Chat"} - ${message.senderName}`,
            body: message.content
              ? message.content.length > 90
                ? `${message.content.slice(0, 90)}...`
                : message.content
              : `${message.attachments?.length ?? 0} attachment(s)`
          });
        }
      }
    };

    const onMessageStored = (payload: { tempId: string; message: Message }): void => {
      setMessagesByRoom((current) => ({
        ...current,
        [payload.message.sessionId]: (current[payload.message.sessionId] ?? []).map((message) =>
          message.id === payload.tempId ? payload.message : message
        )
      }));
    };

    const onOnlineList = (payload: { sessionId: string; users: OnlineUser[] }): void => {
      setOnlineByRoom((current) => ({ ...current, [payload.sessionId]: payload.users }));
    };

    const onTyping = (payload: TypingUser): void => {
      setTypingUsers((current) => {
        const next = { ...current };
        if (payload.isTyping) next[payload.userId] = payload.displayName;
        else delete next[payload.userId];
        return next;
      });
    };

    const onUserJoined = (payload: { sessionId: string; user: OnlineUser }): void => {
      const room = state.rooms.find((item) => item.session.id === payload.sessionId);
      if (payload.user.id !== room?.user.id) {
        toast(`${payload.user.displayName} joined ${room?.session.name ?? "this room"}`);
      }
      const token = state.rooms.find((item) => item.session.id === payload.sessionId)?.token;
      if (token) {
        void api.onlineUsers(token).then((result) => {
          setOnlineByRoom((current) => ({ ...current, [payload.sessionId]: result.users }));
        });
      }
    };

    const onAuthSuccess = (payload: JoinResponse): void => {
      onStateChange((current) => ({
        ...current,
        rooms: current.rooms.map((room) => (room.session.id === payload.session.id ? { ...room, ...payload } : room))
      }));
    };

    const onKicked = (payload: { sessionId: string }): void => {
      const kickedRoom = state.rooms.find((room) => room.session.id === payload.sessionId);
      toast("You were kicked from this room", "error");
      onStateChange((current) => {
        const rooms = current.rooms.filter((room) => room.session.id !== payload.sessionId);
        return {
          ...current,
          rooms,
          activeRoomId: current.activeRoomId === payload.sessionId ? rooms[0]?.session.id ?? null : current.activeRoomId
        };
      });
      if (kickedRoom) socket.emit("user:leave");
    };

    const onMessageError = (payload: { message?: string }): void => toast(payload.message ?? "Failed to send message", "error");
    const onAdminError = (payload: { message?: string }): void => toast(payload.message ?? "Admin action failed", "error");
    const onUserLeft = (payload: { sessionId: string; user: { id: string; displayName?: string } }): void => {
      const room = state.rooms.find((item) => item.session.id === payload.sessionId);
      if (payload.user.id !== room?.user.id && payload.user.displayName) {
        toast(`${payload.user.displayName} left ${room?.session.name ?? "this room"}`);
      }
    };

    client.on("connect", resumeAll);
    client.on("disconnect", onDisconnect);
    client.on("auth:success", onAuthSuccess);
    client.on("message:new", onMessage);
    client.on("message:stored", onMessageStored);
    client.on("user:joined", onUserJoined);
    client.on("user:left", onUserLeft);
    client.on("user:online-list", onOnlineList);
    client.on("user:typing", onTyping);
    client.on("user:kicked", onKicked);
    client.on("message:error", onMessageError);
    client.on("admin:error", onAdminError);

    if (client.connected) {
      resumeAll();
    }

    return () => {
      client.off("connect", resumeAll);
      client.off("disconnect", onDisconnect);
      client.off("auth:success", onAuthSuccess);
      client.off("message:new", onMessage);
      client.off("message:stored", onMessageStored);
      client.off("user:joined", onUserJoined);
      client.off("user:left", onUserLeft);
      client.off("user:online-list", onOnlineList);
      client.off("user:typing", onTyping);
      client.off("user:kicked", onKicked);
      client.off("message:error", onMessageError);
      client.off("admin:error", onAdminError);
    };
  }, [activeRoom.session.id, onStateChange, state.account?.accountToken, state.rooms, toast]);

  const messages = messagesByRoom[activeRoom.session.id] ?? [];
  const visibleMessages = searchQuery.trim()
    ? messages.filter((message) => message.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;
  const messageVirtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 78,
    overscan: 8
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [activeRoom.session.id, messagesByRoom[activeRoom.session.id]?.length, visibleMessages.length]);

  const onlineUsers = onlineByRoom[activeRoom.session.id] ?? [];
  const mentionQuery = draft.match(/(^|\s)@([\p{L}\p{N}_.-]*)$/u)?.[2]?.toLowerCase() ?? "";
  const mentionUsers = onlineUsers
    .filter((user) => user.id !== activeRoom.user.id)
    .filter((user) => user.displayName.toLowerCase().replace(/\s+/g, "_").includes(mentionQuery))
    .slice(0, 6);
  const typingLabel = useMemo(() => {
    const names = Object.values(typingUsers).filter((name) => name !== activeRoom.user.displayName);
    return names.length ? `${names.slice(0, 2).join(", ")} ${names.length > 2 ? "and others " : ""}typing...` : "";
  }, [typingUsers, activeRoom.user.displayName]);

  function selectRoom(roomId: string): void {
    onStateChange((current) => ({
      ...current,
      activeRoomId: roomId,
      rooms: current.rooms.map((room) => (room.session.id === roomId ? { ...room, unread: 0 } : room)),
      recentRoomIds: [roomId, ...current.recentRoomIds.filter((id) => id !== roomId)].slice(0, 12)
    }));
  }

  async function createRoom(titleInput: string): Promise<void> {
    const title = titleInput.trim();
    if (!title) return;
    const created = await api.createAccessKey({ label: title, sessionName: title });
    const joined = await api.join({
      accessKey: created.accessKey.accessKey,
      displayName: state.account?.account.displayName ?? activeRoom.user.displayName,
      accountToken: state.account?.accountToken
    });
    connectSocket(state.account?.accountToken).emit("auth:resume", { token: joined.token });
    onJoined({ ...joined, accessKey: created.accessKey.accessKey });
    toast("Group created");
  }

  async function joinRoom(keyInput: string): Promise<void> {
    const key = keyInput.trim();
    if (!key) return;
    const joined = await api.join({
      accessKey: key,
      displayName: state.account?.account.displayName ?? activeRoom.user.displayName,
      accountToken: state.account?.accountToken
    });
    connectSocket(state.account?.accountToken).emit("auth:resume", { token: joined.token });
    onJoined({ ...joined, accessKey: key });
    toast("Joined room successfully");
  }

  async function handleGroupSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setGroupBusy(true);
    try {
      if (groupModal === "create") {
        await createRoom(groupTitle);
        setGroupTitle("");
      } else if (groupModal === "join") {
        await joinRoom(joinCode);
        setJoinCode("");
      }
      setGroupModal(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Group action failed", "error");
    } finally {
      setGroupBusy(false);
    }
  }

  function handleTyping(value: string): void {
    setDraft(value);
    setMentionOpen(/(^|\s)@[\p{L}\p{N}_.-]*$/u.test(value));
    socket.emit("user:typing", { token: activeRoom.token, isTyping: value.trim().length > 0 });
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      socket.emit("user:typing", { token: activeRoom.token, isTyping: false });
    }, 900);
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    const content = draft.trim();
    if (!content && attachments.length === 0) return;
    socket.emit("message:send", { token: activeRoom.token, content, attachments });
    socket.emit("user:typing", { token: activeRoom.token, isTyping: false });
    setDraft("");
    setAttachments([]);
    setMentionOpen(false);
  }

  async function copyText(text: string, message = "Copied message"): Promise<void> {
    await navigator.clipboard.writeText(text);
    toast(message);
  }

  function addEmoji(emoji: string): void {
    setDraft((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  }

  async function handleAttachment(files?: FileList | File[]): Promise<void> {
    const selected = Array.from(files ?? []).slice(0, 10);
    if (selected.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadFiles(selected);
      setAttachments((current) => [...current, ...uploaded.files].slice(0, 10));
      toast(`${uploaded.files.length} file(s) attached`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(url: string): void {
    setAttachments((current) => current.filter((attachment) => attachment.url !== url));
  }

  function insertMention(user: OnlineUser): void {
    const mention = `@${user.displayName.replace(/\s+/g, "_")} `;
    setDraft((current) => {
      if (/(^|\s)@[\p{L}\p{N}_.-]*$/u.test(current)) {
        return current.replace(/(^|\s)@[\p{L}\p{N}_.-]*$/u, (prefix) => `${prefix.startsWith(" ") ? " " : ""}${mention}`);
      }
      return `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${mention}`;
    });
    setMentionOpen(false);
  }

  async function updateProfile(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!state.account?.accountToken) return;
    setProfileBusy(true);
    try {
      let avatarUrl = state.account.account.avatarUrl ?? undefined;
      if (profileAvatar) {
        const uploaded = await api.uploadFiles([profileAvatar]);
        avatarUrl = uploaded.files[0]?.url ?? avatarUrl;
      }
      const result = await api.updateProfile(state.account.accountToken, { displayName: profileName, avatarUrl });
      onStateChange((current) => ({
        ...current,
        account: { accountToken: result.accountToken, account: result.account },
        displayName: result.account.displayName,
        rooms: result.rooms.length
          ? result.rooms.map((room) => {
              const previous = current.rooms.find((item) => item.session.id === room.session.id);
              return { ...room, accessKey: previous?.accessKey, unread: previous?.unread ?? 0 };
            })
          : current.rooms,
        activeRoomId: current.activeRoomId
      }));
      connectSocket(result.accountToken);
      toast("Profile updated");
      setProfileAvatar(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Profile update failed", "error");
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <main className="chat-shell app-frame">
      <div className="drag-region" />
      <RoomsSidebar
        rooms={state.rooms}
        activeRoomId={activeRoom.session.id}
        onSelect={selectRoom}
        onCreate={() => setGroupModal("create")}
        onJoin={() => setGroupModal("join")}
        onLogout={onLogout}
      />

      <section className="chat-area">
        <header className="chat-header">
          <div>
            <h1>{activeRoom.session.name}</h1>
            <p>Signed in as {activeRoom.user.displayName}{activeRoom.user.isAdmin ? " - Admin" : ""}</p>
            {activeRoom.accessKey ? (
              <button className="share-key" type="button" onClick={() => void copyText(activeRoom.accessKey ?? "", "Copied access key")}>
                <Copy size={14} />
                Join code: {activeRoom.accessKey}
              </button>
            ) : null}
          </div>
          <div className="header-actions">
            <button className="ghost-button" type="button" title="Search" onClick={() => setSearchOpen(true)}>
              <Search size={17} />
            </button>
            <button className="ghost-button" type="button" title="Start call" onClick={() => setCallOpen(true)}>
              <Phone size={17} />
            </button>
            <button className="ghost-button" type="button" title="Settings" onClick={() => setSettingsOpen((value) => !value)}>
              <Settings size={17} />
            </button>
            <button className="ghost-button" type="button" title="Profile" onClick={() => setProfileOpen((value) => !value)}>
              <UserCircle size={18} />
            </button>
            <button className="ghost-button" type="button" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className={connected ? "status connected" : "status"}>
              {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        </header>

        <div className="message-list" ref={listRef}>
          {visibleMessages.length === 0 ? (
            <div className="floating-panel" style={{ position: "static", width: "min(420px, 100%)", margin: "auto" }}>
              <h2>{searchQuery ? "No messages found" : "No messages yet"}</h2>
              <p>{searchQuery ? "Try another search term." : "Start the conversation with a short message."}</p>
              <div className="skeleton" style={{ height: 12, borderRadius: 999 }} />
              <div className="skeleton" style={{ height: 12, width: "72%", borderRadius: 999 }} />
            </div>
          ) : null}
          <div className="virtual-message-space" style={{ height: messageVirtualizer.getTotalSize() }}>
            {messageVirtualizer.getVirtualItems().map((virtualRow) => {
              const message = visibleMessages[virtualRow.index];
              if (!message) return null;
              return (
                <div
                  className="virtual-message-row"
                  data-index={virtualRow.index}
                  key={message.id}
                  ref={messageVirtualizer.measureElement}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <MessageBubble message={message} own={message.senderId === activeRoom.user.id} onCopy={copyText} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="typing-line">{typingLabel}</div>

        {attachments.length ? (
          <div className="attachment-strip">
            {attachments.map((item) => (
              <div className="attachment-pill" key={item.url}>
                <Image size={15} />
                <span>{item.originalName}</span>
                <button type="button" onClick={() => removeAttachment(item.url)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="composer"
          onSubmit={handleSubmit}
          onPaste={(event) => {
            if (event.clipboardData.files.length > 0) {
              void handleAttachment(event.clipboardData.files);
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
            onChange={(event) => {
              void handleAttachment(event.target.files ?? undefined);
              event.currentTarget.value = "";
            }}
          />
          <button className="ghost-button" type="button" title="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={17} />
          </button>
          <button className="ghost-button" type="button" title="Tag user" onClick={() => setMentionOpen((value) => !value)}>
            <AtSign size={17} />
          </button>
          <input value={draft} onChange={(event) => handleTyping(event.target.value)} maxLength={1000} placeholder="Write a message" />
          <button className="ghost-button" type="button" title="Emoji" onClick={() => setEmojiOpen((value) => !value)}>
            <Smile size={17} />
          </button>
          <button className="send-button" type="submit" title="Send message" disabled={uploading}>
            <Send size={18} />
          </button>
        </form>
        {mentionOpen && mentionUsers.length ? (
          <div className="mention-popover">
            {mentionUsers.map((user) => (
              <button type="button" key={user.id} onClick={() => insertMention(user)}>
                <span className="avatar">
                  {user.avatarUrl ? (
                    <img src={`${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${user.avatarUrl}`} alt="" />
                  ) : (
                    user.displayName.slice(0, 1).toUpperCase()
                  )}
                </span>
                {user.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <OnlineUsers
        users={onlineUsers}
        currentUserId={activeRoom.user.id}
        canKick={activeRoom.user.isAdmin}
        onKick={(userId) => socket.emit("user:kick", { token: activeRoom.token, targetUserId: userId })}
      />
      <ToastHost toasts={toasts} />

      <AnimatePresence>
        {profileOpen ? (
          <motion.form className="floating-panel profile-card" onSubmit={updateProfile} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <div className="call-bar">
              <span className="avatar">
                {state.account?.account.avatarUrl ? (
                  <img src={`${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${state.account.account.avatarUrl}`} alt="" />
                ) : (
                  activeRoom.user.displayName.slice(0, 1).toUpperCase()
                )}
              </span>
              <div>
                <strong>{state.account?.account.username}</strong>
                <p>{activeRoom.user.role}</p>
              </div>
            </div>
            <label className="field">
              <span>Display name</span>
              <div className="input-wrap">
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={40} />
              </div>
            </label>
            <label className="field">
              <span>Avatar</span>
              <div className="input-wrap">
                <input type="file" accept="image/*" onChange={(event) => setProfileAvatar(event.target.files?.[0] ?? null)} />
              </div>
            </label>
            <button className="primary-button compact" type="submit" disabled={profileBusy}>
              {profileBusy ? "Saving..." : "Save profile"}
            </button>
          </motion.form>
        ) : null}

        {settingsOpen ? (
          <motion.div className="floating-panel settings-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <h2>Settings</h2>
            <p>Theme, startup behavior and app updates.</p>
            <div className="settings-section">
              <div>
                <strong>Theme</strong>
                <p>Current mode: {theme}</p>
              </div>
              <button className="secondary-button compact" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                Switch to {theme === "dark" ? "light" : "dark"}
              </button>
            </div>
            <div className="settings-section">
              <div>
                <strong>Startup</strong>
                <p>Session Chat opens automatically when Windows starts.</p>
              </div>
            </div>
            <UpdateSettings />
          </motion.div>
        ) : null}

        {emojiOpen ? (
          <motion.div className="floating-panel" style={{ top: "auto", bottom: 88, right: 318, width: 260 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <h2>Emoji</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
              {["👍", "🔥", "✨", "✅", "👀", "🚀", "❤️", "😂", "🙏", "💡", "🎯", "⚡"].map((emoji) => (
                <button className="ghost-button" type="button" key={emoji} onClick={() => addEmoji(emoji)}>{emoji}</button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {groupModal ? (
        <motion.div className="modal-backdrop" role="presentation" onMouseDown={() => setGroupModal(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form className="group-modal" onSubmit={handleGroupSubmit} onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <div>
              <h2>{groupModal === "create" ? "Create group" : "Join group"}</h2>
              <p>{groupModal === "create" ? "Create a new chat group and share its join code." : "Enter a group join code."}</p>
            </div>

            {groupModal === "create" ? (
              <label className="field">
                <span>Group name</span>
                <div className="input-wrap">
                  <input
                    value={groupTitle}
                    onChange={(event) => setGroupTitle(event.target.value)}
                    autoFocus
                    placeholder="Team Backend"
                  />
                </div>
              </label>
            ) : (
              <label className="field">
                <span>Join code</span>
                <div className="input-wrap">
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    autoFocus
                    placeholder="chat-..."
                  />
                </div>
              </label>
            )}

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setGroupModal(null)}>
                Cancel
              </button>
              <button className="primary-button compact" type="submit" disabled={groupBusy}>
                {groupBusy ? "Please wait..." : groupModal === "create" ? "Create group" : "Join group"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}

      {searchOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <div className="command-panel" onMouseDown={(event) => event.stopPropagation()}>
            <div className="search-box">
              <Search size={18} />
              <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search messages in this room" />
            </div>
            <p>{visibleMessages.length} messages visible</p>
          </div>
        </div>
      ) : null}

      {callOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCallOpen(false)}>
          <div className="group-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="call-bar">
              <Mic size={18} />
              <div>
                <strong>Voice call preview</strong>
                <p>{activeRoom.session.name}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setCallOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}
