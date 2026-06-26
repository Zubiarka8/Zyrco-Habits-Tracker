import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, tursoEnabled } from "../auth/AuthContext";

type Mode = "login" | "register";

const ERROR_KEYS: Record<string, string> = {
  "auth.userNotFound":  "auth.errorNotFound",
  "auth.wrongPassword": "auth.errorWrongPassword",
  "auth.emailTaken":    "auth.errorEmailTaken",
};

export function Auth() {
  const { t }                       = useTranslation();
  const { login, register }         = useAuth();
  const [mode, setMode]             = useState<Mode>("login");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tursoEnabled) {
      setError(t("auth.errorNoTurso"));
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError(t("auth.errorPasswordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.errorPasswordShort"));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const i18nKey = ERROR_KEYS[msg] ?? "auth.errorGeneric";
      setError(t(i18nKey));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <span className="auth-brand-icon">🔥</span>
          <h1 className="auth-brand-name">Zyrco</h1>
          <p className="auth-brand-tagline">{t("auth.tagline")}</p>
        </div>

        {/* Turso not configured warning — informational only, doesn't block typing */}
        {!tursoEnabled && (
          <div className="auth-notice">
            <span>⚠️</span>
            <div>
              <p className="auth-notice-title">{t("auth.noTursoTitle")}</p>
              <p className="auth-notice-desc">{t("auth.noTursoDesc")}</p>
            </div>
          </div>
        )}

        {/* Mode tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("login")}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "auth-tab--active" : ""}`}
            onClick={() => switchMode("register")}
          >
            {t("auth.register")}
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="field-label">{t("auth.email")}</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="form-field">
            <label className="field-label">{t("auth.password")}</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              required
              minLength={6}
              disabled={submitting}
            />
          </div>

          {mode === "register" && (
            <div className="form-field">
              <label className="field-label">{t("auth.confirmPassword")}</label>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                required
                minLength={6}
                disabled={submitting}
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={submitting}
          >
            {submitting
              ? t("auth.loading")
              : mode === "login"
              ? t("auth.loginBtn")
              : t("auth.registerBtn")}
          </button>
        </form>

        {/* Switch mode hint */}
        <p className="auth-switch">
          {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? t("auth.register") : t("auth.login")}
          </button>
        </p>
      </div>
    </div>
  );
}
