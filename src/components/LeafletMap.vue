<template>
  <div id="care">
    <UI />
    <CellInspect
      :name="cellInspect.name"
      :owner="cellInspect.owner"
      :cell-location="cellInspect.cellLocation"
      :emoji-location="cellInspect.emojiLocation"
    />
    <div id="map" />
  </div>
</template>

<script>
import * as L from "leaflet";
import glify from "leaflet.glify";
import "leaflet/dist/leaflet.css";

import { renderMapCells } from "../renderMap.js";
import emojiIndexReference from "@/emojiIndexReference.js";
// import { LeafletMouseEvent } from "leaflet";
// import { Feature, FeatureCollection } from "geojson";
import axios from "axios";
import api from "@/services/api/cell";

import UI from "./UI/UI.vue";
import CellInspect from "./UI/CellInspect.vue";

export default {
  name: "LeafletMap",
  components: {
    UI,
    CellInspect,
  },
  data() {
    return {
      map: null,
      lastFetchRegionTime: 0,
      scale: [],
      cells: {
        type: "FeatureCollection",
        features: [],
      },
      cellInspect: {
        name: "Not Found",
        owner: "Not Found",
        cellLocation: "Not Found",
        timeStamp: "Not Found",
        emojiLocation: {},
      },
      emojiLocation: null,
      numberOfEmojis: 0,
      currentScale: 0,
    };
  },
  async mounted() {
    this.initVerticalResizeForPhones();
    this.initVars();
    this.initColorMap();
    // this.map = L.map("map").setView([50.0, 14.44], 5);

    // L.tileLayer(
    //   "http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png",
    //   {
    //     // L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    //     maxZoom: 19,
    //   }
    // ).addTo(this.map);

    // for (let i = 0; i < 840; i++) {
    //   for (let j = 0; j < 840; j++) {
    //     this.drawCell(i, j);
    //   }
    // }

    // glify.shapes({
    //   map: this.map,
    //   click: (e, feature) => {
    //     L.popup()
    //       .setLatLng(e.latlng)
    //       .setContent(`You clicked on`)
    //       .openOn(this.map);

    //     console.log("clicked on Shape", feature, e);
    //   },
    //   hover: (e, feature) => {
    //     console.log("hovered on Shape", feature, e);
    //   },
    //   // color: {
    //   //   r: 1,
    //   //   g: 1,
    //   //   b: 0,
    //   // },
    //   data: this.cells,
    //   // border: true,
    // });

    // glify.points({
    //   map: this.map,
    //   data: [[50, 14.44]],
    //   size(i) {
    //     console.log(i);
    //     return 30;
    //   },
    // });
  },
  methods: {
    initVars() {
      // manually run calculations
      this.numberOfEmojis = Object.keys(emojiIndexReference).length;

      this.scale.splice(0, 1, 256 / this.numberOfEmojis);
      this.scale.splice(1, 1, 256 / Math.pow(this.numberOfEmojis, 2));
      this.scale.splice(2, 1, 256 / Math.pow(this.numberOfEmojis, 3));
      this.scale.splice(3, 1, 256 / Math.pow(this.numberOfEmojis, 4));
    },
    initVerticalResizeForPhones() {
      // resize vertical region for phones
      const resizer = () => {
        document.getElementById(
          "care"
        ).style.height = `${window.innerHeight}px`;
        console.log("Phone vertical resize");
      };
      window.addEventListener("resize", () => resizer());
      if (document.readyState !== "loading") {
        resizer();
      } else {
        document.addEventListener("DOMContentLoaded", () => resizer());
      }
    },
    listenerHandler() {
      const googleMapElement = document.getElementById("map");
      // Map init - do something only the first time the map is loaded
      this.map.on("load", () => {
        // this.map.setZoom(this.minZoomLevel)
        this.drawGridsIntoRegion();
        // this.geolocation();
        this.center = { lat: 7, lng: 76 };
        if (this.map.getZoom() > 3) {
          this.map.setZoom(3);
        }
        this.currentScale = this.breakLayer();
        console.log("this.currentscale: " + this.currentScale);
        // this.initColorMap();
      });

      // // MOVE THIS TO INIT MAP EVENT -----------------------------
      // // Run once after map is fully loaded with mercator projection
      // map.addListenerOnce(map, "projection_changed", () => {
      //   // If an emojiCode exists in URL then handle with this.convertEmojiInput
      //   if (this.$route.params.emojiCode) {
      //     setTimeout(() => {
      //       this.emojiInputZoomCenter(
      //         this.convertEmojiInput(this.$route.params.emojiCode)
      //       );
      //       console.log(
      //         `   converted emoji input: ${map.getCenter().lat()}`,
      //         map.getCenter().lng()
      //       );
      //     }, 2000);
      //   } else {
      //     this.disableZoom = false;
      //   }
      // });

      this.map.on("mousemove", (event) => {
        this.calcEmojiReadout(event);
      });

      googleMapElement.addEventListener("click", (event) => {
        // for mobile devices to render emoji position
        this.calcEmojiReadout(event);
        // document.getElementById('cell-inspect').style.visibility = 'hidden'

        // Hacked handling for dblclick for both mobile and desktop browsers
        if (this.doubleClicked) {
          // do what you want to do on double click here
          this.colorCell();
        }
        this.doubleClicked = true;
        setTimeout(() => {
          this.doubleClicked = false;
        }, 300);
      });

      googleMapElement.addEventListener("dblclick", () => {
        // this.calcEmojiReadout(event)
        // this.colorCell();
      });

      // Right click event
      googleMapElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.inspectCell(event);
      });

      googleMapElement.addEventListener("touchmove", (event) => {
        event.preventDefault();
        // document.getElementById('cell-inspect').style.visibility = 'hidden'
      });

      // Right click event for mobile [touch and hold for 1sec]
      googleMapElement.addEventListener("touchstart", (event) => {
        event.preventDefault();
        console.log("touchstart - ", event);
        if (!this.holdTouch) {
          this.holdTouch = setTimeout(() => {
            // SUCCESS fire event
            this.inspectCell(event.touches[0]);
          }, 750);
        }
      });
      googleMapElement.addEventListener("touchend", (event) => {
        event.preventDefault();
        // stops short touches from firing the event
        if (this.holdTouch) {
          clearTimeout(this.holdTouch);
          this.holdTouch = null;
        }
      });

      this.map.on("zoom", () => {
        this.zoom = this.map.getZoom();
        console.log(`zoom @: ${this.zoom}`);
        // Hide cell-inspect (right-click) window when zoom is changed
        document.getElementById("cell-inspect").style.visibility = "hidden";

        // when zoom breaks up the grid unload old grid scale and load up the new grid scale
        if (this.breakLayer() !== this.currentScale) {
          console.log(this.breakLayer(), this.currentScale);
          // If user goes from layer 1 -> 2 or 2 -> 1 unload cells to prep for
          // next layer (1/3) rendering
          if (
            (this.currentScale === 1 && this.breakLayer() === 2) ||
            (this.currentScale === 2 && this.breakLayer() === 1)
          ) {
            this.unloadCellGrid();
          }
        }
        // Change userPositionCircle size based on zoom changes
        this.redrawUserPositionCircle(
          this.meterScaleAtZoomLevel[this.map.getZoom()] /
            this.userPositionCircleSizeScale
        );
      });

      this.map.on("bounds_changed", () => {
        // Sets bounds to world coordinates
        // this.mercCoords()
        // console.log('huh? setbounds()')
        this.setAllBounds();

        try {
          this.drawGridsIntoRegion();
        } catch (e) {
          console.log(`drawGoogleGridsIntoRegion failed: ${e.message}`);
        }
      });
    },
    emitHandler(map) {
      // $root.$emit from UI.NestedHideMenu for satelliteView button event
      this.$root.$on("satellite-view", (ret) => {
        if (ret) {
          map.setMapTypeId("satellite");
        } else {
          map.setMapTypeId("terrain");
        }
      });
      // $root.$emit from UI.NestedHideMenu for emojiGrid button event
      this.$root.$on("emoji-grid", (ret) => {
        if (ret) {
          this.ui.gridView = true;
          this.loadGoogleGrid();
          document.getElementById("tdCursor").style.visibility = "visible";
        } else {
          this.ui.gridView = false;
          this.unloadGoogleGrid();
          // hide emoji cursor selector at top
          document.getElementById("tdCursor").style.visibility = "hidden";
        }
      });
      // $root.$emit from UI.NestedHideMenu for colorGrid button event
      this.$root.$on("color-grid", (ret) => {
        if (ret) {
          // this.loadCellGrid()
          // Object.values(this.cellRectangles).forEach((val) => {
          // val.setOptions({ visible: true })
          // })
          this.loadCellGrid();
        } else {
          // this.unloadCellGrid()
          // Object.values(this.cellRectangles).forEach((val) => {
          // val.setOptions({ visible: false })
          // })
          this.unloadCellGrid();
        }
      });
      // $root.$emit from UI.NestedHideMenu for opaqueColorGrid event
      this.$root.$on("opaque-color-grid", (ret) => {
        if (ret) {
          this.cellOpacity = 1.0;
        } else {
          this.cellOpacity = 0.6;
        }
        Object.values(this.cellRectangles).forEach((val) => {
          val.setOptions({ fillOpacity: this.cellOpacity });
        });
      });
      // $root.$emit from UI.NestedHideMenu for GPS center button event
      this.$root.$on("GPS-center", () => {
        navigator.geolocation.getCurrentPosition((position) => {
          this.userPositionLatLng = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          map.panTo(this.userPositionLatLng);
        });
      });
    },
    // ANCHOR ⁡⁣⁣⁢𝗔𝗣𝗜 𝗠𝗘𝗧𝗛𝗢𝗗𝗦 -----------------------------------------------------------------------⁡
    /** API call for coloring in a cell, made when dblclicking  */
    colorCell() {
      if (this.currentScale !== 1) {
        console.log("WHOOPS! try it at 2nd grid layer <3");
      } else {
        const payload = {
          location: [this.mouseCellPosX, this.mouseCellPosY],
          color: this.$store.getters.selectedSwatch,
        };
        api
          .colorCell(payload)
          .then((apires) => {
            console.log("drawingcell with " + apires);
            this.drawCell(
              apires.data.location[0],
              apires.data.location[1],
              apires.data.cellData
            );
            // this.colorMap[apires.data.location] = {
            //   data: apires.data.cellData,
            //   time: apires.data.updatedAt
            // }
          })
          .catch((e) => {
            this.$vToastify.error({
              body: e,
              title: "Error",
              callback: () => {
                console.log("toastify callback fired off!");
              },
            });
          });
      }
    },
    // eslint-disable-next-line max-statements
    inspectCell(event) {
      const position = [];
      // update emoji position on holdTouch
      this.calcEmojiReadout(event);
      if (
        document.getElementById("cell-inspect").style.visibility !== "visible"
      ) {
        if (this.currentScale === 0) {
          position[0] = this.mouseCellPosXNext;
          position[1] = this.mouseCellPosYNext;
        } else {
          position[0] = this.mouseCellPosX;
          position[1] = this.mouseCellPosY;
        }
        console.log(position);
        api
          .inspectCell(position)
          .then((apires) => {
            console.log(apires);
            document.getElementById("card-header").style.background =
              apires.data.cellData.color;
            // this.cellInspect.timeStamp = apires.data.updatedAt
            this.cellInspect.cellLocation = position;
            this.cellInspect.emojiLocation = this.emojiLocation;
            this.cellInspect.owner = apires.data.cellData.owner;
            console.log("log dog: ", this.cellInspect);
          })
          .catch((e) => {
            console.log(e);
            // document.getElementById('card-header').style.background = '#EEEEEE'
            // this.cellInspect.owner = 'Not Found'
            // // this.cellInspect.timeStamp = 'Not Found'
            // this.cellInspect.cellLocation = `${this.mouseCellPosX}, ${this.mouseCellPosY}`
            // this.cellInspect.emojiLocation = this.emojiLocation
          });
        const pos = {
          x: event.pageX,
          y: event.pageY,
        };
        if (pos.x > window.innerWidth - 350) {
          pos.x = window.innerWidth - 350;
        }
        if (pos.y > window.innerHeight - 300) {
          pos.y = window.innerHeight - 300;
        }
        document.getElementById("cell-inspect").style.left = `${pos.x}px`;
        document.getElementById("cell-inspect").style.top = `${pos.y}px`;
        document.getElementById("cell-inspect").style.visibility = "visible";
      }
    },
    initColorMap() {
      // Use a Mercator Projection to cast this.bounds values to google
      // maps' equivalent "World Coordinates" values
      // sets this.bounds
      // !! WHICH IS NEEDED FOR payload region
      // this.setAllBounds()
      // this.mercCoords()
      // fetch all colored cells at rez 2
      const payload = {
        firstCell: {
          x: 0,
          y: 0,
          // x: this.findSqIDByWorldCoordsRezOf2(this.bounds.sw.x),
          // y: this.findSqIDByWorldCoordsRezOf2(this.bounds.ne.y)
        },
        lastCell: {
          x: 841,
          y: 841,
          // x: this.findSqIDByWorldCoordsRezOf2(this.bounds.ne.x),
          // y: this.findSqIDByWorldCoordsRezOf2(this.bounds.sw.y)
        },
        lastFetchRegionTime: this.lastFetchRegionTime,
      };
      this.lastFetchRegionTime = new Date().getTime();
      // console.table(payload)

      axios
        .post(`${process.env.VUE_APP_API_URL}/cell/fetchRegion`, payload)
        .then(async (res) => {
          if (res.data.length !== 0) {
            // Promise.all(this.drawRegionOfCells(res)).then(() => {

            // console.log(JSON.stringify(res.data));
            renderMapCells(res.data).then((retmap) => {
              if (
                document.defaultView
                  .getComputedStyle(
                    document.getElementById("loading-element"),
                    null
                  )
                  .getPropertyValue("visibility") === "visible"
              ) {
                // document.getElementById('loading-element').style.visibility =
                //   'hidden'
                document
                  .getElementById("loading-element")
                  .classList.toggle("fade-out", true);
                console.log("loaded!");
              }
              console.log("flaggo@!");
              console.log(retmap);
              this.map = retmap;
              this.listenerHandler(this.map);
              this.emitHandler(this.map);
            });

            // click: (e, feature) => {
            //   // set up a standalone popup (use a popup as a layer)
            //   L.popup()
            //     .setLatLng(feature)
            //     .setContent(
            //       `You clicked the point at longitude:${e.latlng.lng}, latitude:${e.latlng.lat}`
            //     )
            //     .openOn(this.map)

            //   console.log('clicked on Point', feature, e)
            // },
            // hover: (e, feature) => {
            //   console.log('hovered on Point', feature, e)
            // },
            console.log("mapped: ", res);
          } else {
            // document.getElementById('loading-element').style.visibility =
            //   'hidden'
            console.error("No cells on init!");
          }
        })
        .catch((err) => {
          console.log(err);
        });
    },
    drawCell(x, y) {
      const WestxNorth = this.percentageToCoordinatesLonLat(x / 841, y / 841);
      const EastxSouth = this.percentageToCoordinatesLonLat(
        (x + 1) / 841,
        (y + 1) / 841
      );

      this.cells.features.push({
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
    },
    // ANCHOR ⁡⁣⁣⁢𝗚𝗥𝗜𝗗 𝗠𝗘𝗧𝗛𝗢𝗗𝗦 -------------------------------------------------------------------⁡
    // ---------------------------------------------------------------------
    // ---------------------------------------------------------------------
    // eslint-disable-next-line max-statements
    drawGridsIntoRegion() {
      // this.unloadGoogleGrid()
      this.setBounds();
      this.currentScale = 0; // this.breakLayer()
      // !! create drawLine(percent) method
      const test = { x: 0, y: 0 };
      let alternateSign = false;

      this.gridLinesLat = [];
      this.gridLinesLng = [];
      this.googleGridLat = [];
      this.googleGridLng = [];
      const gridSizeAtScale = 1 / Math.pow(29, this.currentScale + 1);
      const swCorner = this.coordinatesToPercentage([
        this.geoBounds.sw.lat,
        this.geoBounds.sw.lng,
      ]);
      const neCorner = this.coordinatesToPercentage([
        this.geoBounds.ne.lat,
        this.geoBounds.ne.lng,
      ]);
      const screenBounds = {
        bottom: swCorner.y + gridSizeAtScale - (swCorner.y % gridSizeAtScale),
        top: neCorner.y + gridSizeAtScale - (neCorner.y % gridSizeAtScale),
        left: swCorner.x + gridSizeAtScale - (swCorner.x % gridSizeAtScale),
        right: neCorner.x + gridSizeAtScale - (neCorner.x % gridSizeAtScale),
      };
      console.table(screenBounds);
      for (
        // let y = screenBounds.top;
        // y <= screenBounds.bottom;
        // y += gridSizeAtScale
        let y = 0;
        y <= 1;
        y += gridSizeAtScale
      ) {
        test.y = y;
        const ret = this.percentToCoordinates(test);

        this.gridLinesLat.push({
          lat: ret.lat,
          lng: -180,
        });
        this.gridLinesLat.push({ lat: ret.lat, lng: 0 });
        this.gridLinesLat.push({
          lat: ret.lat,
          lng: 180,
        });

        // test.y += gridSizeAtScale
        // ret = this.percentToCoordinates(test)

        // this.gridLinesLat.push({
        //   lat: ret.lat,
        //   lng: 180
        // })
        // this.gridLinesLat.push({ lat: ret.lat, lng: 0 })
        // this.gridLinesLat.push({
        //   lat: ret.lat,
        //   lng: -180
        // })
      }

      for (
        // let x = screenBounds.left;
        // screenBounds.left > screenBounds.right
        //   ? x <= screenBounds.right || x >= screenBounds.left
        //   : x <= screenBounds.right;
        // x += gridSizeAtScale
        let x = 0;
        x <= 1;
        x += gridSizeAtScale
      ) {
        // Flip over the EVIL LINE
        if (x >= 1) {
          x -= 1;
        }
        // console.log('X: ', x)

        test.x = x;
        const ret = this.percentToCoordinates(test);

        // NOTE ⁡⁢⁣⁣-⁡ ⁡⁢⁣⁣removed currentscale array and add try catch ⁡⁢⁣⁣to bounds change⁡⁡

        // Alternate draw directions to avoid cross threading issues
        this.gridLinesLng.push({
          lat: alternateSign ? -90 : 90,
          lng: ret.lon,
        });
        this.gridLinesLng.push({
          lat: alternateSign ? 90 : -90,
          lng: ret.lon,
        });
        alternateSign = !alternateSign;
      }
      this.googleGridLat = glify.lines({
        map: this.map,
        data: this.gridLinesLat,
        size: 2,
        geodesic: false,
        color: "#504515",
        opacity: 1.0,
        // zIndex: 2
      });
      this.googleGridLng = glify.lines({
        map: this.map,
        data: this.gridLinesLng,
        size: 2,
        geodesic: false,
        color: "#504515",
        opacity: 1.0,
        // zIndex: 2
      });
      // }
      // Draw Grid (now that loaded above) at current scale
      // this.googleGridLng.addTo(this.map)
      // this.googleGridLat.addTo(this.map)
    },
    /** Remove Drawn grid by setting previous scale index of this.googleGridLat[] and this.googleGridLng[] arrays in this.map to null */
    unloadGoogleGrid() {
      if (this.googleGridLat) {
        // console.log('console map set null')
        this.googleGridLat.setMap(null);
      }
      if (this.googleGridLng) {
        this.googleGridLng.setMap(null);
      }

      // !! HACK FIX for loading from zoom out scale 2 -> 1 load scale 1 cells
      if (this.breakLayer() === 1) {
        this.loadCellGrid();
      }
    },
    /** Draw grid from arrays this.googleGridLat[] and this.googleGridLng[] */
    loadGoogleGrid() {
      console.log("Load Google Grid...", this.currentScale);
      // Object.entries(
      //   this.googleGridLng.getPath().getArray()
      // ).forEach(([key, value]) => {
      //   // const cellX = Number.parseInt(key.split(',')[0])
      //   // const cellY = Number.parseInt(key.split(',')[1])
      //   // console.log('value.lng(): ', value.lng())
      //   if (
      //     value.lng() >= this.geoBounds.sw.lng() &&
      //     value.lng() <= this.geoBounds.ne.lng()
      //   ) {
      //     console.log(
      //       'value.l(): ',
      //       this.googleGridLng.getPath()
      //     )

      //     const lngLines = new this.google.maps.Polyline({
      //       path: value,
      //       geodesic: false,
      //       strokeColor: '#504515',
      //       strokeOpacity: 1.0,
      //       strokeWeight: 1,
      //       zIndex: 2
      //     })
      //     lngLines.setMap(this.map)
      //   }
      //   // cellY >= this.cellBounds.sw.y &&
      //   // cellY <= this.cellBounds.ne.y
      // })
      // console.log(
      //   'gridkey: ',
      //   this.googleGridLng.getPath().getArray().toString()
      // )
      this.googleGridLng.setMap(this.map);
      this.googleGridLat.setMap(this.map);
      console.log("load finished!");
      // !! HACK FIX for loading from zoom in scale 1 -> 2 unload scale 1 cells
      if (this.currentScale >= 2) {
        this.unloadCellGrid();
      }
    },
    // ANCHOR ⁡⁣⁣⁢𝗘𝗠𝗢𝗝𝗜 𝗠𝗘𝗧𝗛𝗢𝗗𝗦 -----------------------------------------------------------------⁡
    // Take latlng of cursor position and get percent using mercator,
    // then convert it to grid coords at current scale
    // eslint-disable-next-line max-statements
    calcEmojiReadout(event) {
      // console.log("event: " + L.getMousePosition(event));
      // console.log("event: " + event.latlng.lng);
      const cursor = event.latlng;
      // console.log("map.metll: " + cursor);

      // console.log(`mercCursor: ${JSON.stringify(mercCursor)}`)

      const coordsLabel = document.getElementById("tdCursor");

      const percentWorld = this.coordinatesToPercentage(cursor.lat, cursor.lng);

      const percentWorldX = (cursor.lng + 180) / 360;
      const percentWorldY = percentWorld[1];
      const absoluteGridScaleAtZoom = Math.pow(29, this.currentScale + 1);
      const absoluteGridScaleAtZoomNext = Math.pow(29, this.currentScale + 2);

      this.mouseCellPosX = parseInt(percentWorldX * absoluteGridScaleAtZoom);
      this.mouseCellPosY = parseInt(percentWorldY * absoluteGridScaleAtZoom);
      this.mouseCellPosXNext = parseInt(
        percentWorldX * absoluteGridScaleAtZoomNext
      );
      this.mouseCellPosYNext = parseInt(
        percentWorldY * absoluteGridScaleAtZoomNext
      );

      console.log("percentWorld: " + percentWorld);
      console.log("absoluteGridScaleAtZoom: " + absoluteGridScaleAtZoom);
      console.log("this.currentScale: " + this.currentScale);
      console.log("mouseCellPosX: " + this.mouseCellPosX);
      console.log("mouseCellPosY: " + this.mouseCellPosY);

      this.getEmojiLocation();

      // console.log(cursor.lat, cursor.lon)
      // console.log(this.mouseCellPosX, this.mouseCellPosY)
      // console.log('emojis: ', this.getEmojiLocation())

      coordsLabel.innerHTML = ` ${this.emojiLocation}`;
      const elinkArea = document.getElementById("link-area");
      elinkArea.innerHTML = `http://www.w4a.care/${this.emojiLocation}`;
    },
    /** Set this.emojiLocation based on user position and return it
     * @param {number} x some x shit
     * @param {number} y idk y or some shit?
     * @return {emojiLocation}
     */
    // eslint-disable-next-line max-statements
    getEmojiLocation() {
      this.emojiLocation = "";
      // Each layer stored as numerical IDs absolute value
      const emojiAbsoluteLocationNumericalId = {
        x: [],
        y: [],
      };
      // Each layer stored as numerical IDs relative value
      const emojiLocationNumericalId = {
        x: [],
        y: [],
      };
      // const xEmojiLoc = Math.floor(
      //   this.mouseCellPosX / this.gridSizeUpOne()
      // ).toString(this.numberOfEmojis)
      // const yEmojiLoc = Math.floor(
      //   this.mouseCellPosY / this.gridSizeUpOne()
      // ).toString(this.numberOfEmojis)

      // emojiAbsoluteLocationNumericalId.push(0)
      for (let i = this.breakLayer(); i >= 0; i--) {
        // console.log(
        //   `breaklayer(): ${this.breakLayer()}`,
        //   this.mouseCellPosX,
        //   this.mouseCellPosY
        // )

        emojiAbsoluteLocationNumericalId.x.push(
          Math.floor(this.mouseCellPosX / Math.pow(this.numberOfEmojis, i))
        );
        emojiAbsoluteLocationNumericalId.y.push(
          Math.floor(this.mouseCellPosY / Math.pow(this.numberOfEmojis, i))
        );
      }

      // emojiLocationNumericalId.x.push(emojiAbsoluteLocationNumericalId.x[0])
      // emojiLocationNumericalId.y.push(emojiAbsoluteLocationNumericalId.y[0])

      for (let i = 0; i <= this.breakLayer(); i++) {
        // emojiLocationNumericalId.x.[i]
        const nextEmoji = {
          x: emojiAbsoluteLocationNumericalId.x[i] / Math.pow(29, i),
          y: emojiAbsoluteLocationNumericalId.y[i] / Math.pow(29, i),
        };
        for (let j = i; j > 0; j--) {
          nextEmoji.x -= emojiLocationNumericalId.x[i - j];
          nextEmoji.x *= 29;
          nextEmoji.y -= emojiLocationNumericalId.y[i - j];
          nextEmoji.y *= 29;
        }
        // !! SKETCHY ROUND! shouldnt be necessary
        nextEmoji.x = Math.round(nextEmoji.x);
        nextEmoji.y = Math.round(nextEmoji.y);
        // console.log(
        //   JSON.stringify(emojiAbsoluteLocationNumericalId),
        //   JSON.stringify(nextEmoji)
        // )

        emojiLocationNumericalId.x.push(nextEmoji.x);
        emojiLocationNumericalId.y.push(nextEmoji.y);

        console.log(
          nextEmoji,
          `${emojiLocationNumericalId.x[i].toString(this.numberOfEmojis)}`
        );

        this.emojiLocation += `${
          emojiIndexReference[
            emojiLocationNumericalId.x[i].toString(this.numberOfEmojis)
          ][emojiLocationNumericalId.y[i].toString(this.numberOfEmojis)]
        }`;
      }

      return this.emojiLocation;
    },
    /** Returns users grid scale value as [0,1,2,3]
     * @returns {number} returns 0,1,2,3
     */
    breakLayer() {
      if (this.map.getZoom() < 6) {
        return 0;
      } else if (this.map.getZoom() < 12) {
        return 1;
      } else if (this.map.getZoom() < 18) {
        return 2;
      }
      return 3;
    },
    percentageToCoordinates(x, y) {
      const longitude = 360 * x - 180;
      const latitude =
        (180 / Math.PI) *
        (2 * Math.atan(Math.exp((y * 2 - 1) * Math.PI)) - Math.PI / 2);

      // console.log(longitude, latitude);
      return [latitude, longitude];
    },
    coordinatesToPercentage(latitude, longitude) {
      const x = (longitude + 180) / 360;
      const y =
        (1 -
          Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 180 / 2)) /
            Math.PI) /
        2;

      return [x, y];
    },
    /** Converts pixel x and y to { lat() lng() }
     * @param {number} x Mouse position
     * @param {number} y Mouse position
     * @returns {Object} Object containing lat() and lng()
     */
    mousePositionToLatLng(x, y) {
      // console.log('dog', x, y)
      if (this.map.getBounds()) {
        const currentBounds = this.map.getBounds();
        const topLeftLatLng = new L.LatLng(
          currentBounds.getNorthEast().lat(),
          currentBounds.getSouthWest().lng()
        );
        const point = this.map.getProjection().fromLatLngToPoint(topLeftLatLng);
        // eslint-disable-next-line no-bitwise
        point.x += x / (1 << this.map.getZoom());
        // eslint-disable-next-line no-bitwise
        point.y += y / (1 << this.map.getZoom());

        return this.map.getProjection().fromPointToLatLng(point);
      }
      return null;
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
html,
body {
  height: 100%;
  padding: 0;
  margin: 0;
  background: rgb(14, 21, 30);
}
UI {
  position: absolute;
  height: 100%;
  width: 100%;
  z-index: 2;
}
#map {
  position: absolute;
  height: 100%;
  width: 100%;
  z-index: 1;
  background-color: #8ab4f8;
}
</style>
