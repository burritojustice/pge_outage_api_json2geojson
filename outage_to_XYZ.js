const fetch = require('node-fetch'),
      path  = require('path');
var getGeoJson = require("./outages.js").getGeoJson;

async function toXYZ(space, token) {
	if (!space) space=process.env.XYZ_SPACE;
	if (!token) token=process.env.XYZ_TOKEN;

    async function checkStatus(res) {
        if (res.ok) { // res.status >= 200 && res.status < 300
            return res;
        } else {
        	let body = await res.text();
        	let e = new Error(`Error during upload. Status: ${res.statusText}; Body: ` + body);
        	e.status = res.statusCode;
        	e.body = body;
            throw e;
        }
    };

    // Upload current data
    var features = await getGeoJson();
//    console.log(new Date().toISOString() + ": New Features:\n", features);
	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?addTags=current`, {
        method: 'put',
        body:    features,
        headers: {
        	'Content-Type': 'application/geo+json',
    		"Authorization": `Bearer ${token}`,
    		"Accept": "application/geo+json"
        },
    })
    .then(checkStatus)
    .then(res => res.json())
    .then(json => console.log(new Date().toISOString() + `: ${json.features.length} current features updated`));
	
	// Search not updated features
	var bulkSize = 5000;
	var now = new Date().getTime(), toArchiveTime = now - (1000*60*20);
	do {
		var outdatedFeatures = await fetch(`https://xyz.api.here.com/hub/spaces/${space}/search?selection=ids&limit=${bulkSize}&tags=current&p.lastFetchTime=lt=` + toArchiveTime, {       // search for everything older 1h
	        method: 'get',
	        headers: { 
	    		"Authorization": `Bearer ${token}`,
	    		"Accept": "application/geo+json"
	        },
	    })
	    .then(checkStatus)
	    .then(res => res.json());
	
		console.log(new Date().toISOString() + `: ${outdatedFeatures.features.length} outdated features found`);
		outdatedFeatures.features.forEach( f => {
			f.properties.estimatedOutageEndTime = now;
			f.properties.archived = true;
		})
		
	    if (outdatedFeatures.features.length > 0) {
	    	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?addTags=archived&removeTags=current`, {
	            method: 'post',
	            body:    JSON.stringify(outdatedFeatures),
	            headers: {
	            	'Content-Type': 'application/geo+json',
	        		"Authorization": `Bearer ${token}`,
	        		"Accept": "application/geo+json"
	            },
	        })
	        .then(checkStatus)
	        .then(res => res.json())
	        .then(json => console.log(new Date().toISOString() + `: ${json.features.length} archived features updated`));
	    }
	} while (outdatedFeatures.features.length >= bulkSize);
};

async function handler(event, context) {
	return new Promise ( async (resolve, reject) => {
		try {
			await toXYZ();
			resolve("Upload done.");
		} catch (e) {
	    	let msg = new Date().toISOString() + ": Error during fetch and upload of data:" + e;
	    	if (e.status) {
	    		msg += "\nStatus: " + e.status;
	    	}
	    	if (e.body) {
	    		msg += "\nError: " + e.body;
	    	}
	    	console.error(msg);
	    	reject(e);
		}
	});
};

module.exports.handler = handler;

if (path.basename(process.argv[1]) == path.basename(__filename)){
    console.log(new Date().toISOString() + ": I'm called directly. Running right away");
	const space = process.argv.length > 2 ? process.argv[2] : process.env.XYZ_SPACE;
	const token = process.argv.length > 3 ? process.argv[3] : process.env.XYZ_TOKEN;

	toXYZ(space, token);
};
