//declare map var in global scope
var map;
//function to instantiate the Leaflet map
function createMap() {
    //create the map
    map = L.map('map', {
        center: [20, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
    }).addTo(map);

    //call getData function
    getData();
};

function onEachFeature(feature, layer) {
    //no property named popupContent; instead, create html string with all properties
    var popupContent = "";
    if (feature.properties) {
        //loop to add feature property names and values to html string
        for (var property in feature.properties) {
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

//function to retrieve the data and place it on the map
function getData() {
    //load the data
    fetch("data/InboundTouristData.geojson")
        .then(function (response) {
            return response.json();
        })
        /*
        .then(function(json){
            //create a Leaflet GeoJSON layer and add it to the map
            L.geoJson(json).addTo(map);
        });
        */
        .then(function (json) {
            //create marker options
            var geojsonMarkerOptions = {
                radius: 10,
                fillColor: "#E3676E",
                color: "#ECABAC",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.8
            };
            //create a Leaflet GeoJSON layer and add it to the map
            L.geoJson(json, {
                onEachFeature: onEachFeature,
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                }
            }).addTo(map);
        });
};

document.addEventListener('DOMContentLoaded', createMap)