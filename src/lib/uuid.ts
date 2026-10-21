/** Allocate a UUIDv7 locally so dependent offline records share their final IDs. */
export function uuidV7(now = Date.now()): string {
  if (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff)
    throw new Error("Invalid UUID timestamp");
  const random = crypto.randomUUID();
  const time = now.toString(16).padStart(12, "0");
  return `${time.slice(0, 8)}-${time.slice(8)}-7${random.slice(15)}`;
}
