"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { formatCoordinate } from "@/lib/format";
import type { GpsInfo } from "@/lib/report";
import { ExternalIcon, MapIcon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { errorMessage, type FileEntry } from "@/store/files";
import { removeLocation } from "@/store/actions";

const LocationMap = dynamic(() => import("./LocationMap"), { ssr: false, loading: () => <div className="h-[280px] rounded-xl bg-surface-2" /> });

/** Location preview. No map is loaded until the user asks: map tiles would send the coordinates to a third party. */
export function LocationPreview({ gps, entry }: { gps: GpsInfo; entry: FileEntry }) {
  const [map, setMap] = useState(false);
  const [state, setState] = useState<{ busy?: boolean; done?: boolean; error?: string }>({});
  const osm = `https://www.openstreetmap.org/?mlat=${gps.lat.toFixed(6)}&mlon=${gps.lon.toFixed(6)}#map=15/${gps.lat.toFixed(6)}/${gps.lon.toFixed(6)}`;
  const run = async () => {
    setState({ busy: true });
    try {
      await removeLocation(entry);
      setState({ done: true });
    } catch (err) {
      setState({ error: errorMessage(err) });
    }
  };
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="font-mono text-[13px]">
        {formatCoordinate(gps.lat, true)}, {formatCoordinate(gps.lon, false)}
        {gps.alt !== undefined && ` · ${Math.round(gps.alt)} m`}
        <span className="ml-2 font-sans text-xs text-ink-3">from {gps.source}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={run} disabled={state.busy} loading={state.busy}>
          {state.busy ? "Removing…" : "Remove location"}
        </Button>
        <a href={osm} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary" })}>
          <ExternalIcon size={16} />
          Open in OpenStreetMap
        </a>
        {!map && (
          <Button variant="ghost" onClick={() => setMap(true)}>
            <MapIcon size={16} />
            Show map
          </Button>
        )}
      </div>
      {state.done && <Notice tone="info">Downloaded a copy without the location. Everything else, including the image data, is unchanged.</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {map && (
        <>
          <Notice tone="quiet">
            The map loads tiles from OpenStreetMap, which tells their servers roughly where this photo was taken. Your file is not sent.
          </Notice>
          <LocationMap lat={gps.lat} lon={gps.lon} />
        </>
      )}
    </div>
  );
}
