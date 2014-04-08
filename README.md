# W.O.P.R. API Explorer

Front-end interface for the [W.O.P.R. API](https://github.com/datamade/wopr-api), a prototype for demonstrating geospatial and time aggregation across multiple Chicago open datasets.

## Running locally

``` bash
git clone git@github.com:datamade/wopr-map.git
cd wopr-map

# to run locally
python -m SimpleHTTPServer
```

navigate to http://localhost:8000/

# Data

New datasets are actively being added to the WOPR API. We keep track of them in this [Google Doc](https://docs.google.com/spreadsheet/ccc?key=0Au-2OHnpwhGTdGJzUWJ2SERwVXZLeDU4Y3laWFJvNEE&usp=sharing#gid=0)

# Dependencies
We used the following open source tools:

* [WOPR API](http://wopr.datamade.us/) - API for geospatial and time aggregation across multiple Chicago open datasets
* [Bootstrap](http://getbootstrap.com/) - Responsive HTML, CSS and Javascript framework
* [Leaflet](http://leafletjs.com/) - javascript library interactive maps
* [jQuery Address](https://github.com/asual/jquery-address) - javascript library creating RESTful URLs

## Team

* Derek Eder - developer, content
* Eric van Zanten - developer, GIS data merging
* Forest Gregg - process design, content

## Errors / Bugs

If something is not behaving intuitively, it is a bug, and should be reported.
Report it here: https://github.com/datamade/wopr-map/issues

## Note on Patches/Pull Requests
 
* Fork the project.
* Make your feature addition or bug fix.
* Commit, do not mess with rakefile, version, or history.
* Send me a pull request. Bonus points for topic branches.

## Copyright

Copyright (c) 2014 DataMade and the University of Chicago. Released under the [MIT License](https://github.com/datamade/wopr-map/blob/master/LICENSE).
