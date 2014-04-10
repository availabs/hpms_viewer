(function() {
    var myObject = {
        version: "0.1.0-beta"
    };

    myObject.state = 0;             // currently selected state
    myObject.fadeDuration = 250;    // fade duration for hidable objects
    myObject.leafletMap = null;     // leaflet map object
    myObject.svg = null;            // svg draw area
    myObject.dropDown = null;       // state selector drop down object
    myObject.selector = null;       // road type selector object

    // Constructor for cached state objects.
    // This object contains methods for adding loaded states and managing
    // currently loaded states' displayed road types.
    // This is a higher level object that delegates specific tasks to the
    // lower level state objects.
    // usage: var name = new LoadedStates();
    myObject.LoadedStates = function() {
        var self = this,    // used to access object from inside of functions
            states = [];    // list of currently loaded state objects

        self.type = 'FeatureCollection';    // label to make object look like a geoJSON object
        self.features = [];                 // array to hold all currently selected geoJSON features

        // Method to add a new state object to states array
        // parameter: code - state FIPS code used to uniquely identify state objects
        self.addState = function(code) {
            code = +code;
            if (self.getState(code) == false) {
                states.push(new myObject.StateObj(code));
            }
        };

        // Method to add geo data to a state object
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        // parameter: geo  - geoJSON data for specified state and type
        self.addStateData = function(code, type, geo) {
            code = +code;
            type = +type;

            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.addGeoData(type, geo);
            } else {
                self.addState(code);
                self.addStateData(code, type, geo);
                return
            }

            self.updateFeatures(geo.features);
        };

        // Method for updating currently selected features.
        // parameter: features - new features to ad to object's features array
        self.updateFeatures = function(features) {
            self.features = self.features.concat(features);
        }

        // Method used to determine if object's features array holds geoJSON data.
        // return: true if data, false if no data
        self.hasDrawableFeatures = function() {
            return self.features.length != 0;
        }

        // Method to access a loaded state object
        // parameter: code - state FIPS code used to uniquely identify state objects
        // return: the state object if it exists, false otherwise
        self.getState = function(code) {
            code = +code;
            for (var i = 0; i < states.length; i++) {
                if (states[i].getFIPS() == code)
                    return states[i];
            }
            return false;
        };

        // Method to retrieve a state object's geo data by road type
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        // return: the requested geoJSON data, false otherwise
        self.getGeoData = function(code, type) {
            code = +code;
            type = +type;
            var stateObj = self.getState(code);
            if (stateObj) {
                return stateObj.getGeoData(type);
            }
            return false;
        };

        // Method for retrieving all geoJSON data currently loaded
        // return: an array of geoJSON data
        self.getAllGeoData = function() {
            var gd = [];

            states.forEach(function(state) {
                var d = state.getAllGeoData();
                gd = gd.concat(d);
            })
            return gd;
        };

        // Method for retrieving all geoJSON data for all states
        // and types currently selected by user.
        // return: an array of geoJSON data
        self.getAllSelectedGeoFeatures = function() {
            var gd = [];

            states.forEach(function(state) {
                var d = state.getAllSelectedGeoFeatures();
                gd = gd.concat(d);
            })
            return gd;
        }

        // Method for retrieving all currently selected road types for the specified state
        // parameter: code - state FIPS code used to uniquely identify state objects
        // return: an array of selected road types if the requested state is loaded (this
        // array could be empty if no types are selected), otherwise an empty array
        self.getSelectedTypes = function(code) {
            code = +code;
            var stateObj = self.getState(code);
            if (stateObj) {
                return stateObj.getSelectedTypes();
            }
            return [];
        };

        // Method for setting a state object's selected road type
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        self.setSelectedType = function(code, type) {
            code = +code;
            type = +type;
            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.setSelectedType(type);
            }
        };

        // Method for removing a road type from a state object's list of selected types
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        self.removeSelectedType = function(code, type) {
            code = +code;
            type = +type;
            var stateObj = self.getState(code);
            if (stateObj) {
                stateObj.removeSelectedType(type);
                self.removeFromMap(code, type);
                self.updateFeaturesList();
            }
        };

        // Method to remove all road types from a state object's list of selected types
        // parameter: code - state FIPS code used to uniquely identify state objects
        self.unselectAllTypes = function(code) {
            code = +code;
            var stateObj = self.getState(code);
            if (stateObj) {
                var types = stateObj.getSelectedTypes();
                for (var i = types.length-1; i >= 0; i--) {
                    self.removeFromMap(code, types[i]);
                    stateObj.removeSelectedType(types[i]);
                }

                self.updateFeaturesList();
            }
        }

        // Method to remove specified state object's road type from the map
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        self.removeFromMap = function(code, type) {
            d3.selectAll('.id-'+code+'-'+type).remove();
        }

        // Method used to reload the LoadedStates object's features array.
        // Called when a state object's road type is unselected.
        self.updateFeaturesList = function() {
            self.features = self.getAllSelectedGeoFeatures();
        };
    };

    // Constructor for state objects.
    // This object contains methods for managing each loaded state.
    // parameter: code - state FIPS code used to uniquely identify this state object
    // usage: var name = new stateObj(FIPS_code);
    myObject.StateObj = function(code) {
        var self = this,            // used to access object from inside of functions
            FIPS = code,            // unique state object ID code
            loadedTypes = [],       // all currently loaded road types
            selectedTypes = [],     // all road types currently selected by user
            geoData = [];           // array of geoJSON data for all loaded road types

        // Method to retrieve the state object's unqiue FIPS code.
        // return: the state object's FIPS code as an integer
        self.getFIPS = function() {
            return FIPS;
        }

        // Method to retrieve all road types currently selected by user.
        // return: an array of integers of selected road types
        self.getSelectedTypes = function() {
            return selectedTypes;
        }

        // Method for adding a user selected road type to array of selected road types.
        // parameter: type - road type code
        self.setSelectedType = function(type) {
            if (selectedTypes.indexOf(type) === -1) {
                selectedTypes.push(type);
            }
        }
        // Method for removing a road types from array of user selected road types.
        // parameter: type - road type code
        self.removeSelectedType = function(type) {
            var index = selectedTypes.indexOf(type);

            if (index == -1)
                return;

            selectedTypes.splice(index, 1);
        }

        // Method to add geo data to the state object.
        // parameter: type - road type code
        // parameter: geo  - geoJSON data for specified type
        self.addGeoData = function(type, geo) {
            if (!self.checkLoadedTypes(type)) {
                loadedTypes.push(type);
                geoData.push(new geoDataObj(type, geo));
            }
        };

        // Method used to check whether or not a specific road type
        // is currently loaded.
        // parameter: type - road type code
        // return: true if queried type is currently loaded, otherwise false
        self.checkLoadedTypes = function(type) {
            if (loadedTypes.indexOf(type) == -1)
                return false
            return true;
        };

        // Method used to retrieve the geoJSON data for specified road type.
        // parameter: type - road type code
        // return: a geoJSON feature collection for the requested road type
        self.getGeoData = function(type) {
            if (!self.checkLoadedTypes(type))
                return false;
            for (var i = 0; i < geoData.length; i++) {
                if (geoData[i].type == type)
                    return geoData[i].geoData;
            }
        };

        // Method used to retrieve all currently loaded geoJSON data.
        // return: an array of all currently loaded geoJSON data
        self.getAllGeoData = function() {
            var gd = [];
            geoData.forEach(function(data) {
                gd = gd.concat(data.geoData);
            });
            return gd;
        };

        // Method used to retrieve geoJSON of all user selected road types.
        // return: an array of all currently selected geoJSON data
        self.getAllSelectedGeoFeatures = function() {
            var gd = [];
            selectedTypes.forEach(function(type) {
                gd = gd.concat(self.getGeoData(type).features);
            });
            return gd;
        };

        // geoJSON data object constructor.
        // Private object used to hold geoJSON data for a state object's loaded road type.
        // parameter: type - road type code
        // parameter: geo  - geoJSON data for specified type
        // usage: var name = new geoDataObj(road_type, geoJSON);
        function geoDataObj(type, geo) {
            var self = this;
            self.geoData = geo;
            self.type = type;
        };
    }; // end StateObj

    // Data cache object constructor.
    // Object used to retrieve geoJSON data from LoadedStates object or query backend API
    // if the specified state is not already loaded.
    // usage: var name = new DataCache();
    myObject.DataCache = function() {
        var self = this,
            object,
            func,
            loading = 0;

        // Method used to track whether or not data is loading.
        // parameter: load - 1 for loading, -1 for done loading
        function isLoading(load) {
            loading += load;

            if (loading) {
                d3.select('#loading').style('display', 'block');
            } else {
                d3.select('#loading').style('display', 'none');
            }
        }

        // Method used to retrieve geoJSON data from cache.
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        self.requestData = function(code, type) {
            isLoading(1);

            var d = myObject.loadedStates.getGeoData(code, type);

            if (!d) {
                queryAPI(code, type);
            } else {
                myObject.loadedStates.updateFeatures(d.features);
                myObject.loadedStates.setSelectedType(myObject.state, type);
                myObject.drawRoutes(d, type);
                myObject.colorRoutes();
                isLoading(-1);
            }
        }

        // Private method used by DataCache object to query backend API for
        // unloaded geoJSON data.
        // parameter: code - state FIPS code used to uniquely identify state objects
        // parameter: type - road type code
        // notes: Currently, the object references other project objects' names directly.
        // This object would not work in other projects without updating those names.
        function queryAPI(code, type) {
            d3.xhr("http://localhost:1337/hpms/"+code+"/geo")
                .response(function(request) {
                    return JSON.parse(request.responseText);
                })
                .post(JSON.stringify({"roadType": type}), function(error, data) {
                    // The backend API sends geometry data in the topoJSON format.
                    // The opoJSON data must be converted into geoJSON data to be usable.
                    var geo = topojson.feature(data, data.objects.geo);

                    if (geo.features.length > 0) {
                        myObject.loadedStates.addStateData(code, type, geo);
                        myObject.loadedStates.setSelectedType(myObject.state, type);
                        myObject.drawRoutes(geo, type);
                        myObject.colorRoutes();
                    }

                    isLoading(-1);
                });
        }
    }; // end DataCache

    // Method to color routes on the map.
    myObject.colorRoutes = function() {
        // retrieve geoJSON data from LoadedStates object.
        var data = myObject.loadedStates;

        // hide legend and return if there are no routes selected
        if (!myObject.loadedStates.hasDrawableFeatures()) {
            myObject.hideElement('#mapLegend');
            return;
        }

        // extract unqiue aadt data from geoJSON features and push into new array
        var dataSet = [];
        data.features.forEach(function(d) {
            if (dataSet.indexOf(d.properties.aadt) == -1)
                dataSet.push(d.properties.aadt);
        });

        // Select appropriate colorbrewer color array based on number of data.
        // Array size is from [1, 10].
        var colors = colorbrewer.RdYlGn[Math.min(dataSet.length, 10)].slice();

        // creates a d3 quantile scale based on input data and colorbrewer colors.
        // This scale does not generate the actual quantiles of the data set.
        // Only unique data elements are used to determine the quantiles.
        // This was done to handle a few cases where data for a state's road type
        // contained more than 10 elements but only two values; i.e. there was a lot
        // of repeated data. These cases caused the quantile scale to generate multiple
        // multiple quantiles for the same value.
        myObject.roadColor = d3.scale.quantile()
                            .domain(dataSet)
                            .range(colors.reverse());
        
        // select and color all roads
        d3.selectAll('.road')
            .attr("stroke", function(d) {
              return myObject.roadColor(d.properties.aadt);
            });

        // create and display legend
        myObject.createLegend(colors);
        myObject.showElement('#mapLegend');

    } // end colorRoutes

    // Method for drawing routes on the map.
    myObject.drawRoutes = function(data, type) {
        // create road width scale. Type 1 roads are drawn larger than type 7.
        var roadWidth = d3.scale.quantize()
                .domain([7, 1])
                .range([1, 2, 3, 4, 5, 6, 7]);

        // Create a unique id for the new road type group and assign the
        // id as a class. This allows the group to be selected and removed later.
        var id = ['id', myObject.state, type].join('-');
        var features = myObject.svg.append('g')
                .attr("class", id)
                .selectAll('path')
                .data(data.features);

        // create new path elements for each data element
        features.enter()
            .append("path")
            .attr('class', 'road')
            .attr("stroke-width", function(d) {
                return roadWidth(d.properties.roadType)+"px";
            });

        // create an event listener to update map when it is zoomed
        myObject.leafletMap.on("zoomend", reset);

        // update map
        reset();

        // This method updates the map.
        function reset() {
            // Ensure nothing is 
            if (!myObject.loadedStates.hasDrawableFeatures())
                return;

            // these d3 function are needed to properly project the paths onto the map
            var transform = d3.geo.transform({point: projectPoint}),
                path = d3.geo.path().projection(transform),
                bounds = path.bounds(myObject.loadedStates);

            var topLeft = bounds[0],
                bottomRight = bounds[1];

            // adjust SVG size and position
            myObject.svg.attr("width", bottomRight[0]-topLeft[0] + "px")
                .attr("height", bottomRight[1]-topLeft[1] + "px")
                .style("left", topLeft[0] + "px")
                .style("top", topLeft[1] + "px");

            // apply transform to SVG group
            myObject.svg.selectAll('g').attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

            // draw paths with updates transformations
            myObject.svg.selectAll('g').selectAll('path').attr('d', path);
        };

        // use Leaflet to implement a d3 geometric transformation
        function projectPoint(x, y) {
            var point = myObject.leafletMap.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        };
    }; // end drawRoutes
    
    // Constructor function for drop down menu.
    // parameter: el - id of the div that contains dropdown
    // usage: var name = new DropDown('#id');
    myObject.DropDown = function(el) {
        var self = this;
        
        self.IDtag = el;

        var visible = false,    // used to control visibility toggle
            focus = null;       // holds the current selection
    
        // Method to populate drop down with selections.
        // parameter: list - array of selections
        // parameter: func - function to be called when a selection is clicked
        self.populate = function(list, func) {
            var options = d3.select(self.IDtag)
                    .selectAll('a')
                    .data(list);
                
            // remove excess elements
            options.exit().remove();
                            
            // append new elements
            options.enter().append('a');
            
            // update elements
            options.text(function(d) { return d.text; })
                .on('click', function(d) {
                    func(d.value);
                    self.toggleSelection(this, d.value);
                });
        };
    
        // Method to hide or show drop down.
        self.toggleVisible = function() {
            visible = !visible;
            
            if (visible) {
                myObject.showElement(self.IDtag);
            }
            else {
                myObject.hideElement(self.IDtag);
            }
        };

        // Method used to track selections in drop down menu.
        // parameter: el - the clicked state's DOM element
        // parameter: code - the clicked state's FIPS code
        self.toggleSelection = function(el, code) {
            // set focus to currently selected element
            var fcs = el;

            // if clicked state did not have focus
            if (focus != fcs) {

                // this code removes selection highlight to any selection that just lost focus
                // and did not have any road types selected
                if (focus != null && myObject.loadedStates.getSelectedTypes(myObject.state).length == 0) {
                    myObject.toggleSelection(focus);
                }
                // remove focus highlight text color from previous focus element
                d3.select(focus).style('color', '#448');
                // update current selection
                focus = fcs;
                // set this element's color to show focus
                d3.select(el).style('color', '#661508');
                // show the road type selector
                myObject.selector.toggleVisible(true, myObject.loadedStates.getSelectedTypes(code));
                // update current state code
                myObject.state = code;
                // this code turns on selection highlight for the element if it was not already on
                if (d3.select(el).attr('class') == null) {
                    myObject.toggleSelection(el);
                }
            // if clicked state did have focus
            } else if(fcs = focus) {
                // unselected all road types for this state
                myObject.loadedStates.unselectAllTypes(code);
                // re-color all routes
                myObject.colorRoutes();
                // turn of selection highlight
                myObject.toggleSelection(el);
                // remove focus text color
                d3.select(el).style('color', '#448');
                focus = null;
                // high road type selector for this state
                myObject.selector.toggleVisible(false);
                myObject.state = null;
            }
        }
    };

    // Method for retrieving a list of table names from backend API.
    // After formatting, the list of names is used to populate drop down menu list.
    myObject.requestStates = function() {
        var options = [];
        d3.xhr("http://localhost:1337/hpms")
            .response(function(request) {
                return JSON.parse(request.responseText);
            })
            .get(function(error, data) {
                data.forEach( function(d) {
                    if (d.id < 82) {
                        var obj = {text: formatStateName(d.tableName), value: d.stateFIPS};
                        options.push(obj)
                    }
                })
                myObject.initializeMenuBar(options.sort(sortStates));
            });
    }

    // Method used to format a table name into a nice form.
    // parameter: name - table name, in the form stateYear
    // return: a nicely formatted state name with first letters capitalized
    // and appropriate spaces added.
    function formatStateName(name) {
        var regex = /(\d+)/;

        name = name.replace(regex, ' ' + '$1');

        regex =/(new|south|west|north|rhode)/;

        name = name.replace(regex, '$1' + ' ');

        return esc.capitalizeAll(name);
    };

    // Comparison method used to alphabetiz states.
    function sortStates(a, b) {
            if (a.text < b.text)
                return -1
            else if (b.text < a.text)
                return 1;
            return 0;
    };
                    
    // Method called to initialize the menu bar.
    // parameter: list of drop down selections.
    myObject.initializeMenuBar = function(data) {
        // instantiate new drop down and selector objects
        myObject.dropDown = new myObject.DropDown('#dropDown');
        myObject.selector = new myObject.Selector('#selector');

        // create menu data object
        var menuData = { name: 'State Selector', options: data, func: myObject.loadedStates.addState };

        // create menu bar
        d3.select('#navBar')
            .append('a')
            .text(menuData.name)
            .on("click", function() {
                myObject.dropDown.toggleVisible();
                myObject.toggleSelection(this);
            });
        // populate drop down with menu data
        myObject.dropDown.populate(menuData.options, menuData.func);
    };

    // Method used to set highlight selection for DOM elements.
    // parameter: el - DOM element to be selected or unselectted
    myObject.toggleSelection = function(el) {
        var cls = d3.select(el).attr('class');

        if (cls == null) {
            myObject.selectElement(el);
        } else {
            myObject.unselectElement(el);
        }
    }

    // Method used to set selection highlight.
    // parameter: el - DOM element to be highlighted
    myObject.selectElement = function(el) {
        el = d3.select(el);
        el.attr('class', 'selection');
        el.style('background-color', '#ca2');
    }

    // Method used to remove selection highlight.
    // parameter: el - DOM element to remove highlight from
    myObject.unselectElement = function(el) {
        el = d3.select(el);
        el.attr('class', null);
        el.style('background-color', null);
    }
    
    // Method used to show a hidden DOM element
    // parameter: el - DOM element to be shown
    myObject.showElement = function(el) {
        d3.select(el)
            .style("display", "block")
            .transition()
            .duration(myObject.fadeDuration)
            .style("opacity", 1.0);
    };
    
    // Method used to hide a DOM element
    // parameter: el - DOM element to be hidden
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

    // Constructor method for Selector object.
    // parameter: id - DOM id for the Selector object
    // usage: var name = new Selector(id);
    myObject.Selector = function(id) {
        var self = this,
            visible = false;  // used 
        
        self.IDtag = id;

        var selections = ['1', '2', '3', '4', '5', '6', '7'],   // list of road types
            baseWidth = 40;                                     // base selection width
            totalWidth = baseWidth*selections.length,           // total width of all selections
            timer = false;                                      // variable for resize timer

        // this code initializes the Selector
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
                self.toggleSelection(this, d);
            });

        // Method used to toggle selection highlighting and update selected types
        // in LoadedStates object for current state
        // parameter: el - selection element to highlight
        // parameter: type - the selection's road type
        self.toggleSelection = function(el, type) {
            // toggle highlights
            myObject.toggleSelection(el);

            // if selection was selected
            if (d3.select(el).attr('class') == 'selection') {
                // add selection type to current state's selected types
                // and request geoJSON data from cache
                //myObject.loadedStates.setSelectedType(myObject.state, type);
                myObject.dataCache.requestData(myObject.state, +type);
            // if selection was unselected
            } else {
                // remove selection type from current state's selected types
                // and recolor routes
                myObject.loadedStates.removeSelectedType(myObject.state, type);
                myObject.colorRoutes();
            }
        }
    
        // Method to hide or show selector.
        // parameter: value - true to show selector, false to hide selector
        // parameter: selectedTypes - an array of currently selected road types for the selected state
        self.toggleVisible = function(value, selectedTypes) {
            visible = value;
            
            if (visible) {
                myObject.showElement(self.IDtag);
                // this code highlights selections for the current states selected road types
                d3.selectAll(self.IDtag + ' a')
                    .each(function(d, i) {
                        if (selectedTypes.indexOf(+d) != -1) {
                            myObject.selectElement(this);
                        } else {
                            myObject.unselectElement(this);
                        }
                    });
            }
            else {
                myObject.hideElement(self.IDtag);
            }
        };

        // This method resizes the selections. The selection under the mouse
        // is increased while other selections are decreased in size.
        // parameter: el - the selection under the mouse
        function resize(el) {
            d3.select(self.IDtag)
                .selectAll('a')
                .transition()
                .duration(150)
                .ease('linear')
                // the transition is broken into 3 parts
                // the transition starts lengthening the selection
                .style('width', function() {
                    var end = this == el ? Math.round(totalWidth*(1/3)) : Math.round((totalWidth*(2/3))/(selections.length-1));
                    var cur = parseInt(d3.select(this).style('width'));
                    return cur + (end - cur)*(3/4)+"px";
                })
                // half way through the transition, text is update
                .each('end', function(){
                    d3.select(this).text(function() {
                        return this == el ? 'type '+d3.select(this).attr('name') : d3.select(this).attr('name');
                    })
                })
                // then the transition finishes lengthening the selection
                .transition()
                .duration(50)
                .ease('linear')
                .style('width', function() {
                    return this == el ? Math.round(totalWidth*(1/3))+"px" : Math.round((totalWidth*(2/3))/(selections.length-1))+"px";
                });
        };

        // This method returns all selections to their normal sizes.
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

    // Method for creating the map legend.
    // parameter: colors - an array of colors used to color the legend
    myObject.createLegend = function(colors) {
        var length = myObject.roadColor.range().length, // number of legend boxes
            breaks = myObject.roadColor.quantiles(),    // array of numerical breakpoints for the lgend
            width = 90,         // width of each lgend box
            height = 30;        // height of each legend box

        // select and update DOM legend element
        myObject.legend
                .attr("width", width*length)
                .attr("height", height);

        // initiate d3 data join on legend colors for each legend box
        var boxes = myObject.legend.selectAll("rect")
                        .data(colors);

        // remove excess boxes
        boxes.exit().remove();

        // append entering (new) boxes
        boxes.enter().append("rect");

        // set attributes of boxes
        boxes.attr("x", function(d, i) { return i*width;})
            .attr("height", height)
            .attr("width", width)
            .attr("fill", function(d) { return d;});

        // For road types that have a single element, the roadColor function cannot calculate
        // any quantiles. In these instances, the single value is used to label the legend.
        // Otherwise, the numerical breakpoints are used to label the legend.
        var data = breaks.length == 0 ? myObject.roadColor.domain() : breaks;

        // remove all current legend labels.
        myObject.legend.selectAll('text').remove();

        // generate new legend labels for each box
        var labels = myObject.legend
                        .selectAll('text')
                        .data(data);

        labels.enter()
            .append('text')
            .text(function(d) { return Math.round(d); })
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .attr('x', function(d, i) {
                if (breaks.length == 0)
                    return width*0.4;
                return width*(i+1)+5;
            })
            .attr('y', height/2 + 5 +'px');
    }; // end createLegend
    
    // This method is called on window load to initialize everything.
    myObject.init = function() {

        myObject.loadedStates = new myObject.LoadedStates();
        myObject.dataCache = new myObject.DataCache();

        myObject.requestStates();

        myObject.leafletMap = new L.Map("mapDiv", {center: [40, -100], zoom: 5, zoomControl: false, minZoom: 4})
            .addLayer(new L.TileLayer("http://{s}.tiles.mapbox.com/v3/am3081.map-lkbhqenw/{z}/{x}/{y}.png"));

        myObject.svg = d3.select(myObject.leafletMap.getPanes().overlayPane)
                            .append("svg").attr("class", "leaflet-zoom-hide")

        myObject.legend = d3.select("#mapLegend").append("svg");
    };

    // elevate myObject into global namespace
    this.myObject = myObject;
})();

window.onload = function() {
    myObject.init();
}