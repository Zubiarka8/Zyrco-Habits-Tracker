import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { exportAllData, importData, type ExportData } from "../db/database";

// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Export JSON básico → todos los planes.
// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Export CSV / PDF → solo premium.
// Cuando MONETIZATION_ACTIVE = true: mostrar PremiumGate wrapping el botón CSV/PDF.
export function ImportExport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "success"; msg: string }
    | { type: "error"; msg: string }
  >({ type: "idle" });

  const handleExport = async () => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `zyrco-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    const data = await exportAllData();
    const habitMap = new Map(data.habits.map((h) => [h.id, h]));
    const catMap = new Map(data.categories.map((c) => [c.id, c]));
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = "date,habit,category,completed,value,note\n";
    const rows = data.logs
      .map((l) => {
        const habit = habitMap.get(l.habit_id);
        const cat = habit?.category_id ? catMap.get(habit.category_id) : undefined;
        return [
          l.date,
          esc(habit?.name ?? ""),
          esc(cat?.name ?? ""),
          l.completed ? "1" : "0",
          l.value ?? "",
          esc(l.note ?? ""),
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zyrco-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const text = await file.text();
      const parsed: ExportData = JSON.parse(text);

      if (!parsed.version || !Array.isArray(parsed.habits)) {
        throw new Error("Invalid format");
      }

      const result = await importData(parsed);
      setStatus({
        type: "success",
        msg: t("settings.importSuccess", {
          habits: result.habits,
          categories: result.categories,
          logs: result.logs,
        }),
      });
    } catch {
      setStatus({ type: "error", msg: t("settings.importError") });
    }

    setTimeout(() => setStatus({ type: "idle" }), 5000);
  };

  return (
    <div className="import-export">
      <div className="setting-row">
        <div>
          <p className="setting-label">{t("settings.exportBtn")}</p>
          <p className="text-muted text-sm">{t("settings.exportDesc")}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>
          <Download size={14} />
          JSON
        </button>
      </div>

      <div className="setting-row">
        <div>
          <p className="setting-label">{t("settings.exportCsvBtn")}</p>
          <p className="text-muted text-sm">{t("settings.exportCsvDesc")}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExportCsv}>
          <Download size={14} />
          CSV
        </button>
      </div>

      <div className="setting-row">
        <div>
          <p className="setting-label">{t("settings.importBtn")}</p>
          <p className="text-muted text-sm">{t("settings.importDesc")}</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          {t("settings.importBtn")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>

      {status.type !== "idle" && (
        <div className={`import-status import-status-${status.type}`}>
          {status.type === "success" ? (
            <CheckCircle2 size={14} />
          ) : (
            <AlertCircle size={14} />
          )}
          <span>{status.msg}</span>
        </div>
      )}
    </div>
  );
}
