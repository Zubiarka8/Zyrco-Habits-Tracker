import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "./Modal";

interface NoteModalProps {
  open: boolean;
  initialNote: string | null;
  habitName: string;
  onSave: (note: string) => void;
  onClose: () => void;
}

export function NoteModal({
  open,
  initialNote,
  habitName,
  onSave,
  onClose,
}: NoteModalProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState(initialNote ?? "");

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <Modal open={open} title={habitName} onClose={onClose} size="sm">
      <textarea
        className="textarea"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("today.notePlaceholder")}
        rows={4}
        autoFocus
      />
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          {t("common.cancel")}
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
      </div>
    </Modal>
  );
}
