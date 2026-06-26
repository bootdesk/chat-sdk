export interface TimeStrings {
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
}

const defaultStrings: TimeStrings = {
  justNow: "Just now",
  minutesAgo: "{n}m ago",
  hoursAgo: "{n}h ago",
};

export function formatTimestamp(timestamp: number, strings: TimeStrings = defaultStrings): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return strings.justNow;
  if (diffMins < 60) return strings.minutesAgo.replace("{n}", String(diffMins));
  if (diffMins < 1440) return strings.hoursAgo.replace("{n}", String(Math.floor(diffMins / 60)));
  return date.toLocaleDateString();
}
