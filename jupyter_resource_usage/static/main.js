define([
    'jquery',
    'base/js/utils'
], function ($, utils) {
    function setupDOM() {
        $('#maintoolbar-container').append(
            $('<div>').attr('id', 'jupyter-resource-usage-display')
                .addClass('btn-group')
                .addClass('pull-right')
                .append(
                    $('<strong>').text('Memory: ')
                ).append(
                $('<span>').attr('id', 'jupyter-resource-usage-mem')
                    .attr('title', 'Actively used Memory (updates every 5s)')
            )
        );
        $('#maintoolbar-container').append(
            $('<div>').attr('id', 'jupyter-resource-usage-display-cpu')
                .addClass('btn-group')
                .addClass('jupyter-resource-usage-hide')
                .addClass('pull-right').append(
                    $('<strong>').text(' CPU: ')
                ).append(
                    $('<span>').attr('id', 'jupyter-resource-usage-cpu')
                        .attr('title', 'Actively used CPU (updates every 5s)')
            )
        );
        // FIXME: Do something cleaner to get styles in here?
        $('head').append(
            $('<style>').html('.jupyter-resource-usage-warn { background-color: #FFD2D2; color: #D8000C; }')
        );
        $('head').append(
            $('<style>').html('.jupyter-resource-usage-hide { display: none; }')
        );
        $('head').append(
            $('<style>').html('#jupyter-resource-usage-display { padding: 2px 8px; }')
        );
        $('head').append(
            $('<style>').html('#jupyter-resource-usage-display-cpu { padding: 2px 8px; }')
        );
    }

    function humanFileSize(size) {
        var i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }

    var displayMetrics = function () {
        if (document.hidden) {
            // Don't poll when nobody is looking
            return;
        }
        $.getJSON({
            url: utils.get_body_data('baseUrl') + 'api/metrics/v1',
            success: function (data) {
                value = data['pss'] || data['rss'];
                totalMemoryUsage = humanFileSize(value);

                var limits = data['limits'];
                var display = totalMemoryUsage;

                if (limits['memory']) {
                    limit = limits['memory']['pss'] ?? limits['memory']['rss'];
                    if (limit) {
                        maxMemoryUsage = humanFileSize(limit);
                        display += " / " + maxMemoryUsage
                    }
                    if (limits['memory']['warn']) {
                        $('#jupyter-resource-usage-display').addClass('jupyter-resource-usage-warn');
                    } else {
                        $('#jupyter-resource-usage-display').removeClass('jupyter-resource-usage-warn');
                    }
                }

                $('#jupyter-resource-usage-mem').text(display);

                // Handle CPU display
                var cpuPercent = data['cpu_percent'];
                if (cpuPercent !== undefined) {
                    // Remove hide CSS class if the metrics API gives us a CPU percent to display
                    $('#jupyter-resource-usage-display-cpu').removeClass('jupyter-resource-usage-hide');
                    var maxCpu = data['cpu_count'];
                    var limits = data['limits'];
                    // Display CPU usage as "{percent}% ({usedCpu} / {maxCPU})" e.g. "123% (1 / 8)"
                    var percentString = parseFloat(cpuPercent).toFixed(0);
                    var usedCpu = Math.round(parseFloat(cpuPercent) / 100).toString();
                    var display = `${percentString}% (${usedCpu} / ${maxCpu})`;
                    // Handle limit warning
                    if (limits['cpu']) {
                        if (limits['cpu']['warn']) {
                            $('#jupyter-resource-usage-display-cpu').addClass('jupyter-resource-usage-warn');
                        } else {
                            $('#jupyter-resource-usage-display-cpu').removeClass('jupyter-resource-usage-warn');
                        }
                    }
    
                    $('#jupyter-resource-usage-cpu').text(display);    
                }
            }
        });
    };

    var load_ipython_extension = function () {
        setupDOM();
        displayMetrics();
        // Update every five seconds, eh?
        setInterval(displayMetrics, 1000 * 5);

        document.addEventListener("visibilitychange", function () {
            // Update instantly when user activates notebook tab
            // FIXME: Turn off update timer completely when tab not in focus
            if (!document.hidden) {
                displayMetrics();
            }
        }, false);
    };

    return {
        load_ipython_extension: load_ipython_extension,
    };
});
