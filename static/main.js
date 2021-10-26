function bi_dashboard()
{   
    
   
    
   

    function update_highchart(data)
    {   

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
        Highcharts.chart('sales', {
           
            title: {text: data.title},
            chart: {type: data.type, animation: false},
            yAxis: data.yAxis,
            xAxis: data.xAxis,
            legend: new_legend,
            series: data.series,
           
           
        //highchart ends here 
        });
        
       
    }

    function update_map(data)
    {
        
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
        $('#warning-ignore').prop('checked', JSON.parse(data.warnings)).change();

        $(data.meta_data).each(function(index,value)
        {   
            var fixed_name = value.name.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
            fixed_name = fixed_name.join(' ');
            var option = `<option value=${value.name} title='${value.count} values' dtype=${value.dtype}>${fixed_name}</option>`
            

            if (value.dtype.includes('int64') || value.dtype.includes('float64'))
            {
                $('#values').append(option);
            }
            else if (value.dtype.includes('object'))
            {
                $('#categories').append(option);
            }

        });

        //if there is a value
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
        if (data.state.category == 'OrderDate')

        {
            $('#isCategory').attr('checked',false).change()
        }


        else if (data.state.category == false)
        {
            $('#categories option:first').prop("selected", true).change()
            $('#isCategory').attr('checked',false).change()
        }

        else 
        {
            $('#categories').val(data.state.category).change();
            $('#isCategory').attr('checked',true).change()
        }

        
        //visuals always exists
        $('#visuals').val(data.state.visual);

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
        
        if (data.state.date_string)
        {
            $('#date_column').val(data.state.date_string)
            $('#isDate').attr('checked',true).change()
           
        }
        
        //update highcharts here
        if (data.state.visual != 'map')
        {
            update_highchart(data);
        }
        else if (data.state.visual == 'map')
        {
            update_map(data)
        } 
       
    //get request ends here  
    })

    function ajax_data()
    {   
        data = {
            
           
            visual : $('#visuals').val(),
            agg_type : $('#aggregate_column').val()
        }

        console.log(data)
        //if value is viewable, send it
        if ($('#values').prop('disabled') == false)
        {
            data.value = $('#values').val()
        }

        //if category not marked off, send it
        if ($('#isCategory').is(':checked') )
        {
            data.category = $('#categories').val();
           
        }

        if ($('#isDate').is(':checked') && $('#isDate').prop('disabled') == false)
        {
            data.date_string = $('#date_column').val();
        }

        if ($('#warning-ignore').is(':checked'))
        {
            data.warnings = true
        }

        else
        {
            data.warnings = false
        }
        
        $.ajax({
            data :data,
            type : 'POST',
            url : '/bi_data'
        })
        
        .done(function(data){ 
            {   
                console.log(data)
                //update_highchart(data)
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

    //ajax request for new chart visual from server
    $(document).on('click','#send_values', function(event) {
        $('#send_values').prop('disabled',true);
        $('#sales').css('opacity',0.5)
        ajax_data();
    })

    $('#resume_ajax').on('click',function()
    {
        ajax_data(); 
    })

    $('#cancel_ajax').on('click',function()
    {
        $('#send_values').prop('disabled',false);
        $('#sales').css('opacity',1)
    })
   
    //button visibility: fires only for correlative chart type
    function manage_val_column(values,categories)
    {   
        if (values != null  && categories != null && values !=categories )
        {
            $('#send_values').prop('disabled',false)
        }

        else 
        {
            $('#send_values').prop('disabled',true)
        }
    }



    function manage_send(values,categories)
    
    {
        var visual = $('#visuals').val();
        var agg = $('#aggregate_column').val();
       
      
        if (values != null  && categories != null && visual && agg)
        {
            //$('#send_values').prop('disabled',false)
            if ($('#date_column').val() == null ||values ==categories )
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

    $(document).on('change','#visuals',function()
    { 
        var values = $('#values').val();
        var categories = $('#categories').val();
        
        if ( $('#visuals').val() == 'map')
        {
            $('#date_column').prop('disabled',true)
            $('#isDate').prop('disabled',true)
          
        }
        else
        {
            $('#date_column').prop('disabled',false)
            $('#isDate').prop('disabled',false).change()
        }
        manage_val_column(values,categories);
    });

    $(document).on('change','#date_column',function()
    { 
        var values = $('#values').val();
        var categories = $('#categories').val();
        //handle visibility of submit button
        manage_val_column(values,categories);
    });

    $(document).on('change','#isDate',function()
    { 
       if ($('#isDate').is(':checked'))
       {
        $('#date_column').prop('disabled',false);
       }

       else 
       {
        $('#date_column').prop('disabled',true);
       }
    });

    $(document).on('change','#isCategory',function()
    { 
        if ($('#isCategory').is(':checked'))
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

    $(document).on('change','#categories',function()
    { 
       if ($('#categories').val().toLowerCase().includes('country'))
       {
          $('#map_type').show()
       }

       else 
       {
            $('#map_type').hide()
       }
    });

    $(document).on('change','#aggregate_column',function()
    { 
        var values = $('#values').val();
        var categories = $('#categories').val();
        //handle visibility of submit button
        if ($('#aggregate_column').val() == 'nunique')
        {
            $('#values').prop('disabled',true)
        } 

        else 

        {
            $('#values').prop('disabled',false)
        }
        
        //handle visibility of submit button
        manage_send(values,categories);
    });
};



function test()
{
    //$(document).ready( function () {
    //    $('#table_id').DataTable();
    //} );
    
    $(document).on('keyup','#params',function(){
        var params = $('#params').val();
       // var buttonTexts = $.map($('#filters button'), function(val) {  
       //     return $(val).text()
       // });  

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


    function ajax_filters()
    {
        var filters = []
        $('#filters button').each(function(index,value)
        {  
           var filterArr = $(value).text().split(':')
           var target = filterArr[0].trim().replace(/\s/g, '')
           var param = filterArr[1].trim()
           filters.push({column: target, parameter: param}) 

        })

       data = {
           filterData : JSON.stringify(filters) 
       }
        
      
       //send to server
        $.ajax({
           data :data,
           type : 'POST',
           url : '/filter/'
       })


       .done(function(data){ 
           {
               //update the table
               $('.metaColumn').each(function(index,value)
               {
                   if (data[index]['name'] == $(value).attr('header'))
                   { 
                       $(value).text(data[index]['count'])
                   }
               })
           }  
       });
    }


    $(document).on('click','#addFilter',function(){
        {   
           
            //disable selected value in data list
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
                    <button class="btn btn-primary btn-sm" type="filter">${$('#params').val()}</button>
                </div>`)
            $('#params').val('');
            $('#addFilter').prop('disabled',true);

            //send text of filters in div to an array
            ajax_filters()
            
        }
    })

    $(document).on('click','button[type=filter]',function()
    {

        
        $(this).parent().remove();
        var buttonFilter = $(this).text();
        if ($('#filters button').length == 0)
        {
            $('#filters').parent().css('background-color','') 
            $('#filters').empty(); 
        }
        $('.dataOption').each(function(index,value){
            if ($(value).val() == buttonFilter)
            {
                $(value).prop('disabled',false)
            }
        })
        ajax_filters()
    })

}



 //http://jsfiddle.net/dnbtkmyz/
    /*
    $(function () {
    var mapData = Highcharts.maps['custom/world'];

    $('#container').highcharts('Map', {
        series: [{
            name: 'Countries',
            mapData: mapData,
        }, {
            name: 'Points',
            type: 'mappoint',
            data: [{
                name: 'London',
                lat: 51.507222,
                lon: -0.1275
            }, {
                name: 'Moscow',
                lat: 55.7500,
                lon: 37.6167
            }, {
                name: 'Beijing',
                lat: 39.9167,
                lon: 116.3833
            }, {
                name: 'Washington D.C.',
                lat: 38.889931,
                lon: -77.00900,
                color: 'red',
                marker: {
                            radius: 2
                        }
            }]
        }],
        legend: {
            enabled: true
        },
        title: {
            text: 'World map'
        }
    });
http://jsfiddle.net/BlackLabel/gbduyLo9/
});

function update_highchart(data)
{   
    data.yAxis.scrollbar =  {
        enabled: true
    }
    
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
    

    if (data.yAxis.categories && data.yAxis.categories.length * 20 < 400 || !data.yAxis.categories)
    {
        var new_height = 400  
    }

    else 
    {
        var new_height = data.yAxis.categories.length * 20
    }

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
   //render the chartlet chart = 
    Highcharts.chart('sales', {
       
        title: {text: data.title},
        chart: {type: data.type, animation: false},
        chart: {type: data.type, animation: false,height:new_height},
        yAxis: data.yAxis,
        xAxis: data.xAxis,
        legend: new_legend,
        plotOptions: { 
            
            series: {
                marker: marker,
                }
                
                point: {
                    events: {
                        click: function () {
                            console.log('Category: ' + this.category + ', value: ' + this.y);
                        }
                    }
                },
            }
        },
        colorAxis: {
            min: 0,
            max: 20
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
*/ 