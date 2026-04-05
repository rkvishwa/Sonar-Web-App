import { browser } from "$app/environment";
import {
  Account,
  Client,
  ID,
  OAuthProvider,
  type Models,
} from "appwrite";
import { writable } from "svelte/store";
import type { HostAccount } from "$lib/admin/types";

export interface AuthState {
  status: "idle" | "loading" | "ready";
  user: HostAccount | null;
  error: string | null;
}

const endpoint = String(import.meta.env.VITE_APPWRITE_ENDPOINT || "").trim();
const projectId = String(import.meta.env.VITE_APPWRITE_PROJECT_ID || "").trim();

export const isAppwriteConfigured = Boolean(endpoint && projectId);

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = isAppwriteConfigured ? new Account(client) : null;

const authStore = writable<AuthState>({
  status: isAppwriteConfigured ? "idle" : "ready",
  user: null,
  error: isAppwriteConfigured
    ? null
    : "Missing Appwrite configuration. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.",
});

function normalizeRole(user: Models.User<Models.Preferences>): HostAccount["role"] {
  const prefs = (user.prefs || {}) as Record<string, unknown>;
  const prefRole = String(prefs.role || "").toLowerCase();
  const labels = Array.isArray(user.labels) ? user.labels : [];

  if (prefRole === "admin" || labels.includes("admin")) {
    return "admin";
  }

  return "host";
}

function mapUser(user: Models.User<Models.Preferences>): HostAccount {
  return {
    id: user.$id,
    name: user.name || "Sonar Host",
    email: user.email,
    role: normalizeRole(user),
    labels: Array.isArray(user.labels) ? user.labels : [],
    prefs: user.prefs || {},
    createdAt: user.$createdAt,
  };
}

async function ensureHostProfile(
  user: Models.User<Models.Preferences>,
): Promise<Models.User<Models.Preferences>> {
  if (!account) {
    return user;
  }

  const prefs = (user.prefs || {}) as Record<string, unknown>;
  const currentRole = String(prefs.role || "").trim().toLowerCase();
  if (currentRole) {
    return user;
  }

  await account.updatePrefs({
    ...prefs,
    role: "host",
  });

  return account.get();
}

function setState(next: AuthState) {
  authStore.set(next);
  return next;
}

export async function refreshSession(): Promise<AuthState> {
  if (!account) {
    return setState({
      status: "ready",
      user: null,
      error:
        "Missing Appwrite configuration. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.",
    });
  }

  setState({
    status: "loading",
    user: null,
    error: null,
  });

  try {
    const rawUser = await account.get();
    const hydratedUser = await ensureHostProfile(rawUser);

    return setState({
      status: "ready",
      user: mapUser(hydratedUser),
      error: null,
    });
  } catch {
    return setState({
      status: "ready",
      user: null,
      error: null,
    });
  }
}

async function createEmailSession(email: string, password: string) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  try {
    await account.deleteSession("current");
  } catch {
    // Ignore missing current session.
  }

  await account.createEmailPasswordSession(email, password);
}

export async function signUpWithEmail(input: {
  name: string;
  email: string;
  password: string;
}): Promise<HostAccount> {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();

  await account.create(ID.unique(), trimmedEmail, input.password, trimmedName);
  await createEmailSession(trimmedEmail, input.password);

  const nextState = await refreshSession();
  if (!nextState.user) {
    throw new Error("Unable to create the new session.");
  }

  return nextState.user;
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<HostAccount> {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await createEmailSession(input.email.trim().toLowerCase(), input.password);

  const nextState = await refreshSession();
  if (!nextState.user) {
    throw new Error("Unable to sign in with those credentials.");
  }

  return nextState.user;
}

export async function startOAuthSignIn(provider: "google" | "github") {
  if (!account || !browser) {
    throw new Error("OAuth sign in requires a browser session.");
  }

  const successUrl = `${window.location.origin}/admin/dashboard`;
  const failureUrl = `${window.location.origin}/admin/signin?auth=failed`;

  await account.createOAuth2Session(
    provider === "google" ? OAuthProvider.Google : OAuthProvider.Github,
    successUrl,
    failureUrl,
  );
}

export async function signOut() {
  if (!account) {
    setState({
      status: "ready",
      user: null,
      error: null,
    });
    return;
  }

  try {
    await account.deleteSession("current");
  } finally {
    setState({
      status: "ready",
      user: null,
      error: null,
    });
  }
}

export async function changeCurrentPassword(input: {
  currentPassword: string;
  nextPassword: string;
}) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await account.updatePassword(input.nextPassword, input.currentPassword);
}

export const auth = {
  subscribe: authStore.subscribe,
  refresh: refreshSession,
  signInWithEmail,
  signUpWithEmail,
  startOAuthSignIn,
  signOut,
  changeCurrentPassword,
};
