import { MapContainer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, MultiPolygon } from 'geojson';
import franceContourRaw from '../../data/france-contour.json';

const franceContour = franceContourRaw as Feature<MultiPolygon>;

export default function InteractiveMap() {
  return (
    <MapContainer
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
      bounds={[[51.5, -5.5], [41.2, 9.8]]}

      // désactive toute interaction de déplacement/zoom
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      <GeoJSON
        data={franceContour}
        style={{ color: '#534AB7', weight: 1.5, fillColor: '#EEEDFE', fillOpacity: 0.6 }}
      />
    </MapContainer>
  );
}