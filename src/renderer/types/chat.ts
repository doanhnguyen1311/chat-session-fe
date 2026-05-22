export type JoinResponse = {
  token: string;
  accessKey?: string;
  user: {
    id: string;
    displayName: string;
    sessionId: string;
    isAdmin: boolean;
    role: "ADMIN" | "MEMBER";
  };
  session: {
    id: string;
    name: string;
    kind?: "GROUP" | "DIRECT";
  };
};

export type CreateAccessKeyResponse = {
  accessKey: {
    id: string;
    label: string;
    active: boolean;
    createdAt: string;
    accessKey: string;
  };
};

export type AccountAuthResponse = {
  accountToken: string;
  account: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  rooms: JoinResponse[];
};

export type AccountSearchResult = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Attachment = {
  url: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: "image" | "video" | "file";
};

export type MessageRead = {
  userId: string;
  readAt: string;
  user?: {
    displayName: string;
  };
};

export type MessageReaction = "like" | "love" | "care" | "sad" | "angry" | "cry" | "sick" | "system";

export type Message = {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: Attachment[];
  replyToId?: string | null;
  replyTo?: Pick<Message, "id" | "senderName" | "content" | "attachments" | "revoked"> | null;
  reactions?: Record<string, MessageReaction> | null;
  pinned?: boolean;
  revoked?: boolean;
  forwardedFromId?: string | null;
  reads?: MessageRead[];
  createdAt: string;
};

export type OnlineUser = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  socketId?: string | null;
  joinedAt?: string;
  isAdmin?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string;
};

export type TypingUser = {
  sessionId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
};
