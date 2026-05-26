(function () {
    'use strict';
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
        meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no");
    } else {
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");
        meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no");
        document.head.appendChild(meta);
    }
})();
