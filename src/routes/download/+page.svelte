<script lang="ts">
  import { onMount } from "svelte";
  import Download from "lucide-svelte/icons/download";
  import Monitor from "lucide-svelte/icons/monitor";
  import ShieldAlert from "lucide-svelte/icons/shield-alert";
  import Wifi from "lucide-svelte/icons/wifi";
  import Link2 from "lucide-svelte/icons/link-2";
  import Copy from "lucide-svelte/icons/copy";
  import Check from "lucide-svelte/icons/check";
  import Terminal from "lucide-svelte/icons/terminal";

  type ClientOS = "windows" | "mac" | "other";
  type InviteMode = "team" | "hackathon" | null;

  let clientOS = $state<ClientOS>("other");
  let linkCopied = $state(false);
  let updateLinkCopied = $state(false);
  let inviteMode = $state<InviteMode>(null);
  let inviteHackathonId = $state("");
  let inviteStudentId = $state("");
  let deepLinkUrl = $state("");
  let inviteStatus = $state<"idle" | "opening" | "fallback">("idle");
  const macInstallCommand = "brew install --cask rkvishwa/knurdz/sonar-code-editor";
  const macUpdateCommand = "brew upgrade --cask rkvishwa/knurdz/sonar-code-editor";

  function openEditorInvite() {
    if (!deepLinkUrl || typeof document === "undefined") {
      return;
    }

    inviteStatus = "opening";

    const probe = document.createElement("iframe");
    probe.style.display = "none";
    probe.src = deepLinkUrl;
    document.body.appendChild(probe);

    window.setTimeout(() => {
      probe.remove();
    }, 1200);

    window.setTimeout(() => {
      if (document.visibilityState === "visible") {
        inviteStatus = "fallback";
      }
    }, 1600);
  }

  function copyMacLink() {
    navigator.clipboard.writeText(macInstallCommand).then(() => {
      linkCopied = true;
      setTimeout(() => {
        linkCopied = false;
      }, 2000);
    });
  }

  function copyUpdateLink() {
    navigator.clipboard.writeText(macUpdateCommand).then(() => {
      updateLinkCopied = true;
      setTimeout(() => {
        updateLinkCopied = false;
      }, 2000);
    });
  }

  onMount(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      clientOS = "windows";
    } else if (ua.includes("macintosh") || ua.includes("mac os x")) {
      clientOS = "mac";
    } else {
      clientOS = "other";
    }

    const params = new URLSearchParams(window.location.search);
    const encryptedInvite = params.get("invite")?.trim() || "";
    const hackathonId = (params.get("hackathonId") || "").replace(/\D+/g, "");
    const studentId = (params.get("studentId") || "").trim().toUpperCase();

    if (encryptedInvite) {
      inviteMode = "team";
      deepLinkUrl = `sonar-editor://auth?invite=${encodeURIComponent(encryptedInvite)}`;
      openEditorInvite();
    } else if (hackathonId) {
      inviteMode = "hackathon";
      inviteHackathonId = hackathonId;
      inviteStudentId = studentId;
      deepLinkUrl =
        `sonar-editor://auth?hackathonId=${encodeURIComponent(hackathonId)}` +
        (studentId
          ? `&studentId=${encodeURIComponent(studentId)}`
          : "");
      openEditorInvite();
    }
  });
</script>

<svelte:head>
  <title>Download | Sonar IDE</title>
  <meta name="description" content="Download Sonar IDE for Windows, macOS, and Linux. Get the official client for supervised exam environments and secure code collaboration." />
  <meta property="og:title" content="Download | Sonar IDE" />
  <meta property="og:description" content="Download Sonar IDE for Windows, macOS, and Linux. Get the official client for supervised exam environments and secure code collaboration." />
  <meta property="og:image" content="/favicon.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div
  class="px-2 sm:px-6 py-6 sm:py-16 lg:py-24 max-w-4xl mx-auto w-full text-center transition-colors duration-200"
>
  {#if inviteMode}
    <div class="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border border-cyan-200/70 bg-cyan-50/80 p-3 sm:p-6 text-left shadow-sm dark:border-cyan-500/20 dark:bg-cyan-500/10">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            Invite Link
          </p>
          <h2 class="mt-2 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
            {inviteStatus === "opening"
              ? "Opening Sonar IDE..."
              : "Install Sonar IDE to continue"}
          </h2>
          <p class="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {#if inviteMode === "team"}
              This invite will open the desktop app and sign you in automatically.
            {:else if inviteStudentId}
              This invite will open the desktop app with hackathon ID
              <strong class="font-mono text-zinc-900 dark:text-white">
                {inviteHackathonId}
              </strong>
              and student ID
              <strong class="font-mono text-zinc-900 dark:text-white">
                {inviteStudentId}
              </strong>
              prefilled. The invited user still needs to enter the password manually.
            {:else}
              This invite will open the desktop app with hackathon ID
              <strong class="font-mono text-zinc-900 dark:text-white">
                {inviteHackathonId}
              </strong>
              prefilled on the login screen.
            {/if}
            {#if inviteStatus === "fallback"}
              If nothing opened yet, download the app below and try the invite again.
            {/if}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:min-w-[210px]">
          <button
            type="button"
            onclick={openEditorInvite}
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <Link2 size={16} />
            Open Sonar IDE
          </button>
          <a
            href="/download"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Download size={16} />
            Go to Download Page
          </a>
        </div>
      </div>
    </div>
  {/if}

  <div
    class="w-14 h-14 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-5 sm:mb-8 shadow-lg shadow-blue-500/20"
  >
    <Download size={28} class="sm:hidden" />
    <Download size={40} class="hidden sm:block" />
  </div>

  <h1
    class="text-2xl sm:text-5xl lg:text-6xl font-extrabold mb-3 sm:mb-6 tracking-tight text-zinc-900 dark:text-white"
  >
    Get Sonar IDE
  </h1>
  <p class="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8 sm:mb-12">
    Download the official client to join supervised exam environments or start
    collaborating securely.
  </p>

  <div
    class="bg-white dark:bg-white/2 border border-zinc-200 dark:border-white/5 rounded-2xl sm:rounded-3xl p-2.5 sm:p-8 lg:p-12 mb-8 sm:mb-12 lg:mb-16 shadow-sm dark:shadow-none transition-colors duration-200"
  >
    <div class="flex flex-col items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
      <div class="w-full max-w-2xl flex flex-col gap-4 sm:gap-6">
        <div
          class={`rounded-xl sm:rounded-2xl border border-zinc-200/50 dark:border-white/10 bg-[#f5faff] dark:bg-zinc-900/40 px-2.5 py-6 sm:p-6 lg:p-8 flex flex-col items-center gap-4 sm:gap-6 shadow-sm relative overflow-hidden ${clientOS === "mac" ? "order-1" : "order-2"}`}
        >
          <div class="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div class="w-full flex flex-wrap items-center justify-between gap-1 sm:gap-3 relative z-10">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-5 sm:w-5 sm:h-6 text-zinc-900 dark:text-zinc-100">
                <path d="M11.6734 7.22198C10.7974 7.22198 9.44138 6.22598 8.01338 6.26198C6.12938 6.28598 4.40138 7.35397 3.42938 9.04597C1.47338 12.442 2.92538 17.458 4.83338 20.218C5.76938 21.562 6.87338 23.074 8.33738 23.026C9.74138 22.966 10.2694 22.114 11.9734 22.114C13.6654 22.114 14.1454 23.026 15.6334 22.99C17.1454 22.966 18.1054 21.622 19.0294 20.266C20.0974 18.706 20.5414 17.194 20.5654 17.11C20.5294 17.098 17.6254 15.982 17.5894 12.622C17.5654 9.81397 19.8814 8.46998 19.9894 8.40998C18.6694 6.47798 16.6414 6.26198 15.9334 6.21398C14.0854 6.06998 12.5374 7.22198 11.6734 7.22198ZM14.7934 4.38998C15.5734 3.45398 16.0894 2.14598 15.9454 0.849976C14.8294 0.897976 13.4854 1.59398 12.6814 2.52998C11.9614 3.35798 11.3374 4.68998 11.5054 5.96198C12.7414 6.05798 14.0134 5.32598 14.7934 4.38998Z"></path>
              </svg>
              <p class="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Download for macOS
              </p>
            </div>
            {#if clientOS === "mac"}
              <span class="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-cyan-700 dark:text-cyan-300 shrink-0">
                Recommended
              </span>
            {/if}
          </div>

          <div class="w-full relative z-10 flex flex-col gap-6">
            <!-- Terminal UI Box -->
            <div class="rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-lg shadow-zinc-200/50 dark:shadow-black/50 bg-[#1e1e1e]">
              <!-- Terminal Header -->
              <div class="bg-zinc-100 dark:bg-zinc-800 px-2 sm:px-4 py-1.5 sm:py-2.5 flex items-center justify-between border-b border-zinc-200 dark:border-white/10">
                <div class="flex gap-1.5">
                  <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56]"></div>
                  <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e]"></div>
                  <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f]"></div>
                </div>
                <div class="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Terminal class="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>bash — install</span>
                </div>
                <div class="w-8 sm:w-10"></div> <!-- Spacer for centering -->
              </div>
              
              <!-- Terminal Body -->
              <div class="p-2.5 sm:p-5 font-mono text-[10px] sm:text-sm leading-relaxed overflow-x-auto text-[#d4d4d4]">
                <div class="flex items-start group">
                  <span class="text-[#569cd6] mr-3 shrink-0 select-none">$</span>
                  <div class="flex-1 relative">
                    <input
                      id="download-mac-link"
                      type="text"
                      value={macInstallCommand}
                      readonly
                      onclick={(event) => (event.currentTarget as HTMLInputElement).select()}
                      class="bg-transparent w-full pr-20 lg:pr-0 outline-none truncate cursor-copy text-[#ce9178] selection:bg-[#264f78]"
                    />
                    <div class="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-[#1e1e1e] pl-8 py-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center">
                      <button
                        onclick={copyMacLink}
                        aria-label="Copy Command"
                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 shadow-sm
                        {linkCopied ? 'text-[#4ec9b0]' : 'text-zinc-300'}"
                      >
                        {#if linkCopied}
                          <Check size={14} />
                          <span class="text-xs font-sans font-medium">Copied!</span>
                        {:else}
                          <Copy size={14} />
                          <span class="text-xs font-sans font-medium">Copy</span>
                        {/if}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-white/5">
                  <div class="flex items-center justify-between text-xs text-zinc-400 font-sans mb-3">
                    <span>Already installed an older version?</span>
                  </div>
                  <div class="flex items-start group">
                    <span class="text-[#569cd6] mr-3 shrink-0 select-none">$</span>
                    <div class="flex-1 relative">
                      <input
                        id="mac-update-link"
                        type="text"
                        value={macUpdateCommand}
                        readonly
                        onclick={(event) => (event.currentTarget as HTMLInputElement).select()}
                        class="bg-transparent w-full pr-20 lg:pr-0 outline-none truncate cursor-copy text-[#ce9178] selection:bg-[#264f78]"
                      />
                      <div class="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-[#1e1e1e] pl-8 py-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center">
                        <button
                          onclick={copyUpdateLink}
                          aria-label="Copy Update Command"
                          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10 shadow-sm
                          {updateLinkCopied ? 'text-[#4ec9b0]' : 'text-zinc-300'}"
                        >
                          {#if updateLinkCopied}
                            <Check size={14} />
                            <span class="text-xs font-sans font-medium">Copied!</span>
                          {:else}
                            <Copy size={14} />
                            <span class="text-xs font-sans font-medium">Copy</span>
                          {/if}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="flex justify-center mt-1">
              <p class="text-[13px] text-zinc-500 dark:text-zinc-400 max-w-sm text-center">
                Run the commands above in your terminal. Ensure you have <a href="https://brew.sh/" target="_blank" rel="noopener noreferrer" class="text-cyan-600 dark:text-cyan-400 hover:underline">Homebrew</a> installed.
              </p>
            </div>
          </div>
        </div>

        <div
          class={`rounded-xl sm:rounded-2xl border border-zinc-200/50 dark:border-white/10 bg-[#f5faff] dark:bg-zinc-900/40 px-2.5 py-6 sm:p-6 lg:p-8 flex flex-col items-center gap-4 sm:gap-5 shadow-sm ${clientOS === "mac" ? "order-2" : "order-1"}`}
        >
          <div class="w-full flex flex-wrap items-center justify-between gap-1 sm:gap-3">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900 dark:text-zinc-100">
                <path d="M11.501 3V11.5H3.00098V3H11.501ZM11.501 21H3.00098V12.5H11.501V21ZM12.501 3H21.001V11.5H12.501V3ZM21.001 12.5V21H12.501V12.5H21.001Z"></path>
              </svg>
              <p class="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Download for Windows
              </p>
            </div>
            {#if clientOS === "windows"}
              <span class="rounded-full bg-cyan-500/10 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-cyan-700 dark:text-cyan-300 shrink-0">
                Recommended
              </span>
            {/if}
          </div>

          <a
            href="https://apps.microsoft.com/detail/9NFFN07V94DZ?hl=en-us&gl=LK&ocid=pdpshare"
            target="_blank"
            rel="noopener noreferrer"
            class="group relative overflow-hidden w-full sm:w-auto px-4 py-3 sm:px-8 sm:py-3.5 bg-zinc-900 dark:bg-white hover:bg-blue-300 dark:hover:bg-blue-300 text-white dark:text-blue-500 font-semibold rounded-xl shadow-lg shadow-zinc-900/10 dark:shadow-white/10 hover:shadow-cyan-500/25 dark:hover:shadow-cyan-400/25 border border-transparent dark:border-white/5 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-lg transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div class="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden rounded-xl">
              <div class="absolute w-[300%] sm:w-[200%] aspect-square bg-linear-to-r from-cyan-500 to-blue-500 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500 ease-out origin-center">
                <div class="absolute inset-0 opacity-20 pattern-dots"></div>
              </div>
            </div>

            <div class="relative z-10 flex items-center gap-3 transition-all duration-300 group-hover:scale-[1.02] text-white dark:text-blue-500 group-hover:text-white dark:group-hover:text-white font-semibold">
              <img src="/ms-store-white.svg" alt="Microsoft Store" class="w-4 h-4 sm:w-7 sm:h-7 group-hover:-translate-y-[1px] transition-transform duration-300 block dark:hidden group-hover:!hidden" />
              <img src="/ms-store-color.svg" alt="Microsoft Store" class="w-4 h-4 sm:w-6 sm:h-6 group-hover:-translate-y-[1px] transition-transform duration-300 hidden dark:block group-hover:!block" />
              <span class="text-sm sm:text-lg">Download for Windows</span>
            </div>
          </a>
          <p class="text-xs text-zinc-600 dark:text-zinc-400">
            Get it from the Microsoft Store.
          </p>
        </div>
      </div>
    </div>

    <div
      class="grid sm:grid-cols-2 gap-4 sm:gap-6 text-left border-t border-zinc-100 dark:border-white/5 pt-5 sm:pt-10"
    >
      <div class="flex items-start space-x-4">
        <div
          class="w-10 h-10 rounded-lg bg-red-100 dark:bg-rose-500/10 flex items-center justify-center text-red-600 dark:text-rose-400 shrink-0"
        >
          <ShieldAlert size={20} />
        </div>
        <div>
          <h3 class="font-bold text-zinc-900 dark:text-white mb-1">
            Monitoring Permission Required
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Required monitoring permission to access the app.
          </p>
        </div>
      </div>
      <div class="flex items-start space-x-4">
        <div
          class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"
        >
          <Wifi size={20} />
        </div>
        <div>
          <h3 class="font-bold text-zinc-900 dark:text-white mb-1">
            Local Network Permission
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">
            Also need local network permission to collaborate. Not mandatory if not collaborating.
          </p>
        </div>
      </div>
    </div>
  </div>

  <p class="text-zinc-500 dark:text-zinc-500 text-sm">
    Currently tracking version: <span
      class="font-mono text-zinc-900 dark:text-white">v1.2.0</span
    > • By downloading, you agree to the Academic Data Policy.
  </p>

  <div class="mt-6 sm:mt-8 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-900/30 p-3 sm:p-6 lg:p-7">
    <h2 class="text-xl font-bold text-zinc-900 dark:text-white">
      Try other version
    </h2>
    <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
      Need a previous build or different release channel?
    </p>
    <a
      href="https://github.com/rkvishwa/Sonar-Code-Editor/releases"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-4 inline-flex items-center justify-center rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      View all GitHub releases
    </a>
  </div>
</div>

<style>
  /* --- Button Pattern Fill --- */
  .pattern-dots {
    background-image: radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px);
    background-size: 10px 10px;
  }
</style>
