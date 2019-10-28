const http  = require("https"),
      fetch = require('node-fetch'),
      path  = require('path');
var getGeoJson = require("./outages.js").getGeoJson;

async function toXYZ() {
	const space = process.argv.length > 2 ? process.argv[2] : process.env.XYZ_SPACE;
	const token = process.argv.length > 3 ? process.argv[3] : process.env.XYZ_TOKEN;

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
	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features`, {
        method: 'put',
        body:    await getGeoJson(),
        headers: {
        	'Content-Type': 'application/geo+json',
    		"Authorization": `Bearer ${token}`,
    		"Accept": "application/geo+json"
        },
    })
    .then(checkStatus)
    .then(res => res.json())
    .then(json => console.log(`Data uploaded. ${json.features.length} features`));
	
	
	// Search not updated features
	var outdatedFeatureIds = await fetch(`https://xyz.api.here.com/hub/spaces/${space}/search?selection=ids&f.updatedAt%3C` + (new Date().getTime() - (1000*60*60)), {       // search for everything older 1h
        method: 'get',
        headers: { 
    		"Authorization": `Bearer ${token}`,
    		"Accept": "application/geo+json"
        },
    })
    .then(checkStatus)
    .then(res => res.json())
    .then(json => json.features.map ( f => f.id) );

	console.log(`${outdatedFeatureIds.length} outdated features found`);
	
    if (outdatedFeatureIds.length > 0) {
    	var ids = outdatedFeatureIds.join();
    	
    	var ids= require("./ids.json").ids
    	var idArr = [];
    	while (ids.length > 8000) {
    		let idx = ids.lastIndexOf(',', 8000);
    		idArr.push
    		(ids.substr(0, idx))
    		ids = ids.substr(idx+1);
    	}
    	idArr.push(ids);
    	
    	console.log(`Deleting in ${idArr.length} chunks.`);
    	var count = 0;
    	
    	idArr.forEach( async ids => {
    		// Delete not updtaed features
    	    await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?id=` + ids, {
    	        method: 'delete',
    	        headers: { 
    	    		"Authorization": `Bearer ${token}`,
    	    		"Accept": "application/x-empty"
    	        },
    	    })
    	    .then(checkStatus);
    	    console.log(`Chunk #${count} deleted`);
    	    count++;
    	})
	    
	    console.log(`Outdated features deleted.`);
    }
};

async function handler(event, context) {
	return new Promise ( async (resolve, reject) => {
		try {
			await toXYZ();
			resolve("Upload done.");
		} catch (e) {
	    	let msg = "Error during fetch and upload of data:" + e;
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
    console.log("I'm called directly. Running right away");
	toXYZ();
};
