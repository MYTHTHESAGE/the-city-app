import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { decodePolyline } from "@/lib/directions";
import type { LatLng } from "@/lib/directions";
import { REDEMPTION_CITY_POLYGON } from "@/lib/directions";

interface MapRoutePolylineProps {
  origin: LatLng;
  destination: LatLng;
  encodedPolyline?: string | null;
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
}

/**
 * Overlay component to render the travel path on a Map.
 * Decodes the overview polyline or falls back to a straight line.
 */
export function MapRoutePolyline({
  origin,
  destination,
  encodedPolyline,
  strokeColor = "#7F56D9", // Brand primary color
  strokeWeight = 5,
  strokeOpacity = 0.8,
}: MapRoutePolylineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let pathPoints: LatLng[] = [];
    if (encodedPolyline) {
      pathPoints = decodePolyline(encodedPolyline);
    }

    if (pathPoints.length === 0) {
      pathPoints = [origin, destination];
    }

    const polyline = new (window as any).google.maps.Polyline({
      path: pathPoints,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [
    map,
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    encodedPolyline,
    strokeColor,
    strokeWeight,
    strokeOpacity,
  ]);

  return null;
}

interface ServiceAreaPolygonProps {
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
}

/**
 * Overlay component to visualize the geofence boundary limits on the Map.
 */
export function ServiceAreaPolygon({
  strokeColor = "#F04438", // Warning red
  strokeOpacity = 0.6,
  strokeWeight = 2,
  fillColor = "#F04438",
  fillOpacity = 0.08,
}: ServiceAreaPolygonProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const polygon = new (window as any).google.maps.Polygon({
      paths: REDEMPTION_CITY_POLYGON,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      fillColor,
      fillOpacity,
    });

    polygon.setMap(map);

    return () => {
      polygon.setMap(null);
    };
  }, [map, strokeColor, strokeOpacity, strokeWeight, fillColor, fillOpacity]);

  return null;
}
