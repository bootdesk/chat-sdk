import React, { useState, useRef, useEffect } from "react";
import { useAttachmentUpload } from "../hooks/useAttachmentUpload";
import { Dropzone } from "./Dropzone";
import { AttachmentList } from "./AttachmentList";
import { useLocale } from "../i18n/LocaleProvider";
import { cn } from "../lib/cn";

interface InputAreaProps {
  onSend: (
    text: string,
    attachments: Array<{ url: string; name: string; mimeType: string; size: number }>,
  ) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  enableAttachments?: boolean;
  uploadConfig?: import("../types/AttachmentUpload").UploadConfig;
  accept?: string;
  maxFileSize?: number;
}

export function InputArea({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className,
  enableAttachments = false,
  uploadConfig,
  accept,
  maxFileSize,
}: InputAreaProps): React.JSX.Element {
  const [text, setText] = useState("");
  const [showDropzone, setShowDropzone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);

  const { attachments, addFiles, removeAttachment, clearAttachments, isUploading } =
    useAttachmentUpload(uploadConfig);

  const { t } = useLocale();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  }, [text]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || sendingRef.current) return;
    if (isUploading) return;

    sendingRef.current = true;

    const uploadedAttachments = attachments
      .filter((a) => a.status === "uploaded" && a.url)
      .map((a) => ({
        url: a.url!,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
      }));

    setText("");
    setShowDropzone(false);
    clearAttachments();
    try {
      await onSend(trimmed, uploadedAttachments);
    } finally {
      sendingRef.current = false;
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend =
    (text.trim().length > 0 || attachments.some((a) => a.status === "uploaded")) && !isUploading;

  return (
    <div
      className={cn("bdesk-input-area", className)}
      data-chat-input-area="true"
      data-testid="chat-input-area"
    >
      {enableAttachments && attachments.length > 0 && (
        <AttachmentList attachments={attachments} onRemove={removeAttachment} />
      )}

      {enableAttachments && showDropzone && uploadConfig && (
        <Dropzone
          onFilesSelected={addFiles}
          disabled={disabled || isUploading}
          accept={accept}
          maxSize={maxFileSize}
        />
      )}

      <div className="bdesk-input-area-row">
        {enableAttachments && uploadConfig && (
          <button
            onClick={() => setShowDropzone((prev) => !prev)}
            disabled={disabled}
            className={cn(
              "bdesk-input-area-attach",
              showDropzone && "bdesk-input-area-attach--active",
            )}
            data-chat-attachment-toggle="true"
            aria-label="Toggle file attachment"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bdesk-input"
          data-chat-input="true"
          rows={1}
          name="chat-message"
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || !canSend}
          className="bdesk-send-btn"
          data-chat-send-button="true"
          aria-label={t("inputArea.send")}
        >
          {isUploading ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="bdesk-spinner"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
