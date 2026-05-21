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

export type Attachment = {
  url: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: "image" | "video" | "file";
};

export type Message = {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  attachments?: Attachment[];
  createdAt: string;
};

export type OnlineUser = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  socketId: string;
  joinedAt: string;
  isAdmin?: boolean;
};

export type TypingUser = {
  userId: string;
  displayName: string;
  isTyping: boolean;
};
