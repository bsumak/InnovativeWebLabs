document.addEventListener('DOMContentLoaded', function() {
    if (typeof webgazer !== 'undefined') {
        let obj = null;
        let obj2 = null;
        webgazer.setGazeListener(function(data, timestamp) {
            if (data) {
                let x = data.x;
                let y = data.y;
                window.moveTo(x, y);
                console.log(data);
                if(obj != null && obj2 != null && obj === document.elementFromPoint(x, y) && obj === obj2) {
                    document.elementFromPoint(x, y).click();
                }
                obj = document.elementFromPoint(x, y);
                obj2 = obj
            }
        }).begin();

    } else {
        console.error("Webgazer.js is not loaded. Make sure to include it in your HTML.");
    }
});
