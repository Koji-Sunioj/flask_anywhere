function bi_dashboard()
{   function update_highchart(data)
    {   
        /*data.yAxis.scrollbar =  {
            enabled: true
        }*/
        
        if (data.type == 'scatter')
        {
            var marker = 
               {
                    symbol: 'circle',
                    radius: 3,
                    
                 }
            //var symbol = 'circle';
        }
        else 
        {
            var marker = {
                enabled: false
            };
        }
        

        if (data.yAxis.categories && data.yAxis.categories.length * 20 < 400 || !data.yAxis.categories)
        {
            var new_height = 400  
        }

        else 
        {
            var new_height = data.yAxis.categories.length * 20
        }

        if (data.series.length > 24)
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
       //render the chartlet chart = 
        Highcharts.chart('sales', {
           
            title: {text: data.title},
            chart: {type: data.type, animation: false,height:new_height},
            yAxis: data.yAxis,
            xAxis: data.xAxis,
            legend: new_legend,
            plotOptions: { 
                
                series: {
                    marker: marker,
                    }
                    /*
                    point: {
                        events: {
                            click: function () {
                                console.log('Category: ' + this.category + ', value: ' + this.y);
                            }
                        }
                    },
                }*/
            },
            series: data.series,
            tooltip: {
                
                formatter: function (tooltip) {
                    
                    if (data.type == 'scatter' && data.xAxis.categories && data.yAxis.categories) {
                        
                        return `<strong style='color:${this.point.color}'>&#9679</strong> ${data.legend}: <strong>`+this.series.name + '</strong><br>'+data.xAxis.title.text +': '+ this.series.xAxis.categories[this.point.x] +'<br>'+data.yAxis.title.text +': '+this.series.yAxis.categories[this.point.y];
                    }
                    // If not null, use the default formatter
                   // console.log(tooltip)
                    return tooltip.defaultFormatter.call(this, tooltip);
                }
            }
           
        //highchart ends here 
        });
    }
    //initial load based on on the data loaded either from the flask session or the fresh load without cookies
    $.get( "bi_data", function(data) {
        $(data.meta_data).each(function(index,value)
        {   
            var fixed_name = value.name.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
            fixed_name = fixed_name.join(' ');
            var option = `<option value=${value.name} title='${value.count} values' dtype=${value.dtype}>${fixed_name}</option>`
            $('#x_select').append(option);
            $('#y_select').append(option);

        });
        //reinstate html inputs from previous session
        $(`#${data.state.chart_type}`).prop("checked", true).click();
        $('#x_select').val(data.state.x).change();
        $('#y_select').val(data.state.y).change();

        if (data.state.chart_type == 'correlation')
        {
            if (data.state.corr_cat == false)
            {
                $('#variable_column').val('None').change();
            }
            else if (data.state.corr_cat)
            {
                $('#variable_column').val(data.state.corr_cat).change();
            }

        }

        else if (data.state.chart_type == 'aggregate')
        {   
            
            $('#variable_column').val(data.state.visual).change();
            $('#aggregate_column').val(data.state.agg_type).change();
            if (data.state.date_string)
            {
                $('#date_column').val(data.state.date_string).change()
            }

        }
        
        //update highcharts here
        update_highchart(data);
    //get request ends here  
    })

    //ajax request for new chart visual from server
    $(document).on('click','#send_values', function() {
        $('#send_values').prop('disabled',true);

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
                type : 'aggregate',
                agg_type : $('#aggregate_column').val()
            }

            if ($('#date_column').val() != null)
            {
                data.date_string = $('#date_column').val();
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
                $('#send_values').prop('disabled',false);
            }  
        });
    })

    $('#modalshow').on('click',function()
    
    {
        $('#exampleModal').modal('show')
    })

    //interface for correlative chart type
    $(document).on('click','#correlation',function()
    {
        $("#x_select option:first").prop("selected", true)
        $("#x_select option").show();
        $("#y_select option").show();
        $('#x_select').prop('disabled',false);
        $("#y_select option:first").prop("selected", true)
        $('#y_select').prop('disabled',false);
        $('#send_values').css('visibility','');
        normalize_variable_column();
        $('#variable_column option:contains(None)').show();
        $('#x_select option').css('color','black')
        $('#y_select option').css('color','black')
        $('#send_values').prop('disabled',true)
        $('#aggregate_column').css('visibility','hidden');
        $('#date_column').css('visibility','hidden');
        $("#date_column:first").prop("selected", true);
    });

    //interface for aggregate type
    $(document).on('click','#aggregate',function()
    {   
        $("#x_select option:first").prop("selected", true);
        $("#x_select option[dtype='int64']").hide();
        $("#x_select option[dtype='float64']").hide();
        $('#x_select').prop('disabled',false); 
        $("#y_select option:first").prop("selected", true);
        $("#y_select option[dtype='object']").hide();
        $("#y_select option[dtype='datetime64[ns]']").hide();
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
        $('#date_column').css('visibility','');
        $("#date_column option:first").prop("selected", true);
    });
   
    //called whenever the variable column needs to be emptied out
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
        var axis_arr = [x_axis,y_axis]
        
        if (axis_arr.includes('datetime64[ns]'))
        {
            axis_arr[axis_arr.indexOf('datetime64[ns]')] = 'object';
        }
        //if any value is not selected, it will be undefined. hide column but make sure it's empty.
        //needs to be first because one column is always unselected on the first drop
        if (x_axis == undefined || y_axis == undefined)
        {
            normalize_variable_column();
            return true
        }
        
        //if both axes are the same data type, load the column with the opposite type
        // else if ([x_axis,y_axis].map(e => e.includes(String(dtype))).every(Boolean))
        
        
        else if (axis_arr.map(e => e.endsWith(dtype)).every(Boolean))
        {   
            if ($('#variable_column').attr('name') ==prev_category)
            {
                normalize_variable_column();
            }

            $('#variable_column').attr('name',new_category)
            $('#variable_column').css('visibility','')
            console.log($('#variable_column').attr('name'),prev_category)
            if($('#variable_column option').length == 2)
            {   $('#variable_column option:first').text(new_category.charAt(0).toUpperCase() +new_category.substring(1)).prop('disabled',true) //.css('text-transform','capitalize')
                console.log('fill')
                $('#x_select option').each(function(index,value)
                { 
                    
                   if ( String($(value).attr('dtype')).includes(opp_dtype) && !String($(value).attr('dtype')).includes('date') && !String($(value).val()).includes('Order'))
                   { 
                     $('#variable_column').append($(value).clone())
                   }
                })
                $("#variable_column option:first").prop("selected", true)
            }
            return false   
        }

        //this handles nulls and if both axes are different
        else if ($('#variable_column').attr('name') !=prev_category)
        {   
            normalize_variable_column();
            return true
        }

        else 
        {
            
            return true
        }
    }

    //button visibility: fires only for correlative chart type
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

    //button visibility: fires only for aggregate chart type
    function manage_agg_columns(x_selected,y_selected)
    {   
        var visual = $('#variable_column').val();
        var agg = $('#aggregate_column').val();
        var x_is_date = $('#x_select').find(":selected").attr('dtype');
        //console.log($('#date_column').val())
        if (x_selected != null  &&  y_selected != null && visual && agg)
        {
            //$('#send_values').prop('disabled',false)
            if (x_is_date == 'datetime64[ns]' && $('#date_column').val() == null)
            {
                $('#send_values').prop('disabled',true)
            }

            else 
            {
                $('#send_values').prop('disabled',false)
            }
        }

        else 
        {
            $('#send_values').prop('disabled',true)
        }
    }


    //anything past here is for select input handling and  button visibility!!

    $(document).on('change','#variable_column[name=value]',function()
    { 
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        //handle visibility of submit button
        manage_val_column(x_selected,y_selected);
    });

    $(document).on('change','#date_column',function()
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


   
    function col_bools()
    {
        {   
            var x_selected = $('#x_select').val();
            var y_selected = $('#y_select').val();
            
            //visuals from the column level, highlight error and disable button
            $('#x_select option').css('color','black')
            $('#y_select option').css('color','black')
            //disable button if both values are the same
            if (x_selected == y_selected)
            {
                $('#x_select').css('color','red');
                $('#x_select option:selected').css('color','red');
                $('#y_select').css('color','red');
                $('#y_select option:selected').css('color','red');
                $('#send_values').prop('disabled',true)
            
            }
            else
            {
                $('#x_select').css('color','');
                $('#x_select option:selected').css('color','green');
                $('#y_select').css('color','');
                $('#y_select option:selected').css('color','green');
            }
        
            //handling the variable column if both axes are the same data type
            if ($('#correlation').is(':checked'))
            { 
                //first run checks if both axes are objects
                var check_failed = manage_corr_cat('object','category','value','64');
                //second one for pandas integer types
                if (check_failed)
                { 
                    //console.log('asd')
                    manage_corr_cat('64','value','category','object');
                }
                manage_val_column(x_selected,y_selected)
            }

            else if ($('#aggregate').is(':checked'))
            {  
                manage_agg_columns(x_selected,y_selected)
            }
            
        
        } 
    }

    
    $(document).on('change','#x_select',function()
    {   
        col_bools()
    });

    $(document).on('change','#y_select',function()
    {   
        col_bools() 
    });
};


    
   