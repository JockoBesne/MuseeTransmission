import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './InteractiveMap.css';
import type { Feature, FeatureCollection, MultiPolygon, Point } from 'geojson';
import franceContourRaw from '../../data/france-contour.json';
import villesData from '../../data/villes.json';

const franceContour = franceContourRaw as Feature<MultiPolygon>;
const villes = villesData as FeatureCollection<Point>;

function pointToLayer(feature: Feature<Point>, latlng: L.LatLng) {
  const props = feature.properties as { nom: string; texte: string; labelDir?: string };

  const marker = L.circleMarker(latlng, {
    radius: 6,
    fillColor: '#ff8200',
    color: '#ffffff',
    weight: 2,
    fillOpacity: 1,
  });

  marker.bindTooltip(props.nom, {
    permanent: true,
    direction: (props.labelDir as L.Direction) ?? 'bottom',
    className: 'map-label',
  });

  return marker;
}

function onEachCityFeature(feature: Feature<Point>, layer: L.Layer) {
  const props = feature.properties as { nom: string; texte: string };
  layer.bindPopup(`<strong>${props.nom}</strong><br/>`);
}

export default function InteractiveMap() {
  return (
    <MapContainer
      style={{ height: '100%', width: '100%' , background: '#0f70b7'}}
      attributionControl={false}
      center={[46.5, 2.3]}
      minZoom={6}
      maxZoom={6}
      zoom={6}
      bounds={[[51.5, -5.5], [41.2, 9.8]]}
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
        style={{ color: '#fecc30', weight: 1.5, fillColor: '#ffffff', fillOpacity: 0.6 }}
      />
      <GeoJSON
        data={villes}
        pointToLayer={pointToLayer}
        onEachFeature={onEachCityFeature}
      />
    </MapContainer>
  );
}