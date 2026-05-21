import { FormEvent, useState } from "react";
import { KeyRound, LogIn, Plus } from "lucide-react";
import { api } from "../services/api";
import { connectSocket } from "../services/socket";
import type { JoinResponse } from "../types/chat";

type Props = {
  onJoined: (auth: JoinResponse) => void;
  defaultDisplayName?: string;
  accountToken: string;
};

export function LoginPage({ onJoined, defaultDisplayName = "", accountToken }: Props): JSX.Element {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [accessKey, setAccessKey] = useState("");
  const [sessionName, setSessionName] = useState("Internal Chat");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "create") {
        const created = await api.createAccessKey({
          label: sessionName.trim(),
          sessionName: sessionName.trim()
        });
        const result = await api.join({ accessKey: created.accessKey.accessKey, displayName: defaultDisplayName, accountToken });
        connectSocket(accountToken).emit("auth:resume", { token: result.token });
        onJoined({ ...result, accessKey: created.accessKey.accessKey });
        return;
      }

      const result = await api.join({ accessKey, displayName: defaultDisplayName, accountToken });
      connectSocket(accountToken).emit("auth:resume", { token: result.token });
      onJoined({ ...result, accessKey });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot join chat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Internal Session Chat</p>
          <h1>{mode === "join" ? "Join chat" : "Create chat"}</h1>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Chat mode">
          <button className={mode === "join" ? "active" : ""} type="button" onClick={() => setMode("join")}>
            <LogIn size={16} />
            Join chat
          </button>
          <button className={mode === "create" ? "active" : ""} type="button" onClick={() => setMode("create")}>
            <Plus size={16} />
            Create chat
          </button>
        </div>

        {mode === "join" ? (
          <label className="field">
            <span>Access key</span>
            <div className="input-wrap">
              <KeyRound size={18} />
              <input
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                type="password"
                autoFocus
                autoComplete="off"
                placeholder="Enter access key"
              />
            </div>
          </label>
        ) : (
          <label className="field">
            <span>Chat name</span>
            <div className="input-wrap">
              <KeyRound size={18} />
              <input
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                autoFocus
                autoComplete="off"
                placeholder="Team chat"
              />
            </div>
          </label>
        )}

        <div className="account-note">Joining as {defaultDisplayName}</div>

        {error ? <div className="error">{error}</div> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {mode === "join" ? <LogIn size={18} /> : <Plus size={18} />}
          {loading ? "Please wait..." : mode === "join" ? "Join Chat" : "Create Chat"}
        </button>
      </form>
    </main>
  );
}
