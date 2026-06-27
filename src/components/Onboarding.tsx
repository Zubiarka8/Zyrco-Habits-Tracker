import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Sparkles } from "lucide-react";
import { HABIT_TEMPLATES } from "../data/habitTemplates";
import type { HabitTemplate } from "../data/habitTemplates";

interface OnboardingProps {
  onComplete: (template: HabitTemplate | null, doCheckIn?: boolean) => void;
}

const STARTER_TEMPLATES = HABIT_TEMPLATES.filter((t) =>
  ["Meditate", "Morning walk", "Read"].includes(t.name)
);

/** Full-screen first-run overlay guiding the user to create their first habit. */
export function Onboarding({ onComplete }: OnboardingProps) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<"welcome" | "pick" | "celebrate">("welcome");
  const [chosen, setChosen] = useState<HabitTemplate | null>(null);
  const isEs = i18n.language.startsWith("es");

  const tName = (tmpl: HabitTemplate) => isEs ? tmpl.name_es : tmpl.name;
  const tDesc = (tmpl: HabitTemplate) => isEs ? (tmpl.description_es ?? "") : (tmpl.description ?? "");

  const handlePick = (tmpl: HabitTemplate) => {
    setChosen(tmpl);
    setStep("celebrate");
  };

  const handleSkip = () => onComplete(null);

  const handleFinish = (doCheckIn = false) => onComplete(chosen, doCheckIn);

  if (step === "welcome") {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card">
          <div className="onboarding-logo">🌱</div>
          <h1 className="onboarding-title">{t("onboarding.welcomeTitle")}</h1>
          <p className="onboarding-body">{t("onboarding.welcomeBody")}</p>
          <button className="btn btn-primary onboarding-cta" onClick={() => setStep("pick")}>
            <Sparkles size={16} />
            {t("onboarding.start")}
          </button>
          <button className="btn btn-ghost onboarding-skip" onClick={handleSkip}>
            {t("onboarding.skip")}
          </button>
        </div>
      </div>
    );
  }

  if (step === "pick") {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card onboarding-card--wide">
          <h2 className="onboarding-title">{t("onboarding.pickTitle")}</h2>
          <p className="onboarding-body">{t("onboarding.pickBody")}</p>
          <div className="onboarding-templates">
            {STARTER_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                className="onboarding-tmpl"
                style={{ "--habit-color": tmpl.color } as React.CSSProperties}
                onClick={() => handlePick(tmpl)}
              >
                <span className="onboarding-tmpl-icon" style={{ background: tmpl.color }}>
                  {tmpl.icon}
                </span>
                <span className="onboarding-tmpl-name">{tName(tmpl)}</span>
                <span className="onboarding-tmpl-desc">{tDesc(tmpl)}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-ghost onboarding-skip" onClick={handleSkip}>
            {t("onboarding.createCustom")}
          </button>
        </div>
      </div>
    );
  }

  // celebrate
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-celebrate">
          <CheckCircle2 size={48} color="var(--color-success)" />
        </div>
        <h2 className="onboarding-title">{t("onboarding.celebrateTitle")}</h2>
        <p className="onboarding-body">
          {chosen ? `${chosen.icon} ${tName(chosen)}` : ""}
          {" "}{t("onboarding.celebrateBody")}
        </p>
        <button className="btn btn-primary onboarding-cta" onClick={() => handleFinish(true)}>
          ✓ {t("onboarding.firstCheckIn")}
        </button>
        <button className="btn btn-ghost onboarding-skip" onClick={() => handleFinish(false)}>
          {t("onboarding.goTo")}
        </button>
      </div>
    </div>
  );
}
