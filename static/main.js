function bi_dashboard()
{
    $.get( "bi_data", function(data) {
        
        
        $(data.meta_data).each(function(index,value)
        {   
            //console.log(value);
            $('#col_count').append(`<option value=${value.name}>${value.name} (${value.count})</option>`)
        });
       //console.log(data.series)
      Highcharts.chart('sales', {

        title: {
            text: `sales between ${data.xAxis.categories[0]} and ${data.xAxis.categories[data.xAxis.categories.length - 1]}`
        },
    
        subtitle: {
            text: 'Source: thesolarfoundation.com'
        },
    
        yAxis: {
            title: {
                text: 'sales'
            }
        },
    
        xAxis: data.xAxis,
    
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