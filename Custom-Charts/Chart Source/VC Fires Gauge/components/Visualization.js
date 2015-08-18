/*
 * Copyright (C) Zoomdata, Inc. 2012-2015. All rights reserved.
 */

/* global controller */

METRIC = "fire";
myFiresChart = echarts.init(controller.element, 'macarons');
firesOption = {

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
            max: 11,
            detail: {
                formatter: function(value) {
                    console.log(value);
                    if (isNaN(value)) {
                        return "NO DATA";
                    } else {
                        return ""+value+"%";
                    }
                },                textStyle: {
                    fontSize: 16
                }
            },
            data:[{value: 50, name: 'FIRES'}],
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

myFiresChart.setOption(firesOption);


controller.update = function(data, progress) {
    percentFire = data[0].current.metrics.fire.sum/data[0].current.count*100;
    firesOption.series[0].data[0].value = (percentFire).toPrecision(2);
    myFiresChart.setOption(firesOption);
};

controller.resize = function(width, height, size) {
    // Called when the widget is resized
};
