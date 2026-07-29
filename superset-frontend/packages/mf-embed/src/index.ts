/**
 * @superset-ui/mf-embed — embed Superset into a host application via Module
 * Federation (the module-federation counterpart to the iframe-based
 * @superset-ui/embedded-sdk).
 *
 * Host-agnostic: the host injects all host-specific values (appRoot, bootstrap
 * URL, theme, locale, router, boot fallback) as config/props; this package
 * imports only vendored Superset + React.
 *
 * NOTE: the `setup/*` modules are intentionally NOT re-exported here — they run
 * order-sensitive side effects at import (translator/bootstrap seeding that
 * vendored Superset reads at module-load), so the host imports them explicitly
 * as ordered side-effect subpath imports AFTER calling `setEmbedConfig`:
 *
 *   import './embed-config';                          // calls setEmbedConfig(...)
 *   import '@superset-ui/mf-embed/setup/bootstrapData';
 *   import '@superset-ui/mf-embed/setup/translator';
 *   import '@superset-ui/mf-embed/setup/formatters';
 *   import '@superset-ui/mf-embed/setup/colors';
 *   import '@superset-ui/mf-embed/setup/client';
 *   import { pluginsReady } from '@superset-ui/mf-embed/setup/plugins';
 */
export {
  EmbeddedDashboard,
  HOST_LOADED_UI_CONFIG,
  type EmbeddedDashboardProps,
  type EmbedUiConfig,
} from './EmbeddedDashboard';

// EmbeddedExplore is intentionally NOT re-exported here: the vendored Explore
// tree pulls extra deps (e.g. geolib) that view-only hosts (superset-dashboards)
// don't otherwise need. Import it via the subpath so only authoring hosts
// (superset-builder) compile it:
//   import { EmbeddedExplore } from '@superset-ui/mf-embed/EmbeddedExplore';

export {
  setEmbedConfig,
  getEmbedConfig,
  type SupersetEmbedConfig,
} from './config';
