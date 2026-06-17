import React from "react";
import { PendingAttachment } from "../types/AttachmentUpload";
import { useLocale } from "../i18n/LocaleProvider";
import { formatSize } from "../utils/formatSize";
import { cn } from "../lib/cn";

interface AttachmentListProps {
  attachments: PendingAttachment[];
  onRemove?: (id: string) => void;
  className?: string;
}

export function AttachmentList({
  attachments,
  onRemove,
  className,
}: AttachmentListProps): React.JSX.Element {
  const { t } = useLocale();

  if (attachments.length === 0) return <></>;

  function getFileIcon(mimeType: string): string {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.includes("video")) return "🎬";
    if (mimeType.includes("audio")) return "🎵";
    return "📎";
  }

  return (
    <div className={cn("bdc-attachment-list", className)} data-chat-attachment-list="true">
      {attachments.map((att) => (
        <div
          key={att.id}
          className={cn(
            "bdc-attachment-item",
            att.status === "error" && "bdc-attachment-item--error",
          )}
          data-chat-attachment-item={att.id}
        >
          <span>{getFileIcon(att.mimeType)}</span>
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "bdc-attachment-name",
                att.status === "error" && "bdc-attachment-name--error",
              )}
            >
              {att.name}
            </div>
            <div className="bdc-attachment-size">
              {att.status === "uploading"
                ? `${att.progress}%`
                : att.status === "error"
                  ? att.error || t("attachmentList.uploadFailed")
                  : formatSize(att.size)}
            </div>
            {att.status === "uploading" && (
              <div className="bdc-attachment-progress">
                <div
                  className="bdc-attachment-progress-fill"
                  style={{ width: `${att.progress}%` }}
                />
              </div>
            )}
          </div>
          {onRemove && att.status !== "uploading" && (
            <button
              onClick={() => onRemove(att.id)}
              className="bdc-attachment-remove"
              aria-label={`Remove ${att.name}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
