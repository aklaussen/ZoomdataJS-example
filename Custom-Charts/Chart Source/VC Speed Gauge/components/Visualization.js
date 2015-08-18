/*
 * Copyright (C) Zoomdata, Inc. 2012-2015. All rights reserved.
 */

/* global controller */

METRIC = "speed";
var mySpeedChart = echarts.init(controller.element, 'macarons');
speedOption = {

    tooltip : {
        formatter: "{a} <br/>{b} : {c} MPH",
        show:false
    },
    toolbox: { },
    series : [
        {
            name: METRIC,
            type:'gauge',
            min: 0,
            max: 150,
            detail : {
                formatter:'{value} MPH',
                textStyle: {
                    fontSize: 16
                }
            },
            data:[{value: 50, name: 'SPEED'}],
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

mySpeedChart.setOption(speedOption);


controller.update = function(data, progress) {
    console.log(data);
    speedOption.series[0].data[0].value = Math.round(data[0].current.metrics.speed.avg);
    mySpeedChart.setOption(speedOption);
};

controller.resize = function(width, height, size) {
    // Called when the widget is resized
};
