define(['jquery', 'base/js/utils'], function ($, utils) {
    function setupDOM() {
        $('#maintoolbar-container').append(
            $('<div>').attr('id', 'nbresuse-display')
                      .addClass('btn-group')
                      .addClass('pull-right')
            .append(
                $('<strong>').text('Memory: ')
            ).append(
                $('<span>').attr('id', 'nbresuse-mem')
                           .attr('title', 'Actively used Memory (updates every 5s)')
            )
        );
        // FIXME: Do something cleaner to get styles in here?
        $('head').append(
            $('<style>').html('.nbresuse-warn { background-color: #FFD2D2; color: #D8000C; }')
        );
        $('head').append(
            $('<style>').html('#nbresuse-display { padding: 2px 8px; }')
        );
    }

    var displayMetrics = function() {
        $.getJSON(utils.get_body_data('baseUrl') + 'metrics', function(data) {
            // FIXME: Proper setups for MB and GB. MB should have 0 things
            // after the ., but GB should have 2.
            var display = Math.round(data['rss'] / (1024 * 1024));

            var limits = data['limits'];
            if ('memory' in limits) {
                if ('rss' in limits['memory']) {
                    display += " / " + (limits['memory']['rss'] / (1024 * 1024));
                }
                if (limits['memory']['warn']) {
                    $('#nbresuse-display').addClass('nbresuse-warn');
                } else {
                    $('#nbresuse-display').removeClass('nbresuse-warn');
                }
            }
            if (data['limits']['memory'] !== null) {
            }
            $('#nbresuse-mem').text(display + ' MB');
        });
    }

    var load_ipython_extension = function () {
        setupDOM();
        displayMetrics();
        // Update every five seconds, eh?
        setInterval(displayMetrics, 1000 * 5);
    };

    return {
        load_ipython_extension: load_ipython_extension,
    };
});
