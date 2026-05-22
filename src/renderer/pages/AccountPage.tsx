import { FormEvent, useState } from "react";
import { LockKeyhole, LogIn, Sparkles, UserPlus } from "lucide-react";
import { api } from "../services/api";
import type { AccountAuthResponse } from "../types/chat";

type Props = {
  onAuthenticated: (result: AccountAuthResponse) => void;
};

export function AccountPage({ onAuthenticated }: Props): JSX.Element {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result =
        mode === "login"
          ? await api.login({ username, password })
          : await api.register({ username, password, displayName: displayName || username });
      onAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-hero">
          <span className="login-orb" aria-hidden="true"><Sparkles size={22} /></span>
          <div>
            <p className="eyebrow">Session Chat</p>
            <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
            <p>Private realtime conversations with a polished desktop workflow.</p>
          </div>
        </div>

        <div className="mode-switch" role="tablist" aria-label="Account mode">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            <LogIn size={16} />
            Login
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            <UserPlus size={16} />
            Register
          </button>
        </div>

        <label className="field">
          <span>Username</span>
          <div className="input-wrap">
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" />
          </div>
        </label>

        <label className="field">
          <span>Password</span>
          <div className="input-wrap">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </div>
        </label>

        {mode === "register" ? (
          <label className="field">
            <span>Display name</span>
            <div className="input-wrap">
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
            </div>
          </label>
        ) : null}

        {error ? <div className="error">{error}</div> : null}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? <LockKeyhole size={18} /> : mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
          {loading ? "Securing session..." : mode === "login" ? "Enter workspace" : "Create secure account"}
        </button>
      </form>
    </main>
  );
}
