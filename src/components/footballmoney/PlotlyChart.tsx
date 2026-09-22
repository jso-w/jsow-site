import { useEffect, useRef, useState } from 'react';

export interface PlotlyChartProps {
  figure: {
    data: Record<string, unknown>[];
    layout: Record<string, unknown>;
    config?: Record<string, unknown>;
  };
  /**
   * The TV-deal marker only explains the Premier League series, so hide it
   * whenever that trace is toggled off via the legend and restore it when the
   * trace comes back.
   */
  tvToggle?: boolean;
  ariaLabel?: string;
}

/**
 * Plotly is imported dynamically, for two reasons: it touches `self` at module
 * scope, which breaks Astro's static render, and it is by far the heaviest
 * thing on the page. Loading it inside the effect means the bundle is only
 * fetched once a chart actually scrolls into view.
 *
 * The bundle is assembled from plotly.js/lib/core plus the four trace types
 * this dashboard uses, rather than the full distribution.
 */
async function loadPlotly() {
  const [core, bar, scatter, treemap, sankey] = await Promise.all([
    // @ts-expect-error -- plotly.js lib entrypoints ship no type declarations
    import('plotly.js/lib/core'),
    // @ts-expect-error -- see above
    import('plotly.js/lib/bar'),
    // @ts-expect-error -- see above
    import('plotly.js/lib/scatter'),
    // @ts-expect-error -- see above
    import('plotly.js/lib/treemap'),
    // @ts-expect-error -- see above
    import('plotly.js/lib/sankey'),
  ]);
  const Plotly = core.default;
  Plotly.register([bar.default, scatter.default, treemap.default, sankey.default]);
  return Plotly;
}

export default function PlotlyChart({ figure, tvToggle = false, ariaLabel }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let disposed = false;
    let plotly: { purge: (el: HTMLElement) => void } | null = null;

    loadPlotly()
      .then((Plotly) => {
        if (disposed) return;
        plotly = Plotly;

        const config = {
          responsive: true,
          displayModeBar: false,
          scrollZoom: false,
          doubleClick: false,
          ...figure.config,
        };

        return Plotly.newPlot(el, figure.data, figure.layout, config).then(() => {
          if (disposed || !tvToggle) return;

          const gd = el as HTMLDivElement & {
            data?: { visible?: boolean | string }[];
            layout?: { annotations?: { name?: string }[]; shapes?: { name?: string }[] };
            on?: (ev: string, fn: () => void) => void;
          };

          const sync = () => {
            const first = gd.data?.[0];
            const show = !first || first.visible === true || first.visible === undefined;
            const update: Record<string, boolean> = {};
            gd.layout?.annotations?.forEach((a, i) => {
              if (a.name === 'tv_anno') update[`annotations[${i}].visible`] = show;
            });
            gd.layout?.shapes?.forEach((s, i) => {
              if (s.name === 'tv_vline') update[`shapes[${i}].visible`] = show;
            });
            if (Object.keys(update).length) Plotly.relayout(gd, update);
          };

          gd.on?.('plotly_restyle', sync);
          sync();
        });
      })
      .catch((err) => {
        console.error('[footballmoney] chart failed to render', err);
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      plotly?.purge(el);
    };
  }, [figure, tvToggle]);

  return (
    <>
      <div ref={ref} role="img" aria-label={ariaLabel} />
      {failed && <p className="chart-fallback">This chart could not be loaded.</p>}
    </>
  );
}
