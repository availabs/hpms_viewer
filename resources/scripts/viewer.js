(function() {
    myObject = {
        version: "0.1.0-alpha"
    };

    myObject.state = 0;
    myObject.roadType = 1;
    myObject.fadeDuration = 250;
    myObject.mapLoaded = false;
    myObject.leafletMap = null;
    myObject.svg = null;
    myObject.group = null;
    myObject.dropDown = null;
    myObject.selector = null;

    myObject.featureCollection = {type: 'FeatureCollection', features: []};
    myObject.geoData = [];

    // constructor for cached states object
    myObject.LoadedStates = function() {
        var self = this,
            states = [];

        self.addState = function(code) {
            if (self.getState(code) == false) {
                states.push(new myObject.stateObj(code));
            }
        };

        self.addStateData = function(code, type, geo) {
            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.addGeoData(type, geo);
            } else {
                self.addState(code);
                self.addStateData(code, type, geo);
            }
        };

        self.getState = function(code) {
            for (var i = 0; i < states.length; i++) {
                if (states[i].getFIPS() == code)
                    return states[i];
            }
            return false;
        };

        self.getGeoData = function(code, type) {
            var stateObj = self.getState(code);
            //console.log(stateObj);
            //console.log(stateObj && stateObj.checkTypes(type));
            if (stateObj) {
                return stateObj.getGeoData(type);
            }
            return false;
        };

        self.getAllGeoData = function() {
            var gd = [];

            states.forEach(function(state) {
                var d = state.getAllGeoData();
                gd = gd.concat(d);
            })
            return gd;
        };

        self.getSelectedTypes = function(code) {
            var stateObj = self.getState(code);
            if (stateObj) {
                return stateObj.getSelectedTypes();
            }
            return false;
        };

        self.setSelectedType = function(code, type) {
            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.setSelectedType();
            }
        }

        self.removeSelectedType = function(code, type) {
            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.removeSelectedType(type);
            }
        }
    };

    // constructor for state objects
    myObject.stateObj = function(code) {
        var self = this,
            FIPS = code,
            loadedTypes = [],
            selectedTypes = [],
            geoData = [];

        self.getFIPS = function() {
            return FIPS;
        }

        self.getSelectedTypes = function() {
            return selectedTypes;
        }

        self.setSelectedType = function(type) {
            if (selectedTypes.indexOf(type) === -1)
                selectedTypes.push(type);
        }

        self.removeSelectedType = function(type) {
            var index = selectedTypes.indexOf(type);

            if (index == -1)
                return;

            selectedTypes = selectedTypes.splice(0, index) + selectedTypes.splice(index+1);
        }

        self.addGeoData = function(type, geo) {
            if (!self.checkTypes(type)) {
                loadedTypes.push(type);
                geoData.push(new geoDataObj(type, geo));
            }
        };

        self.checkTypes = function(type) {
            if (loadedTypes.indexOf(type) == -1)
                return false
            return true;
        };

        self.getGeoData = function(type) {
            if (!self.checkTypes(type))
                return false;
            for (var i = 0; i < geoData.length; i++) {
                if (geoData[i].type == type)
                    return geoData[i].geoData;
            }
        };

        self.getAllGeoData = function() {
            var gd = [];
            geoData.forEach(function(data) {
                gd = gd.concat(data.geoData);
            });
            return gd;
        };

        // geoData object constructor
        function geoDataObj(type, geo) {
            var self = this;
            self.geoData = geo;
            self.type = type;
        };
    };

    // data cache object constructor
    myObject.DataCache = function() {
        var self = this;

        self.requestData = function(code, type) {
            console.log('requesting', code, type);
            var d = myObject.loadedStates.getGeoData(code, type);
            //console.log(d);
            if (d) {
                console.log('loaded from cache');
                myObject.drawRoutes(d, type);
            } else {
                queryAPI(code, type);
            }
        }

        function queryAPI(code, type) {
            $.ajax({url: "http://localhost:1337/hpms/"+code+"/geo",
                    type: "POST",
                    dataType: "json",
                    data: {"roadType": type},
                    async: true
            })
            .done(function(data) {
                console.log('ajax request returned');
                // draw map
                var geo = topojson.feature(data, data.objects.geo);

                myObject.loadedStates.addState(code);
                myObject.loadedStates.addStateData(code, type, geo);

                myObject.drawRoutes(geo, type);

                //console.log(myObject.loadedStates.getGeoData(code, type));
            });
        }
    };

    myObject.colorRoutes = function() {
        var data = myObject.featureCollection;

        var min = data.features[0].properties.aadt,
            max = data.features[0].properties.aadt,
            values = [];

        data.features.forEach(function(d) {
            if (d.properties.aadt > max)
                max = d.properties.aadt;
            else if (d.properties.aadt < min)
                min = d.properties.aadt;
            values.push(d.properties.aadt);
        });

        var colors = colorbrewer.RdYlGn[Math.min(values.length, 10)].slice();

        myObject.roadColor = d3.scale.quantile()
                            .domain(values)
                            .range(colors.reverse());
        
        d3.selectAll('.road')
            .attr("stroke", function(d) {
              return myObject.roadColor(d.properties.aadt);
            });
                            
        myObject.createLegend();
        myObject.legend.style('display', 'block');
    }

    myObject.drawRoutes = function(data, type) {
        myObject.geoData.concat(data);
        //console.log('loading', myObject.newState);
        //console.log('geo data', data);

        //myObject.group.selectAll('path').remove();

        //console.log(myObject.roadColor.domain().length);
        //console.log(myObject.roadColor.range());
        //console.log(myObject.roadColor.quantiles());

        var roadWidth = d3.scale.quantize()
                            .domain([7, 1])
                            .range([1, 2, 3, 4, 5, 6, 7]);

        var transform = d3.geo.transform({point: projectPoint}),
            path = d3.geo.path().projection(transform),
            bounds = path.bounds(data);

        var id = ['id', myObject.state, type].join('-'),
            features = myObject.group.selectAll("."+id)
                        .data(data.features);

        features.enter()
                .append("path")
                .attr('class', id + ' road')
               .attr("stroke-width", function(d) {
                  return roadWidth(d.properties.roadType)+"px";
                });

        myObject.featureCollection.features = myObject.featureCollection.features.concat(data.features);

        myObject.colorRoutes();

        // reposition map
        //console.log('area bounds', bounds);
        var geoCenter = d3.geo.centroid(data);

        myObject.leafletMap.on("zoomend", reset);

        reset();

        // reposition the SVG to cover the features
        function reset() {
            //console.log('drawing', myObject.newState, 'map zoom', myObject.leafletMap.getZoom());

            // recalculate bounds
            bounds = path.bounds(myObject.featureCollection);
            var topLeft = bounds[0],
                bottomRight = bounds[1];

            // adjust SVG size and position
            myObject.svg.attr("width", bottomRight[0]-topLeft[0] + "px")
                .attr("height", bottomRight[1]-topLeft[1] + "px")
                .style("left", topLeft[0] + "px")
                .style("top", topLeft[1] + "px");

            // apply transform to SVG group
            myObject.group.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
            // draw paths
            features.attr("d", path);

            myObject.mapLoaded = true;
        };

        // use Leaflet to implement a d3 geometric transformation
        function projectPoint(x, y) {
            var point = myObject.leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        };
    }; // end drawRoutes
    
    /*
    Constructor function for drop down menu.
    */
    myObject.DropDown = function(el) {
        var self = this;
        
        self.IDtag = el;

        var visible = false;
        
        self.move = function(i) {
            i = i*160+'px';
            d3.select(self.IDtag).style('left', i);
        };
    
        self.populate = function(list, func) {
            var options = d3.select(self.IDtag)
                            .selectAll('a')
                            .data(list);
                
            options.exit().remove();
                            
            options.enter().append('a');
            
            options.text(function(d) { return d.text; })
                .on('click', function(d) {
                    //d3.selectAll(self.IDtag + ' a');
                    func(d.value);
                    //self.toggle();
                });
        };
    
        self.toggle = function() {
            visible = !visible;
            
            if (visible) {
                myObject.showElement(self.IDtag);
            }
            else {
                myObject.hideElement(self.IDtag);
            }
        };

        self.makeSelection = function(code) {
            myObject.state = code;
            myObject.selector.toggle(code);
        }
    };

    function requestStates() {
        var options = [];
        $.ajax({url: "http://localhost:1337/hpms",
                    type: "GET",
                    async: false
                })
        .done(function(data){
            data.forEach( function(d) {
                if (d.id < 82) {
                    var obj = {text: formatStateName(d.tableName), value: d.stateFIPS};
                    options.push(obj)
                }
            })
         });
        return options.sort(sortStates);
    };

    function formatStateName(name) {
        var regex = /(\d+)/;

        name = name.replace(regex, ' ' + '$1');

        regex =/(new|south|west|north|rhode)/;

        name = name.replace(regex, '$1' + ' ');

        return esc.capitalizeAll(name);
    };

    function sortStates(a, b) {
            if (a.text < b.text)
                return -1
            else if (b.text < a.text)
                return 1;
            return 0;
    };

    function consoleLog(msg) {
        console.log(msg);
    }
                    
    myObject.initializeMeunBar = function() {
        myObject.dropDown = new myObject.DropDown('#dropDown');
        myObject.selector = new myObject.Selector('#selector');

        // get all available table names
        var options = requestStates();

        var menuData = [{ name: 'State Selector', options: options, func: myObject.dropDown.makeSelection }];

        d3.select('#navBar')
            .selectAll('a')
            .data(menuData)
            .enter().append('a')
            .text(function(d) { return d.name; })
            .on("click", function(d) {
                myObject.dropDown.toggle();
            })
            .each(function(d, i) {
                myObject.dropDown.populate(d.options, d.func);
            });
    };
    
    myObject.showElement = function(el) {
        d3.select(el)
            .style("display", "block")
            .transition()
            .duration(myObject.fadeDuration)
            .style("opacity", 1.0);
    };
    
    myObject.hideElement = function(el) {
        d3.select(el)
            .transition()
            .duration(myObject.fadeDuration)
            .style("opacity", 0.0)
            .each("end", function() {
                d3.select(this)
                    .style("display", "none");
            });
    };

    myObject.Selector = function(id) {
        var self = this;
        
        self.IDtag = id;

        var visible = false;

        var selections = ['1', '2', '3', '4', '5', '6', '7'],
            baseWidth = 40;
            totalWidth = baseWidth*selections.length,
            timer = false;

        d3.select(self.IDtag)
            .style('display', 'none')
            .selectAll('a')
            .data(selections).enter()
            .append('a')
            .attr('name', function(d) { return d; })
            .text(function(d) { return d; })
            .on('mouseover', function(d, i) {
                if (timer) {
                    window.clearTimeout(timer);
                    timer = false;
                }
                resize(this);
            }).on('mouseout', function(d, i) {
                if (!timer) {
                    timer = window.setTimeout(normalSize, 250);
                }
            })
            .on('click', function(d) {
                myObject.dataCache.requestData(myObject.state, +d);
            });
    
        self.toggle = function(value) {
            visible = value;
            
            if (visible) {
                myObject.showElement(self.IDtag);
            }
            else {
                myObject.hideElement(self.IDtag);
            }
        };

        function resize(el) {
            d3.select(self.IDtag)
                .selectAll('a')
                .transition()
                .duration(150)
                .ease('linear')
                .style('width', function() {
                    var end = this == el ? Math.round(totalWidth*(1/3)) : Math.round((totalWidth*(2/3))/(selections.length-1));
                    var cur = parseInt(d3.select(this).style('width'));
                    return cur + (end - cur)*(3/4)+"px";
                })
                .each('end', function(){
                    d3.select(this).text(function() {
                        return this == el ? 'type '+d3.select(this).attr('name') : d3.select(this).attr('name');
                    })
                })
                .transition()
                .duration(50)
                .ease('linear')
                .style('width', function() {
                    return this == el ? Math.round(totalWidth*(1/3))+"px" : Math.round((totalWidth*(2/3))/(selections.length-1))+"px";
                });
        };

        function normalSize(){
            d3.select(self.IDtag)
                .selectAll('a')
                .transition()
                .duration(50)
                .ease('linear')
                .style('width', function() {
                    var end = totalWidth/selections.length;
                    var cur = parseInt(d3.select(this).style('width'));
                    return cur + (end - cur)*(1/4)+"px";
                })
                .text(function() { return d3.select(this).attr('name'); })
                .transition()
                .duration(150)
                .style('width', function() { return totalWidth/selections.length+"px"; });
        };
    };

    myObject.createLegend = function() {
        var length = myObject.roadColor.range().length,
            breaks = myObject.roadColor.quantiles(),
            width = 90,
            height = 30,
            colors = colorbrewer.RdYlGn[length].slice();

        myObject.legend
                .attr("width", width*length)
                .attr("height", height);

        var boxes = myObject.legend.selectAll("rect")
                        .data(colors.reverse())

        boxes.exit().remove();

        boxes.enter().append("rect");

        boxes.attr("x", function(d, i) { return i*width;})
            .attr("height", height)
            .attr("width", width)
            .attr("fill", function(d) { return d;});
    }; // end createLegend
    
    myObject.init = function() {

        myObject.initializeMeunBar();

        myObject.loadedStates = new myObject.LoadedStates();
        myObject.dataCache = new myObject.DataCache();

        myObject.mapLoaded = false;
        myObject.leafletMap = new L.Map("mapDiv", {center: [40, -100], zoom: 5, zoomControl: false, minZoom: 4})
            .addLayer(new L.TileLayer("http://{s}.tiles.mapbox.com/v3/am3081.map-lkbhqenw/{z}/{x}/{y}.png"));

        myObject.svg = d3.select(myObject.leafletMap.getPanes().overlayPane).append("svg");
        myObject.group = myObject.svg.append("g").attr("class", "leaflet-zoom-hide");
        myObject.legend = d3.select("#mapLegend").append("svg");
    };                                
    this.myObject = myObject;
})();

window.onload = function() {
    myObject.init();
}