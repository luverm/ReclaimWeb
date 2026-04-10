export default function PresentationView({
  brief,
  setBrief,
  generating,
  onGenerate,
  presentation,
  brand,
  exporting,
  onExport
}) {
  return (
    <section className="panel">
      <div className="panel__heading">
        <div>
          <p className="eyebrow">Presentation generator</p>
          <h2 className="section-title">Generate deck-ready structure in your house style</h2>
        </div>
        <div className="pill">
          {brand?.name ? `Brand: ${brand.name}` : "Brand profile not set"}
        </div>
      </div>

      <div className="workspace-grid-main">
        <article className="summary-card">
          <h3>Presentation brief</h3>
          <p>
            Describe the audience, objective, project context, and what the deck
            should help them decide.
          </p>
          <label className="field">
            <span>Brief</span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Create a 6-slide client presentation for the weekly project review..."
            />
          </label>
          <div className="editor-actions">
            <button className="button button--primary" disabled={generating} onClick={onGenerate} type="button">
              {generating ? "Generating..." : "Generate presentation"}
            </button>
            <button
              className="button button--ghost"
              disabled={!presentation?.slides?.length || exporting}
              onClick={onExport}
              type="button"
            >
              {exporting ? "Exporting..." : "Export .pptx"}
            </button>
          </div>
        </article>

        <article className="summary-card">
          <h3>{presentation?.title || "Deck preview"}</h3>
          <p>{presentation?.themeNote || "The generated deck structure will appear here."}</p>
          <div className="slide-stack">
            {(presentation?.slides || []).map((slide, index) => (
              <section className="slide-card" key={`${slide.title}-${index}`}>
                <div className="slide-card__eyebrow">Slide {index + 1}</div>
                <h4>{slide.title}</h4>
                <p>{slide.objective}</p>
                <ul>
                  {(slide.bullets || []).map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
