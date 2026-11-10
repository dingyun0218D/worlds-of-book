import { useMemo, useState } from "react";
import type { PlatformState } from "@wob/publish-core";

export function CredentialModal(props: {
  platform: PlatformState;
  onClose: () => void;
  onSave: (patch: Record<string, string>) => Promise<void>;
}) {
  const fields = props.platform.meta.credentialFields;
  const initial = useMemo(() => {
    const map: Record<string, string> = {};
    for (const field of fields) map[field.key] = "";
    return map;
  }, [fields]);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const patch: Record<string, string> = {};
      for (const [key, value] of Object.entries(values)) {
        if (value.trim()) patch[key] = value.trim();
      }
      await props.onSave(patch);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>配置 {props.platform.meta.name}</h3>
        <p className="sub">
          写入本机 <code>.data/credentials.json</code>
          ，不会提交到 git。留空字段不会覆盖已有值。
        </p>
        {fields.length === 0 ? (
          <p>该平台无需凭证（半自动 / 不可用结论型通路）。</p>
        ) : (
          fields.map((field) => (
            <label className="field" key={field.key}>
              {field.label}
              {field.required ? " *" : ""}
              <input
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder || field.key}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
              {field.help ? <span className="file-chip">{field.help}</span> : null}
            </label>
          ))
        )}
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={props.onClose}>
            取消
          </button>
          <button type="button" disabled={saving || fields.length === 0} onClick={handleSave}>
            {saving ? "保存中…" : "保存到本机"}
          </button>
        </div>
      </div>
    </div>
  );
}
