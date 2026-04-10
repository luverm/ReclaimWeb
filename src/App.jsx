import { useEffect, useMemo, useState } from "react";
import AuthScreen from "./AuthScreen";
import PresentationView from "./PresentationView";
import { audienceOptions, lengthOptions, reportTemplates, STORAGE_KEY, workflowCards } from "./appData";
import { apiRequest, clearAuthToken, saveAuthToken } from "./api";
import { formatSummaryExport, summarizeReport } from "./reportSummarizer";

function readSavedItems() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function createInitialSummary() {
  return summarizeReport(reportTemplates[0].text, {
    audience: "leadership",
    length: "standard"
  });
}

function createLibraryEntry(summary, reportText, sourceLabel) {
  return {
    id: summary.id || `summary-${Date.now()}`,
    savedAt: new Date().toISOString(),
    title: sourceLabel,
    reportText,
    sourceLabel,
    summary
  };
}

function formatRelativeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
}

function mapAiSummary(summary, audience, length, reportText) {
  return {
    id: `summary-${Date.now()}`,
    createdAt: new Date().toISOString(),
    headline: summary.headline || "AI summary",
    overview: summary.overview || "",
    keyPoints: summary.keyPoints || [],
    metrics: summary.metrics || [],
    risks: summary.risks || [],
    actions: summary.actions || [],
    options: { audience, length },
    audienceLabel:
      audience === "leadership" ? "Leadership" : audience === "client" ? "Client" : "Team",
    stats: {
      words: reportText.split(/\s+/).filter(Boolean).length,
      sentences: reportText.split(/[.!?]+/).filter(Boolean).length,
      sections: reportText.split(/\n{2,}/).filter(Boolean).length || 1
    },
    sourcePreview: reportText.slice(0, 600)
  };
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [startupState, setStartupState] = useState({
    label: "Starting Reclaim web app",
    value: 14
  });
  const [serverOffline, setServerOffline] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authForm, setAuthForm] = useState({ fullName: "", company: "", email: "", password: "" });

  const [activeView, setActiveView] = useState("workspace");
  const [reportText, setReportText] = useState(reportTemplates[0].text);
  const [sourceLabel, setSourceLabel] = useState("Weekly ops template");
  const [sourceFile, setSourceFile] = useState(null);
  const [audience, setAudience] = useState("leadership");
  const [length, setLength] = useState("standard");
  const [summary, setSummary] = useState(() => createInitialSummary());
  const [library, setLibrary] = useState(() => readSavedItems());
  const [selectedLibraryId, setSelectedLibraryId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Workspace ready");
  const [taskProgress, setTaskProgress] = useState({ active: false, label: "", value: 0 });

  const [settingsForm, setSettingsForm] = useState({
    aiProvider: "openai",
    openaiApiKey: "",
    anthropicApiKey: "",
    preferredModel: "gpt-4o-mini",
    brandName: "",
    brandTone: "clear, confident, technical",
    brandPrimaryColor: "#101113",
    brandRules: ""
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [presentationBrief, setPresentationBrief] = useState("");
  const [presentation, setPresentation] = useState(null);
  const [presentationLoading, setPresentationLoading] = useState(false);
  const [presentationExporting, setPresentationExporting] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    async function loadSession() {
      setStartupState({ label: "Checking API connection", value: 28 });

      try {
        await apiRequest("/api/health", { timeoutMs: 3000 });
        setServerOffline(false);
      } catch {
        setServerOffline(true);
        setStartupState({ label: "API unavailable, opening interface anyway", value: 100 });
        setAuthReady(true);
        return;
      }

      const token = window.localStorage.getItem("reclaim-api-token");
      if (!token) {
        setStartupState({ label: "Preparing login", value: 100 });
        setAuthReady(true);
        return;
      }

      try {
        setStartupState({ label: "Restoring session", value: 62 });
        const data = await apiRequest("/api/auth/session");
        setSessionUser(data.user);
        setSettingsForm((current) => ({
          ...current,
          aiProvider: data.user.aiProvider || current.aiProvider,
          preferredModel: data.user.preferredModel || current.preferredModel,
          brandName: data.user.brand?.name || data.user.company || "",
          brandTone: data.user.brand?.tone || current.brandTone,
          brandPrimaryColor: data.user.brand?.primaryColor || current.brandPrimaryColor,
          brandRules: data.user.brand?.rules || ""
        }));
      } catch {
        clearAuthToken();
      } finally {
        setStartupState({ label: "Workspace ready", value: 100 });
        setAuthReady(true);
      }
    }

    loadSession();
  }, []);

  const stats = useMemo(
    () =>
      summary
        ? [
            { label: "Words scanned", value: summary.stats.words },
            { label: "Sentences parsed", value: summary.stats.sentences },
            { label: "Sections found", value: summary.stats.sections }
          ]
        : [],
    [summary]
  );

  const selectedLibraryEntry = library.find((item) => item.id === selectedLibraryId) || null;

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(authForm)
      });

      saveAuthToken(data.token);
      setSessionUser(data.user);
      setSettingsForm((current) => ({
        ...current,
        aiProvider: data.user.aiProvider || current.aiProvider,
        brandName: data.user.brand?.name || data.user.company || "",
        preferredModel: data.user.preferredModel || current.preferredModel
      }));
      setAuthForm({ fullName: "", company: "", email: "", password: "" });
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearAuthToken();
    setSessionUser(null);
    setAuthMode("login");
  }

  function handleSummarize() {
    setSummary(summarizeReport(reportText, { audience, length }));
    setStatusMessage("Local summary generated");
  }

  function handleUseTemplate(template) {
    setReportText(template.text);
    setSourceLabel(`${template.name} template`);
    setSourceFile(null);
    setSummary(summarizeReport(template.text, { audience, length }));
    setActiveView("workspace");
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setTaskProgress({ active: true, label: "Uploading document", value: 18 });
    try {
      const formData = new FormData();
      formData.append("document", file);
      const data = await apiRequest("/api/upload", {
        method: "POST",
        body: formData
      });

      setTaskProgress({ active: true, label: "Preparing preview", value: 72 });
      setReportText(data.document.extractedText || "");
      setSourceLabel(data.document.fileName);
      setSourceFile(data.document);
      if (data.document.extractedText) {
        setSummary(summarizeReport(data.document.extractedText, { audience, length }));
      } else {
        setSummary(null);
      }
      setStatusMessage(`Imported ${data.document.fileName}`);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setTaskProgress({ active: false, label: "", value: 100 });
      event.target.value = "";
    }
  }

  async function handleSaveSettings() {
    setSettingsLoading(true);
    setSettingsMessage("");
    try {
      const data = await apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify(settingsForm)
      });
      setSessionUser(data.user);
      setSettingsForm((current) => ({
        ...current,
        aiProvider: data.user.aiProvider,
        openaiApiKey: "",
        anthropicApiKey: "",
        preferredModel: data.user.preferredModel,
        brandName: data.user.brand.name,
        brandTone: data.user.brand.tone,
        brandPrimaryColor: data.user.brand.primaryColor,
        brandRules: data.user.brand.rules
      }));
      setSettingsMessage("Settings saved.");
    } catch (error) {
      setSettingsMessage(error.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  async function handleAiSummarize() {
    setTaskProgress({ active: true, label: "Generating AI summary", value: 28 });
    try {
      const data = await apiRequest("/api/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          audience,
          length,
          documentText: reportText,
          fileName: sourceLabel
        })
      });
      setTaskProgress({ active: true, label: "Formatting AI output", value: 84 });
      setSummary(mapAiSummary(data.summary, audience, length, reportText));
      setStatusMessage("AI summary ready");
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setTaskProgress({ active: false, label: "", value: 100 });
    }
  }

  async function handleGeneratePresentation() {
    setPresentationLoading(true);
    setTaskProgress({ active: true, label: "Generating house-style presentation", value: 34 });
    try {
      const data = await apiRequest("/api/ai/presentation", {
        method: "POST",
        body: JSON.stringify({
          brief: presentationBrief,
          slideCount: 6
        })
      });
      setPresentation(data.presentation);
      setStatusMessage("Presentation generated");
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setPresentationLoading(false);
      setTaskProgress({ active: false, label: "", value: 100 });
    }
  }

  async function handleExportPresentation() {
    if (!presentation) {
      setStatusMessage("Generate a presentation first.");
      return;
    }

    setPresentationExporting(true);
    setTaskProgress({ active: true, label: "Building PowerPoint export", value: 52 });
    try {
      const { exportPresentationToPptx } = await import("./presentationExport");
      await exportPresentationToPptx(presentation, sessionUser.brand);
      setStatusMessage("PowerPoint exported");
    } catch (error) {
      setStatusMessage(error.message || "PowerPoint export failed.");
    } finally {
      setPresentationExporting(false);
      setTaskProgress({ active: false, label: "", value: 100 });
    }
  }

  function handleSaveToLibrary() {
    if (!summary) {
      return;
    }
    const entry = createLibraryEntry(summary, reportText, sourceLabel);
    setLibrary((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 12));
    setSelectedLibraryId(entry.id);
  }

  async function handleExportSummary() {
    if (!summary) {
      return;
    }
    await navigator.clipboard.writeText(formatSummaryExport(summary, sourceLabel));
    setStatusMessage("Summary copied to clipboard");
  }

  async function handleCopySummary() {
    if (!summary) {
      return;
    }
    await navigator.clipboard.writeText(formatSummaryExport(summary, sourceLabel));
  }

  function openLibraryEntry(entry) {
    setSelectedLibraryId(entry.id);
    setReportText(entry.reportText);
    setSourceLabel(entry.sourceLabel);
    setSummary(entry.summary);
    setAudience(entry.summary.options.audience);
    setLength(entry.summary.options.length);
  }

  if (!authReady) {
    return (
      <main className="loading-screen">
        <section className="startup-card" aria-live="polite">
          <p className="eyebrow">Startup</p>
          <h1>Loading Reclaim</h1>
          <p>{startupState.label}</p>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${startupState.value}%` }} />
          </div>
        </section>
      </main>
    );
  }

  if (!sessionUser) {
    return (
      <>
        {serverOffline ? (
          <section className="offline-banner" aria-live="polite">
            <strong>Backend offline.</strong> Start the API with `npm.cmd run dev` or `npm.cmd run start` to use login, uploads, and AI features.
          </section>
        ) : null}
        <AuthScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          setAuthForm={setAuthForm}
          authMessage={serverOffline ? "The backend is not reachable yet." : authMessage}
          authLoading={authLoading}
          onSubmit={handleAuthSubmit}
        />
      </>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__meta">{sessionUser.company}</div>
        </div>
        <nav className="sidebar__nav">
          {["workspace", "presentations", "templates", "library", "about", "settings"].map((view) => (
            <button
              key={view}
              className={`nav-item ${activeView === view ? "nav-item--active" : ""}`}
              type="button"
              onClick={() => setActiveView(view)}
            >
              {view === "about" ? "About us" : view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
        <section className="sidebar__panel">
          <p className="eyebrow eyebrow--muted">Product areas</p>
          <div className="mode-stack">
            {workflowCards.map((workflow) => (
              <article className="mode-card" key={workflow.title}>
                <h3>{workflow.title}</h3>
                <p>{workflow.copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="sidebar__panel sidebar__panel--status">
          <p className="eyebrow eyebrow--muted">Account</p>
          <strong>{sessionUser.fullName}</strong>
          <span>{sessionUser.email}</span>
          <button className="sidebar__logout" onClick={handleLogout} type="button">Log out</button>
        </section>
      </aside>

      <section className="main-stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">Reclaim web app</p>
            <h1>Upload documents, link OpenAI or Claude, and generate summaries and presentations in house style.</h1>
          </div>
          <div className="topbar__actions">
            <label className="button button--ghost file-button">
              Import file
              <input accept=".txt,.md,.docx,.pdf" hidden onChange={handleImportFile} type="file" />
            </label>
            <button className="button button--ghost" type="button" onClick={handleSaveToLibrary}>Save to library</button>
            <button className="button button--primary" type="button" onClick={handleExportSummary}>Export summary</button>
          </div>
        </header>

        {taskProgress.active ? (
          <section className="progress-banner" aria-live="polite">
            <div className="progress-banner__row">
              <strong>{taskProgress.label}</strong>
              <span>{taskProgress.value}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${taskProgress.value}%` }} />
            </div>
          </section>
        ) : null}

        {activeView === "workspace" ? (
          <>
            <section className="hero">
              <div className="hero__content hero__content--single">
                <div>
                  <p className="eyebrow">Summaries</p>
                  <h2 className="section-title section-title--hero">Turn dense technical input into client-ready output.</h2>
                  <p className="lede">This web version is built for the workflow you actually need: real auth, uploads, linked OpenAI keys, and server-side AI actions.</p>
                  <div className="hero__metrics">
                    {stats.map((item) => (
                      <article className="metric" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="workspace-grid-main">
              <section className="panel">
                <div className="panel__heading">
                  <div>
                    <p className="eyebrow">Input</p>
                    <h2 className="section-title">Upload or paste technical input</h2>
                  </div>
                  <div className="pill">{sourceLabel}</div>
                </div>
                <div className="control-grid">
                  <label className="field">
                    <span>Audience</span>
                    <select value={audience} onChange={(event) => setAudience(event.target.value)}>
                      {audienceOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Length</span>
                    <select value={length} onChange={(event) => setLength(event.target.value)}>
                      {lengthOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Source report</span>
                  <textarea value={reportText} onChange={(event) => setReportText(event.target.value)} />
                </label>
                {sourceFile ? (
                  <article className="summary-card document-preview-card">
                    <div className="document-preview-card__header">
                      <h3>Document preview</h3>
                      <div className="document-preview-card__meta">
                        <span>{sourceFile.extension}</span>
                        {sourceFile.metadata?.pages ? <span>{sourceFile.metadata.pages} pages</span> : null}
                      </div>
                    </div>
                    <p>{sourceFile.previewText || "No preview available."}</p>
                  </article>
                ) : null}
                <div className="editor-actions">
                  <button className="button button--primary" type="button" onClick={handleSummarize}>Summarize report</button>
                  <button className="button button--primary" type="button" onClick={handleAiSummarize}>Summarize with AI</button>
                  <button className="button button--ghost" type="button" onClick={handleCopySummary}>Copy output</button>
                </div>
              </section>

              <section className="panel">
                <div className="panel__heading">
                  <div>
                    <p className="eyebrow">Output</p>
                    <h2 className="section-title">Structured summary</h2>
                  </div>
                  <div className="pill">{statusMessage}</div>
                </div>
                {summary ? (
                  <div className="summary-stack">
                    <article className="summary-card summary-card--feature">
                      <h3>{summary.headline}</h3>
                      <p>{summary.overview}</p>
                    </article>
                    <div className="summary-columns">
                      <article className="summary-card">
                        <h3>Key points</h3>
                        <ul>{summary.keyPoints.map((item) => <li key={item}>{item}</li>)}</ul>
                      </article>
                      <article className="summary-card">
                        <h3>Metrics</h3>
                        <ul>{summary.metrics.map((item) => <li key={item}>{item}</li>)}</ul>
                      </article>
                    </div>
                    <div className="summary-columns">
                      <article className="summary-card">
                        <h3>Risks</h3>
                        <ul>{summary.risks.map((item) => <li key={item}>{item}</li>)}</ul>
                      </article>
                      <article className="summary-card">
                        <h3>Actions</h3>
                        <ul>{summary.actions.map((item) => <li key={item}>{item}</li>)}</ul>
                      </article>
                    </div>
                  </div>
                ) : null}
              </section>
            </section>
          </>
        ) : null}

        {activeView === "presentations" ? (
          <PresentationView
            brief={presentationBrief}
            setBrief={setPresentationBrief}
            generating={presentationLoading}
            onGenerate={handleGeneratePresentation}
            exporting={presentationExporting}
            onExport={handleExportPresentation}
            presentation={presentation}
            brand={sessionUser.brand}
          />
        ) : null}

        {activeView === "templates" ? (
          <section className="panel">
            <div className="panel__heading">
              <div>
                <p className="eyebrow">Templates</p>
                <h2 className="section-title">Start from common project update shapes</h2>
              </div>
            </div>
            <div className="template-grid">
              {reportTemplates.map((template) => (
                <article className="template-card" key={template.id}>
                  <div className="workspace-card__status">{template.category}</div>
                  <h3>{template.name}</h3>
                  <p>{template.text.slice(0, 180)}...</p>
                  <button className="button button--ghost" type="button" onClick={() => handleUseTemplate(template)}>Use template</button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeView === "library" ? (
          <section className="library-grid">
            <section className="panel">
              <div className="panel__heading">
                <div>
                  <p className="eyebrow">Saved work</p>
                  <h2 className="section-title">Library</h2>
                </div>
              </div>
              <div className="library-list">
                {library.length ? library.map((entry) => (
                  <article className={`library-item ${selectedLibraryId === entry.id ? "library-item--active" : ""}`} key={entry.id}>
                    <button className="library-item__open" type="button" onClick={() => openLibraryEntry(entry)}>
                      <strong>{entry.title}</strong>
                      <span>{entry.summary.audienceLabel}</span>
                      <small>{formatRelativeDate(entry.savedAt)}</small>
                    </button>
                  </article>
                )) : <article className="summary-card summary-card--empty"><h3>No saved summaries yet</h3></article>}
              </div>
            </section>
            <section className="panel">
              <div className="panel__heading">
                <div>
                  <p className="eyebrow">Preview</p>
                  <h2 className="section-title">Saved detail</h2>
                </div>
              </div>
              {selectedLibraryEntry ? (
                <div className="summary-stack">
                  <article className="summary-card summary-card--feature">
                    <h3>{selectedLibraryEntry.summary.headline}</h3>
                    <p>{selectedLibraryEntry.summary.overview}</p>
                  </article>
                  <article className="summary-card">
                    <h3>Source preview</h3>
                    <p>{selectedLibraryEntry.summary.sourcePreview}</p>
                  </article>
                </div>
              ) : <article className="summary-card summary-card--empty"><h3>Select a saved item</h3></article>}
            </section>
          </section>
        ) : null}

        {activeView === "about" ? (
          <section className="panel">
            <div className="panel__heading">
              <div>
                <p className="eyebrow">About us</p>
                <h2 className="section-title">The team behind Reclaim</h2>
              </div>
            </div>
            <div className="about-grid">
              <article className="summary-card summary-card--feature">
                <h3>Our mission</h3>
                <p>
                  Reclaim helps teams cut through information overload. We believe that clear,
                  structured communication is the foundation of effective work — and that AI
                  should handle the formatting so humans can focus on decisions.
                </p>
              </article>
              <article className="summary-card">
                <h3>What we do</h3>
                <p>
                  We build tools that transform dense technical documents into client-ready
                  summaries and presentations. Upload a report, connect your preferred AI
                  provider, and get structured output in your house style — in seconds.
                </p>
              </article>
              <article className="summary-card">
                <h3>How it works</h3>
                <ul>
                  <li>Upload documents in .txt, .md, .docx, or .pdf format</li>
                  <li>Connect OpenAI or Claude for AI-powered summarization</li>
                  <li>Define your house style, tone, and brand rules</li>
                  <li>Export structured summaries or branded slide decks</li>
                </ul>
              </article>
              <article className="summary-card">
                <h3>Get in touch</h3>
                <p>
                  Have questions or feedback? We'd love to hear from you. Reach out to our
                  team and we'll get back to you as soon as possible.
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {activeView === "settings" ? (
          <section className="panel">
            <div className="panel__heading">
              <div>
                <p className="eyebrow">Settings</p>
                <h2 className="section-title">Link OpenAI or Claude and define your house style</h2>
              </div>
              <div className="pill">
                {sessionUser.hasApiKey
                  ? `Linked: ${sessionUser.aiProvider} / ${sessionUser.preferredModel}`
                  : "No API key linked"}
              </div>
            </div>
            <div className="settings-grid">
              <article className="summary-card">
                <h3>AI settings</h3>
                <div className="auth-form">
                  <label className="field">
                    <span>AI provider</span>
                    <select
                      value={settingsForm.aiProvider}
                      onChange={(event) =>
                        setSettingsForm((current) => ({
                          ...current,
                          aiProvider: event.target.value,
                          preferredModel:
                            event.target.value === "anthropic"
                              ? current.preferredModel === "gpt-4o-mini"
                                ? "claude-3-5-sonnet-latest"
                                : current.preferredModel
                              : current.preferredModel === "claude-3-5-sonnet-latest"
                                ? "gpt-4o-mini"
                                : current.preferredModel
                        }))
                      }
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Claude (Anthropic)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>OpenAI API key</span>
                    <input
                      value={settingsForm.openaiApiKey}
                      onChange={(event) => setSettingsForm((c) => ({ ...c, openaiApiKey: event.target.value }))}
                      type="password"
                      placeholder="sk-..."
                    />
                  </label>
                  <label className="field">
                    <span>Claude API key</span>
                    <input
                      value={settingsForm.anthropicApiKey}
                      onChange={(event) => setSettingsForm((c) => ({ ...c, anthropicApiKey: event.target.value }))}
                      type="password"
                      placeholder="sk-ant-..."
                    />
                  </label>
                  <label className="field">
                    <span>Preferred model</span>
                    <input
                      value={settingsForm.preferredModel}
                      onChange={(event) => setSettingsForm((c) => ({ ...c, preferredModel: event.target.value }))}
                      placeholder={settingsForm.aiProvider === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-4o-mini"}
                    />
                  </label>
                </div>
              </article>
              <article className="summary-card">
                <h3>House style</h3>
                <div className="auth-form">
                  <label className="field">
                    <span>Brand name</span>
                    <input value={settingsForm.brandName} onChange={(event) => setSettingsForm((c) => ({ ...c, brandName: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Brand tone</span>
                    <input value={settingsForm.brandTone} onChange={(event) => setSettingsForm((c) => ({ ...c, brandTone: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Primary color</span>
                    <input value={settingsForm.brandPrimaryColor} onChange={(event) => setSettingsForm((c) => ({ ...c, brandPrimaryColor: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Slide rules</span>
                    <textarea value={settingsForm.brandRules} onChange={(event) => setSettingsForm((c) => ({ ...c, brandRules: event.target.value }))} />
                  </label>
                  <div className="editor-actions">
                    <button className="button button--primary" disabled={settingsLoading} onClick={handleSaveSettings} type="button">
                      {settingsLoading ? "Saving..." : "Save settings"}
                    </button>
                  </div>
                  {settingsMessage ? <div className="auth-message">{settingsMessage}</div> : null}
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
