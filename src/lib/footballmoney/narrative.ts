/**
 * All prose for the deck, in reading order. Kept apart from the chart code so
 * the copy can be edited without touching a figure definition.
 */
import { LNAMES } from './config';
import { kpis, plInTotalBn, plInflowBn, plNetBn, plOutBn } from './data';

export interface SectionCopy {
  /** Chart id, matched to a figure in the page. */
  id: string;
  label: string;
  title: string;
  story: string;
  highlight?: string;
  highlightType?: 'gold' | 'red';
  caption?: string;
}

const plLines = plInflowBn
  .map(([lg, v]) => `from ${LNAMES[lg]} <strong>€${v.toFixed(1)}bn</strong>`)
  .join(', ');

export const hero = {
  eyebrow: 'Interactive dashboard',
  title: 'The big money in European football',
  subtitle:
    "Fifteen seasons of squad values, transfers and spending across Europe's top five leagues, 2010–2024",
  intro: [
    "What is a footballer worth, and how do Europe's biggest leagues compare financially? " +
      'This dashboard tracks fifteen seasons of squad market values across the five largest ' +
      "European leagues: England's Premier League, Spain's La Liga, Germany's Bundesliga, " +
      "Italy's Serie A and France's Ligue 1.",
    'The pages that follow explore data from Transfermarkt, the most comprehensive football ' +
      'database available, compare the leagues against one another, and trace how each of the ' +
      'five developed. The leagues were never level in 2010, and the lead at the top has grown ' +
      'visibly ever since.',
  ],
  tiles: [
    { value: String(kpis.n_seasons), label: 'Seasons analysed (2010–2024)' },
    { value: String(kpis.n_clubs), label: 'Clubs across the top five leagues' },
    { value: kpis.n_transfers_with_fee.toLocaleString('en-US'), label: 'Transfers considered' },
    { value: `€${Math.round(kpis.total_fee_eur / 1e9)}bn`, label: 'Total transfer spend' },
  ],
};

export const sections: SectionCopy[] = [
  {
    id: 'squad-values',
    label: 'I',
    title: 'The top five leagues compared',
    story:
      "Each bar is one league's squad market value for a season: the summed estimated market " +
      'values of every top-flight player. The Premier League already led in 2010, but the gap ' +
      'to the other four leagues was still modest. Since then it has grown considerably faster ' +
      'than any of its continental rivals, and its aggregate squad value now sits at more than ' +
      'double that of the next-largest league.',
    highlight:
      'A new Premier League television deal took effect in 2016/17 (Sky and BT, around £5.1bn ' +
      "for three seasons, roughly 58% more than the previous contract). The extra income " +
      "sharply increased English clubs' spending power, and because estimated market values " +
      'track fees and wages, squad values climbed noticeably in the years that followed.',
    highlightType: 'gold',
    caption: 'Squad market value of all top-flight clubs per season (at the start of the season)',
  },
  {
    id: 'treemap',
    label: 'II',
    title: 'Squad market value by league and club',
    story:
      'The same squad values, broken down by league and club: the area of each tile is its ' +
      'market value. Clicking a league or a club zooms into that area and shows how the ' +
      'individual clubs divide it; the dropdown switches season, so the shift over the years ' +
      'can be followed directly.',
    highlight:
      "In 2010 the Premier League's squad market value exceeded that of its nearest rival " +
      '(La Liga) by 41%. By 2024 its total exceeds <strong>the next two leagues combined</strong> ' +
      '(La Liga + Serie A).',
    highlightType: 'gold',
    caption: 'Squad values across the top five leagues',
  },
  {
    id: 'sankey',
    label: 'III',
    title: 'Transfers between the top five leagues',
    story:
      'On the left each league appears as a <em>selling</em> side, on the right the same league ' +
      'as a <em>buying</em> side; the width of a ribbon is the fee that flowed between those two ' +
      'leagues. The menu switches between a single season and the full period. The Premier ' +
      "League's receiving block is by far the largest: it signs more players from each of the " +
      'other four leagues than it sends back to them.',
    highlight:
      `Between 2010 and 2024 the Premier League spent €${plInTotalBn.toFixed(1)}bn on players ` +
      `from the four other top leagues (${plLines}), while clubs in those leagues paid only ` +
      `€${plOutBn.toFixed(1)}bn for Premier League players — a net outflow of ` +
      `<strong>€${plNetBn.toFixed(1)}bn</strong> in trade between the top five leagues alone.`,
    highlightType: 'gold',
    caption:
      'Transfers between different top-five leagues with a known fee · season selectable from the menu',
  },
  {
    id: 'records',
    label: 'III · cont.',
    title: 'Record transfers',
    story:
      'Each bar is the most expensive transfer of a season. The undisputed record of this ' +
      "period is Neymar's move to Paris Saint-Germain in 2017 for €222 million. Since then the " +
      'annual record has almost without exception exceeded €100 million.',
    highlight:
      'Between 2020/21 and 2024/25 the English club Chelsea F.C. spent a total of ' +
      '<strong>€1.75 billion</strong> on transfers.',
    highlightType: 'gold',
    caption: 'Highest transfer fee per season (2010–2024) · colour = league of the buying club',
  },
  {
    id: 'net-balance',
    label: 'IV',
    title: 'League transfer balances',
    story:
      "The cumulative net transfer balance sums up how a league's spending and income add up " +
      'over the years. Negative values mean more was spent on incoming players than was earned ' +
      'from outgoing ones. Across the whole period the Premier League moves ever further into ' +
      'the red, while several other leagues settle in permanently as net sellers.',
    highlight:
      'Ligue 1 and the Bundesliga appear regularly as <strong>net sellers</strong>: they develop ' +
      'players and mostly pass them on to wealthier leagues. Serie A has been under pressure ' +
      'since several investors withdrew, while La Liga periodically balances its books through ' +
      'large sales by Barcelona and Real Madrid.',
  },
  {
    id: 'top-players',
    label: 'V',
    title: 'Where the most valuable players play',
    story:
      "The area chart shows how a season's most valuable players are distributed across the " +
      'five leagues. The slider sets how many players are considered, from the top 10 to the ' +
      'top 150. In 2010 they were still spread fairly evenly; over the years an increasing ' +
      'share moved to the Premier League.',
    highlight:
      'The Premier League now holds <strong>almost as many</strong> top-150 players as the ' +
      'other four top leagues combined.',
    highlightType: 'gold',
    caption:
      'The most valuable players per season · count selectable with the slider (top 10 – top 150)',
  },
  {
    id: 'correlation',
    label: 'VI',
    title: 'Squad value versus league success',
    story:
      'The Pearson correlation measures how closely squad value and final table position move ' +
      'together (1.0 = perfect agreement, 0 = no relationship); values above 0.7 count as a ' +
      'strong relationship. In all five leagues the correlation has been high for years: ' +
      'whoever fields the more valuable squad usually finishes higher.',
    highlight:
      'The correlation sits fairly stably between 0.6 and 0.9 in every league, with mild ' +
      'season-to-season variation. <strong>The link between squad value and success therefore ' +
      'holds across all five leagues.</strong>',
    caption:
      'Pearson correlation per season and league · squad value and final table position (2010–2024)',
  },
  {
    id: 'top4-share',
    label: 'VII',
    title: 'Concentration of squad value at the top clubs',
    story:
      "This share shows how much of a league's total squad value belongs to its four most " +
      'valuable clubs. A high value means the money is concentrated in a few clubs at the top. ' +
      'In all five leagues the share sits well above an even distribution. The Premier League ' +
      'is the exception: its top-four concentration is noticeably lower, because of the ' +
      'historically grown &laquo;Big Six&raquo; of financially powerful clubs — Manchester City, ' +
      'Manchester United, Liverpool, Chelsea, Arsenal and Tottenham Hotspur. Since 2023 the ' +
      'term &laquo;Big Six&raquo; has itself been questioned, as clubs such as Newcastle United ' +
      'and Aston Villa have caught up financially, while several of the traditional six have ' +
      'performed well below expectations.',
    highlight:
      'Inequality therefore shows up on two levels: between the leagues, and within each ' +
      'individual league, where a large share of the value sits with a handful of top clubs.',
  },
  {
    id: 'slopegraph',
    label: 'Conclusion',
    title: 'From a tight field to a clear gap',
    story:
      'Fifteen seasons produce a clear picture. In 2010 the five leagues were still financially ' +
      'close together; the Premier League led, but by a relatively small margin. Squad values ' +
      'rose everywhere in the years that followed, far faster in England than on the continent. ' +
      'Higher squad values go hand in hand with better table positions in every league, and the ' +
      'transfer flows reinforce the trend, because talent moves predominantly towards the ' +
      'wealthiest league.',
    highlight:
      'In 2010 five leagues operated on a similar scale. Fifteen seasons later the Premier ' +
      'League is financially <strong>in a category of its own.</strong>',
    highlightType: 'gold',
    caption: 'Squad market value per league at the start of the 2010 and 2024 seasons',
  },
];

export const endCard = {
  kicker: 'Data: Transfermarkt &nbsp;·&nbsp; Seasons 2010–2024',
  meta: 'Built with Astro, Plotly and a lot of pixel art',
};
