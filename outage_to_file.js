const fs = require('fs');
var getGeoJson = require("./outages.js").getGeoJson;

async function toFile() {
	fs.writeFileSync('outages.geojson', await getGeoJson());
}

toFile();
