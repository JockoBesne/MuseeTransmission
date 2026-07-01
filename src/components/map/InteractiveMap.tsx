import { useState, useCallback } from 'react';
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
  devise: string;
  histoire: string;
  specificite: string;
  garnison: string;
}

function pointToLayer(_feature: Feature<Point>, latlng: L.LatLng) {
  return L.circleMarker(latlng, {
    radius: 3,
    fillColor: '#ff8200',
    color: '#ffffff',
    weight: 2,
    fillOpacity: 1,
  });
}

export default function InteractiveMap() {
  const [selectedCity, setSelectedCity] = useState<CityProps | null>(null);

  const onEachCityFeature = useCallback((feature: Feature<Point>, layer: L.Layer) => {
    const props = feature.properties as CityProps;
    layer.on('click', () => setSelectedCity(props));
  }, []);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        style={{ height: '100%', width: '100%', background: '#0f70b7' }}
        attributionControl={false}
        center={[46.5, 2.5]}
        zoom={6}
        minZoom={6}
        maxZoom={6}
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
          nom={selectedCity.nom}
          regiment={selectedCity.regiment}
          devise={selectedCity.devise}
          histoire={selectedCity.histoire}
          specificite={selectedCity.specificite}
          garnison={selectedCity.garnison}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  );
}