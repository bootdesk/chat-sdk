import React, { useState } from "react";
import type { PollCardOption, PollCardResult } from "@bootdesk/js-web-adapter-core";
import { PollCard as PollCardType } from "@bootdesk/js-web-adapter-core";
import { CardRendererProps } from "./types";

export function PollCardComponent({
  card: rawCard,
  onActionClick,
}: CardRendererProps): React.JSX.Element | null {
  if (rawCard.type !== "poll") return null;

  const card = rawCard as PollCardType;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [voted, setVoted] = useState(false);

  const totalVotes =
    card.results?.reduce((sum: number, r: PollCardResult) => sum + r.count, 0) ?? 0;

  const toggleOption = (id: string) => {
    if (voted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (card.allowMultiple) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  };

  const handleVote = () => {
    if (selected.size === 0) return;
    for (const id of selected) {
      onActionClick?.(`poll_vote`, id);
    }
    setVoted(true);
  };

  return (
    <div className="bdesk-poll-card" data-chat-card="poll">
      <div className="bdesk-poll-card-question">{card.question}</div>

      <div className="bdesk-poll-card-options">
        {card.options.map((option: PollCardOption) => {
          const result = card.results?.find((r: PollCardResult) => r.optionId === option.id);
          const pct = totalVotes > 0 && result ? Math.round((result.count / totalVotes) * 100) : 0;
          const isSelected = selected.has(option.id);

          return (
            <button
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className={`bdesk-poll-card-option${isSelected ? " bdesk-poll-card-option--selected" : ""}${voted ? " bdesk-poll-card-option--voted" : ""}`}
              data-poll-option={option.id}
              disabled={voted}
            >
              <span className="bdesk-poll-card-option-label">{option.label}</span>
              {voted && result && (
                <span className="bdesk-poll-card-option-bar-wrap">
                  <span className="bdesk-poll-card-option-bar" style={{ width: `${pct}%` }} />
                  <span className="bdesk-poll-card-option-pct">{pct}%</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!voted && selected.size > 0 && (
        <button onClick={handleVote} className="bdesk-poll-card-vote-btn">
          Vote{card.allowMultiple ? ` (${selected.size})` : ""}
        </button>
      )}

      {voted && totalVotes > 0 && (
        <div className="bdesk-poll-card-total">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
