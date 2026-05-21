import { Crown, Shield, UserX, UsersRound } from "lucide-react";
import type { OnlineUser } from "../types/chat";

type Props = {
  users: OnlineUser[];
  currentUserId: string;
  canKick: boolean;
  onKick: (userId: string) => void;
  onTransferAdmin: (userId: string) => void;
};

export function OnlineUsers({ users, currentUserId, canKick, onKick, onTransferAdmin }: Props): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <UsersRound size={18} />
        <span>Members</span>
        <strong>{users.length}</strong>
      </div>

      <div className="user-list">
        {users.map((user) => (
          <div className="user-row" key={user.id}>
            <span className="avatar">
              {user.avatarUrl ? (
                <img src={`${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${user.avatarUrl}`} alt="" />
              ) : (
                user.displayName.slice(0, 1).toUpperCase()
              )}
            </span>
            <span className="user-details">
              <span>{user.displayName}</span>
              <em>{user.isOnline ? "Online" : "Offline"}</em>
            </span>
            {user.isAdmin ? <Shield size={14} /> : null}
            {user.id === currentUserId ? <em>You</em> : null}
            {canKick && user.id !== currentUserId ? (
              <>
                <button className="kick-button" type="button" onClick={() => onTransferAdmin(user.id)} title="Transfer admin">
                  <Crown size={14} />
                </button>
                <button className="kick-button" type="button" onClick={() => onKick(user.id)} title="Kick user">
                  <UserX size={14} />
                </button>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}
