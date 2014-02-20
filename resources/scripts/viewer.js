myObject = {

  mapState: null,
  roadType: 0,
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
        myObject.visualize(topojson.feature(data, data.objects.geo));
      });
  }, // end load

  visualize: function(geoJSON) {
    
    var min = d3.min(geoJSON.features, function(d) {
      return d.properties.aadt;
    });
    var max = d3.max(geoJSON.features, function(d) {
      return d.properties.aadt;
    });

    var values = [];
    geoJSON.features.forEach(function(d) {
      values.push(d.properties.aadt);
    });
    var domain = ss.jenks(values, 10);
    console.log(min, domain, max)

    /*
    var roadColor = d3.scale.linear()
                      .domain([(max*.75), (min+(max/2))/2, min])
                      .range([colorbrewer.RdYlGn[9][0], colorbrewer.RdYlGn[9][4], colorbrewer.RdYlGn[9][8]])
                      .clamp([true]);
    
    var roadColor = d3.scale.quantize()
                      .domain([max, min])
                      .range(colorbrewer.RdYlGn[10]);
    */
    var roadColor = d3.scale.quantile()
                      .domain(domain)
                      .range(colorbrewer.RdYlGn[10]);

    var roadWidth = d3.scale.quantize()
                      .domain([7, 1])
                      .range([1, 2, 3, 4, 5, 6, 7]);

    // reposition map
    var geoCenter = d3.geo.centroid(geoJSON);
    myObject.leafletMap.setView([geoCenter[1], geoCenter[0]], 7);

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

  }, // end visualize

  stateSelector: function() {

    var dropDown = d3.select("#header")
                     .append("select")
                     .on("change", function() {
                       myObject.mapState = this.options[this.selectedIndex].value;
                       myObject.load();
                     });

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
            .attr("value", function(d) {return d.code;});
  }, // end createDropDown

  typeSelector: function() {
    var roadType = d3.select("#header")
                     .append("select")
                     .attr("multiple", "multiple")
                     .attr("size", 8)
                     .on("change", function() {
                       myObject.roadType = this.options[this.selectedIndex].value;
                       if (myObject.mapLoaded)
                         myObject.load();
                     });

    roadType.append("option")
                     .text("All types")
                     .attr("value", 0);

    var values = [0, 1, 2, 3, 4, 5, 6, 7];

    roadType.selectAll("option")
            .data(values)
            .enter()
            .append("option")
            .text(function(d) { return "Type "+d; })
            .attr("value", function(d) { return d; });
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

} // end myObject

window.onload = function() {
  myObject.mapLoaded = false;
  myObject.leafletMap = new L.Map("mapDiv", {center: [40, -100], zoom: 4})
                        .addLayer(new L.TileLayer("http://{s}.tiles.mapbox.com/v3/am3081.map-lkbhqenw/{z}/{x}/{y}.png"));

  myObject.svg = d3.select(myObject.leafletMap.getPanes().overlayPane).append("svg");

  myObject.stateSelector();
  myObject.typeSelector();
  myObject.createLegend();
}