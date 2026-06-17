import React, { useCallback, useState, useRef } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { cn } from "../lib/cn";

interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  disabled?: boolean;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  className?: string;
}

export function Dropzone({
  onFilesSelected,
  disabled = false,
  accept,
  maxSize,
  multiple = true,
  className,
}: DropzoneProps): React.JSX.Element {
  const { t } = useLocale();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const filtered = filterFiles(files, maxSize, accept);
        if (filtered.length > 0) {
          onFilesSelected(multiple ? filtered : [filtered[0]!]);
        }
      }
    },
    [disabled, maxSize, accept, multiple, onFilesSelected],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const files = e.target.files;
      if (files && files.length > 0) {
        const filtered = filterFiles(files, maxSize, accept);
        if (filtered.length > 0) {
          onFilesSelected(multiple ? filtered : [filtered[0]!]);
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [disabled, maxSize, accept, multiple, onFilesSelected],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  function filterFiles(files: FileList, maxSize?: number, accept?: string): File[] {
    return Array.from(files).filter((file) => {
      if (maxSize && file.size > maxSize) return false;
      if (accept) {
        const accepted = accept.split(",").map((a) => a.trim().toLowerCase());
        const mimeType = file.type.toLowerCase();
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        return accepted.some((a) => {
          if (a.endsWith("/*")) return mimeType.startsWith(a.replace("/*", "/"));
          return a === mimeType || a === ext;
        });
      }
      return true;
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "bdc-dropzone",
        isDragging && "bdc-dropzone--dragging",
        disabled && "bdc-dropzone--disabled",
        className,
      )}
      data-chat-dropzone="true"
      data-testid="chat-dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="bdc-dropzone-input"
        disabled={disabled}
        aria-hidden="true"
      />
      <div className="bdc-dropzone-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragging ? "var(--chat-primary)" : "var(--chat-text-secondary)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="bdc-dropzone-icon"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <div className="bdc-dropzone-text">
          {isDragging ? t("inputArea.dropzone.dropFiles") : t("inputArea.dropzone.dropOrClick")}
        </div>
      </div>
    </div>
  );
}
