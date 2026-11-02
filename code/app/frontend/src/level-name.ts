// Display labels only; saved level IDs stay unchanged.
export const levelName = (label: string): string => label.replace(/\bL(\d+)\b/g, "Level $1");
