myObject = {

  roadType: 0,

  load: function(code) {

    // load data from remote server
    $.ajax({url: "http://localhost:1337/hpms/"+code+"/geo",
            type: "POST",
            dataType: "json",
            data: {"roadType": myObject.roadType}
           })
     .done(function(data) {
       myObject.visualize(topojson.feature(data, data.objects.geo));
     });

  }, // end load

  visualize: function(geoJSON) {
    // clear svg
    myObject.svg.selectAll("g").remove();

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
                   .append("path");

    myObject.leafletMap.on("viewreset", reset)
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

  createDropDown: function() {

    var dropDown = d3.select("#header")
                     .append("select")
                     .on("change", function() {
                       myObject.load(this.options[this.selectedIndex].value);
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
                     .on("change", function() {
                       myObject.roadType = this.options[this.selectedIndex].value;
                     });

    roadType.append("option")
                     .text("All types")
                     .attr("value", 0);

    roadType.append("option")
                     .text("Type 1")
                     .attr("value", 1);

    roadType.append("option")
                     .text("Type 2")
                     .attr("value", 2);

    roadType.append("option")
                     .text("Type 3")
                     .attr("value", 3);

    roadType.append("option")
                     .text("Type 4")
                     .attr("value", 4);

    roadType.append("option")
                     .text("Type 5")
                     .attr("value", 5);

    roadType.append("option")
                     .text("Type 6")
                     .attr("value", 6);

    roadType.append("option")
                     .text("Type 7")
                     .attr("value", 7);
  }

} // end myObject

window.onload = function() {
  myObject.leafletMap = new L.Map("mapDiv", {center: [40, -100], zoom: 4})
                        .addLayer(new L.TileLayer("http://{s}.tiles.mapbox.com/v3/am3081.map-lkbhqenw/{z}/{x}/{y}.png"));

  myObject.svg = d3.select(myObject.leafletMap.getPanes().overlayPane).append("svg");

  myObject.createDropDown();

  myObject.typeSelector();
}