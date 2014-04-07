(function(){
    var drawnItems = new L.FeatureGroup();
    var map;
    var geojson = null;
    var results = null;
    var resp;
    var endpoint = 'http://wopr.datamade.us';
    function template_cache(tmpl_name, tmpl_data){
        if ( !template_cache.tmpl_cache ) {
            template_cache.tmpl_cache = {};
        }

        if ( ! template_cache.tmpl_cache[tmpl_name] ) {
            var tmpl_dir = '/js/templates';
            var tmpl_url = tmpl_dir + '/' + tmpl_name + '.html?2';

            var tmpl_string;
            $.ajax({
                url: tmpl_url,
                method: 'GET',
                async: false,
                success: function(data) {
                    tmpl_string = data;
                }
            });

            template_cache.tmpl_cache[tmpl_name] = _.template(tmpl_string);
        }

        return template_cache.tmpl_cache[tmpl_name](tmpl_data);
    }
    var ErrorView = Backbone.View.extend({
        initialize: function(){
            this.render()
        },
        render: function(){
            this.$el.html(template_cache('modalTemplate', this.model));
            this.$el.modal();
            return this;
        }
    });
    var QueryView = Backbone.View.extend({
        initialize: function(){
            this.render()
        },
        render: function(){
            var query = this.attributes.query;
            this.$el.html(template_cache('queryTemplate', {query: query}));
        }
    })
    var ChartView = Backbone.View.extend({
        events: {
            'click .data-download': 'fetchDownload',
        },
        render: function(){
            this.$el.html(template_cache('chartTemplate', this.model));
            return this;
        },
        addData: function(data){
            var el = this.model['el'];
            var name = this.model['objects']['dataset_name'];
            var agg = this.model.query.agg;
            var iteration = this.model.iteration;
            ChartHelper.create(el, name, 'City of Chicago', agg, data, iteration);
        },
        fetchDownload: function(e){
            if ($(e.target).parent().parent().hasClass('detail')){
                var path = 'detail';
            } else {
                var path = 'master';
                this.model.query['dataset_name'] = $(e.target).attr('id').split('-')[0];
                this.model.query['datatype'] = $(e.target).attr('id').split('-')[1];
            }
            var url = endpoint + '/api/' + path + '/?' + $.param(this.model.query);
            window.open(url, '_blank');
        }
    });
    var ExploreView = Backbone.View.extend({
        events: {
            'click .refine': 'refineQuery'
        },
        render: function(){
            var dataset = this.attributes.base_query['dataset_name']
            var self = this;
            $.when(this.getFields(dataset)).then(
                function(fields){
                    self.$el.html(template_cache('exploreForm', {
                        fields: fields
                    }));
                    self.queryView = new QueryView({
                        el: '#query',
                        attributes: {
                            query: self.attributes.base_query
                        }
                    });
                    self.delegateEvents();
                }
            )
            return this;
        },
        refineQuery: function(e){
            var refined = this.$el.find('textarea').val();
            var refined_query = parseParams(refined);
            var query = $.extend(refined_query, this.attributes.base_query);
            var dataset_name = this.attributes.base_query['dataset_name'];
            this.attributes.parent.charts[dataset_name].undelegateEvents();
            this.attributes.parent.charts[dataset_name].$el.empty();
            if (typeof this.refine !== 'undefined'){
                this.refine.undelegateEvents();
                this.refine.$el.empty();
            }
            var self = this;
            this.$el.spin('large');
            $.when(this.getData(query)).then(
                function(data){
                    self.$el.spin(false);
                    query.dataset_name = self.attributes.base_query['dataset_name'];
                    self.refine = new RefineView({
                        el: '#refine',
                        attributes: {
                            data: data,
                            query: query
                        }
                    });
                    self.refine.render();
                }
            ).fail(function(resp){
                new ErrorView({el: '#errorModal', model: resp});
            });
        },
        getFields: function(dataset){
            return $.ajax({
                url: endpoint + '/api/fields/' + dataset + '/',
                dataType: 'json',
            });
        },
        getData: function(query){
            return $.ajax({
                url: endpoint + '/api/detail-aggregate/',
                dataType: 'json',
                data: query
            });
        }
    });
    var RefineView = Backbone.View.extend({
        render: function(){
            var data = this.attributes.data;
            var el = this.attributes.query.dataset_name;
            var item = {
                el: el,
                objects: data.objects[0],
                query: this.attributes.query,
                iteration: 0,
                detail: true
            }
            var chart = new ChartView({
                model: item
            });
            this.$el.html(chart.render().el);
            var objs = [];
            $.each(data.objects, function(i,obj){
                $.each(obj.items, function(j, o){
                    objs.push([moment(o.group).unix()*1000, o.count]);
                })
            });
            this.queryView = new QueryView({
                el: '#query',
                attributes: {
                    query: this.attributes.query
                }
            });
            chart.addData(objs);
            this.chart = chart;
        }
    });
    var ResponseView = Backbone.View.extend({
        events: {
            'click .explore': 'exploreDataset'
        },
        initialize: function(){
            this.explore = new ExploreView({el: '#explore'});
        },
        render: function(){
            var self = this;
            this.query = this.attributes.query;
            if (typeof this.explore !== 'undefined'){
                this.explore.remove();
            }
            this.$el.empty();
            this.charts = {};
            this.$el.spin('large');
            $.when(this.getResults()).then(function(resp){
                self.$el.spin(false);
                results = resp.objects;
                $.each(results, function(i, obj){
                    var el = obj.items[0].dataset_name;
                    var item = {
                        el: el,
                        objects: obj,
                        iteration: i,
                        query: self.query,
                        detail: false
                    }
                    var chart = new ChartView({
                        model: item
                    });
                    self.$el.append(chart.render().el);
                    var data = [];
                    $.each(obj.items, function(i, o){
                        data.push([moment(o.group).unix()*1000, o.count]);
                    });
                    chart.addData(data);
                    self.charts[el] = chart;
                });
                $('#about').hide();
            }).fail(function(resp){
                new ErrorView({el: '#errorModal', model: resp});
            });
        },
        exploreDataset: function(e){
            var self = this;
            this.query['dataset_name'] = $(e.target).attr('id').split('-')[0];
            this.query['datatype'] = 'json';
            $.each(this.charts, function(key,chart){
                if (key != self.query.dataset_name){
                    chart.remove();
                }
            });
            this.explore.attributes = {
                base_query: this.attributes.query,
                parent: this
            }
            this.$el.after(this.explore.render().el);
        },
        getResults: function(){
            var self = this;
            return $.ajax({
                url: endpoint + '/api/master/',
                dataType: 'json',
                data: self.query
            });
        }
    });
    function parseParams(query){
        var re = /([^&=]+)=?([^&]*)/g;
        var decodeRE = /\+/g;  // Regex for replacing addition symbol with a space
        var decode = function (str) {return decodeURIComponent( str.replace(decodeRE, " ") );};
        var params = {}, e;
        while ( e = re.exec(query) ) {
            var k = decode( e[1] ), v = decode( e[2] );
            if (k.substring(k.length - 2) === '[]') {
                k = k.substring(0, k.length - 2);
                (params[k] || (params[k] = [])).push(v);
            }
            else params[k] = v;
        }
        return params;
    }
    $(document).ready(function(){
        resp = new ResponseView({el: '#response'});
        resize_page();
        window.onresize = function(event){
            resize_page();
        }
        var then = moment().subtract('d', 180)
        $('#start-date-filter').attr('placeholder', then.format('MM/DD/YYYY'));
        $('#end-date-filter').attr('placeholder', moment().format('MM/DD/YYYY'));
        map = L.map('map').setView([41.880517,-87.644061], 11);
        L.tileLayer('https://{s}.tiles.mapbox.com/v3/datamade.hn83a654/{z}/{x}/{y}.png', {
          attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
        }).addTo(map);
        map.addLayer(drawnItems);
        var drawControl = new L.Control.Draw({
            edit: {
                    featureGroup: drawnItems
            },
            draw: {
                polyline: false,
                circle: false,
                marker: false
            }
        });
        map.addControl(drawControl);
        map.on('draw:created', draw_create);
        map.on('draw:drawstart', draw_delete);
        map.on('draw:edited', draw_edit);
        map.on('draw:deleted', draw_delete);
        $('.date-filter').datepicker({
            dayNamesMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            prevText: '',
            nextText: ''
        });
        $('#submit-query').on('click', submit_form);
        $('#reset').click(function() {
            location.reload();
        });
    });

    function submit_form(e){
        var message = null;
        var query = {};
        var start = $('#start-date-filter').val();
        var end = $('#end-date-filter').val();
        start = moment(start);
        if (!start){
            start = moment().subtract('days', 180);
        }
        end = moment(end)
        if(!end){
            end = moment();
        }
        var valid = true;
        if (start.isValid() && end.isValid()){
            start = start.startOf('day').format('YYYY/MM/DD');
            end = end.endOf('day').format('YYYY/MM/DD');
        } else {
            valid = false;
            message = 'Your dates are not entered correctly';
        }
        query['obs_date__le'] = end;
        query['obs_date__ge'] = start;
        if (geojson){
            query['location_geom__within'] = JSON.stringify(geojson);
        }
        query['agg'] = $('#time-agg-filter').val();
        if(valid){
            $('#refine').empty();
            resp.undelegateEvents();
            resp.delegateEvents();
            resp.attributes = {query: query};
            resp.render();
        } else {
            $('#response').spin(false);
            var error = {
                header: 'Woops!',
                body: message,
            }
            var errortpl = new EJS({url: 'js/templates/modalTemplate.ejs'})
            $('#errorModal').html(errortpl.render(error));
            $('#errorModal').modal();
        }
    }

    function draw_create(e){
        drawnItems.clearLayers();
        edit_create(e.layer, e.target);
    }

    function draw_edit(e){
        var layers = e.layers;
        drawnItems.clearLayers();
        layers.eachLayer(function(layer){
            edit_create(layer, e.target);
        });
    }

    function draw_delete(e){
        drawnItems.clearLayers();
    }

    function edit_create(layer, map){
        geojson = layer.toGeoJSON();
        drawnItems.addLayer(layer);
    }
    function resize_page(){
        $('.half-height').height((window.innerHeight  / 2) - 40);
    }

})()
