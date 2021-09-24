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
   
    function manage_corr_cat()
    {

        var x_axis =  $('#x_select').find(":selected").attr('dtype');
        var y_axis =  $('#y_select').find(":selected").attr('dtype');
        //if both
        if ([x_axis,y_axis].map(e => e === 'object').every(Boolean))
        {   

            if ($('#variable_column').attr('name') =='category')
            {
                $('#variable_column option').not(':first').remove();  
            }

            $('#variable_column').attr('name','value')
            $('#variable_column').css('visibility','')
            if($('#variable_column option').length == 1)
            {   $('#variable_column option:first').text('Value').prop('disabled',true)
                $('#x_select option').each(function(index,value)
                { 
                   if ($(value).attr('dtype') == 'int64' || $(value).attr('dtype') == 'float64' )
                   { 
                     $('#variable_column').append($(value).clone())
                   }
                })
            }   
        }

        else if ([x_axis,y_axis].map(e => e === 'int64' || e === 'float64' ).every(Boolean))
        {
            if ($('#variable_column').attr('name') =='value')
            {
                $('#variable_column option').not(':first').remove();  
            }
            $('#variable_column').attr('name','category')
            $('#variable_column').css('visibility','')
            if($('#variable_column option').length == 1)
            {
                {$('#variable_column option:first').text('Category').prop('disabled',true)
                $('#x_select option').each(function(index,value)
                { 
                   if ($(value).attr('dtype') == 'object')
                   { 
                     $('#variable_column').append($(value).clone())
                   }
                })
            }
            }
            
        }

        else 
        {
            $('#variable_column').css('visibility','hidden')
        }/**/

    }
    //event listener for handling disabling select of same column in other axis. 
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


        manage_corr_cat();
     
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

        manage_corr_cat();
     
    });
};

/*
//event listener for handling disabling select of same column in other axis. 
    $(document).on('change',['#x_select','#y_select'],function()
    {

        var x_selected = $('#x_select').val();
        var y_selected = $('#y_select').val();
        //("#target").val($("#target option:first").val());



        
        $('#y_select').find('option').each(function(index,value)
        {  
            if (x_selected == $(value).val() || $(value).val() == 'Y-Axis')
            {
                $(value).prop('disabled',true);
            }        
            else 
            {
                $(value).prop('disabled',false);
            }
        })
        var y_selected = $('#y_select').val();
        $('#x_select').find('option').each(function(index,value)
        {   
            if (y_selected == $(value).val() || $(value).val() == 'X-Axis')
            {
                $(value).prop('disabled',true);
            }             
            else 
            {
                $(value).prop('disabled',false);
            }
        })

        manage_corr_cat()
     
    });*/