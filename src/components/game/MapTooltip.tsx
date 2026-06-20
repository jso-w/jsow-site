/** Small floating label that follows the cursor (position: fixed). */
export default function MapTooltip({
  name,
  x,
  y,
}: {
  name: string;
  x: number;
  y: number;
}) {
  return (
    <div className="map-tooltip" style={{ left: x, top: y }}>
      {name}
    </div>
  );
}
