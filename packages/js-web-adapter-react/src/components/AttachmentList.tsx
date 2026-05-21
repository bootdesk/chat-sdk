import React from "react";
import { PendingAttachment } from "../types/AttachmentUpload";
import { useLocale } from "../i18n/LocaleProvider";
import { formatSize } from "../utils/formatSize";

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
    <div className={`flex flex-wrap gap-1 p-1 ${className || ""}`} data-chat-attachment-list="true">
      {attachments.map((att) => (
        <div
          key={att.id}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded border max-w-[200px] ${
            att.status === "error"
              ? "bg-chat-error/15 border-chat-error"
              : "bg-chat-surface shadow-sm border-chat-border"
          }`}
          data-chat-attachment-item={att.id}
        >
          <span>{getFileIcon(att.mimeType)}</span>
          <div className="flex-1 min-w-0">
            <div
              className={`overflow-hidden text-ellipsis whitespace-nowrap ${
                att.status === "error" ? "text-chat-error" : "text-chat-text"
              }`}
            >
              {att.name}
            </div>
            <div className="text-[10px] text-chat-text-secondary">
              {att.status === "uploading"
                ? `${att.progress}%`
                : att.status === "error"
                  ? att.error || t("attachmentList.uploadFailed")
                  : formatSize(att.size)}
            </div>
            {att.status === "uploading" && (
              <div className="h-0.5 bg-chat-border rounded overflow-hidden mt-0.5">
                <div
                  className="h-full bg-chat-primary transition-[width] duration-150"
                  style={{ width: `${att.progress}%` }}
                />
              </div>
            )}
          </div>
          {onRemove && att.status !== "uploading" && (
            <button
              onClick={() => onRemove(att.id)}
              className="bg-none border-none cursor-pointer text-chat-text-secondary p-0.5 leading-none hover:text-chat-error"
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
