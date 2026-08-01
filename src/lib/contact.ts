// Central contact details for ArtSpace support.
export const SUPPORT_EMAIL = "artspacehelp@gmail.com";

export const mailto = (subject: string, body?: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

// Google Drive folder used for artist certificates / portfolio submissions.
export const SUPPORT_DRIVE_URL =
  "https://drive.google.com/drive/folders/1aB8lmdvl2i0CFnOrEhnTZ43AokLZn0os?usp=drive_link";
