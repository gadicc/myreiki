import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

// Technical exceptions stay internal; only known app messages are displayed.
/** English diagnostic keys keep storage/protocol errors independent of UI language. */
const messages: Record<string, MessageDescriptor> = {
  "A saved change could not be synchronized. Your work remains on this device.": msg`A saved change could not be synchronized. Your work remains on this device.`,
  "A client name matches multiple records. Import these treatments individually.": msg`A client name matches multiple records. Import these treatments individually.`,
  "Enter a valid value.": msg`Enter a valid value.`,
  "Enter a valid date": msg`Enter a valid date`,
  "Enter a valid email address.": msg`Enter a valid email address.`,
  "Use an international phone number starting with +.": msg`Use an international phone number starting with +.`,
  "Enter a valid website URL.": msg`Enter a valid website URL.`,
  "Enter a two-letter country code.": msg`Enter a two-letter country code.`,
  "Enter a whole number of minutes greater than zero.": msg`Enter a whole number of minutes greater than zero.`,
  "Device storage is unavailable. Enable browser storage to open or edit records.": msg`Device storage is unavailable. Enable browser storage to open or edit records.`,
  "Could not verify the account. Saved device records remain available offline.": msg`Could not verify the account. Saved device records remain available offline.`,
  "This record changed on another device. Choose which version to keep below.": msg`This record changed on another device. Choose which version to keep below.`,
  "Synchronization paused. Your pending work remains on this device.": msg`Synchronization paused. Your pending work remains on this device.`,
  "Synchronization paused; pending work is retained.": msg`Synchronization paused; pending work is retained.`,
  "Server sign-out was unavailable": msg`Server sign-out was unavailable`,
  "Signed out on this device. Connect before signing in again.": msg`Signed out on this device. Connect before signing in again.`,
  "Connect to the internet before signing in.": msg`Connect to the internet before signing in.`,
  "Google sign-in failed": msg`Google sign-in failed`,
  "Sign in before editing records.": msg`Sign in before editing records.`,
  "This record changed on another device. Choose which version to keep.": msg`This record changed on another device. Choose which version to keep.`,
  "Sign in again": msg`Sign in again`,
  "Could not resolve conflict": msg`Could not resolve conflict`,
  "Keep my changes": msg`Keep my changes`,
  "Use server version": msg`Use server version`,
  "Account changed; reopen the record before saving.": msg`Account changed; reopen the record before saving.`,
  "This record changed while you were editing. Copy your changes and reopen it before saving.": msg`This record changed while you were editing. Copy your changes and reopen it before saving.`,
  "This record has been deleted.": msg`This record has been deleted.`,
  "Unexpected synchronization receipt": msg`Unexpected synchronization receipt`,
  "Conflict changed": msg`Conflict changed`,
  "This record is unavailable on the server. Export the pending work before removing device data.": msg`This record is unavailable on the server. Export the pending work before removing device data.`,
  "Choose an available practice.": msg`Choose an available practice.`,
  "The device operation failed. Your saved work is retained.": msg`The device operation failed. Your saved work is retained.`,
  "Connect and sign in again before changing this setting.": msg`Connect and sign in again before changing this setting.`,
  "Could not update setting": msg`Could not update setting`,
  "Turn off": msg`Turn off`,
  "Turn on": msg`Turn on`,
  "The browser granted persistent storage.": msg`The browser granted persistent storage.`,
  "Persistent storage was not granted. Pending work is still saved locally.": msg`Persistent storage was not granted. Pending work is still saved locally.`,
  "Administrator access is required online.": msg`Administrator access is required online.`,
  "Could not load users": msg`Could not load users`,
  "Could not save on this device": msg`Could not save on this device`,
  "Invalid paste": msg`Invalid paste`,
  "This paste was already saved on this device.": msg`This paste was already saved on this device.`,
  "Could not save import": msg`Could not save import`,
};
/** Translate known diagnostics and status messages; keep unknown exceptions private. */
export function displayError(i18n: I18n, error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const rowMatch = /^Row (\d+): (.+)$/.exec(message);
  if (rowMatch) {
    const row = Number(rowMatch[1]);
    const reasons: Record<string, MessageDescriptor> = {
      "expected four or five tab-separated columns.": msg`Row ${row}: expected four or five tab-separated columns.`,
      "use YYYY-MM-DD or an ISO date and time with timezone.": msg`Row ${row}: use YYYY-MM-DD or an ISO date and time with timezone.`,
      "invalid date.": msg`Row ${row}: invalid date.`,
      "client name and whole minutes are required.": msg`Row ${row}: client name and whole minutes are required.`,
      "invalid duration or Reiki type.": msg`Row ${row}: invalid duration or Reiki type.`,
    };
    if (Object.hasOwn(reasons, rowMatch[2]))
      return i18n._(reasons[rowMatch[2]]);
  }
  const imported = /^(\d+) treatments saved on this device\.$/.exec(message);
  if (imported) {
    const count = Number(imported[1]);
    return i18n._(msg`${count} treatments saved on this device.`);
  }
  if (Object.hasOwn(messages, message)) return i18n._(messages[message]);
  return i18n._(
    msg`The operation could not be completed. Your saved work is retained. Please try again.`,
  );
}
