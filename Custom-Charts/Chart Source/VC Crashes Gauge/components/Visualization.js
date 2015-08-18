/*
 * Copyright (C) Zoomdata, Inc. 2012-2015. All rights reserved.
 */

/* global controller */

METRIC = "CRASHES";
cMIN = 0;
cMAX = 30;
myCrashesChart = echarts.init(controller.element, 'macarons');
crashesOption = {
    tooltip : {
        show:false
    },
    toolbox: { },
    series : [
        {
            name: METRIC,
            type:'gauge',
            min: cMIN,
            max: cMAX,
            detail: {
                formatter: function(value) {
                    console.log(value);
                    if (isNaN(value)) {
                        return "NO DATA";
                    } else {
                        return ""+value+"%";
                    }
                },
                textStyle: {
                    fontSize: 16
                }
            },
            data:[{value: 50, name: 'CRASHES'}],
            axisTick: {show:false},
            axisLine: {
                show: true,
                lineStyle: {
                    color: '#777',
                    width: 8
                }
            },
            splitLine: {show:false},
            axisLabel: {show:false},
            pointer: {color:'#eee'},
            title: {
                show : true,
                // Display the title above the gauge
                offsetCenter: [0, '-115%'],
                textStyle: {
                    color: '#eee',
                    fontSize : 12
                }
            }
        }
    ]
};

myCrashesChart.setOption(crashesOption);


controller.update = function(data, progress) {
    percentCrashed = (data[0].current.metrics.crashed.sum / data[0].current.count * 100).toPrecision(2);
    crashesOption.series[0].data[0].value = Math.max(cMIN, percentCrashed);
    myCrashesChart.setOption(crashesOption);
};

controller.resize = function(width, height, size) {
    // Called when the widget is resized
};
