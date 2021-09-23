function bi_dashboard()
{   
    //initial load based on on the data loaded either from the flask session or the fresh load without cookies
    $.get( "bi_data", function(data) {
        $(data.meta_data).each(function(index,value)
        {   var option = `<option value=${value.name} dtype=${value.dtype}>${value.name} (${value.count})</option>`
            $('#x_select').append(option)
            $('#y_select').append(option)

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
   

    //event listener for handling disabling select of same column in other axis. 
    $(document).on('change',['#x_select','#y_select'],function()
    {

        var x_selected = $('#x_select').val();
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

        //we show another column based on the data type of that selected option
        var x_axis =  $('#x_select').find(":selected").attr('dtype');
        var y_axis =  $('#y_select').find(":selected").attr('dtype');
       
        if (x_axis == 'object' && y_axis == 'object')
        {
           $('#variable_column').css('visibility','')
        }
        else 
        {
            $('#variable_column').css('visibility','hidden')
        }
     
    });

};