import wordmark from "./assets/reclaim-wordmark.svg";
import clockIcon from "./assets/clock.svg";
import { workflowCards } from "./appData";

export default function AuthScreen({
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authMessage,
  authLoading,
  onSubmit
}) {
  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero__nav">
          <div className="brand-lockup">
            <img className="brand-lockup__icon" src={clockIcon} alt="" />
            <img className="brand-lockup__wordmark" src={wordmark} alt="Reclaim" />
          </div>
          <span className="auth-hero__caption">Built for engineering teams</span>
        </div>

        <div className="auth-hero__body">
          <p className="eyebrow eyebrow--muted">Less busywork. More billable hours.</p>
          <h1>Reclaim the hours hidden inside reports, updates, and decks.</h1>
          <p className="auth-hero__lede">
            Reclaim helps engineering firms turn dense technical input into faster,
            cleaner, client-ready output without dragging senior teams into admin work.
          </p>

          <div className="auth-highlights">
            <article className="auth-highlight">
              <span>Report reviews</span>
              <strong>Minutes, not hours</strong>
            </article>
            <article className="auth-highlight">
              <span>Project updates</span>
              <strong>Sent faster</strong>
            </article>
            <article className="auth-highlight">
              <span>Deck output</span>
              <strong>Brand-ready</strong>
            </article>
          </div>

          <div className="auth-workflows">
            {workflowCards.map((workflow) => (
              <article className="auth-workflow" key={workflow.title}>
                <h3>{workflow.title}</h3>
                <p>{workflow.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card__switch">
            <button
              className={`auth-tab ${authMode === "login" ? "auth-tab--active" : ""}`}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`auth-tab ${authMode === "register" ? "auth-tab--active" : ""}`}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Create account
            </button>
          </div>

          <div className="auth-card__content">
            <p className="eyebrow">Access your workspace</p>
            <h2>{authMode === "login" ? "Sign in to continue." : "Create your Reclaim account."}</h2>
            <p className="auth-card__copy">
              {authMode === "login"
                ? "Sign in to your web workspace and continue where you left off."
                : "Create a web account with a secure local database for login, brand settings, and API access."}
            </p>

            <form className="auth-form" onSubmit={onSubmit}>
              {authMode === "register" ? (
                <>
                  <label className="field">
                    <span>Full name</span>
                    <input
                      value={authForm.fullName}
                      onChange={(event) => setAuthForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Alex Mercer"
                    />
                  </label>

                  <label className="field">
                    <span>Company</span>
                    <input
                      value={authForm.company}
                      onChange={(event) => setAuthForm((current) => ({ ...current, company: event.target.value }))}
                      placeholder="Reclaim Engineering"
                    />
                  </label>
                </>
              ) : null}

              <label className="field">
                <span>Email</span>
                <input
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@company.com"
                  type="email"
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  type="password"
                />
              </label>

              {authMessage ? <div className="auth-message">{authMessage}</div> : null}

              <button className="button button--primary button--full" disabled={authLoading} type="submit">
                {authLoading ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
