"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

/** Leaflet map with OpenStreetMap tiles. Only mounted after the user asks for it. */
export default function LocationMap({ lat, lon }: { lat: number; lon: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lon], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.circleMarker([lat, lon], { radius: 9, color: "#A83C06", weight: 3, fillColor: "#F45D0E", fillOpacity: 0.9 }).addTo(map);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lon]);
  return <div ref={el} className="h-[280px] w-full overflow-hidden rounded-xl border border-line" role="region" aria-label="Map of the photo location" />;
}
