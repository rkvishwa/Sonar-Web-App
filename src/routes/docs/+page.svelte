<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    Search,
    BookOpen,
    Layers3,
    Terminal,
    Code2,
    FolderTree,
    Users,
    Activity,
    Eye,
    Settings,
    Shield,
    HardDrive,
    Cpu,
    Globe,
    Download,
    Mail,
    KeyRound,
    LayoutDashboard,
    Database,
    Lock,
    FileText,
    Github,
  } from "lucide-svelte";
  import { marked } from "marked";

  let developerDocs: { filename: string, content: string, html: string }[] = $state([]);
  let activeDevTab = $state("");
  let isLoadingDocs = $state(true);
  let hasDocsError = $state(false);

  let repoIssues: any[] = $state([]);
  let isLoadingIssues = $state(true);
  let hasIssuesError = $state(false);

  const targetFiles = [
    'README.md',
    'SECURITY.md',
    'CONTRIBUTING.md',
    'DEVELOPMENT.md',
    'ARCHITECTURE.md',
    'APPWRITE.md',
    'CHANGELOG.md'
  ];

  let activeSection = $state("introduction");
  let searchQuery = $state("");

  const sections = [
    {
      group: "Overview",
      items: [
        { id: "introduction", label: "Introduction" },
        { id: "platform-overview", label: "Platform Overview" },
      ],
    },
    {
      group: "Code Editor App",
      items: [
        { id: "app-installation", label: "Installation & Packaging" },
        { id: "app-editor", label: "Editor Experience" },
        { id: "app-workspace", label: "Workspace & File Tree" },
        { id: "app-collaboration", label: "Collaboration & Invites" },
        { id: "app-search", label: "Search & Productivity" },
        { id: "app-monitoring", label: "Monitoring Capture" },
        { id: "app-preview", label: "Local Preview" },
        { id: "app-settings", label: "Settings & Team Tools" },
        { id: "app-security", label: "Security Model" },
        { id: "app-release", label: "Release Hardening" },
      ],
    },
    {
      group: "Web App",
      items: [
        { id: "web-route-map", label: "Route Map" },
        { id: "web-public-site", label: "Public Site" },
        { id: "web-download-handoff", label: "Download & Handoff" },
        { id: "web-contact-legal", label: "Contact & Legal" },
        { id: "web-host-authentication", label: "Host Authentication" },
        { id: "web-dashboard", label: "Dashboard Overview" },
        { id: "web-hackathons", label: "Hackathons" },
        { id: "web-monitoring", label: "Monitoring & Analytics" },
        { id: "web-settings", label: "Host Settings" },
      ],
    },
    {
      group: "Reference",
      items: [
        { id: "data-layer", label: "Data Layer" },
        { id: "environment-reference", label: "Environment Reference" },
        { id: "architecture", label: "Architecture" },
      ],
    },
    {
      group: "For Developers",
      items: [
        ...targetFiles.map(f => ({
          id: `dev-${f.replace(/\.md$/i, '').toLowerCase()}`,
          label: f
        })),
        { id: 'dev-issues', label: 'Issues' }
      ]
    },
  ];

  const platformCards = [
    {
      title: "Sonar Code Editor App",
      description:
        "The Electron desktop client used by participants and teams for coding, collaboration, previewing, logging activity, and consuming invite links.",
    },
    {
      title: "Sonar Web App",
      description:
        "The SvelteKit website and host portal used for downloads, public pages, host auth, hackathon management, monitoring, and settings.",
    },
  ];

  const appInstallPrereqs = [
    "Node.js 18 or newer",
    "npm",
    "Git",
    "Appwrite configuration for authentication and telemetry-backed flows",
  ];

  const appEditorFeatures = [
    "Monaco Editor with syntax highlighting and language-aware editing (powered by VS Code engine)",
    "Jack-File-Tree: Custom high-performance tree navigation with inline operations",
    "Jack-Editor-Tab: Sophisticated multi-tab management and state recovery",
    "Isolated Preview Panel (restricted webview) with localhost-only access for secure local development",
    "Multi-tab editing with preview/image tabs alongside source files",
    "Auto-save and word-wrap controls, plus configurable collaboration name overlays",
    "Dependency-file change prompts that remind collaborators to run the correct install command locally",
    "Version gating before login so outdated desktop builds can be blocked when required",
    "Offline-first design: all core assets (including Monaco workers) are bundled locally",
  ];

  const appLanguages = [
    "TypeScript",
    "JavaScript",
    "HTML",
    "CSS",
    "JSON",
    "Python",
    "C",
    "C++",
    "PHP",
    "SQL",
    "Markdown",
    "YAML",
    "Shell",
  ];

  const appWorkspaceFeatures = [
    "Custom file tree with create, rename, delete, nested folders, and inline operations",
    "Image and binary file handling so unsupported content does not break the text editor",
    "Cross-platform relative path normalization for collaboration sync across Windows and macOS/Linux paths",
    "Key-shielded file tree input handling to reduce focus conflicts in the desktop shell",
    "Workspace-root aware behavior so file operations stay scoped to the active project",
  ];

  const appCollaborationFeatures = [
    "Jack-File-Tree and Jack-Editor-Tab integration for high-performance state synchronization across peers",
    "Conflict-free Replicated Data Types (CRDTs) powered by Yjs for seamless real-time sync",
    "Real-time synchronization of code, cursor positions, and selections via y-monaco and y-websocket",
    "CollaborationManager: initiates and hosts peer-to-peer style sessions on a local network",
    "Custom sonar-editor:// URI protocol handler for seamless deep-link session joining",
    "Awareness scaling: multi-user tracking with distinct colors and names",
    "Host Session and Join Session flows with integrated firewall/network check prompts",
    "Full workspace sync (folder structure, files, edits) on connection via Jack-File-Tree, not just text buffers",
    "Shareable hackathon/team invite links that route through the website download flow",
    "Explicit reminder that <span class=\"font-bold\">node_modules</span> is not shared and must be installed locally",
  ];

  const appSearchFeatures = [
    "Workspace search through Electron IPC",
    "Debounced search input for large projects",
    "Case-sensitive and whole-word matching options",
    "Results grouped by file with expand/collapse behavior",
    "Search skips `node_modules` and opens files directly at the matched line",
  ];

  const appMonitoringEvents = [
    [
      "Heartbeat & Status",
      "Background MonitoringService sends heartbeats roughly every 15 seconds including active file and team data.",
    ],
    [
      "Context & Focus",
      "Logs window focus changes, active document paths, and online/offline connectivity patterns.",
    ],
    [
      "Clipboard activity",
      "Tracks internal copy/paste and external-paste style events for supervised sessions.",
    ],
    [
      "Security logging",
      "Encrypted event logs that track keystroke patterns, escape attempts, and unauthorized shortcuts.",
    ],
    [
      "Offline resilience",
      "Queues activity logs to a local database when offline; flushes automatically when connection is restored.",
    ],
    [
      "PDF Reporting",
      "Internal ReportGenerator exports session activity and security audits into official PDF reports.",
    ],
  ];

  const appPreviewFeatures = [
    "Integrated Preview Panel: Flexible sidebar view for real-time web previews alongside the editor",
    "Preview Tabs: Standard workspace tabs that render HTML content as fully functional browser-based views",
    "Sticky Preview: Lock the preview to a specific file or port while continuing to navigate other project files",
    "Follow-file mode: The preview surface can be toggled to automatically track and reload when changing active editors",
    "Embedded local preview backed by a desktop static server that finds an open port automatically",
    "Reload-on-save support for immediate iteration directly inside the IDE",
    "Strict localhost-only navigation: any local port can be accessed but only via a localhost URL, completely blocking external browsing",
    "Back, forward, refresh, and console message interception for debugging preview-originated signals",
  ];

  const appSettingsAreas = [
    {
      title: "Text Editor",
      description:
        "Auto-save, hot reload, word wrap, and other coding experience preferences.",
    },
    {
      title: "Appearance",
      description:
        "Theme and accent behavior that persists locally for the desktop UI.",
    },
    {
      title: "Collaboration",
      description:
        "Display collaborator usernames and adjust label opacity for shared editing.",
    },
    {
      title: "Account",
      description:
        "View the current team, manage invite generation, and add team members from the settings modal.",
    },
    {
      title: "Activity Log",
      description:
        "Generate and export comprehensive PDF session reports through the desktop client.",
    },
    {
      title: "Security",
      description:
        "Change the team password and use password-backed team invites when enabled.",
    },
  ];

  const appSecurityLayers = [
    {
      title: "Team login model",
      description:
        "The desktop app signs teams in with hackathon ID, student ID, and password, then applies effective restriction settings from the platform.",
    },
    {
      title: "Workspace containment",
      description:
        "Path handling, workspace-root scoping, and preview URL validation keep operations inside the intended project boundary.",
    },
    {
      title: "Network restriction awareness",
      description:
        "Hackathon and global internet restrictions can block normal usage patterns when the event requires a more controlled environment.",
    },
    {
      title: "Operational telemetry",
      description:
        "Session-close sync, local security logs, and monitoring hooks help maintain a traceable record of IDE behavior.",
    },
  ];

  const appReleaseLayers = [
    "Builds compile JavaScript to bytecode during the packaging pipeline.",
    "A build attestation file is generated so packaged releases can expose signed build metadata.",
    "Packaged apps verify an ASAR integrity seal and signature before continuing.",
    "A renderer heartbeat watchdog detects prolonged unresponsiveness or tampering-like pauses.",
    "Security log entries are chained with HMACs for stronger local auditability.",
    "The desktop app registers the `sonar-editor://` protocol to accept invite handoff from the website.",
    "Electron Builder packaging targets include macOS, Windows, and Microsoft Store AppX flows.",
  ];

  const routeGroups = [
    {
      title: "Public Routes",
      items: [
        {
          path: "/",
          summary:
            "Marketing landing page with adaptive download CTAs and host entry points.",
        },
        {
          path: "/docs",
          summary:
            "Combined documentation for both the desktop editor and the web platform.",
        },
        {
          path: "/download",
          summary:
            "Installer page plus deep-link landing route for desktop invites.",
        },
        {
          path: "/windows/download",
          summary:
            "Windows-specific redirect page that fetches the latest GitHub release installer.",
        },
        {
          path: "/about",
          summary: "Project story plus live GitHub contributor list.",
        },
        {
          path: "/contact",
          summary: "Progressively enhanced contact form with acknowledgement email.",
        },
        {
          path: "/privacy and /terms",
          summary: "Public legal pages linked from the site and host flows.",
        },
      ],
    },
    {
      title: "Host & Dashboard Routes",
      items: [
        {
          path: "/admin",
          summary:
            "Session gate that refreshes auth and redirects into the proper host route.",
        },
        {
          path: "/admin/signin and /admin/signup",
          summary: "Email and OAuth entry points for hosts.",
        },
        {
          path: "/admin/complete-registration",
          summary:
            "OAuth completion step that captures account structure details.",
        },
        {
          path: "/admin/verify-email, /admin/forgot-password, /admin/reset-password",
          summary: "Verification and recovery routes for host accounts.",
        },
        {
          path: "/admin/dashboard",
          summary: "Overview metrics, charts, refresh controls, and live summaries.",
        },
        {
          path: "/admin/dashboard/hackathons",
          summary:
            "Hackathon listing, filtering, and event creation drawer.",
        },
        {
          path: "/admin/dashboard/monitoring",
          summary:
            "Cross-hackathon telemetry, risk summaries, and saved report access.",
        },
        {
          path: "/admin/dashboard/settings",
          summary:
            "Host defaults, account security, and appearance controls.",
        },
        {
          path: "/admin/dashboard/hackathons/[hackathonId]",
          summary:
            "Per-event overview, analytics, and settings workspaces.",
        },
      ],
    },
  ];

  const webPublicHighlights = [
    {
      title: "Shared site chrome",
      description:
        "The public layout carries docs, about, contact, download, theme switching, and a dynamic sign-in/dashboard CTA based on auth state.",
    },
    {
      title: "Adaptive download entry",
      description:
        "The landing page changes the primary call to action by user agent, favoring Homebrew on macOS and the Microsoft Store on Windows.",
    },
    {
      title: "Public/admin separation",
      description:
        "Admin routes live under `/admin` and most are marked `noindex`, while public content stays crawlable.",
    },
  ];

  const webAuthSteps = [
    {
      title: "Email sign up",
      description:
        "Creates an Appwrite account, starts a session immediately, stores host profile details in account prefs, and attempts email verification.",
    },
    {
      title: "OAuth sign in/up",
      description:
        "Google and GitHub redirect through `/admin/auth/callback`, then continue to completion or dashboard routes depending on state.",
    },
    {
      title: "Registration completion",
      description:
        "OAuth users finish onboarding on `/admin/complete-registration`, selecting `individual` or `organization` and filling organization details when needed.",
    },
    {
      title: "Route resolution",
      description:
        "Authenticated hosts are routed by `resolveAuthenticatedRoute` into completion, verification, or dashboard experiences.",
    },
    {
      title: "Normalized host profile",
      description:
        "The web auth layer maps roles, registration state, account type, organization metadata, password state, and linked auth providers from Appwrite prefs.",
    },
  ];

  const webDashboardFeatures = [
    "The admin layout starts polling, manages mobile/collapsed navigation, and resets content scroll on navigation.",
    "The overview page shows live teams, total teams, saved report count, risk distribution, and top application usage charts.",
    "The shared admin store keeps a 30 second freshness window and polls for updates every 20 seconds.",
    "Manual refresh is available across dashboard pages without forcing a full route reload.",
  ];

  const webHackathonFeatures = [
    "Hackathons are created with name, description, status, dates, and restriction defaults inherited from global host settings.",
    "Public hackathon IDs are normalized to 12 digits and generated with a Luhn-style check digit.",
    "Listing supports text, date, and status filters for larger host workspaces.",
    "Each hackathon gets overview, analytics, and settings pages under its own route branch.",
    "Hosts can copy a hackathon ID or a website invite URL that opens the desktop app handoff flow.",
    "Hackathon settings support per-event override edits and destructive deletion.",
  ];

  const webMonitoringSignals = [
    "Admin snapshots merge sessions, activity logs, reports, settings, and warning state into one host-facing data model.",
    "Cross-hackathon monitoring can filter by hackathon, team, file, and window before drilling into a team detail drawer.",
    "Risk scoring is surfaced as `LOW`, `MEDIUM`, or `HIGH`, alongside indicators such as app switches and external pastes.",
    "Saved reports stay visible separately from live telemetry so hosts can inspect completed artifacts.",
    "Per-team analytics surfaces online/offline time, percent-in-IDE, recent events, top app usage, and risk flags.",
    "Warnings are shown when Appwrite permissions are incomplete or when older editor sessions have not yet reported event metadata consistently.",
  ];

  const webSettingsAreas = [
    {
      title: "Global host defaults",
      description:
        "Hosts can set default hackathon restrictions such as `blockInternetAccess` and `blockNonEmptyWorkspace`.",
    },
    {
      title: "Account security",
      description:
        "The dashboard settings page includes in-session password changes through the Appwrite account API.",
    },
    {
      title: "Appearance",
      description:
        "Theme mode and accent color are stored locally and applied as runtime dashboard CSS overrides.",
    },
    {
      title: "Hackathon-level overrides",
      description:
        "Each event can override restrictions and metadata in its own settings page.",
    },
  ];

  const stackLayers = [
    {
      title: "Code Editor App",
      description:
        "Electron 35, React 18, Monaco Editor, Jack-File-Tree, Jack-Editor-Tab, Yjs/y-websocket, Appwrite, electron-store, jsPDF, and Electron Builder.",
    },
    {
      title: "Web App",
      description:
        "SvelteKit 2, Svelte 5 runes, Tailwind CSS 4, Appwrite Account/Database/Functions, Chart.js, and Nodemailer.",
    },
    {
      title: "Shared platform services",
      description:
        "Appwrite collections, function-based fallbacks, invite handoff through the website, and telemetry flowing from desktop into host-facing analytics.",
    },
  ];

  const dataBehaviors = [
    "The desktop app emits telemetry and session updates while the web app aggregates and presents them.",
    "Direct Appwrite reads are attempted first in the web portal, with function-based fallback when permissions are still migrating.",
    "Hackathon writes in the web portal can degrade to local browser storage when Appwrite writes fail, with warnings shown to the host.",
    "Desktop collaboration is LAN-oriented, while web invite links bridge users into the native client through `/download`.",
  ];

  const editorEnvVars = [
    { name: "VITE_APPWRITE_ENDPOINT", desc: "The Appwrite server endpoint URL." },
    { name: "VITE_APPWRITE_PROJECT_ID", desc: "Your Appwrite project identifier." },
    { name: "VITE_APPWRITE_DB_NAME", desc: "The database name for operations." },
    { name: "VITE_APPWRITE_COLLECTION_*", desc: "Collection IDs for teams, sessions, activityLogs, reports, settings, hackathons, and hackathonParticipants." },
    { name: "VITE_SONAR_WEBSITE_URL", desc: "Base URL used to generate shareable invite links back to the web platform." },
    { name: "VITE_SONAR_INVITE_SECRET", desc: "Optional secret to enable encrypted team invite links with password-based auto-login." },
    { name: "COL_HACKATHONS", desc: "Function/runtime collection ID for hackathons." },
    { name: "COL_HACKATHON_PARTICIPANTS", desc: "Function/runtime collection ID for hackathon participants." }
  ];

  const webEnvVars = [
    { name: "VITE_APPWRITE_ENDPOINT", desc: "The Appwrite server endpoint for the host portal." },
    { name: "VITE_APPWRITE_PROJECT_ID", desc: "Your Appwrite project identifier." },
    { name: "VITE_APPWRITE_DB_NAME", desc: "Database name for admin data reads." },
    { name: "VITE_APPWRITE_COLLECTION_*", desc: "Collection IDs for sessions, activityLogs, reports, settings, and hackathons." },
    { name: "VITE_APPWRITE_FUNCTION_SETTINGS", desc: "Function ID for resolving function-based settings and fallbacks." },
    { name: "VITE_SONAR_WEBSITE_URL", desc: "Base URL to build absolute invite URLs from host hackathon pages." },
    { name: "VITE_DEV_KEY", desc: "API key required to access our cloud server and database during development." }
  ];

  const serverBuildVars = [
    { name: "SMTP_*", desc: "SMTP configuration vars (HOST, PORT, SECURE, USER, PASS, FROM) and optional CONTACT_INBOX_EMAIL for the website contact form." },
    { name: "BUILD_SIGNING_KEY", desc: "Produces signed build attestation payloads for official desktop releases." },
    { name: "SEAL_PRIVATE_KEY", desc: "PEM string used strictly during packaging to cryptographically seal the ASAR archive." },
    { name: "SEAL_PUBLIC_KEY", desc: "Embedded inside packaged desktop builds to verify integrity seals at runtime and in release verification scripts." }
  ];

  const architectureLayers = [
    {
      title: "Sonar Ecosystem",
      description: "A dual-app architecture: The Electron-based Sonar Code Editor acts as the frontend work environment while the Sonar Web App (SvelteKit) serves as the host portal and web invite bridge."
    },
    {
      title: "Database & Backend (Appwrite)",
      description: "Appwrite provides a centralized backend. Collections separate Hackathons, Participants, Sessions, Logs, and Settings. Everything runs through Appwrite permissions to map roles between hosts and developers."
    },
    {
      title: "Real-time Collaboration & Synchronization",
      description: "Peer-to-peer real-time editing relies on Yjs (CRDTs) over y-websocket in the Code Editor, while workspace state (like file trees and active tabs) is synced seamlessly across peers using our custom Jack-File-Tree and Jack-Editor-Tab libraries. Broad telemetry and global events broadcast via Appwrite Realtime."
    },
    {
      title: "Serverless Functions",
      description: "Appwrite Functions act as the secure intermediary for operations that shouldn't grant full client-side trust (e.g., host settings fallback, participant enrollment gating, complex database updates)."
    },
    {
      title: "Offline-First Editor",
      description: "The IDE ensures developers can write code, commit actions, and stash monitoring payloads locally (Offline Resilience) using electron-store and IndexedDB, flushing the data once the connection restores."
    }
  ];

  onMount(() => {
    let observer: IntersectionObserver;

    const fetchDocs = async () => {
      try {
        const docsPromises = targetFiles.map(async (filename) => {
          let response = await fetch(`https://raw.githubusercontent.com/rkvishwa/Sonar-Code-Editor/main/${filename}`);
          
          if (!response.ok && response.status === 404) {
            // Fallback to lowercase if remote repository hasn't been synced with capitalized renames
            response = await fetch(`https://raw.githubusercontent.com/rkvishwa/Sonar-Code-Editor/main/${filename.toLowerCase()}`);
          }
          
          if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
          let content = await response.text();
          
          // Replace relative markdown images ![alt](relative/path)
          content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
            if (url.startsWith('http') || url.startsWith('data:')) return match;
            const safeUrl = url.replace(/^\.\//, '').replace(/^\//, '');
            return `![${alt}](https://raw.githubusercontent.com/rkvishwa/Sonar-Code-Editor/main/${safeUrl})`;
          });

          // Replace relative HTML images <img src="relative/path">
          content = content.replace(/<img([^>]*)src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
            if (src.includes('Thesaru-p.png')) {
              return `<img src="/user/thesaru.png" class="w-10 h-10 object-cover inline-block shrink-0 m-0 align-middle" style="border-radius: 100%;" alt="Thesaru-p" />`;
            }
            if (src.startsWith('http') || src.startsWith('data:')) return match;
            const safeSrc = src.replace(/^\.\//, '').replace(/^\//, '');
            return `<img${before}src="https://raw.githubusercontent.com/rkvishwa/Sonar-Code-Editor/main/${safeSrc}"${after}>`;
          });

          return {
            filename,
            content,
            html: await marked.parse(content)
          };
        });
        
        const loadedDocs = await Promise.all(docsPromises);
        developerDocs = loadedDocs;
      } catch (e) {
        console.error(e);
        hasDocsError = true;
      } finally {
        isLoadingDocs = false;
      }
      
      await tick();
      if (observer) {
        developerDocs.forEach(doc => {
          const el = document.getElementById(`dev-${doc.filename.replace(/\.md$/i, '').toLowerCase()}`);
          if (el) observer.observe(el);
        });
      }
    };

    const fetchIssues = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/rkvishwa/Sonar-Code-Editor/issues?state=open&per_page=15');
        if (res.ok) {
          const data = await res.json();
          repoIssues = data.filter((i: any) => !i.pull_request);
        } else {
          hasIssuesError = true;
        }
      } catch (e) {
        console.error("Failed to fetch repository issues:", e);
        hasIssuesError = true;
      } finally {
        isLoadingIssues = false;
      }
      
      await tick();
      if (observer) {
        const el = document.getElementById('dev-issues');
        if (el) observer.observe(el);
      }
    };

    fetchDocs();
    fetchIssues();

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeSection = entry.target.id;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );

    sections.forEach((group) => {
      group.items.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) {
          observer.observe(el);
        }
      });
    });

    return () => observer.disconnect();
  });

  const filteredSections = $derived(
    searchQuery.trim()
      ? sections
          .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
              item.label.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
          }))
          .filter((group) => group.items.length > 0)
      : sections,
  );

  $effect(() => {
    if (activeSection) {
      const activeLink = document.querySelector(`a[href="#${activeSection}"]`);
      if (activeLink) {
        const sidebarContent = activeLink.closest("aside");
        if (sidebarContent) {
          const linkRect = activeLink.getBoundingClientRect();
          const sidebarRect = sidebarContent.getBoundingClientRect();

          if (
            linkRect.top < sidebarRect.top ||
            linkRect.bottom > sidebarRect.bottom
          ) {
            activeLink.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      }
    }
  });
</script>

<svelte:head>
  <title>Documentation | Sonar IDE</title>
  <meta
    name="description"
    content="Combined documentation for the Sonar Code Editor desktop app and the Sonar web platform, including editor features, collaboration, monitoring, downloads, host workflows, and deployment reference."
  />
  <meta property="og:title" content="Documentation | Sonar IDE" />
  <meta
    property="og:description"
    content="Combined documentation for the Sonar desktop editor and web platform."
  />
  <meta property="og:image" content="/favicon.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div
  class="px-4 sm:px-6 pt-6 sm:pt-12 pb-8 sm:pb-12 lg:pt-16 lg:pb-20 max-w-300 mx-auto w-full flex flex-col md:flex-row gap-8 md:gap-12 transition-colors duration-200"
>
  <aside
    class="hidden md:block w-full md:w-64 shrink-0 font-medium md:sticky top-22 self-start md:max-h-[calc(100vh-6.5rem)] md:overflow-y-auto"
  >
    <div class="space-y-6 pr-2">
      <div class="relative mb-6">
        <Search
          size={16}
          class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          placeholder="Filter sections..."
          bind:value={searchQuery}
          class="w-full bg-white dark:bg-white/2 border border-zinc-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
        />
      </div>

      {#each filteredSections as group}
        <div>
          <h3
            class="text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-300 mb-3 font-bold"
          >
            {group.group}
          </h3>
          <ul class="space-y-1.5">
            {#each group.items as item}
              <li>
                <a
                  href="#{item.id}"
                  class="block py-1 text-sm transition-colors {activeSection ===
                  item.id
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
                >
                  {item.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </aside>

  <main class="flex-1 max-w-3xl space-y-12 sm:space-y-18">
    <section id="introduction">
      <h1
        class="text-3xl sm:text-4xl font-extrabold mb-4 sm:mb-6 text-zinc-900 dark:text-white tracking-tight"
      >
        Documentation
      </h1>
      <p class="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
        Sonar now spans two closely connected products: the
        <strong> Sonar Code Editor desktop app</strong> for actual coding and
        monitored collaboration, and the <strong>Sonar web app</strong> for
        public pages, downloads, host authentication, hackathon management, and
        monitoring review.
      </p>
    </section>


    <section id="platform-overview">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Layers3 size={22} class="text-blue-600 dark:text-blue-400" />
        Platform Overview
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        {#each platformCards as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="app-installation">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Terminal size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Installation & Packaging
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The desktop client lives in <code class="text-blue-700 dark:text-blue-300"
          >Sonar-Code-Editor</code
        > and ships as an Electron application with native packaging targets.
      </p>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Prerequisites
      </h3>
      <ul
        class="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1 mb-6"
      >
        {#each appInstallPrereqs as item}
          <li>{item}</li>
        {/each}
      </ul>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Local Development
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 mb-6 overflow-x-auto"
      >
        <p>cd Sonar-Code-Editor</p>
        <p>npm install</p>
        <p>npm run start</p>
      </div>

      <h3 class="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-200">
        Build & Packaging
      </h3>
      <div
        class="bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-xl p-5 font-mono text-sm text-zinc-700 dark:text-zinc-300 space-y-1 overflow-x-auto"
      >
        <p>npm run build</p>
        <p>npm run package</p>
        <p>npm run package:mac</p>
        <p>npm run package:win</p>
        <p>npm run package:win:all</p>
        <p>npm run package:win:store</p>
        <p>npm run package:linux</p>
      </div>
    </section>


    <section id="app-editor">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Code2 size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Editor Experience
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        The desktop app is built around the Monaco Editor, Jack-File-Tree, and Jack-Editor-Tab libraries, providing a VS Code-style editing
        surface adapted for collaborative and supervised workflows.
      </p>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Core capabilities
          </h3>
          <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
            {#each appEditorFeatures as item}
              <li class="flex items-start gap-2">
                <div class="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Common language support
          </h3>
          <div class="flex flex-wrap gap-1.5">
            {#each appLanguages as lang}
              <span
                class="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded text-xs font-mono"
                >{lang}</span
              >
            {/each}
            <span
              class="px-2 py-0.5 bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-500 rounded text-xs font-medium italic"
              >...more coming soon</span
            >
          </div>
        </div>
      </div>
    </section>


    <section id="app-workspace">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <FolderTree size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Workspace & File Tree
      </h2>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Capabilities
          </h3>
          <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
            {#each appWorkspaceFeatures as item}
              <li class="flex items-start gap-2">
                <div class="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 mt-2 shrink-0" />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Custom Libraries
          </h3>
          <div class="space-y-3">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">File Tree</span>
              <a 
                href="https://www.npmjs.com/package/@knurdz/jack-file-tree" 
                target="_blank" 
                class="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm flex items-center gap-1"
              >
                @knurdz/jack-file-tree
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-400/20">v0.2.1</span>
              </a>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Editor Tabs</span>
              <a 
                href="https://www.npmjs.com/package/@knurdz/jack-editor-tab" 
                target="_blank" 
                class="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm flex items-center gap-1"
              >
                @knurdz/jack-editor-tab
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-400/20">v0.1.0</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>


    <section id="app-collaboration">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Users size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Collaboration & Invites
      </h2>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">
        Collaboration in the desktop client is optimized for real-time team
        work and controlled event participation rather than generic cloud
        document sharing.
      </p>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each appCollaborationFeatures as item}
          <li>{@html item}</li>
        {/each}
      </ul>
    </section>


    <section id="app-search">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Search size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Search & Productivity
      </h2>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each appSearchFeatures as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>


    <section id="app-monitoring">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Activity size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Monitoring Capture
      </h2>
      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden"
      >
        {#each appMonitoringEvents as [title, description]}
          <div class="p-4 flex gap-4">
            <span
              class="text-zinc-900 dark:text-zinc-200 font-semibold shrink-0 text-xs w-38"
              >{title}</span
            >
            <span class="text-zinc-600 dark:text-zinc-400 text-xs"
              >{description}</span
            >
          </div>
        {/each}
      </div>
    </section>


    <section id="app-preview">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Eye size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Local Preview
      </h2>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each appPreviewFeatures as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>


    <section id="app-settings">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Settings size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Settings & Team Tools
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        {#each appSettingsAreas as area}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {area.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {area.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="app-security">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Shield size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Security Model
      </h2>
      <div class="space-y-4">
        {#each appSecurityLayers as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="app-release">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Lock size={22} class="text-blue-600 dark:text-blue-400" />
        Code Editor App: Release Hardening
      </h2>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Build pipeline
          </h3>
          <div
            class="bg-zinc-50 dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-xl p-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 space-y-1 overflow-x-auto"
          >
            <p>build renderer + main + preload</p>
            <p>compile bytecode</p>
            <p>generate build attestation</p>
            <p>package with Electron Builder</p>
          </div>
        </div>
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
            Runtime protections
          </h3>
          <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-3">
            {#each appReleaseLayers as item}
              <li class="flex items-start gap-2">
                <Shield class="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    </section>


    <section id="web-route-map">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <BookOpen size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Route Map
      </h2>
      <div class="grid gap-4">
        {#each routeGroups as group}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              {group.title}
            </h3>
            <div class="space-y-3">
              {#each group.items as item}
                <div
                  class="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-white/6 dark:bg-white/[0.02]"
                >
                  <p
                    class="text-sm font-mono font-semibold text-blue-700 dark:text-blue-300"
                  >
                    {item.path}
                  </p>
                  <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.summary}
                  </p>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </section>


    <section id="web-public-site">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Globe size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Public Site
      </h2>
      <div class="grid sm:grid-cols-3 gap-4">
        {#each webPublicHighlights as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="web-download-handoff">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Download size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Download & Handoff
      </h2>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Installer flows
          </h3>
          <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li>macOS surfaces copyable Homebrew install and upgrade commands.</li>
            <li>Windows users can be routed toward the Microsoft Store or a release download flow.</li>
            <li>The Windows-only download route can resolve the latest GitHub release asset automatically.</li>
          </ul>
        </div>
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Native app handoff
          </h3>
          <ul class="text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5">
            <li><code class="text-blue-700 dark:text-blue-300">/download?invite=...</code> maps into the desktop protocol handler.</li>
            <li>Hackathon and student ID parameters can prefill the desktop login experience.</li>
            <li>The page probes the custom protocol and falls back gracefully to install guidance.</li>
          </ul>
        </div>
      </div>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        This route is the bridge between host-generated web invites and the
        desktop code editor experience.
      </p>
    </section>


    <section id="web-contact-legal">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Mail size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Contact & Legal
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Contact form
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            The contact route uses a SvelteKit form action with validation,
            immediate UI feedback, background email sending, and acknowledgement
            mail to the sender.
          </p>
        </div>
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
            Legal pages
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Privacy and terms are published as first-class public routes so the
            website and host flows can reference a stable policy surface.
          </p>
        </div>
      </div>
    </section>


    <section id="web-host-authentication">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <KeyRound size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Host Authentication
      </h2>
      <div class="space-y-4">
        {#each webAuthSteps as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="web-dashboard">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <LayoutDashboard size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Dashboard Overview
      </h2>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each webDashboardFeatures as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>


    <section id="web-hackathons">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Layers3 size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Hackathons
      </h2>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each webHackathonFeatures as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>


    <section id="web-monitoring">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Activity size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Monitoring & Analytics
      </h2>
      <div
        class="bg-zinc-50 dark:bg-white/2 rounded-xl border border-zinc-200 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5 text-sm overflow-hidden"
      >
        {#each webMonitoringSignals as item}
          <div class="p-4 text-zinc-600 dark:text-zinc-400">
            {item}
          </div>
        {/each}
      </div>
    </section>


    <section id="web-settings">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Settings size={22} class="text-blue-600 dark:text-blue-400" />
        Web App: Host Settings
      </h2>
      <div class="grid sm:grid-cols-2 gap-4">
        {#each webSettingsAreas as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
    </section>


    <section id="data-layer">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Database size={22} class="text-blue-600 dark:text-blue-400" />
        Data Layer
      </h2>
      <div class="grid sm:grid-cols-3 gap-4 mb-6">
        {#each stackLayers as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
      <ul
        class="list-disc list-inside text-sm text-zinc-600 dark:text-zinc-400 space-y-1.5"
      >
        {#each dataBehaviors as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>


    <section id="environment-reference">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Cpu size={22} class="text-blue-600 dark:text-blue-400" />
        Environment Reference
      </h2>
      <div class="mb-6 p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-sm text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-200">
        <strong class="font-semibold block mb-1">Local Development Note:</strong>
        For your own local development, you must set up your own server and database instance (Appwrite). Review the <a href="#architecture" class="underline hover:text-blue-700 dark:hover:text-blue-300">Architecture</a> section below to understand how the serverless functions, database, and real-time updates run across the ecosystem.
      </div>
      <div class="space-y-6">
        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Code Editor
          </h3>
          <div class="grid gap-3 divide-y divide-zinc-100 dark:divide-white/5">
            {#each editorEnvVars as item}
              <div class="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 pt-3 first:pt-0">
                <code class="text-xs font-mono font-medium px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 md:w-64 shrink-0 break-all">{item.name}</code>
                <span class="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Web App
          </h3>
          <div class="grid gap-3 divide-y divide-zinc-100 dark:divide-white/5">
            {#each webEnvVars as item}
              <div class="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 pt-3 first:pt-0">
                <code class="text-xs font-mono font-medium px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 md:w-64 shrink-0 break-all">{item.name}</code>
                <span class="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</span>
              </div>
            {/each}
          </div>
        </div>

        <div
          class="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
        >
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Server & Build
          </h3>
          <div class="grid gap-3 divide-y divide-zinc-100 dark:divide-white/5">
            {#each serverBuildVars as item}
              <div class="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 pt-3 first:pt-0">
                <code class="text-xs font-mono font-medium px-2 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 md:w-64 shrink-0 break-all">{item.name}</code>
                <span class="text-sm text-zinc-600 dark:text-zinc-400">{item.desc}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section id="architecture">
      <h2
        class="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-3"
      >
        <Database size={22} class="text-blue-600 dark:text-blue-400" />
        Architecture & Infrastructure
      </h2>
      <div class="space-y-4">
        {#each architectureLayers as item}
          <div
            class="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-white/8 dark:bg-white/[0.03]"
          >
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
              {item.title}
            </h3>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
        {/each}
      </div>
      
      <div class="mt-8 rounded-2xl border border-zinc-200 bg-white/80 p-4 sm:p-6 shadow-sm overflow-x-auto dark:border-white/8 dark:bg-white/[0.03]">
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          Complex Architecture Model
        </h3>
        <div class="min-w-[700px] w-full flex justify-center py-4">
          <svg viewBox="120 20 720 480" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto font-sans max-w-full scale-105 transform origin-center">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="fill-zinc-400 dark:fill-zinc-500" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="fill-blue-500/70 dark:fill-blue-400/80" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" class="fill-emerald-500/70 dark:fill-emerald-400/80" />
              </marker>
            </defs>

            <!-- ================= APPS LAYER (Top) ================= -->
            
            <!-- Web App Box -->
            <rect x="160" y="40" width="240" height="150" rx="12" class="fill-white stroke-zinc-200 dark:fill-white/5 dark:stroke-white/10" stroke-width="1.5" />
            <text x="280" y="70" text-anchor="middle" class="fill-zinc-900 dark:fill-white font-bold text-[15px]">Sonar Web App</text>
            <text x="280" y="90" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-400 text-xs">(SvelteKit / Host Portal)</text>
            <rect x="180" y="110" width="200" height="60" rx="6" class="fill-zinc-50 stroke-zinc-200 dark:fill-white/[0.02] dark:stroke-white/5" stroke-width="1" />
            <text x="280" y="130" text-anchor="middle" class="fill-zinc-700 dark:fill-zinc-300 text-[11px] font-medium">Core Responsibilities</text>
            <text x="190" y="148" class="fill-zinc-500 dark:fill-zinc-500 text-[10px]">▪ Dashboard &amp; Analytics</text>
            <text x="190" y="162" class="fill-zinc-500 dark:fill-zinc-500 text-[10px]">▪ Global Host Settings &amp; Auth</text>

            <!-- Code Editor Box -->
            <rect x="560" y="40" width="240" height="150" rx="12" class="fill-blue-50/50 stroke-blue-200 dark:fill-blue-900/10 dark:stroke-blue-800/40" stroke-width="1.5" />
            <text x="680" y="70" text-anchor="middle" class="fill-zinc-900 dark:fill-white font-bold text-[15px]">Sonar Code Editor</text>
            <text x="680" y="90" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-400 text-xs">(Electron / React / Monaco)</text>
            <rect x="580" y="105" width="200" height="75" rx="6" class="fill-white/80 stroke-blue-200/50 dark:fill-black/20 dark:stroke-blue-800/20" stroke-width="1" />
            <text x="680" y="120" text-anchor="middle" class="fill-blue-800 dark:fill-blue-300 text-[11px] font-medium">Offline-First Engine</text>
            <text x="590" y="138" class="fill-zinc-500 dark:fill-zinc-400 text-[10px]">▪ Yjs Shared Collab Sync</text>
            <text x="590" y="152" class="fill-zinc-500 dark:fill-zinc-400 text-[10px]">▪ Jack-File-Tree &amp; Jack-Editor-Tab</text>
            <text x="590" y="166" class="fill-zinc-500 dark:fill-zinc-400 text-[10px]">▪ Key Shield &amp; Local Telemetry</text>

            <!-- Direct App-to-App Hand-off -->
            <path d="M 400 115 L 560 115" fill="none" class="stroke-blue-400 dark:stroke-blue-500" stroke-width="2" stroke-dasharray="4 4" marker-end="url(#arrow-blue)" />
            <text x="480" y="105" text-anchor="middle" class="fill-blue-600 dark:fill-blue-400 text-xs font-mono font-medium">sonar-editor://</text>

            <!-- ================= BACKEND LAYER (Bottom) ================= -->
            
            <!-- Backend Container -->
            <rect x="140" y="270" width="680" height="210" rx="16" class="fill-zinc-50/50 stroke-zinc-200 dark:fill-white/[0.01] dark:stroke-white/10" stroke-width="1.5" stroke-dasharray="8 4" />
            <text x="480" y="295" text-anchor="middle" class="fill-zinc-900 dark:fill-white font-bold text-sm tracking-wide">Appwrite Backend Infrastructure</text>

            <!-- Auth Module (Under Web App to perfectly align) -->
            <rect x="180" y="320" width="160" height="130" rx="8" class="fill-white stroke-zinc-200 dark:fill-white/5 dark:stroke-white/10" stroke-width="1" />
            <text x="260" y="345" text-anchor="middle" class="fill-zinc-800 dark:fill-zinc-200 font-semibold text-xs">Authentication</text>
            <path d="M 200 360 L 320 360" fill="none" stroke="currentColor" class="text-zinc-100 dark:text-white/5" />
            <text x="200" y="380" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Email &amp; OAuth Maps</text>
            <text x="200" y="400" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Account Preferences</text>
            <text x="200" y="420" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Student ID Labels</text>

            <!-- Serverless Functions Module (Center) -->
            <rect x="400" y="320" width="160" height="130" rx="8" class="fill-white stroke-zinc-200 dark:fill-white/5 dark:stroke-white/10" stroke-width="1" />
            <text x="480" y="345" text-anchor="middle" class="fill-zinc-800 dark:fill-zinc-200 font-semibold text-xs">Serverless Functions</text>
            <path d="M 420 360 L 540 360" fill="none" stroke="currentColor" class="text-zinc-100 dark:text-white/5" />
            <text x="420" y="380" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Role Fallbacks</text>
            <text x="420" y="400" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Verified DB Ops</text>
            <text x="420" y="420" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Participant Gating</text>

            <!-- Database Module (Under Code Editor) -->
            <rect x="620" y="320" width="160" height="130" rx="8" class="fill-white stroke-zinc-200 dark:fill-white/5 dark:stroke-white/10" stroke-width="1" />
            <text x="700" y="345" text-anchor="middle" class="fill-zinc-800 dark:fill-zinc-200 font-semibold text-xs">Real-time DB</text>
            <path d="M 640 360 L 760 360" fill="none" stroke="currentColor" class="text-zinc-100 dark:text-white/5" />
            <text x="640" y="380" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Host Collections</text>
            <text x="640" y="400" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Live Subscriptions</text>
            <text x="640" y="420" class="fill-zinc-600 dark:fill-zinc-400 text-[10px]">▪ Telemetry Pipeline</text>

            <!-- ================= STRAIGHT / ROUTED CONNECTIONS ================= -->

            <!-- Web App -> Auth (Straight Down) -->
            <path d="M 260 190 L 260 320" fill="none" class="stroke-zinc-300 dark:stroke-zinc-600" stroke-width="1.5" marker-end="url(#arrow)" />
            <rect x="230" y="240" width="60" height="14" fill="white" class="dark:fill-[#121212]" rx="2" />
            <text x="260" y="250" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-500 text-[10px]">Admin Scopes</text>

            <!-- Web App -> Functions (L-Shape) -->
            <path d="M 350 190 V 360 H 400" fill="none" class="stroke-emerald-400/70 dark:stroke-emerald-500/70" stroke-width="1.5" stroke-dasharray="4 2" marker-end="url(#arrow-green)" />
            <rect x="305" y="240" width="90" height="14" fill="white" class="dark:fill-[#121212]" rx="2" />
            <text x="350" y="250" text-anchor="middle" class="fill-emerald-600 dark:fill-emerald-400 text-[10px]">Trusted Fallbacks</text>

            <!-- Code Editor -> DB (Telemetry) -->
            <path d="M 680 190 L 680 320" fill="none" class="stroke-zinc-300 dark:stroke-zinc-600" stroke-width="1.5" marker-end="url(#arrow)" />
            <rect x="635" y="235" width="90" height="14" fill="white" class="dark:fill-[#121212]" rx="2" />
            <text x="680" y="245" text-anchor="middle" class="fill-zinc-500 dark:fill-zinc-500 text-[10px]">Sync DB Write</text>

            <!-- DB -> Code Editor (Realtime) -->
            <path d="M 720 320 L 720 190" fill="none" class="stroke-blue-400/50 dark:stroke-blue-500/50" stroke-width="1.5" stroke-dasharray="4 2" />
            <rect x="675" y="270" width="90" height="14" fill="white" class="dark:fill-[#121212]" rx="2" />
            <text x="720" y="280" text-anchor="middle" class="fill-blue-600 dark:fill-blue-400 text-[10px]">Pub/Sub Socket</text>
            
          </svg>
        </div>
      </div>
    </section>

    {#if isLoadingDocs}
      <section id="developer-docs-loading">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Github size={22} class="text-blue-600 dark:text-blue-400" />
            Loading For Developers...
          </h2>
        </div>
        <div class="rounded-2xl border border-zinc-200 bg-white/80 p-6 md:p-8 shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
          <div class="animate-pulse space-y-4">
            <div class="h-5 bg-zinc-200 dark:bg-white/10 rounded w-1/3 mb-8"></div>
            <div class="h-4 bg-zinc-200 dark:bg-white/10 rounded w-full"></div>
            <div class="h-4 bg-zinc-200 dark:bg-white/10 rounded w-11/12"></div>
            <div class="h-4 bg-zinc-200 dark:bg-white/10 rounded w-5/6"></div>
          </div>
        </div>
      </section>
    {:else if hasDocsError}
      <section id="developer-docs-error">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
            <Github size={22} class="text-blue-600 dark:text-blue-400" />
            For Developers
          </h2>
        </div>
        <div class="rounded-2xl border border-zinc-200 bg-white/80 p-6 md:p-8 shadow-sm dark:border-white/8 dark:bg-white/[0.03] flex flex-col items-center justify-center py-12">
           <Github class="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
           <p class="text-zinc-500 dark:text-zinc-400">Please check your network connection or the repository URL.</p>
        </div>
      </section>
    {:else}
      {#each developerDocs as doc}
        <section id="dev-{doc.filename.replace(/\.md$/i, '').toLowerCase()}">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
              <Github size={22} class="text-blue-600 dark:text-blue-400" />
              {doc.filename}
            </h2>
            <a 
              href="https://github.com/rkvishwa/Sonar-Code-Editor/blob/main/{doc.filename}" 
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-2 font-medium shrink-0"
            >
              <span class="hidden sm:inline">View in GitHub</span>
              <span class="sm:hidden">GitHub</span>
              <svg class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>
          
          <div class="rounded-2xl border border-zinc-200 bg-white/80 p-6 md:p-8 shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
            <div class="prose prose-zinc dark:prose-invert max-w-none prose-sm md:prose-base prose-headings:scroll-mt-24 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-white/10 prose-pre:bg-zinc-50 dark:prose-pre:bg-[#121212] prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200 prose-code:text-zinc-800 dark:prose-code:text-zinc-200 prose-code:bg-zinc-100 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-xl prose-img:inline-block prose-img:my-1 prose-hr:border-zinc-200 dark:prose-hr:border-white/10 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-table:w-full prose-table:border-collapse prose-table:text-sm prose-th:p-3 prose-th:bg-zinc-100 dark:prose-th:bg-white/5 prose-th:text-left prose-td:p-3 prose-td:border-b prose-td:border-zinc-200 dark:prose-td:border-white/10 break-words">
              {@html doc.html}
            </div>
          </div>
        </section>
      {/each}
    {/if}

    <section id="dev-issues">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
          <Github size={22} class="text-blue-600 dark:text-blue-400" />
          Repository Issues
        </h2>
        <a 
          href="https://github.com/rkvishwa/Sonar-Code-Editor/issues" 
          target="_blank"
          rel="noopener noreferrer"
          class="text-sm px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-2 font-medium shrink-0"
        >
          <span class="hidden sm:inline">View Options</span>
          <span class="sm:hidden">GitHub</span>
          <svg class="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
      
      <div class="rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm dark:border-white/8 dark:bg-white/[0.03]">
        {#if isLoadingIssues}
           <div class="animate-pulse space-y-4">
             {#each Array(3) as _}
               <div class="h-20 bg-zinc-200 dark:bg-white/5 rounded-xl w-full"></div>
             {/each}
           </div>
        {:else if hasIssuesError}
           <div class="flex flex-col items-center justify-center py-8">
             <Github class="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-4" />
             <p class="text-zinc-500 dark:text-zinc-400">Unable to load issues from GitHub right now.</p>
           </div>
        {:else if repoIssues.length === 0}
           <div class="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl">
             <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-4 text-green-600 dark:text-green-400 font-bold text-2xl">
               ✓
             </div>
             <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">No Open Issues!</h3>
             <p class="text-zinc-500 dark:text-zinc-400">This repository currently has no open issues. Everything is running smoothly.</p>
           </div>
        {:else}
           <div class="space-y-4">
             {#each repoIssues as issue}
                <a href={issue.html_url} target="_blank" class="block p-5 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-[#18181A] group">
                  <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                     <div>
                       <h3 class="font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 text-lg transition-colors leading-tight mb-2">
                         {issue.title}
                       </h3>
                       <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                         <span class="flex items-center gap-1.5">
                           <span class="w-2 h-2 rounded-full bg-green-500"></span>
                           #{issue.number}
                         </span>
                         <span class="flex items-center gap-1.5">
                           <img src={issue.user.avatar_url} alt={issue.user.login} class="w-5 h-5 rounded-full" crossorigin="anonymous" />
                           {issue.user.login}
                         </span>
                         <span>
                           {new Date(issue.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                         </span>
                       </div>
                     </div>
                     {#if issue.labels && issue.labels.length > 0}
                       <div class="flex flex-wrap gap-2 sm:justify-end shrink-0 sm:max-w-[150px]">
                         {#each issue.labels as label}
                           <span class="px-2 py-0.5 rounded text-xs font-medium border border-zinc-200 dark:border-white/10 dark:text-zinc-300" style="border-left: 3px solid #{label.color}">
                             {label.name}
                           </span>
                         {/each}
                       </div>
                     {/if}
                  </div>
                </a>
             {/each}
           </div>
        {/if}
      </div>
    </section>
  </main>
</div>
