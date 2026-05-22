import { LogOut, MessageSquarePlus, Plus, Search, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import type { RoomAuth } from "../App";
import type { AccountSearchResult } from "../types/chat";

type Props = {
  rooms: RoomAuth[];
  activeRoomId: string;
  onSelect: (roomId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onCreateDirect: () => void;
  onLogout: () => void;
  userSearchQuery: string;
  userSearchResults: AccountSearchResult[];
  userSearchLoading: boolean;
  directChatBusyAccountId: string | null;
  onUserSearchChange: (query: string) => void;
  onStartDirectChat: (user: AccountSearchResult) => void;
};

export function RoomsSidebar({ rooms, activeRoomId, onSelect, onCreate, onJoin, onCreateDirect, onLogout, userSearchQuery, userSearchResults, userSearchLoading, directChatBusyAccountId, onUserSearchChange, onStartDirectChat }: Props): JSX.Element {
  const directRooms = rooms.filter((room) => room.session.kind === "DIRECT");
  const groupRooms = rooms.filter((room) => room.session.kind !== "DIRECT");
  return (
    <aside className="rooms-sidebar">
      <div className="rooms-title">
        <span className="brand-mark">S</span>
        <span>Rooms</span>
      </div>

      <div className="room-actions">
        <button type="button" onClick={onCreateDirect}>
          <UserRound size={16} />
          New direct chat
        </button>
        <button type="button" onClick={onCreate}>
          <Plus size={16} />
          Create group
        </button>
        <button type="button" onClick={onJoin}>
          <MessageSquarePlus size={16} />
          Join group
        </button>
      </div>

      <div className="user-search-panel">
        <div className="search-box">
          <Search size={16} />
          <input value={userSearchQuery} onChange={(event) => onUserSearchChange(event.target.value)} placeholder="Tìm người để nhắn riêng" />
        </div>
        {userSearchQuery.trim().length >= 2 ? (
          <div className="user-search-results">
            {userSearchLoading ? <div className="user-search-state">Đang tìm...</div> : null}
            {!userSearchLoading && userSearchResults.length === 0 ? <div className="user-search-state">Không tìm thấy người dùng</div> : null}
            {!userSearchLoading ? userSearchResults.map((user) => (
              <button className="user-search-item" type="button" key={user.id} onClick={() => onStartDirectChat(user)} disabled={directChatBusyAccountId === user.id}>
                <span className="avatar">
                  {user.avatarUrl ? <img src={`${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${user.avatarUrl}`} alt="" /> : user.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{user.displayName}</strong>
                  <em>@{user.username}</em>
                </span>
                <small>{directChatBusyAccountId === user.id ? "..." : "Nhắn"}</small>
              </button>
            )) : null}
          </div>
        ) : null}
      </div>

      <RoomSection title="Chat riêng" rooms={directRooms} activeRoomId={activeRoomId} onSelect={onSelect} />
      <RoomSection title="Chat chung" rooms={groupRooms} activeRoomId={activeRoomId} onSelect={onSelect} />

      <button className="leave-all" type="button" onClick={onLogout}>
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}

type RoomSectionProps = {
  title: string;
  rooms: RoomAuth[];
  activeRoomId: string;
  onSelect: (roomId: string) => void;
};

function RoomSection({ title, rooms, activeRoomId, onSelect }: RoomSectionProps): JSX.Element {
  return (
    <div className="room-section">
      <div className="room-section-title">{title}</div>
      <div className="room-list">
        {rooms.map((room) => (
          <motion.button
            className={room.session.id === activeRoomId ? "room-item active" : "room-item"}
            key={room.session.id}
            type="button"
            onClick={() => onSelect(room.session.id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.985 }}
          >
            <span>{room.session.name}</span>
            {room.unread > 0 ? <strong>{room.unread}</strong> : null}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
