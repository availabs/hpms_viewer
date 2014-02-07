var geoData,
	width = 960,
    height = 1160;



d3.json("http://localhost:1337/hpms/34/geo", function(err, data) {
	geoData = data;
  	visualize();
});

function visualize() {

	var svg = d3.select("body").append("svg")
    		.attr("width", width)
    		.attr("height", height);

    var projection = d3.geo.albers()
    .center([72, 44])
    //.rotate([4.4, 0])
    .parallels([30, 40])
    .scale(500000)
    .translate([width / 2, height / 2]);

	svg.selectAll("path")
      .data(topojson.feature(geoData, geoData.objects.geo).features)
      .enter()
      .append("path")
      .attr("d", d3.geo.path().projection(projection));

}