function bi_dashboard()
{
    $.get( "bi_data", function(data) {
       

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