import type { AccountAuthResponse, AccountSearchResult, Attachment, CreateAccessKeyResponse, JoinResponse, Message, OnlineUser } from "../types/chat";
import type { ServerRoomTheme } from "../theme";

const API_URL = import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  join: (payload: { accessKey: string; displayName: string; accountToken?: string }) =>
    request<JoinResponse>("/auth/join", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  createAccessKey: (payload: { label: string; sessionName?: string; kind?: "GROUP" | "DIRECT" }) =>
    request<CreateAccessKeyResponse>("/access-keys", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  register: (payload: { username: string; password: string; displayName: string }) =>
    request<AccountAuthResponse>("/account/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  login: (payload: { username: string; password: string }) =>
    request<AccountAuthResponse>("/account/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: (accountToken: string) =>
    request<AccountAuthResponse>("/account/me", {
      headers: {
        Authorization: `Bearer ${accountToken}`
      }
    }),
  updateProfile: (accountToken: string, payload: { displayName?: string; avatarUrl?: string }) =>
    request<AccountAuthResponse>("/account/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accountToken}`
      },
      body: JSON.stringify(payload)
    }),
  searchAccounts: (accountToken: string, query: string) =>
    request<{ users: AccountSearchResult[] }>(`/accounts/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${accountToken}`
      }
    }),
  startDirectChat: (accountToken: string, targetAccountId: string) =>
    request<JoinResponse>("/direct-chats", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accountToken}`
      },
      body: JSON.stringify({ targetAccountId })
    }),
  uploadFiles: (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<{ files: Attachment[] }>("/uploads", {
      method: "POST",
      body: form
    });
  },
  messages: (token: string, params?: { limit?: number; cursor?: string }) => {
    const search = new URLSearchParams({ token, limit: String(params?.limit ?? 20) });
    if (params?.cursor) search.set("cursor", params.cursor);
    return request<{ messages: Message[] }>(`/messages?${search.toString()}`);
  },
  onlineUsers: (token: string) =>
    request<{ users: OnlineUser[] }>(`/online-users?token=${encodeURIComponent(token)}`),
  roomTheme: (token: string) =>
    request<{ theme: ServerRoomTheme }>(`/room-theme?token=${encodeURIComponent(token)}`),
  updateRoomTheme: (payload: { token: string } & Omit<ServerRoomTheme, "roomId" | "updatedBy" | "updatedAt">) =>
    request<{ theme: ServerRoomTheme }>("/room-theme", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  health: () => request<{ ok: boolean }>("/health")
};
