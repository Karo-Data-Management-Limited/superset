/**
 * Lazy chart-plugin registration.
 *
 * Upstream `MainPreset.js` registers ~50 chart plugins via static imports,
 * forcing every plugin's controlPanel/transformProps/buildQuery onto the boot
 * path — webpack collapses that into one ~32 MB blocking chunk. Here we replace
 * it with per-package dynamic imports (each `import('@superset-ui/plugin-chart-…')`
 * becomes its own chunk, fired in parallel). Consumers await `pluginsReady`
 * before rendering so `chartMetadataRegistry.get(vizType)` always resolves.
 *
 * Pure Superset — no host config. Side-effect on import: kicks off registration.
 */
import { isFeatureEnabled, FeatureFlag, VizType } from '@superset-ui/core';
// @ts-expect-error — vendored .ts file has no published types.
import { FilterPlugins, ChartCustomizationPlugins } from 'src/constants';

async function registerEcharts() {
  const m = await import(
    /* webpackChunkName: "viz-echarts" */ '@superset-ui/plugin-chart-echarts'
  );
  new m.BigNumberChartPlugin().configure({ key: VizType.BigNumber }).register();
  new m.BigNumberTotalChartPlugin().configure({ key: VizType.BigNumberTotal }).register();
  new m.EchartsBoxPlotChartPlugin().configure({ key: VizType.BoxPlot }).register();
  new m.EchartsFunnelChartPlugin().configure({ key: VizType.Funnel }).register();
  new m.EchartsSankeyChartPlugin().configure({ key: VizType.Sankey }).register();
  new m.EchartsTreemapChartPlugin().configure({ key: VizType.Treemap }).register();
  new m.EchartsGanttChartPlugin().configure({ key: VizType.Gantt }).register();
  new m.EchartsGaugeChartPlugin().configure({ key: VizType.Gauge }).register();
  new m.EchartsGraphChartPlugin().configure({ key: VizType.Graph }).register();
  new m.EchartsRadarChartPlugin().configure({ key: VizType.Radar }).register();
  new m.EchartsMixedTimeseriesChartPlugin().configure({ key: VizType.MixedTimeseries }).register();
  new m.EchartsPieChartPlugin().configure({ key: VizType.Pie }).register();
  new m.EchartsAreaChartPlugin().configure({ key: VizType.Area }).register();
  new m.EchartsTimeseriesChartPlugin().configure({ key: VizType.Timeseries }).register();
  new m.EchartsTimeseriesBarChartPlugin().configure({ key: VizType.Bar }).register();
  new m.EchartsTimeseriesLineChartPlugin().configure({ key: VizType.Line }).register();
  new m.EchartsTimeseriesSmoothLineChartPlugin().configure({ key: VizType.SmoothLine }).register();
  new m.EchartsTimeseriesScatterChartPlugin().configure({ key: VizType.Scatter }).register();
  new m.EchartsTimeseriesStepChartPlugin().configure({ key: VizType.Step }).register();
  new m.EchartsWaterfallChartPlugin().configure({ key: VizType.Waterfall }).register();
  new m.EchartsHeatmapChartPlugin().configure({ key: VizType.Heatmap }).register();
  new m.EchartsHistogramChartPlugin().configure({ key: VizType.Histogram }).register();
  new m.EchartsTreeChartPlugin().configure({ key: VizType.Tree }).register();
  new m.EchartsSunburstChartPlugin().configure({ key: VizType.Sunburst }).register();
  new m.EchartsBubbleChartPlugin().configure({ key: VizType.Bubble }).register();

  if (isFeatureEnabled(FeatureFlag.ChartPluginsExperimental)) {
    new m.BigNumberPeriodOverPeriodChartPlugin()
      .configure({ key: VizType.BigNumberPeriodOverPeriod })
      .register();
  }
}

async function registerNvd3() {
  const m = await import(
    /* webpackChunkName: "viz-nvd3" */ '@superset-ui/legacy-preset-chart-nvd3'
  );
  new m.BubbleChartPlugin().configure({ key: VizType.LegacyBubble }).register();
  new m.BulletChartPlugin().configure({ key: VizType.Bullet }).register();
  new m.CompareChartPlugin().configure({ key: VizType.Compare }).register();
  new m.TimePivotChartPlugin().configure({ key: VizType.TimePivot }).register();
}

async function registerDeckGl() {
  const m = await import(
    /* webpackChunkName: "viz-deckgl" */ '@superset-ui/legacy-preset-chart-deckgl'
  );
  new m.DeckGLChartPreset().register();
}

async function registerLightLegacyCharts() {
  const [calendar, chord, horizon, mapBox, pairedTTest, parallelCoords, partition, rose] =
    await Promise.all([
      import(/* webpackChunkName: "viz-calendar" */ '@superset-ui/legacy-plugin-chart-calendar'),
      import(/* webpackChunkName: "viz-chord" */ '@superset-ui/legacy-plugin-chart-chord'),
      import(/* webpackChunkName: "viz-horizon" */ '@superset-ui/legacy-plugin-chart-horizon'),
      import(/* webpackChunkName: "viz-mapbox" */ '@superset-ui/legacy-plugin-chart-map-box'),
      import(/* webpackChunkName: "viz-paired-t-test" */ '@superset-ui/legacy-plugin-chart-paired-t-test'),
      import(/* webpackChunkName: "viz-parallel-coords" */ '@superset-ui/legacy-plugin-chart-parallel-coordinates'),
      import(/* webpackChunkName: "viz-partition" */ '@superset-ui/legacy-plugin-chart-partition'),
      import(/* webpackChunkName: "viz-rose" */ '@superset-ui/legacy-plugin-chart-rose'),
    ]);

  new calendar.default().configure({ key: VizType.Calendar }).register();
  new chord.default().configure({ key: VizType.Chord }).register();
  new horizon.default().configure({ key: VizType.Horizon }).register();
  new mapBox.default().configure({ key: VizType.MapBox }).register();
  new pairedTTest.default().configure({ key: VizType.PairedTTest }).register();
  new parallelCoords.default().configure({ key: VizType.ParallelCoordinates }).register();
  new partition.default().configure({ key: VizType.Partition }).register();
  new rose.default().configure({ key: VizType.Rose }).register();
}

// Country-map and world-map chunks dwarf everything else (country-map ~31 MB of
// bundled .geojson; world-map ~7 MB of datamaps + topojson). Awaiting them at
// boot would re-create the blocking-load problem this file exists to solve, so
// they register asynchronously after the app mounts and the browser idles.
async function registerHeavyMaps() {
  const [countryMap, worldMap] = await Promise.all([
    import(/* webpackChunkName: "viz-country-map" */ '@superset-ui/legacy-plugin-chart-country-map'),
    import(/* webpackChunkName: "viz-world-map" */ '@superset-ui/legacy-plugin-chart-world-map'),
  ]);
  new countryMap.default().configure({ key: VizType.CountryMap }).register();
  new worldMap.default().configure({ key: VizType.WorldMap }).register();
}

async function registerStandardCharts() {
  const [table, wordCloud, pivotTable, handlebars, timeTable, cartodiagram] = await Promise.all([
    import(/* webpackChunkName: "viz-table" */ '@superset-ui/plugin-chart-table'),
    import(/* webpackChunkName: "viz-word-cloud" */ '@superset-ui/plugin-chart-word-cloud'),
    import(/* webpackChunkName: "viz-pivot-table" */ '@superset-ui/plugin-chart-pivot-table'),
    import(/* webpackChunkName: "viz-handlebars" */ '@superset-ui/plugin-chart-handlebars'),
    // TimeTable lives inside the vendored tree, resolved via the `src` alias.
    // @ts-expect-error — vendored .tsx with no published types.
    import(/* webpackChunkName: "viz-time-table" */ 'src/visualizations/TimeTable'),
    import(/* webpackChunkName: "viz-cartodiagram" */ '@superset-ui/plugin-chart-cartodiagram'),
  ]);

  new table.default().configure({ key: VizType.Table }).register();
  new wordCloud.WordCloudChartPlugin().configure({ key: VizType.WordCloud }).register();
  new pivotTable.PivotTableChartPlugin().configure({ key: VizType.PivotTable }).register();
  new handlebars.HandlebarsChartPlugin().configure({ key: VizType.Handlebars }).register();
  new timeTable.default().configure({ key: VizType.TimeTable }).register();
  new cartodiagram.CartodiagramPlugin({
    defaultLayers: [
      {
        type: 'WMS',
        version: '1.3.0',
        url: 'https://ows.terrestris.de/osm-gray/service',
        layersParam: 'OSM-WMS',
        title: 'OpenStreetMap',
        attribution:
          '© Map data from <a href="openstreetmap.org/copyright">OpenStreetMap</a>. Service provided by <a href="https://www.terrestris.de">terrestris GmbH & Co. KG</a>',
      },
    ],
  })
    .configure({ key: VizType.Cartodiagram })
    .register();

  if (isFeatureEnabled(FeatureFlag.AgGridTableEnabled)) {
    const agGrid = await import(
      /* webpackChunkName: "viz-ag-grid" */ '@superset-ui/plugin-chart-ag-grid-table'
    );
    new agGrid.default().configure({ key: VizType.TableAgGrid }).register();
  }
}

async function registerFiltersAndCustomizations() {
  // @ts-expect-error — vendored barrels under `src/` have no published types.
  const filters = await import(/* webpackChunkName: "viz-filters" */ 'src/filters/components');
  // @ts-expect-error — vendored barrels under `src/` have no published types.
  const customizations = await import(
    /* webpackChunkName: "viz-customizations" */ 'src/chartCustomizations/components'
  );

  new filters.SelectFilterPlugin().configure({ key: FilterPlugins.Select }).register();
  new filters.RangeFilterPlugin().configure({ key: FilterPlugins.Range }).register();
  new filters.TimeFilterPlugin().configure({ key: FilterPlugins.Time }).register();
  new filters.TimeColumnFilterPlugin().configure({ key: FilterPlugins.TimeColumn }).register();
  new filters.TimeGrainFilterPlugin().configure({ key: FilterPlugins.TimeGrain }).register();

  new customizations.ChartCustomizationTimeGrainPlugin()
    .configure({ key: ChartCustomizationPlugins.TimeGrain })
    .register();
  new customizations.ChartCustomizationTimeColumnPlugin()
    .configure({ key: ChartCustomizationPlugins.TimeColumn })
    .register();
  new customizations.ChartCustomizationDynamicGroupBy()
    .configure({ key: ChartCustomizationPlugins.DynamicGroupBy })
    .register();
  new customizations.DeckglLayerVisibilityCustomizationPlugin()
    .configure({ key: ChartCustomizationPlugins.DeckglLayerVisibility })
    .register();
}

function scheduleIdle(cb: () => void) {
  if (typeof window === 'undefined') {
    cb();
    return;
  }
  const ric = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof ric === 'function') ric(cb, { timeout: 5000 });
  else setTimeout(cb, 1000);
}

export const pluginsReady: Promise<void> = Promise.all([
  registerEcharts(),
  registerNvd3(),
  registerDeckGl(),
  registerLightLegacyCharts(),
  registerStandardCharts(),
  registerFiltersAndCustomizations(),
]).then(() => {
  // Heavy maps download after the app mounts and the browser idles, so they
  // don't compete with the essential plugin chunks for boot-path bandwidth.
  scheduleIdle(() => {
    registerHeavyMaps().catch(err => {
      // eslint-disable-next-line no-console
      console.error('[mf-embed] heavy map registration failed', err);
    });
  });
});
