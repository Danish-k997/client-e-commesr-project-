export type ApplicationRole = "CUSTOMER" | "ADMIN";

export function getApplicationRole(role: unknown): ApplicationRole {
  return role === "ADMIN" ? "ADMIN" : "CUSTOMER";
}
