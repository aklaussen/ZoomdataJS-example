/*
 * Copyright (C) Zoomdata, Inc. 2012-2015. All rights reserved.
 */

/* global controller */

METRIC = "INJURIES";
iMINIMUM = 0;
iMAXIMUM = 20;
myInjuriesChart = echarts.init(controller.element, 'macarons');
injuriesOption = {

    tooltip : {
        show:false
    },
    toolbox: { },
    series : [
        {
            name: METRIC,
            type:'gauge',
            min: iMINIMUM,
            max: iMAXIMUM,
            detail: {
                formatter: function(value) {
                    if (isNaN(value)) {
                        return "NO DATA";
                    } else {
                        return ""+value+"%";
                    }
                },                textStyle: {
                    fontSize: 16
                }
            },
            data:[{value: 50, name: 'INJURIES'}],
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
                offsetCenter: [0, '-115%'],
                textStyle: {
                    color: '#eee',
                    fontSize : 12
                }
            }
        }
    ]
};

myInjuriesChart.setOption(injuriesOption);


controller.update = function(data, progress) {
    var percentInjured = (data[0].current.metrics.injured.sum/data[0].current.count*100).toPrecision(2);
    injuriesOption.series[0].data[0].value = percentInjured;
    myInjuriesChart.setOption(injuriesOption);
};

controller.resize = function(width, height, size) {
    // Called when the widget is resized
};
