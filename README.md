# pge_outage_api_json2geojson


This converts the json PG&E's outage API to GeoJSON.

This generates points for regions, points for outage events, as well as polygons for outage events (if they exist).

It does some helpful things:

- adds a `name` based on location and PG&E ID
- converts the timestamp into a human readable date string
- and more
