/**
 * Register Superset's categorical / sequential colour scheme catalogue with the
 * @superset-ui/core scheme registries. Without this, a chart's `color_scheme`
 * key resolves to undefined and echarts falls back to a generic palette.
 *
 * Mirrors `superset-frontend/src/preamble.ts`. Side-effect on import.
 */
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import setupColors from 'src/setup/setupColors';

setupColors();
