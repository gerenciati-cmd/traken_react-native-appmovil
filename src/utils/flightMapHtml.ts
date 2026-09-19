import type { LiveFlightAirport } from '../api/client';

/**
 * Genera el HTML autocontenido de la "Vista Mapa" de Vuelos en Tiempo Real
 * -- Leaflet + OpenStreetMap desde CDN (mismas librerias gratuitas y sin
 * llave que ya usa op/modulos/inicio/inicio.php en la web), mostrado dentro
 * de un WebView. Se regenera completo cada vez que llegan datos nuevos
 * (cada 90s o al jalar para refrescar) en vez de mantener un puente
 * bidireccional complejo -- mas simple y suficiente para este uso.
 * Al tocar un avion, el mapa manda su indice a React Native via
 * postMessage para abrir el mismo modal de detalle que usa la Vista Lista.
 */
export function buildFlightMapHtml(ap: LiveFlightAirport): string {
  const lat = ap.lat ?? 0;
  const lon = ap.lon ?? 0;
  const live = ap.live ?? [];

  const planesJson = JSON.stringify(
    live.map((r) => ({
      lat: r.lat,
      lon: r.lon,
      track: r.track_deg ?? 0,
      fase: r.fase,
      mio: r.mi_os,
      titulo: r.airline || r.callsign || '',
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0b1120; }
    .plane-pin { font-size: 20px; line-height: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
    .plane-pin.nivel { color: #94a3b8; }
    .plane-pin.ascenso { color: #60a5fa; }
    .plane-pin.descenso { color: #4ade80; }
    .plane-pin.mio { color: #fbbf24; }
    .station-pin { font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
    .leaflet-control-attribution { font-size: 8px !important; background: rgba(15,23,42,.6) !important; color: rgba(255,255,255,.5) !important; }
    .leaflet-control-attribution a { color: rgba(255,255,255,.7) !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var planes = ${planesJson};
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lon}], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    L.marker([${lat}, ${lon}], {
      icon: L.divIcon({ className: '', html: '<div class="station-pin">🛰️</div>', iconSize: [1, 1], iconAnchor: [11, 11] }),
      interactive: false
    }).addTo(map);

    planes.forEach(function(p, idx) {
      if (p.lat == null || p.lon == null) return;
      var cls = 'plane-pin ' + p.fase + (p.mio ? ' mio' : '');
      var icon = L.divIcon({
        className: '',
        html: '<div class="' + cls + '" style="transform:rotate(' + p.track + 'deg)">✈️</div>',
        iconSize: [1, 1],
        iconAnchor: [10, 10]
      });
      var marker = L.marker([p.lat, p.lon], { icon: icon }).addTo(map);
      marker.bindTooltip(p.titulo || 'Aeronave', { direction: 'top' });
      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(String(idx));
        }
      });
    });
  </script>
</body>
</html>`;
}
