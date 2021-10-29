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
        
        Highcharts.chart('sales', {
           
            title: {text: data.title},
            chart: {type: data.type, animation: false},
            yAxis: data.yAxis,
            xAxis: data.xAxis,
            legend: new_legend,
            series: data.series,
            plotOptions: {
                series: {
                    marker: {
                        enabled: false
                    }
                }
            },
        });
        
       
    }
    //map update type
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
        $('#visuals').val(data.state.visual).change();

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
        //visual and aggregate type are always default
        data = {
            visual : $('#visuals').val(),
            agg_type : $('#aggregate_column').val()
        }
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

        //if a date string is specified
        if ($('#isDate').is(':checked') && $('#isDate').prop('disabled') == false)
        {
            data.date_string = $('#date_column').val();
        }

        //warnings 
        data.warnings  = ($('#warning-ignore').is(':checked')) ? true:false;
        
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
    function check_map()
    {
        if ($('#visuals').val() == 'map') 
        {
            $("#visuals").val($("#visuals option:first").val()).change();
        }
    }

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


    //ajax request for new chart visual from server
    $(document).on('click','#send_values', function() {
        //$('#send_values').prop('disabled',true);
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
        //handle map option based on category value
        var category = $(this).val().toLowerCase()

        if (category.includes('country') || category.includes('city'))
        {
            $('#map_type').show()
            $('#aggregate_column').find('option').show()
            handleCategory()
        }

        else if (category.includes('order'))
        {
            $('#map_type').hide()
            handle_orderID()
            check_map()
            
        }

        else if (!category.includes('country') || !category.includes('order')) 
        {
            $('#map_type').hide()
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

    $(document).on('change','#isDate',function()
    { 
        //disable date column on check
        if ($(this).is(':checked'))
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

$(function () {
    var mapData = Highcharts.maps['custom/world'];

    $('#container').highcharts('Map', {
    mapNavigation: {
        enabled: true
    },colorAxis: {
                min: 0 ,stops: [
                    [0, '#0000ff'],
                    [0.5, '#ffffff'],
                    [1, '#ff0000'] 
                
                ]
            },
        series: [{
            name: 'Countries',
            mapData: mapData,
        }, {
            name: 'Points',
            maxSize: '1%',
            minSize: 2,
            type: 'mapbubble',
            data: [{
                name: 'London',
                lat: 51.507222,
                lon: -0.1275,
                z: 1,
               
            },
            {
                name: 'London',
                lat: 60.507222,
                lon: -0.1275,
                z: 1
            },]
        }],
        legend: {
            enabled: false
        },
        title: {
            text: 'World map'
        }
    });

});
*/ 