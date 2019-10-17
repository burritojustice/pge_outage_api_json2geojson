var fetch = require('node-fetch')
const fs = require('fs');

// var argv = require('minimist')(process.argv.slice(2));
// argv = argv["_"]
// console.dir(argv,argv[0],argv[1]);

var data = []

async function getJson() {
	var url = 'https://apim.pge.com/cocoutage/outages/getOutagesRegions?regionType=city&expand=true'

//	var url = 'http://outages-prod.elasticbeanstalk.com/cweb/outages/getOutagesRegions?regionType=city&expand=true' //
// 	var url = 'http://localhost:8000/getOutagesRegions.json'
// 	var url = 'https://www.monkeybrains.net/map/outages.php?pge' 



//   try {
// 	const outages = await fetch(url).then(r => r.json());
//   } catch (e) {
//   	console.log('The PG&E outage API is down, please try again.') 
//   	return
//   } // in case the API is down
	
	const outages = await fetch(url).then(r => r.json());
    
    outages.outagesRegions.forEach(x => {
		var regionCoords
	    regionCoords = [Number(x.longitude),Number(x.latitude)]
		var regionPoint = {"type":"Point","coordinates": regionCoords}
		var Pointfeature = {
			type: 'Feature',
			geometry: regionPoint,
			id: x.id,
// 			properties: x
			properties: {
				id: x.id,
				kind: 'region',
				name: x.regionName,
				outages: Number(x.numOutages)
			}
    	}  
//     	console.log(feature)
		data.push(Pointfeature)
		
		// look for polygons
		var pointCoords = []
		// looks through each region's outage(s)
		x.outages.forEach(y => {
			var outageName = {name: x.regionName + ' ' + y.outageNumber}
			
			// check to see if there's a polygon 
			if (y.outageDevices){
				var polygonCoords = []
				y.outageDevices.forEach(z =>{
					// and build a coordinate array if so
					polygonCoords.push([Number(z.longitude),Number(z.latitude)])
				})
				var props2geojson = Object.assign({},y)
				
				// thin out the properties
				delete props2geojson.outageDevices
				delete props2geojson.latitude
				delete props2geojson.longitude
				
				var timeObject = makeTimeObject(y)

				// convert timestamps
// 				var timezone = {timeZone: "America/Los_Angeles"}
// 				var outageStartTimeLocale = new Date(y.outageStartTime*1000).toLocaleString()
// 				var lastUpdateTimeLocale = new Date(y.lastUpdateTime*1000).toLocaleString()
// 				
// 				// generate length of outage as a property
// 				var duration = lastUpdateTimeLocale - outageStartTimeLocale
// 				var outageInHours = (y.lastUpdateTime*1000 - y.outageStartTime*1000)/1000/60/60
// 				var outageInHours = Math.round(outageInHours)
// 				// build properties object
// 				var timeObject = {outageStartTimeLocale: outageStartTimeLocale, lastUpdateTimeLocale: lastUpdateTimeLocale, outageInHours: outageInHours}
				
				
				outageProps = Object.assign({kind: 'outage_polygon'}, outageName, props2geojson, timeObject)

				// add the first point to the end of the polygon string because geojson
				polygonCoords.push(polygonCoords[0])
				var outagePolygon = {
					type: 'Feature',
					geometry: {"type": "Polygon", "coordinates": [polygonCoords]},
					id: y.outageNumber + '_polygon', 
					properties: outageProps
				}
				data.push(outagePolygon)
			}
			
			// there will always be a point though, want to have both for display
			pointCoords = [Number(y.longitude),Number(y.latitude)]
			// build the geojson point feature
			var timeObject = makeTimeObject(y)
			
			var outageProps = Object.assign({kind: 'outage_point'}, outageName, y, timeObject)
			
			// thin out the properties
			delete outageProps.outageDevices
			delete outageProps.latitude
			delete outageProps.longitude
			
			// make the point
			var outagePoint = {
				type: 'Feature',
				geometry: {"type": "Point", "coordinates": pointCoords},
				id: y.outageNumber + '_point',
				properties: outageProps
				}
				
			data.push(outagePoint)
			//if the polygon exists, build it

		})		
	});   
	
	console.log(data.length,'features')
	
	function makeTimeObject(props){
		var timezone = {timeZone: "America/Los_Angeles"}
		var outageStartTimeLocale = new Date(props.outageStartTime*1000).toLocaleString()
		var lastUpdateTimeLocale = new Date(props.lastUpdateTime*1000).toLocaleString()
		
		// generate length of outage as a property
		var duration = lastUpdateTimeLocale - outageStartTimeLocale
		var outageInHours = (props.lastUpdateTime*1000 - props.outageStartTime*1000)/1000/60/60
		var outageInHours = Math.round(outageInHours)
		// build properties object
		var timeObject = {outageStartTimeLocale: outageStartTimeLocale, lastUpdateTimeLocale: lastUpdateTimeLocale, outageInHours: outageInHours}
		return timeObject
	}
	
	fs.writeFileSync('outages.geojson', JSON.stringify({
		type: 'FeatureCollection',
		features: data
	}));
	 
}


getJson();


