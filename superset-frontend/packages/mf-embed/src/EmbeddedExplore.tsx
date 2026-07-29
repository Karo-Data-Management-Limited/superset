/**
 * Render Superset's Explore (chart builder) outside its normal Flask-served
 * shell, for embedding into a host application via Module Federation.
 *
 * It reuses the vendored `ExplorePage` (src/pages/Chart) verbatim — that page
 * reads the explore params from the router location, fetches `/api/v1/explore/`,
 * dispatches `hydrateExplore` into the `explore` redux slice, then renders
 * `ExploreViewContainer`. We just seed the location via a `MemoryRouter` so the
 * page bootstraps for the chart/dataset the host asked for.
 *
 * Prereqs the host must satisfy (same as EmbeddedDashboard):
 *  - a Redux `<Provider store={...}>` around it — Superset's `src/views/store`,
 *    whose reducer set already includes the `explore`/`saveModal`/explore-
 *    datasources slices this uses;
 *  - chart plugins registered (their control panels populate the control-panel
 *    registry Explore reads) and bootstrap data seeded.
 *
 * Host-agnostic: imports only vendored Superset + React ecosystem packages.
 */
import { MemoryRouter } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
// @ts-expect-error — vendored .tsx; resolved via webpack alias `src` → vendor/superset-frontend
import { DynamicPluginProvider } from 'src/components/DynamicPlugins';
// @ts-expect-error — vendored .tsx; resolved via webpack alias `src` → vendor/superset-frontend
import ExplorePage from 'src/pages/Chart';

export interface EmbeddedExploreProps {
  /** Edit an existing chart by id. */
  sliceId?: string | number;
  /**
   * Start a new chart from a dataset. Combined into Superset's
   * `datasource=<id>__<type>` param.
   */
  datasourceId?: string | number;
  datasourceType?: 'table' | 'query';
  /** Initial viz type for a new chart (defaults to Superset's DEFAULT_VIZ_TYPE). */
  vizType?: string;
  /** Any extra explore URL params to seed (rarely needed). */
  extraParams?: Record<string, string>;
}

/**
 * Build the `/explore?...` URL that `ExplorePage`'s `getParsedExploreURLParams`
 * reads on mount. `slice_id` loads an existing chart; `datasource` (+ optional
 * `viz_type`) starts a new one.
 */
function buildExploreUrl({
  sliceId,
  datasourceId,
  datasourceType = 'table',
  vizType,
  extraParams,
}: EmbeddedExploreProps): string {
  const params = new URLSearchParams();
  if (sliceId != null && sliceId !== '') {
    params.set('slice_id', String(sliceId));
  }
  if (datasourceId != null && datasourceId !== '') {
    params.set('datasource', `${datasourceId}__${datasourceType}`);
  }
  if (vizType) {
    params.set('viz_type', vizType);
  }
  Object.entries(extraParams ?? {}).forEach(([k, v]) => params.set(k, v));
  const qs = params.toString();
  return `/explore${qs ? `?${qs}` : ''}`;
}

/**
 * <DynamicPluginProvider> is load-bearing (ExploreViewContainer calls
 * usePluginContext). <DndProvider> backs the control-panel drag/drop (adhoc
 * metrics/columns). <MemoryRouter> gives `ExplorePage`/`ExploreViewContainer`
 * their `useHistory()` + seeded location; its in-memory navigation coexists with
 * the host's own router (different libraries) — control-change URL syncs and
 * save-and-go-to-dashboard land in-memory rather than touching the browser URL,
 * which is the intended embedded behaviour.
 */
export function EmbeddedExplore(props: EmbeddedExploreProps) {
  const url = buildExploreUrl(props);
  return (
    <MemoryRouter initialEntries={[url]}>
      <DynamicPluginProvider>
        <DndProvider backend={HTML5Backend}>
          <ExplorePage />
        </DndProvider>
      </DynamicPluginProvider>
    </MemoryRouter>
  );
}

export default EmbeddedExplore;
