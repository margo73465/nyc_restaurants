#NYC Restaurant Health Rating Visualization

A visualization of the average number of points given to restaurants, aggregated by zipcode, cuisine type, and violation type. Data is from the [NYC Open Data portal](http://data.cityofnewyork.us/resource/xx67-kt59.json). 

### To-do:
* Get words to wrap on bubble labels
* Figure out ordinal D3 scale for the bubbles if possible
* Make bar chart interactive (so that when you click a bar it will show the distribution of restaurants of that type, and the distribution of violations for restaurants of that type)
* Make map interactive (so that when you click on a zipcode you can see the distribution of restaurant types and violation types in that zipcode)
* Make the violations interactive (so that when you click on a bubble you can see the distribution of that violation type across the city, and across different types of cuisine)
* Smooth D3 transitions on everything!
* Add axes/scales/legends + labels, and descriptive text (maybe even a title!)
* Create a slider to allow a person to look at different years or all time
* Make mobile responsive