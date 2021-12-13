function bi_dashboard()
{   
    
   
    
   
    //chart update type
    function update_highchart(data)
    {   

        //vertical align legend right if series toggle are too many
        if (data.series.length > 12)
        {
            var new_legend = {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                title: {text: data.legend}
            }
        }

        else 
        {
            var new_legend = {
                title: {text: data.legend}
            }
        }
        
        var check_dataLabel =  (data.xAxis.categories.length + data.series.length >= 30) ? false : true;


        Highcharts.setOptions({
            lang: {
              decimalPoint: '.',
              thousandsSep: ','
            }
        });

        Highcharts.chart('sales', {
           
            title: {text: data.title},
            chart: {type: data.type, animation: false},
            yAxis: data.yAxis,
            xAxis: data.xAxis,
            legend: new_legend,
            series: data.series,
            plotOptions: {
                series: { 
                    dataLabels: {
                       
                        //format: '{point.y:,f}',
                        enabled: check_dataLabel,
                        color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'black',
                        formatter: function(){
                        return (this.y!=0)?this.y.toLocaleString():"";
                        }
                    },
                    marker: {
                        enabled: false
                    }
                }, area: {
                    stacking: 'percent',
                    lineColor: '#ffffff',
                    lineWidth: 1,
                    marker: {
                        lineWidth: 1,
                        lineColor: '#ffffff'
                    }
                }, pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.y:,f}',
                    }
                }
            },
        });
        
       
    }
    //map update type
    function update_map(data)
    {

        Highcharts.setOptions({
            lang: {
              decimalPoint: '.',
              thousandsSep: ','
            }
        });

        Highcharts.mapChart('sales', {
            chart: { 
                map: 'custom/world'
            }, mapNavigation: {
                enabled: true
            },
        
            title: {
                text: data.title
            },
            colorAxis: {
                min: 0 ,stops: [
                    [0, '#0000ff'],
                    [0.5, '#ffffff'],
                    [1, '#ff0000'] 
                
                ]
            },legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle'
            },
            series: data.series
        });
    }
    //initial load based on on the data loaded either from the flask session or the fresh load without cookies
    $.get( "bi_data", function(data) {
        
        //1. set the columns
        $(data.meta_data).each(function(index,value)
        {   
            var fixed_name = value.name.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
            fixed_name = fixed_name.join(' ');
            var option = `<option value=${value.name} dtype=${value.dtype}>${fixed_name}</option>`

            if (value.dtype.includes('int64') || value.dtype.includes('float64'))
            {
                //$('#NumericSelect').append(option)
                $('#values').append(option);
            }

            else if (value.dtype.includes('object'))
            {
                $('#categories').append(option);
            }

        });

        //2. if there is a value
        if (data.state.value)
        {
            $('#values').val(data.state.value);
        }

        else 
        {
            $('#values').prop('disabled',true)
            $('#values option:first').prop("selected", true).change();
        }

        //if there is a category
        if (!data.state.category)
        {
            $('#categories option:first').prop("selected", true).change()
            $('#isCategory').attr('checked',false).change()
        }

        else if (data.state.category)
        {
            $('#categories').val(data.state.category).change();
            $('#isCategory').attr('checked',true).change()
        }

        
        //visuals always exists
    
        //$('#visuals').val(data.state.visual).change();

        //aggregate column always exist, but disable value if unique
        $('#aggregate_column').val(data.state.agg_type).change();
        if ($('#aggregate_column').val() == 'nunique')
        {
            $('#values').prop('disabled',true)
            $('#values option:first').prop("selected", true).change()
        } 

        else 
        {
            $('#values').prop('disabled',false)
        }

        //if there is a date string, check off the date and render value
        if (data.state.date_string)
        {
            $('#date_column').val(data.state.date_string)
            $('#isDate').attr('checked',true).change()
           
        }
        
        $('#visuals').val(data.state.visual).change();
        //3. update highcharts here
        if (data.state.visual != 'map')
        {
            update_highchart(data);
        }
        else if (data.state.visual == 'map')
        {
            update_map(data)
        } 
        //4. datalist filter
        $(data.filters).each(function(index,value){
            $('#filtergroup').append(`<option class="dataOption" value="${value}">`)
            
        });

        //5. send filter buttons if stored in session
        if (data.wheres)

    
        {   $('#filtersinterface').css('background-color','white');
            $('#filtersinterface').show();
            $(data.wheres).each(function(index,value){
                $('#filters').append(`
                <div class="btn-group me-2" role="group" style="padding:5px;">
                    <button class="btn btn-primary btn-sm button_filter" operand="${value.operand}" type="filter">${value.origin}</button>
                </div>`)
            })
        }

        //.6 numeric filters
        if (data.num_filters)
        {   
            $.each(data.num_filters,function(index,value)
            {
                var fixed_name = index.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
                fixed_name = fixed_name.join(' ');
                var option = `<option value='${index}' max=${value.max} min=${value.min}>${fixed_name}</option>`
                $('#NumericSelect').prepend(option)
             })
             $("#NumericSelect").val($("#NumericSelect option:first").val());
        }

        //.7 feedback divs
        if (data.feedback)
        {
            $(data.feedback).each(function(index,value){
              
                var fixed_name = value.name.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
                fixed_name = fixed_name.join(' ').trim();
                if (('count' in value.values || 'sum' in value.values) &&  Object.keys(value.values).length == 1)
                {   
                    var card_text = value.values[Object.keys(value.values)]
                }
                else if ('max' in value.values)
                {
                    var card_text = `${value.values.min} -> ${value.values.max}`
                }
                $('#feedback').append(`<div class="card col-3 rounded" style="background-color: white; ">
                    <div class="card-body">
                        <h5 class="card-title">${fixed_name}</h5>
                        <p class="card-text">${card_text}</p>
                    </div>
                </div>`) 

            })
        }

        //.8 html table
        if (data.table_data)
        {
            var trs =  data.table_data[0].values.map(item => item.span).reduce((pv, cv) => pv + cv, 0)
            for (let i = 0; i < trs; i++) 
            {
                $('#table_target').append('<tr></tr>')
            }

            $(data.table_data).each(function(key,value){
                var fixed_name = value.column.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g);
                fixed_name = fixed_name.join(' ');
                $('#table_header').append(`<th scope="col">${fixed_name}</th>`)

                $(value.values).each(function(index,data)
                {
                    var cell = `<td rowspan=${data.span}>${data.name}</td>`
                    $(`#table_target tr:eq(${data.index})`).append(cell)
                    
                })
            });
        }

        //.9 html table pages
        if (data.table_pages)
        {
            $('#paginAtor').val(data.table_pages.current)
            $('#paginAtor').attr('max',data.table_pages.max)
            $('#paginAtor').attr('current',data.table_pages.current)
            $('#whereami').text("\u00A0\u00A0\u00A0"+'of '+data.table_pages.max + "\u00A0\u00A0\u00A0")
        }
    })

    function ajax_data()
    {   
        //visual and aggregate type are always default
        data = {
            visual : $('#visuals').val(),
            agg_type : $('#aggregate_column').val()
        }
        //if value is viewable, send it
        if ($('#values').prop('disabled') == false) data.value = $('#values').val()
       
        //if category not marked off, send it
        if ($('#isCategory').is(':checked') )  data.category = $('#categories').val();

        //if a date string is specified
        if ($('#isDate').is(':checked') && $('#isDate').prop('disabled') == false) data.date_string = $('#date_column').val();
      
        if ( $('#filters button').length > 0)
        {
            var filters = []
            $('#filters button').each(function(index,value)
            {  
                var filterArr = $(value).text().split(/:|<|>/)
                var target = filterArr[0].trim().replace(/\s/g, '')
                var param = filterArr[1].trim()
                
                if (!isNaN(param))
                {
                    param = Number(param)
                }
                filters.push({column: target, parameter: param,origin:$(value).text(),operand:$(value).attr('operand')}) 
            })

            data.filters = JSON.stringify(filters) 
            
        }
        
        //send data
        $.ajax({
            data :data,
            type : 'POST',
            url : '/bi_data'
        })
        
        //handle returned data from python
        .done(function(data){ 
            {   
                $('#send_values').prop('disabled',false);
                $('#sales').css('opacity',1);
                if (data.type != 'map')
                {
                    update_highchart(data);
                }
                else if (data.type == 'map')
                {
                    update_map(data)
                } 
            }  
        });
    }

    function ajax_tables()
    {   
        var page = Number($('#paginAtor').val())
        $('#paginAtor').attr('current',page)
        $('#paginAtor').val(page).keyup()
        let page_request = { page: $('#paginAtor').val()} 

        if ($('button[type=filter]').length > 0)
        {
            var filters = []
            $('button[type=filter]').each(function(index,value)
            {  
                var filterArr = $(value).text().split(/:|<|>/)
                var target = filterArr[0].trim().replace(/\s/g, '')
                var param = filterArr[1].trim()
                //console.log(typeof(param) )
                if (!isNaN(param) && !target.includes('ID'))
                {
                    param = Number(param)
                }
                filters.push({column: target, parameter: param,origin:$(value).text(),operand:$(value).attr('operand')}) 
            })
            Object.assign(page_request, {filterData: JSON.stringify(filters)});
        }

        $.ajax({
            data :  page_request,
            type : 'POST',
            async : false,
            url : '/frame_page/'
        })
    
        .done(function(data){ 
            {   
                $('#table_target').animate({ opacity: 0}, 500, function() {
                    $('#table_target tr').empty();
                    //check if rows are less than incoming
                    var trs =  data.table_data[0].values.map(item => item.span).reduce((pv, cv) => pv + cv, 0)
                    if ( trs > $('#table_target tr').length ) 
                    {   var needed_length = trs - $('#table_target tr').length
                        for (let i = 0; i < needed_length; i++) 
                        {   
                            $('#table_target').append('<tr></tr>')
                        }
                    }
                   
                    //append the values
                    $(data.table_data).each(function(key,value){
                        $(value.values).each(function(index,data)
                        {
                            var cell = `<td rowspan=${data.span}>${data.name}</td>`
                            $(`#table_target tr:eq(${data.index})`).append(cell)  
                        })
                    }); 
                    $('#table_target').animate({opacity:1})    
                }) 
            }  
        });
    }


    //handle normal string category type
    function handleCategory()
    {
        var value = $('#values').val();
        var aggregate = $('#aggregate_column').val();
        
        if (value == 'Price')
        {
            $('#aggregate_column').find('option:contains(Sum)').hide()
            if (aggregate == 'sum')
            {
                $("#aggregate_column").val($("#aggregate_column option:nth-child(2)").val()).change();
            }
        }

        else 
        {
            $('#aggregate_column').find('option:contains(Sum)').show()
        }
    }

    //for the html graph customizer, map type
    function check_map()
    {
        if ($('#visuals').val() == 'map') 
        {
            $("#visuals").val($("#visuals option:first").val()).change();
        }
    }

    //handle values for orderid in category version
    function handle_orderID()
    {
        var value = $('#values').val();
        var aggregate = $('#aggregate_column').val();

        if (value == 'Total' || value == 'Quantity')
        {
            $('#aggregate_column').find('option:contains(Sum)').show()
            $('#aggregate_column').find('option:not(:contains(Sum))').hide()
            if (aggregate != 'sum')
            {
                $("#aggregate_column").val($("#aggregate_column option:first").val()).change();
            } 
        } 

        else if (value == 'Price')
        {
            $('#aggregate_column').find('option').show()
            $('#aggregate_column').find('option:contains(Sum)').hide() 
            $('#aggregate_column').find('option:contains(Count)').hide()  
            if (aggregate == 'sum' || aggregate == 'nunique')
            {
                $("#aggregate_column").val($("#aggregate_column option:nth-child(2)").val()).change();
            }       
        } 
    }

    //collects data from the buttons and send them to the server
    function ajax_filters() 
    {   
        var filters = []
        $('button[type=filter]').each(function(index,value)
        {  
            var filterArr = $(value).text().split(/:|<|>/)
            var target = filterArr[0].trim().replace(/\s/g, '')
            var param = filterArr[1].trim()
            if (!isNaN(param) && !target.includes('ID'))
            {
                param = Number(param)
            }
            filters.push({column: target, parameter: param,origin:$(value).text(),operand:$(value).attr('operand')}) 
        })
        data = {
            filterData : JSON.stringify(filters), page: $('#paginAtor').attr('current')
        }
        $.ajax({
            data :  data,
            type : 'POST',
            async : false,
            url : '/frame_filter/'
        })
    
        .done(function(data){ 
            {
                //update the cards
                $(data.filters).each(function(index,value){
                
                    var fixed_name = value.name.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
                    fixed_name = fixed_name.join(' ').trim();
                    var card = $('#feedback .card').find(`.card-title:contains(${fixed_name})`)
                    var card_value =  card.next();
                
                    if (('count' in value.values || 'sum' in value.values) &&  Object.keys(value.values).length == 1)
                    {   
                        var card_text = value.values[Object.keys(value.values)]
                    }
                    else if ('max' in value.values)
                    {
                        var card_text = `${value.values.min} -> ${value.values.max}`
                    }
                  
                    if (card_value.text() !=  String(card_text)) 
                    {
                        card_value.animate({ opacity: 0},500,function(){
                            $(this).text(card_text).animate({ opacity: 1});
                       });
                    }
                })
                
                //update the table
                $('#paginAtor').attr('max',data.max)
                $('#paginAtor').attr('current',data.current)
                $('#paginAtor').val(data.current).keyup()
                $('#whereami').text("\u00A0\u00A0\u00A0"+'of '+data.max + "\u00A0\u00A0\u00A0")    
                $('#table_target').animate({ opacity: 0}, 500, function() {
                    $('#table_target tr').empty();
                    //check if rows are less than incoming
                    var trs =  data.table_data[0].values.map(item => item.span).reduce((pv, cv) => pv + cv, 0)
                    if ( trs > $('#table_target tr').length ) 
                    {   var needed_length = trs - $('#table_target tr').length
                        for (let i = 0; i < needed_length; i++) 
                        {   
                            $('#table_target').append('<tr></tr>')
                        }
                    }
                    
                    //append the values
                    $(data.table_data).each(function(key,value){
                        $(value.values).each(function(index,data)
                        {
                            var cell = `<td rowspan=${data.span}>${data.name}</td>`
                            $(`#table_target tr:eq(${data.index})`).append(cell)
                        })
                    });
                    $('#table_target').animate({opacity:1})
                });
            }  
            });

        setTimeout(function() {
                
            var reduce_arr = []
            $('#feedback .card-text').each(function(index,value)
            {
                var range_or = $(value).text().split('->')
            
                if (range_or.length > 1 && !isNaN(range_or[0]))
                {
                    range_or = Number(range_or[0]) + Number(range_or[1])
                    reduce_arr.push(range_or)
                }
                else 
                {
                    range_or = Number(range_or[0])
                    reduce_arr.push(range_or)
                }
            })
            var result =  reduce_arr.reduce((a, b) => a + b, 0)

            if (result == 0)
            {   
                $('#customizer').find('input, select').prop('disabled',true)
                $('#send_values').prop('disabled',true)
            }

            else 
            {
                $('#customizer').find('input, select').prop('disabled',false).change()
                $('#send_values').prop('disabled',false)
            }
            
        }, 600);
    }

    //ajax request for new chart visual from server
    $(document).on('click','#send_values', function() {
        //$('#send_values').prop('disabled',true);
        $('#sales').css('opacity',0.5)
        ajax_data();
    })
  
    //!!anything past here is for select input handling and  button visibility!!
    $(document).on('change','#values',function()
    {
        var category = $('#categories').val().toLowerCase()
        if (category.includes('order'))
        {
            handle_orderID()
        }
        else 
        {
            handleCategory()
        }
    });

    

    $(document).on('change','#categories',function()
    {   
        console.log('asd')
        //handle map option based on category value
        var category = $(this).val().toLowerCase()

        if (category.includes('country') || category.includes('city'))
        {
            $('#map_type').show()
            if($('#isDate').is(':checked')) 
            {   
                
                $('#cum_type').show();
            }
            $('#aggregate_column').find('option').show()
            handleCategory()
        }

        else if (category.includes('order'))
        {
            $('#map_type').hide()
            handle_orderID()
            $('#cum_type').hide();
            check_map()
        }

        else if (!category.includes('country') || !category.includes('order')) 
        {
            $('#map_type').hide()
           
            if($('#isDate').is(':checked')) 
            { 
                $('#cum_type').show();
            }
            $('#aggregate_column').find('option').show()
            handleCategory()
            check_map()  
        }     
    });

    $(document).on('change','#visuals',function()
    {   
        //map is only valid for non date specific aggregates
        if ( $(this).val() == 'map')
        {
            $('#date_column').prop('disabled',true)
            $('#isDate').prop('disabled',true)
            if (!$('#isCategory').is(':checked')) 
            {
                $('#send_values').prop('disabled',true)
            }
            $('#pie_type').show()
        }
        else
        {
            $('#date_column').prop('disabled',false)
            $('#isDate').prop('disabled',false).change()
            $('#send_values').prop('disabled',false);
        }
    });

    $(document).on('change','#aggregate_column',function()
    { 
        //count of orders does aggregate data
        if ($(this).val() == 'nunique')
        {
            $('#values').prop('disabled',true)
        } 

        else 
        {
            $('#values').prop('disabled',false)
        }        
    });


    function handle_pie_area()
    {
        if ( $('#isDate').is(':checked') && $('#visuals').val() == 'pie')
        {
            $("#visuals").val($("#visuals option:first").val()).change();
        } 

        else if (!$('#isDate').is(':checked') && $('#visuals').val() == 'area') 
        {
           
            $("#visuals").val($("#visuals option:first").val()).change();
        }
    }

    function handle_cumsum()
    {
        if ( !$('#isDate').is(':checked') && $('#aggregate_column').val() == 'cumsum')
        {
            $("#aggregate_column").val($("#aggregate_column option:first").val()).change();
        } 
    }

    $(document).on('change','#isDate',function()
    { 
    
        //disable date column on check
        if ($(this).is(':checked'))
        {
            $('#date_column').prop('disabled',false);
            $('#pie_type').hide();
            if ( !$('#categories').val().toLowerCase().includes('order') )
            {
                $('#cum_type').show();
            } 
            $('#area_type').show();
            handle_pie_area()
            handle_cumsum()
        }

        else 
        {
            $('#date_column').prop('disabled',true);
            $('#pie_type').show();
            $('#cum_type').hide();
            $('#area_type').hide();
            handle_pie_area()
            handle_cumsum()
        }
    });

    $(document).on('change','#isCategory',function()
    { 
        //handle visibility of categories drop down, or button depending on visual type
        if ($(this).is(':checked'))
        {
            $('#categories').prop('disabled',false);
            $('#send_values').prop('disabled',false)
        }

        else 
        {    
            if ($('#visuals').val() == 'map')
            {
                $('#send_values').prop('disabled',true)
            }

            else
            {
                $('#send_values').prop('disabled',false)
            }
            $('#categories').prop('disabled',true);
        }
    });


    //FILTER FUNCTIONS
    //for the datalist which is categorical
    $(document).on('keyup','#params',function(){
        var params = $('#params').val();
        var values = []

        $('.dataOption').each(function(index,value){
            values.push($(value).val())
        })
  
        if (values.includes(params) )
        {
            $('#addFilter').prop('disabled',false)
        }

        else 
        {
            $('#addFilter').prop('disabled',true)
        }
    })

    //this handles visibility of button depending on valid date input
    $(document).on('keyup','#DateFilter',function(){
        
        var dateinput = String($('#DateFilter').val())  ;
        var pattern = /^([0-9]{4})[-]([0]?[1-9]|[1][0-2])[-]([0][1-9]|[1|2][0-9]|[3][0|1])$/;
        var datebool = pattern.test(dateinput)

        if  (datebool == true)
        {   
            var date = new Date(dateinput)
            if (Number(date.getMonth()+1) != Number(dateinput.split('-')[1])) 
            {   
                 $('#addFilter').prop('disabled',true);
            }
            else
            {
                $('#addFilter').prop('disabled',false);
                check_num_filters()
            }      
        }
            
        else 
        {
            $('#addFilter').prop('disabled',true);
        }
       
    })

    //function for adding a button which is a filter and then disabling button if selection is already chosen compared to input
    $(document).on('click','#addFilter',function(){
        {   
            if ($('#CategoricCheck').is(':checked'))
            {
                $('.dataOption').each(function(index,value){
                    if ($(value).val() == $('#params').val())
                    {
                        $(value).prop('disabled',true)
                    }
                })
    
                //send to filters list
                $('#filters').parent().css('background-color','white')
                $('#filters').append(`
                    <div class="btn-group me-2" role="group" style="padding:5px;">
                        <button class="btn btn-primary btn-sm" operand="=" type="filter">${$('#params').val()}</button>
                    </div>`)
                $('#params').val('');
                $('#addFilter').prop('disabled',true);
            }


            else if ($('#NumericCheck').is(':checked'))
            {
                var column = $('#NumericSelect').val()
                var operand =  $('#NumericMath').val() 
               

                if ($('#NumericFilterField').is(':visible'))
                {
                    var parameter = $('#NumericFilterField').val() 
                    $('#NumericFilterField').val('').keyup()
                }

                else if  ($('#DateFilter').is(':visible'))
                {
                    var fixed_name = column.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
                    column = fixed_name.join(' '); 
                    var parameter = $('#DateFilter').val()
                    $('#DateFilter').val('').keyup()
                }

                $('#filters').parent().css('background-color','white')
                $('#filters').append(`
                    <div class="btn-group me-2" role="group" style="padding:5px;">
                        <button class="btn btn-primary btn-sm button_filter" operand="${operand}" type="filter">${column +' '+ operand +' '+ parameter}</button>
                    </div>`)
                
                    
                //$('#DateFilter').val('').keyup()
                $('#NumericMath').change();
            }
            
            $('#filtersinterface').show();
            //console.log($('button[type=filter]').length)
        ajax_filters() 
        }
    })

    //this will mark out the filters button if it matches the current input
    function check_num_filters()
    {
        $('#addFilter').prop('disabled',false);
        if ($('#filters button').length > 0)
        {   

            $('.button_filter').each(function(index,value){
                
                if ($(value).text().includes('<') || $(value).text().includes('>') ) 
                { 
                    var numvars = $(value).text().split(/>|</g)[0].replace(/ /g,'')
                    var operand = $(value).text().charAt($(value).text().search(/<|>/))
                    if ($('#NumericMath').val() == operand && $('#NumericSelect').val() == numvars.trim())
                    {   
                        $('#addFilter').prop('disabled',true)
                    } 
                }
            });
        }

   }

   //this handles the values appended to the input after changing a column
   function check_operand_num() 
   {    
        var target =  $('#NumericSelect').val()
        var max = $(`#NumericSelect option[value="${target}"`).attr('max')
        var min =  $(`#NumericSelect option[value="${target}"`).attr('min')
        
        if  ($('#NumericMath').val() == '>' && !target.includes('Date'))
        {
            $('#NumericFilterField').val(min).keyup()
            $('#NumericFilterField').attr('min',min).attr('max',max).attr('maxlength',max.length)
        }

        else if ($('#NumericMath').val() == '<'  && !target.includes('Date'))
        {
            $('#NumericFilterField').val(max).keyup()
            $('#NumericFilterField').attr('min',min).attr('max',max).attr('maxlength',max.length)
        }

        else if ($('#NumericMath').val() == '>'  && target.includes('Date'))
        {
            $('#DateFilter').val(min).keyup()
        }

        else if ($('#NumericMath').val() == '<'  && target.includes('Date'))
        {
            $('#DateFilter').val(max).keyup()
        }
   }

   
    $(document).on('change','#NumericMath',function()
    {   
        check_operand_num() 
        check_num_filters()  
    });

    //numeric filter changes value of input field depending on drop down
    $(document).on('change','#NumericSelect', function(){
        var target =  $('#NumericSelect').val()
        if (!target.includes('Date'))
        {
            $('#DateFilter').hide()
            $('#NumericFilterField').show()
            check_operand_num() 
        }
        else if (target.includes('Date'))
        {
            $('#NumericFilterField').removeAttr('max').removeAttr('min')
            $('#DateFilter').show()
            $('#NumericFilterField').hide()
            check_operand_num() 
        }
        check_num_filters()  
    })

    //when removing a filter, it will update the data summary and table
    $(document).on('click','button[type=filter]',function()
    {   
        $(this).parent().remove();
        var buttonFilter = $(this).text();
        if ($('#filters button').length == 0)
        {  
            $('#filtersinterface').hide();
            $('#filtersinterface').css('background-color',''); 
        }

        if(buttonFilter.includes(':')) 
        {
            $('.dataOption').each(function(index,value){
                if ($(value).val() == buttonFilter)
                {
                    $(value).prop('disabled',false)
                }
            })
        }

        if ($('#NumericFilterField').is(':visible') || $('#DateFilter').is(':visible'))
        {
            check_num_filters()        
        }
       ajax_filters()
    });

    //radio button for filter interface if numeric
    $('#NumericCheck').on('change',function(){
        if ($(this).is(':checked')) 
        {
            $('#params').hide();
            $('.NumericFilter').show();
            $("#NumericSelect").val($("#NumericSelect option:first").val()).change();
            $("#NumericMath").val($("#NumericMath option:first").val()).change();
            $('#NumericFilterField').keyup()
            $('#NumericMath').change();
            check_num_filters()
        }
     })

     //radio button for the filter interface if categoric
     $('#CategoricCheck').on('change',function(){
        if ($(this).is(':checked')) 
        {
            $('.NumericFilter').hide();
            $('#DateFilter').hide()
            $('#params').show();     
        }
     })

     //trigger ajax request on click paginator 
     $('#pageGo').on('click',function(){
        ajax_tables()
     })
     
     //hand visibility of page interface if page number is not the current
     $(document).on('keyup', '#paginAtor',function(event)
     {  
        if ( $('#paginAtor').val() !=  $('#paginAtor').attr('current') && $('#paginAtor').val().length != 0  && $('#paginAtor').val() >0) 
        {
            $('#pageGo').prop('disabled',false)
        }

        else 
        {
            $('#pageGo').prop('disabled',true)
        }
     })

     //no plus or minus sign in number input for page, and if value is larger than total number of pages
     $(document).on('keydown', '#paginAtor',function(event)
     {  
        var real_val = Number($('#paginAtor').val() +  event.key)  
        if(event.keyCode == 107 || event.keyCode == 109 ||  real_val == 0 || real_val > parseInt($('#paginAtor').attr('max'))) 
        {
            return false;
        }
     })

     //no plus or minus sign in number input for filter
     $(document).on('keydown', '#NumericFilterField',function(event)
    {  
        if(event.keyCode == 107 || event.keyCode == 109 ) 
        {
            return false;
        }
    })

  
};

