function bi_dashboard()
{   function update_highchart(data)
    {
        if (data.type == 'scatter')
        {
           var symbol = 'circle'
        }
        else 
        {
            var symbol = symbol
        }
        //Highcharts.setOptions({
        //    colors: ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4']
        //});
       //render the chart
        Highcharts.chart('sales', {
            loading: {
                hideDuration: 1000,
                showDuration: 1000
            },
            title: {text: data.title},
            chart: {type: data.type,},
            yAxis: data.yAxis,
            xAxis: data.xAxis,
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                title: {text: data.legend}
            },
            plotOptions: { 
                
                series: {
                    marker: {
                       symbol: symbol,
                       radius: 3
                    },
                    point: {
                        events: {
                            click: function () {
                                console.log('Category: ' + this.category + ', value: ' + this.y);
                            }
                        }
                    },
                }
            },
            series: data.series,
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            layout: 'horizontal',
                            align: 'left',
                            verticalAlign: 'bottom'
                        }
                    }
                }]
            }
        //highchart ends here 
        });   
    }
    //initial load based on on the data loaded either from the flask session or the fresh load without cookies
    $.get( "bi_data", function(data) {
        $(data.meta_data).each(function(index,value)
        {   var option = `<option value=${value.name} dtype=${value.dtype}>${value.name} (${value.count})</option>`
            $('#x_select').append(option);
            $('#y_select').append(option);

        });
        update_highchart(data);
    //get request ends here  
    })

    //undisable the select once clicked on
    $(document).on('click','#correlation',function()
    {
        $("#x_select option:first").prop("selected", true)
        $("#x_select option[dtype$='64']").show();
        $('#x_select').prop('disabled',false);
        $("#y_select option:first").prop("selected", true)
        $("#y_select option[dtype='object'],option[dtype*='date']").show();
        $('#y_select').prop('disabled',false);
        $('#send_values').css('visibility','');
        normalize_variable_column();
        $('#variable_column option:contains(None)').show();
        
        $('#x_select option').css('color','black')
        $('#y_select option').css('color','black')
        $('#send_values').prop('disabled',true)
        $('#aggregate_column').css('visibility','hidden');
    });
   
    function normalize_variable_column()
    {
        $('#variable_column').css('visibility','hidden')
        $('#variable_column').removeAttr('name');
        
        //$('#variable_column option:eq(2)').after().remove();
        $('#variable_column option').not('.keep_col').remove();
        $('#variable_column option:first').text('');
        $("#variable_column:selected").prop("selected", false)
    };

    //function to manage the variable column depending on data type of chosen axes
    function manage_corr_cat(dtype,prev_category,new_category,opp_dtype)
    {
        var x_axis =  $('#x_select').find(":selected").attr('dtype');
        var y_axis =  $('#y_select').find(":selected").attr('dtype');
        
        //if any value is not selected, it will be undefined. hide column but make sure it's empty.
        //needs to be first because one column is always unselected on the first drop
        if (x_axis == undefined || y_axis == undefined)
        {
            normalize_variable_column();
            return true
        }

        //if both axes are the same data type, load the column with the opposite type
        else if ([x_axis,y_axis].map(e => e.includes(String(dtype))).every(Boolean))
        {   
            if ($('#variable_column').attr('name') ==prev_category)
            {
                normalize_variable_column();
            }

            $('#variable_column').attr('name',new_category)
            $('#variable_column').css('visibility','')
            if($('#variable_column option').length == 2)
            {   $('#variable_column option:first').text(new_category.charAt(0).toUpperCase() +new_category.substring(1)).prop('disabled',true) //.css('text-transform','capitalize')
                //$('#variable_column').css('text-transform','capitalize')
                $('#x_select option').each(function(index,value)
                { 
                    
                   if ( String($(value).attr('dtype')).includes(String(opp_dtype))  && !String($(value).attr('dtype')).includes(String('date')))
                   { 
                     $('#variable_column').append($(value).clone())
                   }
                })
                $("#variable_column option:first").prop("selected", true)
            }
            return false   
        }

        //this handles nulls and if both axes are different
        else 
        {   
            normalize_variable_column();
            return true
        }
    }

    function manage_val_column(x_selected,y_selected)
    {   
        if (x_selected != null  &&  y_selected != null && x_selected != y_selected )
        {
            $('#send_values').prop('disabled',false)
        }

        else 
        {
            $('#send_values').prop('disabled',true)
        }
    }

    function manage_agg_columns(x_selected,y_selected)
    {   
        var visual = $('#variable_column').val();
        var agg = $('#aggregate_column').val();
        console.log()
        if (x_selected != null  &&  y_selected != null && visual && agg)
        {
            $('#send_values').prop('disabled',false)
        }

        else 
        {
            $('#send_values').prop('disabled',true)
        }
    }
    $(document).on('click','#send_values', function() {

        if ($('#correlation').is(':checked'))
        {
            data = {
                x_axis : $('#x_select').val(),
                y_axis :$('#y_select').val(),
                visual : 'scatter',
                type : 'correlation'
            }
            if ($('#variable_column').val() &&  $('#variable_column').val() != 'None')
            {
                data.category = $('#variable_column').val()
            }
        }
        else if ($('#aggregate').is(':checked'))
        {
            data = {
                x_axis : $('#x_select').val(),
                y_axis :$('#y_select').val(),
                visual : $('#variable_column').val(),
                type : 'timeseries',
                agg_type : $('#aggregate_column').val()
            }
            
        }
		
        $.ajax({
			data :data,
			type : 'POST',
			url : '/bi_data'
		})
        
        .done(function(data){ 
            {
             update_highchart(data)
            }  
        });
    })

    $(document).on('change','#variable_column[name=value]',function()
    { 
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        //handle visibility of submit button
        manage_val_column(x_selected,y_selected);
    });

    $(document).on('change','#variable_column[name=visual]',function()
    { 
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        //handle visibility of submit button
        manage_agg_columns(x_selected,y_selected);
    });


    $(document).on('change','#aggregate_column',function()
    { 
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        //handle visibility of submit button
        manage_agg_columns(x_selected,y_selected);
    });


    $(document).on('click','#aggregate',function()
    {   
        $("#x_select option:first").prop("selected", true);
        $("#x_select option[dtype$='64']").hide();
        $('#x_select').prop('disabled',false); 
        $("#y_select option:first").prop("selected", true);
        $("#y_select option[dtype='object'],option[dtype*='date']").hide();
        $('#y_select').prop('disabled',false);
        normalize_variable_column();
        $('#send_values').css('visibility','');
        $('#x_select option').css('color','black')
        $('#y_select option').css('color','black')
        $('#send_values').prop('disabled',true)
        
        //handle the variable column to have chart types
        var visuals = ['column','bar','line','scatter']
        $('#variable_column option:first').text('Visual')
        $('#variable_column option:first').prop("selected", true)
        $('#variable_column option:contains(None)').hide();
        $(visuals).each(function(index,value){
            var option = `<option value=${value}>${value.charAt(0).toUpperCase() +value.substring(1)}</option>`
            $('#variable_column').append(option)
        })
        $('#variable_column').attr('name','visual')
        $('#variable_column').css('visibility','');
        $('#aggregate_column').css('visibility','');
    });
    
    $(document).on('change','#x_select',function()
    {   
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        
        //visuals from the column level, highlight error and disable button
        $('#x_select option').css('color','black')
        $('#y_select option').css('color','black')
        if (x_selected == y_selected)
        {
            $('#x_select').css('color','red').attr('title','both Axes are the same')
            $(`#x_select option:contains('${x_selected}')`).css('color','red').attr('title','both Axes are the same');
            $('#y_select').css('color','red').attr('title','both Axes are the same')
            $(`#y_select option:contains('${y_selected}')`).css('color','red').attr('title','both Axes are the same');
            $('#send_values').prop('disabled',true)
        
        }
        else
        {
            $('#x_select').css('color','').attr('title','')
            $(`#x_select option:contains('${x_selected}')`).css('color','green').attr('title','selected in X Axis');
            $('#y_select').css('color','').attr('title','')
            $(`#y_select option:contains('${y_selected}')`).css('color','green').attr('title','selected in Y Axis');
        }
    
        //handling the variable column if both axes are the same data type
        if ($('#correlation').is(':checked'))
        { 
            //$('#aggregate').css('visibility','hidden');
            //$('#date').css('visibility','hidden');
            //first run checks if both axes are objects
            var check_failed = manage_corr_cat('object','category','value','64');
            //second one for pandas integer types
            if (check_failed)
            { 
                manage_corr_cat('64','value','category','object');
            }
            manage_val_column(x_selected,y_selected)
        }

        else if ($('#aggregate').is(':checked'))
        {
            manage_agg_columns(x_selected,y_selected)
        }
        //handle visibility of submit button
       
    });

    $(document).on('change','#y_select',function()
    {   
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();

        //visuals from the column level, highlight error and disable button
        $('#x_select option').css('color','black')
        $('#y_select option').css('color','black')

        if (x_selected == y_selected)
        {
            $('#x_select').css('color','red').attr('title','both Axes are the same')
            $(`#x_select option:contains('${x_selected}')`).css('color','red').attr('title','both Axes are the same');
            $('#y_select').css('color','red').attr('title','both Axes are the same')
            $(`#y_select option:contains('${y_selected}')`).css('color','red').attr('title','both Axes are the same');
            $('#send_values').prop('disabled',true)
        
        }

        else
        {
            $('#x_select').css('color','').attr('title','')
            $(`#x_select option:contains('${x_selected}')`).css('color','green').attr('title','selected in X Axis');
            $('#y_select').css('color','').attr('title','')
            $(`#y_select option:contains('${y_selected}')`).css('color','green').attr('title','selected in Y Axis');
        }
        //handling the variable column if both axes are the same data type
        if ($('#correlation').is(':checked'))
        {   
            //first run checks if both axes are objects 
            var check_failed = manage_corr_cat('object','category','value','64');
            //second one for pandas integer types
            if (check_failed)
            { 
                manage_corr_cat('64','value','category','object');
            }
            manage_val_column(x_selected,y_selected)
        }
        else if ($('#aggregate').is(':checked'))
        {
            manage_agg_columns(x_selected,y_selected)
        }
        //handle visibility of submit button
       
    });
};


    
   