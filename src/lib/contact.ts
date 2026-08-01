// Central contact details for ArtSpace support.
export const SUPPORT_EMAIL = "artspacehelp@gmail.com";

export const mailto = (subject: string, body?: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

// Google Drive folder used for artist certificates / portfolio submissions.
// Replace with the shared folder link from the artspacehelp@gmail.com Drive.
export const SUPPORT_DRIVE_URL = "https://drive.google.com/drive/my-drive";
