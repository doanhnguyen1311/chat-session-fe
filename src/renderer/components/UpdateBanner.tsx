import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, DownloadCloud, RefreshCw, RotateCcw } from "lucide-react";

function shouldShow(status: UpdateStatus): boolean {
  return !["idle", "disabled", "not-available"].includes(status.stage);
}

function formatPercent(percent?: number): string {
  return `${Math.max(0, Math.min(100, Math.round(percent ?? 0)))}%`;
}

export function UpdateBanner(): JSX.Element | null {
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
    if (!status) return null;
    if (status.stage === "error") return <AlertCircle size={16} />;
    if (status.stage === "downloaded") return <CheckCircle2 size={16} />;
    if (status.stage === "checking") return <RefreshCw size={16} className="update-spin" />;
    return <DownloadCloud size={16} />;
  }, [status]);

  if (!status || !shouldShow(status)) return null;

  const isDownloading = status.stage === "downloading";
  const canRetry = status.stage === "error";
  const canRestart = status.stage === "downloaded";

  return (
    <div className={`update-banner ${status.stage === "error" ? "update-banner-error" : ""}`}>
      <div className="update-banner-main">
        <span className="update-icon">{icon}</span>
        <div>
          <strong>{status.stage === "downloaded" ? "Update ready" : "App update"}</strong>
          <p>
            {status.message}
            {status.availableVersion ? ` Current ${status.version}, latest ${status.availableVersion}.` : ""}
          </p>
        </div>
      </div>

      {isDownloading ? (
        <div className="update-progress" aria-label="Update download progress">
          <span style={{ width: formatPercent(status.percent) }} />
        </div>
      ) : null}

      {canRetry ? (
        <button className="secondary-button compact" type="button" onClick={() => void window.electronAPI.updater.check()}>
          <RefreshCw size={15} />
          Retry
        </button>
      ) : null}

      {canRestart ? (
        <button className="primary-button compact" type="button" onClick={() => void window.electronAPI.updater.restartAndInstall()}>
          <RotateCcw size={15} />
          Restart
        </button>
      ) : null}
    </div>
  );
}
