import { browser } from "$app/environment";
import { Account, Client, ID, OAuthProvider, type Models } from "appwrite";
import { writable } from "svelte/store";
import type {
  AccountRole,
  HostAccount,
  HostAccountPrefs,
  HostAccountType,
  HostAuthProvider,
} from "$lib/admin/types";

export interface AuthState {
  status: "idle" | "loading" | "ready";
  user: HostAccount | null;
  error: string | null;
}

export type OAuthFlowIntent = "signin" | "signup";
export type OAuthFlowProvider = "google" | "github";

export interface EmailRegistrationInput {
  name: string;
  email: string;
  password: string;
  accountType: HostAccountType;
  organizationName?: string;
  registrantRole?: string;
}

export interface OAuthRegistrationInput {
  accountType: HostAccountType;
  organizationName?: string;
  registrantRole?: string;
  provider: OAuthFlowProvider;
}

export const SIGNIN_PATH = "/admin/signin";
export const DASHBOARD_PATH = "/admin/dashboard";
export const REGISTRATION_COMPLETION_PATH = "/admin/complete-registration";
export const EMAIL_VERIFICATION_PATH = "/admin/verify-email";
export const EMAIL_VERIFICATION_CALLBACK_PATH = "/admin/auth/verify-email";
export const FORGOT_PASSWORD_PATH = "/admin/forgot-password";
export const RESET_PASSWORD_PATH = "/admin/reset-password";
const DEFAULT_REGISTERED_ACCOUNT_ROLE: AccountRole = "admin";

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

function normalizeAccountType(value: unknown): HostAccountType | null {
  if (value === "individual" || value === "organization") {
    return value;
  }

  return null;
}

function normalizeHostProvider(value: unknown): HostAuthProvider | null {
  if (value === "email" || value === "google" || value === "github") {
    return value;
  }

  return null;
}

function normalizeProviders(value: unknown): HostAuthProvider[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<HostAuthProvider>();

  for (const entry of value) {
    const provider = normalizeHostProvider(entry);
    if (provider) {
      seen.add(provider);
    }
  }

  return Array.from(seen);
}

function mergeAuthProviders(
  existing: unknown,
  incoming: HostAuthProvider[],
): HostAuthProvider[] {
  return Array.from(new Set([...normalizeProviders(existing), ...incoming]));
}

function normalizePrefs(
  prefs: Models.Preferences | HostAccountPrefs | null | undefined,
): HostAccountPrefs {
  const raw = (prefs || {}) as HostAccountPrefs;

  return {
    ...raw,
    role:
      raw.role === "admin" || raw.role === "host" ? raw.role : undefined,
    registrationCompleted: raw.registrationCompleted === true,
    registrationCompletedAt: String(raw.registrationCompletedAt || "").trim() || undefined,
    accountType: normalizeAccountType(raw.accountType) || undefined,
    organizationName: String(raw.organizationName || "").trim() || undefined,
    registrantRole: String(raw.registrantRole || "").trim() || undefined,
    passwordConfigured: raw.passwordConfigured === true,
    authProviders: normalizeProviders(raw.authProviders),
  };
}

function isLegacyRegisteredProfile(prefs: HostAccountPrefs): boolean {
  return prefs.role === "host" || prefs.role === "admin";
}

function hasCompletedStructuredProfile(prefs: HostAccountPrefs): boolean {
  const accountType = normalizeAccountType(prefs.accountType);

  if (accountType === "individual") {
    return true;
  }

  if (accountType === "organization") {
    return Boolean(prefs.organizationName && prefs.registrantRole);
  }

  return false;
}

function computeRegistrationCompleted(prefs: HostAccountPrefs): boolean {
  if (prefs.registrationCompleted === true) {
    return true;
  }

  if (hasCompletedStructuredProfile(prefs)) {
    return true;
  }

  return isLegacyRegisteredProfile(prefs);
}

function normalizeRole(
  user: Models.User<HostAccountPrefs>,
): HostAccount["role"] {
  const prefs = normalizePrefs(user.prefs);
  const labels = Array.isArray(user.labels) ? user.labels : [];

  if (prefs.role === "admin" || labels.includes("admin")) {
    return "admin";
  }

  return "host";
}

function mapUser(user: Models.User<HostAccountPrefs>): HostAccount {
  const prefs = normalizePrefs(user.prefs);
  const authProviders = normalizeProviders(prefs.authProviders);

  return {
    id: user.$id,
    name: user.name || "Sonar Host",
    email: user.email,
    emailVerified: user.emailVerification,
    role: normalizeRole(user),
    labels: Array.isArray(user.labels) ? user.labels : [],
    prefs,
    registrationCompleted: computeRegistrationCompleted(prefs),
    accountType: normalizeAccountType(prefs.accountType),
    organizationName: prefs.organizationName || null,
    registrantRole: prefs.registrantRole || null,
    passwordConfigured:
      prefs.passwordConfigured === true || authProviders.includes("email"),
    authProviders,
    createdAt: user.$createdAt,
  };
}

function setState(next: AuthState) {
  authStore.set(next);
  return next;
}

function getRegistrationRole(
  currentPrefs: HostAccountPrefs,
  fallbackRole: AccountRole = DEFAULT_REGISTERED_ACCOUNT_ROLE,
): AccountRole {
  return currentPrefs.role === "admin" ? "admin" : fallbackRole;
}

function shouldPromoteRegisteredAccountToAdmin(prefs: HostAccountPrefs): boolean {
  if (prefs.role === "admin") {
    return false;
  }

  return (
    prefs.role === "host" ||
    prefs.registrationCompleted === true ||
    hasCompletedStructuredProfile(prefs)
  );
}

function sanitizeRegistrationProfile(input: {
  accountType: HostAccountType;
  organizationName?: string;
  registrantRole?: string;
}) {
  const accountType = normalizeAccountType(input.accountType);

  if (!accountType) {
    throw new Error("Choose whether you are registering as an individual or an organization.");
  }

  const organizationName = String(input.organizationName || "").trim();
  const registrantRole = String(input.registrantRole || "").trim();

  if (accountType === "organization" && !organizationName) {
    throw new Error("Add the organization name to continue.");
  }

  if (accountType === "organization" && !registrantRole) {
    throw new Error("Add the registrant role to continue.");
  }

  return {
    accountType,
    organizationName,
    registrantRole,
  };
}

function buildCompletedPrefs(
  currentPrefs: HostAccountPrefs,
  input: {
    accountType: HostAccountType;
    organizationName: string;
    registrantRole: string;
    passwordConfigured: boolean;
    authProviders: HostAuthProvider[];
  },
): HostAccountPrefs {
  return {
    ...currentPrefs,
    role: getRegistrationRole(currentPrefs),
    registrationCompleted: true,
    registrationCompletedAt:
      currentPrefs.registrationCompletedAt || new Date().toISOString(),
    accountType: input.accountType,
    organizationName:
      input.accountType === "organization" ? input.organizationName : "",
    registrantRole:
      input.accountType === "organization" ? input.registrantRole : "",
    passwordConfigured:
      currentPrefs.passwordConfigured === true || input.passwordConfigured,
    authProviders: mergeAuthProviders(currentPrefs.authProviders, input.authProviders),
  };
}

async function getCurrentUser() {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  return account.get<HostAccountPrefs>();
}

async function ensureRegisteredAccountHasAdminRole(
  currentUser?: Models.User<HostAccountPrefs>,
) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const user = currentUser || (await getCurrentUser());
  const currentPrefs = normalizePrefs(user.prefs);

  if (!shouldPromoteRegisteredAccountToAdmin(currentPrefs)) {
    return user;
  }

  await account.updatePrefs<HostAccountPrefs>({
    prefs: {
      ...currentPrefs,
      role: DEFAULT_REGISTERED_ACCOUNT_ROLE,
    },
  });

  return getCurrentUser();
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

export function isRegistrationComplete(
  user: HostAccount | Models.User<HostAccountPrefs> | null,
): boolean {
  if (!user) {
    return false;
  }

  if ("registrationCompleted" in user) {
    return user.registrationCompleted;
  }

  return computeRegistrationCompleted(normalizePrefs(user.prefs));
}

export function resolveAuthenticatedRoute(user: HostAccount | null) {
  if (!user) {
    return SIGNIN_PATH;
  }

  if (!user.registrationCompleted) {
    return REGISTRATION_COMPLETION_PATH;
  }

  if (!user.emailVerified) {
    return EMAIL_VERIFICATION_PATH;
  }

  return DASHBOARD_PATH;
}

export function buildRegistrationCompletionPath(options: {
  provider?: OAuthFlowProvider | null;
  intent?: OAuthFlowIntent | null;
  accountType?: HostAccountType | null;
} = {}) {
  const params = new URLSearchParams();

  if (options.provider) {
    params.set("provider", options.provider);
  }

  if (options.intent) {
    params.set("intent", options.intent);
  }

  const accountType = normalizeAccountType(options.accountType);
  if (accountType) {
    params.set("accountType", accountType);
  }

  const query = params.toString();
  return query
    ? `${REGISTRATION_COMPLETION_PATH}?${query}`
    : REGISTRATION_COMPLETION_PATH;
}

function buildBrowserUrl(path: string, params?: Record<string, string | null | undefined>) {
  if (!browser) {
    throw new Error("This action requires a browser session.");
  }

  const url = new URL(path, window.location.origin);

  for (const [key, value] of Object.entries(params || {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
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
    let rawUser = await getCurrentUser();

    try {
      rawUser = await ensureRegisteredAccountHasAdminRole(rawUser);
    } catch {
      // Keep the session usable even if the one-time role migration cannot be stored.
    }

    return setState({
      status: "ready",
      user: mapUser(rawUser),
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

export async function signUpWithEmail(
  input: EmailRegistrationInput,
): Promise<HostAccount> {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  const registrationProfile = sanitizeRegistrationProfile(input);

  await account.create(ID.unique(), trimmedEmail, input.password, trimmedName);
  await createEmailSession(trimmedEmail, input.password);

  const currentUser = await getCurrentUser();
  const currentPrefs = normalizePrefs(currentUser.prefs);
  const nextPrefs = buildCompletedPrefs(currentPrefs, {
    ...registrationProfile,
    passwordConfigured: true,
    authProviders: ["email"],
  });

  await account.updatePrefs<HostAccountPrefs>({ prefs: nextPrefs });
  try {
    await sendEmailVerification();
  } catch {
    // The account was created successfully, and the verify-email page can resend.
  }

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

export async function startOAuthSignIn(
  provider: OAuthFlowProvider,
  options: {
    intent?: OAuthFlowIntent;
    accountType?: HostAccountType | null;
  } = {},
) {
  if (!account || !browser) {
    throw new Error("OAuth sign in requires a browser session.");
  }

  const intent = options.intent || "signin";
  const successParams = new URLSearchParams({
    provider,
    intent,
  });
  const accountType = normalizeAccountType(options.accountType);

  if (accountType) {
    successParams.set("accountType", accountType);
  }

  const successUrl = `${window.location.origin}/admin/auth/callback?${successParams.toString()}`;
  const failureRoute = intent === "signup" ? "/admin/signup" : SIGNIN_PATH;
  const failureParams = new URLSearchParams({
    auth: "failed",
    provider,
  });
  const failureUrl = `${window.location.origin}${failureRoute}?${failureParams.toString()}`;

  await account.createOAuth2Token(
    provider === "google" ? OAuthProvider.Google : OAuthProvider.Github,
    successUrl,
    failureUrl,
  );
}

export async function createOAuthSessionFromToken(input: {
  userId: string;
  secret: string;
}) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const userId = String(input.userId || "").trim();
  const secret = String(input.secret || "").trim();

  if (!userId || !secret) {
    throw new Error("The OAuth callback did not include a valid session token.");
  }

  try {
    await account.deleteSession("current");
  } catch {
    // Ignore missing current session.
  }

  await account.createSession({
    userId,
    secret,
  });
}

export async function recordLinkedOAuthProvider(provider: OAuthFlowProvider) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const currentUser = await getCurrentUser();
  const currentPrefs = normalizePrefs(currentUser.prefs);
  const nextProviders = mergeAuthProviders(currentPrefs.authProviders, [provider]);

  if (
    nextProviders.length === normalizeProviders(currentPrefs.authProviders).length
  ) {
    return;
  }

  await account.updatePrefs<HostAccountPrefs>({
    prefs: {
      ...currentPrefs,
      authProviders: nextProviders,
    },
  });
}

export async function completeOAuthRegistration(
  input: OAuthRegistrationInput,
): Promise<HostAccount> {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const registrationProfile = sanitizeRegistrationProfile(input);
  const currentUser = await getCurrentUser();

  const currentPrefs = normalizePrefs(currentUser.prefs);
  const nextPrefs = buildCompletedPrefs(currentPrefs, {
    ...registrationProfile,
    passwordConfigured: false,
    authProviders: [input.provider],
  });

  await account.updatePrefs<HostAccountPrefs>({ prefs: nextPrefs });

  const nextState = await refreshSession();
  if (!nextState.user) {
    throw new Error("Unable to finish setting up this account.");
  }

  return nextState.user;
}

export async function signOut() {
  if (browser) {
    // Defensive cleanup for UI states that may lock page scrolling (e.g. mobile drawers).
    document.body.classList.remove("overflow-hidden");
    document.documentElement.classList.remove("overflow-hidden");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

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

export async function sendEmailVerification() {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await account.createVerification({
    url: buildBrowserUrl(EMAIL_VERIFICATION_CALLBACK_PATH),
  });
}

export async function completeEmailVerification(input: {
  userId: string;
  secret: string;
}) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await account.updateVerification({
    userId: String(input.userId || "").trim(),
    secret: String(input.secret || "").trim(),
  });

  return refreshSession();
}

export async function sendPasswordRecovery(email: string) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  const trimmedEmail = String(email || "").trim().toLowerCase();
  if (!trimmedEmail) {
    throw new Error("Enter your email address to continue.");
  }

  await account.createRecovery({
    email: trimmedEmail,
    url: buildBrowserUrl(RESET_PASSWORD_PATH),
  });
}

export async function resetPassword(input: {
  userId: string;
  secret: string;
  password: string;
}) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await account.updateRecovery({
    userId: String(input.userId || "").trim(),
    secret: String(input.secret || "").trim(),
    password: input.password,
  });
}

export async function changeCurrentPassword(input: {
  currentPassword: string;
  nextPassword: string;
}) {
  if (!account) {
    throw new Error("Appwrite is not configured.");
  }

  await account.updatePassword({
    password: input.nextPassword,
    oldPassword: input.currentPassword,
  });
}

export const auth = {
  subscribe: authStore.subscribe,
  refresh: refreshSession,
  signInWithEmail,
  signUpWithEmail,
  startOAuthSignIn,
  createOAuthSessionFromToken,
  recordLinkedOAuthProvider,
  completeOAuthRegistration,
  sendEmailVerification,
  completeEmailVerification,
  sendPasswordRecovery,
  resetPassword,
  signOut,
  changeCurrentPassword,
};
