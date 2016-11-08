define(['jquery', 'base/js/utils'], function ($, utils) {
    function createDisplayDiv() {
        $('#maintoolbar-container').append(
            $('<div>').attr('id', 'nbresuse-display')
                      .addClass('btn-group')
                      .addClass('pull-right')
            .append(
                $('<strong>').text('Mem: ')
            ).append(
                $('<span>').attr('id', 'nbresuse-mem')
                           .attr('title', 'Actively used Memory (updates every 5s)')
            )
        );
    }

    var displayMetrics = function() {
        $.getJSON(utils.get_body_data('baseUrl') + 'metrics', function(data) {
            // FIXME: Proper setups for MB and GB. MB should have 0 things
            // after the ., but GB should have 2.
            var display = str((data['rss'] / (1024 * 1024)).toFixed(0)) + " MB";

            if (data['limits']['mem'] !== null) {
                display += " / " + (data['limits']['mem'] / (1024 * 1024));
            }
            $('#nbresuse-mem').text(display);
        });
    }

    var load_ipython_extension = function () {
        createDisplayDiv();
        displayMetrics();
        // Update every five seconds, eh?
        setInterval(displayMetrics, 1000 * 5);
    };

    return {
        load_ipython_extension: load_ipython_extension,
    };
});
