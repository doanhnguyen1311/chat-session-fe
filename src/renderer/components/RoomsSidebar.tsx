import { LogOut, MessageSquarePlus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { RoomAuth } from "../App";

type Props = {
  rooms: RoomAuth[];
  activeRoomId: string;
  onSelect: (roomId: string) => void;
  onCreate: () => void;
  onJoin: () => void;
  onLogout: () => void;
};

export function RoomsSidebar({ rooms, activeRoomId, onSelect, onCreate, onJoin, onLogout }: Props): JSX.Element {
  return (
    <aside className="rooms-sidebar">
      <div className="rooms-title">
        <span className="brand-mark">S</span>
        <span>Rooms</span>
      </div>

      <div className="room-actions">
        <button type="button" onClick={onCreate}>
          <Plus size={16} />
          Create group
        </button>
        <button type="button" onClick={onJoin}>
          <MessageSquarePlus size={16} />
          Join group
        </button>
      </div>

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

      <button className="leave-all" type="button" onClick={onLogout}>
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}
