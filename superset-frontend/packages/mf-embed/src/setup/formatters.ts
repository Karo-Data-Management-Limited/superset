/**
 * Register Superset's smart-date / number formatters with the @superset-ui/core
 * registries. Without this, `getTimeFormatter('smart_date_verbose')` (the
 * default echarts timeseries tooltip format) falls through and the tooltip
 * header shows the literal string instead of a formatted date.
 *
 * Mirrors `superset-frontend/src/preamble.ts`. Side-effect on import.
 */
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import setupFormatters from 'src/setup/setupFormatters';

setupFormatters({}, {});
