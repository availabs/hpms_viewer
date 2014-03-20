!function() {
	esc = {
		version: "0.0.1"
	}
		
	esc.randInt = function(min, max) {
	/*
	Returns an integer in the range [min, max].
	*/
		return Math.round(Math.random()*(max-min))+min;
	};
	
	esc.capitalize = function (string) {
	/*
	Capitalizes the first character of the argument string and returns result.
	*/
		var i = 0;
		while (/\s/.test(string.charAt(i))) {
			++i;
		}
		return string.slice(0, i) + string.charAt(i).toUpperCase() + string.slice(i+1)
	};
	
	esc.capitalizeAll = function (string, seperator) {
	/*
	Capitalizes all words in the argument string. Also eliminates extraneous
	whitespace within the string. Returns the result.
	An optional seperator can be specified. It is used to split the string
	before capitalizing each word.
	*/
		seperator = seperator || " ";
		string = string.split(seperator);
		var temp = [];
		string.forEach(function(d, i) {
			if (string[i].length > 0)
				temp.push(esc.capitalize(string[i]));
		});
		return temp.join(' ');
	}
	this.esc = esc;
}();

/**********************
** Utils
***********************/
function number_format(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}