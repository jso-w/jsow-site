import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { geoAzimuthalEqualArea, geoPath, geoCentroid } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, type D3ZoomEvent } from "d3-zoom";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Region from "./Region";
import MapTooltip from "./MapTooltip";
import "./map.css";

interface RegionProperties {
  id: string;
  name: string;
  country: string;
  context?: boolean; // true = non-playable backdrop country (no subdivisions)
}
type RegionFeature = Feature<Geometry, RegionProperties>;

// Fixed projection canvas. The SVG uses this as its viewBox and scales
// responsively, so we never re-project on resize.
const W = 1000;
const H = 860;
const PAD = 24;

// Mainland Europe lon/lat window. Used only to choose which regions the
// projection is fitted to, so far islands (Canaries, Azores, eastern Cyprus)
// still render but do not shrink the mainland.
const FRAME_LON: [number, number] = [-12, 34];
const FRAME_LAT: [number, number] = [33, 72];

interface Props {
  /** URL to the Europe TopoJSON (base-prefixed by the caller). */
  topoUrl: string;
  /** Object key inside the topology. */
  objectName?: string;
}

export default function GameMap({ topoUrl, objectName = "europe" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [fc, setFc] = useState<FeatureCollection<Geometry, RegionProperties> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState("translate(0,0) scale(1)");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);

  // Load and parse the topology.
  useEffect(() => {
    let alive = true;
    // Try the base-prefixed URL first, then fall back to the root path, so it
    // works whether the dev/prod server serves public/ under the base or not.
    const load = async (): Promise<{ objects?: Record<string, unknown> }> => {
      const candidates = [topoUrl];
      const i = topoUrl.indexOf("/quiz/");
      if (i > 0) candidates.push(topoUrl.slice(i));
      let lastStatus = "";
      for (const url of candidates) {
        const r = await fetch(url);
        if (r.ok) return r.json();
        lastStatus = `HTTP ${r.status} ${r.statusText}`;
      }
      throw new Error(lastStatus || "fetch failed");
    };
    load()
      .then((topo: { objects?: Record<string, unknown> }) => {
        if (!alive) return;
        const obj = topo.objects?.[objectName];
        if (!obj) throw new Error(`object "${objectName}" not found (have: ${Object.keys(topo.objects || {}).join(", ")})`);
        const collection = feature(topo as never, obj as never) as unknown as FeatureCollection<Geometry, RegionProperties>;
        setFc(collection);
      })
      .catch((err) => {
        console.error("Failed to load map:", err);
        if (alive) setError(String(err?.message || err));
      });
    return () => {
      alive = false;
    };
  }, [topoUrl, objectName]);

  // Project once the data is in. Azimuthal equal-area centred on Europe
  // (the EU-standard ETRS89-LAEA framing), fitted to the mainland.
  const { contextPaths, regionPaths } = useMemo(() => {
    if (!fc) return { contextPaths: [], regionPaths: [] };
    const mainland: FeatureCollection = {
      type: "FeatureCollection",
      features: fc.features.filter((f) => {
        const [lon, lat] = geoCentroid(f as Feature);
        return (
          lon >= FRAME_LON[0] &&
          lon <= FRAME_LON[1] &&
          lat >= FRAME_LAT[0] &&
          lat <= FRAME_LAT[1]
        );
      }),
    };
    const projection = geoAzimuthalEqualArea()
      .rotate([-10, -52])
      .fitExtent([[PAD, PAD], [W - PAD, H - PAD]], mainland);
    const pathGen = geoPath(projection);

    const contextPaths: { id: string; d: string }[] = [];
    const regionPaths: { id: string; name: string; d: string }[] = [];
    for (const f of fc.features as RegionFeature[]) {
      const d = pathGen(f);
      if (!d) continue;
      if (f.properties.context) contextPaths.push({ id: f.properties.id, d });
      else regionPaths.push({ id: f.properties.id, name: f.properties.name, d });
    }
    return { contextPaths, regionPaths };
  }, [fc]);

  // Pan and zoom.
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = select(svgRef.current);
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 16])
      .translateExtent([[0, 0], [W, H]])
      .extent([[0, 0], [W, H]])
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform(e.transform.toString());
      });
    svg.call(zoomBehavior);
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const handleEnter = useCallback((id: string, name: string) => {
    setHoverId(id);
    setTooltip((t) => (t ? { ...t, name } : { name, x: 0, y: 0 }));
  }, []);
  const handleMove = useCallback((x: number, y: number) => {
    setTooltip((t) => (t ? { ...t, x, y } : null));
  }, []);
  const handleLeave = useCallback(() => {
    setHoverId(null);
    setTooltip(null);
  }, []);

  const total = contextPaths.length + regionPaths.length;

  return (
    <div className="game-map" ref={containerRef}>
      <svg
        ref={svgRef}
        className="game-map-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Map of Europe"
      >
        <g transform={transform}>
          {contextPaths.map((p) => (
            <path key={p.id} d={p.d} className="region is-context" vectorEffect="non-scaling-stroke" />
          ))}
          {regionPaths.map((p) => (
            <Region
              key={p.id}
              id={p.id}
              name={p.name}
              d={p.d}
              hovered={hoverId === p.id}
              onEnter={handleEnter}
              onMove={handleMove}
              onLeave={handleLeave}
            />
          ))}
        </g>
      </svg>

      {tooltip && tooltip.x > 0 ? (
        <MapTooltip name={tooltip.name} x={tooltip.x} y={tooltip.y} />
      ) : null}

      {error ? (
        <div className="map-status map-status--error">
          Couldn’t load the map.<br />
          <code>{topoUrl}</code><br />
          {error}
        </div>
      ) : !fc ? (
        <div className="map-status">Loading map…</div>
      ) : total === 0 ? (
        <div className="map-status map-status--error">Loaded but 0 regions in object “{objectName}”.</div>
      ) : null}

      <div className="map-controls-hint">Scroll to zoom · drag to pan</div>
    </div>
  );
}
