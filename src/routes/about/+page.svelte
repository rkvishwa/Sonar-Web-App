<script lang="ts">
  import { onMount } from 'svelte';
  import { Github, Users, ShieldCheck, Globe, Instagram, Youtube, Linkedin, Facebook, Twitter, MessageCircle, Music, Mail } from 'lucide-svelte';

  interface Contributor {
    login: string;
    name?: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
    id: number | string;
  }

  const manualContributors: Contributor[] = [
    {
      id: 'manual-thesaru-praneeth',
      login: 'Thesaru-p',
      name: 'Thesaru-Praneeth',
      avatar_url: '/user/thesaru.png',
      html_url: 'https://github.com/Thesaru-p',
      contributions: 46
    }
  ];

  function sortContributors(list: Contributor[]) {
    return [...list].sort(
      (a, b) => b.contributions - a.contributions || (a.name ?? a.login).localeCompare(b.name ?? b.login)
    );
  }

  function mergeContributors(remoteContributors: Contributor[]) {
    const manualLogins = new Set(manualContributors.map((contributor) => contributor.login));
    const uniqueRemoteContributors = remoteContributors.filter(
      (contributor) => !manualLogins.has(contributor.login)
    );

    return sortContributors([...uniqueRemoteContributors, ...manualContributors]);
  }

  let contributors = $state<Contributor[]>(sortContributors(manualContributors));
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await fetch('https://api.github.com/repos/rkvishwa/Sonar-Code-Editor/contributors');
      if (res.ok) {
        contributors = mergeContributors(await res.json());
      }
    } catch (err) {
      console.error('Failed to load contributors', err);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>About | Sonar IDE</title>
  <meta name="description" content="Learn about Sonar IDE, the open-source community behind it, and our mission to provide secure, collaborative coding environments." />
  <meta property="og:title" content="About | Sonar IDE" />
  <meta property="og:description" content="Learn about Sonar IDE, the open-source community behind it, and our mission to provide secure, collaborative coding environments." />
  <meta property="og:image" content="/favicon.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-20 lg:pt-16 lg:pb-24 max-w-5xl mx-auto w-full transition-colors duration-200">
  <div class="text-center mb-12 sm:mb-24">
    <div class="w-16 h-16 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-8">
      <ShieldCheck size={32} />
    </div>
    <h1 class="text-3xl sm:text-5xl font-extrabold mb-4 sm:mb-6 tracking-tight text-zinc-900 dark:text-white">Built for Integrity</h1>
    <p class="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
      Sonar Code Editor was developed to bridge the gap between powerful modern code editing and strict academic/professional integrity. It provides a reliable supervised environment without sacrificing the developer experience.
    </p>
  </div>

  <section class="mb-12 sm:mb-20 relative overflow-hidden rounded-3xl bg-zinc-100 dark:bg-black text-zinc-900 dark:text-white p-6 sm:p-12 shadow-2xl border border-zinc-200 dark:border-white/10 transition-colors duration-200">
    <div class="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
    
    <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
      <div class="flex-1">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-800/10 dark:bg-white/10 text-cyan-600 dark:text-cyan-300 text-xs font-semibold tracking-wider uppercase mb-4 outline outline-1 outline-zinc-900/10 dark:outline-white/10">
          <span>The Community</span>
        </div>
        <h2 class="text-2xl sm:text-4xl font-extrabold mb-4">Crafted by <span class="text-transparent bg-clip-text bg-linear-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">knurdz & Brainvave Software Studios</span></h2>
        <p class="text-zinc-600 dark:text-zinc-400 max-w-lg mb-6 leading-relaxed mx-auto md:mx-0">
          Sonar IDE is proudly developed and maintained by the <strong>knurdz</strong> community. This project is completely open-source, and we welcome contributions from developers worldwide to help build the future of education and coding.
        </p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
        <a href="https://knurdz.org/" target="_blank" rel="noreferrer" class="flex items-center justify-center space-x-2 px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 dark:shadow-white/10">
          <Globe size={20} />
          <span>knurdz.org</span>
        </a>
        <a href="https://github.com/knurdz" target="_blank" rel="noreferrer" class="flex items-center justify-center space-x-2 px-6 py-3.5 bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 dark:hover:bg-white/20 text-zinc-900 dark:text-white font-bold rounded-xl outline outline-1 outline-zinc-300 dark:outline-white/20 transition-all hover:scale-105 active:scale-95">
          <Github size={20} />
          <span>GitHub Org</span>
        </a>
      </div>
    </div>
  </section>

  <section class="bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-3xl p-6 sm:p-12 mb-12 sm:mb-20 transition-colors duration-200">
    <div class="flex items-center space-x-3 mb-8">
      <Users size={28} class="text-blue-600 dark:text-blue-400" />
      <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Project Contributors</h2>
    </div>

    {#if loading}
      <div class="flex justify-center py-20">
        <div class="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    {:else if contributors.length > 0}
      <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-6">
        {#each contributors as contributor (contributor.id)}
          <a
            href={contributor.html_url}
            target="_blank"
            rel="noreferrer"
            class="flex flex-col items-center group p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-white/5 transition"
          >
            <div class="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-zinc-200 dark:ring-white/10 group-hover:ring-blue-500 transition-all">
              <img
                src={contributor.avatar_url}
                alt={contributor.name ?? contributor.login}
                class="w-full h-full object-cover"
              />
            </div>
            <span class="text-center font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
              {contributor.name ?? contributor.login}
            </span>
            <span class="text-center text-xs text-zinc-500 dark:text-zinc-500 mt-1">{contributor.contributions} commits</span>
          </a>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12 text-zinc-500">
        <p>Could not load contributors at this time.</p>
        <a href="https://github.com/rkvishwa/Sonar-Code-Editor" class="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-4">
          <Github size={16} />
          <span>View on GitHub</span>
        </a>
      </div>
    {/if}
  </section>

  <section class="mb-12 sm:mb-20 overflow-hidden relative bg-zinc-950 dark:bg-zinc-900/40 rounded-[2rem] p-1 shadow-2xl transition-colors duration-200">
    <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 blur-3xl pointer-events-none opacity-50 dark:opacity-80"></div>
    <div class="relative bg-zinc-900 dark:bg-zinc-950/80 rounded-[30px] px-3 py-8 sm:p-12 border border-white/5 backdrop-blur-sm text-center">
      <h2 class="text-2xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight px-3 sm:px-0">Connect with knurdz<span class="text-[#00c950]">.org</span></h2>
      <p class="text-zinc-400 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed sm:text-lg px-2 sm:px-0">
        Join our vibrant community across platforms to stay updated on tutorials, tools, and the future of coding education.
      </p>
      
      <div class="grid grid-cols-4 sm:flex sm:flex-wrap place-items-center justify-center gap-3 sm:gap-4 md:gap-6 w-fit mx-auto">
        <a href="https://knurdz.org" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-zinc-800 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-zinc-800/30" title="Website">
          <Globe class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
        <a href="https://whatsapp.com/channel/0029Vb7mzSE90x2oxIk9D31Z" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#25D366] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#25D366]/30" title="WhatsApp">
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/knurdz" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#0077B5] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#0077B5]/30" title="LinkedIn">
          <Linkedin class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
        <a href="https://www.youtube.com/@knurdz" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#FF0000] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#FF0000]/30" title="YouTube">
          <Youtube class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
        <a href="https://www.instagram.com/knurdz_org" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#E1306C] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#E1306C]/30" title="Instagram">
          <Instagram class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
        <a href="https://www.facebook.com/people/Knurdz/61579574973113/" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#1877F2] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#1877F2]/30" title="Facebook">
          <Facebook class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
        <a href="https://x.com/knurdz_org" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-black border border-transparent hover:border-white/10 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-white/10" title="X (Twitter)">
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 sm:w-7 sm:h-7 p-0.5 text-zinc-300 group-hover:text-white transition-colors duration-300"><title>X</title><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>
        </a>
        <a href="https://www.tiktok.com/@knurdz_org" target="_blank" rel="noreferrer" class="group relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#333333] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-black/20" title="TikTok">
          <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300"><title>TikTok</title><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        </a>
        <a href="mailto:hello@knurdz.org" class="group relative flex items-center justify-center col-span-4 mx-auto sm:col-span-1 sm:mx-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/5 hover:bg-[#D44638] rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-[#D44638]/30" title="Email Us">
          <Mail class="w-6 h-6 sm:w-7 sm:h-7 text-zinc-300 group-hover:text-white transition-colors duration-300" />
        </a>
      </div>
    </div>
  </section>

  <div class="text-center bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-600/10 dark:to-cyan-600/10 rounded-3xl p-6 sm:p-10 border border-blue-200 dark:border-blue-500/20 transition-colors duration-200">
    <h2 class="text-xl sm:text-2xl font-bold mb-4 text-zinc-900 dark:text-white">Join the Mission</h2>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto">
      Help us improve Sonar Code Editor by actively suggesting features, improving logging, or building better IDE tools.
    </p>
    <div class="flex flex-col sm:flex-row justify-center gap-4">
      <a href="/contact" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors inline-block shadow-lg shadow-blue-500/20">
        Contact Us
      </a>
      <a href="https://github.com/rkvishwa/Sonar-Code-Editor/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" class="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-[#0B0F19] hover:bg-zinc-800 dark:hover:bg-zinc-200 font-semibold rounded-lg transition-colors inline-block shadow-lg">
        Contribution Guidelines
      </a>
    </div>
  </div>
</div>
