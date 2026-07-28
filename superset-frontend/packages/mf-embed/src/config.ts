/**
 * Host-injected configuration for @superset-ui/mf-embed.
 *
 * Deliberately dependency-free (no vendored Superset imports) so a host can
 * `setEmbedConfig(...)` in a module that evaluates BEFORE any
 * `@superset-ui/mf-embed/setup/*` side-effect module — several of those seed
 * global state (translator, bootstrap data) that vendored Superset reads at
 * module-load, so ordering matters.
 */
export interface SupersetEmbedConfig {
  /**
   * Application root that `SupersetClient` and vendored URL builders resolve
   * against — typically a host proxy path (e.g. `/api/superset/proxy`).
   */
  appRoot: string;
  /**
   * URL to fetch the Superset bootstrap payload from (feature flags, conf,
   * mapbox key, user). App-root-relative or absolute.
   */
  bootstrapUrl: string;
  /**
   * `SupersetClient.init()` retry tuning — rides out the first-login window
   * where a brand-new user's Superset account is being lazily provisioned.
   */
  csrfRetry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
  };
}

let current: SupersetEmbedConfig | undefined;

/** Set the embed configuration. Must be called before importing any setup module. */
export function setEmbedConfig(config: SupersetEmbedConfig): void {
  current = config;
}

/** Read the embed configuration. Throws if {@link setEmbedConfig} hasn't run. */
export function getEmbedConfig(): SupersetEmbedConfig {
  if (!current) {
    throw new Error(
      '[mf-embed] getEmbedConfig() called before setEmbedConfig(). The host must ' +
        'call setEmbedConfig({ appRoot, bootstrapUrl }) in a module imported ' +
        'BEFORE any @superset-ui/mf-embed/setup/* module.',
    );
  }
  return current;
}
