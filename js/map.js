(function(){
    var drawnItems = new L.FeatureGroup();
    var map;
    var geojson = null;
    var results = null;
    var endpoint = 'http://wopr.datamade.us'
    $(document).ready(function(){
        resize_page();
        window.onresize = function(event){
            resize_page();
        }
        var then = moment().subtract('d', 180)
        $('#start-date-filter').attr('placeholder', then.format('MM-DD-YYYY'));
        $('#end-date-filter').attr('placeholder', moment().format('MM-DD-YYYY'));
        map = L.map('map').setView([41.880517,-87.644061], 11);
        L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
          attribution: 'Mapbox <a href="http://mapbox.com/about/maps" target="_blank">Terms &amp; Feedback</a>',
          key: 'BC9A493B41014CAABB98F0471D759707',
          styleId: 22677
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
        $('#dataset').on('change', function(){
            console.log('OK heres where we show and hide info about the datasets')
        });
        $('#submit-query').on('click', submit_form);
        $('#reset').click(function() {
            location.reload();
        });
    });

    function submit_form(e){
        $('#response').spin('large');
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
            query['geom__within'] = JSON.stringify(geojson);
        }
        var agg = $('#time-agg-filter').val();
        if(valid){
            $.when(get_results(query, agg)).then(function(resp){
                $('#response').spin(false);
                $('#response').html('');
                results = resp.objects;
                $.each(results, function(i, obj){
                    //console.log(obj);
                    var el = obj.objects[0].dataset_name;
                    var chart_id = el + '_' + i;
                    var item = '<div id="' + chart_id + '" class="chart"></div>';
                    item += '<button type="button" class="btn btn-success center-block csv-download" id="' + el + '-download">';
                    item += 'Download in CSV format</button><hr />';
                    $('#response').append(item);
                    var data = [];
                    $.each(obj.objects, function(i, o){
                        data.push([moment(o.group).unix()*1000, o.count]);
                    })
                    //console.log(data);
                    ChartHelper.create(el, obj.dataset_name, 'City of Chicago', agg, data, i);
                });
                $('.csv-download').on('click', function(){
                    var set = $(this).attr('id').split('-')[0];
                    var data = [];
                    $.each(results, function(i, result){
                        $.each(result.objects, function(i, res){
                            if(res.dataset_name == set){
                                data.push(res);
                            }
                        });
                    });
                    var csv = convert_to_csv(data);
                    console.log(csv);
                });
                // var aggTpl = new EJS({url: 'js/templates/responseTemplate.ejs'})
                // $('#response').html(aggTpl.render({'datasets': resp.objects}));
            }).fail(function(resp){
                $('#response').spin(false);
                console.log(resp);
                var error = {
                    header: 'Woops!',
                    body: resp['responseJSON']['meta']['message'],
                }
                var errortpl = new EJS({url: 'js/templates/modalTemplate.ejs'})
                $('#errorModal').html(errortpl.render(error));
                $('#errorModal').modal();
            });
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

    function convert_to_csv(json){
        var str = '';
        $.each(json, function(idx, js){
            var line = '';
            $.each(js, function(i, j){
                if (line != ''){
                    line += ','
                }
                if(idx == 0){
                    line += i
                } else {
                    line += json[idx][i];
                }
            });
            str += line + '\r\n';
        });
        return str
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

    function get_results(query, agg){
        return $.ajax({
            url: endpoint + '/api/' + agg + '/',
            dataType: 'json',
            data: query
        });
    }
})()
