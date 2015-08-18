/*
 * Copyright (C) Zoomdata, Inc. 2012-2015. All rights reserved.
 */

/* global $, controller */

'use strict';

$(controller.element).css('display', 'inline');
$(controller.element).parent().css('display', 'inline');

controller.update = function(data, progress) {

    var count = controller.metrics['Count'].raw(data[0]);
    if(count < 0) { count = 0; }
    
    // Just send the raw number of complaints
    $(controller.element).text(count);
    
    // The raw text will be styled with CSS in the page.

};

controller.resize = function(width, height, size) {
    // Called when the widget is resized
};
