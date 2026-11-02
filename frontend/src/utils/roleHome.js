// Where each role lands after login
export const homeFor = (role) => ({ admin: "/admin", partner: "/partner" }[role] || "/movies");
