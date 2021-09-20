function bi_dashboard()
{
    $.get( "bi_data", function(data) {
        
        //send the columns to select input
        //$(data.meta_data).each(function(index,value)
       // {   
       //     $('#col_count').append(`<option value=${value.name}>${value.name} (${value.count})</option>`)
       // });
     
       
    
       //render the chart
      Highcharts.chart('sales', {
        title: {
            text: data.title
        },
        chart: {
            type: data.type
        },
    
        yAxis: {
            title: {
                text:  data.yAxis.title
            }
        },
    
        xAxis: data.xAxis,
    
        
       /* tooltip: {
            formatter: function(){
            if (data.type == 'scatter') 
            {
                {
                    var string='<strong>'+this.series.name + '</strong><br>'+data.xAxis.title.text+': '+ this.x+'<br>'+this.y;
                   
                }
            }
            else
            {
                var string='x: '+this.x+', <br>: '+this.y+', date: '+this.series.name;
            }
                return string;
            }
            
        },*/
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle'
        },
    
        plotOptions: {
            series: {
                point: {
                    events: {
                        click: function () {
                            console.log('Category: ' + this.category + ', value: ' + this.y);
                        }
                    }
                },
                linewidth: .5,
                enableMouseTracking: true,
                marker: {
                    enabled: true
                },dataGrouping: {
                    enabled: false
                 }
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
    
    });
      
}) };