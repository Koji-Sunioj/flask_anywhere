function bi_dashboard()
{   
    //initial load based on on the data loaded either from the flask session or the fresh load without cookies
    $.get( "bi_data", function(data) {
        $(data.meta_data).each(function(index,value)
        {   var option = `<option value=${value.name} dtype=${value.dtype}>${value.name} (${value.count})</option>`
            $('#x_select').append(option);
            $('#y_select').append(option);

        });
        if (data.type == 'scatter')
        {
           var symbol = 'circle'
        }
        else 
        {
            var symbol = symbol
        }
    
       //render the chart
        Highcharts.chart('sales', {
            title: {text: data.title},
            chart: {type: data.type},
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
                       radius: 5
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
                            align: 'center',
                            verticalAlign: 'bottom'
                        }
                    }
                }]
            }
        //highchart ends here 
        }); 
         
    //get request ends here  
    })

    //undisable the select once clicked on
    $(document).on('click','#correlation',function()
    {
        $('#x_select').prop('disabled',false);
        $('#y_select').prop('disabled',false);
    });
   

    //function to manage the variable column depending on data type of chosen axes
    function manage_corr_cat(dtype,prev_category,new_category,opp_dtype)
    {
        var x_axis =  $('#x_select').find(":selected").attr('dtype');
        var y_axis =  $('#y_select').find(":selected").attr('dtype');

        //if both
        if ([x_axis,y_axis].map(e => e.includes(String(dtype))).every(Boolean))
        {   

            if ($('#variable_column').attr('name') ==prev_category)
            {
                $('#variable_column option').not(':first').remove();  
            }

            $('#variable_column').attr('name',new_category)
            $('#variable_column').css('visibility','')
            if($('#variable_column option').length == 1)
            {   $('#variable_column option:first').text(new_category).prop('disabled',true).css('text-transform','capitalize')
                $('#variable_column').css('text-transform','capitalize')
                $('#x_select option').each(function(index,value)
                { 
                   if ( String($(value).attr('dtype')).includes(String(opp_dtype))  )
                   { 
                     $('#variable_column').append($(value).clone())
                   }
                })
            }
            return false   
        }

        else 
        {
            $('#variable_column').css('visibility','hidden')
            return true
        }

    }
    
    $(document).on('change','#x_select',function()
    {   
      
        
            $('#y_select option').css('color','black')
            var x_selected = $('#x_select').val();
            var y_selected = $('#y_select').val();

            
            $('#y_select').find('option').each(function(index,value)
            {  
                if (x_selected == $(value).val())
                {
                    $(value).css('color','green').attr('title','selected in X Axis');
                }        
            });
            
            if (x_selected == y_selected)
            {
                $('#x_select').css('color','red').attr('title','both Axes are the same')
                $('#y_select').css('color','red').attr('title','both Axes are the same')
            }
            else
            {
                $('#x_select').css('color','black').attr('title','')
                $('#y_select').css('color','black').attr('title','')
            }
        
        if ($('#correlation').is(':checked'))
        { 
            
            var check_failed = manage_corr_cat('object','category','value','64');
            if (check_failed)
            { 
                manage_corr_cat('64','value','category','object');
            }
        }
           
            
    });

    $(document).on('change','#y_select',function()
    {   
        
        $('#x_select option').css('color','black')
        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();

        $('#x_select').find('option').each(function(index,value)
        {  
            if (y_selected == $(value).val())
            {
                $(value).css('color','green').attr('title','selected in Y Axis');
            }        
        });

        if (x_selected == y_selected)
        {
            $('#x_select').css('color','red').attr('title','both Axes are the same');
            $('#y_select').css('color','red').attr('title','both Axes are the same');
        }
        else
        {
            $('#x_select').css('color','black').attr('title','');
            $('#y_select').css('color','black').attr('title','');
        }
        if ($('#correlation').is(':checked'))
        { 
            var check_failed = manage_corr_cat('object','category','value','64');
            if (check_failed)
            { 
                manage_corr_cat('64','value','category','object');
            }
        }
        
     
     
    });
};


    
   