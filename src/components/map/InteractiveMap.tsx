import { useState } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, FeatureCollection, MultiPolygon, Point } from 'geojson';
import franceContourRaw from '../../data/france-contour.json';
import villesData from '../../data/villes.json';
import { CardDialog } from './CardDialog';

const franceContour = franceContourRaw as Feature<MultiPolygon>;
const villes = villesData as FeatureCollection<Point>;

interface CityProps {
  nom: string;
  regiment: string;
  texte: string;
  histoire: string;
  specificite: string;
  garnison: string;
  photo?: string;
  labelDir?: string;
}

function pointToLayer(feature: Feature<Point>, latlng: L.LatLng) {
  const props = feature.properties as CityProps;

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

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<CityProps | null>(null);

  function onEachCityFeature(feature: Feature<Point>, layer: L.Layer) {
    const props = feature.properties as CityProps;
    layer.on('click', () => setSelectedCity(props));
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%', background: '#0f70b7' }}
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
      {selectedCity && (
        <CardDialog
          regiment={selectedCity.regiment}
          texte={selectedCity.texte}
          histoire={selectedCity.histoire}
          specificite={selectedCity.specificite}
          garnison={selectedCity.garnison}
          photo={selectedCity.photo}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  );
}