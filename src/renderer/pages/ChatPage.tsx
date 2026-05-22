import { Dispatch, FormEvent, SetStateAction, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import type { AccountSearchResult, Attachment, JoinResponse, Message, OnlineUser, TypingUser } from "../types/chat";
import { MessageBubble } from "../components/MessageBubble";
import { OnlineUsers } from "../components/OnlineUsers";
import { RoomsSidebar } from "../components/RoomsSidebar";
import { Toast, ToastHost } from "../components/ToastHost";
import { UpdateSettings } from "../components/UpdateSettings";

const MESSAGE_PAGE_SIZE = 10;
const REACTION_LABELS = {
  like: { icon: "👍", label: "Thích" },
  love: { icon: "❤️", label: "Yêu thích" },
  care: { icon: "🤗", label: "Thương thương" },
  haha: { icon: "😂", label: "Haha" },
  laughing: { icon: "😆", label: "Cười lớn" },
  rofl: { icon: "🤣", label: "Cười lăn" },
  wow: { icon: "😮", label: "Wow" },
  shocked: { icon: "😱", label: "Hoảng hốt" },
  cool: { icon: "😎", label: "Ngầu" },
  fire: { icon: "🔥", label: "Cháy quá" },
  clap: { icon: "👏", label: "Vỗ tay" },
  thinking: { icon: "🤔", label: "Suy nghĩ" },
  nerd: { icon: "🤓", label: "Thông thái" },
  sleepy: { icon: "😴", label: "Buồn ngủ" },
  bored: { icon: "🥱", label: "Chán quá" },
  sad: { icon: "😢", label: "Buồn" },
  angry: { icon: "😡", label: "Tức giận" },
  rage: { icon: "🤬", label: "Cay cú" },
  cry: { icon: "😭", label: "Khóc" },
  sick: { icon: "🤢", label: "Buồn nôn" },
  dead: { icon: "☠️", label: "Chết luôn" },
  skull: { icon: "💀", label: "Cười chết" },
  mindblown: { icon: "🤯", label: "Sốc" },
  clown: { icon: "🤡", label: "Hề hước" },
  salute: { icon: "🫡", label: "Kính nể" },
  party: { icon: "🥳", label: "Ăn mừng" },
  broken: { icon: "💔", label: "Tan vỡ" },
  kiss: { icon: "😘", label: "Hun cái" },
  hug: { icon: "🫂", label: "Ôm cái" },
  heartEyes: { icon: "😍", label: "Mê quá" },
  devil: { icon: "😈", label: "Nham hiểm" },
  angel: { icon: "😇", label: "Thiên thần" },
  money: { icon: "🤑", label: "Giàu quá" },
  poop: { icon: "💩", label: "Cứt luôn" },
  robot: { icon: "🤖", label: "Robot" },
  alien: { icon: "👽", label: "Người ngoài hành tinh" },
  cat: { icon: "🐱", label: "Meow" },
  dog: { icon: "🐶", label: "Gâu gâu" },
  monkey: { icon: "🐵", label: "Khỉ" },
  panda: { icon: "🐼", label: "Gấu trúc" },
  banana: { icon: "🍌", label: "Chuối" },
  pizza: { icon: "🍕", label: "Pizza" },
  coffee: { icon: "☕", label: "Cafe" },
  beer: { icon: "🍺", label: "Làm ly" },
  troll: { icon: "🗿", label: "Đá mặt" },
  sus: { icon: "📮", label: "Khả nghi" },
  goat: { icon: "🐐", label: "GOAT" },
  crown: { icon: "👑", label: "Vua luôn" },
  lightning: { icon: "⚡", label: "Nhanh như điện" },
  target: { icon: "🎯", label: "Chuẩn bài" },
  bomb: { icon: "💣", label: "Nổ tung" },
  wave: { icon: "👋", label: "Hello" }
} as const;

type Props = {
  state: AppState;
  activeRoom: RoomAuth;
  onStateChange: Dispatch<SetStateAction<AppState>>;
  onJoined: (auth: JoinResponse) => void;
  onLogout: () => void;
};

export function ChatPage({ state, activeRoom, onStateChange, onJoined, onLogout }: Props): JSX.Element {
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>({});
  const [hasMoreMessagesByRoom, setHasMoreMessagesByRoom] = useState<Record<string, boolean>>({});
  const [loadingMoreByRoom, setLoadingMoreByRoom] = useState<Record<string, boolean>>({});
  const [onlineByRoom, setOnlineByRoom] = useState<Record<string, OnlineUser[]>>({});
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(socket.connected);
  const [typingUsers, setTypingUsers] = useState<Record<string, Record<string, string>>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [groupModal, setGroupModal] = useState<"create" | "join" | "direct" | null>(null);
  const [groupTitle, setGroupTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupBusy, setGroupBusy] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("chat-theme") as "dark" | "light") ?? "dark");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<AccountSearchResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [directChatBusyAccountId, setDirectChatBusyAccountId] = useState<string | null>(null);
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reactionViewer, setReactionViewer] = useState<Message | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const latestMessageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimer = useRef<number | null>(null);
  const toastTimers = useRef<number[]>([]);
  const loadingMoreRef = useRef<Record<string, boolean>>({});
  const shouldStickToBottomRef = useRef(true);
  const pendingBottomScrollRoomRef = useRef<string | null>(activeRoom.session.id);
  const suppressScrollTrackingRef = useRef(false);
  const loadedRoomsRef = useRef<Set<string>>(new Set());
  const roomsRef = useRef(state.rooms);
  const activeRoomIdRef = useRef(activeRoom.session.id);

  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
    }, 500);
    toastTimers.current.push(timer);
  }, []);

  useEffect(() => {
    roomsRef.current = state.rooms;
    activeRoomIdRef.current = activeRoom.session.id;
  }, [activeRoom.session.id, state.rooms]);

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
      if (loadedRoomsRef.current.has(room.session.id)) continue;
      loadedRoomsRef.current.add(room.session.id);
      void api.messages(room.token, { limit: MESSAGE_PAGE_SIZE }).then((result) => {
        setMessagesByRoom((current) => ({ ...current, [room.session.id]: result.messages }));
        setHasMoreMessagesByRoom((current) => ({ ...current, [room.session.id]: result.messages.length === MESSAGE_PAGE_SIZE }));
      });
    }
  }, [state.rooms.map((room) => `${room.session.id}:${room.token}`).join("|")]);

  useEffect(() => {
    const query = userSearchQuery.trim();
    if (!state.account?.accountToken || query.length < 2) {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return;
    }

    setUserSearchLoading(true);
    const timer = window.setTimeout(() => {
      void api.searchAccounts(state.account?.accountToken ?? "", query)
        .then((result) => setUserSearchResults(result.users))
        .catch(() => setUserSearchResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state.account?.accountToken, userSearchQuery]);

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
      for (const room of roomsRef.current) {
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

      const room = roomsRef.current.find((item) => item.session.id === message.sessionId);
      const active = await (window.electronAPI?.isWindowActive?.() ?? Promise.resolve(!document.hidden));
      if (message.senderId !== room?.user.id && (message.sessionId !== activeRoomIdRef.current || !active || document.hidden)) {
        onStateChange((current) => {
          const targetRoom = current.rooms.find((item) => item.session.id === message.sessionId);
          if (!targetRoom) return current;
          const updatedRoom = { ...targetRoom, unread: targetRoom.unread + 1 };
          return {
            ...current,
            rooms: [updatedRoom, ...current.rooms.filter((item) => item.session.id !== message.sessionId)],
            recentRoomIds: [message.sessionId, ...current.recentRoomIds.filter((id) => id !== message.sessionId)].slice(0, 12)
          };
        });
      }

      if (message.senderId !== room?.user.id) {
        playNotificationSound();
        if (!active) {
          await window.electronAPI?.showNotification?.({
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

    const onMessageUpdated = (payload: { sessionId: string; message: Message }): void => {
      setMessagesByRoom((current) => ({
        ...current,
        [payload.sessionId]: (current[payload.sessionId] ?? []).map((message) =>
          message.id === payload.message.id ? payload.message : message
        )
      }));
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
        const roomTyping = { ...(current[payload.sessionId] ?? {}) };
        if (payload.isTyping) roomTyping[payload.userId] = payload.displayName;
        else delete roomTyping[payload.userId];
        return { ...current, [payload.sessionId]: roomTyping };
      });
    };

    const onUserJoined = (payload: { sessionId: string; user: OnlineUser }): void => {
      const room = roomsRef.current.find((item) => item.session.id === payload.sessionId);
      if (payload.user.id !== room?.user.id) {
        toast(`${payload.user.displayName} joined ${room?.session.name ?? "this room"}`);
      }
      const token = roomsRef.current.find((item) => item.session.id === payload.sessionId)?.token;
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
      const kickedRoom = roomsRef.current.find((room) => room.session.id === payload.sessionId);
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

    const onRead = (payload: { sessionId: string; messages: Message[] }): void => {
      setMessagesByRoom((current) => ({
        ...current,
        [payload.sessionId]: (current[payload.sessionId] ?? []).map((message) =>
          payload.messages.find((item) => item.id === message.id) ?? message
        )
      }));
    };

    const onAdminTransferred = (payload: { sessionId: string; previousAdminId: string; newAdminId: string }): void => {
      onStateChange((current) => ({
        ...current,
        rooms: current.rooms.map((room) =>
          room.session.id === payload.sessionId
            ? {
              ...room,
              user: {
                ...room.user,
                isAdmin: room.user.id === payload.newAdminId,
                role: room.user.id === payload.newAdminId ? "ADMIN" : "MEMBER"
              }
            }
            : room
        )
      }));
      const token = roomsRef.current.find((item) => item.session.id === payload.sessionId)?.token;
      if (token) {
        void api.onlineUsers(token).then((result) => {
          setOnlineByRoom((current) => ({ ...current, [payload.sessionId]: result.users }));
        });
      }
    };

    const onMessageError = (payload: { message?: string }): void => toast(payload.message ?? "Failed to send message", "error");
    const onAdminError = (payload: { message?: string }): void => toast(payload.message ?? "Admin action failed", "error");
    const onUserLeft = (payload: { sessionId: string; user: { id: string; displayName?: string } }): void => {
      const room = roomsRef.current.find((item) => item.session.id === payload.sessionId);
      if (payload.user.id !== room?.user.id && payload.user.displayName) {
        toast(`${payload.user.displayName} left ${room?.session.name ?? "this room"}`);
      }
    };

    client.on("connect", resumeAll);
    client.on("disconnect", onDisconnect);
    client.on("auth:success", onAuthSuccess);
    client.on("message:new", onMessage);
    client.on("message:stored", onMessageStored);
    client.on("message:updated", onMessageUpdated);
    client.on("message:read", onRead);
    client.on("admin:transferred", onAdminTransferred);
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
      client.off("message:updated", onMessageUpdated);
      client.off("message:read", onRead);
      client.off("admin:transferred", onAdminTransferred);
      client.off("user:joined", onUserJoined);
      client.off("user:left", onUserLeft);
      client.off("user:online-list", onOnlineList);
      client.off("user:typing", onTyping);
      client.off("user:kicked", onKicked);
      client.off("message:error", onMessageError);
      client.off("admin:error", onAdminError);
    };
  }, [onStateChange, state.account?.accountToken, toast]);

  const messages = messagesByRoom[activeRoom.session.id] ?? [];
  const visibleMessages = searchQuery.trim()
    ? messages.filter((message) => message.content.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;
  const messageById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  const messageVirtualizer = useVirtualizer({
    count: visibleMessages.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 78,
    overscan: 8
  });

  const loadOlderMessages = useCallback(async (): Promise<void> => {
    const roomId = activeRoom.session.id;
    const oldestMessage = messages[0];
    if (!oldestMessage || !hasMoreMessagesByRoom[roomId] || loadingMoreRef.current[roomId] || searchQuery.trim()) return;

    const list = listRef.current;
    const previousScrollHeight = list?.scrollHeight ?? 0;
    loadingMoreRef.current[roomId] = true;
    setLoadingMoreByRoom((current) => ({ ...current, [roomId]: true }));
    try {
      const result = await api.messages(activeRoom.token, { limit: MESSAGE_PAGE_SIZE, cursor: oldestMessage.id });
      setMessagesByRoom((current) => {
        const existing = current[roomId] ?? [];
        const existingIds = new Set(existing.map((message) => message.id));
        return { ...current, [roomId]: [...result.messages.filter((message) => !existingIds.has(message.id)), ...existing] };
      });
      setHasMoreMessagesByRoom((current) => ({ ...current, [roomId]: result.messages.length === MESSAGE_PAGE_SIZE }));
      window.requestAnimationFrame(() => {
        if (list) list.scrollTop = list.scrollHeight - previousScrollHeight;
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not load older messages", "error");
    } finally {
      loadingMoreRef.current[roomId] = false;
      setLoadingMoreByRoom((current) => ({ ...current, [roomId]: false }));
    }
  }, [activeRoom.session.id, activeRoom.token, hasMoreMessagesByRoom, messages, searchQuery, toast]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const list = listRef.current;
      if (!list) return;

      suppressScrollTrackingRef.current = true;

      list.scrollTo({
        top: list.scrollHeight,
        behavior
      });

      window.setTimeout(() => {
        suppressScrollTrackingRef.current = false;
      }, 120);
    },
    []
  );

  useEffect(() => {
    pendingBottomScrollRoomRef.current = activeRoom.session.id;
    shouldStickToBottomRef.current = true;
  }, [activeRoom.session.id]);

  useLayoutEffect(() => {
    if (!visibleMessages.length || searchQuery.trim()) return;
    if (pendingBottomScrollRoomRef.current !== activeRoom.session.id) return;
    scrollToBottom("auto");
    const timer = window.setTimeout(() => {
      scrollToBottom("auto");
      if (pendingBottomScrollRoomRef.current === activeRoom.session.id) {
        pendingBottomScrollRoomRef.current = null;
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [activeRoom.session.id, scrollToBottom, searchQuery, visibleMessages.length]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current || pendingBottomScrollRoomRef.current === activeRoom.session.id) return;
    scrollToBottom("auto");
  }, [activeRoom.session.id, messagesByRoom[activeRoom.session.id]?.length, scrollToBottom, visibleMessages.length]);

  useEffect(() => {
    const totalUnread = state.rooms.reduce((total, room) => total + room.unread, 0);
    void window.electronAPI?.setUnreadBadge?.(totalUnread);
  }, [state.rooms]);

  useEffect(() => {
    const markVisibleMessagesRead = async (): Promise<void> => {
      const active = await (window.electronAPI?.isWindowActive?.() ?? Promise.resolve(!document.hidden));
      if (!active || document.hidden) return;
      const unreadMessageIds = messages
        .filter((message) => message.senderId !== activeRoom.user.id)
        .filter((message) => !(message.reads ?? []).some((read) => read.userId === activeRoom.user.id))
        .map((message) => message.id)
        .filter((id) => !id.startsWith("tmp-"));
      if (unreadMessageIds.length > 0) {
        socket.emit("message:read", { token: activeRoom.token, messageIds: unreadMessageIds });
      }
    };

    void markVisibleMessagesRead();
    const onVisibilityChange = (): void => {
      void markVisibleMessagesRead();
    };
    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeRoom.token, activeRoom.user.id, messages]);

  const isDirectRoom = activeRoom.session.kind === "DIRECT";
  const onlineUsers = onlineByRoom[activeRoom.session.id] ?? [];
  const displayNameByUserId = useMemo(() => {
    const names = new Map<string, string>(onlineUsers.map((user) => [user.id, user.displayName]));
    names.set(activeRoom.user.id, activeRoom.user.displayName);
    return names;
  }, [activeRoom.user.displayName, activeRoom.user.id, onlineUsers]);
  const avatarUrlByUserId = useMemo(() => {
    const avatars = new Map<string, string | null | undefined>(onlineUsers.map((user) => [user.id, user.avatarUrl]));
    avatars.set(activeRoom.user.id, state.account?.account.avatarUrl);
    return avatars;
  }, [activeRoom.user.id, onlineUsers, state.account?.account.avatarUrl]);
  const mentionQuery = draft.match(/(^|\s)@([\p{L}\p{N}_.-]*)$/u)?.[2]?.toLowerCase() ?? "";
  const mentionUsers = onlineUsers
    .filter((user) => user.id !== activeRoom.user.id)
    .filter((user) => user.displayName.toLowerCase().replace(/\s+/g, "_").includes(mentionQuery))
    .slice(0, 6);
  const typingLabel = useMemo(() => {
    const names = Object.values(typingUsers[activeRoom.session.id] ?? {}).filter((name) => name !== activeRoom.user.displayName);
    return names.length ? `${names.slice(0, 2).join(", ")} ${names.length > 2 ? "and others " : ""}typing...` : "";
  }, [typingUsers, activeRoom.session.id, activeRoom.user.displayName]);

  function handleMessageScroll(): void {
    const list = listRef.current;
    if (!list) return;
    if (!suppressScrollTrackingRef.current) {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      shouldStickToBottomRef.current = distanceFromBottom < 48;
      if (distanceFromBottom > 140) {
        pendingBottomScrollRoomRef.current = null;
      }
    }
    if (list.scrollTop < 96) {
      void loadOlderMessages();
    }
  }

  function selectRoom(roomId: string): void {
    shouldStickToBottomRef.current = true;
    pendingBottomScrollRoomRef.current = roomId;
    onStateChange((current) => ({
      ...current,
      activeRoomId: roomId,
      rooms: current.rooms.map((room) => (room.session.id === roomId ? { ...room, unread: 0 } : room)),
      recentRoomIds: [roomId, ...current.recentRoomIds.filter((id) => id !== roomId)].slice(0, 12)
    }));
  }

  async function startDirectChat(user: AccountSearchResult): Promise<void> {
    if (!state.account?.accountToken || directChatBusyAccountId) return;
    setDirectChatBusyAccountId(user.id);
    try {
      const joined = await api.startDirectChat(state.account.accountToken, user.id);
      connectSocket(state.account.accountToken).emit("auth:resume", { token: joined.token });
      onJoined({ ...joined, accessKey: joined.session.id });
      setUserSearchQuery("");
      setUserSearchResults([]);
      toast(`Đã mở chat riêng với ${user.displayName}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not start direct chat", "error");
    } finally {
      setDirectChatBusyAccountId(null);
    }
  }

  async function createRoom(titleInput: string, kind: "GROUP" | "DIRECT" = "GROUP"): Promise<void> {
    const title = titleInput.trim();
    if (!title) return;
    const created = await api.createAccessKey({ label: title, sessionName: title, kind });
    const joined = await api.join({
      accessKey: created.accessKey.accessKey,
      displayName: state.account?.account.displayName ?? activeRoom.user.displayName,
      accountToken: state.account?.accountToken
    });
    connectSocket(state.account?.accountToken).emit("auth:resume", { token: joined.token });
    onJoined({ ...joined, accessKey: joined.session.id });
    toast(kind === "DIRECT" ? "Direct chat created" : "Group created");
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
        await createRoom(groupTitle, "GROUP");
        setGroupTitle("");
      } else if (groupModal === "direct") {
        await createRoom(groupTitle, "DIRECT");
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
    socket.emit("message:send", { token: activeRoom.token, content, attachments, replyToId: replyingTo?.id });
    socket.emit("user:typing", { token: activeRoom.token, isTyping: false });
    setDraft("");
    setAttachments([]);
    setMentionOpen(false);
    setReplyingTo(null);
  }

  function jumpToMessage(messageId: string): void {
    const index = visibleMessages.findIndex((message) => message.id === messageId);
    if (index >= 0) {
      messageVirtualizer.scrollToIndex(index, { align: "center" });
      window.setTimeout(() => document.getElementById(`message-${messageId}`)?.classList.add("message-highlight"), 60);
      window.setTimeout(() => document.getElementById(`message-${messageId}`)?.classList.remove("message-highlight"), 1400);
      return;
    }
    toast("Original message is not loaded yet", "info");
  }

  function reactToMessage(messageId: string, reaction: string): void {
    socket.emit("message:react", { token: activeRoom.token, messageId, reaction: reaction || null });
  }

  function pinMessage(message: Message): void {
    socket.emit("message:pin", { token: activeRoom.token, messageId: message.id, pinned: !message.pinned });
  }

  function revokeOwnMessage(message: Message): void {
    socket.emit("message:revoke", { token: activeRoom.token, messageId: message.id });
  }

  function forwardMessage(message: Message): void {
    const candidates = state.rooms.filter((room) => room.session.id !== activeRoom.session.id);
    const targetName = window.prompt(`Forward to room:\n${candidates.map((room) => room.session.name).join("\n")}`);
    const target = candidates.find((room) => room.session.name === targetName);
    if (target) {
      socket.emit("message:forward", { token: activeRoom.token, targetToken: target.token, messageId: message.id });
    }
  }

  async function copyText(text: string, message = "Copied message"): Promise<void> {
    await navigator.clipboard.writeText(text);
    toast(message);
  }

  function openExternalLink(url: string): void {
    void window.electronAPI?.openExternal?.(url);
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
            return { ...room, accessKey: previous?.accessKey ?? room.session.id, unread: previous?.unread ?? 0 };
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
        onCreateDirect={() => setGroupModal("direct")}
        onLogout={onLogout}
        userSearchQuery={userSearchQuery}
        userSearchResults={userSearchResults}
        userSearchLoading={userSearchLoading}
        directChatBusyAccountId={directChatBusyAccountId}
        onUserSearchChange={setUserSearchQuery}
        onStartDirectChat={(user) => void startDirectChat(user)}
      />

      <section className="chat-area">
        <header className="chat-header">
          <div>
            <h1>{activeRoom.session.name}</h1>
            <p>Signed in as {activeRoom.user.displayName}{!isDirectRoom && activeRoom.user.isAdmin ? " - Admin" : ""}</p>
            {!isDirectRoom && activeRoom.user.isAdmin ? (
              <button className="share-key" type="button" onClick={() => void copyText(activeRoom.session.id, "Copied chat id")}>
                <Copy size={14} />
                Chat ID: {activeRoom.session.id}
              </button>
            ) : null}
            {!isDirectRoom && activeRoom.accessKey ? (
              <button className="share-key" type="button" onClick={() => void copyText(activeRoom.accessKey ?? "", "Copied join code")}>
                <Copy size={14} />
                Join code: {activeRoom.accessKey}
              </button>
            ) : null}
          </div>
          <div className="header-actions">
            <button className="ghost-button" type="button" title="Search" aria-label="Search messages" onClick={() => setSearchOpen(true)}>
              <Search size={17} />
            </button>
            <button className="ghost-button" type="button" title="Start call" aria-label="Open voice call preview" onClick={() => setCallOpen(true)}>
              <Phone size={17} />
            </button>
            <button className="ghost-button" type="button" title="Settings" aria-label="Open settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}>
              <Settings size={17} />
            </button>
            <button className="ghost-button" type="button" title="Profile" aria-label="Open profile" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
              <UserCircle size={18} />
            </button>
            <button className="ghost-button" type="button" title="Toggle theme" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className={connected ? "status connected" : "status"}>
              {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {connected ? "Online" : "Offline"}
            </span>
          </div>
        </header>

        <div className="message-list" ref={listRef} onScroll={handleMessageScroll}>
          {loadingMoreByRoom[activeRoom.session.id] ? <div className="typing-line">Loading older messages...</div> : null}
          {visibleMessages.length === 0 ? (
            <div className="floating-panel empty-state-panel" style={{ position: "static", width: "min(440px, 100%)", margin: "auto" }}>
              <div className="empty-state-orb" aria-hidden="true" />
              <h2>{searchQuery ? "No messages found" : "No messages yet"}</h2>
              <p>{searchQuery ? "Try another search term or clear search to return to the full conversation." : "Send the first message and start a polished realtime conversation."}</p>
              <div className="skeleton" style={{ height: 12, width: "86%", borderRadius: 999 }} />
              <div className="skeleton" style={{ height: 12, width: "64%", borderRadius: 999 }} />
            </div>
          ) : null}
          <div className="virtual-message-space" style={{ height: messageVirtualizer.getTotalSize() }}>
            {messageVirtualizer.getVirtualItems().map((virtualRow) => {
              const message = visibleMessages[virtualRow.index];
              if (!message) return null;
              const isLatestMessage = virtualRow.index === visibleMessages.length - 1;
              return (
                <div
                  className="virtual-message-row"
                  data-index={virtualRow.index}
                  id={`message-${message.id}`}
                  key={message.id}
                  ref={(element) => {
                    messageVirtualizer.measureElement(element);
                    if (isLatestMessage) {
                      latestMessageRef.current = element;
                    } else if (latestMessageRef.current === element) {
                      latestMessageRef.current = null;
                    }
                  }}
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <MessageBubble
                    message={message}
                    own={message.senderId === activeRoom.user.id}
                    currentUserId={activeRoom.user.id}
                    senderAvatarUrl={avatarUrlByUserId.get(message.senderId)}
                    repliedMessage={message.replyToId ? messageById.get(message.replyToId) ?? message.replyTo ?? undefined : undefined}
                    onCopy={copyText}
                    onReply={setReplyingTo}
                    onReact={reactToMessage}
                    onPin={pinMessage}
                    onRevoke={revokeOwnMessage}
                    onForward={forwardMessage}
                    onImageOpen={setImagePreview}
                    onOpenExternal={openExternalLink}
                    onJumpToMessage={jumpToMessage}
                    onReactionSummaryOpen={setReactionViewer}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="typing-line">{typingLabel}</div>

        {replyingTo ? (
          <div className="attachment-strip">
            <div className="attachment-pill">
              <span>Replying to {replyingTo.senderName}: {replyingTo.content || "attachment"}</span>
              <button type="button" onClick={() => setReplyingTo(null)}>
                <X size={14} />
              </button>
            </div>
          </div>
        ) : null}

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
          <button className="ghost-button" type="button" title="Attach file" aria-label="Attach file" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={17} />
          </button>
          <button className="ghost-button" type="button" title="Tag user" aria-label="Mention a user" aria-expanded={mentionOpen} onClick={() => setMentionOpen((value) => !value)}>
            <AtSign size={17} />
          </button>
          <input value={draft} onChange={(event) => handleTyping(event.target.value)} maxLength={1000} placeholder="Write a message" aria-label="Message composer" />
          <button className="ghost-button" type="button" title="Emoji" aria-label="Open emoji picker" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((value) => !value)}>
            <Smile size={17} />
          </button>
          <button className="send-button" type="submit" title="Send message" aria-label="Send message" disabled={uploading}>
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
        canKick={!isDirectRoom && activeRoom.user.isAdmin}
        onKick={(userId) => socket.emit("user:kick", { token: activeRoom.token, targetUserId: userId })}
        onTransferAdmin={(userId) => socket.emit("admin:transfer", { token: activeRoom.token, targetUserId: userId })}
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
                <p>{isDirectRoom ? "Direct chat" : activeRoom.user.role}</p>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {Object.values(REACTION_LABELS).map((reaction) => (
                <button
                  className="ghost-button"
                  type="button"
                  key={reaction.icon}
                  onClick={() => addEmoji(reaction.icon)}
                >
                  {reaction.icon}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {groupModal ? (
        <motion.div className="modal-backdrop" role="presentation" onMouseDown={() => setGroupModal(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.form className="group-modal" onSubmit={handleGroupSubmit} onMouseDown={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <div>
              <h2>{groupModal === "direct" ? "New direct chat" : groupModal === "create" ? "Create group" : "Join group"}</h2>
              <p>{groupModal === "direct" ? "Create a private 1-1 chat space." : groupModal === "create" ? "Create a new chat group and share its join code." : "Enter a group join code."}</p>
            </div>

            {groupModal === "create" || groupModal === "direct" ? (
              <label className="field">
                <span>{groupModal === "direct" ? "Direct chat name" : "Group name"}</span>
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
                {groupBusy ? "Please wait..." : groupModal === "direct" ? "Create direct chat" : groupModal === "create" ? "Create group" : "Join group"}
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

      {reactionViewer ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReactionViewer(null)}>
          <div className="group-modal reaction-viewer-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header-line">
              <div>
                <h2>Reactions</h2>
                <p>{reactionViewer.senderName}'s message</p>
              </div>
              <button className="secondary-button compact" type="button" onClick={() => setReactionViewer(null)}>Close</button>
            </div>
            <div className="reaction-viewer-list">
              {Object.entries(reactionViewer.reactions ?? {}).map(([userId, reaction]) => {
                const reactionInfo = REACTION_LABELS[reaction];
                return (
                  <div className="reaction-viewer-row" key={`${userId}-${reaction}`}>
                    <span>{reactionInfo.icon}</span>
                    <strong>{displayNameByUserId.get(userId) ?? "Unknown user"}</strong>
                    <em>{reactionInfo.label}</em>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {imagePreview ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setImagePreview(null)}>
          <div className="image-preview-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="secondary-button compact" type="button" onClick={() => setImagePreview(null)}>Close</button>
            <img src={imagePreview} alt="Preview" />
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
