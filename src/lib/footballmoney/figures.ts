/**
 * The nine Plotly figures, built at build time and handed to the client island
 * as plain JSON. Nothing here touches the DOM.
 */
import {
  DEFAULT_TOP_N,
  LCOLORS,
  LNAMES,
  SEASONS,
  TOP5,
  TOP_N_STEPS,
  asset,
  hexToRgba,
  seasonLabel,
  surname,
  type League,
  CREST_BY_CLUB,
} from './config';
import {
  PAIRS,
  clubsBySeason,
  correlation,
  flowM,
  mvBn,
  netCumulativeM,
  recordTransfers,
  top4Share,
  topNCounts,
} from './data';

export interface Figure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
  config?: Record<string, unknown>;
}

const FONT = 'Barlow, Helvetica Neue, sans-serif';
const DISPLAY = 'Oswald, Arial Narrow, sans-serif';

/** The shared dark-on-pitch chart theme. */
function themed(layout: Record<string, unknown>, height = 620): Record<string, unknown> {
  const axis = {
    gridcolor: 'rgba(255,255,255,0.07)',
    tickfont: { color: 'rgba(255,255,255,0.72)', size: 15 },
    title: { font: { color: 'rgba(255,255,255,0.62)', size: 16 } },
  };
  return {
    height,
    dragmode: false,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0.22)',
    font: { color: 'rgba(255,255,255,0.82)', family: FONT, size: 15 },
    legend: {
      bgcolor: 'rgba(0,0,0,0)',
      borderwidth: 0,
      font: { color: 'rgba(255,255,255,0.78)', size: 14 },
    },
    hoverlabel: {
      bgcolor: 'rgba(10,10,10,0.88)',
      bordercolor: 'rgba(255,255,255,0.18)',
      font: { color: '#fff', size: 14 },
    },
    margin: { l: 68, r: 20, t: 36, b: 58 },
    ...layout,
    xaxis: { ...axis, linecolor: 'rgba(255,255,255,0.25)', ...(layout.xaxis as object) },
    yaxis: { ...axis, linecolor: 'rgba(255,255,255,0)', ...(layout.yaxis as object) },
  };
}

const hLegend = { orientation: 'h', yanchor: 'bottom', y: 1.01, xanchor: 'left', x: 0 };

const DROPDOWN = {
  type: 'dropdown',
  direction: 'down',
  active: 0,
  showactive: true,
  bgcolor: 'rgba(10,28,12,0.96)',
  bordercolor: 'rgba(255,255,255,0.28)',
  borderwidth: 1,
  pad: { l: 6, r: 6, t: 4, b: 4 },
};

// ══════════════════════════════════════════════════════════════════════════
// I — squad market value per league per season (grouped bar)
// ══════════════════════════════════════════════════════════════════════════
export function figSquadValues(): Figure {
  return {
    data: TOP5.map((lg) => ({
      type: 'bar',
      name: LNAMES[lg],
      x: SEASONS,
      y: SEASONS.map((s) => Math.round(mvBn[lg][s]! * 100) / 100),
      marker: { color: LCOLORS[lg], line: { width: 0.5, color: 'rgba(0,0,0,0.30)' } },
      hovertemplate: `<b>%{x}</b>: €%{y:.2f}bn<extra>${LNAMES[lg]}</extra>`,
    })),
    layout: themed(
      {
        barmode: 'group',
        bargap: 0.24,
        bargroupgap: 0.04,
        xaxis: { title: { text: 'Season' } },
        yaxis: { title: { text: 'Squad market value (€bn)' } },
        legend: {
          orientation: 'h',
          yanchor: 'bottom',
          y: 1.02,
          xanchor: 'left',
          x: 0,
          font: { size: 14 },
        },
        // Generous top margin so the legend and the hint both sit inside the
        // chart box; the .spread container clips overflow.
        margin: { l: 68, r: 20, t: 128, b: 58 },
        shapes: [
          {
            name: 'tv_vline',
            type: 'line',
            xref: 'x',
            yref: 'paper',
            x0: 2015.5,
            x1: 2015.5,
            y0: 0,
            y1: 1,
            line: { color: 'rgba(212,168,48,0.55)', width: 1.5, dash: 'dot' },
          },
        ],
        annotations: [
          {
            name: 'tv_anno',
            x: 2015.5,
            y: 0.97,
            xref: 'x',
            yref: 'paper',
            text: 'TV deal 2016/17',
            showarrow: false,
            xanchor: 'left',
            yanchor: 'top',
            font: { color: 'rgba(212,168,48,0.9)', size: 13 },
          },
          {
            x: 1,
            y: 1.1,
            xref: 'paper',
            yref: 'paper',
            text: 'Tip: click a league in the legend to toggle it',
            showarrow: false,
            xanchor: 'right',
            yanchor: 'bottom',
            font: { color: 'rgba(255,255,255,0.62)', size: 13 },
          },
        ],
      },
      650,
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// II — squad value by league and club (treemap, one trace per season)
// ══════════════════════════════════════════════════════════════════════════
export function figTreemap(): Figure {
  const seasonsDesc = [...SEASONS].sort((a, b) => b - a);

  const data = seasonsDesc.map((year, i) => {
    const ids = [`Root_${year}`];
    const labels = ['Total'];
    const parents = [''];
    const values: number[] = [0];
    // light band so the dark 'Total' label stays legible
    const colors = ['rgba(232,232,232,0.95)'];
    const text = [''];

    for (const lg of TOP5) {
      const rows = clubsBySeason.get(year)?.get(lg) ?? [];
      const leagueId = `${lg}_${year}`;
      const leagueTotalM = Math.round(
        rows.reduce((a, r) => a + (r.total_market_value ?? 0), 0) / 1e6,
      );
      ids.push(leagueId);
      labels.push(LNAMES[lg]);
      parents.push(`Root_${year}`);
      values.push(0); // branchvalues 'remainder': children carry all the area
      colors.push(LCOLORS[lg]);
      text.push(`€${(leagueTotalM / 1000).toFixed(1)}B`);

      for (const r of rows) {
        const mvM = Math.round((r.total_market_value ?? 0) / 1e6);
        ids.push(`${r.club_id}_${year}`);
        labels.push(r.name);
        parents.push(leagueId);
        values.push(mvM);
        colors.push(hexToRgba(LCOLORS[lg], 0.72));
        text.push(`€${mvM}M`);
      }
    }

    return {
      type: 'treemap',
      ids,
      labels,
      parents,
      values,
      text,
      textinfo: 'label+text',
      textfont: { size: 17, color: '#111111', family: 'Oswald' },
      marker: { colors, line: { width: 1.5, color: 'rgba(255,255,255,0.7)' } },
      hovertemplate: '<b>%{label}</b><br>%{text}<extra></extra>',
      branchvalues: 'remainder',
      root: { color: 'rgba(20,20,20,0.85)' },
      pathbar: {
        visible: true,
        thickness: 36,
        textfont: { size: 16, color: '#ffffff', family: 'Oswald' },
      },
      // Stop navigation at league level; clicking a club zooms its league.
      maxdepth: 2,
      visible: i === 0,
    };
  });

  return {
    data,
    layout: {
      height: 680,
      dragmode: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      margin: { l: 10, r: 10, t: 60, b: 10 },
      hoverlabel: {
        bgcolor: 'rgba(10,10,10,0.88)',
        bordercolor: 'rgba(255,255,255,0.18)',
        font: { color: '#fff', size: 14 },
      },
      updatemenus: [
        {
          ...DROPDOWN,
          x: 0,
          xanchor: 'left',
          y: 1.05,
          yanchor: 'bottom',
          font: { color: 'rgba(255,255,255,0.92)', size: 14 },
          buttons: seasonsDesc.map((year, i) => ({
            label: String(year),
            method: 'update',
            args: [{ visible: seasonsDesc.map((_, j) => j === i) }],
          })),
        },
      ],
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// III — transfer flows between the five leagues (sankey)
// ══════════════════════════════════════════════════════════════════════════
export function figSankey(): Figure {
  const left = Object.fromEntries(TOP5.map((lg, i) => [lg, i])) as Record<League, number>;
  const right = Object.fromEntries(TOP5.map((lg, i) => [lg, 5 + i])) as Record<League, number>;

  const view = (season?: number) => {
    const values: number[] = [];
    const labels: string[] = [];
    for (const [s, t] of PAIRS) {
      const v = flowM(s, t, season);
      values.push(v);
      labels.push(
        v > 0
          ? `${LNAMES[s]} → ${LNAMES[t]}: €${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}m`
          : `${LNAMES[s]} → ${LNAMES[t]}: no transfers`,
      );
    }
    return { values, labels };
  };

  const views: { name: string; season?: number }[] = [
    { name: 'All seasons · 2010–24' },
    ...SEASONS.map((s) => ({ name: seasonLabel(s), season: s })),
  ];
  const built = views.map((v) => view(v.season));

  return {
    data: [
      {
        type: 'sankey',
        arrangement: 'snap',
        node: {
          pad: 26,
          thickness: 24,
          line: { color: 'rgba(255,255,255,0.25)', width: 0.8 },
          label: [...TOP5.map((lg) => LNAMES[lg]), ...TOP5.map((lg) => LNAMES[lg])],
          color: [...TOP5.map((lg) => LCOLORS[lg]), ...TOP5.map((lg) => LCOLORS[lg])],
          // x/y bias sellers to the left column, buyers to the right
          x: [...Array(5).fill(0.02), ...Array(5).fill(0.98)],
          y: [0.1, 0.3, 0.5, 0.7, 0.9, 0.1, 0.3, 0.5, 0.7, 0.9],
          hovertemplate: '%{label}<extra></extra>',
        },
        link: {
          source: PAIRS.map(([s]) => left[s]),
          target: PAIRS.map(([, t]) => right[t]),
          value: built[0]!.values,
          label: built[0]!.labels,
          // colour each ribbon by its selling league; brighten flows into the PL
          color: PAIRS.map(([s, t]) => hexToRgba(LCOLORS[s], t === 'GB1' ? 0.55 : 0.34)),
          hovertemplate: '%{label}<extra></extra>',
        },
      },
    ],
    layout: {
      height: 680,
      dragmode: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: 'rgba(255,255,255,0.9)', family: FONT, size: 15 },
      margin: { l: 10, r: 10, t: 116, b: 24 },
      hoverlabel: {
        bgcolor: 'rgba(10,10,10,0.9)',
        bordercolor: 'rgba(255,255,255,0.18)',
        font: { color: '#fff', size: 14 },
      },
      annotations: [
        {
          x: 0,
          y: 1.05,
          xref: 'paper',
          yref: 'paper',
          xanchor: 'left',
          text: 'SELLING LEAGUE  →',
          showarrow: false,
          font: { color: 'rgba(255,255,255,0.65)', size: 14 },
        },
        {
          x: 1,
          y: 1.05,
          xref: 'paper',
          yref: 'paper',
          xanchor: 'right',
          text: '→  BUYING LEAGUE',
          showarrow: false,
          font: { color: 'rgba(255,255,255,0.65)', size: 14 },
        },
      ],
      updatemenus: [
        {
          ...DROPDOWN,
          x: 0,
          xanchor: 'left',
          y: 1.16,
          yanchor: 'top',
          font: { color: 'rgba(255,255,255,0.92)', size: 13.5 },
          buttons: views.map((v, i) => ({
            label: v.name,
            method: 'restyle',
            args: [{ 'link.value': [built[i]!.values], 'link.label': [built[i]!.labels] }],
          })),
        },
      ],
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// III cont. — most expensive transfer of each season (bar + crests)
// ══════════════════════════════════════════════════════════════════════════
export function figRecordTransfers(base: string): Figure {
  const rows = recordTransfers;
  const feesM = rows.map((r) => r.transfer_fee / 1e6);
  const feeMax = Math.max(...feesM);

  // Crests float above each bar; the box is sized in data units, so extend the
  // y-axis above the tallest bar to guarantee even the €222M crest fits.
  const logoH = Math.max(20, feeMax * 0.12);
  const logoGap = feeMax * 0.03;
  const yTop = feeMax + logoGap + logoH + feeMax * 0.04;

  const images = rows.flatMap((r, i) => {
    const file = CREST_BY_CLUB[r.to_club_name];
    if (!file) return [];
    return [
      {
        source: asset(base, `logos/${file}`),
        xref: 'x',
        yref: 'y',
        x: r.transfer_season,
        y: feesM[i]! + logoGap,
        sizex: 0.9,
        sizey: logoH,
        sizing: 'contain',
        xanchor: 'center',
        yanchor: 'bottom',
        layer: 'above',
      },
    ];
  });

  const barColor = (lg: string | null) =>
    lg && lg in LCOLORS ? hexToRgba(LCOLORS[lg as League], 0.82) : 'rgba(170,170,170,0.6)';
  const lineColor = (lg: string | null) => (lg && lg in LCOLORS ? LCOLORS[lg as League] : '#9aa');

  return {
    data: [
      {
        type: 'bar',
        x: rows.map((r) => r.transfer_season),
        y: feesM,
        marker: {
          color: rows.map((r) => barColor(r.to_league)),
          line: { color: rows.map((r) => lineColor(r.to_league)), width: 1.2 },
        },
        customdata: rows.map((r) => [r.player_name, r.from_club_name, r.to_club_name]),
        cliponaxis: false,
        hovertemplate:
          '<b>%{customdata[0]}</b><br>%{customdata[1]} → %{customdata[2]}<br>' +
          'Season %{x} · €%{y:.1f}m<extra></extra>',
      },
    ],
    layout: {
      height: 520,
      dragmode: false,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: 'rgba(255,255,255,0.9)', family: FONT, size: 15 },
      margin: { l: 20, r: 20, t: 40, b: 104 },
      images,
      xaxis: {
        showgrid: false,
        title: '',
        tickmode: 'array',
        tickvals: rows.map((r) => r.transfer_season),
        // Two-line tick: season above, surname below, angled so long names fit.
        ticktext: rows.map(
          (r) =>
            `<span style='color:rgba(255,255,255,0.55)'>${r.transfer_season}</span><br>` +
            `<b>${surname(r.player_name)}</b>`,
        ),
        tickangle: -35,
        ticks: '',
        tickfont: { family: DISPLAY, size: 13, color: 'rgba(255,255,255,0.82)' },
      },
      yaxis: {
        showgrid: true,
        gridcolor: 'rgba(255,255,255,0.1)',
        title: { text: 'Fee (€m)' },
        range: [0, yTop],
        // The narrow left margin above would clip the three-digit ticks and the
        // axis title; let Plotly claim exactly the room it needs instead.
        automargin: true,
      },
      hoverlabel: {
        bgcolor: 'rgba(10,10,10,0.9)',
        bordercolor: 'rgba(255,255,255,0.18)',
        font: { color: '#fff', size: 14 },
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════
// IV — cumulative net transfer balance per league
// ══════════════════════════════════════════════════════════════════════════
export function figNetBalance(): Figure {
  return {
    data: TOP5.map((lg) => ({
      type: 'scatter',
      name: LNAMES[lg],
      x: SEASONS,
      y: netCumulativeM[lg],
      mode: 'lines+markers',
      line: { color: LCOLORS[lg], width: lg === 'GB1' ? 3.5 : 2.5 },
      marker: { size: 6, color: LCOLORS[lg] },
      hovertemplate: `<b>%{x}</b><br>Cumulative: €%{y:+.0f}m<extra>${LNAMES[lg]}</extra>`,
    })),
    layout: themed(
      {
        xaxis: { title: { text: 'Season' } },
        yaxis: {
          title: { text: 'Cumulative net transfer balance (€m)' },
          // strong zero line separating net buyers from net sellers
          zeroline: true,
          zerolinecolor: 'rgba(255,255,255,0.5)',
          zerolinewidth: 2,
        },
        legend: { ...hLegend },
      },
      650,
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// V — where the most valuable players play (stacked area + slider)
// ══════════════════════════════════════════════════════════════════════════
export function figTopPlayers(): Figure {
  return {
    // TOP5 order puts GB1 at the bottom, so the stack reads as a rising tide.
    data: TOP5.map((lg) => ({
      type: 'scatter',
      x: SEASONS,
      y: topNCounts(DEFAULT_TOP_N, lg),
      name: LNAMES[lg],
      mode: 'lines',
      line: { width: 2, color: LCOLORS[lg], shape: 'spline', smoothing: 0.8 },
      stackgroup: 'one',
      fillcolor: hexToRgba(LCOLORS[lg], 0.75),
      hovertemplate: `<b>%{x}</b><br>${LNAMES[lg]}: %{y} players<extra></extra>`,
    })),
    layout: themed(
      {
        xaxis: { title: { text: 'Season' } },
        yaxis: {
          title: { text: 'Number of the most valuable players' },
          range: [0, DEFAULT_TOP_N],
          fixedrange: true,
        },
        legend: { ...hLegend },
        // Extra bottom room so the slider clears the x-axis title.
        margin: { l: 68, r: 20, t: 36, b: 104 },
        sliders: [
          {
            active: TOP_N_STEPS.indexOf(DEFAULT_TOP_N),
            x: 0,
            xanchor: 'left',
            y: -0.16,
            yanchor: 'top',
            len: 1,
            pad: { t: 10, b: 10 },
            currentvalue: {
              prefix: 'Top ',
              suffix: ' players',
              xanchor: 'left',
              font: { color: 'rgba(255,255,255,0.92)', size: 15 },
            },
            bgcolor: 'rgba(255,255,255,0.18)',
            bordercolor: 'rgba(255,255,255,0.28)',
            borderwidth: 1,
            tickcolor: 'rgba(255,255,255,0.45)',
            ticklen: 4,
            font: { color: 'rgba(255,255,255,0.62)', size: 12 },
            activebgcolor: LCOLORS.GB1,
            steps: TOP_N_STEPS.map((n) => ({
              method: 'update',
              label: String(n),
              args: [
                { y: TOP5.map((lg) => topNCounts(n, lg)) },
                { 'yaxis.range': [0, n] },
              ],
            })),
          },
        ],
      },
      650,
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// VI — squad value vs. final table position (Pearson r per league per season)
// ══════════════════════════════════════════════════════════════════════════
export function figCorrelation(): Figure {
  return {
    data: TOP5.map((lg) => ({
      type: 'scatter',
      x: SEASONS,
      y: correlation[lg],
      mode: 'lines+markers',
      name: LNAMES[lg],
      line: { color: LCOLORS[lg], width: 2 },
      marker: { size: 5, color: LCOLORS[lg] },
      hovertemplate: `<b>%{x}</b>: r = %{y:.2f}<extra>${LNAMES[lg]}</extra>`,
    })),
    layout: themed(
      {
        xaxis: { title: { text: 'Season' } },
        yaxis: {
          title: { text: 'Pearson correlation (squad value ↔ table position)' },
          range: [-0.1, 1.05],
        },
        legend: { ...hLegend },
        shapes: [
          {
            type: 'rect',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            x1: 1,
            y0: 0.7,
            y1: 1.0,
            fillcolor: 'rgba(80, 200, 120, 0.14)',
            line: { width: 0 },
            layer: 'below',
          },
          // faint boundary so the lower edge of the band stays readable
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            x1: 1,
            y0: 0.7,
            y1: 0.7,
            line: { color: 'rgba(80, 200, 120, 0.45)', width: 1, dash: 'dash' },
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            x1: 1,
            y0: 0,
            y1: 0,
            line: { color: 'rgba(255,255,255,0.2)', width: 1, dash: 'dot' },
          },
        ],
        annotations: [
          {
            x: 0,
            y: 1.0,
            xref: 'paper',
            yref: 'y',
            xanchor: 'left',
            yanchor: 'top',
            text: 'High / strong correlation (r ≥ 0.7)',
            showarrow: false,
            font: { size: 11, color: 'rgba(255,255,255,0.75)' },
          },
        ],
      },
      620,
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// VII — top-4 share of each league's squad value
// ══════════════════════════════════════════════════════════════════════════
export function figTop4Share(): Figure {
  return {
    data: TOP5.map((lg) => {
      const isPl = lg === 'GB1';
      return {
        type: 'scatter',
        x: SEASONS,
        y: top4Share[lg].map((v) => (v === null ? null : Math.round(v * 10) / 10)),
        mode: 'lines+markers',
        name: LNAMES[lg],
        line: { color: LCOLORS[lg], width: isPl ? 2.8 : 1.8 },
        marker: { size: isPl ? 5 : 4, opacity: isPl ? 1 : 0.75 },
        opacity: isPl ? 1 : 0.75,
        hovertemplate: `<b>%{x}</b>: %{y:.1f}% held by the top 4<extra>${LNAMES[lg]}</extra>`,
      };
    }),
    layout: themed(
      {
        xaxis: { title: { text: 'Season' } },
        yaxis: { title: { text: 'Top-4 share of league squad value (%)' }, ticksuffix: '%' },
        legend: { ...hLegend },
      },
      600,
    ),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// Conclusion — 2010 → 2024 slopegraph
// ══════════════════════════════════════════════════════════════════════════
export function figSlopegraph(): Figure {
  const y0 = 2010;
  const y1 = 2024;
  const eur = (v: number) => `€${v.toFixed(1)}bn`;
  const factor = (lg: League) => `×${(mvBn[lg][y1]! / mvBn[lg][y0]!).toFixed(1)}`;

  const byEnd = [...TOP5].sort((a, b) => mvBn[b][y1]! - mvBn[a][y1]!);
  const byStart = [...TOP5].sort((a, b) => mvBn[b][y0]! - mvBn[a][y0]!);
  const GAP = 0.62;

  const annotations: Record<string, unknown>[] = [];

  // Right-hand 2024 labels, nudged apart so clustered leagues stay legible.
  let last: number | null = null;
  for (const lg of byEnd) {
    const v = mvBn[lg][y1]!;
    const y: number = last === null ? v : Math.min(v, last - GAP);
    last = y;
    annotations.push({
      x: y1 + 0.5,
      y,
      xref: 'x',
      yref: 'y',
      text: `${eur(v)} (${factor(lg)})`,
      showarrow: false,
      xanchor: 'left',
      font: {
        color: LCOLORS[lg],
        size: lg === 'GB1' ? 15 : 14,
        ...(lg === 'GB1' ? { family: 'Oswald' } : {}),
      },
    });
  }

  // Left-hand 2010 labels, sorted independently: the 2010 ranking differs.
  last = null;
  for (const lg of byStart) {
    const v = mvBn[lg][y0]!;
    const y: number = last === null ? v : Math.min(v, last - GAP);
    last = y;
    annotations.push({
      x: y0 - 0.5,
      y,
      xref: 'x',
      yref: 'y',
      text: eur(v),
      showarrow: false,
      xanchor: 'right',
      font: {
        color: LCOLORS[lg],
        size: lg === 'GB1' ? 15 : 14,
        ...(lg === 'GB1' ? { family: 'Oswald' } : {}),
      },
    });
  }

  return {
    data: byEnd.map((lg) => {
      const isPl = lg === 'GB1';
      return {
        type: 'scatter',
        x: [y0, y1],
        y: [mvBn[lg][y0], mvBn[lg][y1]],
        mode: 'lines+markers',
        name: LNAMES[lg],
        line: { color: LCOLORS[lg], width: isPl ? 4 : 2 },
        marker: { size: isPl ? 9 : 7, color: LCOLORS[lg] },
        opacity: isPl ? 1 : 0.8,
        hovertemplate: `<b>%{x}</b>: €%{y:.2f}bn<extra>${LNAMES[lg]}</extra>`,
      };
    }),
    layout: themed(
      {
        xaxis: {
          tickmode: 'array',
          tickvals: [y0, y1],
          ticktext: [String(y0), String(y1)],
          range: [2005.5, 2028.5],
          showgrid: false,
        },
        yaxis: { title: { text: 'Squad market value (€bn)' }, range: [0, 14] },
        legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'left', x: 0 },
        annotations,
      },
      600,
    ),
  };
}
