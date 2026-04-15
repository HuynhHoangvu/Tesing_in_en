import { createCookie, redirect } from 'react-router';

export const adminCookie = createCookie('admin-session', {
  maxAge: 86400, // 24 hours
  httpOnly: true,
  sameSite: 'lax',
  secrets: [process.env.COOKIE_SECRET || 'fly-immigration-secret-2025'],
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Fly2026$$';

export async function requireAdmin(request: Request): Promise<void> {
  const cookieHeader = request.headers.get('Cookie');
  const value = await adminCookie.parse(cookieHeader);
  if (value !== 'authenticated') {
    throw redirect('/admin');
  }
}

export function checkPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
