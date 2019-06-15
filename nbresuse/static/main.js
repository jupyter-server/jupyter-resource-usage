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
        if (document.hidden) {
            // Don't poll when nobody is looking
            return;
        }
        var metricsUrl = utils.get_body_data('baseUrl') + 'api/nbresuse/v1';

        // FIXME: Reconnect on failure
        var metricsSource = new EventSource(metricsUrl);
        metricsSource.onmessage = function(message) {
            var data = JSON.parse(message.data);
            // FIXME: Proper setups for MB and GB. MB should have 0 things
            // after the ., but GB should have 2.

            var memory = data['nbresuse.jupyter.org/usage'];

            // Show RSS info
            var rss = memory['rss'];
            var display = Math.round(rss['usage'] / (1024 * 1024));

            if (rss['limit']) {
                display += ' / ' + Math.round((rss['limit'] / (1024 * 1024)));

                if (rss['usage'] / rss['limit'] >= rss['warn']) {
                    $('#nbresuse-display').addClass('nbresuse-warn');
                } else {
                    $('#nbresuse-display').removeClass('nbresuse-warn');
                }
            }
            $('#nbresuse-mem').text(display + ' MB');
        };
    };

    var load_ipython_extension = function () {
        setupDOM();
        displayMetrics();
    };

    return {
        load_ipython_extension: load_ipython_extension,
    };
});
