import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { EMOJI } from "../data/emoji";
import { useLocale } from "../i18n/LocaleProvider";
import { cn } from "../lib/cn";

interface EmojiPickerProps {
  messageId: string;
  existingEmojis: string[];
  onSelect: (messageId: string, emoji: string) => void;
  onClose: () => void;
  anchorEl: HTMLElement;
}

export function EmojiPicker({
  messageId,
  existingEmojis,
  onSelect,
  onClose,
  anchorEl,
}: EmojiPickerProps) {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return EMOJI;
    const q = search.toLowerCase();
    return EMOJI.filter((e) => e.name.includes(q));
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const rect = anchorEl.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.min(rect.bottom + 4, window.innerHeight - 380),
    left: Math.min(rect.left, window.innerWidth - 340),
    zIndex: 9999,
  };

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(messageId, emoji);
      onClose();
    },
    [messageId, onSelect, onClose],
  );

  const isExisting = useCallback((char: string) => existingEmojis.includes(char), [existingEmojis]);

  return createPortal(
    <div
      ref={pickerRef}
      className="bdesk-emoji-picker"
      style={style}
      role="dialog"
      aria-label="Emoji picker"
    >
      <input
        className="bdesk-emoji-picker-search"
        placeholder={t("emojiPicker.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {filtered.length === 0 ? (
        <div className="bdesk-emoji-picker-empty">{t("emojiPicker.noResults")}</div>
      ) : (
        <div className="bdesk-emoji-picker-grid">
          {filtered.map((emoji) => (
            <button
              key={emoji.name}
              className={cn(
                "bdesk-emoji-picker-item",
                isExisting(emoji.char) && "bdesk-emoji-picker-item--disabled",
              )}
              onClick={() => !isExisting(emoji.char) && handleSelect(emoji.char)}
              title={emoji.name.replace(/_/g, " ")}
              disabled={isExisting(emoji.char)}
            >
              {emoji.char}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
