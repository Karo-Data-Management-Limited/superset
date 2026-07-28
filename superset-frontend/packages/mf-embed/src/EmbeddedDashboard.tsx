/**
 * Render a Superset dashboard outside Superset's normal Flask-served shell —
 * for embedding into a host application via Module Federation.
 *
 * This is the module-federation counterpart to the iframe-based
 * `@superset-ui/embedded-sdk`: instead of an iframe + guest token, the host
 * mounts Superset's own vendored `DashboardPage` container directly and
 * supplies the surrounding providers itself.
 *
 * Host-agnostic by design: it imports only vendored Superset (`src/...`) and
 * React ecosystem packages, never any host-specific code. The host controls
 * chrome via the `uiConfig` prop and drives the active tab via `activeTabId`.
 *
 * Prereqs the host must satisfy before mounting this:
 *  - a Redux `<Provider store={...}>` around it (Superset's `src/views/store`);
 *  - the chart plugins registered and bootstrap data seeded (see the `setup`
 *    helpers / `SupersetEmbedProvider`).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MemoryRouter } from 'react-router-dom';
// @ts-expect-error — vendored .tsx; resolved via webpack alias `src` → vendor/superset-frontend
import DashboardPage from 'src/dashboard/containers/DashboardPage';
// @ts-expect-error — vendored .tsx; resolved via webpack alias `src` → vendor/superset-frontend
import { UiConfigContext } from 'src/components/UiConfigContext';
// @ts-expect-error — vendored .tsx; resolved via webpack alias `src` → vendor/superset-frontend
import { DynamicPluginProvider } from 'src/components/DynamicPlugins';
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import { setActiveTab, setDirectPathToChild } from 'src/dashboard/actions/dashboardState';
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import { useDashboard } from 'src/hooks/apiResources';
// @ts-expect-error — vendored .ts; resolved via webpack alias `src` → vendor/superset-frontend
import type { RootState } from 'src/views/store';

export interface EmbedUiConfig {
  hideTitle?: boolean;
  hideTab?: boolean;
  hideNav?: boolean;
  hideChartControls?: boolean;
  emitDataMasks?: boolean;
  showRowLimitWarning?: boolean;
  [key: string]: unknown;
}

/**
 * Default UI config for a host-embedded dashboard render: suppress the chrome a
 * host typically renders itself (title bar + tab strip + nav), keep chart
 * controls. A host wanting edit-mode chrome (the builder) passes its own config.
 */
export const HOST_LOADED_UI_CONFIG: EmbedUiConfig = {
  hideTitle: true,
  hideTab: true,
  hideNav: true,
  hideChartControls: false,
  emitDataMasks: false,
  showRowLimitWarning: false,
};

interface ActiveTabSyncProps {
  dashboardId: string;
  activeTabId?: string;
}

/**
 * Translates a host's `activeTabId` into Superset's internal redux state.
 * The vendored `DashboardBuilder` renders the active tab pane based on
 * `dashboardState.directPathToChild`; the vendored `useIsFilterInScope`
 * cross-references the active tab against each native filter's `chartsInScope`
 * to decide whether the filter is in or out of scope — `setActiveTab` populates
 * the input it reads. Both dispatches must fire after `dashboardInfo` is
 * hydrated, otherwise the layout selectors return stale shapes and the
 * filter-scope hook reports every filter as out-of-scope (filter chips show a
 * strikethrough).
 *
 * Lives as a sibling component rather than inside DashboardPage so the upstream
 * page stays untouched and tracking upstream commits is mechanical.
 */
function ActiveTabSync({ dashboardId, activeTabId }: ActiveTabSyncProps) {
  const dispatch = useDispatch();
  const prevActiveTabIdRef = useRef<string | undefined>(undefined);
  const { result: dashboard } = useDashboard(dashboardId);

  const hasInfo = useSelector<RootState, boolean>(
    s => Boolean(s.dashboardInfo) && Object.keys(s.dashboardInfo).length > 0,
  );

  const directPathToActiveTab = useMemo<string[] | null>(() => {
    if (!activeTabId || !dashboard?.position_data) return null;
    const layout = dashboard.position_data as Record<
      string,
      { type?: string; children?: string[]; parents?: string[]; id?: string }
    >;
    const tabsEntry = Object.values(layout).find(
      item => item?.type === 'TABS' && item.children?.includes(activeTabId),
    );
    if (!tabsEntry?.id) return null;
    return [...(tabsEntry.parents ?? []), tabsEntry.id, activeTabId];
  }, [activeTabId, dashboard?.position_data]);

  useEffect(() => {
    if (!hasInfo || !activeTabId || !directPathToActiveTab) return;
    dispatch(setDirectPathToChild(directPathToActiveTab));
    dispatch(setActiveTab(activeTabId, prevActiveTabIdRef.current));
    prevActiveTabIdRef.current = activeTabId;
  }, [dispatch, hasInfo, activeTabId, directPathToActiveTab]);

  return null;
}

export interface EmbeddedDashboardProps {
  /** Dashboard id or slug to render. */
  idOrSlug: string;
  /**
   * Active tab id (from the host's URL state). When it changes, we dispatch
   * `setDirectPathToChild` + `setActiveTab` so the dashboard reflects it.
   */
  activeTabId?: string;
  /** UI chrome config. Defaults to {@link HOST_LOADED_UI_CONFIG}. */
  uiConfig?: EmbedUiConfig;
}

/**
 * Mirror upstream's EmbeddedContextProviders provider stack for a dashboard
 * render, minus the bits a host already supplies (theme, redux store, query
 * params).
 *
 * <DynamicPluginProvider> is load-bearing: vendored Dashboard.tsx reads
 * PluginContext.loading and renders <Loading /> instead of children when it's
 * truthy; the DEFAULT context value is { loading: true } — without this the
 * dashboard body never appears. The reducer initialiser sets loading=false
 * unless the DynamicPlugins feature flag is on, so it lands on false immediately.
 *
 * <DndProvider> is required because DashboardWrapper / DashboardGrid /
 * DragDroppable / SliceAdder use react-dnd hooks. <MemoryRouter> (react-router
 * v5) provides a working HistoryContext for vendored components calling
 * `useHistory()` (FilterBar publishDataMask, DashboardPage's history), coexisting
 * with the host's own router (different libraries, different contexts).
 */
export function EmbeddedDashboard({
  idOrSlug,
  activeTabId,
  uiConfig = HOST_LOADED_UI_CONFIG,
}: EmbeddedDashboardProps) {
  return (
    <MemoryRouter>
      <UiConfigContext.Provider value={uiConfig}>
        <DynamicPluginProvider>
          <DndProvider backend={HTML5Backend}>
            <ActiveTabSync dashboardId={idOrSlug} activeTabId={activeTabId} />
            <DashboardPage idOrSlug={idOrSlug} />
          </DndProvider>
        </DynamicPluginProvider>
      </UiConfigContext.Provider>
    </MemoryRouter>
  );
}

export default EmbeddedDashboard;
