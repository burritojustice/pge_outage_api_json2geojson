const fetch = require('node-fetch');

// var argv = require('minimist')(process.argv.slice(2));
// argv = argv["_"]
// console.dir(argv,argv[0],argv[1]);

async function getJson() {
	var data = [];
	var url = 'https://apim.pge.com/cocoutage/outages/getOutagesRegions?regionType=city&expand=true'

//	var url = 'http://outages-prod.elasticbeanstalk.com/cweb/outages/getOutagesRegions?regionType=city&expand=true' //
// 	var url = 'http://localhost:8000/getOutagesRegions.json'
// 	var url = 'https://www.monkeybrains.net/map/outages.php?pge' 

	const outages = await fetch(url).then(r => r.json());
    let now = new Date().getTime();
    if (outages && outages.outagesRegions) outages.outagesRegions.forEach(x => {
    
    	// makeRegionPoints(x) // adding region points in the same space doesn't really look good, confusing
		
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
				
				// all the numbers coming from the json are actually strings, need to convert so XYZ can index them properly
				props2geojson.crewEta = parseInt(props2geojson.crewEta)
				props2geojson.lastUpdateTime = parseInt(props2geojson.lastUpdateTime)
				props2geojson.estCustAffected = parseInt(props2geojson.estCustAffected)
				props2geojson.outageStartTime = parseInt(props2geojson.outageStartTime)
				
				// thin out the properties
				delete props2geojson.outageDevices
				delete props2geojson.latitude
				delete props2geojson.longitude
				
				var timeObject = makeTimeObject(y)
				
				var polygonTag = {
					"@ns:com:here:xyz": {
					  "tags": [
						"outage_polygon"
					  ]}
				}

				var outageProps = Object.assign({kind: 'outage_polygon'}, outageName, props2geojson, timeObject, polygonTag)

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
			
			var pointTag = {
				"@ns:com:here:xyz": {
				  "tags": [
					"outage_points"
				  ]}
			}
			
			var outageProps = Object.assign({kind: 'outage_point'}, outageName, y, timeObject, pointTag)
			
			// thin out the properties
			delete outageProps.outageDevices
			delete outageProps.latitude
			delete outageProps.longitude
			outageProps.crewEta = parseInt(outageProps.crewEta)
			outageProps.lastUpdateTime = parseInt(outageProps.lastUpdateTime)
			outageProps.estCustAffected = parseInt(outageProps.estCustAffected)
			outageProps.outageStartTime = parseInt(outageProps.outageStartTime)		
			
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
	
	console.log(new Date().toISOString() + ": " + data.length,'features')
	
	function makeTimeObject(props){
		var timezone = {timeZone: "America/Los_Angeles"}
		var outageStartTimeLocale = new Date(props.outageStartTime*1000).toLocaleString(timezone)
		var lastUpdateTimeLocale = new Date(props.lastUpdateTime*1000).toLocaleString(timezone)
		
		// generate length of outage as a property
		var duration = lastUpdateTimeLocale - outageStartTimeLocale
		var outageInHours = (props.lastUpdateTime*1000 - props.outageStartTime*1000)/1000/60/60
		var outageInHours = Math.round(outageInHours)
		var lastFetchTime = now;
		// build properties object
		var timeObject = {outageStartTimeLocale: outageStartTimeLocale, lastUpdateTimeLocale: lastUpdateTimeLocale, outageInHours: outageInHours, lastFetchTime: lastFetchTime}
		return timeObject
	}
	
	function makeRegionPoints(x){
		var regionCoords
	    regionCoords = [Number(x.longitude),Number(x.latitude)]
		var regionPoint = {"type":"Point","coordinates": regionCoords}
		var Pointfeature = {
			type: 'Feature',
			geometry: regionPoint,
			id: x.id,
			properties: {
				id: x.id,
				kind: 'region',
				name: x.regionName,
				outages: Number(x.numOutages)
			}
    	}  
		data.push(Pointfeature)
		
	}
	
	return JSON.stringify({
		type: 'FeatureCollection',
		features: data
	});
}

module.exports.getGeoJson = getJson;

