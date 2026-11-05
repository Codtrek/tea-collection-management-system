import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatWeight } from '@/lib/format'
import { FRESHNESS_TOKEN, freshnessLabel, tokenColor } from './status'
import type { DispatchBoard } from './types'

interface DispatchMapProps {
  board: DispatchBoard
  selectedAgentId: number | null
  onSelectAgent: (agentId: number) => void
}

/** Nuwara Eliya — only used when nothing on the board has coordinates. */
const FALLBACK_CENTER: LatLngTuple = [6.95, 80.79]

/** Re-frames the map on the selected agent's route (or everything) when the selection changes. */
function FitTo({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 })
  }, [map, bounds])
  return null
}

/*
  Agent pins + route lines on OpenStreetMap tiles (Leaflet: small, no API key). Pins are the
  agent's LAST KNOWN fix, coloured by how old it is — the tooltip says "5 min ago" / "Last
  seen 08:14", never "live". Selecting an agent highlights the route(s) they handle today.
  Colours come from the design tokens (read at render), so there are no raw hex values here.
*/
export function DispatchMap({ board, selectedAgentId, onSelectAgent }: DispatchMapProps) {
  const selected = board.agents.find((a) => a.agentId === selectedAgentId) ?? null
  const selectedRouteIds = useMemo(
    () => new Set(board.routes.filter((r) => selected && r.agentId === selected.agentId).map((r) => r.routeId)),
    [board.routes, selected],
  )

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    const pts: LatLngTuple[] = []
    for (const r of board.routes) {
      if (selected && !selectedRouteIds.has(r.routeId)) continue
      r.stops.forEach((s) => pts.push([s.lat, s.lng]))
    }
    if (selected?.position) pts.push([selected.position.lat, selected.position.lng])
    if (pts.length === 0 && !selected) {
      board.agents.forEach((a) => a.position && pts.push([a.position.lat, a.position.lng]))
    }
    return pts.length > 0 ? pts : null
  }, [board, selected, selectedRouteIds])

  const primary = tokenColor('primary')
  const muted = tokenColor('border-strong')
  const surface = tokenColor('surface')

  return (
    <MapContainer
      center={FALLBACK_CENTER}
      zoom={11}
      scrollWheelZoom={false}
      className="h-full w-full rounded-[var(--radius-lg)]"
      aria-label="Map of collection agents and routes"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTo bounds={bounds} />

      {board.routes.map((r) => {
        const active = selectedRouteIds.has(r.routeId)
        const line = r.stops.map((s): LatLngTuple => [s.lat, s.lng])
        return (
          <div key={r.routeId}>
            {line.length > 1 && (
              <Polyline
                positions={line}
                pathOptions={{ color: active ? primary : muted, weight: active ? 5 : 3, opacity: active ? 0.95 : 0.7 }}
              />
            )}
            {r.stops.map((s) => (
              <CircleMarker
                key={s.estateId}
                center={[s.lat, s.lng]}
                radius={active ? 6 : 4}
                pathOptions={{ color: active ? primary : muted, fillColor: surface, fillOpacity: 1, weight: 2 }}
              >
                <Tooltip>
                  {s.name} · {r.name}
                </Tooltip>
              </CircleMarker>
            ))}
          </div>
        )
      })}

      {board.agents.map((a) => {
        if (!a.position) return null
        const color = tokenColor(FRESHNESS_TOKEN[a.freshness])
        const isSelected = a.agentId === selectedAgentId
        return (
          <CircleMarker
            key={a.agentId}
            center={[a.position.lat, a.position.lng]}
            radius={isSelected ? 11 : 8}
            pathOptions={{ color: surface, weight: 3, fillColor: color, fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelectAgent(a.agentId) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{a.name}</strong>
              <br />
              {a.coveringRouteName ? `Covering ${a.coveringRouteName}` : (a.routeName ?? 'No route')} ·{' '}
              {formatWeight(a.kgCollected)} so far
              <br />
              {freshnessLabel(a)}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
