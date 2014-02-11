myObject = {
  width: 960,
  height: 1160,

  load: function() {

    myObject.svg = d3.select("body").append("svg")
            .attr("width", myObject.width)
            .attr("height", myObject.height);

    d3.json("http://localhost:1337/hpms/42/geo", function(err, data) {
      myObject.geoData = data;
      myObject.visualize();
    });

  }, // end load

  visualize: function() {

    // convert the topoJSON object into geoJSON
    geoJSON = topojson.feature(myObject.geoData, myObject.geoData.objects.geo);

    // make an estimate projection
    var center = d3.geo.centroid(geoJSON);
    var scale = 150;
    var offset = [myObject.width/2, myObject.height/2];

    var projection = d3.geo.mercator()
                       .center(center)
                       .scale(scale)
                       .translate(offset);

    // make an estimate path
    var path = d3.geo.path().projection(projection)

    // adjust scale based on estimates
    var bounds = path.bounds(geoJSON);
    var hScale = scale*myObject.width/(bounds[1][0]-bounds[0][0]);
    var vScale = scale*myObject.height/(bounds[1][1]-bounds[0][1]);

    scale = (hScale < vScale) ? hScale : vScale;
    offset = [myObject.width-(bounds[0][0]+bounds[1][0])/2,
              myObject.height-(bounds[0][1]+bounds[1][1])/2];

    projection = d3.geo.mercator()
                   .center(center)
                   .scale(scale)
                   .translate(offset);

    path = d3.geo.path().projection(projection)

  	myObject.svg.selectAll("path")
            .data(geoJSON.features)
            .enter()
            .append("path")
            .attr("d", path);

  }, // end visualize

  createDropDown: function() {

    var myData = [];

    $.ajax({url: "http://localhost:1337/hpms",
            type : "GET",
            async:false
           })
     .done(function(data){

      data.forEach( function(d) {
        if (d.id < 82) {
          console.log(d.tableName)
          myData.push(d.tableName)
        }
      })
     });

     console.log(myData);

    myObject.svg = d3.select("body").append("select")
  }

} // end myObject

window.onload = function() {
  //myObject.load();
  myObject.createDropDown();
}