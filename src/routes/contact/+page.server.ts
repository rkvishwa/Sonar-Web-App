import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { env } from '$env/dynamic/private';
import nodemailer from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactValues = {
  name: string;
  email: string;
  message: string;
};

type ContactFieldErrors = {
  name?: string;
  email?: string;
  message?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum milliseconds a human needs to fill out the form. */
const MIN_SUBMIT_DELAY_MS = Number.isFinite(Number(env.CONTACT_MIN_SUBMIT_DELAY_MS))
  ? Number(env.CONTACT_MIN_SUBMIT_DELAY_MS)
  : 2000;

/** Maximum timestamp age to prevent replays (1 hour). */
const MAX_SUBMIT_DELAY_MS = 60 * 60 * 1000;

/** Max submissions per IP per window. */
const RATE_LIMIT_MAX = Number.isFinite(Number(env.CONTACT_RATE_LIMIT_MAX))
  ? Number(env.CONTACT_RATE_LIMIT_MAX)
  : 3;

/** Sliding window duration in ms (10 minutes). */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// ─── Layer 2: Rate Limiter ────────────────────────────────────────────────────

type RateLimitEntry = { count: number; windowStart: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Returns true if the given IP has exceeded the rate limit.
 * Uses a sliding window stored in-memory.
 */
const isRateLimited = (ip: string): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    // New window
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }

  return false;
};

/** Periodically clean up stale entries to prevent memory leaks. */
const pruneRateLimitStore = () => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
};

// Run cleanup every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(pruneRateLimitStore, 15 * 60 * 1000);
}

// ─── Layer 4: Spam Keyword Filter ─────────────────────────────────────────────

/**
 * Common spam patterns: crypto, pharma, SEO link drops, etc.
 * Case-insensitive. Match against name + message combined.
 */
const SPAM_PATTERNS: RegExp[] = [
  /\b(casino|poker|slots|gambling|bet(ting)?)\b/i,
  /\b(viagra|cialis|levitra|pharmacy|pills?|medication)\b/i,
  /\b(crypto|bitcoin|nft|blockchain|invest(ment)?|forex|trading)\b/i,
  /\b(seo|backlink|link.?building|guest.?post|rank(ing)?)\b/i,
  /\b(loan|credit|debt|mortgage|finance offer)\b/i,
  /\b(earn \$|make money|passive income|work from home|mlm)\b/i,
  // More than 3 URLs in a message is a strong spam signal
  /(https?:\/\/[^\s]+.*){3,}/i,
];

const isSpam = (values: ContactValues): boolean => {
  const combined = `${values.name} ${values.message}`;
  return SPAM_PATTERNS.some((pattern) => pattern.test(combined));
};

// ─── Validation ───────────────────────────────────────────────────────────────

const getFormText = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const validate = (values: ContactValues): ContactFieldErrors => {
  const errors: ContactFieldErrors = {};

  if (!values.name) {
    errors.name = 'Name is required.';
  } else if (values.name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!values.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!values.message) {
    errors.message = 'Message is required.';
  } else if (values.message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  } else if (values.message.length > 3000) {
    errors.message = 'Message must be 3000 characters or fewer.';
  }

  return errors;
};

// ─── SMTP Helpers ─────────────────────────────────────────────────────────────

const getSmtpPort = () => {
  const parsedPort = Number.parseInt(env.SMTP_PORT ?? '', 10);
  return Number.isFinite(parsedPort) ? parsedPort : 587;
};

const getSmtpSecure = (port: number) => {
  const explicitSecure = (env.SMTP_SECURE ?? '').toLowerCase();
  if (explicitSecure === 'true') return true;
  if (explicitSecure === 'false') return false;
  return port === 465;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildAcknowledgementEmail = (name: string) => {
  const safeName = escapeHtml(name);
  const text = `Hi ${name},\n\nWe received your message. Thanks for contacting Sonar IDE.\n\nOur team will review your message and get back to you if needed.\n\nRegards,\nSonar IDE Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${safeName},</p>
      <p>We received your message. Thanks for contacting <strong>Sonar IDE</strong>.</p>
      <p>Our team will review your message and get back to you if needed.</p>
      <p>Regards,<br />Sonar IDE Team</p>
    </div>
  `;

  return { text, html };
};

/** Fake-success response returned silently for detected bots/spam. */
const fakeSuccess = () => ({
  success: true,
  message: 'Thanks. We received your email and sent a confirmation message.',
  values: { name: '', email: '', message: '' }
});

// ─── Action ───────────────────────────────────────────────────────────────────

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();

    // ── Layer 1: Honeypot ──────────────────────────────────────────────────────
    // If the hidden "website" field is filled, this is almost certainly a bot.
    // Return a fake success so the bot doesn't know it was caught.
    const honeypot = getFormText(formData, 'website');
    if (honeypot) {
      console.warn('[contact] Honeypot triggered — bot submission silently dropped.');
      return fakeSuccess();
    }

    // ── Layer 2: Rate Limiting ─────────────────────────────────────────────────
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (isRateLimited(ip)) {
      console.warn(`[contact] Rate limit exceeded for IP: ${ip}`);
      return fail(429, {
        success: false,
        message: 'Too many submissions. Please wait a few minutes before trying again.',
        values: {
          name: getFormText(formData, 'name'),
          email: getFormText(formData, 'email').toLowerCase(),
          message: getFormText(formData, 'message')
        }
      });
    }

    // ── Layer 3: Timing Check ──────────────────────────────────────────────────
    // Bots submit in milliseconds; real users take several seconds to fill out
    // the form. The page embeds a _timestamp on load via onMount.
    const rawTimestamp = getFormText(formData, '_timestamp');
    if (rawTimestamp) {
      const ts = Number.parseInt(rawTimestamp, 10);
      const now = Date.now();
      const elapsed = now - ts;

      if (!Number.isFinite(ts) || elapsed < MIN_SUBMIT_DELAY_MS || elapsed > MAX_SUBMIT_DELAY_MS) {
        console.warn(`[contact] Timing check failed (elapsed: ${elapsed}ms) — bot submission dropped.`);
        return fakeSuccess();
      }
    }

    // ── Read & Validate Fields ─────────────────────────────────────────────────
    const values: ContactValues = {
      name: getFormText(formData, 'name'),
      email: getFormText(formData, 'email').toLowerCase(),
      message: getFormText(formData, 'message')
    };

    const errors = validate(values);
    if (Object.keys(errors).length > 0) {
      return fail(400, {
        success: false,
        message: 'Please fix the highlighted fields and submit again.',
        errors,
        values
      });
    }

    // ── Layer 4: Spam Keyword Filter ───────────────────────────────────────────
    if (isSpam(values)) {
      console.warn(`[contact] Spam keyword match — submission from ${ip} silently dropped.`);
      return fakeSuccess();
    }

    // ── Send Emails ────────────────────────────────────────────────────────────
    if (!env.SMTP_HOST || !env.SMTP_FROM) {
      console.error('Missing SMTP_HOST or SMTP_FROM for contact form email delivery.');
      return fail(500, {
        success: false,
        message: 'Email service is not configured yet. Please try again later.',
        values
      });
    }

    const smtpPort = getSmtpPort();
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: smtpPort,
      secure: getSmtpSecure(smtpPort),
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS
            }
          : undefined
    });

    const inboxAddress = env.CONTACT_INBOX_EMAIL || env.SMTP_FROM;
    const acknowledgement = buildAcknowledgementEmail(values.name);
    const safeNameForSubject = values.name.replace(/[\r\n]+/g, ' ').trim();

    // Send emails in the background so the form UI responds instantly
    Promise.all([
      transporter.sendMail({
        from: env.SMTP_FROM,
        to: values.email,
        replyTo: inboxAddress,
        subject: 'We received your message - Sonar IDE',
        text: acknowledgement.text,
        html: acknowledgement.html
      }),
      transporter.sendMail({
        from: env.SMTP_FROM,
        to: inboxAddress,
        replyTo: values.email,
        subject: `New contact form message from ${safeNameForSubject}`,
        text: `Name: ${values.name}\nEmail: ${values.email}\n\nMessage:\n${values.message}`
      })
    ]).catch((error) => {
      console.error('Failed to send contact form emails in background:', error);
    });

    return fakeSuccess();
  }
};