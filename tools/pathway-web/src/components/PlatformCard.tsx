import type { PathwayResult, PlatformState } from "@wob/pathway-core";
import { statusClass, statusLabel } from "../status";

export function PlatformCard(props: {
  platform: PlatformState;
  busy: boolean;
  onConfigure: () => void;
  onVerify: (dryRun: boolean) => void;
}) {
  const { platform, busy } = props;
  const result = platform.lastResult;

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h3>{platform.meta.name}</h3>
          <div className="sub">
            {platform.meta.nameEn} · {modeLabel(platform.meta.mode)}
          </div>
        </div>
        <span className={`badge ${statusClass(platform.status)}`}>
          {statusLabel(platform.status)}
        </span>
      </div>

      <p>{platform.meta.description}</p>

      {platform.missingFields.length > 0 ? (
        <p>
          缺少配置：
          {platform.missingFields.join("、")}
        </p>
      ) : null}

      {platform.notes.length > 0 ? (
        <ul className="notes">
          {platform.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="actions">
        {platform.meta.credentialFields.length > 0 ? (
          <button type="button" className="secondary" onClick={props.onConfigure}>
            配置凭证
          </button>
        ) : null}
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => props.onVerify(true)}
        >
          Dry-run
        </button>
        <button type="button" disabled={busy} onClick={() => props.onVerify(false)}>
          {busy ? "验证中…" : "验证发帖通路"}
        </button>
        {platform.meta.docsUrl ? (
          <a href={platform.meta.docsUrl} target="_blank" rel="noreferrer">
            <button type="button" className="secondary">
              文档
            </button>
          </a>
        ) : null}
      </div>

      {result ? <ResultTimeline result={result} /> : null}
    </article>
  );
}

function modeLabel(mode: PlatformState["meta"]["mode"]): string {
  if (mode === "official_api") return "官方 API";
  if (mode === "semi_auto") return "半自动";
  return "无官方通路";
}

function ResultTimeline({ result }: { result: PathwayResult }) {
  return (
    <div className="timeline">
      <div className="sub">
        最近验证：{result.ok ? "成功" : "未通过"} · {result.message}
        {result.postUrl ? (
          <>
            {" "}
            ·{" "}
            <a href={result.postUrl} target="_blank" rel="noreferrer">
              打开结果
            </a>
          </>
        ) : null}
      </div>
      {result.steps.map((step) => (
        <div className="step" key={step.id}>
          <i className={`dot ${step.status}`} />
          <div>
            <strong>
              {step.label}
              {step.status !== "pending" ? ` · ${step.status}` : ""}
            </strong>
            {step.detail ? <span>{step.detail}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
