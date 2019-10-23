const http  = require("https"),
      fetch = require('node-fetch'),
      path  = require('path');
var getGeoJson = require("./outages.js").getGeoJson;

async function toXYZ() {
	const space = process.argv.length > 2 ? process.argv[2] : process.env.XYZ_SPACE;
	const token = process.argv.length > 3 ? process.argv[3] : process.env.XYZ_TOKEN;

	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features`, {
        method: 'put',
        body:    await getGeoJson(),
        headers: { 
        	'Content-Type': 'application/geo+json',
    		"Authorization": `Bearer ${token}`,
    		"Accept": "application/geo+json"
        },
    })
    .then( res => {
        if (res.ok) { // res.status >= 200 && res.status < 300
            return res;
        } else {
            throw Error(`Error during upload. Status: ${res.statusCode}; Body: ` + res.text());
        }
    })
    .then(res => res.json())
    .then(json => console.log("Data uploaded. Body: " + JSON.stringify(json)));
};

async function handler(event, context) {
	await toXYZ();
};

module.exports.handler = handler;

if (path.basename(process.argv[1]) == path.basename(__filename)){
	toXYZ();
};
