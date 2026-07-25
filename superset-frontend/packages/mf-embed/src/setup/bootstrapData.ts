/**
 * Seed the `<div id="app" data-bootstrap='...'>` element that vendored Superset
 * reads via `getBootstrapData()` (superset-frontend/src/utils/getBootstrapData.ts).
 *
 * Two phases:
 *   PHASE 1 (sync, at module-load): seed a minimal fallback so module-load
 *     consumers have something to read — `applicationRoot()` (pinned to the
 *     host appRoot so vendored URL builders route through it) and the
 *     `initFeatureFlags` call in hostNamesConfig (which only runs if
 *     `document.getElementById('app')` exists).
 *   PHASE 2 (async): fetch the real bootstrap from the host's `bootstrapUrl`,
 *     merge our overrides, and replace the attribute. On-demand consumers
 *     (chart render time) pick up the richer data (mapboxApiKey, conf, flags).
 *
 * Host-agnostic: `appRoot` + `bootstrapUrl` come from {@link getEmbedConfig}.
 * MUST evaluate before any vendored module that reads bootstrap data at load,
 * so the host imports it early (after `setEmbedConfig`).
 */
import { getEmbedConfig } from '../config';

const { appRoot: APP_ROOT, bootstrapUrl: BOOTSTRAP_URL } = getEmbedConfig();

interface SupersetBootstrap {
  common?: {
    application_root?: string;
    feature_flags?: Record<string, boolean>;
    [key: string]: unknown;
  };
  mapboxApiKey?: string;
  [key: string]: unknown;
}

/**
 * The host shell sets the active language on `<html lang="...">`. Read it as
 * the source of truth for Superset's locale, falling back to 'en'.
 */
function getHostLocale(): string {
  if (typeof document === 'undefined') return 'en';
  return document.documentElement.getAttribute('lang') || 'en';
}

const FALLBACK_BOOTSTRAP: SupersetBootstrap = {
  common: {
    application_root: APP_ROOT,
    static_assets_prefix: '',
    feature_flags: {},
    conf: {},
    locale: getHostLocale(),
  },
};

function writeBootstrapElement(bootstrap: SupersetBootstrap): void {
  if (typeof document === 'undefined') return;
  let appEl = document.getElementById('app');
  if (!appEl) {
    appEl = document.createElement('div');
    appEl.id = 'app';
    appEl.style.display = 'none';
    (document.body ?? document.documentElement).prepend(appEl);
  }
  appEl.setAttribute('data-bootstrap', JSON.stringify(bootstrap));
}

function writeFeatureFlagsGlobal(bootstrap: SupersetBootstrap): void {
  if (typeof window === 'undefined') return;
  (window as { featureFlags: Record<string, boolean> }).featureFlags =
    bootstrap.common?.feature_flags ?? {};
}

// ─── PHASE 1 ────────────────────────────────────────────────────────────────
writeBootstrapElement(FALLBACK_BOOTSTRAP);
writeFeatureFlagsGlobal(FALLBACK_BOOTSTRAP);

// ─── PHASE 2 ────────────────────────────────────────────────────────────────
export const bootstrapDataReady: Promise<void> = (async () => {
  try {
    const res = await fetch(BOOTSTRAP_URL, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`[mf-embed] ${BOOTSTRAP_URL} returned ${res.status}`);
    }
    const fetched = (await res.json()) as SupersetBootstrap;
    // The blueprint exposes the Mapbox token at top-level `mapboxApiKey`, but
    // the vendored deck.gl plugin reads it from `common.conf.MAPBOX_API_KEY`
    // via getMapboxApiKey(). Bridge the two paths during merge.
    const fetchedConf = (fetched.common?.conf ?? {}) as Record<string, unknown>;
    const merged: SupersetBootstrap = {
      ...fetched,
      common: {
        ...(fetched.common ?? {}),
        // Always pin our own application_root regardless of what the blueprint
        // returns, so vendored URL builders keep routing through the host.
        application_root: APP_ROOT,
        locale: getHostLocale(),
        conf: {
          ...fetchedConf,
          MAPBOX_API_KEY:
            fetchedConf.MAPBOX_API_KEY ?? fetched.mapboxApiKey ?? '',
        },
      },
    };
    writeBootstrapElement(merged);
    writeFeatureFlagsGlobal(merged);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mf-embed] bootstrap fetch failed; staying on fallback', err);
  }
})();

/**
 * Update the seeded bootstrap's `common.locale` in place — call on a host
 * language change so vendored `getBootstrapData()` consumers track `<html lang>`.
 */
export function setBootstrapLocale(locale: string): void {
  if (typeof document === 'undefined' || !locale) return;
  const appEl = document.getElementById('app');
  const raw = appEl?.getAttribute('data-bootstrap');
  if (!appEl || !raw) return;
  try {
    const bootstrap = JSON.parse(raw) as SupersetBootstrap;
    if (bootstrap.common?.locale === locale) return;
    bootstrap.common = { ...(bootstrap.common ?? {}), locale };
    appEl.setAttribute('data-bootstrap', JSON.stringify(bootstrap));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[mf-embed] failed to update locale', err);
  }
}
