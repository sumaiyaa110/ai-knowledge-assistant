import bcrypt from "bcrypt";

// 2^12 rounds: roughly 200-300ms per hash on a typical laptop.
const COST = 12;

// Compared against when the email is unknown, so a login attempt takes the
// same time whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", COST);

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return Boolean(hash) && matches;
}
