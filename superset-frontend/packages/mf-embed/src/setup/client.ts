/**
 * Configure `SupersetClient` so vendored API hooks (useDashboard, useChart, …)
 * route through the host's `appRoot`, and run the init/CSRF handshake with a
 * retry that rides out first-login provisioning.
 *
 * Why the retry: the FIRST authenticated request a brand-new user makes to
 * Superset triggers lazy user/role provisioning; the `init()` CSRF fetch is
 * that request and fails in the provisioning window. Retrying with backoff
 * lands a token on a later attempt, so first-login is seamless. The host can
 * subscribe to the status to drive a boot screen.
 *
 * Host-agnostic: appRoot + retry tuning come from {@link getEmbedConfig}.
 * Side-effect on import: kicks off the handshake.
 */
import { SupersetClient } from '@superset-ui/core';
import { getEmbedConfig } from '../config';

const { appRoot: APP_ROOT, csrfRetry } = getEmbedConfig();
const MAX_ATTEMPTS = csrfRetry?.maxAttempts ?? 4;
const BASE_DELAY_MS = csrfRetry?.baseDelayMs ?? 400;

SupersetClient.configure({
  protocol: ['http:', 'https:'].includes(window?.location?.protocol)
    ? (window.location.protocol as 'http:' | 'https:')
    : 'https:',
  host: window.location?.host || '',
  appRoot: APP_ROOT,
});

export type SupersetClientPhase =
  | 'initializing'
  | 'provisioning'
  | 'ready'
  | 'failed';

export interface SupersetClientStatus {
  phase: SupersetClientPhase;
  attempt: number;
  maxAttempts: number;
}

let status: SupersetClientStatus = {
  phase: 'initializing',
  attempt: 1,
  maxAttempts: MAX_ATTEMPTS,
};
const listeners = new Set<(s: SupersetClientStatus) => void>();
let inFlight = false;

function setStatus(next: Partial<SupersetClientStatus>): void {
  status = { ...status, ...next };
  listeners.forEach(listener => listener(status));
}

export function getSupersetClientStatus(): SupersetClientStatus {
  return status;
}

/** Subscribe to client-init status. Emits current status immediately. */
export function subscribeSupersetClientStatus(
  listener: (s: SupersetClientStatus) => void,
): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

async function runInit(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  let lastError: unknown;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      // First attempt is the normal path; once it has failed and we're looping,
      // we're almost certainly waiting on first-login provisioning.
      setStatus({ phase: attempt === 1 ? 'initializing' : 'provisioning', attempt });
      try {
        // force=true on retries so a previously-failed instance re-runs its CSRF
        // fetch rather than returning the cached rejected state.
        await SupersetClient.init(attempt > 1);
        setStatus({ phase: 'ready', attempt });
        return;
      } catch (error) {
        lastError = error;
        // eslint-disable-next-line no-console
        console.warn(`[mf-embed] client init attempt ${attempt}/${MAX_ATTEMPTS} failed`, error);
        if (attempt < MAX_ATTEMPTS) {
          const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    setStatus({ phase: 'failed', attempt: MAX_ATTEMPTS });
    // eslint-disable-next-line no-console
    console.error('[mf-embed] client init failed after all retries', lastError);
  } finally {
    inFlight = false;
  }
}

/** Re-run the init/retry cycle from scratch (wire to a boot-screen retry). */
export function retrySupersetClientInit(): void {
  if (inFlight) return;
  void runInit();
}

// Kick off the handshake at module load.
void runInit();

/**
 * Fix export URL double-prefix. `exportChart` (vendored exploreUtils) builds the
 * export URL via `ensureAppRoot('/api/v1/chart/data')` → `${APP_ROOT}/api/v1/…`,
 * then `SupersetClient.postForm` → `getUrl()` prepends appRoot a SECOND time →
 * 404. Intercept postForm: if the endpoint already starts with APP_ROOT, strip
 * it before the original impl re-adds appRoot exactly once. Bare `/api/...`
 * endpoints are unaffected.
 */
const _origPostForm = SupersetClient.postForm.bind(SupersetClient);
(SupersetClient as unknown as Record<string, unknown>).postForm = function postFormDeduped(
  endpoint: string,
  payload: Record<string, unknown>,
  target?: string,
) {
  const deduped =
    endpoint.startsWith(APP_ROOT + '/') || endpoint === APP_ROOT
      ? endpoint.slice(APP_ROOT.length) || '/'
      : endpoint;
  return _origPostForm(deduped, payload, target);
};
