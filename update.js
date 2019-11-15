const fetch = require('node-fetch'),
      path  = require('path');


async function update (space, token) {
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
    const oneHback = new Date().getTime() - (1000*60*60);
	console.log(new Date().toISOString() + ": 1h back = " + oneHback);
    
	var bulkSize = 5000;
	var ts=oneHback;
	
	//add lastFetchTime with lastUpdateTs
	var handle=null;
	do {
		var updatedFeatures = await fetch(`https://xyz.api.here.com/hub/spaces/${space}/iterate?skipCache=true&selection=p.%40ns%3Acom%3Ahere%3Axyz.updatedAt,p.lastFetchTime&limit=${bulkSize}` + (handle? `&handle=${handle}` : ""), {       // search for everything older 1h
	        method: 'get',
	        headers: { 
	    		"Authorization": `Bearer ${token}`,
	    		"Accept": "application/geo+json"
	        },
	    })
	    .then(checkStatus)
	    .then(res => res.json());
		handle=updatedFeatures.handle;
		
		var archived=[], current=[];
		updatedFeatures.features.forEach( f => {
			if ( !f.properties.lastFetchTime ){
				f.properties.lastFetchTime = f.properties["@ns:com:here:xyz"].updatedAt
			} else if ( typeof f.properties.lastFetchTime == 'string') {
				f.properties.lastFetchTime = new Date(f.properties.lastFetchTime).getTime();
			}
			
			if (f.properties.lastFetchTime < oneHback) {
				archived.push(f);
			} else {
				current.push(f);
			}
		});

		console.log(new Date().toISOString() + `: ${updatedFeatures.features.length} features found. New handle=${handle}`);
//		console.log("Archived Features:\n", JSON.stringify(archived, 0, 2));
//		console.log("Current Features:\n", JSON.stringify(current, 0, 2));
		
	    if (archived.length > 0) {
	    	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?addTags=archived&removeTags=current`, {
	            method: 'post',
	            body:    JSON.stringify({
	            	type: 'FeatureCollection',
	        		features: archived
	            }),
	            headers: {
	            	'Content-Type': 'application/geo+json',
	        		"Authorization": `Bearer ${token}`,
	        		"Accept": "application/geo+json"
	            },
	        })
	        .then(checkStatus)
	        .then(res => res.json())
	        .then(json => console.log(new Date().toISOString() + `: ${json.features.length} archived features uploaded`));
	    }

	    if (current.length > 0) {
	    	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?removeTags=archived&addTags=current`, {
	            method: 'post',
	            body:    JSON.stringify({
	            	type: 'FeatureCollection',
	        		features: current
	            }),
	            headers: {
	            	'Content-Type': 'application/geo+json',
	        		"Authorization": `Bearer ${token}`,
	        		"Accept": "application/geo+json"
	            },
	        })
	        .then(checkStatus)
	        .then(res => res.json())
	        .then(json => console.log(new Date().toISOString() + `: ${json.features.length} current features uploaded`));
	    }
	} while (handle);

	//Add 'current' tag
//	do {
//		var currentFeatures = await fetch(`https://xyz.api.here.com/hub/spaces/${space}/search?skipCache=true&selection=p.%40ns%3Acom%3Ahere%3Axyz.updatedAt&limit=${bulkSize}&p.lastFetchTime=gte=` + ts, {       // search for everything older 1h
//	        method: 'get',
//	        headers: { 
//	    		"Authorization": `Bearer ${token}`,
//	    		"Accept": "application/geo+json"
//	        },
//	    })
//	    .then(checkStatus)
//	    .then(res => res.json());
//		delete currentFeatures.etag;
//	
//		console.log(new Date().toISOString() + `: ${currentFeatures.features.length} up to date features found.`);
////		console.log("Features:\n", JSON.stringify(currentFeatures, 0, 2));
//		
//	    if (currentFeatures.features.length > 0) {
//	    	let f=currentFeatures.features;
//	    	f.forEach( f => {
//	    		ts = ts>f.properties["@ns:com:here:xyz"].updatedAt ? ts : f.properties["@ns:com:here:xyz"].updatedAt;
//	    	})
//			console.log(new Date().toISOString() + ": New ts = " + ts);
//			
//	    	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?removeTags=archived&addTags=current`, {
//	            method: 'post',
//	            body:    JSON.stringify(currentFeatures),
//	            headers: {
//	            	'Content-Type': 'application/geo+json',
//	        		"Authorization": `Bearer ${token}`,
//	        		"Accept": "application/geo+json"
//	            },
//	        })
//	        .then(checkStatus)
//	        .then(res => res.json())
//	        .then(json => console.log(new Date().toISOString() + `: Data uploaded. ${json.features.length} features`));
//		    console.log(new Date().toISOString() + `: ${currentFeatures.features.length} up to date features tagged with 'current'.`);
//	    }
//	} while (currentFeatures.features.length >= bulkSize);
//	
//	//add 'archived' tag
//	do {
//		var outdatedFeatures = await fetch(`https://xyz.api.here.com/hub/spaces/${space}/search?skipCache=true&selection=p.%40ns%3Acom%3Ahere%3Axyz.updatedAt&limit=${bulkSize}&p.lastFetchTime=lt=` + oneHback, {       // search for everything older 1h
//	        method: 'get',
//	        headers: { 
//	    		"Authorization": `Bearer ${token}`,
//	    		"Accept": "application/geo+json"
//	        },
//	    })
//	    .then(checkStatus)
//	    .then(res => res.json());
//		delete outdatedFeatures.etag;
//
//		console.log(new Date().toISOString() + `: ${outdatedFeatures.features.length} outdated features found.`);
////		console.log("Features:\n", outdatedFeatures);
//		
//	    if (outdatedFeatures.features.length > 0) {
//	    	await fetch(`https://xyz.api.here.com/hub/spaces/${space}/features?addTags=archived&removeTags=current`, {
//	            method: 'post',
//	            body:    JSON.stringify(outdatedFeatures),
//	            headers: {
//	            	'Content-Type': 'application/geo+json',
//	        		"Authorization": `Bearer ${token}`,
//	        		"Accept": "application/geo+json"
//	            },
//	        })
//	        .then(checkStatus)
//	        .then(res => res.json())
//	        .then(json => console.log(new Date().toISOString() + `: Data uploaded. ${json.features.length} features`));
//		    console.log(new Date().toISOString()  + `: ${outdatedFeatures.features.length} outdated features tagged with 'archived'.`);
//	    }
//	} while (outdatedFeatures.features.length >= bulkSize);

}

if (path.basename(process.argv[1]) == path.basename(__filename)){
    console.log("I'm called directly. Running right away");
	const space = process.argv.length > 2 ? process.argv[2] : process.env.XYZ_SPACE;
	const token = process.argv.length > 3 ? process.argv[3] : process.env.XYZ_TOKEN;

	update(space, token);
};
