import type { PageLoad } from './$types';

type LatestRelease = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

function formatReleaseDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function extractChanges(body: string | null | undefined): string[] {
  if (!body) return [];

  return body
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.match(/^[-*]\s+(.*)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);
}

export const load: PageLoad = async ({ fetch }) => {
  const fallback: LatestRelease = {
    version: 'v1.3.0',
    date: 'April 2026',
    title: 'Jack Integration & Core Upgrades',
    changes: [
      'Introduced Jack for robust file tree architecture and multi-tab editor navigation.',
      'Reduced Yjs collaboration latency to <50ms for smoother live editing experiences.',
      'Polished secure preview environments and accessibility UI elements.'
    ]
  };

  try {
    const response = await fetch('https://api.github.com/repos/rkvishwa/Sonar-Code-Editor/releases', {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      return { latestRelease: fallback };
    }

    const releases = (await response.json()) as Array<{
      tag_name?: string;
      name?: string;
      body?: string | null;
      published_at?: string;
    }>;

    if (!releases || releases.length === 0) {
      return { latestRelease: fallback };
    }

    const release = releases[0];

    if (!release.tag_name || !release.published_at) {
      return { latestRelease: fallback };
    }

    const changes = extractChanges(release.body);

    return {
      latestRelease: {
        version: release.tag_name,
        date: formatReleaseDate(release.published_at),
        title: release.name || 'Latest Update',
        changes: changes.length ? changes : fallback.changes
      }
    };
  } catch {
    return { latestRelease: fallback };
  }
};