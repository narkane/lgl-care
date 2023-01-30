import * as L from "leaflet";
import glify from "leaflet.glify";
// import { IColor } from "./src/color";
// import { LeafletMouseEvent } from "leaflet";
// import { Feature, FeatureCollection } from "geojson";

export async function renderMapCells(region) {

const cells = {
  type: "FeatureCollection",
  features: [],
};

// const map = L.map("map")
// Create the LatLngBounds object like this..
// 
var southWest = L.latLng(90, 180),
    northEast = L.latLng(-90, -180),
    bounds = L.latLngBounds(southWest, northEast);

var map = L.map('map', {
    maxBounds: bounds,   // Then add it here..
    maxZoom: 12,
    minZoom: 3
}).setView([32, 0], 5);

L.tileLayer(
  // "http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png"
  // "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",{
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
}).addTo(map);

// for (let i = 0; i < 100; i++) {
//   for (let j = 0; j < 840; j++) {
  for( let k = 0; k < region.length; k++) {
    drawCell(region[k].location[0], region[k].location[1]);
  }
//   }
// }

glify.shapes({
  map: map,
  color: (id) => {
    return hexToRgb(region[id].cellData.color);
  },
  data: cells,
  // opacity: 1.0,
  border: true,
  // borderOpacity: 0.7
});

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function drawCell(x, y) {
  const WestxNorth = percentageToCoordinatesLonLat((x -0.5) / 840, (838 - y) / 840);
  const EastxSouth = percentageToCoordinatesLonLat(
    (x+0.5) / 840,
    (839 - y) / 840
  );

  cells.features.push({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          WestxNorth,
          [EastxSouth[0], WestxNorth[1]],
          EastxSouth,
          [WestxNorth[0], EastxSouth[1]],
          WestxNorth,
        ],
      ],
    },
    properties: {
      subType: "Rectangle",
    },
  });
}

function percentageToCoordinatesLonLat(x, y) {
  const longitude = 360 * x - 180;
  const latitude =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((y * 2 - 1) * Math.PI)) - Math.PI / 2);

  // console.log(longitude, latitude);
  return [longitude, latitude];
}

return map;
}
