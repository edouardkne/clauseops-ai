export type IconName = "grid" | "file" | "check" | "calendar" | "shield" | "spark" | "chart" | "settings" | "arrow" | "upload" | "search" | "clock" | "alert" | "menu" | "close" | "link";
const paths: Record<IconName, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  file: "M14 2H5v20h14V7z M14 2v6h5 M8 12h8 M8 16h6",
  check: "M5 12l4 4L19 6", calendar: "M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18 M7 14h2 M12 14h2 M7 18h2",
  shield: "M12 2l9 4v6c0 5-9 10-9 10S3 17 3 12V6z M8 12l3 3 5-6",
  spark: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
  chart: "M4 3v18h18 M8 17v-5 M13 17V8 M18 17V4",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  arrow: "M4 12h16 M14 6l6 6-6 6", upload: "M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6",
  search: "M17 10a7 7 0 1 0-14 0 7 7 0 0 0 14 0 M15 15l6 6",
  clock: "M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0 M12 6v6l4 2",
  alert: "M12 3L2 21h20z M12 9v5 M12 17v1", menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "M5 5l14 14 M19 5L5 19", link: "M10 13l4-4 M8 16H6a4 4 0 0 1 0-8h4 M14 8h4a4 4 0 0 1 0 8h-4",
};
export function Icon({ name, size = 20 }: {
  name: IconName;
  size?: number;
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name]} />
  </svg>;
}
