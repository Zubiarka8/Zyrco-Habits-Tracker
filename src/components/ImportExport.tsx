import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { exportAllData, importData, type ExportData } from "../db/database";

// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Export JSON básico → todos los planes.
// [FUTURO - PREMIUM MENSUAL + ANUAL + LIFETIME] Export CSV / PDF → solo premium.
// Cuando MONETIZATION_ACTIVE = true: mostrar PremiumGate wrapping el botón CSV/PDF.

type Status =
  | { type: "idle" }
  | { type: "success"; msg: string }
  | { type: "error"; msg: string };

/** Save content using the native file-save dialog (File System Access API).
 *  Falls back to anchor.download if the API is unavailable.
 *  mimeType may include charset params (e.g. "text/csv;charset=utf-8") —
 *  the picker only sees the base type so the Accept object stays valid. */
async function saveFile(filename: string, content: string, mimeType: string): Promise<"saved" | "cancelled" | "fallback"> {
  // Strip charset / params for the picker's accept map (needs bare MIME type)
  const baseMime = mimeType.split(";")[0].trim();
  const ext = filename.split(".").pop() ?? "dat";

  if ("showSaveFilePicker" in window) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: filename.toUpperCase().split(".").pop(), accept: { [baseMime]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return "saved";
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === "AbortError") return "cancelled";
      // Unexpected API error — fall through to anchor download
    }
  }
  // Fallback: browser saves to Downloads without a dialog
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return "fallback";
}

export function ImportExport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const flash = (s: Status) => {
    setStatus(s);
    setTimeout(() => setStatus({ type: "idle" }), 5000);
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().slice(0, 10);
      const result = await saveFile(`zyrco-backup-${date}.json`, json, "application/json");
      if (result !== "cancelled") flash({ type: "success", msg: t("settings.exportSuccess") });
    } catch (err) {
      console.error("[Export] JSON export failed:", err);
      flash({ type: "error", msg: t("settings.exportError") });
    }
  };

  const handleExportCsv = async () => {
    try {
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
      const date = new Date().toISOString().slice(0, 10);
      const result = await saveFile(`zyrco-${date}.csv`, header + rows, "text/csv;charset=utf-8;");
      if (result !== "cancelled") flash({ type: "success", msg: t("settings.exportCsvSuccess") });
    } catch (err) {
      console.error("[Export] CSV export failed:", err);
      flash({ type: "error", msg: t("settings.exportError") });
    }
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
      flash({
        type: "success",
        msg: t("settings.importSuccess", {
          habits: result.habits,
          categories: result.categories,
          logs: result.logs,
        }),
      });
    } catch (err) {
      console.error("[Import] Import failed:", err);
      flash({ type: "error", msg: t("settings.importError") });
    }
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
          {status.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{status.msg}</span>
        </div>
      )}
    </div>
  );
}
