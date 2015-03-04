// Set width and height for everything!
var width = window.innerWidth,
    bubble_width = Math.floor(width * 0.24),
    map_width = Math.floor(width * 0.50),
    bar_width = Math.floor(width * 0.24),
    text_height = 12,
    height = map_width;

////////////////////////
/// BAR CHART THINGS ///
////////////////////////

var bar_svg = d3.select(".bar_chart").append("svg")
  .attr("width", bar_width)
  .attr("height", height);

var num_bars = 10;
var bar_height = height / num_bars;

var x_scale = d3.scale.linear()
    .range([0, bar_width]);

//////////////////
/// MAP THINGS ///
//////////////////

// Add the actual SVG to the body element in the DOM
var map_svg = d3.select(".map").append("svg")
	.attr("width", map_width)
	.attr("height", height);

map_svg.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", map_width)
  .attr("height", height)
  .style("fill", "none")
  .style("stroke", "#777");

// NYtimes: 40.704468, -73.917935
// ???: -73.94, 40.70
// Me: 40.717626, -73.978651
// We will use a mercator projection shifted to center on NYC, and zoomed in
var projection = d3.geo.mercator()
  .center([-73.978651, 40.717626])
  .scale(60000)
  .translate([(map_width) / 2, (height)/2]);

// This is the path generator -- later, when we make paths they will be 
// created with the correct projection
var path = d3.geo.path()
    .projection(projection);

// Quantize is a method that will take values from 10 to 30 and put them into 
// one of 9 bins and return the name of the bin
var quantize = d3.scale.quantize()
    .domain([0, 40])
    .range(d3.range(9).map(function(i) { return "q" + i; }));

/////////////////////
/// BUBBLE THINGS ///
/////////////////////

var bubble_svg = d3.select(".bubbles").append("svg")
  .attr("width", bubble_width)
  .attr("height", height);

// var r_scale = d3.scale.linear()
    // .range([0, height]);

// var diameter = bubble_width,
//     color = d3.scale.category20c();

// var bubble = d3.layout.pack()
//     .size([diameter, height])
//     .padding(1.5);



// Parts of Socrata api call
var api_url = "http://data.cityofnewyork.us/resource/xx67-kt59.json";
var query_string = "?$where=(inspection_date%3E=%272014-01-01%27%20AND%20inspection_date%3C=%272014-02-01%27)&$limit=50000"

// The queue allows the asynchronous data loading calls to complete before 
// calling the actual plotting function
queue()
  .defer(d3.json, api_url + query_string)
  .defer(d3.json, "nyc_zips_topojson.json")
  // .defer(d3.csv, "cuisine_mean.csv")
	.await(ready);

function ready(error, data, nyc) {

  var data_by_violation = aggregate(data, "score", "violation_description");
  var data_by_zipcode = aggregate(data, "score", "zipcode");
  var data_by_cuisine = aggregate(data, "score", "cuisine_description");

  data_by_violation = object_to_array(data_by_violation, "violation");
  data_by_cuisine = object_to_array(data_by_cuisine, "cuisine");

  // Bubbles!
  top_ten_violations = data_by_violation.sort(compare_count).slice(0,10);

  var sum_counts = top_ten_violations.reduce(function(previous, current, index, array) {
    return previous + current.count;
  }, 0);

  top_ten_violations.map(function (violation) {
    violation.radius = (violation.count / (sum_counts - 45)) * height / 2;
  });

  top_ten_violations.reduce(function(previous, current, index, array) {
    current.y_pos = previous + current.radius * 2 + 5;
    return current.y_pos;
  }, 0.0);

  var bubble = bubble_svg.selectAll("g")
      .data(top_ten_violations)
    .enter().append("g")
      .attr("class", "bubble")
      .attr("transform", function(d,i) {
        return "translate(0," + d.y_pos + ")";
      });

  bubble.append("circle")
      .attr("cx", bubble_width - top_ten_violations[0].radius)
      .attr("cy", function(d) { return -d.radius; })
      .attr("r", function(d) { return d.radius; })
      .attr("class", function(d) { return quantize(d.count); });

  bubble.append("text")
    .attr("class", "bubble_text")
    .text(function(d) {return d.violation; })
    .attr("x", 0)
    .attr("y", function(d) { 
      return -d.radius * 2 + text_height / 2 + 10; 
    })
    .attr("font-size", text_height)
    .call(wrap, bubble_width - top_ten_violations[0].radius * 2);


  // Map
  map_svg.append("g")
      .attr("class", "zip_polygons")
    .selectAll("path")
      .data(topojson.feature(nyc, nyc.objects.zip_polygons).features)
    .enter().append("path") // add the actual zipcode boundaries
      .attr("class", function(d) { 
        // the data, d, is from the topojson file. The meanById map allows 
        // you to get the mean for a given zipcode, which is the ID in the 
        // topojson file
        if (data_by_zipcode[d.id] !== undefined) {
          return quantize(data_by_zipcode[d.id].average);
        }
      })
      .attr("d", path);


  // Bar Chart
  x_scale.domain([0, d3.max(data_by_cuisine, function(d) { return d.average; })]);
  top_ten_cuisine = data_by_cuisine.sort(compare_average).slice(0,10);

  var bar = bar_svg.selectAll("g")
      .data(top_ten_cuisine)
    .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function(d, i) { return "translate(0," + i * bar_height + ")"; });

  bar.append("rect")
      .attr("x", 0)
      .attr("width", function(d) { return x_scale(d.average); })
      .attr("height", bar_height - bar_text_height/2)
      .attr("class", function(d) { return quantize(d.average)});

  bar.append("text")
      .attr("class", "bar_text")
      .text(function(d) { return d.cuisine; })
      .attr("transform", function(d) { return "translate(5," + (bar_height/2) + ")"; })
      .attr("font-size", text_height);


}

// 1. Reimplement this so that results is an array rather than an object
//      - decided to just make object_to_array function since trying to 
//        check for repeats in an array is time computationally intensive 
// 2. Reimplement this functionally (filter/map/reduce)
function aggregate(data, thing_to_aggregate, group_by) {

  var results = {};
  for (var i = 0; i < data.length; i++) {
    if (results[data[i][group_by]] === undefined) {
      results[data[i][group_by]] = {sum: 0, count: 0, average: 0};
      results[data[i][group_by]].count = 1;
      if (data[i][thing_to_aggregate] !== undefined) {
        results[data[i][group_by]].sum = Number(data[i][thing_to_aggregate]);
      }
    }
    else {
      results[data[i][group_by]].count += 1;
      if (data[i][thing_to_aggregate] !== undefined) {
        results[data[i][group_by]].sum += Number(data[i][thing_to_aggregate]);
      }
    }
  }
  for (item in results) {
    if (results.hasOwnProperty(item)) {
      results[item].average = results[item].sum / results[item].count;
    }
  }

  return results;
}

// This function only makes sense in this context...
// You really want an object with object properties, this function will add 
// each object property to an array with an additional property (with the 
// given name) that is equal to the original name of the object. 
// It's confusing, but it's what I needed. 
function object_to_array(object, new_property_name) {
  
  var array = [];
  for (property in object) {
    if (object.hasOwnProperty(property)) {
      var lil_obj = object[property];
      lil_obj[new_property_name] = property;
      array.push(lil_obj);
    }
  }
  return array;
}

function compare_average(a, b) {
  return Number(b.average) - Number(a.average);
}

function compare_count(a, b) {
  return Number(b.count) - Number(a.count);
}

// Copy and paste from here: http://bl.ocks.org/mbostock/7555321
function wrap(text, width) {
  console.log(text);
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}