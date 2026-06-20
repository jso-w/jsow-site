import { memo } from "react";

export interface RegionProps {
  id: string;
  name: string;
  /** Pre-projected SVG path data. */
  d: string;
  hovered: boolean;
  onEnter: (id: string, name: string) => void;
  onMove: (clientX: number, clientY: number) => void;
  onLeave: () => void;
}

function Region({ id, name, d, hovered, onEnter, onMove, onLeave }: RegionProps) {
  return (
    <path
      d={d}
      className={"region" + (hovered ? " is-hover" : "")}
      vectorEffect="non-scaling-stroke"
      onMouseEnter={() => onEnter(id, name)}
      onMouseMove={(e) => onMove(e.clientX, e.clientY)}
      onMouseLeave={onLeave}
    />
  );
}

export default memo(Region);
