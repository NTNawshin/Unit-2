//declare map variable globally so all functions have access
var map;
var dataStats = {};

function createMap() {

    //create the map
    map = L.map('map', {
        center: [0, 0],
        zoom: 2
    });

    //add OSM base tilelayer
    L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        attribution: 'Tiles courtesy of the <a href="https://usgs.gov/">U.S. Geological Survey</a>'
    }).addTo(map);

    //call getData function
    getData(map);
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

function calcStats(data) {
    //create empty array to store all data values
    var allValues = [];
    //loop through each city
    for (var country of data.features) {
        //loop through each year
        for (var year = 2013; year <= 2020; year += 1) {
            //get population for current year
            var value = country.properties[String(year)];
            value = Number(parseFloat(value.replace(/,/g, '')))
            //add value to array
            allValues.push(value);
        }
    }

    //get min, max, mean stats for our array
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    //calculate meanValue
    var sum = allValues.reduce(function (a, b) { return a + b; });
    dataStats.mean = sum / allValues.length;
}


//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 5;
    //Flannery Apperance Compensation formula
    var radius = 1.0083 * Math.pow(attValue / dataStats["min"], 0.5715) * minRadius

    return radius;
};

function createPopupContent(properties, attribute) {
    //add city to popup content string
    var popupContent = "<p><b>Country:</b> " + properties.Country + "</p>";

    popupContent += "<p><b>Tourists in " + attribute + ":</b> " + properties[attribute] + "</p>";

    return popupContent;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes) {
    //Step 4: Assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#E3676E",
        color: "#ECABAC",
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(parseFloat(feature.properties[attribute].replace(/,/g, '')))

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    var popupContent = createPopupContent(feature.properties, attribute);
    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0, -options.radius)
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function createPropSymbols(data, attributes) {
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function (feature, latlng) {
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

function createLegend(attributes) {
    var attribute = attributes[0]
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //PUT YOUR SCRIPT TO CREATE THE TEMPORAL LEGEND HERE
            container.innerHTML = '<h3 class="temporalLegend">Tourists in <span class="year">' + attribute + '</span></h3>';

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="240px" height="125px">';

            //array of circle names to base loop on
            var circles = ["max", "mean", "min"];

            //Step 2: loop to add each circle and text to svg string
            for (var i = 0; i < circles.length; i++) {

                //Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);
                var cy = 120 - radius;

                //circle string            
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#E3676E" fill-opacity="0.8" stroke="#ECABAC" cx="65"/>';

                //evenly space out labels            
                var textY = i * 30 + 58;
                if (circles[i] == 'max') {
                    textY -= 25
                }

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="150" y="' + textY + '">' + Math.round(dataStats[circles[i]] * 100) / 100 + '</text>';

            };

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend', svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute) {
    document.querySelector("span.year").innerHTML = attribute;

    map.eachLayer(function (layer) {
        if (layer.feature && layer.feature.properties[attribute]) {
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(Number(parseFloat(props[attribute].replace(/,/g, ''))));
            layer.setRadius(radius);

            var popupContent = createPopupContent(props, attribute);
            //update popup with new content    
            popup = layer.getPopup();
            popup.setContent(popupContent).update();

        };
    });
};

//Step 1: Create new sequence controls
function createSequenceControls(attributes) {

    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>');
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');

            //disable any mouse event listeners for the container
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());

    //set slider attributes
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    //Step 5: click listener for buttons
    document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward') {
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 7 ? 0 : index;
            } else if (step.id == 'reverse') {
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 7 : index;
            };

            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            //Step 9: pass new attribute to update symbols
            updatePropSymbols(attributes[index]);
        })
    })

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function () {
        //Step 6: get the new index value
        var index = this.value;

        //Step 9: pass new attribute to update symbols
        updatePropSymbols(attributes[index]);
    });
};

function processData(data) {
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties) {
        //only take attributes with population values
        if (attribute.indexOf("20") > -1) {
            attributes.push(attribute);
        };
    };

    return attributes;
};

//Import GeoJSON data
function getData(map) {
    //load the data
    fetch("data/InboundTouristData.geojson")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            //create an attributes array
            var attributes = processData(json);
            calcStats(json);
            createPropSymbols(json, attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
        })
};



document.addEventListener('DOMContentLoaded', createMap)