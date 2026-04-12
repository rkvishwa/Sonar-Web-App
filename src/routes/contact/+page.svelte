<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData } from "./$types";
  import { Mail, Send, MessageSquare, User, AtSign } from "lucide-svelte";

  let { form } = $props<{ form?: ActionData }>();

  let glowCard: HTMLDivElement;
  let mouseX = $state(0);
  let mouseY = $state(0);
  let isHovering = $state(false);

  function handleMouseMove(event: MouseEvent) {
    if (!glowCard) return;
    const rect = glowCard.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function handleMouseEnter() {
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
  }
</script>

<svelte:head>
  <title>Contact Us | Sonar IDE</title>
  <meta
    name="description"
    content="Contact the Sonar IDE team for support, feature requests, or questions about secure coding environments."
  />
  <meta property="og:title" content="Contact Us | Sonar IDE" />
  <meta property="og:description" content="Contact the Sonar IDE team for support, feature requests, or questions about secure coding environments." />
  <meta property="og:image" content="/favicon.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="relative min-h-[calc(100vh-80px)] overflow-hidden px-4 sm:px-6 md:px-8 py-10 sm:py-16 md:py-20 flex flex-col items-center justify-center">
  <!-- Dynamic Background Ambient Glows -->
  <div class="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] rounded-full mix-blend-screen opacity-50"></div>
  <div class="pointer-events-none absolute left-1/4 bottom-0 w-[600px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 blur-[100px] rounded-full mix-blend-screen opacity-40"></div>

  <div class="relative z-10 mx-auto max-w-2xl w-full text-center mb-12">
    <div
      class="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-200/50 dark:border-cyan-400/20 bg-white/50 dark:bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-300 shadow-sm backdrop-blur-md mb-6"
    >
      <Mail size={14} />
      <span>Contact Support</span>
    </div>

    <h1
      class="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 pb-2"
    >
      Let's build together.
    </h1>

    <p
      class="mt-4 text-lg sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto font-medium"
    >
      Have a question about Sonar, classroom deployments, or feature requests? We're here to help.
    </p>
  </div>

  <div class="relative w-full max-w-2xl z-10 mx-auto">
    <div
      bind:this={glowCard}
      onmousemove={handleMouseMove}
      onmouseenter={handleMouseEnter}
      onmouseleave={handleMouseLeave}
      role="presentation"
      class="relative group"
    >
      <!-- Hover Glow Effects -->
      <div
        class="pointer-events-none absolute -inset-4 sm:-inset-6 rounded-[2.5rem] blur-3xl transition-opacity duration-500"
        style="background: radial-gradient(400px circle at {mouseX}px {mouseY}px, rgba(34, 211, 238, 0.15), transparent 40%); opacity: {isHovering ? 1 : 0};"
      ></div>

      <div
        class="pointer-events-none absolute -inset-[1px] rounded-[2rem] transition-opacity duration-300 z-0"
        style="background: radial-gradient(600px circle at {mouseX}px {mouseY}px, rgba(34, 211, 238, 0.4), rgba(59, 130, 246, 0.1) 40%, transparent 60%); opacity: {isHovering ? 1 : 0};"
      ></div>

      <div
        class="pointer-events-none absolute -inset-[1px] rounded-[1.5rem] sm:rounded-[2rem] bg-gradient-to-br from-zinc-200 via-white/10 to-zinc-200/50 dark:from-zinc-700/50 dark:via-white/5 dark:to-zinc-800/50 opacity-80 z-0"
      ></div>

      <!-- Glassmorphic Form Card -->
      <section
        class="relative z-10 overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/60 dark:bg-[#0a121a]/60 px-5 py-8 md:p-10 shadow-2xl shadow-cyan-500/5 backdrop-blur-2xl"
      >
        <div
          class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
        ></div>

        <form method="POST" use:enhance class="space-y-5 sm:space-y-6" novalidate>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <!-- Name Input -->
            <div class="space-y-2">
              <label
                for="name"
                class="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Full Name
              </label>
              <div class="relative group/input">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within/input:text-cyan-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form?.values?.name ?? ""}
                  placeholder="Jackie Chan"
                  autocomplete="name"
                  required
                  class="w-full rounded-xl border border-zinc-300/80 dark:border-white/10 bg-white/50 dark:bg-black/20 pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-all placeholder:text-zinc-400/80 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.1)]"
                  aria-invalid={form?.errors?.name ? "true" : "false"}
                />
              </div>
              {#if form?.errors?.name}
                <p class="text-sm font-medium text-rose-500 flex items-center gap-1.5 mt-1">
                  {form.errors.name}
                </p>
              {/if}
            </div>

            <!-- Email Input -->
            <div class="space-y-2">
              <label
                for="email"
                class="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Email Address
              </label>
              <div class="relative group/input">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within/input:text-cyan-500 transition-colors">
                  <AtSign size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form?.values?.email ?? ""}
                  placeholder="jakie@example.com"
                  autocomplete="email"
                  required
                  class="w-full rounded-xl border border-zinc-300/80 dark:border-white/10 bg-white/50 dark:bg-black/20 pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-all placeholder:text-zinc-400/80 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.1)]"
                  aria-invalid={form?.errors?.email ? "true" : "false"}
                />
              </div>
              {#if form?.errors?.email}
                <p class="text-sm font-medium text-rose-500 flex items-center gap-1.5 mt-1">
                  {form.errors.email}
                </p>
              {/if}
            </div>
          </div>

          <!-- Message Input -->
          <div class="space-y-2">
            <label
              for="message"
              class="block text-sm font-semibold text-zinc-800 dark:text-zinc-200"
            >
              How can we help?
            </label>
            <div class="relative group/input">
              <div class="absolute top-3.5 left-0 pl-3.5 pointer-events-none text-zinc-400 group-focus-within/input:text-cyan-500 transition-colors">
                <MessageSquare size={18} />
              </div>
              <textarea
                id="message"
                name="message"
                rows="5"
                placeholder="Tell us about your project or inquiry..."
                required
                class="w-full rounded-xl border border-zinc-300/80 dark:border-white/10 bg-white/50 dark:bg-black/20 pl-10 pr-4 py-3 text-zinc-900 dark:text-zinc-100 outline-none transition-all placeholder:text-zinc-400/80 focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.1)] resize-y min-h-[120px]"
                aria-invalid={form?.errors?.message ? "true" : "false"}
              >{form?.values?.message ?? ""}</textarea>
            </div>
            {#if form?.errors?.message}
              <p class="text-sm font-medium text-rose-500 flex items-center gap-1.5 mt-1">
                {form.errors.message}
              </p>
            {/if}
          </div>

          <!-- Status Message -->
          {#if form?.message}
            <div
              class={`rounded-xl border p-4 text-sm font-medium flex items-start gap-3 transition-all ${
                form.success 
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" 
                  : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
              }`}
            >
              <div class={`mt-0.5 rounded-full p-1 flex items-center justify-center ${form.success ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-rose-100 dark:bg-rose-500/20"}`}>
                <div class={`h-2 w-2 rounded-full ${form.success ? "bg-emerald-500" : "bg-rose-500"}`}></div>
              </div>
              <p class="mt-0.5">{form.message}</p>
            </div>
          {/if}

          <!-- Submit Button -->
          <div class="pt-1 sm:pt-2">
            <button
              type="submit"
              class="group relative w-full inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-900 px-6 py-3.5 sm:px-8 sm:py-4 font-bold text-white shadow-[0_4px_14px_0_rgb(0,0,0,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(93,93,93,0.23)] hover:-translate-y-0.5 dark:bg-white dark:text-zinc-900 dark:shadow-[0_4px_14px_0_rgb(255,255,255,0.2)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.23)] text-sm sm:text-base"
            >
              <span class="relative z-10 flex items-center gap-2">
                <span>Send Message</span>
                <Send size={18} class="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
              <div class="absolute inset-0 z-0 h-full w-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-cyan-400 dark:to-blue-600"></div>
              <span class="absolute z-10 flex items-center gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 text-white">
                <span>Send Message</span>
                <Send size={18} class="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
            </button>
            <p class="mt-4 text-center text-xs font-medium text-zinc-500 dark:text-zinc-500">
              We typically respond within 24 hours.
            </p>
          </div>
        </form>
      </section>
    </div>
  </div>
</div>
