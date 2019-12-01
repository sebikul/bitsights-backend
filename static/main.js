$(document).ready(function () {

    const relatedAddressSearchButton = $("#related-address-search");
    relatedAddressSearchButton.find('span').hide();

    const distanceAddressSearchButton = $("#distance-address-search");
    distanceAddressSearchButton.find('span').hide();

    const relationshipAddressSearchButton = $("#relationship-address-search");
    relationshipAddressSearchButton.find('span').hide();

    function renderGraph(dotFile, callback) {
        const margin = 20; // to avoid scrollbars
        var svgWidth = window.innerWidth - margin;
        var svgHeight = window.innerHeight - margin;
        var leftPad = 20;
        var rightPad = 20;
        var topPad = 20;
        var bottomPad = 20;
        const graphviz = d3.select("#graph").graphviz()
            .zoomScaleExtent([0.01, 100])
            .zoom(false)
            // .attributer(attributer)
            .renderDot(dotFile, callback);
        //
        // function attributer(datum, index, nodes) {
        //     var selection = d3.select(this);
        //     if (datum.tag === "svg") {
        //         const graphWidth = +selection.datum().attributes.width.replace('pt', '');
        //         const graphHeight = +selection.datum().attributes.height.replace('pt', '');
        //         graphviz.zoomTranslateExtent([[rightPad + graphWidth - svgWidth, bottomPad - svgHeight], [svgWidth - leftPad, svgHeight - topPad - graphHeight]]);
        //         selection
        //             .attr("width", svgWidth)
        //             .attr("height", svgHeight)
        //             .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight);
        //         datum.attributes.width = svgWidth;
        //         datum.attributes.height = svgHeight;
        //         datum.attributes.viewBox = " 0 0 " + svgWidth + " " + svgHeight;
        //     }
        // }
    }

    function statusCallback(uuid, whenResultAvailable) {
        $.get(`/jobs/${uuid}`, function (data, status) {
            console.log(JSON.stringify(data));
            if (data.status === 'running') {
                setTimeout(statusCallback, 1000, uuid, whenResultAvailable);
                return
            }

            if (data.status === 'failed') {
                alert('Job failed');
                return;
            }

            whenResultAvailable(uuid)
        })
    }

    function relatedResultAvailable(uuid) {

        relatedAddressSearchButton.attr("disabled", false);
        relatedAddressSearchButton.find('span').hide();

        $.get(`/jobs/${uuid}/results?format=graphviz`, function (data, status) {
            console.log(data);

            renderGraph(data);
            $('#graph-modal').modal('show');
        });

    }

    function distanceResultAvailable(uuid) {

        distanceAddressSearchButton.attr("disabled", false);
        distanceAddressSearchButton.find('span').hide();

        $.get(`/jobs/${uuid}/results`, function (data, status) {
            console.log(JSON.stringify(data));

            const dotFile = buildGraphFromEdges(data.results.edges);
            renderGraph(dotFile, () => $('#graph-modal').modal('show'));

        });

    }


    relatedAddressSearchButton.click(function (event) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();

        relatedAddressSearchButton.attr("disabled", true);
        relatedAddressSearchButton.find('span').show();

        const source = $('#relatedSourceAddress').val();
        console.log(`Running related address query for ${source}`);

        const data = {
            job_type: 'RELATED',
            args: {
                needle_address: source,
            }
        };

        $.ajax({
            url: '/jobs',
            dataType: 'json',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            processData: false,
            success: function (data, textStatus, jQxhr) {
                if (data.status !== 'created') {
                    alert('Failed to create job.' + JSON.stringify(data.message))

                }
                const jobUUID = data.uuid;
                statusCallback(jobUUID, relatedResultAvailable)
            },
            error: function (jqXhr, textStatus, errorThrown) {
                console.log(errorThrown);
            }
        })

    });

    distanceAddressSearchButton.click(function (event) {
        event.stopImmediatePropagation();
        event.stopPropagation();
        event.preventDefault();

        distanceAddressSearchButton.attr("disabled", true);
        distanceAddressSearchButton.find('span').show();

        const source = $('#distanceSourceAddress').val();
        const sink = $('#distanceSinkAddress').val();
        console.log(`Running distance from ${source} to ${sink}`);

        const data = {
            job_type: 'DISTANCE',
            args: {
                sink: sink,
                source: source,
            }
        };

        $.ajax({
            url: '/jobs',
            dataType: 'json',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            processData: false,
            success: function (data, textStatus, jQxhr) {
                if (data.status !== 'created') {
                    alert('Failed to create job.' + JSON.stringify(data.message))

                }
                const jobUUID = data.uuid;
                statusCallback(jobUUID, distanceResultAvailable)
            },
            error: function (jqXhr, textStatus, errorThrown) {
                console.log(errorThrown);
            }
        });

    })
});
