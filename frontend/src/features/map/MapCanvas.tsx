import { useRef, useState } from "react";
import type { MapGraph } from "./api";

export function MapCanvas({ graph, path, append, canAppend }: { graph:MapGraph; path:string[]; append:(id:string) => void; canAppend:(id:string) => boolean }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x:0, y:0 });
  const drag = useRef<{x:number;y:number;panX:number;panY:number} | null>(null);
  const distance = new Intl.NumberFormat("nb-NO", { maximumFractionDigits:2 });
  return <section className="route-map" aria-label="Kart over tilgjengelige steder"><div className="map-toolbar"><span className="eyebrow">SKJEMATISK VEINETT</span><button aria-label="Zoom ut" disabled={zoom <= .75} onClick={() => setZoom(value => Math.max(.75, value - .25))}>−</button><span>{Math.round(zoom * 100)} %</span><button aria-label="Zoom inn" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + .25))}>+</button><button onClick={() => { setZoom(1); setPan({ x:0, y:0 }); }}>Tilpass kart</button></div>
      <svg className="case-map" viewBox="0 0 1120 720" tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const moves:Record<string, {x:number;y:number}> = { ArrowLeft:{x:40,y:0}, ArrowRight:{x:-40,y:0}, ArrowUp:{x:0,y:40}, ArrowDown:{x:0,y:-40} };
        const move = moves[event.key]; if (move) { event.preventDefault(); setPan(current => ({ x:current.x + move.x, y:current.y + move.y })); }
      }} aria-label="Veier og steder i Skardal" onPointerDown={event => {
        if ((event.target as Element).closest("[data-map-node]")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const matrix = event.currentTarget.getScreenCTM()?.inverse();
        if (matrix) { const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix); drag.current = { x:point.x, y:point.y, panX:pan.x, panY:pan.y }; }
      }} onPointerMove={event => { const d = drag.current; const matrix = event.currentTarget.getScreenCTM()?.inverse(); if (d && matrix) { const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix); setPan({ x:d.panX + point.x - d.x, y:d.panY + point.y - d.y }); } }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <defs><pattern id="map-grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#26343d" strokeWidth="1"/></pattern></defs>
        <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#map-grid)"/>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <path d="M80 50 Q320 190 300 340 T650 650" fill="none" stroke="#253c46" strokeWidth="32" opacity=".55"/>
          {graph.roads.map(road => {
            const from = graph.locations.find(point => point.id === road.fromLocationId)!;
            const to = graph.locations.find(point => point.id === road.toLocationId)!;
            const used = path.some((id, i) => i > 0 && ((path[i - 1] === from.id && id === to.id) || (path[i - 1] === to.id && id === from.id)));
            return <g key={road.id}><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={used ? "#d0b17a" : "#76848d"} strokeWidth={used ? 5 : 3}/><text className="road-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 12}>{distance.format(road.meters / 1000)} km</text></g>;
          })}
          {graph.locations.map(point => <g key={point.id} data-map-node role="button" tabIndex={0} aria-label={`Legg til ${point.name} i ruten`} aria-disabled={!canAppend(point.id)} onClick={() => append(point.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); append(point.id); } }} className="map-node">
            <circle cx={point.x} cy={point.y} r="12" fill={path.includes(point.id) ? "#d0b17a" : "#1a252d"} stroke="#d0b17a" strokeWidth="3"/><text x={point.x > 650 ? point.x - 20 : point.x + 20} y={point.y + 5} textAnchor={point.x > 650 ? "end" : "start"}>{point.name}</text>{path.includes(point.id) && <text className="map-visit-order" x={point.x} y={point.y - 24} textAnchor="middle">{path.map((id, index) => id === point.id ? index + 1 : null).filter(Boolean).join(" · ")}</text>}
          </g>)}
        </g>
      </svg>
    <p className="route-map-caption">Dra kartet, eller fokuser det og bruk piltastene. Steder kan også velges fra kortene.</p>
  </section>;
}
