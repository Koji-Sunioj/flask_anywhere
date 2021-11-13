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

        
        //1. set the warnings
        $('#warning-ignore').prop('checked', JSON.parse(data.warnings)).change();
        
        //2. set the columns
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

        //3. if there is a value
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
        //4. datalist filter
        $(data.filters).each(function(index,value){
            $('#filtergroup').append(`<option class="dataOption" value="${value}">`)
            
        });

        //5. send filter buttons if stored in session
        if (data.wheres)
        {   $('#filters').parent().css('background-color','white')
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
                    param = parseInt(param)
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
                    param = parseInt(param)
                }
                filters.push({column: target, parameter: param,origin:$(value).text(),operand:$(value).attr('operand')}) 
            })
        }

        data = {
            filterData : JSON.stringify(filters) 
        }
        $.ajax({
            data :  data,
            type : 'POST',
            url : '/frame_filter/'
        })
 
        .done(function(data){ 
            {
                //update the table
                console.log(data)
            }  
        });
    }

    //ajax request for new chart visual from server
    $(document).on('click','#send_values', function() {
       // $('#send_values').prop('disabled',true);
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
                }

                else if  ($('#DateFilter').is(':visible'))
                {
                    var fixed_name = column.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
                    column = fixed_name.join(' '); 
                    var parameter = $('#DateFilter').val()
                }

                $('#filters').parent().css('background-color','white')
                $('#filters').append(`
                    <div class="btn-group me-2" role="group" style="padding:5px;">
                        <button class="btn btn-primary btn-sm button_filter" operand="${operand}" type="filter">${column +' '+ operand +' '+ parameter}</button>
                    </div>`)
                
                $('#DateFilter').val('').keyup()
                $('#NumericMath').change();
            }
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
                    console.log(numvars)
                    console.log(operand)
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

    $(document).on('click','button[type=filter]',function()
    {   
        $(this).parent().remove();
        var buttonFilter = $(this).text();
        if ($('#filters button').length == 0)
        {
            $('#filters').parent().css('background-color','') 
            $('#filters').empty(); 
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
    });


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

     $('#CategoricCheck').on('change',function(){
        if ($(this).is(':checked')) 
        {
            $('.NumericFilter').hide();
            $('#DateFilter').hide()
            $('#params').show();
           
        }
     })

     $(document).on('keydown','#NumericFilterField',function(event)
    {   
        var max_length = $('#NumericFilterField').attr('maxlength')
        console.log(max_length)
        console.log($('#NumericFilterField').val().length)
       
        if(!((event.keyCode > 95 && event.keyCode < 106) || (event.keyCode > 45 && event.keyCode < 58) || event.keyCode == 8  || $('#NumericFilterField').val().length > max_length)) 
        {
            return false;
        }
    })

    $(document).on('keyup','#NumericFilterField',function()
    {   
        var mins = Number($('#NumericFilterField').attr('min'));
        var maxs = Number($('#NumericFilterField').attr('max'));
        var actual = Number($('#NumericFilterField').val());
       
        if (actual >= mins &&  actual <= maxs) 
        {   
            $('#NumericFilterField').css('color','black');
            check_num_filters() 
        }

        else if (actual < mins ||  actual > maxs) 
        {   
            $('#NumericFilterField').css('color','red');
        }

        else if ($('#NumericFilterField').val().length == 0) 
        {
            $('#NumericFilterField').css('color','black')
            $('#addFilter').prop('disabled',true)
        }
        
    })
};



function test()
{

     $('#NumericFilter').on('change',function(){
        if ($(this).is(':checked')) 
        {
            $('#NumFilterRow').show();
            $('#CatFilterRow').hide();
        }

     })

     $('#CategoricFilter').on('change',function(){
        if ($(this).is(':checked')) 
        {
            $('#NumFilterRow').hide();
            $('#CatFilterRow').show();
        }

     })

     $(document).on('change','#NumericSelect',function(){
        //alert($(this).val() )
        if ($(this).val() == 'Date')
        {
            $('#NumberFilterField').hide();
            $('#DateFilter').show()
        }

        else 
        {
            $('#NumberFilterField').show();
            $('#DateFilter').hide()
        }

     })


     var table_data = JSON.parse($('#table_data').val())
    
     $.each(table_data, function(key,value){
        var fixed_name = key.split(/(^[A-Z][a-z]+|[A-Z][A-Z]+)/g)
        fixed_name = fixed_name.join(' ');
        var table_header = `<th scope="col">${fixed_name}</th>`

        $('#table_header').append(table_header)
    
        $(value).each(function(index,data)
        {
            var cell = `<td rowspan=${data.span}>${data.name}</td>`
            $(`#table_target tr:eq(${data.index})`).append(cell)
            
        });
    });
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

    $(document).on('keyup','#paginAtor',function(event)
    {  
        if ($('#paginAtor').val() >  52)
        {   
            $('#paginAtor').val(52);
            
        }
        else if(!((event.keyCode > 95 && event.keyCode < 106) || (event.keyCode > 47 && event.keyCode < 58) || event.keyCode == 8)) 
        {
          return false;
        }
    })

    $(document).on('keydown','#paginAtor',function(event)
    {  
       if(!((event.keyCode > 95 && event.keyCode < 106) || (event.keyCode > 47 && event.keyCode < 58) || event.keyCode == 8)) 
        {
          return false;
        }
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