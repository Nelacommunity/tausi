/** Passwords seen most often in breaches — refused outright. */
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "qwerty123", "qwertyuiop", "1q2w3e4r5t",
  "123456789a", "abc1234567", "iloveyou12", "welcome123", "letmein123", "admin12345", "tausi12345", "football12",
  "sunshine12", "princess12", "monkey1234", "dragon1234", "baseball12", "trustno1234", "superman12", "1234567890a",
]);

export const PASSWORD_MIN = 10;

/**
 * Why a new password isn't good enough, or null if it is: at least 10
 * characters, letters and numbers, not a well-known password, and not the
 * email address itself.
 */
export function passwordProblem(password: string, email = ""): "short" | "weak" | "common" | null {
  if (password.length < PASSWORD_MIN) return "short";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "weak";
  const lower = password.toLowerCase();
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (COMMON.has(lower) || (local.length >= 4 && lower.includes(local)) || /^(.)\1+$/.test(lower)) return "common";
  return null;
}
