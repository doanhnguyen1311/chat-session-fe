import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, DownloadCloud, RefreshCw, RotateCcw } from "lucide-react";

function formatPercent(percent?: number): string {
  return `${Math.max(0, Math.min(100, Math.round(percent ?? 0)))}%`;
}

export function UpdateSettings(): JSX.Element {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    void window.electronAPI.updater.getStatus().then((current) => {
      if (mounted) setStatus(current);
    });

    const unsubscribe = window.electronAPI.updater.onStatus((current) => {
      setStatus(current);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const icon = useMemo(() => {
    if (!status) return <RefreshCw size={16} />;
    if (status.stage === "error") return <AlertCircle size={16} />;
    if (status.stage === "downloaded" || status.stage === "not-available") return <CheckCircle2 size={16} />;
    if (status.stage === "checking") return <RefreshCw size={16} className="update-spin" />;
    return <DownloadCloud size={16} />;
  }, [status]);

  const isChecking = status?.stage === "checking";
  const isDownloading = status?.stage === "downloading";
  const canDownload = status?.stage === "available";
  const canRestart = status?.stage === "downloaded";
  const canCheck = !isChecking && !isDownloading && !canRestart;

  return (
    <div className="settings-section update-settings">
      <div className="settings-section-header">
        <span className={status?.stage === "error" ? "update-icon update-icon-error" : "update-icon"}>{icon}</span>
        <div>
          <strong>App update</strong>
          <p>
            {status?.message ?? "Check GitHub Releases for a newer version."}
            {status?.availableVersion ? ` Current ${status.version}, latest ${status.availableVersion}.` : ""}
          </p>
        </div>
      </div>

      {isDownloading ? (
        <div className="update-progress" aria-label="Update download progress">
          <span style={{ width: formatPercent(status?.percent) }} />
        </div>
      ) : null}

      <div className="settings-actions">
        {canCheck ? (
          <button className="secondary-button compact" type="button" onClick={() => void window.electronAPI.updater.check()}>
            <RefreshCw size={15} />
            Check update
          </button>
        ) : null}
        {canDownload ? (
          <button className="primary-button compact" type="button" onClick={() => void window.electronAPI.updater.download()}>
            <DownloadCloud size={15} />
            Download
          </button>
        ) : null}
        {canRestart ? (
          <button className="primary-button compact" type="button" onClick={() => void window.electronAPI.updater.restartAndInstall()}>
            <RotateCcw size={15} />
            Restart
          </button>
        ) : null}
      </div>
    </div>
  );
}
