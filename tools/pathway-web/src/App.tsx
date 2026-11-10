import { useEffect, useState } from "react";
import type { PlatformState } from "@wob/pathway-core";
import { fetchPlatforms, saveCredentials, verifyPlatform } from "./api";
import { CredentialModal } from "./components/CredentialModal";
import { PlatformCard } from "./components/PlatformCard";

export function App() {
  const [platforms, setPlatforms] = useState<PlatformState[]>([]);
  const [testPostPrefix, setTestPostPrefix] = useState("[WOB-PATHWAY-TEST]");
  const [text, setText] = useState(
    "这是一条本地发帖通路验证测试。若你看到此前缀帖子，可以删除。",
  );
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [configTarget, setConfigTarget] = useState<PlatformState | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlatforms();
      setPlatforms(data.platforms);
      setTestPostPrefix(data.testPostPrefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleVerify(platformId: string, dryRun: boolean) {
    setBusyId(platformId);
    setError(null);
    try {
      const { platform } = await verifyPlatform({
        platformId,
        text,
        images,
        dryRun,
      });
      setPlatforms((prev) =>
        prev.map((item) => (item.platformId === platformId ? platform : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="brand">
          Worlds of Book <span>通路台</span>
        </div>
        <p className="lede">
          本机发帖通路验证工具。你和同事各自启动、各自填自己的凭证，先确认抖音 / X /
          Facebook / Instagram 等官方通路，以及小红书半自动与知乎、贴吧的结论。
        </p>
      </header>

      <section className="toolbar">
        <h2>测试素材</h2>
        <div className="toolbar-grid">
          <label className="field">
            测试文案（会自动加前缀 {testPostPrefix}）
            <textarea value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <label className="field">
            测试图片（可多选；小红书/抖音等需要）
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
            />
            <div className="file-row">
              {images.length === 0 ? (
                <span className="file-chip">未选择图片</span>
              ) : (
                images.map((file) => (
                  <span className="file-chip" key={`${file.name}-${file.size}`}>
                    {file.name}
                  </span>
                ))
              )}
            </div>
          </label>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => void refresh()}>
            刷新平台状态
          </button>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="footer-note">加载平台状态…</p> : null}

      <section className="grid">
        {platforms.map((platform, index) => (
          <div key={platform.platformId} style={{ animationDelay: `${index * 40}ms` }}>
            <PlatformCard
              platform={platform}
              busy={busyId === platform.platformId}
              onConfigure={() => setConfigTarget(platform)}
              onVerify={(dryRun) => void handleVerify(platform.platformId, dryRun)}
            />
          </div>
        ))}
      </section>

      <p className="footer-note">
        凭证优先读本机 `.data/credentials.json`，其次读根目录 `.env`。测试帖请及时删除。
      </p>

      {configTarget ? (
        <CredentialModal
          platform={configTarget}
          onClose={() => setConfigTarget(null)}
          onSave={async (patch) => {
            await saveCredentials(patch);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}
