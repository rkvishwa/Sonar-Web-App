const WEBSITE_URL = String(import.meta.env.VITE_SONAR_WEBSITE_URL || '').trim();

function normalizeHackathonId(value: string): string {
  return String(value || '').replace(/\D+/g, '');
}

function getWebsiteBaseUrl(): string {
  const fromEnv = WEBSITE_URL.replace(/\/+$/g, '');
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/g, '');
  }

  return '';
}

export function buildHackathonEditorInviteUrl(hackathonId: string): string {
  const normalizedHackathonId = normalizeHackathonId(hackathonId);
  if (!normalizedHackathonId) {
    throw new Error('Hackathon ID is required to generate an invite link.');
  }

  const baseUrl = getWebsiteBaseUrl();
  if (!baseUrl) {
    return `/download?hackathonId=${encodeURIComponent(normalizedHackathonId)}`;
  }

  const url = new URL('/download', `${baseUrl}/`);
  url.searchParams.set('hackathonId', normalizedHackathonId);
  return url.toString();
}
