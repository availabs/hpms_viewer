myObject = {

  mapState: null,
  roadType: 1,
  mapLoaded: false,

  load: function() {

    // load data from remote server
    $.ajax({url: "http://localhost:1337/hpms/"+myObject.mapState+"/geo",
            type: "POST",
            dataType: "json",
            data: {"roadType": myObject.roadType}
    })
    .done(function(data) {
        // clear svg
        myObject.svg.selectAll("g").remove();

        // draw map
        myObject.mapLoaded = true;
        myObject.drawRoutes(topojson.feature(data, data.objects.geo));
    });
  }, // end load

  drawRoutes: function(geoJSON) {
    var min = geoJSON.features[0].properties.aadt,
        max = geoJSON.features[0].properties.aadt,
        values = [];

    geoJSON.features.forEach(function(d) {
        if (d.properties.aadt > max)
            max = d.properties.aadt;
        else if (d.properties.aadt < min)
            min = d.properties.aadt;
        values.push(d.properties.aadt);
    });
    var colorDomain = ss.jenks(values, 10).splice(1, 9);

    function roadColor(val) {
        var colors = colorbrewer.RdYlGn[10].reverse();
        for (var i = 0; i < colorDomain.length; i++) {
            if (val < colorDomain[i])
                return colors[i];
        }
        return colors[colors.length-1];
    };

    var roadWidth = d3.scale.quantize()
                        .domain([7, 1])
                        .range([1, 2, 3, 4, 5, 6, 7]);

    var g = myObject.svg.append("g").attr("class", "leaflet-zoom-hide");

    var transform = d3.geo.transform({point: projectPoint}),
        path = d3.geo.path().projection(transform),
        bounds = path.bounds(geoJSON),
        feature = g.selectAll("path")
                   .data(geoJSON.features)
                   .enter()
                   .append("path")
                   .attr("stroke", function(d) {
                      return roadColor(d.properties.aadt);
                    })
                   .attr("stroke-width", function(d) {
                      return roadWidth(d.properties.roadType)+"px";
                    });

    // reposition map
    console.log(bounds);
    var geoCenter = d3.geo.centroid(geoJSON);
    myObject.leafletMap.setView([geoCenter[1], geoCenter[0]], 6);

    myObject.leafletMap.on("viewreset", reset);
    reset();

    // reposition the SVG to cover the features
    function reset() {
      // recalculate bounds
      bounds = path.bounds(geoJSON)
      var topLeft = bounds[0],
          bottomRight = bounds[1];

      // adjust SVG size and position
      myObject.svg.attr("width", bottomRight[0]-topLeft[0] + "px")
                  .attr("height", bottomRight[1]-topLeft[1] + "px")
                  .style("left", topLeft[0] + "px")
                  .style("top", topLeft[1] + "px");

      // apply transform to SVG group
      g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

      // draw paths
      feature.attr("d", path);
    }

    // use Leaflet to implement a d3 geometric transformation
    function projectPoint(x, y) {
      var point = myObject.leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
      this.stream.point(point.x, point.y);
    };

  },

  stateSelector: function() {

    var dropDown = d3.select("#selectDiv")
                    .append("select")
                    .attr("multiple", "multiple")
                    .attr("size", 8);;

    dropDown.append("option")
            .text("choose a state");

    var myData = [];

    // get all available table names
    $.ajax({url: "http://localhost:1337/hpms",
            type: "GET",
            async: false
           })
    .done(function(data){
        data.forEach( function(d) {
            if (d.id < 82) {
                var obj = {name:d.tableName, code:d.stateFIPS};
                myData.push(obj)
            }
        })
     });

    dropDown.selectAll("option")
            .data(myData)
            .enter()
            .append("option")
            .text(function(d) {return d.name;})
            .on('click', function(d) {
                console.log('???');
                myObject.mapState = d.code;
                myObject.load();
            });
  },

  typeSelector: function() {
    var roadType = d3.select("#selectDiv")
                        .append("select")
                        .attr("multiple", "multiple")
                        .attr("size", 8);

    roadType.append("option")
                     .text("All types")
                     .attr("value", 0);

    var values = [0, 1, 2, 3, 4, 5, 6, 7];

    roadType.selectAll("option")
            .data(values)
            .enter()
            .append("option")
            .text(function(d) { return "Type "+d; })
            .on('click', function(d) {
                myObject.roadType = d;
                if (myObject.mapLoaded)
                    myObject.load();
            });
  },

  createLegend: function() {
    var width = 90,
        height = 50;

    var svg = d3.select("#mapLegend")
                .append("svg")
                .attr("width", width*10)
                .attr("height", height);

    svg.selectAll("rect")
        .data(colorbrewer.RdYlGn[10].reverse())
        .enter()
        .append("rect")
        .attr("x", function(d, i) { return i*width;})
        .attr("height", height)
        .attr("width", width)
        .attr("fill", function(d) { return d;});
  }

}

window.onload = function() {
  myObject.mapLoaded = false;
  myObject.leafletMap = new L.Map("mapDiv", {center: [40, -100], zoom: 4})
                        .addLayer(new L.TileLayer("http://{s}.tiles.mapbox.com/v3/am3081.map-lkbhqenw/{z}/{x}/{y}.png"));

  myObject.svg = d3.select(myObject.leafletMap.getPanes().overlayPane).append("svg");

  myObject.stateSelector();
  myObject.typeSelector();
  myObject.createLegend();
}