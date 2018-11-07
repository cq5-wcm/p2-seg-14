/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports = { };
CQ.reports.data = { };
CQ.reports.charts = { };
CQ.reports.filters = { };
CQ.reports.views = { };
CQ.reports.ui = { };
CQ.reports.utils = { };
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class represents a report as a whole.
 * @class CQ.reports.Report
 * @constructor
 * Creates a new Report.
 */
CQ.reports.Report = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * The report's title
     */
    title: null,

    /**
     * List of columns
     * @type CQ.reports.Column[]
     * @private
     */
    columns: null,

    /**
     * The Ext FormPanel to be used for the query builder.
     * @type CQ.Ext.form.FormPanel
     * @private
     */
    formPanel: null,

    /**
     * The view used to display the report
     * @type CQ.reports.View
     * @private
     */
    view: null,

    /**
     * List of available charts
     * @type CQ.reports.ChartDefinition[]
     * @private
     */
    charts: null,

    /**
     * List of active charts
     * @type CQ.reports.ChartDefinition[]
     * @private
     */
    activeCharts: null,

    /**
     * Flag that determines if the report is currently in edit mode
     * @type Boolean
     * @publicProp
     */
    isEditMode: false,

    /**
     * Path to the report's page
     * @type String
     * @private
     */
    pagePath: null,

    /**
     * Path to this instance of a report
     * @type String
     * @private
     */
    reportPath: null,

    /**
     * Path to the report's component node
     * @type String
     * @private
     */
    componentPath: null,

    /**
     * Processing mode of the report
     * @type String
     * @private
     */
    processingMode: null,

    /**
     * The type of rendering requested
     * @type Object
     * @private
     */
    renderType: null,

    /**
     * The selector to be used for requesting report data
     * @type String
     * @private
     */
    reportSelector: null,

    /**
     * The selector to be used for requesting chart data
     * @type String
     * @private
     */
    chartDataSelector: null,

    /**
     * The selector to be used for requesting "over time" snapshot data
     * @type String
     * @private
     */
    snapshotSelector: null,

    /**
     * Helper for synchronizing multiple requests
     * @private
     */
    requestSyncer: null,

    /**
     * Raw result data, as received by server
     * @private
     */
    data: null,

    /**
     * Data type definition, as received by server
     */
    typeDefs: null,

    /**
     * Current snapshot mode
     */
    snapshotMode: null,

    /**
     * Flag that determines if the report has been finished at least once
     */
    finished: false,

    /**
     * Path to the dialog that is used for finishing a report, presenting fields for
     * title and description
     */
    finishTitleDescr: null,

    /**
     * Path to the dialog that is used for finishing a report, presenting fields for
     * title, description and snapshot mode
     */
    finishTitleDescrSnap: null,

    /**
     * Path to the dialog that is used for finishing a report when snapshooting is
     * activated and no finished version of the report is available
     */
    snapshotFinishDialog: null,


    constructor: function() {
        this.title = CQ.I18n.getMessage("Report");
        this.columns = [ ];
        this.reportSelector = "data";
        this.chartDataSelector = "chart";
        this.snapshotSelector = "snapshots";
        this.finishSelector = "finish";
    },

    /**
     * Sets the title of the report.
     * @param {String} title The report's title
     */
    setTitle: function(title) {
        this.title = title;
    },

    /**
     * Sets the paths for this report.
     * @param {String} reportPath The report's path
     * @param {String} componentPath Path to the corresponding report component
     * @param {String} pagePath The page the report is used by
     */
    setPaths: function(reportPath, componentPath, pagePath) {
        this.reportPath = reportPath;
        this.componentPath = componentPath;
        this.pagePath = pagePath;
    },

    /**
     * Sets the processing mode of the report.
     * @param {String} processingMode The processing mode of the report (client, server,
     *        server-interactive)
     */
    setProcessingMode: function(processingMode) {
        this.processingMode = processingMode;
    },

    /**
     * Sets the render type of the report.
     * @param {Object} renderType The render type
     */
    setRenderType: function(renderType) {
        this.renderType = renderType;
    },

    /**
     * Checks if a report has to be rendered as a single view.
     * @return {Boolean} True if the report has to be rendered as a single view
     */
    isSingleViewRendering: function() {
        return (this.renderType != null);
    },

    /**
     * Checks if the report is processed on the server and the report uses interactive
     * mode (update/server-roundtrip after each change of settings).
     */
    isServerInteractiveProcessing: function() {
        return (this.processingMode == CQ.reports.Report.PMODE_SERVER_INTERACTIVE);
    },

    /**
     * Sets the selector to be used for requesting report data
     * @param {String} selector The selector to be used for requesting report data
     */
    setReportSelector: function(selector) {
        this.reportSelector = selector;
    },

    /**
     * Sets the selector to be used for requesting chart data
     * @param {String} selector The selector to be used for requesting chart data
     */
    setChartSelector: function(selector) {
        this.chartSelector = selector;
    },

    /**
     * Returns the URL to be used for generating chart data from the server.
     * @return {String} The URL
     */
    getChartDataUrl: function() {
        return this.reportPath + "." + this.chartDataSelector + CQ.HTTP.EXTENSION_JSON;
    },

    /**
     * Returns the path to the report component.
     * @return {String} Path to the report component
     */
    getComponentPath: function() {
        return this.componentPath;
    },

    /**
     * Returns the path of the page the report is used by.
     * @return {String} The report's page path
     */
    getPagePath: function() {
        return this.pagePath;
    },

    /**
     * Sets the selector to be used for requesting snapshot data
     * @param {String} selector The selector to be used for requesting snapshot data
     */
    setSnapshotSelector: function(selector) {
        this.snapshotSelector = selector;
    },

    /**
     * Returns the URL to be used for generating series data from the server.
     * @return {String} The URL
     */
    getSnapshotDataUrl: function() {
        return this.reportPath + "." + this.snapshotSelector + CQ.HTTP.EXTENSION_JSON;
    },

    /**
     * Sets some date format requirements for clientside usage.
     * @param {Number} firstDayOfWeek The first day of a week (1-based)
     */
    setDateFormat: function(firstDayOfWeek) {
        this.firstDayOfWeek = firstDayOfWeek;
    },

    /**
     * Gets the first day of a week to be used calendars, etc.
     * @return {Number} The first day of a week (1-based)
     */
    getFirstDayOfWeek: function() {
        return this.firstDayOfWeek;
    },

    /**
     * Sets the selector to be used for finishing a report.
     * @param {String} selector The selector to be used for finishing a report
     */
    setFinishSelector: function(selector) {
        this.finishSelector = selector;
    },

    /**
     * Sets both variants of the dialog to be used for finishing a report.
     *
     * @param {String} finishTitleDescr Path to the dialog with title, description
     * @param {String} finishTitleDescrWarn Path to the dialog with title, description,
     *        warning
     * @param {String} finishTitleDescrSnap Path to the dialog with title, description,
     *        snapshot mode
     * @param {String} finishTitleDescrSnapWarn Path to the dialog with title, description,
     *        snapshot mode, warning
     */
    setFinishDialogs: function(finishTitleDescr, finishTitleDescrWarn, finishTitleDescrSnap,
            finishTitleDescrSnapWarn) {
        this.finishTitleDescr = finishTitleDescr;
        this.finishTitleDescrWarn = finishTitleDescrWarn;
        this.finishTitleDescrSnap = finishTitleDescrSnap;
        this.finishTitleDescrSnapWarn = finishTitleDescrSnapWarn;
    },

    getFinishDialog: function() {
        var dialog;
        if (this.isSnapshotActive()) {
            dialog = (this.isFinished() ? this.finishTitleDescrWarn
                    : this.finishTitleDescr);
        } else {
            dialog = (this.isFinished() ? this.finishTitleDescrSnapWarn
                    : this.finishTitleDescrSnap);
        }
        return dialog;
    },

    /**
     * <p>Sets if the report is currently displayed in "edit mode" from the serverside.</p>
     *
     * <p>Note that this method does additional processing (permissions) to determine the
     * actual edit mode (as returned by {@link #isEditMode}).</p>
     *
     * @param {Boolean} isEditMode True if the report is currently in "edit mode"
     */
    setWCMEditMode: function(isEditMode) {
        try {
            var page = CQ.WCM.getPage(CQ.WCM.getPagePath());
            this.isEditMode = isEditMode && page && page.hasPermission("update")
                    && page.hasPermission("modify") && (this.renderType == null);
        } catch (e) {
            // unable to retrieve page information: we're obviously not in edit mode
            this.isEditMode = false;
        }
    },

    /**
     * Sets the current snapshot mode.
     * @param {String} snapshotMode The snapshot mode
     */
    setSnapshotMode: function(snapshotMode) {
        this.snapshotMode = snapshotMode;
    },

    /**
     * Checks if snapshots are currently active for the report.
     * @return {Boolean} True if snapshots are active
     */
    isSnapshotActive: function() {
        return (this.snapshotMode != null)
                && (this.snapshotMode != CQ.reports.Report.SMODE_NONE);
    },

    /**
     * Sets if the report has been finished at least once.
     * @param {Boolean} isFinished True if the report has been finished at least once
     */
    setFinished: function(isFinished) {
        this.finished = isFinished;
    },

    /**
     * Determines if the report has been finished at least once.
     * @return {Boolean} True if the report has at least been finished once
     */
    isFinished: function() {
        return this.finished;
    },

    /**
     * Gets the current snapshot mode.
     * @return {Number} The current snapshot mode (as defined by constants
     *         {@link CQ.reports.Report.SMODE_NONE}, {@link CQ.reports.Report.SMODE_HOURLY},
     *         {@link CQ.reports.Report.SMODE_DAILY})
     */
    getSnapshotMode: function() {
        if (this.snapshotMode == null) {
            return CQ.reports.Report.SMODE_NONE;
        }
        return this.snapshotMode;
    },

    /**
     * Adds a column to the report.
     * @param {CQ.reports.Column} column The column to add
     */
    addColumn: function(column) {
        column.report = this;
        this.columns.push(column);
    },

    /**
     * Inserts a column into the report.
     * @param {CQ.reports.Column} column The column to insert
     * @param {Number} colIndex The index for inserting the column
     */
    insertColumn: function(column, colIndex) {
        column.report = this;
        this.columns.splice(colIndex, 0, column);
    },

    /**
     * Moves an existig column.
     * @param {Number} colIndexToMove Index of column to move
     * @param {Number} newIndex New index of column to move
     */
    moveColumn: function(colIndexToMove, newIndex) {
        var colToMove = this.columns[colIndexToMove];
        this.columns.splice(colIndexToMove, 1);
        this.columns.splice(newIndex, 0, colToMove);
    },

    /**
     * Loads the view configuration.
     * @private
     */
    loadViewConfig: function() {
        this.requestSyncer.registerRequest();
        CQ.Ext.Ajax.request({
                "method": "GET",
                "url": CQ.HTTP.externalize(this.componentPath + "/view.infinity.json"),
                "success": function(response) {
                    var result = null;
                    if (response && (response.status == 200)) {
                        try {
                            result = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                                    response.responseText));
                        } catch (e) {
                            // Status may be erroneously reported as 200, when actually
                            // another status has been generated; so we'll have to catch
                            // exceptions that originate from parsing "presumed JSON" that
                            // actually contains a Sling message
                        }
                    }
                    this.onViewConfigLoaded(result);
                },
                "failure": function() {
                    this.onViewConfigLoaded(null);
                },
                "scope": this
            });
    },

    /**
     * @private
     */
    onViewConfigLoaded: function(result) {
        // todo set subviews to use
        if (!this.renderType) {
            this.view = new CQ.reports.views.TopLevelView({
                    "subViewConfig": result
                });
        } else {
            var singleView;
            switch (this.renderType.type) {
                case "tabular":
                    singleView = new CQ.reports.views.GridView();
                    break;
                case "chart":
                    singleView = new CQ.reports.views.SingleChartView({
                            "chartId": this.renderType.chart
                        });
                    break;
            }
            if (singleView) {
                this.view = new CQ.reports.views.TopLevelView({
                        "ensureMinimumSize": false,
                        "regularReportView": new CQ.reports.views.SingleView({
                                "view": singleView
                            }),
                        "rightMargin": 0,
                        "bottomMargin": 0,
                        "width": this.renderType.width,
                        "height": this.renderType.height
                    });
            }
        }
        this.requestSyncer.finishWithSuccess();
    },

    /**
     * Loads the charting configuration.
     * @private
     */
    loadChartingConfig: function() {
        this.requestSyncer.registerRequest();
        CQ.Ext.Ajax.request({
                "method": "GET",
                "url": CQ.HTTP.externalize(this.componentPath + "/charting.infinity.json"),
                "success": function(response) {
                        var result = null;
                        if (response && (response.status == 200)) {
                            try {
                                result = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                                        response.responseText));
                            } catch (e) {
                                // catch exceptions that originate from parsing a non-JSON Sling
                                // response
                            }
                        }
                        this.onChartingConfigLoaded(result);
                    },
                "failure": function() {
                        this.onChartingConfigLoaded(null);
                    },
                "scope": this
            });
    },

    /**
     * @private
     */
    onChartingConfigLoaded: function(result) {
        this.charts = [ ];
        this.activeCharts = [ ];
        if (result) {
            if (result.definitions) {
                var chartCnt = result.definitions.length;
                for (var c = 0; c < chartCnt; c++) {
                    var chartConfig = result.definitions[c];
                    if (chartConfig.id === undefined) {
                        chartConfig.id = "id-" + c;
                    }
                    if (this.renderType && (this.renderType.chartLayout != null)) {
                        chartConfig.preferredLayout = this.renderType.chartLayout;
                    }
                    this.charts.push(new CQ.reports.ChartDefinition(chartConfig));
                }
            }
            if (result.settings) {
                if (result.settings.active) {
                    var activeCharts = result.settings.active;
                    var settingsCnt = activeCharts.length;
                    for (var s = 0; s < settingsCnt; s++) {
                        var chartDef = activeCharts[s];
                        if (chartDef.id !== undefined) {
                            var chart = this.getChartById(chartDef.id);
                            if (chart) {
                                this.activeCharts.push(chart);
                            }
                        }
                    }
                }
            }
        }
        // todo load instance settings
        this.requestSyncer.finishWithSuccess();
    },

    /**
     * Gets a chart definition by the specified ID.
     * @param {String} id The chart ID
     * @return {CQ.reports.ChartDefinition} The chart definition; null, if no chart
     *         definition is available for the specified chart ID
     * @private
     */
    getChartById: function(id) {
        var chartCnt = this.charts.length;
        for (var c = 0; c < chartCnt; c++) {
            if (this.charts[c].id == id) {
                return this.charts[c];
            }
        }
        return null;
    },

    /**
     * Determines if the report currently has active charts.
     * @return {Boolean} True if the report currently has active charts
     */
    hasActiveCharts: function() {
        return (this.activeCharts.length > 0);
    },

    /**
     * <p>Loads the column defs.</p>
     * <p>Should be used after all columns have been added.</p>
     * @private
     */
    loadColumnDefs: function() {
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            this.columns[c].loadDef(this.requestSyncer);
        }
    },

    /**
     * Renders the report by the current view (if available).
     * @private
     */
    render: function() {
        this.destEl = CQ.Ext.get(this.destEl);
        var toolbar = CQ.reports.utils.EditUtils.createToolbar(this);
        if (toolbar) {
            var tbPanel = new CQ.Ext.Panel({
                    "items": [ toolbar ],
                    "header": false,
                    "footer": false,
                    "cls": "cq-reports-gridview",
                    "style": "padding: 1px 1px 12px 1px;"
                });
            tbPanel.render(this.destEl);
        }
        if (this.view) {
            this.view.render(this.destEl, this);
        }
    },

    /**
     * Forces the view to reload data and adjust visually.
     * @private
     */
    reload: function(isForced) {
        if (this.view) {
            this.view.reload(isForced);
        }
    },

    /**
     * Returns the path to be used for retrieving data.
     * @return {String} The path to be used for retrieving data
     */
    getDataRequestPath: function() {
        return CQ.HTTP.externalize(this.reportPath + "." + this.reportSelector
                        + CQ.HTTP.EXTENSION_JSON);
    },

    /**
     * <p>Initializes the report by loading column definitions, initial data and rendering
     * the view.</p>
     * <p>All available columns must have been added beforehand.</p>
     * <p>Initialization is executed asynchroneously, so the method will return before
     * the data is loaded and the report is actually displayed.</p>
     * @param {CQ.Ext.Element|String} destEl The DOM element the report view has to be
     *        rendered to
     */
    init: function(destEl) {
        if (this.isSingleViewRendering()) {
            // workaround: hide "parbase" div, which takes some place, but is not required
            // in this context
            var divs = document.getElementsByTagName("div");
            var divCnt = divs.length;
            for (var d = 0; d < divCnt; d++) {
                var attribName = (CQ.Ext.isIE6 || CQ.Ext.isIE7 ? "className" : "class");
                var classAttrib = divs[d].getAttribute(attribName);
                if (classAttrib && (classAttrib.indexOf("parbase") >= 0)
                        && (classAttrib.indexOf("reportbase") >= 0)) {
                    divs[d].style.display = "none";
                    break;
                }
            }
        }
        this.destEl = destEl;
        this.requestSyncer = new CQ.reports.utils.RequestSync({
                "onLoadFn": function() {
                        this.render();
                        this.reload();
                    }.createDelegate(this),
                "onErrorFn": function() {
                         CQ.Notification.notify(null,
                                 CQ.I18n.getMessage("Could not load report from server."));
                    }.createDelegate(this)
            });
        this.requestSyncer.block();
        this.colLoadCounter = 0;
        this.loadViewConfig();
        this.loadChartingConfig();
        this.loadColumnDefs();
        this.requestSyncer.unblock();
    },

    /**
     * Finishes the report by creating a version where snapshots are taken from.
     * @param {String} title The label for the report version (optional)
     * @param {String} description The description for the report version (optional)
     * @param {String} snapshotMode The snapshot mode for the finished report (optional)
     */
    finish: function(title, description, snapshotMode) {
        var url = CQ.HTTP.externalize(this.reportPath + "." + this.finishSelector
                + CQ.HTTP.EXTENSION_JSON);
        var params = null;
        if (title || description || snapshotMode) {
            params = { };
            if (title) {
                params["title"] = title;
            }
            if (description) {
                params["description"] = description;
            }
            if (snapshotMode) {
                params["snapshots"] = snapshotMode;
            }
            params["_charset_"] = "utf-8";
        }
        CQ.Ext.Ajax.request({
                "method": "POST",
                "url": url,
                "params": params,
                "success": function(response) {
                        var isSuccess = false;
                        var result = null;
                        if (response && (response.status == 200)) {
                            try {
                                result = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                                        response.responseText));
                                isSuccess = (result.success === true);
                                if (isSuccess) {
                                    this.finished = true;
                                    if (snapshotMode) {
                                        this.snapshotMode = snapshotMode;
                                    }
                                }
                            } catch (e) {
                                // Status may be erroneously reported as 200, when actually
                                // another status has been generated; so we'll have to catch
                                // exceptions that originate from parsing "presumed JSON"
                                // that actually contains a Sling message
                            }
                        }
                        if (isSuccess) {
                            CQ.reports.utils.EditUtils.toggleSnapshotSwitch(true);
                            CQ.Util.reload();
                            /*
                            CQ.Notification.notify(null,
                                    CQ.I18n.getMessage("Report finished successfully."));
                            if (this.view) {
                                this.view.notifyFinished();
                            }
                            */
                        } else {
                            CQ.Notification.notify(null,
                                    CQ.I18n.getMessage("Could not finish report."));
                        }
                    },
                "failure": function() {
                        CQ.Notification.notify(null,
                                CQ.I18n.getMessage("Could not finish report."));
                    },
                "scope": this
            });
    },

    /**
     * Adjusts the state of the report to the specified sorting and calls the notification
     * methods on the view if necessary.
     * @param {String} col Column's data ID
     * @param {String} dir Sorting direction
     */
    adjustSorting: function(col, dir) {
        var sortedIndex = (col ? this.getColumnIndexForDataId(col) : -1);
        if (sortedIndex >= 0) {
            var colDef = this.columns[sortedIndex];
            if (!colDef.isSorted() || (colDef.getSortingDirection() != dir)) {
                this.fireSortingChanged(sortedIndex, dir);
            }
        }
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            if (c == sortedIndex) {
                this.columns[c].setSorting(true, dir);
            } else {
                this.columns[c].setSorting(false);
            }
        }
    },

    /**
     * Retrieves the column for the specified data ID (aka the column's label).
     * @param {String} dataId The data ID to determine the column for
     * @return {Number} The corresponding column index; -1 if no column is available
     *         for the specified data ID
     */
    getColumnIndexForDataId: function(dataId) {
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            var col = this.columns[c];
            if (col.getDataId() == dataId) {
                return c;
            }
        }
        return -1;
    },

    /**
     * Retrieves the column index of the specified column.
     * @param {CQ.reports.Column} col The column
     * @return {Number} The column's index; -1 if the column is not available for the report
     */
    getColumnIndex: function(col) {
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            if (col == this.columns[c]) {
                return c;
            }
        }
        return -1;
    },

    /**
     * Creates a list of columns currently used for grouping.
     * @private
     */
    createGroupedColumns: function() {
        var groupedCols = [ ];
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            var col = this.columns[c];
            if (col.isGrouped()) {
                groupedCols.push({
                        "index": c,
                        "data": col
                    });
            }
        }
        return groupedCols;
    },

    /**
     * Creates a list of currently sorted columns.
     * @private
     */
    createSortedColumns: function() {
        var sortedCols = [ ];
        var colCnt = this.columns.length;
        for (var c = 0; c < colCnt; c++) {
            var col = this.columns[c];
            if (col.isSorted()) {
                sortedCols.push({
                        "index": c,
                        "data": col
                    });
            }
        }
        return sortedCols;
    },

    fireStructureChanged: function() {
        if (this.view) {
            this.view.notifyStructureChanged();
        }
    },

    fireSortingChanged: function(colIndex, dir) {
        if (this.view) {
            this.view.notifySortingChanged(colIndex, dir);
        }
    }

});

CQ.reports.Report.theInstance = new CQ.reports.Report();

/**
 * Processing mode: Report data is processed on the serverside. Each change in grouping,
 * aggregation, filtering, etc. requires a server roundtrip. The report may be created
 * interactively - that means that it is always updated on each change, requiring a
 * server roundtrip.
 */
CQ.reports.Report.PMODE_SERVER_INTERACTIVE = "server-interactive";

/**
 * Processing mode: Report data is processed on the serverside. Each change in grouping,
 * aggregation, filtering, etc. requires a server roundtrip. The report is not updated
 * interactively.
 */
CQ.reports.Report.PMODE_SERVER = "server";

/**
 * Snapshot mode: No snapshots
 */
CQ.reports.Report.SMODE_NONE = "never";

/**
 * Snapshot mode: Hourly snapshots
 */
CQ.reports.Report.SMODE_HOURLY = "hourly";

/**
 * Snapshot mode: Daily snapshots
 */
CQ.reports.Report.SMODE_DAILY = "daily";

/**
 * Stub for empty results
 * @private
 */
CQ.reports.Report.EMPTY_RESULT = {
        "hits": [ ]
    };
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class represents a column of a report.
 * @class CQ.reports.Column
 * @constructor
 * Creates a new Column.
 */
CQ.reports.Column = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * @cfg {String} dataPath
     * The path of the column's instance data
     */
    dataPath: null,

    /**
     * @cfg {String} componentPath
     * The underlying component's path
     */
    componentPath: null,

    /**
     * Paths where individual instance settings may be found
     * @private
     * @type String
     */
    settingsPath: null,

    /**
     * @private
     */
    definitions: null,

    /**
     * @private
     */
    defaults: null,

    /**
     * @private
     */
    settings: null,

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    filters: null,

    /**
     * @private
     */
    requestSyncer: null,

    /**
     * @private
     */
    generic: false,

    /**
     * @private
     */
    genericDefinitions: null,

    /**
     * @private
     */
    genericDefaults: null,


    constructor: function(config) {
        config = config || { };
        CQ.Ext.apply(this, config);
        this.updateViewFn = function() {
                if (this.report.view) {
                    this.report.view.notifyUpdateEnd();
                }
                this.report.reload();
            }.createDelegate(this);
        var updateView = this.updateViewFn;
        this.requestSyncer = new CQ.reports.utils.RequestSync({
                onLoadFn: updateView,
                onErrorFn: function() {
                        updateView();
                        CQ.Notification.notify(null,
                                CQ.I18n.getMessage("Could not persist settings."));
                    }
            });
        this.dataId = this.dataPath.replace(/(.*\/)?(.*)/, "$2");
    },

    /**
     * Reloads the column definition (for example, after changing it) and
     */
    reload: function() {
        var updateView = this.updateViewFn;
        var reloadSyncer = new CQ.reports.utils.RequestSync({
                onLoadFn: updateView,
                onErrorFn: function() {
                        updateView();
                        CQ.Notification.notify(null,
                                CQ.I18n.getMessage("Could not reload column."));
                    }
            });
        this.invalidateFilters();
        reloadSyncer.block();
        this.loadDef(reloadSyncer);
        reloadSyncer.unblock();
    },

    /**
     * Loads the (specific) definition of the column.
     * @param {CQ.reports.utils.RequestSync} reqSyncer Helper object for request
     *        synchronization
     */
    loadDef: function(reqSyncer) {
        if (this.componentPath) {
            reqSyncer.registerRequest();
            CQ.Ext.Ajax.request({
                "method": "GET",
                "url": CQ.HTTP.externalize(this.componentPath + ".infinity"
                        + CQ.HTTP.EXTENSION_JSON),
                "success": function(response) {
                        this.componentDefLoaded(response, reqSyncer);
                    },
                "failure": function() {
                        reqSyncer.finishWithError();
                    },
                "scope": this
            });
        }
    },

    /**
     * Handler that is called after the component definition has been loaded.
     * @private
     */
    componentDefLoaded: function(response, reqSyncer) {
        this.definitions = null;
        if (response && (response.status == 200)) {
            try {
                var componentDefs = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                        response.responseText));
                this.definitions = componentDefs.definitions || { };
                this.definitions.name = componentDefs["jcr:title"];
                this.defaults = componentDefs.defaults || { };
            } catch (e) {
                // catch exceptions that originate from parsing a non-JSON Sling
                // response
            }
        }
        this.generic = (this.definitions.type == "generic");
        // load settings
        this.settingsPath = this.dataPath + "/settings";
        var url = this.dataPath + ".infinity" + CQ.HTTP.EXTENSION_JSON;
        CQ.Ext.Ajax.request({
                "method": "GET",
                "url": CQ.HTTP.externalize(url),
                "success": function(response) {
                    this.instanceDefLoaded(response, reqSyncer);
                },
                "failure": function(response) {
                    reqSyncer.finishWithError();
                },
                "scope": this
            });
    },

    /**
     * Handler that is called after the column's instance data has been loaded.
     * @private
     */
    instanceDefLoaded: function(response, reqSyncer) {
        this.settings = { };
        if (response && (response.status == 200)) {
            try {
                var instanceData = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                        response.responseText));
                if (instanceData.settings) {
                    this.settings = instanceData.settings;
                }
            } catch (e) {
                // catch exceptions that originate from parsing a non-JSON Sling
                // response
            }
        }
        if (this.generic && this.settings && this.settings.generic) {
            this.genericDefinitions = this.settings.generic.definitions;
            this.genericDefaults = this.settings.generic.defaults;
        }
        if (this.settings.filters) {
            var filters = this.getFilters();
            var filterCnt = filters.length;
            for (var f = 0; f < filterCnt; f++) {
                var fltDef = this.settings.filters[filters[f].id];
                var isActive = fltDef.active;
                if (isActive) {
                    filters[f].deserialize(fltDef.value);
                }
            }
        }
        if (!this.settings.sorting) {
            this.settings.sorting = {
                    "sorted": false,
                    "direction": null
                };
        }
        reqSyncer.finishWithSuccess();
    },

    /**
     * Returns a suitable function that is used for pre-filtering data from the result set.
     * @return {Function} The prefilter function for the column
     */
    getPreFilter: function() {
        if (this.definitions && this.definitions.data
                && this.definitions.data.clientFilter) {
            return this.definitions.data.clientFilter;
        }
        return CQ.reports.Column.defaultClientFilter;
    },

    /**
     * Checks if a data preprocessor is defined for the given preprocessing type.
     * @param {String} type The preprocessing type (for example: "apply", "view")
     */
    isDataPreprocessing: function(type) {
        if (this.definitions.data && this.definitions.data.preprocessing) {
            return (this.definitions.data.preprocessing[type] != null);
        }
        return false;
    },

    /**
     * Determines if the column is currently sorted.
     * @return {Boolean} True if the column is currently sorted
     */
    isSorted: function() {
        return this.settings.sorting && this.settings.sorting.sorted;
    },

    /**
     * Determines if the column is a generic column.
     * @return {Boolean} True if the column is generic
     */
    isGeneric: function() {
        return this.generic;
    },

    /**
     * <p>Returns the dialog that has to be used for configuring the generic properties of a
     * generic column.</p>
     * <p>Only to be called if <code>isGeneric == true</code>.</p>
     * @return {Object} The dialog definition if available; null otherwise
     */
    getGenericConfigDialog: function() {
        return this.definitions.dialog;
    },

    /**
     * Determines the current sorting direction ("ASC", "DESC", null).
     */
    getSortingDirection: function() {
        var dir = this.settings.sorting && this.settings.sorting.direction;
        if (dir == "") {
            dir = null;
        }
        return dir;
    },

    /**
     * Sets the specified sorting.
     * @param {Boolean} isSorted Flag that determines if the column is actually sorted
     * @param {String} direction Sorting direction ("ASC", "DESC", null)
     */
    setSorting: function(isSorted, direction) {
        if ((direction != null) && (direction.length == 0)) {
            direction = null;
        }
        if (!this.settings.sorting) {
            this.settings.sorting = { };
        }
        this.settings.sorting.sorted = isSorted;
        this.settings.sorting.direction = direction;
    },

    /**
     * Returns a suitable text render function for displaying the content of the column.
     * @return {Function} The text render function for the column
     */
    getTextRenderer: function() {
        if (this.definitions && this.definitions.view
                && this.definitions.view.textRenderer) {
            return this.definitions.view.textRenderer;
        }
        return CQ.reports.Column.defaultTextRenderer;
    },

    /**
     * This method gets called after the initial load of raw data.
     * @param {Object[]} data Initial raw data
     * @param {Number} col The column's index regarding the raw data
     */
    notifyInitialData: function(data, col) {
        // todo implement otherwise (don't initialize filters from (partial) result
        var filters = this.getFilters();
        var filterCnt = filters.length;
        for (var f = 0; f < filterCnt; f++) {
            filters[f].notifyInitialData(data, col);
            filters[f].transferToUI();
        }
    },

    /**
     * Gets the column's name.
     * @return {String} The column's name (untranslated)
     */
    getName: function() {
        if (this.generic) {
            if (this.settings && this.settings.generic
                    && this.settings.generic["jcr:title"]) {
                return this.settings.generic["jcr:title"];
            }
        }
        return this.definitions.name;
    },

    /**
     * Gets the column's data ID.
     * @return {String} The column's data ID
     */
    getDataId: function() {
        return this.dataId;
    },

    /**
     * <p>Gets the value type of the column.</p>
     * <p>Allowed types are:</p>
     * <ul>
     *   <li>string</li>
     *   <li>date</li>
     *   <li>int</li>
     *   <li>float</li>
     * </ul>
     * @return {String} The value type
     */
    getType: function() {
        return this.definitions.type;
    },

    /**
     * <p>Gets the aggregate types that are configured for interactive selection.</p>
     * @return {Object[]} Array with configurable aggregates; null if no configurable
     *         aggregate types are available
     */
    getAvailableAggregates: function() {
        if (this.generic) {
            if (this.genericDefinitions) {
                return this.genericDefinitions.aggregates;
            }
        } else {
            if (this.definitions) {
                return this.definitions.aggregates;
            }
        }
        return null;
    },

    /**
     * Checks if the column is groupable.
     * @return {Boolean} True if the column is groupable
     */
    isGroupable: function() {
        if (this.generic) {
            if (this.genericDefinitions) {
                return (this.genericDefinitions.groupable == true);
            }
        } else {
            if (this.definitions) {
                return (this.definitions.groupable === true);
            }
        }
        return false;
    },

    /**
     * Checks if the report is currently grouped by this column.
     * @return {Boolean} True if the report is grouped by this column
     */
    isGrouped: function() {
        return this.settings.grouped;
    },

    /**
     * Checks if the column is actually presenting an aggregated value.
     * @return {Boolean} True if the column shows an aggregated value
     */
    isAggregated: function() {
        if (!this.settings.grouped && (this.getAggregate() != null)) {
            return (this.report.createGroupedColumns().length > 0);
        }
        return false;
    },

    /**
     * Sets whether the report is grouped by this column.
     * @param {Boolean} isGrouped True if the report has to be grouped by this column
     */
    setGrouped: function(isGrouped) {
        this.settings.grouped = isGrouped;
        this.persistCurrentGroupingState();
    },

    /**
     * Gets the currently used aggregate (if any) of the column.
     * @return {String} The currently used aggregate; null if no aggregate is currently set
     */
    getAggregate: function() {
        var defaults = this.defaults;
        if (this.generic) {
            defaults = (this.genericDefaults && this.genericDefaults.aggregate
                    ? this.genericDefaults : this.defaults);
        }
        return (this.settings.aggregate ? this.settings.aggregate : defaults.aggregate);
    },

    /**
     * Gets the description text for the currently used aggregate.
     * @return {String} The text of the aggregate currently used
     */
    getAggregateDescription: function() {
        var aggregate = this.getAggregate();
        if (aggregate == null) {
            return "";
        }
        var defs = this.getAvailableAggregates();
        if (defs == null) {
            return aggregate;
        }
        var defCnt = defs.length;
        for (var d = 0; d < defCnt; d++) {
            var def = defs[d];
            if (def.type == aggregate) {
                return def.text;
            }
        }
        return "";
    },

    /**
     * Sets the aggregate.
     * @param {String} aggregate The aggregate to be used
     */
    setAggregate: function(aggregate) {
        this.settings.aggregate = aggregate;
        this.persistCurrentAggregate();
    },

    /**
     * @private
     */
    getSuitableFilters: function() {
        if (this.generic) {
            if (this.genericDefinitions) {
                return this.genericDefinitions.filters;
            }
        } else {
            if (this.definitions) {
                return this.definitions.filters;
            }
        }
        return null;
    },
    /**
     * Determines if the column has filters available.
     * @return {Boolean} True if the column has filters available
     */
    hasFilters: function() {
        return (this.getSuitableFilters() != null);
    },

    /**
     * Gets the view elements (as an array of Ext component configs) for the filter settings
     * UI.
     * @return {CQ.reports.Filter[]} Array containing the filters
     */
    getFilters: function() {
        if (!this.filters) {
            // load filter view
            this.filters = [ ];
            if (this.hasFilters()) {
                var filters = this.getSuitableFilters();
                var filterCnt = filters.length;
                for (var f = 0; f < filterCnt; f++) {
                    var filterDef = filters[f];
                    var type = filterDef.filterType;
                    if (type) {
                        var filter = CQ.reports.FilterRegistry.createFilter(type, {
                                "id": filterDef.id
                            });
                        filter.createUI(filterDef.uiType);
                        this.filters.push(filter);
                    }
                }
            }
        }
        return this.filters;
    },

    /**
     * Invalidates the currently loaded filters. This causes the system to recreate them
     * on the next call to {@link #getFilters}.
     */
    invalidateFilters: function() {
        this.filters = null;
    },

    /**
     * Checks if interactive filtering is currently applied to the column.
     * @return {Boolean} True if filtering is currently applied to the column
     */
    hasActiveFilters: function() {
        var filters = this.getFilters();
        var filterCnt = filters.length;
        for (var f = 0; f < filterCnt; f++) {
            var filter = filters[f];
            if (filter.isInteractive() && filter.isActive()) {
                return true;
            }
        }
        return false;
    },

    /**
     * <p>Applies current filter settings.</p>
     * <p>Filter settings will first be transferred from the UI. Then, the current data
     * actually gets filtered and the view gets updated accordingly.</p>
     * @param {Boolean} persistFilters True if filter settings should be persisted
     */
    applyFilters: function(persistFilters) {
        if (this.hasFilters()) {
            var filterCnt = this.filters.length;
            for (var f = 0; f < filterCnt; f++) {
                var filter = this.filters[f];
                filter.transferFromUI();
            }
            if (persistFilters) {
                this.persistCurrentFilterState();
            }
        }
    },

    /**
     * Persists the current aggregate used.
     */
    persistCurrentAggregate: function() {
        this.requestSyncer.block();
        this.requestSyncer.registerRequest();
        if (this.report.view) {
            this.report.view.notifyUpdateStart();
        }
        var ref = this;
        CQ.Ext.Ajax.request({
                "method": "POST",
                "url": CQ.HTTP.externalize(this.settingsPath),
                "params": {
                    "./aggregate": this.settings.aggregate
                },
                "success": function() {
                    ref.requestSyncer.finishWithSuccess();
                },
                "failure": function() {
                    ref.requestSyncer.finishWithError();
                },
                "scope": this
            });
        this.requestSyncer.unblock();
    },

    /**
     * Persists the current grouping state.
     */
    persistCurrentGroupingState: function() {
        this.requestSyncer.block();
        this.requestSyncer.registerRequest();
        if (this.report.view) {
            this.report.view.notifyUpdateStart();
        }
        var ref = this;
        CQ.Ext.Ajax.request({
                "method": "POST",
                "url": CQ.HTTP.externalize(this.settingsPath),
                "params": {
                    "./grouped": String(this.settings.grouped)
                },
                "success": function() {
                    ref.requestSyncer.finishWithSuccess();
                },
                "failure": function() {
                    ref.requestSyncer.finishWithError();
                },
                "scope": this
            });
        this.requestSyncer.unblock();
    },

    /**
     * Persists the current filter state.
     */
    persistCurrentFilterState: function() {
        this.requestSyncer.block();
        this.requestSyncer.registerRequest();
        if (this.report.view) {
            this.report.view.notifyUpdateStart();
        }
        var ref = this;
        var params = {
                ":replace": "true",
                "_charset_": "utf-8"
            };
        var filters = this.getFilters();
        var filterCnt = filters.length;
        for (var f = 0; f < filterCnt; f++) {
            var filter = filters[f];
            var isActive = filter.isActive();
            params["./filters/" + filter.id + "/active"] = String(isActive);
            params["./filters/" + filter.id + "/value"] = (isActive ? filter.serialize()
                    : "");
        }
        CQ.Ext.Ajax.request({
                "method": "POST",
                "url": CQ.HTTP.externalize(this.settingsPath),
                "params": params,
                "success": function() {
                    ref.requestSyncer.finishWithSuccess();
                },
                "failure": function() {
                    ref.requestSyncer.finishWithError();
                },
                "scope": this
            });
        this.requestSyncer.unblock();
    },

    /**
     * Persists the current sorting state of the column.
     * @param {CQ.reports.utils.RequestSync} reqSyncer The request syncer to be used
     */
    persistSorting: function(reqSyncer) {
        reqSyncer.registerRequest();
        var isSorted = false;
        var direction = "";
        if (this.settings.sorting) {
            isSorted = this.settings.sorting.sorted;
            direction = this.settings.sorting.direction;
            if (direction == null) {
                direction = "";
            }
        }
        CQ.Ext.Ajax.request({
                "method": "POST",
                "url": CQ.HTTP.externalize(this.settingsPath),
                "params": {
                    "./sorting/sorted": isSorted,
                    "./sorting/direction": direction
                },
                "success": function(response) {
                    reqSyncer.finishWithSuccess();
                },
                "failure": function() {
                    reqSyncer.finishWithError();
                }
            });
    }

});

CQ.reports.Column.defaultTextRenderer = function(v) {
    if (!v) {
        return v;
    }
    if (typeof(v) == "object") {
        var o = v;
        if (o.display != null) {
            v = o.display;
        }
        if (o.path) {
            v = "<a href=\"" + CQ.shared.HTTP.externalize(o.path)
                    + ".html\" target=\"_blank\">" + v + "</a>";
        }
    }
    return v;
};

// runs in the scope of the column
CQ.reports.Column.defaultClientFilter = function(v) {
    if (v && typeof(v) == "object") {
        if (v.path && this.definitions.view && this.definitions.view.suppressLinks) {
            delete v.path;
        }
    }
    return v;
};
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class must be extended by each report view. A report view is responsible for
 * presenting the report's data to the user in one or another way, for example as tabular
 * data or as graphical chart.
 * @class CQ.reports.View
 */
CQ.reports.View = CQ.Ext.extend(CQ.Ext.emptyFn, {

    constructor: function(config) {
        config = config || { };
        CQ.Ext.apply(this, config);
    },

    /**
     * <p>This method is responsible for the initial rendering of the view. It is called
     * once the page has initialized and all column definitions of the report are available.
     * Note that initial data is not yet available. Initial data will be reported in an
     * explicit step, using {@link #updateDataFromQuery}.</p>
     * <p>The specified report may be saved for further reference.</p>
     * @param {CQ.Ext.Element} destEl The Ext element the view has to be rendered to
     * @param {CQ.reports.Report} report The report the view is used from
     * @param {Number[]} sizeHints Hints for initial sizing of the view
     */
    render: function(destEl, report, sizeHints) {
        // override
    },

    /**
     * This method is responsible for destroying the view after use.
     * @param {CQ.Ext.Element} destEl The parent element the view has been rendered to
     */
    destroy: function(destEl) {
        // override
    },

    /**
     * This method is called if the report structure changed.
     */
    notifyStructureChanged: function() {
        // may be overridden if necessary
    },

    /**
     * This method may be used by the view for adapting to a change of sorting order.
     * Note that the initial sorting order is not propagated using this method. Neither are
     * indirect changes in the sorting order (for example because the sorted column gets
     * removed) reported using this method. The latter changes are reported through
     * {@link #notifyStructureChanged}.
     * @param {Number} colIndex The index of the column
     * @param {String} direction The sorting direction ("ASC", "DESC")
     */
    notifySortingChanged: function(colIndex, direction) {
        // may be overridden if necessary
    },

    /**
     * This method is called after the report has been finished successfully.
     */
    notifyFinished: function() {
        // may be overridden if necessary
    },

    /**
     * This method is called if the view's size has changed.
     * @param {Number} w New width
     * @param {Number} h New height
     */
    notifySizeChanged: function(w, h) {
        // may be overridden if necessary
    },

    /**
     * This method is called if a visual update is requested by the report. This means that
     * no reloading of displayed data is required.
     */
    repaint: function() {
        // override
    },

    /**
     * This method is called if a complete update - reloading the data and redrawing the
     * view - is requested by the report
     * @param {Boolean} forceReload True if a forced update is required (will also load
     *        data for server-only reports)
     */
    reload: function(forceReload) {
        // override
    },

    /**
     * This method is used to notify the view about an (possibly time consuming) update
     * operation. The view may show a load indicator/busy cursor on this notification.
     */
    notifyUpdateStart: function() {
        // override
    },

    /**
     * This method is used to notify the view about the end of an update operation. The
     * view may hide a previously shown load indicator on this notification.
     */
    notifyUpdateEnd: function() {
        // override
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This singleton provides means to register filters and corresponding UI components to be
 * instantiated by a unique name.
 * @class CQ.reports.FilterRegistry
 * @singleton
 */
CQ.reports.FilterRegistry = function() {

    /**
     * Filter registry
     */
    var filterRegistry = { };

    /**
     * UI registry
     */
    var uiRegistry = { };

    return {

        /**
         * Registers a filter for indirect instantiation through a filter type.
         * @param {String} filterType The type/name the filter may be indirectly
         *        instantiated
         * @param {Function} filterClass The filter's class; filters must extend
         *        {@link CQ.reports.Filter}
         */
        registerFilter: function(filterType, filterClass) {
            filterRegistry[filterType] = filterClass;
        },

        /**
         * Creates a previously registered filter by its type/name.
         * @param {String} filterType The filter's type
         * @param {Object} config The config object to be passed to the filter's constructor
         * @return {CQ.reports.Filter} The filter instance
         */
        createFilter: function(filterType, config) {
            var cls = filterRegistry[filterType];
            if (cls == null) {
                return null;
            }
            return new cls(config);
        },

        /**
         * Register a UI component for filter settings under a specific name/type.
         * @param {String} uiType Name/type of the UI component
         * @param {Function} uiClass The UI component's class; filter UI components must
         *        extend {@link CQ.reports.ui.FilterUI}
         */
        registerFilterUI: function(uiType, uiClass) {
            uiRegistry[uiType] = uiClass;
        },

        /**
         * Creates a previously registered filter UI component by its type/name.
         * @param {String} uiType UI component type
         * @param {Object} config The config object to be passed to the component's
         *        constructor
         * @return {CQ.reports.ui.FilterUI} The UI comoponent
         */
        createFilterUI: function(uiType, config) {
            var cls = uiRegistry[uiType];
            if (cls == null) {
                return null;
            }
            return new cls(config);
        }

    };

}();
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * A Filter must be implemented by the various filter types supported by the reporting
 * framework.
 * @class CQ.reports.Filter
 * @constructor
 * @param {Object} config The config object
 * @param {Object} defaultUIType The default UI component type to be used by the implementing filter
 */
CQ.reports.Filter = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * @cfg {String} id
     * The filter's ID
     */
    id: null,

    /**
     * The {@link CQ.reports.ui.FilterUI component} that represents the user inteface
     * for the filter
     * @private
     * @type CQ.reports.ui.FilterUI
     */
    ui: null,

    /**
     * The UI component type to be used for this filter by default
     * @private
     * @type String
     */
    defaultUIType: null,

    constructor: function(config, defaultUIType) {
        this.defaultUIType = defaultUIType;
        CQ.Ext.apply(this, config);
    },

    /**
     * Creates the UI component used for presenting filter settings to the user.
     * @param {String} uiType (optional) The UI component type to be used; if none is
     *        specified, the filter's default component is used
     */
    createUI: function(uiType) {
        if (uiType == null) {
            uiType = this.defaultUIType;
        }
        // todo config object?
        this.ui = CQ.reports.FilterRegistry.createFilterUI(uiType, { });
        if (this.ui == null) {
            throw new Error("Could not instantiate filter UI component of type '" + uiType
                + "'.");
        }
    },

    /**
     * This method gets called after the initial load of raw data.
     * @param {Object[]} data Initial raw data
     * @param {Number} col The column's index regarding the raw data
     */
    notifyInitialData: function(data, col) {
        if (this.ui != null) {
            this.ui.notifyInitialData(data, col);
        }
    },

    /**
     * Checks if the filter is interactive (= has a UI element assigned to it).
     * @return {Boolean} True if the filter is interactive/explicit
     */
    isInteractive: function() {
        return (this.ui != null);
    },

    /**
     * Checks if the filter is active.
     */
    isActive: function() {
        if (this.ui != null) {
            return this.ui.isActive();
        }
        return true;
    },

    /**
     * Transfers filter settings from the UI.
     */
    transferFromUI: function() {
        if (this.ui != null) {
            this.transferFromUITypeSpecific();
        }
    },

    /**
     * Type-specific part of {@link #transferFromUI}. Must be implemented by each
     * filter implementation.
     * @private
     */
    transferFromUITypeSpecific: function() {
        // must be overridden by implementing filters
    },

    /**
     * Transfers filter settings to the UI.
     */
    transferToUI: function() {
        if (this.ui != null) {
            this.transferToUITypeSpecific();
        }
    },

    /**
     * Type-specific part of {@link #transferToUI}. Must be implemented by each
     * filter implementation.
     * @private
     */
    transferToUITypeSpecific: function() {
        // must be overridden by implementing filters
    },

    /**
     * This method must return a string representation of the current filter value, used
     * for persisting the filter settings in the repository.
     * @return {String} The string representation
     */
    serialize: function() {
        // must be overridden by implementing filters
        return "";
    },

    /**
     * This method must initialize the filter settings from the specified string
     * representation.
     * @param {String} value The string representation
     */
    deserialize: function(value) {
        // must be overridden by implementing filters
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * Base class for all chart types supported by the reporting framework.
 * @class CQ.reports.Chart
 * @constructor
 * @param {CQ.reports.ChartDefinition} chartDef The chart definition
 * @param {CQ.reports.Report} The report the chart is used by
 */
CQ.reports.Chart = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * The chart definition the chart was created from
     * @private
     * @type CQ.reports.ChartDefinition
     */
    chartDef: null,

    /**
     * The report
     * @private
     * @type CQ.reports.Report
     */
    report: null,


    constructor: function(chartDef, report) {
        this.chartDef = chartDef;
        this.report = report;
    },

    /**
     * Renders the chart.
     * @param {CQ.Ext.Element} parentEl The parent element
     * @param {Number[]} initialSize The initial size of the chart
     */
    render: function(parentEl, initialSize) {
        // must be overridden by implementing class
    },

    /**
     * Updates the chart to the specified chart definition.
     * @param {Boolean} invalidateData True if data should be invalidated
     */
    update: function(invalidateData) {
        // must be overridden by implementing class
    },

    /**
     * <p>Requests the chart to clear itself.</p>
     * <p>"Cleared state" is required for having a "neutral" layout in situations
     * where no data is available for non-interactive reports. It is not used in
     * situations where no suitable data is available for interactive reports - this has
     * to be handled in {@link #update} separately.</p>
     */
    clear: function() {
        // must be overridden by implementing class
    },

    /**
     * Checks if the chart has already been rendered.
     * @return {Boolean} True if the chart has already been rendered
     */
    isRendered: function() {
        // must be overridden by implementing class
        return false;
    },

    /**
     * Notifies the chart about being removed.
     */
    notifyRemoved: function() {
        // must be overridden by implementing class
    },

    /**
     * Notifies the chart about a resize.
     * @param {Number} w The new width
     * @param {Number} h The new height
     */
    notifyResize: function(w, h) {
        // may be overridden by implementing class if necessary
    },

    /**
     * Notifies the chart about the underlying report having been finished successfully.
     */
    notifyReportFinished: function() {
       // may be overridden if necessary
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This singleton provides means to register chart types to be instantiated by a unique
 * name.
 * @class CQ.reports.ChartRegistry
 * @singleton
 */
CQ.reports.ChartRegistry = function() {

    /**
     * Chart registry
     */
    var chartRegistry = { };

    return {

        /**
         * Registers a chart for indirect instantiation through a chart type.
         * @param {String} chartType The type/name the chart may be indirectly
         *        instantiated
         * @param {Function} chartClass The chart's class; charts must extend
         *        {@link CQ.reports.Chart}
         */
        registerChart: function(chartType, chartClass) {
            chartRegistry[chartType] = chartClass;
        },

        /**
         * Creates a previously registered chart by its type/name.
         * @param {String} chartType The chart's type
         * @param {CQ.reports.ChartDefinition} chartDef The chart definition to be passed
         *        to the chart's constructor
         * @param {CQ.reports.Report} report The report the chart will be used by
         * @return {CQ.reports.Chart} The chart instance; null if chart could not be
         *         instantiated
         */
        createChart: function(chartType, chartDef, report) {
            var cls = chartRegistry[chartType];
            if (cls == null) {
                return null;
            }
            return new cls(chartDef, report);
        }

    };

}();
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class provides the information required for rendering a chart.
 * @class CQ.reports.ChartDefinition
 * @constructor
 * Creates a new ChartDefinition.
 * @param {Object} config The config object (as loaded from the repository)
 */
CQ.reports.ChartDefinition = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * @cfg {String} type
     * The chart type (as registered in {@link CQ.reports.ChartRegistry}); defaults to
     * "pie"
     */
    type: null,

    /**
     * @cfg {Number} valueLimit
     * The maximum number of distinct values to be shown in the chart; it is basically left
     * to the chart to handle this parameter sensibly (for example by displaying the
     * (maxDistinctValue - 1) largest values and summarizing all other values under a
     * "others" entry); defaults to 10
     */
    valueLimit: 0,

    /**
     * @cfg {String|String[]} colors
     * Defines the color scheme to be used for the chart. If a String is specified, one of
     * the predefined color schemes (defined by
     * {@link CQ.reports.charts.ColorScheme#DEFAULT_SCHEMES}) is used. If a String[] is
     * specified, the color values of the scheme may be defined explicitly, using the
     * format "#rrggbb". Default value is "bgry-bright"
     */
    colors: null,

    /**
     * @cfg {String} preferredLayout
     * Defines the preferred layout to be used for displaying the chart. Currently,
     * "horizontal" and "vertical" are supported. Note that the actual layout might differ
     * from the preferred layout, as screen estate may not allow for the preferred layout.
     * Defaults to "horizontal".
     */
    preferredLayout: null,

    /**
     * The initial size of the chart
     * @type Number[]
     * @private
     */
    initialSize: null,


    constructor: function(config) {
        config = config || { };
        CQ.Util.applyDefaults(config, {
                "type": "pie",
                "valueLimit": 10,
                "colors": "bgry-bright",
                "preferredLayout": "horizontal"
            });
        CQ.Ext.apply(this, config);
    },

    /**
     * Gets the {@link CQ.reports.Chart} instance for this chart definition.
     * @param {CQ.Ext.Element} parentEl The charts parent element; required for lazy
     *        rendering
     * @param {CQ.reports.Report} report The report the chart is used by
     * @return {CQ.reports.Chart} The chart instance
     */
    getChart: function(parentEl, report) {
        if (this.chart == null) {
            this.chart = CQ.reports.ChartRegistry.createChart(this.type, this, report);
            if (this.chart) {
                this.chart.render(parentEl, this.initialSize);
            }
        } else if (!this.chart.isRendered()) {
            this.chart.render(parentEl, this.initialSize);
        }
        return this.chart;
    },

    /**
     * Updates the chart's view.
     * @param {CQ.Ext.Element} parentEl The chart's parent element (required for lazy
     *        rendering)
     * @param {CQ.reports.Report} report The report the chart is used by
     * @param {Boolean} invalidateData True if data has to be reloaded due to a change in
     *        the report
     */
    updateView: function(parentEl, report, invalidateData) {
        var chartView = this.getChart(parentEl, report);
        if (chartView) {
            chartView.update(report, invalidateData);
        }
    },

    /**
     * <p>Asks the chart to display itself in "cleared" state.</p>
     * <p>"Cleared state" is required for having a "neutral" layout in situations
     * where no data is available for non-interactive reports. It is not used in
     * situations where no suitable data is available for interactive reports - this has
     * to be handled in {@link #updateView} separately.</p>
     * @param {CQ.Ext.Element} parentEl The chart's parent element (for lazy rendering)
     * @param {CQ.reports.Report} report The report the chart is used by
     */
    clearView: function(parentEl, report) {
        var chartView = this.getChart(parentEl, report);
        if (chartView) {
            chartView.clear(report);
        }
    },

    /**
     * Propagates a resize to the underlying chart view if available.
     * @private
     */
    propagateResize: function(w, h) {
        if ((this.chart != null) && this.chart.isRendered()) {
            this.chart.notifyResize(w, h);
        } else {
            this.initialSize = [ w, h ];
        }
    },

    /**
     * Propagates the finishing of a report to the underlying chart view if available.
     * @private
     */
    propagateReportFinished: function() {
        if (this.chart != null) {
            this.chart.notifyReportFinished();
        }
    },

    /**
     * Calculates the actual layout of the chart for the specified available total chart
     * size.
     * @param {Number} availWidth Available width
     * @param {Number} availHeight Available height
     * @param {Number} min (optional) Minimum space required for displaying the chart;
     *        if less is available, limited layout is selected, which omits the chart's
     *        legend; defaults to 400 (horizontal) and 300 (vertical
     * @return {String} The actual layout of the chart ("horizontal", "vertical" or
     *         "limited" (if not enough space is available for a legend)
     */
    calculateActualLayout: function(availWidth, availHeight, min) {
        var hMin, vMin;
        if (min === undefined) {
            vMin = 300;
            hMin = 400;
        } else {
            vMin = min;
            hMin = min;
        }
        var layout = this.preferredLayout;
        var avail = (layout == "horizontal" ? availWidth : availHeight);
        var actualMin = (layout == "horizontal" ? hMin : vMin);
        var oppositeLayout = (layout == "horizontal" ? "vertical" : "horizontal");
        var opposite = (layout == "horizontal" ? availHeight : availWidth);
        var oppositeMin = (layout == "horizontal" ? vMin : hMin);
        if (avail < actualMin) {
            if (opposite > oppositeMin) {
                layout = oppositeLayout;
            } else {
                layout = "limited";
            }
        }
        return layout;
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * <p>This class implements commonly used functionality for processing the data
 * as provided by the server.</p>
 * @class CQ.reports.data.Processor
 */
CQ.reports.data.Processor = CQ.Ext.extend(CQ.Ext.emptyFn, {

    constructor: function(report) {
        this.report = report;
    },

    /**
     * @private
     */
    getActualType: function(col, typeDef) {
        if (!typeDef) {
            return col.getType();
        }
        var actualType = typeDef[col.getDataId()];
        if (!actualType) {
            return "misconfigured";
        }
        return actualType;
    },

    /**
     * @private
     */
    getActualColumnType: function(col) {
        if (!this.colTypes) {
            return col.getType();
        }
        return this.colTypes[col.getDataId()];
    },

    /**
     * Creates Ext-compatible field definitions from the specified result
     */
    createFieldDefs: function(result) {
        this.colTypes = { };
        var fieldDefs = [ ];
        var columns = this.report.columns;
        if (!columns) {
            return [ ];
        }
        var colCnt = columns.length;
        for (var c = 0; c < colCnt; c++) {
            var column = columns[c];
            var dataId = column.getDataId();
            // determine (Ext) field type for store
            var actualType = this.getActualType(column, (result ? result["dataTypes"]
                    : null));
            this.colTypes[dataId] = actualType;
            var fieldType = actualType;
            // type conversion (to field types as accepted by Ext's Store implementation
            // or to different field types if the value is prerendered by the server)
            switch (fieldType) {
                case "list":
                case "date":
                    fieldType = "string";
                    break;
                case "number":
                    fieldType = "float";
                    break;
                case "custom":
                    fieldType = "auto";
                    break;
                case "misconfigured":
                    fieldType = "auto";
                    break;
            }
            fieldDefs.push({
                    "name": dataId,
                    "type": fieldType
                });
        }
        return fieldDefs;
    },

    /**
     * Calculates the actual value of the specified hit for the specified column.
     * @param {CQ.reports.Column} col The column to calculate the value for
     * @param {Object} hit The hit to get the value for
     * @param {Boolean} hasGroupedCols True if the report has at least one column for
     *        grouping
     * @private
     */
    calculateValue: function(col, hit, hasGroupedCols) {
        var dataId = col.getDataId();
        var preFilter = col.getPreFilter();
        var isAggregatedValue = hasGroupedCols && !col.isGrouped();
        var type = this.colTypes[dataId];
        if (type == "misconfigured") {
            hit[dataId] = "<span style=\"color: red;\">" + CQ.I18n.getMessage("invalid")
                    + "</span>";
        }
        var value = hit[dataId];
        if (!isAggregatedValue) {
            value = preFilter.call(col, value);
        }
        hit[dataId] = value;
    },

    /**
     * Creates the raw data of the report from the specified result.
     * @private
     */
    process: function(result) {
        var hits = result["hits"];
        var columns = this.report.columns;
        var groupedCols = this.report.createGroupedColumns();
        var hasGroupedCols = (groupedCols.length > 0);
        var colCnt = columns.length;
        for (var h = 0; h < hits.length; h++) {
            var hit = hits[h];
            for (var c = 0; c < colCnt; c++) {
                this.calculateValue(columns[c], hit, hasGroupedCols);
            }
        }
    },

    /**
     * Propagates the specified result.
     */
    notifyInitialData: function(result) {
        // todo must be replaced (filter must be configured otherwise)
        var colCnt = this.report.columns.length;
        for (var c = 0; c < colCnt; c++) {
            var column = this.report.columns[c];
            column.notifyInitialData(result["hits"], c);
        }
    },

    handleSorting: function(sortInfo) {
        var col = null;
        var dir = null;
        if (sortInfo) {
            col = sortInfo.col;
            if (!this.hasColumn(col)) {
                col = null;
            } else {
                dir = sortInfo.dir;
            }
        }
        this.report.adjustSorting(col, dir);
    },

    hasColumn: function(col) {
        return (this.report.getColumnIndexForDataId(col) >= 0);
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * <p>This class implements a {@link CQ.Ext.data.Store} for retrieving report data.</p>
 * @class CQ.reports.views.ReportingStore
 * @extends CQ.Ext.data.Store
 */
CQ.reports.data.ReportingStore = CQ.Ext.extend(CQ.Ext.data.Store, {

    report: null,

    constructor: function(processor, config) {
        config = config || { };
        this.report = processor.report;
        var requestUrl = this.report.getDataRequestPath();
        this.reportReader = new CQ.reports.data.ReportingReader(processor, null,
                this.firePreprocessedEvent.createDelegate(this));
        CQ.Ext.apply(config, {
                "remoteSort": true,
                "reader": this.reportReader,
                "proxy": new CQ.Ext.data.HttpProxy({
                        "api": {
                                "read": {
                                        "url": requestUrl,
                                        // we're changing data on resorting, hence
                                        // using POST method here
                                        "method": "POST"
                                    }
                            }
                    })
            });
        this.addEvents("preprocessed");
        CQ.reports.data.ReportingStore.superclass.constructor.call(this, config);
    },

    /**
     * Removes all records from the store and fires the required Ext events.
     *
     * @param {Boolean} silent (optional) True if the clear event should be fired; defaults
     *        to false
     */
    removeAllRecords: function(silent) {
        this.removeAll(silent);
        // the following is required for the PagingToolbar to adjust itself to the
        // removed data
        this.totalLength = 0;
        this.fireEvent('load', this, [ ], { });
    },

    /**
     * @private
     */
    firePreprocessedEvent: function(o) {
        this.fireEvent("preprocessed", o);
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a reader that is suitable for the loading data from the specified
 * store.
 * @class CQ.reports.data.ReportingReader
 * @extends CQ.Ext.data.JsonReader
 */

CQ.reports.data.ReportingReader = CQ.Ext.extend(CQ.Ext.data.JsonReader, {

    processor: null,

    colTypes: null,

    constructor: function(processor, config, preprocessHandler) {
        config = config || { };
        this.processor = processor;
        this.preprocessHandler = preprocessHandler;
        CQ.Ext.apply(config, {
                "root": "hits",
                "totalProperty": "results",
                "id": "id"
            });
        CQ.reports.data.ReportingReader.superclass.constructor.call(this, config,
                this.processor.createFieldDefs());
    },

    // overrides CQ.Ext.data.JsonReader#readRecords
    readRecords : function(o){
        this.jsonData = o;
        // CQ:START: Change meta data
        var metaData = CQ.Util.copyObject(this.meta);
        metaData.fields = this.processor.createFieldDefs(o);
        // this removes sort info if no sorting is applied; nulling does not work
        metaData.sortInfo = { };
        if (o.sortInfo && o.sortInfo.col) {
            if (this.processor.hasColumn(o.sortInfo.col)) {
                metaData.sortInfo = {
                        "field": o.sortInfo.col,
                        "direction": o.sortInfo.dir
                    };
            }
        }
        this.processor.handleSorting(o.sortInfo);
        this.onMetaChange(metaData);
        delete o["dataTypes"];
        this.processor.process(o);
        // todo to be replaced
        this.processor.notifyInitialData(o);
        if (this.preprocessHandler) {
            this.preprocessHandler(o);
        }
        // CQ:END
        var s = this.meta, Record = this.recordType,
            f = Record.prototype.fields, fi = f.items, fl = f.length, v;

        var root = this.getRoot(o), c = root.length, totalRecords = c, success = true;
        if(s.totalProperty){
            v = parseInt(this.getTotal(o), 10);
            if(!isNaN(v)){
                totalRecords = v;
            }
        }
        if(s.successProperty){
            v = this.getSuccess(o);
            if(v === false || v === 'false'){
                success = false;
            }
        }

        // TODO return CQ.Ext.data.Response instance instead.  @see #readResponse
        return {
            success : success,
            records : this.extractData(root, true), // <-- true to return [CQ.Ext.data.Record]
            totalRecords : totalRecords
        };
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports.filters.StringFilter = CQ.Ext.extend(CQ.reports.Filter, {

    /**
     * Filter operation
     * @private
     * @type String
     */
    op: null,

    /**
     * Filter value
     * @private
     * @type String
     */
    value: null,

    constructor: function(config) {
        CQ.reports.filters.StringFilter.superclass.constructor.call(this, config,
                "defaultstring");
    },

    transferFromUITypeSpecific: function() {
        if (this.ui != null) {
            this.op = this.ui.getFilterOp();
            this.value = this.ui.getFilterValue();
        }
    },

    transferToUITypeSpecific: function() {
        if (this.ui != null) {
            this.ui.setFilterOp(this.op);
            this.ui.setFilterValue(this.value);
        }
    },

    serialize: function() {
        return this.op + ":" + this.value
    },

    deserialize: function(value) {
        if (value) {
            var sepPos = value.indexOf(":");
            if (sepPos > 0) {
                this.op = value.substring(0, sepPos);
                this.value = value.substring(sepPos + 1, value.length);
            }
        }
    }

});

/**
 * Filter operation: Filter matches if the cell contains at least a substring of the
 * filter's value.
 * @static
 * @final
 */
CQ.reports.filters.StringFilter.OP_CONTAINS = "contains";

/**
 * Filter operation: Filter matches if the cell value equals the filter's value exactly
 * @static
 * @final
 */
CQ.reports.filters.StringFilter.OP_EQUALS = "equals";


// register filter
CQ.reports.FilterRegistry.registerFilter("string", CQ.reports.filters.StringFilter);
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * <p>This class implements the top level view that is used for all reports. It works as a
 * container for the "empty report view" (shown if a report currently has no columns) and
 * the "regular report view" (shown if a report has at least one column).</p>
 *
 * <p>A TopLevelView also handles all required global resizing stuff.</p>
 */
CQ.reports.views.TopLevelView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    container: null,

    /**
     * @private
     */
    emptyReportView: null,

    /**
     * @private
     */
    regularReportView: null,

    /**
     * @private
     */
    activeView: null,

    /**
     * @private
     */
    isUpdated: false,

    /**
     * @cfg {Number} rightMargin
     * The right margin; defaults to 8
     */
    rightMargin: 0,

    /**
     * @cfg {Number} bottomMargin
     * The bottom margin; defaults to 8
     */
    bottomMargin: 0,

    /**
     * @cfg {Boolean} ensureMinimumSize
     * Flag that determines if a minmum size of 400x400 pixels for the view should be
     * ensured; defaults to true. If the available size is smaller than the minimum size,
     * scrollbars will be shown.
     */
    ensureMinimumSize: false,

    /**
     * @cfg {Number} width
     * Predefined width; null for automatic width calculation (default)
     */
    width: null,

    /**
     * @cfg {Number} height
     * Predefined height; null for automatic height calculation (default)
     */
    height: null,


    constructor: function(config) {
        config = config || { };
        CQ.Util.applyDefaults(config, {
                "rightMargin": 15,
                "bottomMargin": 8,
                "ensureMinimumSize": true
            });
        CQ.Ext.apply(this, config);
    },


    // utils -------------------------------------------------------------------------------

    adjustView: function() {
        var hasColumns = (this.report.columns.length > 0);
        if (hasColumns) {
            if (this.activeView != this.regularReportView) {
                this.displayRegularView();
                if (this.isUpdated) {
                    this.activeView.notifyUpdateStart();
                }
            }
        } else if (!this.report.isSingleViewRendering()) {
            if (this.activeView != this.emptyReportView) {
                this.displayEmptyView();
                if (this.isUpdated) {
                    this.activeView.notifyUpdateStart();
                }
            }
        }
    },

    displayRegularView: function() {
        var destEl = this.container.getEl();
        if (this.activeView != null) {
            this.activeView.destroy(destEl);
        }
        this.regularReportView.render(destEl, this.report, this.sizeHint);
        this.activeView = this.regularReportView;
    },

    displayEmptyView: function() {
        var destEl = this.container.getEl();
        if (this.activeView != null) {
            this.activeView.destroy(destEl);
        }
        this.emptyReportView.render(destEl, this.report, this.sizeHint);
        this.activeView = this.emptyReportView;
    },

    resizeView: function(availW, availH) {
        if (availW === undefined) {
            availW = CQ.Ext.lib.Dom.getViewWidth();
        }
        if (availH === undefined) {
            availH = CQ.Ext.lib.Dom.getViewHeight();
        }
        var w = availW;
        var h = availH;
        var isFramed = (window.frameElement
                && (window.frameElement.tagName.toLowerCase() == "iframe"));
        var containerPos = this.container.getPosition();
        var preDefDims = 0;
        if (this.width != null) {
            w = this.width;
            preDefDims++;
        } else {
            w = w - containerPos[0] - this.rightMargin;
        }
        if (this.height != null) {
            h = this.height;
            preDefDims++;
        } else {
            h = h - containerPos[1] - this.bottomMargin;
        }
        // Workaround for iframed-usecase
        if ((preDefDims == 1) && isFramed) {
            if ((this.height == null) && (w > availW)) {
                // we'll get a horizontal bar; adjust height accordingly
                h -= (CQ.Ext.isMac ? 15 : 17);
            }
            if ((this.width == null) && (h > availH)) {
                // we'll get a vertical bar; adjust width accordingly
                w -= (CQ.Ext.isMac ? 15 : 17);
            }
        }
        if (this.ensureMinimumSize && (w < 400)) {
            w = 400;
        }
        if (this.ensureMinimumSize && (h < 400)) {
            h = 400;
        }
        this.sizeHint = [ w, h ];
        this.container.setSize(w, h);
    },


    // interface ---------------------------------------------------------------------------

    // overrides CQ.reports.View#render
    render: function(destEl, report) {
        this.report = report;
        this.container = new CQ.Ext.Container({
                "autoEl": "div"
            });
        this.container.render(destEl);
        CQ.Ext.EventManager.onWindowResize(function(w, h) {
                this.resizeView(w, h);
                this.notifySizeChanged(this.sizeHint[0], this.sizeHint[1]);
            }, this);
        this.resizeView();
        // todo make configurable
        this.emptyReportView = new CQ.reports.views.EmptyReportView();
        if (!this.regularReportView) {
            this.regularReportView = new CQ.reports.views.CombinedView({
                    "subViewConfig": this.subViewConfig
                });
        }
        this.adjustView();
    },

    notifyStructureChanged: function() {
        this.adjustView();
        this.activeView.notifyStructureChanged();
    },

    notifySortingChanged: function(colIndex, direction) {
        if (this.activeView) {
            this.activeView.notifySortingChanged(colIndex, direction);
        }
    },

    notifyFinished: function() {
        if (this.activeView) {
            this.activeView.notifyFinished();
        }
    },

    notifySizeChanged: function(w, h) {
        if (this.activeView) {
            this.activeView.notifySizeChanged(w, h);
        }
    },

    reload: function(isForced) {
        if (this.activeView) {
            this.activeView.reload(isForced);
        }
    },

    repaint: function(isForced) {
        if (this.activeView) {
            this.activeView.repaint();
        }
    },

    notifyUpdateStart: function() {
        this.isUpdate = true;
        if (this.activeView) {
            this.activeView.notifyUpdateStart();
        }
    },

    notifyUpdateEnd: function() {
        this.isUpdated = false;
        if (this.activeView) {
            this.activeView.notifyUpdateEnd();
        }
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports.views.EmptyReportView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    container: null,

    /**
     * @private
     */
    insertContainer: null,

    // overrides CQ.reports.View#render
    render: function(parentEl, report) {
        this.report = report;
        var msg = CQ.I18n.getMessage("Drag a column here to start the report");
        this.container = new CQ.Ext.Container({
                "autoEl": "div"
            });
        this.insertContainer = new CQ.Ext.Container({
                "autoEl": "div",
                "cls": "cq-reports-insert-container"
            });
        this.insertContainer.add(new CQ.Ext.form.Label({
                "text": msg,
                "cls":"cq-reports-insert-message"
            }));
        this.insertContainer.setHeight(CQ.reports.views.GridView.INSERT_ELEMENT_HEIGHT);
        this.container.add(this.insertContainer);
        this.container.render(parentEl);
        var dt = new CQ.Ext.dd.DropTarget(this.insertContainer.getEl(), {

                notifyDrop: (function(source) {
                    var insertEditable = CQ.reports.utils.EditUtils.getNewColumnEditable();
                    if (insertEditable) {
                        var colToInsert = source.dragData.records[0].data;
                        var parPath = insertEditable.createParagraph(colToInsert);
                        // remove column stub that was created by the paragraph's reload
                        // (component creates a "addColumn" statement; we'll have to
                        // handle that manually)
                        report.columns.length--;
                        var compPath = colToInsert.path;
                        var col = new CQ.reports.Column({
                                "dataPath": parPath,
                                "componentPath": compPath
                            });
                        report.addColumn(col);
                        col.loadDef(new CQ.reports.utils.RequestSync({
                                onLoadFn: function() {
                                    if (col.isGeneric()) {
                                        CQ.reports.utils.EditUtils.changeGenericProps(col);
                                    }
                                    report.fireStructureChanged();
                                }
                            }));
                        return true;
                    }
                    return false;
                }).createDelegate(this)

            });
        dt.addToGroup(CQ.wcm.EditBase.DD_GROUP_COMPONENT);
    },

    destroy: function(destEl) {
        this.container.removeAll(true);
        this.container.destroy();
        this.container = null;
    },

    notifySizeChanged: function(w, h) {
        this.insertContainer.setWidth(w);
        this.container.setWidth(w);
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class is used for displaying a report in a tabular (grid) view.
 * @class CQ.reports.views.GridView
 * @extends CQ.reports.View
 */
// todo reimplement/restructure - too messy ATM
CQ.reports.views.GridView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * @private
     */
    grid: null,

    /**
     * @private
     */
    columns: null,

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    processor: null,

    /**
     * @private
     */
    defaultStore: null,

    /**
     * @private
     */
    completeData: null,

    /**
     * @private
     */
    dataOffset: null,

    /**
     * @private
     */
    isApplicatorySortChange: false,

    /**
     * @cfg {Number} rowsPerPage
     * @since 5.5
     * Number of rows that are displayed per page; defaults to 100
     */
    rowsPerPage: 0,


    constructor: function(config) {
        config = config || {
                "rowsPerPage": 100
            };
        CQ.reports.views.GridView.superclass.constructor.call(this, config);
    },

    /**
     * @private
     */
    createColumnDefs: function() {
        var columnDefs = [ ];
        var fieldDefs = [ ];
        var colCnt = this.columns.length;
        var hasGroupedCols = (this.report.createGroupedColumns().length > 0);
        for (var c = 0; c < colCnt; c++) {
            var column = this.columns[c];
            var dataId = column.getDataId();
            var name = "<b>" + CQ.I18n.getVarMessage(column.getName()) + "</b>";
            var isGrouped = column.isGrouped();
            var isFiltered = column.hasActiveFilters();
            var isAggregated = hasGroupedCols && !isGrouped
                    && (column.getAggregate() != null);
            if (isGrouped || isFiltered || isAggregated) {
                name += " (";
                if (isGrouped) {
                    name += CQ.I18n.getMessage("grouped");
                } else if (isAggregated) {
                    name += CQ.I18n.getVarMessage(column.getAggregateDescription());
                }
                if (isFiltered) {
                    if (isGrouped || isAggregated) {
                        name +=", ";
                    }
                    name += CQ.I18n.getMessage("filtered");
                }
                name += ")";
            }
            // determine (Ext) renderer
            var fieldType = this.processor.getActualColumnType(column);
            var renderer = undefined;
            if (hasGroupedCols) {
                if (isGrouped) {
                    renderer = column.getTextRenderer();
                } else {
                    renderer = CQ.reports.Column.defaultTextRenderer;
                }
            } else {
                renderer = column.getTextRenderer();
            }
            if (fieldType == "list") {
                renderer = function(v) {
                        // todo find a better solution for this
                        var baseCls = "cq-reports-listaggregate";
                        var clsCollapsed = "cq-reports-listaggregate-collapsed";
                        var clsExpanded = "cq-reports-listaggregate-expanded";
                        var clickFn = "var el = CQ.Ext.get(this); "
                                + "if (el.hasClass('" + clsExpanded + "')) {"
                                + "el.removeClass('" + clsExpanded + "');"
                                + "el.addClass('" + clsCollapsed + "');"
                                + "} else {"
                                + "el.removeClass('" + clsCollapsed + "');"
                                + "el.addClass('" + clsExpanded + "');"
                                + "}";
                        return "<div class=\"" + baseCls + " " + clsCollapsed + "\" "
                                + "onclick=\"" + clickFn + "\">" + v + "</div>";
                    };
            }
            columnDefs.push({
                    "id": dataId,
                    "header": name,
                    "dataIndex": dataId,
                    "sortable": this.report.isEditMode,
                    "renderer": renderer
                });
        }
        return columnDefs;
    },

    /**
     * @private
     */
    createColumnModel: function(columnDefs, oldColModel) {
        // resort columns
        var c;
        var sortedColDefs = [ ];
        for (c = 0; c < columnDefs.length; c++) {
            var colIndex = (oldColModel != null ? oldColModel.translateColumn(c) : c);
            sortedColDefs.push(columnDefs[colIndex]);
        }
        // restore widths from old column model
        if (oldColModel) {
            var oldCols = oldColModel.columns;
            if (oldCols.length == sortedColDefs.length) {
                for (c = 0; c < oldCols.length; c++) {
                    if (oldCols[c]) {
                        sortedColDefs[c].width = oldCols[c].width;
                    }
                }
            }
        }
        return new CQ.reports.ui.ReportColumnModel({
                defaults: {
                        width: 120,
                        sortable: this.report.isEditMode
                    },
                columns: sortedColDefs,
                grid: this.grid
            });
    },

    // overrides CQ.reports.View#render
    render: function(parentEl, report) {
        this.report = report;
        this.columns = report.columns;
        this.processor = new CQ.reports.data.Processor(report);
        this.defaultStore = new CQ.reports.data.ReportingStore(this.processor, {
                "listeners": {
                        "preprocessed": this.reconfigureGrid,
                        "exception": this.handleError,
                        "scope": this
                    }
            });
        var defs = this.createColumnDefs();
        var view;
        if (this.report.isEditMode) {
            view = new CQ.reports.ui.ReportGridView(this.report, {
                    "forceFit": true,
                    "listeners": {
                            "beforecolcontextmenu": this.adjustMenu,
                            "oncolcontextmenuclicked": this.handleReportItemClicked,
                            "colremoverequested": this.removeColumn,
                            "colinsertrequested": this.insertColumn,
                            "colmoverequested": this.moveColumn,
                            "scope": this
                        }
                });
        } else {
            view = new CQ.reports.ui.ReportGridView(this.report, {
                    "forceFit": true
                });
        }
        this.pagingToolbar = new CQ.Ext.PagingToolbar({
                "pageSize": this.rowsPerPage,
                "store": this.defaultStore,
                "listeners": {
                        "change": function(tb, obj) {
                                if (obj) {
                                    if (obj.pages < obj.activePage) {
                                        tb.changePage(obj.pages);
                                    }
                                }
                            }
                    },
                "displayInfo": true,
                "displayMsg": 'Displaying rows {0} - {1} of {2}',
                "emptyMsg": "No rows to display",
                // overrides CQ.Ext.PagingToolbar#doRefresh
                "doRefresh": function() {
                        report.reload(true);
                    }
            });
        this.grid = new CQ.Ext.grid.GridPanel({
                "store": this.defaultStore,
                "colModel": this.createColumnModel(defs),
                "view": view,
                "sm": new CQ.Ext.grid.RowSelectionModel({
                        "singleSelect" :true
                    }),
                "width": "auto",
                "height": "auto",
                "frame": false,
                "loadMask": true,
                "border": false,
                "iconCls": "icon-grid",
                "cls": "cq-reports-gridview",
                "enableHdMenu": this.report.isEditMode,
                "enableColumnMove": this.report.isEditMode,
                "bbar": this.pagingToolbar
            });
        this.grid.render(parentEl);
        this.initializeEditables();
    },

    initializeEditables: function() {
        var editables = CQ.WCM.getEditables();
        var repPath = this.report.reportPath;
        for (var e in editables) {
            if (editables.hasOwnProperty(e)) {
                if (e.length > repPath.length) {
                    var subPath = e.substring(repPath.length);
                    var lastSepPos = subPath.lastIndexOf("/");
                    if (lastSepPos > 0) {
                        var columnPath = subPath.substring(lastSepPos);
                        if (columnPath != "/*") {
                            this.initializeEditable(editables[e]);
                        }
                    }
                }
            }
        }
    },

    initializeEditable: function(ed) {
        if (!ed["_rep_initialized"]) {
                ed["_rep_initialized"] = true;
                ed.on(CQ.wcm.EditBase.EVENT_AFTER_DELETE, function() {
                        var colRemoved = this.report.columns[this.colIndexToRemove];
                        if (colRemoved.isSorted()) {
                            this.report.fireSortingChanged(-1, null);
                        }
                        this.report.columns.splice(this.colIndexToRemove, 1);
                        var cm = this.grid.getColumnModel();
                        cm.notifyColumnRemoved(this.colIndexToRemove);
                        this.report.fireStructureChanged();
                    }, this);
        }
    },

    destroy: function(parentEl) {
        this.grid.destroy();
        this.grid = null;

    },

    // overrides CQ.reports.View#reload
    reload: function(isForced) {
        if (this.report.isServerInteractiveProcessing() || (isForced === true)) {
            // todo reimplement error handling
            // no sorting info - it will be automatically provided from the serverside
            this.defaultStore.setDefaultSort(null, null);
            var options = this.defaultStore.lastOptions;
            if (!options) {
                options = {
                        "params": {
                                "start": 0,
                                "limit": this.rowsPerPage
                            }
                    };
            } else {
                if (options.params) {
                    delete options.params.sort;
                    delete options.params.dir;
                }
            }
            this.defaultStore.load(options);
        } else {
            var sortedCols = this.report.createSortedColumns();
            if (sortedCols.length > 0) {
                var col = sortedCols[0].data;
                this.defaultStore.setDefaultSort(col.getDataId(),
                        col.getSortingDirection());
            }
            this.defaultStore.removeAllRecords();
            this.reconfigureGrid();
        }
    },

    notifyStructureChanged: function() {
        this.reload();
    },

    reconfigureGrid: function() {
        // adjust field types
        var defs = this.createColumnDefs();
        this.grid.reconfigure(this.defaultStore, this.createColumnModel(defs,
                this.grid.getColumnModel()));
    },

    adjustMenu: function(menu, col) {
        // note that this method is currently called twice due to some hack that calls
        // the show method of the menu twice to ensure the correct position of the menu
        var column = this.columns[col];
        var groupByItem = menu.items.get("groupBy");
        if (groupByItem) {
            groupByItem.setDisabled(!column.isGroupable());
            groupByItem.setChecked(column.isGrouped(), true);
        }
        var filtersItem = menu.items.get("filters");
        if (filtersItem) {
            filtersItem.setDisabled(!column.hasFilters() || column.isAggregated());
        }
        var aggregateItem = menu.items.get("aggregate");
        if (aggregateItem) {
            var gv = this.grid.getView();
            var aggregatesMenu = gv.aggregateMenu;
            aggregatesMenu.removeAll();
            var aggregates = column.getAvailableAggregates();
            if ((aggregates != null) && (aggregates.length == 0)) {
                aggregates = null;
            }
            aggregateItem.setDisabled(aggregates == null);
            if (aggregates != null) {
                var items = [ ];
                var aggregateCnt = aggregates.length;
                for (var a = 0; a < aggregateCnt; a++) {
                    var aggregate = aggregates[a];
                    var menuItem = new CQ.Ext.menu.CheckItem({
                            "itemId": aggregate.type,
                            "text": CQ.I18n.getVarMessage(aggregate.text),
                            "checked": (column.getAggregate() == aggregate.type),
                            "group": "aggregates",
                            "listeners": {
                                "checkchange": function(item, isChecked) {
                                    if (isChecked) {
                                        this.fireEvent("oncolcontextmenuclicked",
                                                "aggregate", this.hdCtxIndex, item.itemId);
                                    }
                                },
                                "scope": gv
                            }
                        });
                    items.push(menuItem);
                    aggregatesMenu.addItem(menuItem);
                }
            }
        }
        var genericPropsItem = menu.items.get("genericprops");
        if (genericPropsItem) {
            genericPropsItem.setDisabled(!column.isGeneric());
        }
    },

    handleReportItemClicked: function(id, col, value, alignPos) {
        switch (id) {
            case "groupBy":
                this.changeGrouping(col, value);
                break;
            case "filters":
                this.showFiltersForColumn(col, alignPos);
                break;
            case "aggregate":
                this.changeAggregate(col, value);
                break;
            case "genericprops":
                var column = this.columns[col];
                CQ.reports.utils.EditUtils.changeGenericProps(column, alignPos);
                break;
        }
    },

    changeGrouping: function(col, isGrouped) {
        // col is already translated here
        var column = this.columns[col];
        column.setGrouped(isGrouped === true);
    },

    changeAggregate: function(col, aggregate) {
        // col is already translated here
        var column = this.columns[col];
        column.setAggregate(aggregate);
    },

    notifyUpdateStart: function() {
        this.grid.loadMask.show();
    },

    notifyUpdateEnd: function() {
        this.grid.loadMask.hide();
    },

    showFiltersForColumn: function(col, alignPos) {
        // col is already translated here
        var column = this.columns[col];
        var filterDialog = column.filterDialog;
        if (!filterDialog) {
            var filters = column.getFilters();
            var contentItems = [ ];
            for (var f = 0; f < filters.length; f++) {
                var ui = filters[f].ui;
                if (ui) {
                    contentItems.push(filters[f].ui);
                }
            }
            filterDialog = this.createWindow(column, contentItems, this.applyFilters);
            column.filterDialog = filterDialog;
        }
        CQ.reports.utils.EditUtils.alignDialogToColHeader(filterDialog, alignPos, 260);
        filterDialog.show();
    },

    applyFilters: function(column) {
        column.applyFilters(true);
    },

    insertColumn: function(colToInsert, refColIndex, insertPos) {
        var cols = this.report.columns;
        var colCnt = cols.length;
        var refCol, refEditable;
        if (insertPos == "after") {
            if (refColIndex < (colCnt - 1)) {
                refColIndex++;
                refCol = cols[refColIndex];
            } else {
                refEditable = CQ.reports.utils.EditUtils.getNewColumnEditable();
            }
        } else {
            refCol = cols[refColIndex];
        }
        if (refCol || refEditable) {
            if (refCol && !refEditable) {
                var refPath = refCol.dataPath;
                refEditable = CQ.WCM.getEditable(refPath);
            }
            if (refEditable) {
                var parPath = refEditable.createParagraph(colToInsert);
                if (parPath) {
                    // remove column stub that was created by the paragraph's reload
                    // (component creates a "addColumn" statement; we'll have to handle that
                    // manually)
                    this.report.columns.length--;
                    var compPath = colToInsert.path;
                    var col = new CQ.reports.Column({
                            "dataPath": parPath,
                            "componentPath": compPath
                        });
                    if (refCol) {
                        this.report.insertColumn(col, refColIndex);
                    } else {
                        refColIndex = this.report.columns.length;
                        this.report.addColumn(col);
                    }
                    col.loadDef(new CQ.reports.utils.RequestSync({
                            onLoadFn: function() {
                                    var colInserted = this.report.columns[refColIndex];
                                    var cm = this.grid.getColumnModel();
                                    cm.notifyColumnInserted(refColIndex);
                                    this.initializeEditables();
                                    this.report.fireStructureChanged();
                                    if (colInserted.isGeneric()) {
                                        CQ.reports.utils.EditUtils.changeGenericProps(
                                                colInserted);
                                    }
                                }.createDelegate(this)
                        }));
                }
            }
        }
    },

    moveColumn: function(colIndexOld, colIndexNew) {
        var cols = this.report.columns;
        var colToMove = cols[colIndexOld];
        // consider that both column indexes point to the unmodified column list
        var insertColIndex = colIndexNew;
        if (insertColIndex > colIndexOld) {
            insertColIndex++;
        }
        // move paragraph seems to work the other way around than one might think; the
        // semantic is: Move a paragraph, specified by its path (= the column moved), before
        // myself (= the column that occupied the column's new position before)
        var srcEditable = CQ.WCM.getEditable(colToMove.dataPath);
        var destEditable;
        if (insertColIndex >= cols.length) {
            destEditable = CQ.reports.utils.EditUtils.getNewColumnEditable();
        } else {
            var destCol = cols[insertColIndex];
            destEditable = CQ.WCM.getEditable(destCol.dataPath);
        }
        var srcPath = colToMove.dataPath;
        var newPath = destEditable.moveParagraph(srcPath, srcEditable.params[
                "./sling:resourceType"]);
        if (newPath) {
            // remove column stub that was created by the paragraph's reload (component
            // creates a "addColumn" statement; we'll have to handle that manually)
            cols.length--;
            this.report.moveColumn(colIndexOld, colIndexNew);
            this.report.fireStructureChanged();
        } else {
            // Reload page if error occured (grid is invalid now)
            CQ.Util.reload();
        }
    },

    removeColumn: function(colIndexToRemove) {
        var colToRemove = this.report.columns[colIndexToRemove];
        var colPath = colToRemove.dataPath;
        if (colPath) {
            var compInstance = CQ.WCM.getEditable(colPath);
            this.colIndexToRemove = colIndexToRemove;
            compInstance.removeParagraph();
        }
    },


    // todo remove - will finally be implemented as "popup dialog", not as a (full-fledged) window
    createWindow: function(column, contentItems, applyFn) {
        applyFn = applyFn.createDelegate(this);
        return new CQ.Ext.Window({
                "filteredColumn": column,
                "renderTo": CQ.Util.ROOT_ID,
                "title": CQ.I18n.getMessage("Filter settings"),
                "width": 260,
                "height": 140,
                "modal": true,
                "layout": "fit",
                "stateful": false,
                "items": [ {
                            "xtype": "panel",
                            "layout": "fit",
                            "bodyStyle": "overflow: auto;",
                            "stateful": false,
                            "items": contentItems
                        }
                    ],
                "buttons": [ {
                            "itemId": "okButton",
                            "name": "okButton",
                            "text": CQ.I18n.getMessage("Apply"),
                            "handler": function() {
                                    var win = this.findParentByType(CQ.Ext.Window);
                                    win.hide();
                                    applyFn(win.filteredColumn);
                                },
                            "disabled": false
                        }, {
                            "itemId": "cancelButton",
                            "name": "cancelButton",
                            "text": CQ.I18n.getMessage("Cancel"),
                            "handler": function() {
                                    var win = this.findParentByType(CQ.Ext.Window);
                                    win.hide();
                                },
                            "disabled": false
                        }
                    ]
            });
    },

    handleError: function() {
        var response = arguments[4];
        var errorType = response.raw.error;
        switch (errorType) {
            case "oak_index_required":
                CQ.Ext.Msg.alert(
                        CQ.I18n.getMessage("Could not retrieve data"),
                        CQ.I18n.getMessage("Result set is too large to process. Please add an Oak index for this report as described in the documentation."));
                break;
            default:
                CQ.Ext.Msg.alert(
                        CQ.I18n.getMessage("Could not retrieve data"),
                        CQ.I18n.getMessage("An internal error has occurred."));
                break;
        }
    }

});


/**
 * Height of the insert element (in a currently empty report)
 * @type Number
 * @static
 * @private
 */
CQ.reports.views.GridView.INSERT_ELEMENT_HEIGHT = 80;

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a view that allows displaying two charts side by side.
 * @class CQ.reports.views.DualChartView
 * @extends CQ.reports.View
 */
CQ.reports.views.DualChartView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * The report the view is used by
     * @type CQ.reports.Report
     * @private
     */
    report: null,

    /**
     * Array containing the currently displayed charts
     * @type CQ.reports.ChartDefinition[]
     * @private
     */
    charts: null,

    /**
     * Array that contains the parent elements of the charts.
     * @type CQ.Ext.Element[]
     * @private
     */
    chartParents: null,


    render: function(parentEl, report) {
        this.report = report;
        this.charts = [ ];
        this.chartParents = [ ];
        var activeCharts = this.report.activeCharts;
        var chartCnt = activeCharts.length;
        if (chartCnt > 2) {
            chartCnt = 2;
        }
        for (var c = 0; c < chartCnt; c++) {
            this.charts.push(activeCharts[c]);
        }
        for (var p = 0; p < 2; p++) {
            this.chartParents.push(CQ.Ext.get(CQ.Ext.DomHelper.append(parentEl, {
                    "tag": "div",
                    "id": "chart-" + p,
                    "style": "position: absolute; top: 0px; left: 0px;"
                })));
        }
    },

    destroy: function(destEl) {
        var chartCnt = this.chartParents.length;
        for (var c = 0; c < chartCnt; c++) {
            this.chartParents[c].remove();
        }
        this.chartParents.length = 0;
        chartCnt = this.charts.length;
        for (c = 0; c < chartCnt; c++) {
            this.charts[c].chart.notifyRemoved();
        }
    },

    notifySizeChanged: function(w, h) {
        if (!this.chartParents) {
            return;
        }
        var chartCnt = this.chartParents.length;
        var chartWidth = Math.floor(w / chartCnt);
        var xPos = 0;
        for (var c = 0; c < chartCnt; c++) {
            this.chartParents[c].setLeftTop(xPos, 0);
            this.chartParents[c].setSize(chartWidth, h);
            if (this.charts.length > c) {
                this.charts[c].propagateResize(chartWidth, h);
            }
            xPos += chartWidth;
        }
    },

    notifyStructureChanged: function(colIndex, direction) {
        this.reload();
    },

    notifySortingChanged: function(colIndex, direction) {
        this.reload();
    },

    notifyFinished: function() {
        var chartCnt = this.charts.length;
        for (var c = 0; c < chartCnt; c++) {
            this.charts[c].propagateReportFinished();
        }
    },

    reload: function(isForced) {
        var chartCnt = this.charts.length;
        for (var c = 0; c < chartCnt; c++) {
            if (this.report.isServerInteractiveProcessing() || (isForced === true)) {
                this.charts[c].updateView(this.chartParents[c], this.report, true);
            } else {
                this.charts[c].clearView(this.chartParents[c], this.report);
            }
        }
    },

    repaint: function() {
        var chartCnt = this.charts.length;
        for (var c = 0; c < chartCnt; c++) {
            this.charts[c].updateView(this.chartParents[c], this.report, false);
        }
    },

    notifyUpdateStart: function() {
        // todo implement
    },

    notifyUpdateEnd: function() {
        // todo implement
    }

});
/*
 * Copyright 1997-2011 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a view that allows displaying a single chart.
 * @class CQ.reports.views.SingleChartView
 * @extends CQ.reports.View
 */
CQ.reports.views.SingleChartView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * The report the view is used by
     * @type CQ.reports.Report
     * @private
     */
    report: null,

    /**
     * Array containing the chart being displayed
     * @type CQ.reports.ChartDefinition
     * @private
     */
    chart: null,

    /**
     * The parent elements of the chart.
     * @type CQ.Ext.Element
     * @private
     */
    chartParent: null,


    constructor: function(config) {
        config = config || { };
        CQ.Ext.apply(this, config);
    },

    render: function(parentEl, report) {
        this.report = report;
        this.chart = null;
        var activeCharts = this.report.activeCharts;
        var chartCnt = activeCharts.length;
        for (var c = 0; c < chartCnt; c++) {
            var chart = activeCharts[c];
            if (chart.id == this.chartId) {
                this.chart = chart;
            }
        }
        this.chartParent = CQ.Ext.get(CQ.Ext.DomHelper.append(parentEl, {
                "tag": "div",
                "id": "chart",
                "style": "position: absolute; top: 0px; left: 0px;"
            }));
    },

    destroy: function(destEl) {
        this.chartParent.remove();
        this.chartParent = null;
        if (this.chart) {
            this.chart.chart.notifyRemoved();
        }
    },

    notifySizeChanged: function(w, h) {
        if (!this.chartParent) {
            return;
        }
        this.chartParent.setSize(w, h);
        if (this.chart) {
            this.chart.propagateResize(w, h);
        }
    },

    notifyStructureChanged: function(colIndex, direction) {
        this.reload();
    },

    notifySortingChanged: function(colIndex, direction) {
        this.reload();
    },

    notifyFinished: function() {
        if (this.chart) {
            this.chart.propagateReportFinished();
        }
    },

    reload: function(isForced) {
        if (this.chart) {
            if (this.report.isServerInteractiveProcessing() || (isForced === true)) {
                this.chart.updateView(this.chartParent, this.report, true);
            } else {
                this.chart.clearView(this.chartParent, this.report);
            }
        }
    },

    repaint: function() {
        if (this.chart) {
            this.chart.updateView(this.chartParent, this.report, false);
        }
    },

    notifyUpdateStart: function() {
        // todo implement
    },

    notifyUpdateEnd: function() {
        // todo implement
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a combined view, consisting of a {@link CQ.reports.views.GridView}
 * on top and a {@link CQ.reports.views.DualChartView} on bottom.
 * @class CQ.reports.view.CombinedView
 * @extends CQ.reports.View
 */
CQ.reports.views.CombinedView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    panel: null,

    /**
     * @private
     */
    gridView: null,

    /**
     * @private
     */
    chartView: null,


    constructor: function(config) {
        config = config || { };
        CQ.Ext.apply(this, config);
    },

    // overrides CQ.reports.View#render
    render: function(destEl, report, sizeHint) {
        this.report = report;
        this.gridView = new CQ.reports.views.GridView(this.subViewConfig
                && this.subViewConfig.grid);
        this.chartView = new CQ.reports.views.DualChartView(this.subViewConfig
                && this.subViewConfig.dualChart);
        var backRef = this;
        this.panel = new CQ.Ext.Panel({
                "layout": "border",
                "border": false,
                "width": sizeHint[0],
                "height": sizeHint[1],
                "items": [
                        {
                            "region": "center",
                            "xtype": "panel",
                            "layout": "fit",
                            "itemId": "grid",
                            "minSize": 20,
                            "margins": "1 1 1 1",
                            "header": false,
                            "listeners": {
                                    "resize": function(comp, w, h) {
                                        backRef.gridView.grid.setSize(w - 2, h);
                                    },
                                    "render": function() {
                                        backRef.gridView.render(this.body, backRef.report, true);
                                    }
                                }
                        }, {
                            "region": "south",
                            "layout": "fit",
                            "itemId": "chart",
                            "split": true,
                            "height": 220,
                            "minSize": 130,
                            "collapsible": true,
                            "collapseMode": "mini",
                            "collapsed": (report.columns.length == 0)
                                    || !report.hasActiveCharts(),
                            "margins": "1 1 1 1",
                            "header": false,
                            "listeners": {
                                    "resize": function(comp, w, h) {
                                        if (w && h) {
                                            backRef.chartView.notifySizeChanged(w, h);
                                        }
                                    },
                                    "render": function() {
                                        backRef.chartView.render(this.body, backRef.report,
                                                true);
                                    }
                                }
                        }
                    ]
            });
        this.panel.render(destEl);
    },

    destroy: function(parentEl) {
        this.gridView.destroy(parentEl);
        this.gridView = null;
        this.chartView.destroy(parentEl);
        this.chartView = null;
        this.panel.removeAll(true);
        this.panel.destroy();
        this.panel = null;
    },

    notifyStructureChanged: function(colIndex, direction) {
        this.gridView.notifyStructureChanged(colIndex, direction);
        this.chartView.notifyStructureChanged(colIndex, direction);
    },

    notifySortingChanged: function(colIndex, direction) {
        this.gridView.notifySortingChanged(colIndex, direction);
        this.chartView.notifySortingChanged(colIndex, direction);
    },

    notifyFinished: function() {
        this.gridView.notifyFinished();
        this.chartView.notifyFinished();
    },

    notifySizeChanged: function(w, h) {
        this.panel.setSize(w, h);
    },

    reload: function(isForced) {
        this.gridView.reload(isForced);
        this.chartView.reload(isForced);
    },

    repaint: function() {
        this.gridView.repaint();
        this.chartView.repaint();
    },

    notifyUpdateStart: function() {
        this.gridView.notifyUpdateStart();
        this.chartView.notifyUpdateStart();
    },

    notifyUpdateEnd: function() {
        this.gridView.notifyUpdateEnd();
        this.chartView.notifyUpdateEnd();
    }

});

/*
 * Copyright 1997-2011 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a configurable single child view.
 * @class CQ.reports.view.SingleView
 * @extends CQ.reports.View
 */
CQ.reports.views.SingleView = CQ.Ext.extend(CQ.reports.View, {

    /**
     * @private
     */
    report: null,

    /**
     * @private
     */
    panel: null,

    /**
     * @cfg {CQ.reports.View} view
     * The report to be displayed
     */
    view: null,


    constructor: function(config) {
        config = config || { };
        CQ.Ext.apply(this, config);
    },

    // overrides CQ.reports.View#render
    render: function(destEl, report, sizeHint) {
        this.report = report;
        var backRef = this;
        this.panel = new CQ.Ext.Panel({
                "layout": "border",
                "border": false,
                "width": sizeHint[0],
                "height": sizeHint[1],
                "items": [
                        {
                            "region": "center",
                            "xtype": "panel",
                            "layout": "fit",
                            "itemId": "grid",
                            "minSize": 20,
                            "margins": "1 1 1 1",
                            "header": false,
                            "listeners": {
                                    "resize": function(comp, w, h) {
                                        // todo clean up - use backRef.view.notifySizeChanged only
                                        if (backRef.view.grid) {
                                            backRef.view.grid.setSize(w - 2, h);
                                        } else {
                                            backRef.view.notifySizeChanged(w, h);
                                        }
                                    },
                                    "render": function() {
                                        backRef.view.render(this.body, backRef.report, true);
                                    }
                                }
                        }
                    ]
            });
        this.panel.render(destEl);
    },

    destroy: function(parentEl) {
        this.view.destroy(parentEl);
        this.view = null;
        this.panel.removeAll(true);
        this.panel.destroy();
        this.panel = null;
    },

    notifyStructureChanged: function(colIndex, direction) {
        this.view.notifyStructureChanged(colIndex, direction);
    },

    notifySortingChanged: function(colIndex, direction) {
        this.view.notifySortingChanged(colIndex, direction);
    },

    notifyFinished: function() {
        this.view.notifyFinished();
    },

    notifySizeChanged: function(w, h) {
        this.panel.setSize(w, h);
    },

    reload: function(isForced) {
        this.view.reload(isForced);
    },

    repaint: function() {
        this.view.repaint();
    },

    notifyUpdateStart: function() {
        this.view.notifyUpdateStart();
    },

    notifyUpdateEnd: function() {
        this.view.notifyUpdateEnd();
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class represents a color scheme to be used for a chart.
 */
CQ.reports.charts.ColorScheme = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * @private
     */
    colors: null,

    /**
     * Allowed values: "group4", "linear"
     * @private
     */
    sampleMode: null,

    /**
     * Determines how to handle the color of the "Others" value.
     * If a number is specified, the color defined at the corresponding position at the
     * basic color array is taken. If a String is specified, the string will be used as
     * the color to be used for the "others" value. If nothing is specified, normal color
     * sampling rules apply
     * @private
     * @type String|Number
     */
    othersMode: null,


    constructor: function(colors, sampleMode, othersMode) {
        this.colors = colors;
        this.sampleMode = sampleMode;
        this.othersMode = othersMode;
    },

    /**
     * Creates the actual color palette from the saved colors and further settings.
     * @param {Number} valueCnt The number of colors actually required for drawing the
     *        chart
     * @param {Boolean} hasOthers True if the chart contains a "other" value
     * @return {String[]} Array with colors (#rrggbb)
     */
    getColors: function(valueCnt, hasOthers) {
        var colors = [ ];
        var h = 0, r = 0;
        for (var c = 0; c < valueCnt; c++) {
            switch (this.sampleMode) {
                case "linear":
                    colors.push(this.colors[c % this.colors.length]);
                    break;
                case "group4":
                    colors.push(this.colors[h]);
                    h += 4;
                    if (h >= this.colors.length) {
                        r++;
                        if (r < 4) {
                            h = h - this.colors.length + 1;
                        } else {
                            h = 0;
                            r = 0;
                        }
                    }
                    break;
            }
        }
        if (hasOthers) {
            if (typeof(this.othersMode) == "number") {
                colors[valueCnt - 1] = this.colors[this.othersMode];
            } else if (typeof(this.othersMode) == "string") {
                colors[valueCnt - 1] = this.othersMode;
            }
        }
        return colors;
    }
});

/**
 * Field that defines some default color schemes
 * @static
 * @type Object
 */
CQ.reports.charts.ColorScheme.DEFAULT_SCHEMES = {

        "bgry-dark": new CQ.reports.charts.ColorScheme([
                "#6f7d93", "#8693a5", "#b0b8c4", "#d7d8e1",
                "#6a9a68", "#82aa81", "#adc8ac", "#d6e1d5",
                "#ab5c58", "#b97672", "#d0a4a3", "#e6d1d1",
                "#ae8f53", "#bc9f6e", "#d3c1a1", "#e8dfdc"
            ], "group4", 15),

        "bgry-bright": new CQ.reports.charts.ColorScheme([
                "#6aa3ec", "#83b2f0", "#adccf5", "#d6e6fa",
                "#ec6a6f", "#f08387", "#f5adaf", "#fad6d8",
                "#6fd07d", "#84d690", "#a8deb0", "#cae5ce",
                "#d8c267", "#dcc87d", "#e2d7a3", "#e8e2c9"
            ], "group4", 15)

    };
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class provides means to manage snapshot series as provided from the server.
 * @class CQ.reports.charts.SnapshotSeries
 * @constructor
 * Creates a new snapshot series from the specified server data
 * @param data The data as provided by the server
 */
CQ.reports.charts.SnapshotSeries = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * Type information
     * @private
     */
    typeInfo: null,

    /**
     * Base date
     * @private
     */
    datesBase: null,

    /**
     * Array containing the timestamp of each snapshot available
     * @private
     */
    dates: null,

    /**
     * Data to be displayed
     * @private
     */
    data: null,

    /**
     * Totals
     * @private
     */
    totals: null,

    /**
     * Helper for creating a proper scale
     * @private
     */
    lastDayGenerated: null,

    /**
     * Maximum number of series to be displayed
     * @private
     */
    maxSeries: 0,


    constructor: function(data, scale, useTotals, maxSeries) {
        this.typeInfo = data.typeInfo;
        this.dates = data.dates;
        this.scale = scale;
        this.maxSeries = maxSeries || 9;
        this.data = null;
        this.totals = null;
        var dataKey = null;
        if (this.typeInfo.data && CQ.Ext.isArray(this.typeInfo.data)) {
            if (this.typeInfo.data.length > 0) {
                dataKey = this.typeInfo.data[0].name;
            }
        }
        if (dataKey != null) {
            this.data = data[dataKey];
            this.totals = ((useTotals && data.totals) ? data.totals[dataKey] : null);
        }
        if (this.totals != null) {
            this.maxSeries--;
        }
        // calc date diffs
        this.datesBase = scale.start.tc;
        this.timeScaleDelta = scale.end.tc - this.datesBase;
        var snapshotCnt = this.dates.length;
        for (var s = 0; s < snapshotCnt; s++) {
            this.dates[s].delta = this.dates[s].tc - this.datesBase;
        }
    },

    hasData: function() {
        return (this.data != null) && this.dates;
    },

    hasTotals: function() {
        return (this.totals != null);
    },

    getSeriesCnt: function() {
        return this.data.length;
    },

    getSeriesAt: function(seriesNo) {
        if ((seriesNo < 0) || (seriesNo >= this.data.length)) {
            return null;
        }
        return this.data[seriesNo];
    },

    createXValuesForRaphael: function(seriesNo) {
        var s;
        var values = [ ];
        if (seriesNo == undefined) {
            var seriesCnt = Math.min(this.data.length, this.maxSeries);
            for (s = (this.totals != null ? -1 : 0); s < seriesCnt; s++) {
                var x = this.createXValuesForRaphael(s);
                values.push(x);
            }
            return values;
        }
        var data;
        if (seriesNo >= 0) {
            var series = this.getSeriesAt(seriesNo);
            if (series == null) {
                return values;
            }
            data = series.data;
        } else {
            data = this.totals;
        }
        if (data == null) {
            return values;
        }
        var snapshotCnt = data.length;
        for (s = 0; s < snapshotCnt; s++) {
            if (data[s] != null) {
                values.push(this.dates[s].delta);
            } else {
                if (s < (snapshotCnt - 1)) {
                    if (data[s + 1] != null) {
                        values.push(this.dates[s].delta);
                    }
                }
            }
        }
        return values;

    },

    createYValuesForRaphael: function(seriesNo) {
        var s;
        var values = [ ];
        if (seriesNo == undefined) {
            var seriesCnt = Math.min(this.data.length, this.maxSeries);
            for (s = (this.totals != null ? -1 : 0); s < seriesCnt; s++) {
                var y = this.createYValuesForRaphael(s);
                values.push(y);
            }
            return values;
        }
        var data;
        if (seriesNo >= 0) {
            var series = this.getSeriesAt(seriesNo);
            if (series == null) {
                return values;
            }
            data = series.data;
        } else {
            data = this.totals;
        }
        if (data == null) {
            return values;
        }
        var snapshotCnt = data.length;
        for (s = 0; s < snapshotCnt; s++) {
            if (data[s] != null) {
                values.push(data[s]);
            } else {
                if (s < (snapshotCnt - 1)) {
                    if (data[s + 1] != null) {
                        values.push(0);
                    }
                }
            }
        }
        return values;
    },

    getExtremeY: function(fn, seriesNo) {
        var s;
        var extreme = null;
        if (seriesNo == undefined) {
            var seriesCnt = Math.min(this.data.length, this.maxSeries);
            for (s = (this.totals != null ? -1 : 0); s < seriesCnt; s++) {
                var extremeSeries = this.getExtremeY(fn, s);
                if (extreme == null) {
                    extreme = extremeSeries;
                } else {
                    extreme = fn(extremeSeries, extreme);
                }
            }
            return extreme;
        }

        var data;
        if (seriesNo >= 0) {
            var series = this.getSeriesAt(seriesNo);
            if (series == null) {
                return 0;
            }
            data = series.data;
        } else {
            data = this.totals;
        }
        if (data == null) {
            return 0;
        }
        var snapshotCnt = data.length;
        for (s = 0; s < snapshotCnt; s++) {
            if (data[s] != null) {
                if (extreme == null) {
                    extreme = data[s];
                } else {
                    extreme = fn(extreme, data[s]);
                }
            } else {
                if (s < (snapshotCnt - 1)) {
                    if (data[s + 1] != null) {
                        extreme = 0;
                    }
                }
            }
        }
        return extreme;
    },

    getMaxY: function(seriesNo) {
        return this.getExtremeY(Math.max, seriesNo);
    },

    getMinY: function(seriesNo) {
        return this.getExtremeY(Math.min, seriesNo);
    },

    getMaxDate: function() {
        return this.scale.end.tc - this.datesBase;
    },

    getSeriesName: function(seriesNo) {
        if (seriesNo == undefined) {
            var names = [ ];
            if (this.totals != null) {
                names.push(CQ.I18n.getMessage("Total"));
            }
            var seriesCnt = Math.min(this.data.length, this.maxSeries);
            for (var s = 0; s < seriesCnt; s++) {
                names.push(this.getSeriesName(s));
            }
            return names;
        }
        var series = this.getSeriesAt(seriesNo);
        if (series == null) {
            return "???";
        }
        var name = "";
        var groupCnt = series.groupValues.length;
        for (var g = 0; g < groupCnt; g++) {
            if (g > 0) {
                name += ", ";
            }
            var part = series.groupValues[g];
            if (part != null) {
                if ((typeof(part) == "object") && part.display) {
                    part = part.display;
                }
                name += part;
            }
        }
        return name;
    },

    /**
     * Creates all necessary data for creating the time scale.
     */
    createTimeScale: function() {
        var scale = [ ];
        if (this.scale && this.scale.def) {
            var segCnt = this.scale.def.length;
            for (var s = 0; s < segCnt; s++) {
                var def = this.scale.def[s];
                var offs = def.tc - this.datesBase;
                scale.push({
                        "offs": offs,
                        "display": def.display
                    });
            }
        }
        return scale;
    },

    /**
     * Gets the maximum number of value any series contains.
     * @return {Number} The maximum number of value any series contains
     */
    getMaxValuesPerSeries: function() {
        var valueCnt = 0;
        var seriesCnt = Math.min(this.data.length, this.maxSeries);
        for (var s = (this.totals != null ? -1 : 0); s < seriesCnt; s++) {
            var series = (s >= 0 ? this.getSeriesAt(s).data : this.totals);
            if (series.length > valueCnt) {
                valueCnt = series.length;
            }
        }
        return valueCnt;
    },

    /**
     * Calculates the actual (horizontal) position for the specified segment.
     * @param {Object} seg The segment
     * @param {Number} scaleWidth Actual width of the scale (in pixels)
     * @return {Number} Actual position of the segment (in pixels)
     */
    calcRealSegPos: function(seg, scaleWidth) {
        var offs = seg.offs;
        return Math.round((offs * scaleWidth) / this.timeScaleDelta);
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class represents the data of a (non-historic) chart.
 */
CQ.reports.charts.ChartData = CQ.Ext.extend(CQ.Ext.emptyFn, {

    values: null,

    groupNames: null,

    /**
     * Creates a new chart data object from the specified result.
     * @param result
     */
    constructor: function(result) {
        if (result.grouped) {
            var data = result.data;
            this.values = data.values;
            this.othersValue = data.othersValue;
            this.groupNames = [ ];
            var dataTypes = result.dataTypes;
            var valueCnt = this.values.length;
            var groupCnt = data.groupingOrder.length;
            for (var v = 0; v < valueCnt; v++) {
                var groupName = "";
                for (var g = 0; g < groupCnt; g++) {
                    var colName = data.groupingOrder[g];
                    var groupValue = data.grouped[colName][v];
                    if (groupValue) {
                        // special conversion, where needed
                        var type = dataTypes[colName];
                        switch (type) {
                            case "date":
                                if (groupValue && (groupValue != "")) {
                                    groupValue = new Date(groupValue);
                                } else {
                                    groupValue = "";
                                }
                                break;
                            case "custom":
                                if ((typeof(groupValue) == "object")
                                        && (groupValue.display != null)) {
                                    groupValue = groupValue.display;
                                } else {
                                    groupValue = "???";
                                }
                                break;
                        }
                    } else {
                        groupValue = "";
                    }
                    if (groupName.length > 0) {
                        groupName += ", ";
                    }
                    groupName += groupValue;
                }
                this.groupNames.push(groupName);
            }
        } else {
            this.values = null;
            this.othersValue = null;
            this.groupNames = null;
        }
    },

    /**
     * Checks if there is currently a valid dataset available for charting.
     * @return {Boolean} True if there is data available
     */
    hasData: function() {
        return (this.values != null);
    },

    /**
     * Checks if there is currently chartable data available.
     * @return {Boolean} True if chartable data is available
     */
    hasChartableData: function() {
        return (this.values != null) && (this.values.length > 0);
    },

    /**
     * Gets the group names.
     * @return {String[]} The group names
     */
    getGroupNames: function() {
        return this.groupNames;
    },

    /**
     * Gets the values to be charted.
     * @return {Number[]} Array of values to be charted
     */
    getValues: function() {
        // must be copied, as Raphael changes the array
        var copied = [ ];
        var dataCnt = this.values.length;
        for (var d = 0; d < dataCnt; d++) {
            copied.push(this.values[d]);
        }
        return copied;
    },

    /**
     * Gets the "others" value.
     * @return {Number} The others value
     */
    getOthersValue: function() {
        return this.othersValue;
    },

    /**
     * Determines if there is an "other" value available.
     * @return {Boolean} True if an "other" value is available
     */
    hasOthersValue: function() {
        return (this.othersValue != null);
    },

    /**
     * Gets the total number of values (incl. an "others" value if required) to be displayed
     * in the chart.
     * @return {Number} The total number of values
     */
    getChartValueCnt: function() {
        var valCnt = this.values.length;
        if (this.othersValue != null) {
            valCnt++;
        }
        return valCnt;
    },

    /**
     * Creates the legend entries for the chart.
     */
    createLegendEntries: function() {
        var legend = [ ];
        var groupCnt = this.groupNames.length;
        for (var g = 0; g < groupCnt; g++) {
            var name = this.groupNames[g];
            if (name.length == 0) {
                name = String.fromCharCode(160);
            }
            legend.push(name);
        }
        if (this.othersValue != null) {
            legend.push(CQ.I18n.getMessage("Others"));
        }
        return legend;
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * "Abstract" class for all Raphael-based chart implementations. Provides workarounds
 * and utils for handling charts using the Raphael library.
 * @class CQ.reports.charts.RaphaelChart
 */
CQ.reports.charts.RaphaelChart = CQ.Ext.extend(CQ.reports.Chart, {

    /**
     * The DIV used for a workaround for rendering charts in an invisible state
     * @type HTMLElement
     * @private
     */
    helperDiv: null,

    /**
     * The parent element of the chart
     * @type HTMLElement
     * @private
     */
    parentDom: null,

    /**
     * The canvas to be used for drawing the chart
     * @type Raphael
     * @private
     */
    chartCanvas: null,

    /**
     * Color scheme used by the chart
     * @type CQ.reports.charts.ColorScheme
     * @private
     */
    colorScheme: null,

    /**
     * Current width of the chart (incl. title and legend)
     * @type Number
     * @private
     */
    width: 320,

    /**
     * Current height of the chart (incl. title and legend)
     * @type Number
     * @private
     */
    height: 200,

    /**
     * The height that is actually available for drawing the chart
     * @type Number
     * @private
     */
    availableHeight: null,

    /**
     * Padding to be used; default value is 8
     * @type Number
     * @private
     */
    padding: 14,

    /**
     * The title of the diagram
     * @type String
     * @private
     */
    title: null,

    /**
     * The vertical offset for drawing the chart
     * @type Number
     * @private
     */
    yOffs: 0,

    /**
     * The current state of the chart
     * @param title
     */
    rendered: false,

    /**
     * current layout of the chart ("vertical", "horizontal", "limited")
     */
    layout: null,

    /**
     * Attributes to be used for plain text output (for example, "no chartable data
     * available", etc.
     */
    txtAttribs: {
            "font-family": "Tahoma, Arial, sans-serif",
            "font-size": "12px"
        },

    /**
     * Attributes to be used for drawing the title
     */
    titleAttribs: {
            "font-family": "Tahoma, Arial, sans-serif",
            "font-size": "12px",
            "font-weight": 800,
            "text-anchor": "start"
        },

    /**
     * Vertical text offset (workaround for IE issue)
     */
    vertTextOffs: (CQ.Ext.isIE ? 3 : 0),


    constructor: function(chartDef, report, title) {
        CQ.reports.charts.RaphaelChart.superclass.constructor.call(this, chartDef, report);
        this.colorScheme = CQ.reports.charts.ColorScheme.DEFAULT_SCHEMES["bgry-bright"];
        this.title = title;
    },

    // overrides CQ.reports.Chart#render
    render: function(parentEl, initialSize) {
        this.parentDom = parentEl.dom;
        // Configure chart
        this.setConfigProp(this.chartDef, "padding");
        this.adjustToChartDef();
        // Initialize chart sizing
        if (initialSize) {
            this.width = initialSize[0];
            this.height = initialSize[1];
        }
        this.calcTitle();
        this.layout = this.chartDef.calculateActualLayout(this.width, this.availableHeight);
        this.calcSizeDependant(this.width, this.availableHeight);
        this.chartCanvas = CQ.Raphael(this.parentDom, this.width, this.height);
        // handle several chart-related config stuff
        if (this.chartDef.colors) {
            if (typeof(this.chartDef.colors) == "string") {
                this.colorScheme =
                        CQ.reports.charts.ColorScheme.DEFAULT_SCHEMES[this.chartDef.colors];
            } else {
                this.colorScheme = new CQ.reports.charts.ColorScheme(this.chartDef.colors);
            }
        }
        this.rendered = true;
    },

    /**
     * @private
     */
    calcTitle: function() {
        this.yOffs = (this.title != null ? 20 : 0);
        this.availableHeight = this.height - this.yOffs;
    },

    // overrides CQ.reports.Chart#notifyResize
    notifyResize: function(w, h) {
        this.width = w;
        this.height = h;
        this.calcTitle();
        if (this.chartCanvas) {
            this.chartCanvas.setSize(w, h);
        }
        this.layout = this.chartDef.calculateActualLayout(w, this.availableHeight);
        this.calcSizeDependant(w, this.availableHeight);
        this.update(false);
    },

    isRendered: function() {
        return this.rendered;
    },

    notifyRemoved: function() {
        this.rendered = false;
    },

    /**
     * <p>This method is called to allow the implementing chart to adjust itself to the
     * specified chart definition.</p>
     * <p>This method is only called once when the chart is getting rendered.</p>
     */
    adjustToChartDef: function() {
        // may be overridden by implementing chart class
    },

    /**
     * <p>This method is called to allow the implementing chart to adapt specific member
     * properties to the specified new size.</p>
     * <p>The view must not be updated in calcSizeDependant!</p>
     * @param {Number} w The new width
     * @param {Number} h The new height
     */
    calcSizeDependant: function(w, h) {
        // may be overridden by implementing chart class
    },

    /**
     * Creates a legend from the group names specified in the chart definition. May be
     * overridden by specific charts/chart types.
     * @return {Object} The legend definition
     */
    createLegend: function() {
        // may be overridden by implementing charts
        return null;
    },

    /**
     * Creates common chart options.
     * @param {Number} width The available width for the chart
     * @param {Number} height The available height for the chart
     * @return {Object} The chart options (as used by Raphael)
     */
    createChartOptions: function(width, height) {
        var yOffs = 0;
        if (CQ.Ext.isGecko) {
            // workaround for Gecko-related bug that has different text positioning if the
            // chart is rendered to an invisible (display: none) chart than to a "normal"
            // chart
            var isVisible = true;
            var domToCheck = this.parentDom;
            while (domToCheck && (domToCheck != document.body)) {
                if (domToCheck.style.display == "none") {
                    isVisible = false;
                    break;
                }
                domToCheck = domToCheck.parentNode;
            }
            if (!isVisible) {
                yOffs = 4;
            }
        }
        var opts = {
                "legendYOffs": yOffs
            };
        this.addSpecificChartOptions(opts, width, height);
        this.chartCanvas.g.txtattr = this.txtAttribs;
        return opts;
    },

    /**
     * Adds type-specific chart options to the specified options object
     * @param {Object} opt The options object (may be modified)
     * @param {Number} width The available width for the chart
     * @param {Number} height The available height for the chart
     */
    addSpecificChartOptions: function(opt, width, height) {
        // may be overridden by implementing chart types
    },

    /**
     * @private
     */
    setConfigProp: function(config, propName, defaultValue, destProp) {
        destProp = (destProp ? destProp : propName);
        if (config.hasOwnProperty(propName)) {
            this[destProp] = config[propName];
        } else if (defaultValue != null) {
            this[destProp] = defaultValue;
        }
    },

    /**
     * Draws the chart title.
     */
    drawChartTitle: function() {
        if (this.title != null) {
            this.chartCanvas.text(this.padding, 16 + this.vertTextOffs,
                    CQ.I18n.getVarMessage(this.title)).attr(this.titleAttribs);
        }
    },

    /**
     * Draws an info text if no chartable data is available.
     */
    handleNoData: function() {
        this.chartCanvas.text(Math.round(this.width / 2), Math.round(this.height / 2),
                CQ.I18n.getMessage("No suitable data available.")).attr(this.txtAttribs);
    },

    /**
     * Draws an info text if an error has occured.
     */
    handleLoadFailure: function() {
        this.chartCanvas.text(Math.round(this.width / 2), Math.round(this.height / 2),
                CQ.I18n.getMessage("Could not load data.")).attr(this.txtAttribs);
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class represents a "simple" (= non-historic) chart, based on Raphael.
 * @class CQ.reports.charts.SimpleChart
 * @extends CQ.reports.charts.RaphaelChart
 */
CQ.reports.charts.SimpleChart = CQ.Ext.extend(CQ.reports.charts.RaphaelChart, {

    /**
     * @type CQ.reports.charts.ChartData
     */
    data: null,

    constructor: function(chartDef, report, title) {
        CQ.reports.charts.SimpleChart.superclass.constructor.call(this, chartDef, report,
                title);
    },

    // overrides CQ.reports.Chart#update
    update: function(invalidateData) {
        if (invalidateData) {
            this.data = null;
            this.hasData = false;
            this.isLoadError = false;
        }
        this.chartCanvas.clear();
        if (this.hasData) {
            this.drawChartBase();
        } else if (!this.isLoadError) {
            this.loadChartData();
        } else {
            this.drawChartBase();
        }
    },

    // overrides CQ.reports.Chart#clear
    clear: function() {
        this.data = null;
        this.hasData = false;
        this.isLoadError = false;
        this.chartCanvas.clear();
        this.chartCanvas.text(Math.round(this.width / 2), Math.round(this.height / 2),
                CQ.I18n.getMessage("Please refresh data to get a chart."))
                .attr(this.txtAttribs);
    },

    /**
     * Loads chart data from the server.
     */
    loadChartData: function() {
        var url = this.report.getChartDataUrl();
        var prms = "";
        if (this.chartDef) {
            if (this.chartDef.valueLimit) {
                if (prms.length == 0) {
                    prms += "?";
                } else {
                    prms += "&";
                }
                prms += "limit=" + this.chartDef.valueLimit;
            }
        }
        if (prms.length > 0) {
            url += prms;
        }
        CQ.HTTP.get(url, function(options, success, response) {
                if (success) {
                    var chartData = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                            response.responseText));
                    if (chartData.success) {
                        this.onLoadSuccess(chartData);
                    } else {
                        this.onLoadFailure();
                    }
                } else {
                    this.onLoadFailure();
                }
            }, this);
    },

    /**
     * @private
     */
    onLoadSuccess: function(result) {
        this.title = CQ.I18n.getMessage("Current data");
        if (result != null) {
            this.data = new CQ.reports.charts.ChartData(result);
        } else {
            this.data = null;
        }
        this.hasData = (this.data != null) && this.data.hasChartableData();
        this.isLoadError = false;
        this.drawChartBase();
    },

    /**
     * @private
     */
    onLoadFailure: function() {
        this.series = null;
        this.title = CQ.I18n.getMessage("Current data");
        this.description = null;
        this.hasData = false;
        this.isLoadError = true;
        this.drawChartBase();
    },

    /**
     * Common wrapper for drawChart.
     * @private
     */
    drawChartBase: function() {
        this.chartCanvas.clear();
        this.drawChartTitle();
        if (this.hasData) {
            this.drawChart();
        } else {
            if (!this.isLoadError) {
                this.handleNoData();
            } else {
                this.handleLoadFailure();
            }
        }
    },

    // overrides CQ.reports.chart.RaphaelChart#createLegend
    createLegend: function() {
        return this.data.createLegendEntries();
    },

    // overrides CQ.reports.chart.RaphaelChart#addSpecificChartOptions
    addSpecificChartOptions: function(opts, width, height) {
        CQ.reports.charts.SimpleChart.superclass.addSpecificChartOptions.call(this, opts,
                width, height);
        var valLimit = this.data.getChartValueCnt();
        opts.colors = this.colorScheme.getColors(valLimit, this.data.hasOthersValue());
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This is the base class for all charts that display series of ("over time") data (and that
 * are based on Raphael).
 * @class CQ.reports.SeriesBasedChart
 * @extends CQ.reports.charts.RaphaelChart
 */
CQ.reports.charts.SeriesBasedChart = CQ.Ext.extend(CQ.reports.charts.RaphaelChart, {

    /**
     * Flag that determines if data is available.
     * @private
     * @type Boolean
     */
    hasData: false,

    /**
     * Flag that determines if loading data has failed before (to avoid subsequent load
     * trials)
     * @private
     * @type Boolean
     */
    isLoadError: false,

    /**
     * The data series.
     * @private
     * @type CQ.reports.charts.SnapshotSeries
     */
    series: null,

    /**
     * Array containing legend labels if the chart has a legend created using
     * {@link #createSeriesLegend}
     * @private
     * @type Array
     */
    gLabels: null,

    /**
     * Number of series to display; defaults to 9
     * @private
     * @type Number
     */
    seriesCnt: 0,

    /**
     * The panel to be used for configuring the period of time to be displayed
     * @type CQ.Ext.Panel
     * @private
     */
    configPanel: null,

    /**
     * The element that holds the config panel
     * @type CQ.Ext.Element
     * @private
     */
    configPanelEl: null,

    /**
     * The padding (right margin) to be used for the config panel
     * @type Number
     * @private
     */
    configPanelPadding: 10,

    /**
     * Attributes to be used for drawing the popup
     * @private
     */
    popupAttribs: {
            "font-family": "Tahoma, Arial, sans-serif",
            "font-size": "12px",
            "text-anchor": "start",
            "fill": "#fff"
        },

    /**
     * The maximum number of values to be hovered
     * @type Number
     * @private
     */
    hoverLimit: 0,

    /**
     * The chart's current configuration
     * @private
     */
    chartConfig: null,

    constructor: function(chartDef, report) {
        CQ.reports.charts.SeriesBasedChart.superclass.constructor.call(this, chartDef,
                report, CQ.I18n.getMessage("Historic data"));
        var now = new Date();
        var from = now.add(Date.MONTH, -1).add(Date.DAY, 1);
        this.chartConfig = {
                "from": this.createDateStamp(from),
                "to": this.createDateStamp(now),
                "aggregation": "day"
            };
    },

    // overrides CQ.reports.RaphaelChart#render
    render: function(parentEl, initialSize) {
        CQ.reports.charts.SeriesBasedChart.superclass.render.call(this, parentEl,
                initialSize);
        this.configPanelEl = CQ.Ext.get(CQ.Ext.DomHelper.append(parentEl, {
                "tag": "div",
                "style": "position: absolute; top: 0; left: 0; visibility: hidden;"
            }));
        var now = new Date();
        var fdow = this.report.getFirstDayOfWeek() - 1;
        this.isNarrowVersion = (initialSize[0] < 450);
        // automatic width determination fails on IE, hence provoiding explicit widths for
        // each component
        var items = [ ];
        if (!this.isNarrowVersion) {
            items.push({
                    "xtype": "static",
                    "text": CQ.I18n.getMessage("Period"),
                    "cls": "cq-reports-chart-daterange",
                    "width": 40
                });
        }
        items.push({
                "xtype": "datefield",
                "itemId": "from",
                "id": "from",
                "width": 96,
                "maxValue": now,
                "vtype": "daterange",
                "endDateField": "to",
                "startDay": fdow
            }, {
                "xtype": "datefield",
                "itemId": "to",
                "id": "to",
                "width": 96,
                "maxValue": now,
                "vtype": "daterange",
                "startDateField": "from",
                "startDay": fdow
            });
        if (!this.isNarrowVersion) {
            items.push({
                    "xtype": "static",
                    "text": CQ.I18n.getMessage("Interval"),
                    "cls": "cq-reports-chart-daterange",
                    "width": 60
                });
        }
        items.push({
                "xtype": "selection",
                "type": "select",
                "itemId": "agginterval",
                "width": 72,
                "options": [ {
                            "value": "month",
                            "text": CQ.I18n.getMessage("Month")
                        }, {
                            "value": "week",
                            "text": CQ.I18n.getMessage("Week")
                        }, {
                            "value": "day",
                            "text": CQ.I18n.getMessage("Day")
                        }, {
                            "value": "hour",
                            "text": CQ.I18n.getMessage("Hour")
                        }
                    ]
            });
        if (!this.isNarrowVersion) {
            items.push({
                    "xtype": "static",
                    "html": "&nbsp;",
                    "width": 10
                });
        }
        items.push({
                "xtype": "button",
                "text": CQ.I18n.getMessage("Go"),
                "width": 30,
                "handler": function() {
                        var items = this.configPanel.items;
                        this.chartConfig.from = this.createDateStamp(
                            items.get("from").getValue());
                        this.chartConfig.to = this.createDateStamp(
                            items.get("to").getValue());
                        this.chartConfig.aggregation = items.get("agginterval")
                            .getValue();
                        this.invalidateSeries();
                        this.update();
                    }.createDelegate(this)
            });
        var totalWidth = 0;
        var itemCnt = items.length;
        for (var i = 0; i < itemCnt; i++) {
            if (items[i].width) {
                totalWidth += items[i].width;
            }
        }
        this.configPanel = new CQ.Ext.Panel({
                "layout": "column",
                "border": false,
                "width": totalWidth,
                "items": items
            });
        this.configPanel.render(this.configPanelEl);
        this.adjustConfigPanelSize(initialSize[0]);
        this.configPanelEl.setVisible(true);
        this.adjustToChartConfig();
    },

    /**
     * Gets a suitable datestamp for the specified date.
     * @param {Date} date The date
     * @return {String} The date stamp (yyyymmdd)
     */
    createDateStamp: function(date) {
        return String(date.getFullYear() * 10000
                + (date.getMonth() + 1) * 100
                + date.getDate());
    },

    /**
     * Gets a suitable Date object for the specified date stamp.
     * @param {String} dateStamp The date stamp
     * @return {Date} The date
     */
    createDate: function(dateStamp) {
        if (typeof(dateStamp) != "string") {
            dateStamp = String(dateStamp);
        }
        var year = parseInt(dateStamp.substring(0, 4), 10);
        var month = parseInt(dateStamp.substring(4, 6), 10) - 1;
        var day = parseInt(dateStamp.substring(6, 8), 10);
        return new Date(year, month, day);
    },

    /**
     * Draws the chart.
     */
    drawChart: function() {
        // must be overridden by specific chart implementation
    },

    /**
     * Common wrapper for drawChart.
     * @private
     */
    drawChartBase: function() {
        this.chartCanvas.clear();
        this.drawChartTitle();
        if (this.hasData && (this.series != null)) {
            if (this.series.hasData()) {
                try {
                    this.drawChart();
                } catch (e) {
                    CQ.Log.error(e);
                }
            } else {
                this.handleNoData();
            }
        } else {
            if (!this.isLoadError) {
                this.handleNoData();
            } else {
                this.handleLoadFailure();
            }
        }
    },

    createSnapshotUI: function(parentEl) {
        this.removeSnapshotUI();
        this.snapshotPanel = new CQ.reports.ui.SnapshotEnabler(this.report, this.height,
                this.padding);
        this.snapshotPanel.on("selected", function() {
                this.update();
            }, this);
        this.snapshotPanel.render(parentEl);
    },

    removeSnapshotUI: function() {
        if (this.snapshotPanel != null) {
            this.snapshotPanel.removeAll(true);
            this.snapshotPanel.destroy();
            this.snapshotPanel = null;
        }
    },

    handleNoData: function() {
        var msgText;
        if ((this.series == null) && !this.report.isSnapshotActive()) {
            var parentEl = CQ.Ext.get(this.parentDom);
            this.createSnapshotUI(parentEl);
            this.configPanel.hide();
        } else {
            this.removeSnapshotUI();
            this.configPanel.show();
            msgText = CQ.I18n.getMessage("No data available for the selected period of time.");
            this.chartCanvas.text(Math.round(this.width / 2), Math.round(this.height / 2),
                    msgText).attr(this.txtAttribs);
        }
    },

    handleLoadFailure: function() {
        this.chartCanvas.text(Math.round(this.width / 2), Math.round(this.height / 2),
                CQ.I18n.getMessage("Could not load snapshots.")).attr(this.txtAttribs);
    },

    createSeriesLegend: function(x, y, resolver, opts, enterFn, leaveFn, isTopAligned) {
        if (this.series != null) {
            var labels = this.series.getSeriesName();
            var h = y + 10 + this.yOffs;
            var ch = 0;
            var txt;
            var lineHeight = opts.lineHeight || 16;
            var mark = opts.mark || "disc";
            this.gLabels = this.chartCanvas.set();
            var covers = this.chartCanvas.set();
            for (var i = 0; i < labels.length; i++) {
                var group = this.chartCanvas.set();
                this.gLabels.push(group);
                group.push(this.chartCanvas.g[mark](x + 5, h, 5).attr(resolver(i)));
                group.push(
                        txt = this.chartCanvas.text(x + 20, h  + opts.legendYOffs,
                                labels[i])
                        .attr(this.chartCanvas.g.txtattr)
                        .attr({fill: "#000", "text-anchor": "start"}));
                var tlh = lineHeight || ((txt.getBBox() || 12) * 1.2);
                var bounds = group.getBBox();
                var lblCover = this.chartCanvas.rect(bounds.x, bounds.y, bounds.width,
                        bounds.height);
                lblCover.attr({
                        "fill": "#ffffff",
                        "opacity": 0.0,
                        "stroke-width": 0
                    });
                lblCover.series = i;
                lblCover.label = group[1];
                lblCover.group = group;
                lblCover.hover(function() {
                        if (enterFn) {
                            if (this.label) {
                                this.label.attr( {"font-weight": 800} );
                                var bbox = this.group.getBBox();
                                this.attr({ "width": bbox.width });
                            }
                            enterFn(this.series);
                        }
                    }, function() {
                        if (leaveFn) {
                            if (this.label) {
                                this.label.attr( {"font-weight": 400} );
                                var bbox = this.group.getBBox();
                                this.attr({ "width": bbox.width });
                            }
                            leaveFn(this.series);
                        }
                    });
                covers.push(lblCover);
                h += tlh;
                ch += tlh;
            }
            if (isTopAligned !== true) {
                this.gLabels.translate.apply(this.gLabels, [0, -ch / 2]);
                covers.translate.apply(covers, [0, -ch / 2]);
            }
        }
    },

    // overrides CQ.reports.Chart#update
    update: function() {
        this.chartCanvas.clear();
        if (this.hasData) {
            this.drawChartBase();
        } else if (!this.isLoadError) {
            this.loadChartData();
        }
    },

    // overrides CQ.reports.Chart#clear
    clear: function() {
        // snapshot-based charts work differently - so we'll update the chart nevertheless
        this.update();
    },

    /**
     * Loads chart data from the server.
     */
    loadChartData: function() {
        var url = this.report.getSnapshotDataUrl();
        var prms = "?from=" + this.chartConfig.from;
        prms += "&to=" + this.chartConfig.to;
        prms += "&aggr=" + this.chartConfig.aggregation;
        url += prms;
        CQ.HTTP.get(url, function(options, success, response) {
                if (success) {
                    var chartData = CQ.Util.formatData(CQ.Ext.util.JSON.decode(
                            response.responseText));
                    if (chartData.success) {
                        this.onLoadSuccess(chartData);
                    } else {
                        this.onLoadFailure();
                    }
                } else {
                    this.onLoadFailure();
                }
            }, this);
    },

    onLoadSuccess: function(result) {
        if (result != null) {
            var snapshots = result.snapshots;
            var scale = result.scale;
            if (snapshots && scale) {
                this.series = new CQ.reports.charts.SnapshotSeries(snapshots, scale,
                        this.totals && (this.totals === true), this.seriesCnt);
            } else {
                this.series = null;
            }
            this.getChartInformation(result);
        } else {
            this.series = null;
            this.title = CQ.I18n.getMessage("Historic data");
            this.description = null;
        }
        this.hasData = true;
        this.isLoadError = false;
        this.drawChartBase();
    },

    /**
     * Gets data required for displaying information of historic charts.
     * @private
     */
    getChartInformation: function(result) {
        this.title = (result.title ? CQ.I18n.getVarMessage(result.title)
                : CQ.I18n.getMessage("Historic data"));
        if (result.descr) {
            this.description = CQ.I18n.getVarMessage(result.descr);
        } else if (this.series != null) {
            var dataCol = this.series.typeInfo.data[0].title;
            var groupedCols = "";
            var grouped = this.series.typeInfo.grouped;
            for (var g = 0; g < grouped.length; g++) {
                if (g > 0) {
                    groupedCols += ", ";
                }
                groupedCols += "'" + CQ.I18n.getVarMessage(grouped[g].title) + "'";
            }
            this.description = CQ.I18n.getMessage("This report shows data taken from the<br />'{0}' column, grouped by<br />{1}.", [ dataCol, groupedCols ]);
        }
    },

    /**
     * @private
     */
    onLoadFailure: function() {
        this.series = null;
        this.title = CQ.I18n.getMessage("Historic data");
        this.description = null;
        this.hasData = false;
        this.isLoadError = true;
        this.drawChartBase();
    },

    // overrides CQ.reports.charts.RaphaelChart#adjustToChartDef
    adjustToChartDef: function() {
        CQ.reports.charts.SeriesBasedChart.superclass.adjustToChartDef.call(this);
        this.setConfigProp(this.chartDef, "totals");
        this.setConfigProp(this.chartDef, "series", 9, "seriesCnt");
        this.setConfigProp(this.chartDef, "hoverLimit", 35);
    },

    adjustToChartConfig: function() {
        var items = this.configPanel.items;
        items.get("from").setValue(this.createDate(this.chartConfig.from));
        items.get("to").setValue(this.createDate(this.chartConfig.to));
        items.get("agginterval").setValue(this.chartConfig.aggregation);
    },

    adjustConfigPanelSize: function(totalWidth) {
        var panelWidth = this.configPanel.getSize().width;
        var x = totalWidth - panelWidth - this.configPanelPadding;
        // var y = (this.isNarrowVersion ? 26 : 6);
        var y = (this.layout == "vertical" ? 26 : 6);
        this.configPanelEl.setLeftTop(x + "px", y + "px");
    },

    // overrides CQ.reports.Chart#notifyRemoved
    notifyRemoved: function() {
        CQ.reports.charts.SeriesBasedChart.superclass.notifyRemoved.call(this);
        this.invalidateSeries();
        this.configPanel.removeAll();
        this.configPanel.destroy();
        this.configPanelEl.remove();
    },

    // overrides CQ.reports.Chart#notifyReportFinished
    notifyReportFinished: function() {
        CQ.reports.charts.SeriesBasedChart.superclass.notifyReportFinished.call(this);
        this.invalidateSeries();
        this.update();
    },

    // override CQ.reports.chart.RaphaelChart#notifyResize
    notifyResize: function(w, h) {
        CQ.reports.charts.SeriesBasedChart.superclass.notifyResize.call(this, w, h);
        this.adjustConfigPanelSize(w);
    },

    /**
     * Invalidates the current data series. A call to {@link #update} will cause a reload
     * of data.
     */
    invalidateSeries: function() {
        this.hasData = false;
        this.series = null;
        this.isLoadError = false;
    },

    // overrides CQ.reports.charts.RaphaelChart#drawChartTitle
    drawChartTitle: function() {
        if (this.title != null) {
            var txt = this.chartCanvas.text(this.padding, 16 + this.vertTextOffs,
                    this.title).attr(this.titleAttribs);
            if ((this.description != null) && !this.isNarrowVersion) {
                var bbox = txt.getBBox();
                var iconX = bbox.x + bbox.width + 10;
                var size = 5;
                var x = this.width - this.padding - 16;
                var y = 8;
                var img = this.chartCanvas.image(CQ.HTTP.externalize(
                        "/libs/cq/reporting/widgets/themes/default/resources/help.png"),
                        iconX, y, 16, 16);
                var inFn = function() {
                        img.popup = this.drawDescriptionPopup(
                                iconX + 3, y + 30 + size, this.description, size);
                    };
                var outFn = function() {
                        img.popup.animate({
                                "opacity": 0
                            }, 300, function () {
                                this.remove();
                            });
                    };
                img.hover(inFn, outFn, this, this);
            }
        }
    },

    /**
     * Draws the description popup. This is an adapted version of Raphael's default
     * popup impleentation.
     * @private
     */
    drawDescriptionPopup: function(x, y, text, size) {
        var c = this.chartCanvas;
        var res = c.set();
        res.push(c.path().attr({fill: "#000", stroke: "#000"}));
        res.push(c.text(x, y, text).attr(c.g.txtattr)
                .attr(this.popupAttribs));
        var to = this.vertTextOffs;
        res.update = function (X, Y) {
            X = X || x;
            Y = Y || y;
            var bb = this[1].getBBox(),
                w = bb.width / 2,
                h = bb.height / 2,
                dy = - 2*h;
            var seg1 = w;
            var seg2 = w;
            var tw = w + size;
            if ((X - tw) < 0) {
                seg1 = X - size;
                seg2 = (2 * w) - seg1;
            }
            var mmax = Math.max;
            var p = ["M", X, Y - dy,
                    "l", -mmax(seg1, size), 0,
                    "a", size, size, 0, 0, 1, -size, -size,
                    "l", 0, -mmax(h, size), 0, -mmax(h, size),
                    "a", size, size, 0, 0, 1, size, -size,
                    // "l", mmax(w, size), 0, mmax(w, size), 0,
                    "l", seg1, 0, size, -size, size, size, seg2, 0,
                    "a", size, size, 0, 0, 1, size, size,
                    "l", 0, mmax(h, size), 0, mmax(h, size),
                    "a", size, size, 0, 0, 1, -size, size,
                    "l", -mmax(seg2, size), 0,
                    "z"].join(","),
                xy = {x: X - seg1, y: Y + h - size + to};
            xy.path = p;
            this.attr(xy);
            return this;
        };
        return res.update(x, y);
    },

    // overrides CQ.reports.chart.RaphaelChart#addSpecificChartOptions
    addSpecificChartOptions: function(opts, width, height) {
        CQ.reports.charts.SeriesBasedChart.superclass.addSpecificChartOptions.call(this,
                opts, width, height);
        var seriesCnt = this.series.getSeriesCnt();
        opts.colors = this.colorScheme.getColors(seriesCnt, false);
    }

});

CQ.reports.charts.SeriesBasedChart.SNAPSHOT_DEF_URL =
        "/libs/cq/reporting/components/commons/scheduling.infinity.json";

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a pie chart.
 * @class CQ.reports.PieChart
 * @extends CQ.reports.charts.RaphaelChart
 */
CQ.reports.charts.PieChart = CQ.Ext.extend(CQ.reports.charts.SimpleChart, {

    /**
     * Current radius of the pie chart
     * @type Number
     */
    radius: null,

    /**
     * Fixed radius of the pie chart; null if the chart should adapt its size to available
     * space (and a maximum size if specified using
     * {@link CQ.reports.charts.PieChart#maxRadius})
     * @type Number
     */
    fixedRadius: null,

    /**
     * Maximum radius of the pie chart; null if the chart should grow to a maximum.
     * @type Number
     */
    maxRadius: null,

    /**
     * Minimum radius of the pie chart; null if the chart should shrink to a minimum.
     * Will be ignored if a fixed radius is specified. Default value is 50.
     * @type Number
     */
    minRadius: 50,

    /**
     * The currently displayed pie chart
     * @type Object
     */
    pieChart: null,


    constructor: function(chartDef, report) {
        CQ.reports.charts.SeriesBasedChart.superclass.constructor.call(this, chartDef,
                report, CQ.I18n.getMessage("Current data"));
    },

    // overrides CQ.reports.Chart#update
    drawChart: function() {
        var chartValues = this.data.getValues();
        var othersValue = this.data.getOthersValue();
        if (othersValue != null) {
            chartValues.push(othersValue);
        }
        // todo remove PoC hack
        var yPos = (this.layout == "horizontal" ? this.availableHeight / 2 :
                this.radius + this.padding);
        this.pieChart = this.chartCanvas.g.piechart(this.radius + this.padding - 1,
                yPos - 1 + this.yOffs, this.radius, chartValues,
                this.createChartOptions(this.width, this.availableHeight));
        var backRef = this;
        var pieIn = function() {
                backRef.highlightLegend.call(backRef, this);
            };
        var pieOut = function() {
                backRef.removeLegendHighlight.call(backRef, this);
            };
        this.pieChart.hover(pieIn, pieOut);
        var labelToSector = [ ];
        var sectorForLabel = function(label, isCoverRef) {
                var cnt = labelToSector.length;
                for (var c = 0; c < cnt; c++) {
                    if (isCoverRef) {
                        if (labelToSector[c].labelCover == label) {
                            return labelToSector[c];
                        }
                    } else {
                        if (labelToSector[c].labelHover == label) {
                            return labelToSector[c];
                        }
                    }
                }
                return null;
            };
        var labelIn = function() {
                var sector = sectorForLabel(this, true);
                backRef.highlightLegend.call(backRef, sector);
            };
        var labelOut = function() {
                var sector = sectorForLabel(this, true);
                backRef.removeLegendHighlight.call(backRef, sector);
            };
        var cv = this.chartCanvas;
        var covers = cv.set();
        this.pieChart.each(function() {
                var bounds = this.label.getBBox();
                this.lblCover = cv.rect(bounds.x, bounds.y, bounds.width, bounds.height);
                this.lblCover.attr({
                        "fill": "#ffffff",
                        "opacity": 0.0,
                        "stroke-width": 0
                    });
                covers.push(this.lblCover);
                labelToSector.push({
                        "sector": this.sector,
                        "labelHover": this.label[1],
                        "label": this.label,
                        "labelCover": this.lblCover
                    });
                this.lblCover.hover(labelIn, labelOut);
            });
    },

    // overrides CQ.reports.charts.RaphaelChart#adjustToChartDef
    adjustToChartDef: function() {
        this.setConfigProp(this.chartDef, "fixedRadius");
        this.setConfigProp(this.chartDef, "maxRadius");
        this.setConfigProp(this.chartDef, "minRadius");
    },

    // overrides CQ.reports.charts.RaphaelChart#calcSizeDependant
    calcSizeDependant: function(w, h) {
        if (this.fixedRadius) {
            this.radius = this.fixedRadius;
        } else {
            // todo remove hack for PoC
            if (this.layout == "vertical") {
                var legendSize = (this.chartDef.valueLimit + 1) * 16;
                this.radius = (this.availableHeight - (this.padding * 2.5) - legendSize)
                        / 2;
            } else {
                this.radius = (Math.min(w, h) / 2) - this.padding;
            }
            if ((this.minRadius != null) && (this.radius < this.minRadius)) {
                this.radius = this.minRadius;
            }
            if ((this.maxRadius != null) && (this.radius > this.maxRadius)) {
                this.radius = this.maxRadius;
            }
        }
    },

    coversToFront: function() {
        if (!CQ.Ext.isIE) {
            this.pieChart.each(function() {
                this.cover.toFront();
            });
        }
    },

    highlightLegend: function(ref) {
        var pos = ref.sector.middle;
        var value = (ref.sector.value ? ref.sector.value.value : null);
        if (value == null) {
            // workaround for single value chart
            var values = this.data.getValues();
            if (CQ.Ext.isArray(values) && (values.length == 1)) {
                value = String(values[0]);
            }
        }
        ref.popup = this.chartCanvas.g.popup(pos.x, pos.y,  value || "0");
        this.coversToFront();
        if (ref.label) {
            ref.label[1].attr({ "font-weight": 800} );
            var bbox = ref.label.getBBox();
            if (ref.labelCover) {
                ref.labelCover.attr({
                        "width": bbox.width
                    });
            }
        }
    },

    removeLegendHighlight: function(ref) {
        ref.popup.animate({
                "opacity": 0
            }, 300, function () {
                this.remove();
            });
        if (ref.label) {
            ref.label[1].attr( {"font-weight": 400} );
            var bbox = ref.label.getBBox();
            if (ref.labelCover) {
                ref.labelCover.attr({
                        "width": bbox.width
                    });
            }
        }
    },

    // overrides CQ.reports.charts.RaphaelChart#addSpecificChartOptions
    addSpecificChartOptions: function(opts) {
        CQ.reports.charts.PieChart.superclass.addSpecificChartOptions.call(this, opts);
        var valLimit = this.data.getChartValueCnt();
        var legendPos = "east";
        if (this.layout == "vertical") {
            legendPos = "south";
        }
        CQ.Ext.apply(opts, {
                "legend": this.createLegend(),
                "legendpos": legendPos,
                "lineHeight": 16,
                "cut": valLimit,
                "preventSorting": true,
                "allowTinyPies": true
            });
    }

});


// register chart
CQ.reports.ChartRegistry.registerChart("pie", CQ.reports.charts.PieChart);
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a line chart that is able to display several values ("series")
 * over time.
 * @class CQ.reports.LineSeriesChart
 * @extends CQ.reports.charts.SeriesBasedChart
 */
// todo class should most probably be separated in "timebased common" + "line chart" classes
CQ.reports.charts.LineSeriesChart = CQ.Ext.extend(CQ.reports.charts.SeriesBasedChart, {

    padding: 10,

    axisAttribs: {
            "font-family": "Tahoma, Arial, sans-serif",
            "font-size": "10px",
            "text-anchor": "end"
        },

    timeAxisAttribs: {
            "font-family": "Tahoma, Arial, sans-serif",
            "font-size": "10px",
            "text-anchor": "start"
        },

    // overrides CQ.reports.charts.SeriesBasedChart#drawChart
    drawChart: function() {
        var xValues = this.series.createXValuesForRaphael();
        var yValues = this.series.createYValuesForRaphael();
        var opts = this.createChartOptions(this.width, this.availableHeight);
        var minY = this.series.getMinY();
        var maxY = this.series.getMaxY();
        var valueCnt = this.series.getMaxValuesPerSeries();
        var hasDots = (this.hoverLimit >= valueCnt);
        var scaleMax = (minY < 0 ? 0 : 1);
        var base;
        if (maxY > 0) {
            base = Math.pow(10, Math.floor(Math.log(maxY) / Math.LN10));
            scaleMax = Math.ceil(maxY / base) * base;
        }
        var scaleMin = 0;
        if (minY < 0) {
            base = Math.pow(10, Math.floor(Math.log(Math.abs(minY)) / Math.LN10));
            scaleMin = Math.floor(minY / base) * base;
        }
        this.middleY = ((scaleMax - scaleMin) / 2) + scaleMin;
        opts.yDim = {
                "from": scaleMin,
                "to": scaleMax,
                "i": 1
            };
        opts.xDim = {
                "from": 0,
                "to": this.series.getMaxDate(),
                "i": 1
            };
        if (hasDots) {
            opts.symbol = "o";
            opts.symbolSize = 4;
        }
        opts.width = 2;
        var chartWidth = this.width - (2 * this.padding);
        // todo remove PoC hack
        var legendHeight = this.series.getSeriesCnt() * 16;
        var chartHeight = (this.layout == "vertical"
                ? this.availableHeight - (2.5 * this.padding) - legendHeight - 40
                : this.availableHeight - (2 * this.padding) - 16);
        var yOffs = this.padding + this.yOffs + (this.layout == "vertical" ? 24 : 0);
        // chartWidth: -40 - Add gutter space to give enough room for displaying the
        // "date" axis labels; -200 - Reserve space for the legend
        var actualWidth = chartWidth - 40;
        var hasLegend = false;
        var legendX, legendY;
        if (actualWidth < 0) {
            actualWidth = chartWidth;
        } else if ((this.layout == "horizontal") && (actualWidth > 300)) {
            actualWidth -= 200;
            hasLegend = true;
            legendX = this.padding + 40 + actualWidth;
            legendY = (this.availableHeight / 2);
        } else if (this.layout == "vertical") {
            hasLegend = true;
            legendX = this.padding;
            legendY = (this.height - legendHeight - this.padding) - this.yOffs
        }
        opts.axisxstep = Math.round((actualWidth - 20) / 50);
        opts.gutter = 0;
        opts.coverRadius = 5;
        var axisAttribs = this.axisAttribs;
        var timeAxisAttribs = this.timeAxisAttribs;
        var to = this.vertTextOffs;
        var calcZeroOffset = function(size) {
                if (scaleMin >= 0) {
                    return size;
                }
                var valueDelta = scaleMax - scaleMin;
                return size * (scaleMax / valueDelta);
            };
        var backRef = this;
        opts.customAxis = {
            // both methods are executed in the context of the line chart
            "createValueAxis": function(def) {
                var x = def.x, y = def.y, size = def.size, opposite = def.opposite;
                var zeroOffs = calcZeroOffset(size);
                var axis = ["M", x + .5, y, "l", 0, -size,
                        "M", x - !(def.direction - 1) * 4, y - size + .5,
                        "l", 5, 0];
                var addSeparatorOffset = null;
                var addSeparatorValue;
                // insert additional separator line only if one of the positive/negative
                // areas covers more than 2/3rd of the entire size
                var delta = def.max - def.min;
                if ((def.max / delta) >= 0.67) {
                    addSeparatorOffset = size - (zeroOffs / 2);
                    addSeparatorValue = def.max / 2;
                } else if ((-def.min / delta) >= 0.67) {
                    addSeparatorOffset = (size - zeroOffs) / 2;
                    addSeparatorValue = def.min / 2;
                }
                if (def.max > 0) {
                     axis = axis.concat([
                            "M", x - 4, y - (size - (zeroOffs / 2)) + .5,
                            "l", 5, 0
                        ]);
                }
                if (addSeparatorOffset != null) {
                    axis = axis.concat([
                            "M", x - 4, y - addSeparatorOffset + .5,
                            "l", 5, 0
                        ]);
                }
                if (def.min < 0) {
                     axis = axis.concat([
                            "M", x - 4, y + .5,
                            "l", 5, 0
                        ]);
                }
                var grid = [ ];
                if (def.max > 0) {
                    grid = grid.concat([
                            "M", x, y - size + .5,
                            "l", opposite, 0
                        ]);
                }
                if (addSeparatorOffset != null) {
                    grid = grid.concat([
                            "M", x, y - addSeparatorOffset + .5,
                            "l", opposite, 0
                        ]);
                }
                if (def.min < 0) {
                    grid = grid.concat([
                            "M", x, y + .5,
                            "l", opposite, 0
                        ]);
                }
                var container = this.set();
                container.push(this.path(grid).attr({ "stroke": "#ddd" }));
                container.push(this.path(axis));
                if (def.max > 0) {
                    container.push(this.text(x - 6, y - size + 4 + to, def.max)
                            .attr(axisAttribs));
                }
                if ((def.max > 0) && (def.min < 0)) {
                    container.push(this.text(x - 6, y - (size - zeroOffs) + to, "0")
                            .attr(axisAttribs));
                }
                if (addSeparatorOffset != null) {
                    container.push(
                            this.text(x - 6, y - addSeparatorOffset + to, addSeparatorValue)
                                .attr(axisAttribs));
                }
                if (def.min < 0) {
                    container.push(
                            this.text(x - 6, y - 3.5 + to, def.min).attr(axisAttribs));
                }
                return container;
            },
            "createTimeAxis": function(def) {
                var x = def.x, y = def.y, size = def.size, opposite = def.opposite;
                var zeroOffs = calcZeroOffset(opposite);
                var container = this.set();
                var grid = [ ];
                var scale = backRef.series.createTimeScale();
                var segCnt = scale.length;
                for (var s = 0; s < segCnt; s++) {
                    var seg = scale[s];
                    var realOffs = backRef.series.calcRealSegPos(seg, size);
                    if (seg.offs > 0) {
                        grid = grid.concat([
                                "M", x + realOffs, y,
                                "l", 0, -opposite
                            ]);
                    }
                    container.push(
                            this.text(x + realOffs, y + 6 + to, seg.display)
                                .attr(timeAxisAttribs));
                }
                container.push(this.path(grid).attr({ "stroke": "#ddd" }));
                var path = ["M", x - 4, y - (opposite - zeroOffs) + .5, "l", size + 4, 0];
                container.push(this.path(path));
                return container;
            }
        };
        var thisRef = this;
        this.lineChart = this.chartCanvas.g.linechart(this.padding + 20,
                yOffs, actualWidth, chartHeight, xValues, yValues,
                opts);
        if (hasDots) {
            this.lineChart.hover(function() {
                    thisRef.highlightLegend(this, hasLegend);
                }, function() {
                    thisRef.removeLegendHighlight(this, hasLegend);
                });
        }
        var hoverIn = null;
        var hoverOut = null;
        if (hasDots) {
            hoverIn = this.onEnterLegend.createDelegate(this);
            hoverOut = this.onLeaveLegend.createDelegate(this);
        }
        if (hasLegend) {
            this.createSeriesLegend(legendX, legendY, function(i) {
                    var lineColor = opts.colors[i];
                    return {
                            "fill": lineColor,
                            "stroke": "none"
                        };
                }.createDelegate(this.lineChart), opts, hoverIn, hoverOut,
                (this.layout == "vertical"));
        }
    },

    onEnterLegend: function(series) {
        this.legendPopups = [ ];
        var thisRef = this;
        var discreteValues = this.series.getMaxValuesPerSeries();
        var mod = Math.ceil(discreteValues / 10);
        var v = 0;
        this.lineChart.each(function() {
                if (this.series == series) {
                    // show a max. of 10 popups
                    if ((((discreteValues - 1) - v) % mod) == 0) {
                        thisRef.legendPopups.push(thisRef.chartCanvas.g.popup(
                                this.x, this.y, Math.round(this.value) || "0",
                                (this.value < thisRef.middleY ? 2 : 0)));
                    }
                    v++;
                }
            });
    },

    onLeaveLegend: function(series) {
        if (this.legendPopups) {
            var popupCnt = this.legendPopups.length;
            for (var p = 0; p < popupCnt; p++) {
                this.legendPopups[p].animate({
                        "opacity": 0
                    }, 300, function () {
                        this.remove();
                    });
            }
            this.legendPopup = null;
        }
    },

    // overrides CQ.reports.charts.RaphaelChart#calcSizeDependant
    calcSizeDependant: function(w, h) {
        // todo implement
    },

    highlightLegend: function(cover, hasLegend) {
        cover.popup = this.chartCanvas.g.popup(
                cover.x, cover.y, Math.round(cover.value) || "0", 1);
        if (!CQ.Ext.isIE) {
            cover.toFront();
        }
        if (hasLegend && this.gLabels[cover.series]) {
            this.gLabels[cover.series][1].attr({ "font-weight": 800} );
        }
    },

    removeLegendHighlight: function(cover, hasLegend) {
        cover.popup.animate({
                "opacity": 0
            }, 300, function () {
                this.remove();
            });
        if (hasLegend && this.gLabels[cover.series]) {
            this.gLabels[cover.series][1].attr( {"font-weight": 400} );
        }
    },

    // overrides CQ.reports.charts.RaphaelChart#addSpecificChartOptions
    addSpecificChartOptions: function(opts, width, height) {
        CQ.reports.charts.LineSeriesChart.superclass.addSpecificChartOptions.call(this,
                opts, width, height);
        CQ.Ext.apply(opts, {
                "axis": "0 0 1 1"
            });
    }

});


// register chart
CQ.reports.ChartRegistry.registerChart("lineseries", CQ.reports.charts.LineSeriesChart);
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a customized grid view that provides the additional menu items
 * that are required by the reporting framework.
 * @class CQ.reports.ReportGridView
 * @extends CQ.Ext.grid.GridView
 * @constructor
 * Creates a new ReportGridView.
 * @param {CQ.reports.Report} The report the view is used by
 * @param {Object} The config
 */
CQ.reports.ui.ReportGridView = CQ.Ext.extend(CQ.Ext.grid.GridView, {

    /**
     * @private
     */
    removeDropZone: null,

    /**
     * The report the grid view is used by
     * @type CQ.reports.Report
     * @private
     */
    report: null,

    constructor: function(report, config) {
        CQ.reports.ui.ReportGridView.superclass.constructor.call(this, config);
        this.report = report;
        this.addEvents("beforecolcontextmenu", "oncolcontextmenuclicked",
                "colremoverequested", "colinsertrequested", "colmoverequested");

        CQ.WCM.registerDropTargetComponent(this);
     },

    getDropTargets: function() {
        return [this.columnDrop];
    },

    isVisible: function() {
        return !!this.el;
    },


    // private
    // Note that this hack uses undocumented API and should be reviewed after each
    // Ext upgrade!
    afterRenderUI: function() {
        if (this.report.isEditMode) {
            this.removeDropZone = new CQ.reports.ui.RemoveColDropZone(this);
        }
        CQ.reports.ui.ReportGridView.superclass.afterRenderUI.call(this);
        if (this.report.isEditMode) {
            this.columnDrop = new CQ.reports.ui.ColHeaderDropZone(this.grid,
                    this.mainHd.dom);
            // todo make drop working for use with content finder
            var editable = CQ.reports.utils.EditUtils.getNewColumnEditable();
            editable.componentDropTarget = this.columnDrop;
            editable.isVisible = function() {
                    return this.grid.isVisible();
                }.createDelegate(this);
            this.columnDrop.editComponent = editable;
            this.columnDrag = new CQ.reports.ui.ColHeaderDragZone(this.grid,
                    this.mainHd.dom);
        }
        if (this.hmenu) {
            var colItems = this.hmenu.items.get("columns");
            if (colItems) {
                this.hmenu.remove(colItems);
            }
            this.aggregateMenu = new CQ.Ext.menu.Menu();
            this.hmenu.add(new CQ.Ext.menu.CheckItem({
                        "itemId": "groupBy",
                        "text": CQ.I18n.getMessage("Group by this column"),
                        "checked": false,
                        "listeners": {
                            "checkchange": function(item, isChecked) {
                                var cm = this.grid.getColumnModel();
                                var col = (cm.translateColumn
                                        ? cm.translateColumn(this.hdCtxIndex)
                                        : this.hdCtxIndex);
                                this.fireEvent("oncolcontextmenuclicked", "groupBy", col,
                                         isChecked);
                            },
                            "scope": this
                        }
                    }),
                new CQ.Ext.menu.Item({
                        "itemId": "filters",
                        "text": CQ.I18n.getMessage("Filter settings...")
                    }),
                new CQ.Ext.menu.Item({
                        "itemId": "aggregate",
                        "text": CQ.I18n.getMessage("Aggregate"),
                        "menu": this.aggregateMenu
                    }),
                "-",
                new CQ.Ext.menu.Item({
                        "itemId": "genericprops",
                        "text": CQ.I18n.getMessage("Column properties...")
                    }));
            this.hmenu.on("beforeshow", function() {
                this.fireEvent("beforecolcontextmenu", this.hmenu, this.hdCtxIndex);
            }, this);
        }
    },

    // private
    // Note that this hack uses undocumented API and should be reviewed after each
    // Ext upgrade!
    handleHdDown : function(e, t){
        if(CQ.Ext.fly(t).hasClass('x-grid3-hd-btn')){
            CQ.reports.ui.ReportGridView.superclass.handleHdDown.call(this, e, t);
            // use different alignment
            this.hmenu.show(t, 'tr-br?');
        }
    },

    // private
    // Note that this hack uses undocumented API and should be reviewed after each
    // Ext upgrade!
    handleHdMenuClick : function(item){
        var menuPos = this.hmenu.getEl().getXY();
        var menuWidth = this.hmenu.getEl().getWidth();
        var alignPos = {
                "x": menuPos[0] + menuWidth,
                "y": menuPos[1]
            };
        var id = item.getItemId();
        var cm = this.grid.getColumnModel();
        var col = (cm.translateColumn ? cm.translateColumn(this.hdCtxIndex)
                : this.hdCtxIndex);

        switch(id){
            case "groupBy":
                break;
            case "filters":
                this.fireEvent("oncolcontextmenuclicked", "filters", col,
                        null, alignPos);
                break;
            case "genericprops":
                this.fireEvent("oncolcontextmenuclicked", "genericprops", col,
                        null, alignPos);
                break;
            default:
                return CQ.reports.ui.ReportGridView.superclass.handleHdMenuClick.call(this,
                        item);
        }
        return true;
    },

    // private
    // Note that this hack uses undocumented API and should be reviewed after each
    // Ext upgrade!
    destroy: function() {
        CQ.reports.ui.ReportGridView.superclass.destroy.call(this);
        if (this.removeDropZone) {
            this.removeDropZone.destroy();
        }
    }

});

/**
 * Drag &amp; Drop Group that is used for removing columns
 * @static
 * @final
 * @type String
 */
CQ.reports.ui.ReportGridView.DD_GROUP_REMOVECOMP = "removecomponent";
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class extends the default Ext column model by some additional functionality
 * required by CQ's Reporting feature.
 * @class CQ.reports.ui.ReportColumnModel
 * @extends CQ.Ext.grid.ColumnModel
 */
CQ.reports.ui.ReportColumnModel = CQ.Ext.extend(CQ.Ext.grid.ColumnModel, {

    /**
     * Translation table: Sorting order in view vs. sorting order in report
     * @private
     */
    colTranslation: null,

    /**
     * @cfg {Boolean} useColumnTranslation
     * Determine if column translation should be used. "Column translation" means that all
     * reported column indexes resemble the original column order, not the column order
     * currently displayed in the view. Defaults to false.
     */
    useColumnTranslation: false,

    /**
     * @cfg {CQ.Ext.grid.GridPanel} grid
     * The grid the column model is used from (required for trigerring events); note that
     * there is no sensible default value, hence you are required to correctly specify the
     * grid yourself
     */
    grid: null,


    constructor: function(config) {
        config = config || { };
        CQ.Util.applyDefaults(config, {
                "useColumnTranslation": false
            });
        CQ.reports.ui.ReportColumnModel.superclass.constructor.call(this, config);
        var colCnt = this.columns.length;
        this.colTranslation = [ ];
        for (var c = 0; c < colCnt; c++) {
            this.colTranslation.push(c);
        }
        this.on("columnmoved", function(cm, oldIndex, newIndex) {
                var col = this.colTranslation[oldIndex];
                var oldIndexToReport = this.translateColumn(oldIndex);
                var newIndexToReport = this.translateColumn(newIndex);
                this.colTranslation.splice(oldIndex, 1);
                this.colTranslation.splice(newIndex, 0, col);
                var view = this.grid.getView();
                view.fireEvent("colmoverequested", oldIndexToReport, newIndexToReport);
            }, this)
    },

    /**
     * <p>Translates the specified view column index into the original index of the column,
     * so we can do a 1:1 match to the report's column.</p>
     * <p>This method respects the {@link #useColumnTranslation} setting, so translation is
     * only applied if {@link #useColumnTranslation} is set to true.</p>
     * @param {Number} viewCol The column index in the view
     * @return {Number} The translated column index; this index matches the index of the
     *         column passed in the constructor's column config array
     */
    translateColumn: function(viewCol) {
        return (this.useColumnTranslation ? this.colTranslation[viewCol] : viewCol);
    },

    /**
     * Retrieves the view column index for the specified original index.
     * @param {Number} col The original index (index as passed in the constructor's column
     *        config array); -1 if an invalid column index was specified
     */
    getViewColumn: function(col) {
        if (!this.useColumnTranslation) {
            return col;
        }
        var viewCol = -1;
        var colCnt = this.colTranslation.length;
        for (var c = 0; c < colCnt; c++) {
            if (this.colTranslation[c] == col) {
                viewCol = c;
                break;
            }
        }
        return viewCol;
    },

    /**
     * Notifies the column model about an inserted column.
     * @param {Number} col Index of the inserted column (index as passed in the
     *        constructor's column config array)
     */
    notifyColumnInserted: function(col) {
        // todo handle useColumnTranslation
        var viewCol = -1;
        var colCnt = this.colTranslation.length;
        for (var c = 0; c < colCnt; c++) {
            if (this.colTranslation[c] == col) {
                viewCol = c;
            }
            if (this.colTranslation[c] >= col) {
                this.colTranslation[c]++;
            }
        }
        if (viewCol >= 0) {
            this.colTranslation.splice(viewCol, 0, col);
            // insert dummy column
            this.columns.splice(viewCol, 0, null);
        } else {
            this.colTranslation.push(col);
            // add dummy column
            this.columns.push(null);
        }
    },

    /**
     * Notifies the column model about a removed column.
     * @param {Number} col Index of the removed column (index as passed in the
     *        constructor's column config array)
     */
    notifyColumnRemoved: function(col) {
        // todo handle useColumnTranslation
        var viewCol = -1;
        var colCnt = this.colTranslation.length;
        for (var c = 0; c < colCnt; c++) {
            if (this.colTranslation[c] == col) {
                viewCol = c;
            } else {
                if (this.colTranslation[c] > col) {
                    this.colTranslation[c]--;
                }
            }
        }
        if (viewCol >= 0) {
            this.colTranslation.splice(viewCol, 1);
            this.columns.splice(viewCol, 1);
        }
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a customized drop zone for columns that accept edit components
 * as well.
 * @class CQ.reports.ui.ColHeaderDropZone
 * @extends CQ.Ext.grid.HeaderDropZone
 */
CQ.reports.ui.ColHeaderDropZone = CQ.Ext.extend(CQ.Ext.grid.HeaderDropZone, {

    constructor: function(grid, hd, hd2) {
        CQ.reports.ui.ColHeaderDropZone.superclass.constructor.call(this, grid, hd, hd2);
        this.addToGroup(CQ.wcm.EditBase.DD_GROUP_COMPONENT);
        // faking for content finder drag & drop
        this.editComponent = {
                "isInsertAllowed": function() {
                    return true;
                }
            };
    },

    onNodeDrop: function(n, dd, e, data){
        if (dd.groups && dd.groups[CQ.wcm.EditBase.DD_GROUP_COMPONENT]) {
            var toInsert = data.records[0].data;
            var x = CQ.Ext.lib.Event.getPageX(e);
            var r = CQ.Ext.lib.Dom.getRegion(n.firstChild);
            var pt = ((r.right - x) <= ((r.right - r.left) / 2) ? "after" : "before");
            var colRef = this.view.getCellIndex(n);
            this.view.fireEvent("colinsertrequested", toInsert, colRef, pt);
            return true;
        } else {
            // move is reported indirectly through the column model, as we're already
            // aware of source/destination column indices there
            return CQ.reports.ui.ColHeaderDropZone.superclass.onNodeDrop.call(this,
                    n, dd, e, data);
        }
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports.ui.ColHeaderDragZone = CQ.Ext.extend(CQ.Ext.grid.GridView.ColumnDragZone, {

    constructor: function(grid, hd) {
        CQ.reports.ui.ColHeaderDragZone.superclass.constructor.call(this, grid, hd);
        this.addToGroup(CQ.reports.ui.ReportGridView.DD_GROUP_REMOVECOMP);
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a drop zone that covers the entire screen and is used for
 * dropping columns to be removed from a report.
 * @class CQ.reports.ui.RemoveColDropZone
 * @extends CQ.Ext.dd.DropTarget
 * @constructor
 * Creates a new RemoveColDropZone
 * @param {CQ.reports.views.GridView} back reference to the grid view that is using
 *        the drop zone
 */
CQ.reports.ui.RemoveColDropZone = CQ.Ext.extend(CQ.Ext.dd.DropTarget, {

    /**
     * The element representing the screen/desktop (used for resizing the body element)
     * @type CQ.Ext.Element
     * @private
     */
    desktopEl: null,

    constructor: function(gridView) {
        this.gridView = gridView;
        this.desktopEl = CQ.Ext.getBody();
        CQ.Ext.EventManager.onWindowResize(function(w, h) {
                this.desktopEl.setSize(w, h);
            }, this);
        this.desktopEl.setSize(CQ.Ext.lib.Dom.getViewWidth(),
                CQ.Ext.lib.Dom.getViewHeight());
        CQ.reports.ui.RemoveColDropZone.superclass.constructor.call(this, this.desktopEl, {
                "dropAllowed": "cq-reports-dt-remove"
            });
        this.addToGroup(CQ.reports.ui.ReportGridView.DD_GROUP_REMOVECOMP);
    },

    notifyDrop: function(source) {
        var gridView = source.view;
        var cm = gridView.grid.getColumnModel();
        var data = source.dragData;
        var h = data.header;
        var colIndexToRemove = gridView.getCellIndex(h);
        colIndexToRemove = cm.translateColumn(colIndexToRemove);
        this.gridView.fireEvent("colremoverequested", colIndexToRemove);
        return true;
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * The FilterUI works as a base class for implementing filter UI elements. It provides
 * a consistent interface to the {@link CQ.reports.Filter} class.
 * @class CQ.reports.ui.FilterUI
 * @constructor
 * @param {Object} config The config object
 */
CQ.reports.ui.FilterUI = CQ.Ext.extend(CQ.form.CompositeField, {

    constructor: function(config) {
        config = config || { };
        var defaults = {
            "bodyStyle": "padding: 6px",
            "hideLabel": true,
            "border": false,
            "defaults": {
                "hideLabel": true
            }
        };
        CQ.Util.applyDefaults(config, defaults);
        CQ.reports.ui.FilterUI.superclass.constructor.call(this, config);
    },

    /**
     * This method may be used by the implementing filter to analyse the initial raw data,
     * for example by calculating distinct values, min/max values, etc.
     * @param {Object[]} data Initial raw data
     * @param {Number} col The column's index regarding the raw data
     */
    notifyInitialData: function(data, col) {
        // may be overridden by the implementing filter
    },

    /**
     * This method must return if the filter is actually active by means of current UI
     * settings.
     * @return {Boolean} True if the filter is active
     */
    isActive: function() {
        // must be overridden by the implementing filter
        return false;
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class must be extended by each filter to be used by
 * {@link CQ.reports.filters.StringFilter}
 */
CQ.reports.ui.StringFilterUI = CQ.Ext.extend(CQ.reports.ui.FilterUI, {

    /**
     * This method must return the filter operation as specified by
     * {@link CQ.reports.filters.StringFilter}.
     * @return {String} The filter operation as specified by
     *         {@link CQ.reports.filters.StringFilter}
     */
    getFilterOp: function() {
        // must be overridden by the implementing filter
        return "";
    },

    /**
     * This method must return the filter value to be used by
     * {@link CQ.reports.filters.StringFilter} (in conjunction with the filter operation
     * determined by {@link #getFilterOp}).
     * @return {String} The filter setting
     */
    getFilterValue: function() {
        // must be overridden by the implementing filter
        return "";
    },

    /**
     * This method must set the filter operation as specified by
     * {@link CQ.reports.filters.StringFilter}
     * @param {String} op The filter operation
     */
    setFilterOp: function(op) {
        // must be overridden by the implementing filter
    },

    /**
     * This method must return the filter value to be used by
     * {@link CQ.reports.filters.StringFilter} (in conjunction with the filter operation
     * determined by {@link #getFilterOp}).
     * @param {String} value The filter value
     */
    setFilterValue: function(value) {
        // must be overridden by the implementing filter
    }

});
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports.ui.DefaultStringFilterUI = CQ.Ext.extend(CQ.reports.ui.StringFilterUI, {

    /**
     * Component to select the string operation (contains, etc.)
     * @private
     */
    opTypeSelector: null,

    /**
     * Textfield for defining the filter value
     * @private
     */
    filterValueField: null,

    constructor: function(config) {
        CQ.reports.ui.DefaultStringFilterUI.superclass.constructor.call(this, config);
    },

    /**
     * Initializes the filter UI
     */
    initComponent: function() {
        CQ.reports.ui.DefaultStringFilterUI.superclass.initComponent.call(this);
        var flt = CQ.reports.filters.StringFilter;
        this.opTypeSelector = new CQ.form.Selection({
                "name": "opTypeSelector",
                "type": "select",
                "options": [
                    {
                        "value": flt.OP_EQUALS,
                        "text": "equals"
                    }, {
                        "value": flt.OP_CONTAINS,
                        "text": "contains"
                    }
                ],
                "value": flt.OP_CONTAINS
            });
        this.add(this.opTypeSelector);
        this.filterValueField = new CQ.Ext.form.TextField({
                "name": "filterValue",
                "value": "",
                "emptyText": "<" + CQ.I18n.getMessage("no filtering") + ">",
                "width": "94%"
            });
        this.add(this.filterValueField);
    },

    /**
     * Checks if the filter is currently active due to current UI state.
     * @return {Boolean} True if the filter is currently active
     */
    isActive: function() {
        var value = this.filterValueField.getValue();
        return (value != null) && (value.length > 0);
    },

    /**
     * Gets the currently selected filter operation.
     * @return {String} The filter operation
     */
    getFilterOp: function() {
        return this.opTypeSelector.getValue();
    },

    /**
     * Gets the current content of the filter text.
     * @return {String} The current content of the filter text
     */
    getFilterValue: function() {
        return this.filterValueField.getValue();
    },

    /**
     * Sets the currently selected filter operation.
     * @param {String} op The filter operation
     */
    setFilterOp: function(op) {
        if (op != null) {
            this.opTypeSelector.setValue(op);
        } else {
            this.opTypeSelector.setValue(CQ.reports.filters.StringFilter.OP_CONTAINS);
        }
    },

    /**
     * Sets the current content of the filter text.
     * @param {String} value The current content of the filter text
     */
    setFilterValue: function(value) {
        this.filterValueField.setValue(value);
    }

});

// register UI component
CQ.reports.FilterRegistry.registerFilterUI("defaultstring",
        CQ.reports.ui.DefaultStringFilterUI);
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class implements a composite field for enabling snapshots.
 */
CQ.reports.ui.SnapshotEnabler = CQ.Ext.extend(CQ.Ext.Panel, {

    constructor: function(report, height, xOffs) {
        CQ.reports.ui.SnapshotEnabler.superclass.constructor.call(this, {
                "border": false,
                "layout": "fit"
            });
        this.report = report;
        this.height = height;
        this.xOffs = xOffs;
    },

    // overriding CQ.form.CompositeField#onRender
    initComponent: function() {
        CQ.reports.ui.SnapshotEnabler.superclass.initComponent.call(this);
        this.selector = new CQ.form.Selection({
                "name": "./snapshots",
                "type": "select",
                "width": 160,
                "value": CQ.reports.Report.SMODE_DAILY,
                "options": [ {
                            "text": CQ.I18n.getMessage("Hourly snapshots"),
                            "value": CQ.reports.Report.SMODE_HOURLY
                        }, {
                            "text": CQ.I18n.getMessage("Daily snapshots"),
                            "value": CQ.reports.Report.SMODE_DAILY
                        }
                    ]
            });
        this.btn = new CQ.Ext.Button({
                "text": CQ.I18n.getMessage("Start taking snapshots"),
                "handler": function() {
                        if (this.report.createGroupedColumns().length == 0) {
                            var noGroupedColsText = CQ.I18n.getMessage("The report doesn't contain grouped columns.<br>Please ensure that at least one column is grouped before enabling snapshots.");
                            var oldMaxWidth = CQ.Ext.MessageBox.maxWidth;
                            CQ.Ext.MessageBox.maxWidth = 400;
                            CQ.Ext.MessageBox.alert(CQ.I18n.getMessage("Enable snapshots"),
                                    noGroupedColsText);
                            CQ.Ext.MessageBox.maxWidth = oldMaxWidth;
                            return;
                        }
                        if (this.report.isFinished()) {
                            this.startSnapshooting(true);
                        } else {
                            var mode = this.selector.getValue();
                            var okHandler = function(label, description) {
                                    this.report.finish(label, description, mode);
                                }.createDelegate(this);
                            CQ.reports.utils.EditUtils.showFinishDialog(this.report,
                                    this.report.finishTitleDescr, {
                                            "okHandler": okHandler
                                        });
                        }
                    }.createDelegate(this)
            });
        this.addEvents(
            /**
             * @event started
             * Fires after the snapshooting has been started
             */
            "started");
    },

    destroy: function() {
        CQ.reports.ui.SnapshotEnabler.superclass.destroy.call(this);
        this.selector.destroy();
        this.btn.destroy();
        this.topEl.remove();
    },

    // overriding CQ.form.CompositeField#onRender
    onRender: function(ct, pos) {
        CQ.reports.ui.SnapshotEnabler.superclass.onRender.call(this, ct, pos);
        var top = (this.height - 26) / 2;
        var style = "position: absolute; top: " + top + "px; left: " + this.xOffs + "px; "
                + "text-align: center;";
        this.topEl = CQ.Ext.get(CQ.Ext.DomHelper.append(ct, {
                    "tag": "div",
                    "style": style
                }));
        var table = CQ.Ext.get(CQ.Ext.DomHelper.append(this.topEl, {
                "tag": "table",
                "children": [ {
                        "tag": "tr",
                        "children": [
                            { "tag": "td", "valign": "top" },
                            { "tag": "td", "valign": "top", "style": "padding-left: 8px;" }
                        ]
                    }
                ]
            }));
        this.selector.setDisabled(!this.report.isEditMode);
        this.btn.setDisabled(!this.report.isEditMode);
        var cols = CQ.Ext.query("td", table.dom);
        this.selector.render(CQ.Ext.get(cols[0]));
        this.btn.render(CQ.Ext.get(cols[1]));
    },

    startSnapshooting: function(finishedBefore) {
        this.btn.disable();
        var url = CQ.HTTP.externalize(this.report.reportPath);
        var mode = this.selector.getValue();
        var response = CQ.HTTP.post(url, undefined, {
                "./snapshots": mode
            });
        if (CQ.utils.HTTP.isOk(response)) {
            this.report.setSnapshotMode(mode);
            CQ.reports.utils.EditUtils.toggleSnapshotSwitch(true);
            this.fireEvent("selected", this, finishedBefore);
        } else {
            this.btn.enable();
        }
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * <p>This class implements a selector that is able to select multiple options (via
 * checkboxes) and persist them in a suitable cq:WidgetCollection.</p>
 * <p>Please note that this widget does not provide support for most of the functionality
 * of the underlying widgets. It is designed to be used in the context of a generic column's
 * config dialog only.</p>
 * @class CQ.reports.ui.ReportMultiSelector
 * @extends CQ.form.Selection
 */
CQ.reports.ui.ReportMultiSelector = CQ.Ext.extend(CQ.form.Selection, {

    valueProperty: null,

    textProperty: null,

    idProperty: null,

    idPrefix: null,

    defaultValuePath: null,

    resetPath: null,

    constructor: function(config) {
        config = config || { };
        CQ.Util.applyDefaults(config, {
                "type": "checkbox"
            });
        this.configuredOptions = [ ];
        var options = config.options;
        if (options) {
            var optionCnt = options.length;
            for (var o = 0; o < optionCnt; o++) {
                var option = options[o];
                this.configuredOptions.push({
                        "text": option.text,
                        "value": option.value,
                        "addProperties": option.addProperties,
                        "addValues": option.addValues,
                        "idHint": option.idHint
                    });
                delete option.addProperties;
                delete option.addValues;
                delete option.idHint;
            }
        }
        CQ.reports.ui.ReportMultiSelector.superclass.constructor.call(this, config);
    },

    // overriding CQ.Ext.Panel#onRender
    onRender: function(ct, pos) {
        CQ.form.SmartFile.superclass.onRender.call(this, ct, pos);
        var fp = this.findParentByType(CQ.Ext.form.FormPanel);
        if (fp) {
            var form = fp.getForm();
            form.on("beforeaction", function() {
                    this.prepareForSubmit();
                    return true;
                }, this);
        }
    },

    processRecord: function(rec, path) {
        var value = rec.get(this.getName());
        var no = 1;
        var values = [ ];
        while (true) {
            var valueSet = value[no++];
            if (!valueSet) {
                break;
            }
            var type = valueSet[this.valueProperty];
            values.push(type);
        }
        this.setValue(values);
    },

    prepareForSubmit: function() {
        var fp = this.findParentByType(CQ.Ext.form.FormPanel);
        if (fp) {
            var form = fp.getForm();
            var baseName = this.getName();
            if (this.optionItems) {
                var itemNo = 1;
                var optionCnt = this.optionItems.getCount();
                if (this.defaultValuePath) {
                    fp.add(new CQ.Ext.form.Hidden({
                            "name": this.defaultValuePath + CQ.Sling.DELETE_SUFFIX,
                            "value": "true"
                        }));
                }
                var isFirstCheckedItem = true;
                for (var o = 0; o < optionCnt; o++) {
                    var optionItem = this.optionItems.get(o);
                    optionItem.disable();
                    if (optionItem.checked) {
                        var option = this.configuredOptions[o];
                        var namePrefix = baseName + "/" + itemNo + "/";
                        fp.add(new CQ.Ext.form.Hidden({
                                "name": namePrefix + this.valueProperty,
                                "value": option.value
                            }));
                        if (this.defaultValuePath && isFirstCheckedItem) {
                            fp.add(new CQ.Ext.form.Hidden({
                                    "name": this.defaultValuePath,
                                    "value": option.value
                                }));
                            isFirstCheckedItem = false;
                        }
                        if (this.textProperty) {
                            fp.add(new CQ.Ext.form.Hidden({
                                    "name": namePrefix + this.textProperty,
                                    "value": option.text
                                }));
                        }
                        if (this.idProperty) {
                            var id = option.idHint || (this.idPrefix || "id-") + (o + 1);
                            fp.add(new CQ.Ext.form.Hidden({
                                    "name": namePrefix + this.idProperty,
                                    "value": id
                                }));
                        }
                        if (option.addProperties) {
                            var addProps = option.addProperties;
                            var addVals = option.addValues;
                            var addCnt = addProps.length;
                            for (var a = 0; a < addCnt; a++) {
                                fp.add(new CQ.Ext.form.Hidden({
                                        "name": namePrefix + addProps[a],
                                        "value": addVals[a]
                                    }));
                            }
                        }
                        itemNo++;
                    }
                }
                if (itemNo > 1) {
                    fp.add(new CQ.Ext.form.Hidden({
                            "name": baseName + "/jcr:primaryType",
                            "value": "cq:WidgetCollection"
                        }));
                }
                if (this.resetPath) {
                    fp.add(new CQ.Ext.form.Hidden({
                            "name": this.resetPath + CQ.Sling.DELETE_SUFFIX,
                            "value": "true"
                        }));
                }
                fp.doLayout();
            }
        }
    }

});

CQ.Ext.reg("repmultiselector", CQ.reports.ui.ReportMultiSelector);


/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

CQ.reports.ui.FinishReportWindow = CQ.Ext.extend(CQ.Ext.Window, {

    /**
     * @cfg {String} infoText
     * The information text to be displayed
     */

    /**
     * @cfg {String} warningText
     * The warning text to be displayed
     */

    /**
     * @cfg {Function} okHandler
     * The handler to be called if the user actually starts finishing the report
     */
    okHandler: null,


    constructor: function(config) {
        var items = [ ];
        if (config.infoText) {
            items.push({
                    "xtype": "ownerdraw",
                    "html": config.infoText,
                    "name": "info",
                    "anchor": "100%",
                    "hideLabel": true,
                    "style": "padding-bottom: 12px;"
                });
        }
        items.push({
                "fieldLabel": CQ.I18n.getMessage("Title"),
                "xtype": "textfield",
                "name": "label",
                "itemId": "label",
                "anchor": "100%"
            }, {
                "fieldLabel": CQ.I18n.getMessage("Description"),
                "xtype": "textarea",
                "name": "description",
                "itemId": "description",
                "anchor": "100%",
                autoCreate: {
                        tag: "textarea",
                        style: "width:100px;height:60px;",
                        autocomplete: "off",
                        wrap: "off"
                    }
            });
        if (config.enableSnapshotSelector) {
            items.push({
                    "xtype": "ownerdraw",
                    "html": config.snapshotText,
                    "name": "snapshotsText",
                    "anchor": "100%",
                    "hideLabel": true,
                    "style": "padding-top: 12px; padding-bottom: 12px;"
                }, {
                    "xtype": "selection",
                    "name": "snapshots",
                    "itemId": "snapshots",
                    "type": "select",
                    "anchor": "100%",
                    "hideLabel": true,
                    "value": CQ.reports.Report.SMODE_DAILY,
                    "options": [ {
                                "text": CQ.I18n.getMessage("Hourly snapshots"),
                                "value": CQ.reports.Report.SMODE_HOURLY
                            }, {
                                "text": CQ.I18n.getMessage("Daily snapshots"),
                                "value": CQ.reports.Report.SMODE_DAILY
                            }
                        ]
                });
        }
        if (config.warningText) {
            items.push({
                    "xtype": "ownerdraw",
                    "html": config.warningText,
                    "name": "warning",
                    "anchor": "100%",
                    "hideLabel": true,
                    "style": "padding-top: 12px;"
                });
        }
        CQ.Util.applyDefaults(config, {
                "width": 400,
                "resizable": false,
                "modal": true,
                "items": [ {
                            "xtype": "form",
                            "bodyStyle": "padding: 8px;",
                            "itemId": "form",
                            "items": items
                        }
                    ],
                "buttons": [ {
                            "xtype": "button",
                            "text": CQ.I18n.getMessage("Finish"),
                            "handler": this.onFinishReportClicked.createDelegate(this)
                        }, {
                            "xtype": "button",
                            "text": CQ.I18n.getMessage("Cancel"),
                            "handler": this.onCancelClicked.createDelegate(this)
                        }
                    ]
            });
        delete config.snapshotText;
        delete config.infoText;
        delete config.warningText;
        CQ.reports.ui.FinishReportWindow.superclass.constructor.call(this, config);
    },

    onFinishReportClicked: function() {
        var formPanel = this.items.get("form");
        var label = formPanel.items.get("label").getValue();
        var description = formPanel.items.get("description").getValue();
        var snapshotMode = null;
        if (this.enableSnapshotSelector) {
            snapshotMode = formPanel.items.get("snapshots").getValue();
        }
        if (this.okHandler) {
            this.okHandler.call(this, label, description, snapshotMode);
        }
        this.hide();
    },

    onCancelClicked: function() {
        this.hide();
    }

});

/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This class helps with editing.
 */
CQ.reports.utils.EditUtils = function() {

    return {

        /**
         * Gets the "editable" that represents the report component.
         *
         * @param {CQ.reports.Report} report The report to get the "editable" for
         */
        getReportEditable: function(report) {
            var editables = CQ.WCM.getEditables();
            return editables[report.reportPath];
        },

        /**
         * Gets the "editable" that is used for inserting columns at the end of the current
         * report.
         */
        getNewColumnEditable: function() {
            var refEditable = null;
            var editables = CQ.WCM.getEditables();
            for (var path in editables) {
                var pathLen = path.length;
                if ((pathLen > 0) && (path.charAt(pathLen - 1) == "*")) {
                    refEditable = editables[path];
                    break;
                }
            }
            return refEditable;
        },

        getDialog: function(report, dialogPath, config, defaultSuccess, defaultFailure) {
            var dialog = null;
            var allowed = dialogPath &&
                  (CQ.User.getCurrentUser().hasPermissionOn("read", dialogPath) !== false);
            if (allowed) {
                var dialogConfig = CQ.WCM.getDialogConfig(dialogPath);
                defaultSuccess = defaultSuccess || function(form, action) {
                        CQ.Util.reload();
                    };
                defaultFailure = defaultFailure || function(form, action) {
                        var response = CQ.HTTP.buildPostResponseFromHTML(action.response);
                        CQ.Ext.Msg.alert(response.headers[CQ.HTTP.HEADER_MESSAGE]);
                    };
                if (!dialogConfig.success) {
                    dialogConfig.success = defaultSuccess;
                }
                if (!dialogConfig.failure) {
                    dialogConfig.failure = defaultFailure;
                }
                if (config) {
                    CQ.Ext.apply(dialogConfig, config);
                }
                dialog = CQ.WCM.getDialog(dialogConfig, dialogPath);
            }
            return dialog;
        },

        showEditDialog: function(report) {
            var dialogPath = report.getComponentPath() + "/dialog";
            var propsDialog = CQ.reports.utils.EditUtils.getDialog(report, dialogPath, {
                    "title": CQ.I18n.getMessage("Edit Report")
                });
            if (propsDialog) {
                propsDialog.fieldEditLockMode = true;
                propsDialog.loadContent(report.getPagePath() + "/jcr:content");
                propsDialog.show();
            }
        },

        showFinishDialog: function(report, dialogPath, additionalConfig) {
            var finishDialog;
            var okHandler = function() {
                    var title = null;
                    var titleField = finishDialog.getField("./jcr:title");
                    if (titleField) {
                        title = titleField.getValue();
                    }
                    var description = null;
                    var descrField = finishDialog.getField("./jcr:description");
                    if (descrField) {
                        description = descrField.getValue();
                    }
                    var snapshotMode = null;
                    var snapshotSelector = finishDialog.getField("./report/snapshots");
                    if (snapshotSelector) {
                        snapshotMode = snapshotSelector.getValue();
                    }
                    if (additionalConfig && additionalConfig.okHandler) {
                        additionalConfig.okHandler(title, description, snapshotMode);
                    } else {
                        report.finish(title, description, snapshotMode);
                    }
                    finishDialog.hide();
                };
            finishDialog = CQ.reports.utils.EditUtils.getDialog(report, dialogPath, {
                    "buttons": [ {
                                "text": CQ.I18n.getMessage("Finish"),
                                "handler": okHandler
                            },
                            CQ.Dialog.CANCEL
                        ]
                });
            if (finishDialog) {
                finishDialog.loadContent(report.getPagePath() + "/jcr:content");
                finishDialog.show();
            }
        },

        /**
         * Creates a toolbar (if applicable) for the specified report.
         *
         * @param {CQ.reports.Report} report The report to create the toolbar for
         * @return {CQ.Ext.Toolbar} The toolbar; null if no toolbar is available
         */
        createToolbar: function(report) {
            var items = [ ];
            items.push(CQ.I18n.getMessage("Report"));
            if (report.isEditMode) {
                var reportEditable = CQ.reports.utils.EditUtils.getReportEditable(report);
                if (reportEditable) {
                    if (reportEditable.isActionEdit()) {
                        items.push({
                                "text": reportEditable.editText,
                                "handler": function() {
                                        CQ.reports.utils.EditUtils.showEditDialog(report);
                                    }
                            });
                    }
                }
            }
            if (!report.isServerInteractiveProcessing()) {
                items.push("-");
                items.push({
                        "text": CQ.I18n.getMessage("Load data"),
                        "handler": function() {
                                report.reload(true);
                            }
                    });
            }
            // todo add only if user actually has versioning permission
            var hasVersioningButton = report.isEditMode;
            if (hasVersioningButton) {
                items.push("-");
                var btnText = CQ.I18n.getMessage("Finish");
                var noGroupedColsText = CQ.I18n.getMessage("The report doesn't contain grouped columns.<br>Please ensure that at least one column is grouped before finishing the report.");
                items.push({
                        "text": btnText + "...",
                        "handler": function() {
                                if (report.createGroupedColumns().length == 0) {
                                    var oldMaxWidth = CQ.Ext.MessageBox.maxWidth;
                                    CQ.Ext.MessageBox.maxWidth = 400;
                                    CQ.Ext.MessageBox.alert(btnText, noGroupedColsText);
                                    CQ.Ext.MessageBox.maxWidth = oldMaxWidth;
                                    return;
                                }
                                CQ.reports.utils.EditUtils.showFinishDialog(report,
                                        report.getFinishDialog());
                            }
                    });
            }
            return (items.length > 1 ? new CQ.Ext.Toolbar({
                    "items": items
                }) : null);
        },

        changeGenericProps: function(column, alignPos) {
            var dialog = column.getGenericConfigDialog();
            if (dialog) {
                dialog.buttons = CQ.Dialog.OKCANCEL;
                var genericConfigDialog = CQ.WCM.getDialog(dialog);
                genericConfigDialog.form.on("actioncomplete", function() {
                        column.reload();
                    });
                if (alignPos) {
                    CQ.reports.utils.EditUtils.alignDialogToColHeader(genericConfigDialog,
                            alignPos, 260);
                }
                genericConfigDialog.loadContent(column.dataPath + "/settings/generic");
                genericConfigDialog.show();
            } else {
                CQ.Notification.notify(null,
                        CQ.I18n.getMessage("Missing dialog definition for generic column."));
            }
        },

        alignDialogToColHeader: function(dialog, alignPos, defaultWidth) {
            var size = dialog.getSize();
            var xPos = alignPos.x;
            if (size) {
                xPos -= size.width;
            } else {
                xPos -= defaultWidth;
            }
            if (xPos < 0) {
                xPos = 0;
            }
            dialog.setPagePosition(xPos, alignPos.y);
        },

        toggleSnapshotSwitch: function(isEnabled) {
            var fromClass = "cq-reports-snapshots-" + (isEnabled ? "off" : "on");
            var toClass = "cq-reports-snapshots-" + (isEnabled ? "on" : "off");
            var offSwitches = CQ.Ext.query("h2." + fromClass);
            var switchCnt = offSwitches.length;
            for (var s = 0; s < switchCnt; s++) {
                var toToggle = CQ.Ext.get(offSwitches[s]);
                toToggle.removeClass(fromClass);
                toToggle.addClass(toClass);
            }
        }

    };

}();
/*
 * Copyright 1997-2010 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */

/**
 * This is a helper class for synchronizing several asynchroneously executed stuff.
 * @class CQ.reports.utils.RequestSync
 */
CQ.reports.utils.RequestSync = CQ.Ext.extend(CQ.Ext.emptyFn, {

    /**
     * @cfg {Function} onLoadFn
     * The function to be executed if all registered requests have been completed
     * successfully
     */
    onLoadFn: null,

    /**
     * @cfg {Function} onErrorFn
     * The function to be executed if at least on of the requests has failed
     */
    onErrorFn: null,

    /**
     * @private
     */
    activeRequests: 0,

    /**
     * @private
     */
    hasErrors: false,

    /**
     * @private
     */
    isBlocked: false,

    constructor: function(config) {
        config = config || { };
        CQ.Util.applyDefaults(config, { });
        CQ.Ext.apply(this, config);
        this.activeRequests = 0;
        this.hasErrors = false;
        this.isBlocked = false;
    },

    /**
     * @private
     */
    checkFinishedAll: function() {
        if ((this.activeRequests == 0) && !this.isBlocked) {
            if (!this.hasErrors || (this.onErrorFn == null)) {
                this.onLoadFn();
            } else {
                this.onErrorFn();
            }
            this.hasErrors = false;
        }
    },

    /**
     * <p>"Blocks" the synchronization.</p>
     * <p>It is guaranteed that the handlers are only called after the next call to
     * {@link #unblock}.</p>
     */
    block: function() {
        this.isBlocked = true;
    },

    /**
     * <p>"Unblocks" the synchronization.</p>
     * <p>Handlers are only called in "unblocked" state.</p>
     */
    unblock: function() {
        this.isBlocked = false;
        this.checkFinishedAll();
    },

    /**
     * Registers a new asynchroneously executed request.
     */
    registerRequest: function() {
        this.activeRequests++;
    },

    /**
     * Called by each request to signal success.
     */
    finishWithSuccess: function() {
        this.activeRequests--;
        this.checkFinishedAll();
    },

    /**
     * Called by a request if an error has occured.
     */
    finishWithError: function() {
        this.activeRequests--;
        this.hasErrors = true;
        this.checkFinishedAll();
    }

});
/*
 * Raphael 1.5.2 - JavaScript Vector Library
 *
 * Copyright (c) 2010 Dmitry Baranovskiy (http://raphaeljs.com)
 * Licensed under the MIT (http://raphaeljs.com/license.html) license.
 */
(function () {
    function R() {
        if (R.is(arguments[0], array)) {
            var a = arguments[0],
                cnv = create[apply](R, a.splice(0, 3 + R.is(a[0], nu))),
                res = cnv.set();
            for (var i = 0, ii = a[length]; i < ii; i++) {
                var j = a[i] || {};
                elements[has](j.type) && res[push](cnv[j.type]().attr(j));
            }
            return res;
        }
        return create[apply](R, arguments);
    }
    R.version = "1.5.2";
    var separator = /[, ]+/,
        elements = {circle: 1, rect: 1, path: 1, ellipse: 1, text: 1, image: 1},
        formatrg = /\{(\d+)\}/g,
        proto = "prototype",
        has = "hasOwnProperty",
        doc = document,
        win = window,
        oldRaphael = {
            was: Object[proto][has].call(win, "CQ")
                    && Object[proto][has].call(win.CQ, "Raphael"),
            is: win.CQ.Raphael
        },
        Paper = function () {
            this.customAttributes = {};
        },
        paperproto,
        appendChild = "appendChild",
        apply = "apply",
        concat = "concat",
        supportsTouch = "createTouch" in doc,
        E = "",
        S = " ",
        Str = String,
        split = "split",
        events = "click dblclick mousedown mousemove mouseout mouseover mouseup touchstart touchmove touchend orientationchange touchcancel gesturestart gesturechange gestureend"[split](S),
        touchMap = {
            mousedown: "touchstart",
            mousemove: "touchmove",
            mouseup: "touchend"
        },
        join = "join",
        length = "length",
        lowerCase = Str[proto].toLowerCase,
        math = Math,
        mmax = math.max,
        mmin = math.min,
        abs = math.abs,
        pow = math.pow,
        PI = math.PI,
        nu = "number",
        string = "string",
        array = "array",
        toString = "toString",
        fillString = "fill",
        objectToString = Object[proto][toString],
        paper = {},
        push = "push",
        ISURL = /^url\(['"]?([^\)]+?)['"]?\)$/i,
        colourRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?)%?\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i,
        isnan = {"NaN": 1, "Infinity": 1, "-Infinity": 1},
        bezierrg = /^(?:cubic-)?bezier\(([^,]+),([^,]+),([^,]+),([^\)]+)\)/,
        round = math.round,
        setAttribute = "setAttribute",
        toFloat = parseFloat,
        toInt = parseInt,
        ms = " progid:DXImageTransform.Microsoft",
        upperCase = Str[proto].toUpperCase,
        availableAttrs = {blur: 0, "clip-rect": "0 0 1e9 1e9", cursor: "default", cx: 0, cy: 0, fill: "#fff", "fill-opacity": 1, font: '10px "Arial"', "font-family": '"Arial"', "font-size": "10", "font-style": "normal", "font-weight": 400, gradient: 0, height: 0, href: "http://raphaeljs.com/", opacity: 1, path: "M0,0", r: 0, rotation: 0, rx: 0, ry: 0, scale: "1 1", src: "", stroke: "#000", "stroke-dasharray": "", "stroke-linecap": "butt", "stroke-linejoin": "butt", "stroke-miterlimit": 0, "stroke-opacity": 1, "stroke-width": 1, target: "_blank", "text-anchor": "middle", title: "Raphael", translation: "0 0", width: 0, x: 0, y: 0},
        availableAnimAttrs = {along: "along", blur: nu, "clip-rect": "csv", cx: nu, cy: nu, fill: "colour", "fill-opacity": nu, "font-size": nu, height: nu, opacity: nu, path: "path", r: nu, rotation: "csv", rx: nu, ry: nu, scale: "csv", stroke: "colour", "stroke-opacity": nu, "stroke-width": nu, translation: "csv", width: nu, x: nu, y: nu},
        rp = "replace",
        animKeyFrames= /^(from|to|\d+%?)$/,
        commaSpaces = /\s*,\s*/,
        hsrg = {hs: 1, rg: 1},
        p2s = /,?([achlmqrstvxz]),?/gi,
        pathCommand = /([achlmqstvz])[\s,]*((-?\d*\.?\d*(?:e[-+]?\d+)?\s*,?\s*)+)/ig,
        pathValues = /(-?\d*\.?\d*(?:e[-+]?\d+)?)\s*,?\s*/ig,
        radial_gradient = /^r(?:\(([^,]+?)\s*,\s*([^\)]+?)\))?/,
        sortByKey = function (a, b) {
            return a.key - b.key;
        };

    R.type = (win.SVGAngle || doc.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") ? "SVG" : "VML");
    if (R.type == "VML") {
        var d = doc.createElement("div"),
            b;
        d.innerHTML = '<v:shape adj="1"/>';
        b = d.firstChild;
        b.style.behavior = "url(#default#VML)";
        if (!(b && typeof b.adj == "object")) {
            return R.type = null;
        }
        d = null;
    }
    R.svg = !(R.vml = R.type == "VML");
    Paper[proto] = R[proto];
    paperproto = Paper[proto];
    R._id = 0;
    R._oid = 0;
    R.fn = {};
    R.is = function (o, type) {
        type = lowerCase.call(type);
        if (type == "finite") {
            return !isnan[has](+o);
        }
        return  (type == "null" && o === null) ||
                (type == typeof o) ||
                (type == "object" && o === Object(o)) ||
                (type == "array" && Array.isArray && Array.isArray(o)) ||
                objectToString.call(o).slice(8, -1).toLowerCase() == type;
    };
    R.angle = function (x1, y1, x2, y2, x3, y3) {
        if (x3 == null) {
            var x = x1 - x2,
                y = y1 - y2;
            if (!x && !y) {
                return 0;
            }
            return ((x < 0) * 180 + math.atan(-y / -x) * 180 / PI + 360) % 360;
        } else {
            return R.angle(x1, y1, x3, y3) - R.angle(x2, y2, x3, y3);
        }
    };
    R.rad = function (deg) {
        return deg % 360 * PI / 180;
    };
    R.deg = function (rad) {
        return rad * 180 / PI % 360;
    };
    R.snapTo = function (values, value, tolerance) {
        tolerance = R.is(tolerance, "finite") ? tolerance : 10;
        if (R.is(values, array)) {
            var i = values.length;
            while (i--) if (abs(values[i] - value) <= tolerance) {
                return values[i];
            }
        } else {
            values = +values;
            var rem = value % values;
            if (rem < tolerance) {
                return value - rem;
            }
            if (rem > values - tolerance) {
                return value - rem + values;
            }
        }
        return value;
    };
    function createUUID() {
        // http://www.ietf.org/rfc/rfc4122.txt
        var s = [],
            i = 0;
        for (; i < 32; i++) {
            s[i] = (~~(math.random() * 16))[toString](16);
        }
        s[12] = 4;  // bits 12-15 of the time_hi_and_version field to 0010
        s[16] = ((s[16] & 3) | 8)[toString](16);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
        return "r-" + s[join]("");
    }

    R.setWindow = function (newwin) {
        win = newwin;
        doc = win.document;
    };
    // colour utilities
    var toHex = function (color) {
        if (R.vml) {
            // http://dean.edwards.name/weblog/2009/10/convert-any-colour-value-to-hex-in-msie/
            var trim = /^\s+|\s+$/g;
            var bod;
            try {
                var docum = new ActiveXObject("htmlfile");
                docum.write("<body>");
                docum.close();
                bod = docum.body;
            } catch(e) {
                bod = createPopup().document.body;
            }
            var range = bod.createTextRange();
            toHex = cacher(function (color) {
                try {
                    bod.style.color = Str(color)[rp](trim, E);
                    var value = range.queryCommandValue("ForeColor");
                    value = ((value & 255) << 16) | (value & 65280) | ((value & 16711680) >>> 16);
                    return "#" + ("000000" + value[toString](16)).slice(-6);
                } catch(e) {
                    return "none";
                }
            });
        } else {
            var i = doc.createElement("i");
            i.title = "Rapha\xebl Colour Picker";
            i.style.display = "none";
            doc.body[appendChild](i);
            toHex = cacher(function (color) {
                i.style.color = color;
                return doc.defaultView.getComputedStyle(i, E).getPropertyValue("color");
            });
        }
        return toHex(color);
    },
    hsbtoString = function () {
        return "hsb(" + [this.h, this.s, this.b] + ")";
    },
    hsltoString = function () {
        return "hsl(" + [this.h, this.s, this.l] + ")";
    },
    rgbtoString = function () {
        return this.hex;
    };
    R.hsb2rgb = function (h, s, b, o) {
        if (R.is(h, "object") && "h" in h && "s" in h && "b" in h) {
            b = h.b;
            s = h.s;
            h = h.h;
            o = h.o;
        }
        return R.hsl2rgb(h, s, b / 2, o);
    };
    R.hsl2rgb = function (h, s, l, o) {
        if (R.is(h, "object") && "h" in h && "s" in h && "l" in h) {
            l = h.l;
            s = h.s;
            h = h.h;
        }
        if (h > 1 || s > 1 || l > 1) {
            h /= 360;
            s /= 100;
            l /= 100;
        }
        var rgb = {},
            channels = ["r", "g", "b"],
            t2, t1, t3, r, g, b;
        if (!s) {
            rgb = {
                r: l,
                g: l,
                b: l
            };
        } else {
            if (l < .5) {
                t2 = l * (1 + s);
            } else {
                t2 = l + s - l * s;
            }
            t1 = 2 * l - t2;
            for (var i = 0; i < 3; i++) {
                t3 = h + 1 / 3 * -(i - 1);
                t3 < 0 && t3++;
                t3 > 1 && t3--;
                if (t3 * 6 < 1) {
                    rgb[channels[i]] = t1 + (t2 - t1) * 6 * t3;
                } else if (t3 * 2 < 1) {
                    rgb[channels[i]] = t2;
                } else if (t3 * 3 < 2) {
                    rgb[channels[i]] = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
                } else {
                    rgb[channels[i]] = t1;
                }
            }
        }
        rgb.r *= 255;
        rgb.g *= 255;
        rgb.b *= 255;
        rgb.hex = "#" + (16777216 | rgb.b | (rgb.g << 8) | (rgb.r << 16)).toString(16).slice(1);
        R.is(o, "finite") && (rgb.opacity = o);
        rgb.toString = rgbtoString;
        return rgb;
    };
    R.rgb2hsb = function (red, green, blue) {
        if (green == null && R.is(red, "object") && "r" in red && "g" in red && "b" in red) {
            blue = red.b;
            green = red.g;
            red = red.r;
        }
        if (green == null && R.is(red, string)) {
            var clr = R.getRGB(red);
            red = clr.r;
            green = clr.g;
            blue = clr.b;
        }
        if (red > 1 || green > 1 || blue > 1) {
            red /= 255;
            green /= 255;
            blue /= 255;
        }
        var max = mmax(red, green, blue),
            min = mmin(red, green, blue),
            hue,
            saturation,
            brightness = max;
        if (min == max) {
            return {h: 0, s: 0, b: max, toString: hsbtoString};
        } else {
            var delta = (max - min);
            saturation = delta / max;
            if (red == max) {
                hue = (green - blue) / delta;
            } else if (green == max) {
                hue = 2 + ((blue - red) / delta);
            } else {
                hue = 4 + ((red - green) / delta);
            }
            hue /= 6;
            hue < 0 && hue++;
            hue > 1 && hue--;
        }
        return {h: hue, s: saturation, b: brightness, toString: hsbtoString};
    };
    R.rgb2hsl = function (red, green, blue) {
        if (green == null && R.is(red, "object") && "r" in red && "g" in red && "b" in red) {
            blue = red.b;
            green = red.g;
            red = red.r;
        }
        if (green == null && R.is(red, string)) {
            var clr = R.getRGB(red);
            red = clr.r;
            green = clr.g;
            blue = clr.b;
        }
        if (red > 1 || green > 1 || blue > 1) {
            red /= 255;
            green /= 255;
            blue /= 255;
        }
        var max = mmax(red, green, blue),
            min = mmin(red, green, blue),
            h,
            s,
            l = (max + min) / 2,
            hsl;
        if (min == max) {
            hsl =  {h: 0, s: 0, l: l};
        } else {
            var delta = max - min;
            s = l < .5 ? delta / (max + min) : delta / (2 - max - min);
            if (red == max) {
                h = (green - blue) / delta;
            } else if (green == max) {
                h = 2 + (blue - red) / delta;
            } else {
                h = 4 + (red - green) / delta;
            }
            h /= 6;
            h < 0 && h++;
            h > 1 && h--;
            hsl = {h: h, s: s, l: l};
        }
        hsl.toString = hsltoString;
        return hsl;
    };
    R._path2string = function () {
        return this.join(",")[rp](p2s, "$1");
    };
    function cacher(f, scope, postprocessor) {
        function newf() {
            var arg = Array[proto].slice.call(arguments, 0),
                args = arg[join]("\u25ba"),
                cache = newf.cache = newf.cache || {},
                count = newf.count = newf.count || [];
            if (cache[has](args)) {
                return postprocessor ? postprocessor(cache[args]) : cache[args];
            }
            count[length] >= 1e3 && delete cache[count.shift()];
            count[push](args);
            cache[args] = f[apply](scope, arg);
            return postprocessor ? postprocessor(cache[args]) : cache[args];
        }
        return newf;
    }

    R.getRGB = cacher(function (colour) {
        if (!colour || !!((colour = Str(colour)).indexOf("-") + 1)) {
            return {r: -1, g: -1, b: -1, hex: "none", error: 1};
        }
        if (colour == "none") {
            return {r: -1, g: -1, b: -1, hex: "none"};
        }
        !(hsrg[has](colour.toLowerCase().substring(0, 2)) || colour.charAt() == "#") && (colour = toHex(colour));
        var res,
            red,
            green,
            blue,
            opacity,
            t,
            values,
            rgb = colour.match(colourRegExp);
        if (rgb) {
            if (rgb[2]) {
                blue = toInt(rgb[2].substring(5), 16);
                green = toInt(rgb[2].substring(3, 5), 16);
                red = toInt(rgb[2].substring(1, 3), 16);
            }
            if (rgb[3]) {
                blue = toInt((t = rgb[3].charAt(3)) + t, 16);
                green = toInt((t = rgb[3].charAt(2)) + t, 16);
                red = toInt((t = rgb[3].charAt(1)) + t, 16);
            }
            if (rgb[4]) {
                values = rgb[4][split](commaSpaces);
                red = toFloat(values[0]);
                values[0].slice(-1) == "%" && (red *= 2.55);
                green = toFloat(values[1]);
                values[1].slice(-1) == "%" && (green *= 2.55);
                blue = toFloat(values[2]);
                values[2].slice(-1) == "%" && (blue *= 2.55);
                rgb[1].toLowerCase().slice(0, 4) == "rgba" && (opacity = toFloat(values[3]));
                values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
            }
            if (rgb[5]) {
                values = rgb[5][split](commaSpaces);
                red = toFloat(values[0]);
                values[0].slice(-1) == "%" && (red *= 2.55);
                green = toFloat(values[1]);
                values[1].slice(-1) == "%" && (green *= 2.55);
                blue = toFloat(values[2]);
                values[2].slice(-1) == "%" && (blue *= 2.55);
                (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
                rgb[1].toLowerCase().slice(0, 4) == "hsba" && (opacity = toFloat(values[3]));
                values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
                return R.hsb2rgb(red, green, blue, opacity);
            }
            if (rgb[6]) {
                values = rgb[6][split](commaSpaces);
                red = toFloat(values[0]);
                values[0].slice(-1) == "%" && (red *= 2.55);
                green = toFloat(values[1]);
                values[1].slice(-1) == "%" && (green *= 2.55);
                blue = toFloat(values[2]);
                values[2].slice(-1) == "%" && (blue *= 2.55);
                (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
                rgb[1].toLowerCase().slice(0, 4) == "hsla" && (opacity = toFloat(values[3]));
                values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
                return R.hsl2rgb(red, green, blue, opacity);
            }
            rgb = {r: red, g: green, b: blue};
            rgb.hex = "#" + (16777216 | blue | (green << 8) | (red << 16)).toString(16).slice(1);
            R.is(opacity, "finite") && (rgb.opacity = opacity);
            return rgb;
        }
        return {r: -1, g: -1, b: -1, hex: "none", error: 1};
    }, R);
    R.getColor = function (value) {
        var start = this.getColor.start = this.getColor.start || {h: 0, s: 1, b: value || .75},
            rgb = this.hsb2rgb(start.h, start.s, start.b);
        start.h += .075;
        if (start.h > 1) {
            start.h = 0;
            start.s -= .2;
            start.s <= 0 && (this.getColor.start = {h: 0, s: 1, b: start.b});
        }
        return rgb.hex;
    };
    R.getColor.reset = function () {
        delete this.start;
    };
    // path utilities
    R.parsePathString = cacher(function (pathString) {
        if (!pathString) {
            return null;
        }
        var paramCounts = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0},
            data = [];
        if (R.is(pathString, array) && R.is(pathString[0], array)) { // rough assumption
            data = pathClone(pathString);
        }
        if (!data[length]) {
            Str(pathString)[rp](pathCommand, function (a, b, c) {
                var params = [],
                    name = lowerCase.call(b);
                c[rp](pathValues, function (a, b) {
                    b && params[push](+b);
                });
                if (name == "m" && params[length] > 2) {
                    data[push]([b][concat](params.splice(0, 2)));
                    name = "l";
                    b = b == "m" ? "l" : "L";
                }
                while (params[length] >= paramCounts[name]) {
                    data[push]([b][concat](params.splice(0, paramCounts[name])));
                    if (!paramCounts[name]) {
                        break;
                    }
                }
            });
        }
        data[toString] = R._path2string;
        return data;
    });
    R.findDotsAtSegment = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
        var t1 = 1 - t,
            x = pow(t1, 3) * p1x + pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + pow(t, 3) * p2x,
            y = pow(t1, 3) * p1y + pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + pow(t, 3) * p2y,
            mx = p1x + 2 * t * (c1x - p1x) + t * t * (c2x - 2 * c1x + p1x),
            my = p1y + 2 * t * (c1y - p1y) + t * t * (c2y - 2 * c1y + p1y),
            nx = c1x + 2 * t * (c2x - c1x) + t * t * (p2x - 2 * c2x + c1x),
            ny = c1y + 2 * t * (c2y - c1y) + t * t * (p2y - 2 * c2y + c1y),
            ax = (1 - t) * p1x + t * c1x,
            ay = (1 - t) * p1y + t * c1y,
            cx = (1 - t) * c2x + t * p2x,
            cy = (1 - t) * c2y + t * p2y,
            alpha = (90 - math.atan((mx - nx) / (my - ny)) * 180 / PI);
        (mx > nx || my < ny) && (alpha += 180);
        return {x: x, y: y, m: {x: mx, y: my}, n: {x: nx, y: ny}, start: {x: ax, y: ay}, end: {x: cx, y: cy}, alpha: alpha};
    };
    var pathDimensions = cacher(function (path) {
        if (!path) {
            return {x: 0, y: 0, width: 0, height: 0};
        }
        path = path2curve(path);
        var x = 0,
            y = 0,
            X = [],
            Y = [],
            p;
        for (var i = 0, ii = path[length]; i < ii; i++) {
            p = path[i];
            if (p[0] == "M") {
                x = p[1];
                y = p[2];
                X[push](x);
                Y[push](y);
            } else {
                var dim = curveDim(x, y, p[1], p[2], p[3], p[4], p[5], p[6]);
                X = X[concat](dim.min.x, dim.max.x);
                Y = Y[concat](dim.min.y, dim.max.y);
                x = p[5];
                y = p[6];
            }
        }
        var xmin = mmin[apply](0, X),
            ymin = mmin[apply](0, Y);
        return {
            x: xmin,
            y: ymin,
            width: mmax[apply](0, X) - xmin,
            height: mmax[apply](0, Y) - ymin
        };
    }),
        pathClone = function (pathArray) {
            var res = [];
            if (!R.is(pathArray, array) || !R.is(pathArray && pathArray[0], array)) { // rough assumption
                pathArray = R.parsePathString(pathArray);
            }
            for (var i = 0, ii = pathArray[length]; i < ii; i++) {
                res[i] = [];
                for (var j = 0, jj = pathArray[i][length]; j < jj; j++) {
                    res[i][j] = pathArray[i][j];
                }
            }
            res[toString] = R._path2string;
            return res;
        },
        pathToRelative = cacher(function (pathArray) {
            if (!R.is(pathArray, array) || !R.is(pathArray && pathArray[0], array)) { // rough assumption
                pathArray = R.parsePathString(pathArray);
            }
            var res = [],
                x = 0,
                y = 0,
                mx = 0,
                my = 0,
                start = 0;
            if (pathArray[0][0] == "M") {
                x = pathArray[0][1];
                y = pathArray[0][2];
                mx = x;
                my = y;
                start++;
                res[push](["M", x, y]);
            }
            for (var i = start, ii = pathArray[length]; i < ii; i++) {
                var r = res[i] = [],
                    pa = pathArray[i];
                if (pa[0] != lowerCase.call(pa[0])) {
                    r[0] = lowerCase.call(pa[0]);
                    switch (r[0]) {
                        case "a":
                            r[1] = pa[1];
                            r[2] = pa[2];
                            r[3] = pa[3];
                            r[4] = pa[4];
                            r[5] = pa[5];
                            r[6] = +(pa[6] - x).toFixed(3);
                            r[7] = +(pa[7] - y).toFixed(3);
                            break;
                        case "v":
                            r[1] = +(pa[1] - y).toFixed(3);
                            break;
                        case "m":
                            mx = pa[1];
                            my = pa[2];
                        default:
                            for (var j = 1, jj = pa[length]; j < jj; j++) {
                                r[j] = +(pa[j] - ((j % 2) ? x : y)).toFixed(3);
                            }
                    }
                } else {
                    r = res[i] = [];
                    if (pa[0] == "m") {
                        mx = pa[1] + x;
                        my = pa[2] + y;
                    }
                    for (var k = 0, kk = pa[length]; k < kk; k++) {
                        res[i][k] = pa[k];
                    }
                }
                var len = res[i][length];
                switch (res[i][0]) {
                    case "z":
                        x = mx;
                        y = my;
                        break;
                    case "h":
                        x += +res[i][len - 1];
                        break;
                    case "v":
                        y += +res[i][len - 1];
                        break;
                    default:
                        x += +res[i][len - 2];
                        y += +res[i][len - 1];
                }
            }
            res[toString] = R._path2string;
            return res;
        }, 0, pathClone),
        pathToAbsolute = cacher(function (pathArray) {
            if (!R.is(pathArray, array) || !R.is(pathArray && pathArray[0], array)) { // rough assumption
                pathArray = R.parsePathString(pathArray);
            }
            var res = [],
                x = 0,
                y = 0,
                mx = 0,
                my = 0,
                start = 0;
            if (pathArray[0][0] == "M") {
                x = +pathArray[0][1];
                y = +pathArray[0][2];
                mx = x;
                my = y;
                start++;
                res[0] = ["M", x, y];
            }
            for (var i = start, ii = pathArray[length]; i < ii; i++) {
                var r = res[i] = [],
                    pa = pathArray[i];
                if (pa[0] != upperCase.call(pa[0])) {
                    r[0] = upperCase.call(pa[0]);
                    switch (r[0]) {
                        case "A":
                            r[1] = pa[1];
                            r[2] = pa[2];
                            r[3] = pa[3];
                            r[4] = pa[4];
                            r[5] = pa[5];
                            r[6] = +(pa[6] + x);
                            r[7] = +(pa[7] + y);
                            break;
                        case "V":
                            r[1] = +pa[1] + y;
                            break;
                        case "H":
                            r[1] = +pa[1] + x;
                            break;
                        case "M":
                            mx = +pa[1] + x;
                            my = +pa[2] + y;
                        default:
                            for (var j = 1, jj = pa[length]; j < jj; j++) {
                                r[j] = +pa[j] + ((j % 2) ? x : y);
                            }
                    }
                } else {
                    for (var k = 0, kk = pa[length]; k < kk; k++) {
                        res[i][k] = pa[k];
                    }
                }
                switch (r[0]) {
                    case "Z":
                        x = mx;
                        y = my;
                        break;
                    case "H":
                        x = r[1];
                        break;
                    case "V":
                        y = r[1];
                        break;
                    case "M":
                        mx = res[i][res[i][length] - 2];
                        my = res[i][res[i][length] - 1];
                    default:
                        x = res[i][res[i][length] - 2];
                        y = res[i][res[i][length] - 1];
                }
            }
            res[toString] = R._path2string;
            return res;
        }, null, pathClone),
        l2c = function (x1, y1, x2, y2) {
            return [x1, y1, x2, y2, x2, y2];
        },
        q2c = function (x1, y1, ax, ay, x2, y2) {
            var _13 = 1 / 3,
                _23 = 2 / 3;
            return [
                    _13 * x1 + _23 * ax,
                    _13 * y1 + _23 * ay,
                    _13 * x2 + _23 * ax,
                    _13 * y2 + _23 * ay,
                    x2,
                    y2
                ];
        },
        a2c = function (x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
            // for more information of where this math came from visit:
            // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
            var _120 = PI * 120 / 180,
                rad = PI / 180 * (+angle || 0),
                res = [],
                xy,
                rotate = cacher(function (x, y, rad) {
                    var X = x * math.cos(rad) - y * math.sin(rad),
                        Y = x * math.sin(rad) + y * math.cos(rad);
                    return {x: X, y: Y};
                });
            if (!recursive) {
                xy = rotate(x1, y1, -rad);
                x1 = xy.x;
                y1 = xy.y;
                xy = rotate(x2, y2, -rad);
                x2 = xy.x;
                y2 = xy.y;
                var cos = math.cos(PI / 180 * angle),
                    sin = math.sin(PI / 180 * angle),
                    x = (x1 - x2) / 2,
                    y = (y1 - y2) / 2;
                var h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
                if (h > 1) {
                    h = math.sqrt(h);
                    rx = h * rx;
                    ry = h * ry;
                }
                var rx2 = rx * rx,
                    ry2 = ry * ry,
                    k = (large_arc_flag == sweep_flag ? -1 : 1) *
                        math.sqrt(abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))),
                    cx = k * rx * y / ry + (x1 + x2) / 2,
                    cy = k * -ry * x / rx + (y1 + y2) / 2,
                    f1 = math.asin(((y1 - cy) / ry).toFixed(9)),
                    f2 = math.asin(((y2 - cy) / ry).toFixed(9));

                f1 = x1 < cx ? PI - f1 : f1;
                f2 = x2 < cx ? PI - f2 : f2;
                f1 < 0 && (f1 = PI * 2 + f1);
                f2 < 0 && (f2 = PI * 2 + f2);
                if (sweep_flag && f1 > f2) {
                    f1 = f1 - PI * 2;
                }
                if (!sweep_flag && f2 > f1) {
                    f2 = f2 - PI * 2;
                }
            } else {
                f1 = recursive[0];
                f2 = recursive[1];
                cx = recursive[2];
                cy = recursive[3];
            }
            var df = f2 - f1;
            if (abs(df) > _120) {
                var f2old = f2,
                    x2old = x2,
                    y2old = y2;
                f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
                x2 = cx + rx * math.cos(f2);
                y2 = cy + ry * math.sin(f2);
                res = a2c(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
            }
            df = f2 - f1;
            var c1 = math.cos(f1),
                s1 = math.sin(f1),
                c2 = math.cos(f2),
                s2 = math.sin(f2),
                t = math.tan(df / 4),
                hx = 4 / 3 * rx * t,
                hy = 4 / 3 * ry * t,
                m1 = [x1, y1],
                m2 = [x1 + hx * s1, y1 - hy * c1],
                m3 = [x2 + hx * s2, y2 - hy * c2],
                m4 = [x2, y2];
            m2[0] = 2 * m1[0] - m2[0];
            m2[1] = 2 * m1[1] - m2[1];
            if (recursive) {
                return [m2, m3, m4][concat](res);
            } else {
                res = [m2, m3, m4][concat](res)[join]()[split](",");
                var newres = [];
                for (var i = 0, ii = res[length]; i < ii; i++) {
                    newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x;
                }
                return newres;
            }
        },
        findDotAtSegment = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
            var t1 = 1 - t;
            return {
                x: pow(t1, 3) * p1x + pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + pow(t, 3) * p2x,
                y: pow(t1, 3) * p1y + pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + pow(t, 3) * p2y
            };
        },
        curveDim = cacher(function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
            var a = (c2x - 2 * c1x + p1x) - (p2x - 2 * c2x + c1x),
                b = 2 * (c1x - p1x) - 2 * (c2x - c1x),
                c = p1x - c1x,
                t1 = (-b + math.sqrt(b * b - 4 * a * c)) / 2 / a,
                t2 = (-b - math.sqrt(b * b - 4 * a * c)) / 2 / a,
                y = [p1y, p2y],
                x = [p1x, p2x],
                dot;
            abs(t1) > "1e12" && (t1 = .5);
            abs(t2) > "1e12" && (t2 = .5);
            if (t1 > 0 && t1 < 1) {
                dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
                x[push](dot.x);
                y[push](dot.y);
            }
            if (t2 > 0 && t2 < 1) {
                dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
                x[push](dot.x);
                y[push](dot.y);
            }
            a = (c2y - 2 * c1y + p1y) - (p2y - 2 * c2y + c1y);
            b = 2 * (c1y - p1y) - 2 * (c2y - c1y);
            c = p1y - c1y;
            t1 = (-b + math.sqrt(b * b - 4 * a * c)) / 2 / a;
            t2 = (-b - math.sqrt(b * b - 4 * a * c)) / 2 / a;
            abs(t1) > "1e12" && (t1 = .5);
            abs(t2) > "1e12" && (t2 = .5);
            if (t1 > 0 && t1 < 1) {
                dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
                x[push](dot.x);
                y[push](dot.y);
            }
            if (t2 > 0 && t2 < 1) {
                dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
                x[push](dot.x);
                y[push](dot.y);
            }
            return {
                min: {x: mmin[apply](0, x), y: mmin[apply](0, y)},
                max: {x: mmax[apply](0, x), y: mmax[apply](0, y)}
            };
        }),
        path2curve = cacher(function (path, path2) {
            var p = pathToAbsolute(path),
                p2 = path2 && pathToAbsolute(path2),
                attrs = {x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null},
                attrs2 = {x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null},
                processPath = function (path, d) {
                    var nx, ny;
                    if (!path) {
                        return ["C", d.x, d.y, d.x, d.y, d.x, d.y];
                    }
                    !(path[0] in {T:1, Q:1}) && (d.qx = d.qy = null);
                    switch (path[0]) {
                        case "M":
                            d.X = path[1];
                            d.Y = path[2];
                            break;
                        case "A":
                            path = ["C"][concat](a2c[apply](0, [d.x, d.y][concat](path.slice(1))));
                            break;
                        case "S":
                            nx = d.x + (d.x - (d.bx || d.x));
                            ny = d.y + (d.y - (d.by || d.y));
                            path = ["C", nx, ny][concat](path.slice(1));
                            break;
                        case "T":
                            d.qx = d.x + (d.x - (d.qx || d.x));
                            d.qy = d.y + (d.y - (d.qy || d.y));
                            path = ["C"][concat](q2c(d.x, d.y, d.qx, d.qy, path[1], path[2]));
                            break;
                        case "Q":
                            d.qx = path[1];
                            d.qy = path[2];
                            path = ["C"][concat](q2c(d.x, d.y, path[1], path[2], path[3], path[4]));
                            break;
                        case "L":
                            path = ["C"][concat](l2c(d.x, d.y, path[1], path[2]));
                            break;
                        case "H":
                            path = ["C"][concat](l2c(d.x, d.y, path[1], d.y));
                            break;
                        case "V":
                            path = ["C"][concat](l2c(d.x, d.y, d.x, path[1]));
                            break;
                        case "Z":
                            path = ["C"][concat](l2c(d.x, d.y, d.X, d.Y));
                            break;
                    }
                    return path;
                },
                fixArc = function (pp, i) {
                    if (pp[i][length] > 7) {
                        pp[i].shift();
                        var pi = pp[i];
                        while (pi[length]) {
                            pp.splice(i++, 0, ["C"][concat](pi.splice(0, 6)));
                        }
                        pp.splice(i, 1);
                        ii = mmax(p[length], p2 && p2[length] || 0);
                    }
                },
                fixM = function (path1, path2, a1, a2, i) {
                    if (path1 && path2 && path1[i][0] == "M" && path2[i][0] != "M") {
                        path2.splice(i, 0, ["M", a2.x, a2.y]);
                        a1.bx = 0;
                        a1.by = 0;
                        a1.x = path1[i][1];
                        a1.y = path1[i][2];
                        ii = mmax(p[length], p2 && p2[length] || 0);
                    }
                };
            for (var i = 0, ii = mmax(p[length], p2 && p2[length] || 0); i < ii; i++) {
                p[i] = processPath(p[i], attrs);
                fixArc(p, i);
                p2 && (p2[i] = processPath(p2[i], attrs2));
                p2 && fixArc(p2, i);
                fixM(p, p2, attrs, attrs2, i);
                fixM(p2, p, attrs2, attrs, i);
                var seg = p[i],
                    seg2 = p2 && p2[i],
                    seglen = seg[length],
                    seg2len = p2 && seg2[length];
                attrs.x = seg[seglen - 2];
                attrs.y = seg[seglen - 1];
                attrs.bx = toFloat(seg[seglen - 4]) || attrs.x;
                attrs.by = toFloat(seg[seglen - 3]) || attrs.y;
                attrs2.bx = p2 && (toFloat(seg2[seg2len - 4]) || attrs2.x);
                attrs2.by = p2 && (toFloat(seg2[seg2len - 3]) || attrs2.y);
                attrs2.x = p2 && seg2[seg2len - 2];
                attrs2.y = p2 && seg2[seg2len - 1];
            }
            return p2 ? [p, p2] : p;
        }, null, pathClone),
        parseDots = cacher(function (gradient) {
            var dots = [];
            for (var i = 0, ii = gradient[length]; i < ii; i++) {
                var dot = {},
                    par = gradient[i].match(/^([^:]*):?([\d\.]*)/);
                dot.color = R.getRGB(par[1]);
                if (dot.color.error) {
                    return null;
                }
                dot.color = dot.color.hex;
                par[2] && (dot.offset = par[2] + "%");
                dots[push](dot);
            }
            for (i = 1, ii = dots[length] - 1; i < ii; i++) {
                if (!dots[i].offset) {
                    var start = toFloat(dots[i - 1].offset || 0),
                        end = 0;
                    for (var j = i + 1; j < ii; j++) {
                        if (dots[j].offset) {
                            end = dots[j].offset;
                            break;
                        }
                    }
                    if (!end) {
                        end = 100;
                        j = ii;
                    }
                    end = toFloat(end);
                    var d = (end - start) / (j - i + 1);
                    for (; i < j; i++) {
                        start += d;
                        dots[i].offset = start + "%";
                    }
                }
            }
            return dots;
        }),
        getContainer = function (x, y, w, h) {
            var container;
            if (R.is(x, string) || R.is(x, "object")) {
                container = R.is(x, string) ? doc.getElementById(x) : x;
                if (container.tagName) {
                    if (y == null) {
                        return {
                            container: container,
                            width: container.style.pixelWidth || container.offsetWidth,
                            height: container.style.pixelHeight || container.offsetHeight
                        };
                    } else {
                        return {container: container, width: y, height: w};
                    }
                }
            } else {
                return {container: 1, x: x, y: y, width: w, height: h};
            }
        },
        plugins = function (con, add) {
            var that = this;
            for (var prop in add) {
                if (add[has](prop) && !(prop in con)) {
                    switch (typeof add[prop]) {
                        case "function":
                            (function (f) {
                                con[prop] = con === that ? f : function () { return f[apply](that, arguments); };
                            })(add[prop]);
                        break;
                        case "object":
                            con[prop] = con[prop] || {};
                            plugins.call(this, con[prop], add[prop]);
                        break;
                        default:
                            con[prop] = add[prop];
                        break;
                    }
                }
            }
        },
        tear = function (el, paper) {
            el == paper.top && (paper.top = el.prev);
            el == paper.bottom && (paper.bottom = el.next);
            el.next && (el.next.prev = el.prev);
            el.prev && (el.prev.next = el.next);
        },
        tofront = function (el, paper) {
            if (paper.top === el) {
                return;
            }
            tear(el, paper);
            el.next = null;
            el.prev = paper.top;
            paper.top.next = el;
            paper.top = el;
        },
        toback = function (el, paper) {
            if (paper.bottom === el) {
                return;
            }
            tear(el, paper);
            el.next = paper.bottom;
            el.prev = null;
            paper.bottom.prev = el;
            paper.bottom = el;
        },
        insertafter = function (el, el2, paper) {
            tear(el, paper);
            el2 == paper.top && (paper.top = el);
            el2.next && (el2.next.prev = el);
            el.next = el2.next;
            el.prev = el2;
            el2.next = el;
        },
        insertbefore = function (el, el2, paper) {
            tear(el, paper);
            el2 == paper.bottom && (paper.bottom = el);
            el2.prev && (el2.prev.next = el);
            el.prev = el2.prev;
            el2.prev = el;
            el.next = el2;
        },
        removed = function (methodname) {
            return function () {
                throw new Error("Rapha\xebl: you are calling to method \u201c" + methodname + "\u201d of removed object");
            };
        };
    R.pathToRelative = pathToRelative;
    // SVG
    if (R.svg) {
        paperproto.svgns = "http://www.w3.org/2000/svg";
        paperproto.xlink = "http://www.w3.org/1999/xlink";
        round = function (num) {
            return +num + (~~num === num) * .5;
        };
        var $ = function (el, attr) {
            if (attr) {
                for (var key in attr) {
                    if (attr[has](key)) {
                        el[setAttribute](key, Str(attr[key]));
                    }
                }
            } else {
                el = doc.createElementNS(paperproto.svgns, el);
                el.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
                return el;
            }
        };
        R[toString] = function () {
            return  "Your browser supports SVG.\nYou are running Rapha\xebl " + this.version;
        };
        var thePath = function (pathString, SVG) {
            var el = $("path");
            SVG.canvas && SVG.canvas[appendChild](el);
            var p = new Element(el, SVG);
            p.type = "path";
            setFillAndStroke(p, {fill: "none", stroke: "#000", path: pathString});
            return p;
        };
        var addGradientFill = function (o, gradient, SVG) {
            var type = "linear",
                fx = .5, fy = .5,
                s = o.style;
            gradient = Str(gradient)[rp](radial_gradient, function (all, _fx, _fy) {
                type = "radial";
                if (_fx && _fy) {
                    fx = toFloat(_fx);
                    fy = toFloat(_fy);
                    var dir = ((fy > .5) * 2 - 1);
                    pow(fx - .5, 2) + pow(fy - .5, 2) > .25 &&
                        (fy = math.sqrt(.25 - pow(fx - .5, 2)) * dir + .5) &&
                        fy != .5 &&
                        (fy = fy.toFixed(5) - 1e-5 * dir);
                }
                return E;
            });
            gradient = gradient[split](/\s*\-\s*/);
            if (type == "linear") {
                var angle = gradient.shift();
                angle = -toFloat(angle);
                if (isNaN(angle)) {
                    return null;
                }
                var vector = [0, 0, math.cos(angle * PI / 180), math.sin(angle * PI / 180)],
                    max = 1 / (mmax(abs(vector[2]), abs(vector[3])) || 1);
                vector[2] *= max;
                vector[3] *= max;
                if (vector[2] < 0) {
                    vector[0] = -vector[2];
                    vector[2] = 0;
                }
                if (vector[3] < 0) {
                    vector[1] = -vector[3];
                    vector[3] = 0;
                }
            }
            var dots = parseDots(gradient);
            if (!dots) {
                return null;
            }
            var id = o.getAttribute(fillString);
            id = id.match(/^url\(#(.*)\)$/);
            id && SVG.defs.removeChild(doc.getElementById(id[1]));

            var el = $(type + "Gradient");
            el.id = createUUID();
            $(el, type == "radial" ? {fx: fx, fy: fy} : {x1: vector[0], y1: vector[1], x2: vector[2], y2: vector[3]});
            SVG.defs[appendChild](el);
            for (var i = 0, ii = dots[length]; i < ii; i++) {
                var stop = $("stop");
                $(stop, {
                    offset: dots[i].offset ? dots[i].offset : !i ? "0%" : "100%",
                    "stop-color": dots[i].color || "#fff"
                });
                el[appendChild](stop);
            }
            $(o, {
                fill: "url(#" + el.id + ")",
                opacity: 1,
                "fill-opacity": 1
            });
            s.fill = E;
            s.opacity = 1;
            s.fillOpacity = 1;
            return 1;
        };
        var updatePosition = function (o) {
            var bbox = o.getBBox();
            $(o.pattern, {patternTransform: R.format("translate({0},{1})", bbox.x, bbox.y)});
        };
        var setFillAndStroke = function (o, params) {
            var dasharray = {
                    "": [0],
                    "none": [0],
                    "-": [3, 1],
                    ".": [1, 1],
                    "-.": [3, 1, 1, 1],
                    "-..": [3, 1, 1, 1, 1, 1],
                    ". ": [1, 3],
                    "- ": [4, 3],
                    "--": [8, 3],
                    "- .": [4, 3, 1, 3],
                    "--.": [8, 3, 1, 3],
                    "--..": [8, 3, 1, 3, 1, 3]
                },
                node = o.node,
                attrs = o.attrs,
                rot = o.rotate(),
                addDashes = function (o, value) {
                    value = dasharray[lowerCase.call(value)];
                    if (value) {
                        var width = o.attrs["stroke-width"] || "1",
                            butt = {round: width, square: width, butt: 0}[o.attrs["stroke-linecap"] || params["stroke-linecap"]] || 0,
                            dashes = [];
                        var i = value[length];
                        while (i--) {
                            dashes[i] = value[i] * width + ((i % 2) ? 1 : -1) * butt;
                        }
                        $(node, {"stroke-dasharray": dashes[join](",")});
                    }
                };
            params[has]("rotation") && (rot = params.rotation);
            var rotxy = Str(rot)[split](separator);
            if (!(rotxy.length - 1)) {
                rotxy = null;
            } else {
                rotxy[1] = +rotxy[1];
                rotxy[2] = +rotxy[2];
            }
            toFloat(rot) && o.rotate(0, true);
            for (var att in params) {
                if (params[has](att)) {
                    if (!availableAttrs[has](att)) {
                        continue;
                    }
                    var value = params[att];
                    attrs[att] = value;
                    switch (att) {
                        case "blur":
                            o.blur(value);
                            break;
                        case "rotation":
                            o.rotate(value, true);
                            break;
                        case "href":
                        case "title":
                        case "target":
                            var pn = node.parentNode;
                            if (lowerCase.call(pn.tagName) != "a") {
                                var hl = $("a");
                                pn.insertBefore(hl, node);
                                hl[appendChild](node);
                                pn = hl;
                            }
                            if (att == "target" && value == "blank") {
                                pn.setAttributeNS(o.paper.xlink, "show", "new");
                            } else {
                                pn.setAttributeNS(o.paper.xlink, att, value);
                            }
                            break;
                        case "cursor":
                            node.style.cursor = value;
                            break;
                        case "clip-rect":
                            var rect = Str(value)[split](separator);
                            if (rect[length] == 4) {
                                o.clip && o.clip.parentNode.parentNode.removeChild(o.clip.parentNode);
                                var el = $("clipPath"),
                                    rc = $("rect");
                                el.id = createUUID();
                                $(rc, {
                                    x: rect[0],
                                    y: rect[1],
                                    width: rect[2],
                                    height: rect[3]
                                });
                                el[appendChild](rc);
                                o.paper.defs[appendChild](el);
                                $(node, {"clip-path": "url(#" + el.id + ")"});
                                o.clip = rc;
                            }
                            if (!value) {
                                var clip = doc.getElementById(node.getAttribute("clip-path")[rp](/(^url\(#|\)$)/g, E));
                                clip && clip.parentNode.removeChild(clip);
                                $(node, {"clip-path": E});
                                delete o.clip;
                            }
                        break;
                        case "path":
                            if (o.type == "path") {
                                $(node, {d: value ? attrs.path = pathToAbsolute(value) : "M0,0"});
                            }
                            break;
                        case "width":
                            node[setAttribute](att, value);
                            if (attrs.fx) {
                                att = "x";
                                value = attrs.x;
                            } else {
                                break;
                            }
                        case "x":
                            if (attrs.fx) {
                                value = -attrs.x - (attrs.width || 0);
                            }
                        case "rx":
                            if (att == "rx" && o.type == "rect") {
                                break;
                            }
                        case "cx":
                            rotxy && (att == "x" || att == "cx") && (rotxy[1] += value - attrs[att]);
                            node[setAttribute](att, value);
                            o.pattern && updatePosition(o);
                            break;
                        case "height":
                            node[setAttribute](att, value);
                            if (attrs.fy) {
                                att = "y";
                                value = attrs.y;
                            } else {
                                break;
                            }
                        case "y":
                            if (attrs.fy) {
                                value = -attrs.y - (attrs.height || 0);
                            }
                        case "ry":
                            if (att == "ry" && o.type == "rect") {
                                break;
                            }
                        case "cy":
                            rotxy && (att == "y" || att == "cy") && (rotxy[2] += value - attrs[att]);
                            node[setAttribute](att, value);
                            o.pattern && updatePosition(o);
                            break;
                        case "r":
                            if (o.type == "rect") {
                                $(node, {rx: value, ry: value});
                            } else {
                                node[setAttribute](att, value);
                            }
                            break;
                        case "src":
                            if (o.type == "image") {
                                node.setAttributeNS(o.paper.xlink, "href", value);
                            }
                            break;
                        case "stroke-width":
                            node.style.strokeWidth = value;
                            // Need following line for Firefox
                            node[setAttribute](att, value);
                            if (attrs["stroke-dasharray"]) {
                                addDashes(o, attrs["stroke-dasharray"]);
                            }
                            break;
                        case "stroke-dasharray":
                            addDashes(o, value);
                            break;
                        case "translation":
                            var xy = Str(value)[split](separator);
                            xy[0] = +xy[0] || 0;
                            xy[1] = +xy[1] || 0;
                            if (rotxy) {
                                rotxy[1] += xy[0];
                                rotxy[2] += xy[1];
                            }
                            translate.call(o, xy[0], xy[1]);
                            break;
                        case "scale":
                            xy = Str(value)[split](separator);
                            o.scale(+xy[0] || 1, +xy[1] || +xy[0] || 1, isNaN(toFloat(xy[2])) ? null : +xy[2], isNaN(toFloat(xy[3])) ? null : +xy[3]);
                            break;
                        case fillString:
                            var isURL = Str(value).match(ISURL);
                            if (isURL) {
                                el = $("pattern");
                                var ig = $("image");
                                el.id = createUUID();
                                $(el, {x: 0, y: 0, patternUnits: "userSpaceOnUse", height: 1, width: 1});
                                $(ig, {x: 0, y: 0});
                                ig.setAttributeNS(o.paper.xlink, "href", isURL[1]);
                                el[appendChild](ig);

                                var img = doc.createElement("img");
                                img.style.cssText = "position:absolute;left:-9999em;top-9999em";
                                img.onload = function () {
                                    $(el, {width: this.offsetWidth, height: this.offsetHeight});
                                    $(ig, {width: this.offsetWidth, height: this.offsetHeight});
                                    doc.body.removeChild(this);
                                    o.paper.safari();
                                };
                                doc.body[appendChild](img);
                                img.src = isURL[1];
                                o.paper.defs[appendChild](el);
                                node.style.fill = "url(#" + el.id + ")";
                                $(node, {fill: "url(#" + el.id + ")"});
                                o.pattern = el;
                                o.pattern && updatePosition(o);
                                break;
                            }
                            var clr = R.getRGB(value);
                            if (!clr.error) {
                                delete params.gradient;
                                delete attrs.gradient;
                                !R.is(attrs.opacity, "undefined") &&
                                    R.is(params.opacity, "undefined") &&
                                    $(node, {opacity: attrs.opacity});
                                !R.is(attrs["fill-opacity"], "undefined") &&
                                    R.is(params["fill-opacity"], "undefined") &&
                                    $(node, {"fill-opacity": attrs["fill-opacity"]});
                            } else if ((({circle: 1, ellipse: 1})[has](o.type) || Str(value).charAt() != "r") && addGradientFill(node, value, o.paper)) {
                                attrs.gradient = value;
                                attrs.fill = "none";
                                break;
                            }
                            clr[has]("opacity") && $(node, {"fill-opacity": clr.opacity > 1 ? clr.opacity / 100 : clr.opacity});
                        case "stroke":
                            clr = R.getRGB(value);
                            node[setAttribute](att, clr.hex);
                            att == "stroke" && clr[has]("opacity") && $(node, {"stroke-opacity": clr.opacity > 1 ? clr.opacity / 100 : clr.opacity});
                            break;
                        case "gradient":
                            (({circle: 1, ellipse: 1})[has](o.type) || Str(value).charAt() != "r") && addGradientFill(node, value, o.paper);
                            break;
                        case "opacity":
                            if (attrs.gradient && !attrs[has]("stroke-opacity")) {
                                $(node, {"stroke-opacity": value > 1 ? value / 100 : value});
                            }
                            // fall
                        case "fill-opacity":
                            if (attrs.gradient) {
                                var gradient = doc.getElementById(node.getAttribute(fillString)[rp](/^url\(#|\)$/g, E));
                                if (gradient) {
                                    var stops = gradient.getElementsByTagName("stop");
                                    stops[stops[length] - 1][setAttribute]("stop-opacity", value);
                                }
                                break;
                            }
                        default:
                            att == "font-size" && (value = toInt(value, 10) + "px");
                            var cssrule = att[rp](/(\-.)/g, function (w) {
                                return upperCase.call(w.substring(1));
                            });
                            node.style[cssrule] = value;
                            // Need following line for Firefox
                            node[setAttribute](att, value);
                            break;
                    }
                }
            }

            tuneText(o, params);
            if (rotxy) {
                o.rotate(rotxy.join(S));
            } else {
                toFloat(rot) && o.rotate(rot, true);
            }
        };
        var leading = 1.2,
        tuneText = function (el, params) {
            if (el.type != "text" || !(params[has]("text") || params[has]("font") || params[has]("font-size") || params[has]("x") || params[has]("y"))) {
                return;
            }
            var a = el.attrs,
                node = el.node,
                fontSize = node.firstChild ? toInt(doc.defaultView.getComputedStyle(node.firstChild, E).getPropertyValue("font-size"), 10) : 10;

            if (params[has]("text")) {
                a.text = params.text;
                while (node.firstChild) {
                    node.removeChild(node.firstChild);
                }
                var texts = Str(params.text)[split]("\n");
                for (var i = 0, ii = texts[length]; i < ii; i++) if (texts[i]) {
                    var tspan = $("tspan");
                    i && $(tspan, {dy: fontSize * leading, x: a.x});
                    tspan[appendChild](doc.createTextNode(texts[i]));
                    node[appendChild](tspan);
                }
            } else {
                texts = node.getElementsByTagName("tspan");
                for (i = 0, ii = texts[length]; i < ii; i++) {
                    i && $(texts[i], {dy: fontSize * leading, x: a.x});
                }
            }
            $(node, {y: a.y});
            var bb = el.getBBox(),
                dif = a.y - (bb.y + bb.height / 2);
            dif && R.is(dif, "finite") && $(node, {y: a.y + dif});
        },
        Element = function (node, svg) {
            var X = 0,
                Y = 0;
            this[0] = node;
            this.id = R._oid++;
            this.node = node;
            node.raphael = this;
            this.paper = svg;
            this.attrs = this.attrs || {};
            this.transformations = []; // rotate, translate, scale
            this._ = {
                tx: 0,
                ty: 0,
                rt: {deg: 0, cx: 0, cy: 0},
                sx: 1,
                sy: 1
            };
            !svg.bottom && (svg.bottom = this);
            this.prev = svg.top;
            svg.top && (svg.top.next = this);
            svg.top = this;
            this.next = null;
        };
        var elproto = Element[proto];
        Element[proto].rotate = function (deg, cx, cy) {
            if (this.removed) {
                return this;
            }
            if (deg == null) {
                if (this._.rt.cx) {
                    return [this._.rt.deg, this._.rt.cx, this._.rt.cy][join](S);
                }
                return this._.rt.deg;
            }
            var bbox = this.getBBox();
            deg = Str(deg)[split](separator);
            if (deg[length] - 1) {
                cx = toFloat(deg[1]);
                cy = toFloat(deg[2]);
            }
            deg = toFloat(deg[0]);
            if (cx != null && cx !== false) {
                this._.rt.deg = deg;
            } else {
                this._.rt.deg += deg;
            }
            (cy == null) && (cx = null);
            this._.rt.cx = cx;
            this._.rt.cy = cy;
            cx = cx == null ? bbox.x + bbox.width / 2 : cx;
            cy = cy == null ? bbox.y + bbox.height / 2 : cy;
            if (this._.rt.deg) {
                this.transformations[0] = R.format("rotate({0} {1} {2})", this._.rt.deg, cx, cy);
                this.clip && $(this.clip, {transform: R.format("rotate({0} {1} {2})", -this._.rt.deg, cx, cy)});
            } else {
                this.transformations[0] = E;
                this.clip && $(this.clip, {transform: E});
            }
            $(this.node, {transform: this.transformations[join](S)});
            return this;
        };
        Element[proto].hide = function () {
            !this.removed && (this.node.style.display = "none");
            return this;
        };
        Element[proto].show = function () {
            !this.removed && (this.node.style.display = "");
            return this;
        };
        Element[proto].remove = function () {
            if (this.removed) {
                return;
            }
            tear(this, this.paper);
            this.node.parentNode.removeChild(this.node);
            for (var i in this) {
                delete this[i];
            }
            this.removed = true;
        };
        Element[proto].getBBox = function () {
            if (this.removed) {
                return this;
            }
            if (this.type == "path") {
                return pathDimensions(this.attrs.path);
            }
            if (this.node.style.display == "none") {
                this.show();
                var hide = true;
            }
            var bbox = {};
            try {
                bbox = this.node.getBBox();
            } catch(e) {
                // Firefox 3.0.x plays badly here
            } finally {
                bbox = bbox || {};
            }
            if (this.type == "text") {
                bbox = {x: bbox.x, y: Infinity, width: 0, height: 0};
                for (var i = 0, ii = this.node.getNumberOfChars(); i < ii; i++) {
                    var bb = this.node.getExtentOfChar(i);
                    (bb.y < bbox.y) && (bbox.y = bb.y);
                    (bb.y + bb.height - bbox.y > bbox.height) && (bbox.height = bb.y + bb.height - bbox.y);
                    (bb.x + bb.width - bbox.x > bbox.width) && (bbox.width = bb.x + bb.width - bbox.x);
                }
            }
            hide && this.hide();
            return bbox;
        };
        Element[proto].attr = function (name, value) {
            if (this.removed) {
                return this;
            }
            if (name == null) {
                var res = {};
                for (var i in this.attrs) if (this.attrs[has](i)) {
                    res[i] = this.attrs[i];
                }
                this._.rt.deg && (res.rotation = this.rotate());
                (this._.sx != 1 || this._.sy != 1) && (res.scale = this.scale());
                res.gradient && res.fill == "none" && (res.fill = res.gradient) && delete res.gradient;
                return res;
            }
            if (value == null && R.is(name, string)) {
                if (name == "translation") {
                    return translate.call(this);
                }
                if (name == "rotation") {
                    return this.rotate();
                }
                if (name == "scale") {
                    return this.scale();
                }
                if (name == fillString && this.attrs.fill == "none" && this.attrs.gradient) {
                    return this.attrs.gradient;
                }
                return this.attrs[name];
            }
            if (value == null && R.is(name, array)) {
                var values = {};
                for (var j = 0, jj = name.length; j < jj; j++) {
                    values[name[j]] = this.attr(name[j]);
                }
                return values;
            }
            if (value != null) {
                var params = {};
                params[name] = value;
            } else if (name != null && R.is(name, "object")) {
                params = name;
            }
            for (var key in this.paper.customAttributes) if (this.paper.customAttributes[has](key) && params[has](key) && R.is(this.paper.customAttributes[key], "function")) {
                var par = this.paper.customAttributes[key].apply(this, [][concat](params[key]));
                this.attrs[key] = params[key];
                for (var subkey in par) if (par[has](subkey)) {
                    params[subkey] = par[subkey];
                }
            }
            setFillAndStroke(this, params);
            return this;
        };
        Element[proto].toFront = function () {
            if (this.removed) {
                return this;
            }
            this.node.parentNode[appendChild](this.node);
            var svg = this.paper;
            svg.top != this && tofront(this, svg);
            return this;
        };
        Element[proto].toBack = function () {
            if (this.removed) {
                return this;
            }
            if (this.node.parentNode.firstChild != this.node) {
                this.node.parentNode.insertBefore(this.node, this.node.parentNode.firstChild);
                toback(this, this.paper);
                var svg = this.paper;
            }
            return this;
        };
        Element[proto].insertAfter = function (element) {
            if (this.removed) {
                return this;
            }
            var node = element.node || element[element.length - 1].node;
            if (node.nextSibling) {
                node.parentNode.insertBefore(this.node, node.nextSibling);
            } else {
                node.parentNode[appendChild](this.node);
            }
            insertafter(this, element, this.paper);
            return this;
        };
        Element[proto].insertBefore = function (element) {
            if (this.removed) {
                return this;
            }
            var node = element.node || element[0].node;
            node.parentNode.insertBefore(this.node, node);
            insertbefore(this, element, this.paper);
            return this;
        };
        Element[proto].blur = function (size) {
            // Experimental. No Safari support. Use it on your own risk.
            var t = this;
            if (+size !== 0) {
                var fltr = $("filter"),
                    blur = $("feGaussianBlur");
                t.attrs.blur = size;
                fltr.id = createUUID();
                $(blur, {stdDeviation: +size || 1.5});
                fltr.appendChild(blur);
                t.paper.defs.appendChild(fltr);
                t._blur = fltr;
                $(t.node, {filter: "url(#" + fltr.id + ")"});
            } else {
                if (t._blur) {
                    t._blur.parentNode.removeChild(t._blur);
                    delete t._blur;
                    delete t.attrs.blur;
                }
                t.node.removeAttribute("filter");
            }
        };
        var theCircle = function (svg, x, y, r) {
            var el = $("circle");
            svg.canvas && svg.canvas[appendChild](el);
            var res = new Element(el, svg);
            res.attrs = {cx: x, cy: y, r: r, fill: "none", stroke: "#000"};
            res.type = "circle";
            $(el, res.attrs);
            return res;
        },
        theRect = function (svg, x, y, w, h, r) {
            var el = $("rect");
            svg.canvas && svg.canvas[appendChild](el);
            var res = new Element(el, svg);
            res.attrs = {x: x, y: y, width: w, height: h, r: r || 0, rx: r || 0, ry: r || 0, fill: "none", stroke: "#000"};
            res.type = "rect";
            $(el, res.attrs);
            return res;
        },
        theEllipse = function (svg, x, y, rx, ry) {
            var el = $("ellipse");
            svg.canvas && svg.canvas[appendChild](el);
            var res = new Element(el, svg);
            res.attrs = {cx: x, cy: y, rx: rx, ry: ry, fill: "none", stroke: "#000"};
            res.type = "ellipse";
            $(el, res.attrs);
            return res;
        },
        theImage = function (svg, src, x, y, w, h) {
            var el = $("image");
            $(el, {x: x, y: y, width: w, height: h, preserveAspectRatio: "none"});
            el.setAttributeNS(svg.xlink, "href", src);
            svg.canvas && svg.canvas[appendChild](el);
            var res = new Element(el, svg);
            res.attrs = {x: x, y: y, width: w, height: h, src: src};
            res.type = "image";
            return res;
        },
        theText = function (svg, x, y, text) {
            var el = $("text");
            $(el, {x: x, y: y, "text-anchor": "middle"});
            svg.canvas && svg.canvas[appendChild](el);
            var res = new Element(el, svg);
            res.attrs = {x: x, y: y, "text-anchor": "middle", text: text, font: availableAttrs.font, stroke: "none", fill: "#000"};
            res.type = "text";
            setFillAndStroke(res, res.attrs);
            return res;
        },
        setSize = function (width, height) {
            this.width = width || this.width;
            this.height = height || this.height;
            this.canvas[setAttribute]("width", this.width);
            this.canvas[setAttribute]("height", this.height);
            return this;
        },
        create = function () {
            var con = getContainer[apply](0, arguments),
                container = con && con.container,
                x = con.x,
                y = con.y,
                width = con.width,
                height = con.height;
            if (!container) {
                throw new Error("SVG container not found.");
            }
            var cnvs = $("svg");
            x = x || 0;
            y = y || 0;
            width = width || 512;
            height = height || 342;
            $(cnvs, {
                xmlns: "http://www.w3.org/2000/svg",
                version: 1.1,
                width: width,
                height: height
            });
            if (container == 1) {
                cnvs.style.cssText = "position:absolute;left:" + x + "px;top:" + y + "px";
                doc.body[appendChild](cnvs);
            } else {
                if (container.firstChild) {
                    container.insertBefore(cnvs, container.firstChild);
                } else {
                    container[appendChild](cnvs);
                }
            }
            container = new Paper;
            container.width = width;
            container.height = height;
            container.canvas = cnvs;
            plugins.call(container, container, R.fn);
            container.clear();
            return container;
        };
        paperproto.clear = function () {
            var c = this.canvas;
            while (c.firstChild) {
                c.removeChild(c.firstChild);
            }
            this.bottom = this.top = null;
            (this.desc = $("desc"))[appendChild](doc.createTextNode("Created with Rapha\xebl"));
            c[appendChild](this.desc);
            c[appendChild](this.defs = $("defs"));
        };
        paperproto.remove = function () {
            this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas);
            for (var i in this) {
                this[i] = removed(i);
            }
        };
    }

    // VML
    if (R.vml) {
        var map = {M: "m", L: "l", C: "c", Z: "x", m: "t", l: "r", c: "v", z: "x"},
            bites = /([clmz]),?([^clmz]*)/gi,
            blurregexp = / progid:\S+Blur\([^\)]+\)/g,
            val = /-?[^,\s-]+/g,
            coordsize = 1e3 + S + 1e3,
            zoom = 10,
            pathlike = {path: 1, rect: 1},
            path2vml = function (path) {
                var total =  /[ahqstv]/ig,
                    command = pathToAbsolute;
                Str(path).match(total) && (command = path2curve);
                total = /[clmz]/g;
                if (command == pathToAbsolute && !Str(path).match(total)) {
                    var res = Str(path)[rp](bites, function (all, command, args) {
                        var vals = [],
                            isMove = lowerCase.call(command) == "m",
                            res = map[command];
                        args[rp](val, function (value) {
                            if (isMove && vals[length] == 2) {
                                res += vals + map[command == "m" ? "l" : "L"];
                                vals = [];
                            }
                            vals[push](round(value * zoom));
                        });
                        return res + vals;
                    });
                    return res;
                }
                var pa = command(path), p, r;
                res = [];
                for (var i = 0, ii = pa[length]; i < ii; i++) {
                    p = pa[i];
                    r = lowerCase.call(pa[i][0]);
                    r == "z" && (r = "x");
                    for (var j = 1, jj = p[length]; j < jj; j++) {
                        r += round(p[j] * zoom) + (j != jj - 1 ? "," : E);
                    }
                    res[push](r);
                }
                return res[join](S);
            };

        R[toString] = function () {
            return  "Your browser doesn\u2019t support SVG. Falling down to VML.\nYou are running Rapha\xebl " + this.version;
        };
        thePath = function (pathString, vml) {
            var g = createNode("group");
            g.style.cssText = "position:absolute;left:0;top:0;width:" + vml.width + "px;height:" + vml.height + "px";
            g.coordsize = vml.coordsize;
            g.coordorigin = vml.coordorigin;
            var el = createNode("shape"), ol = el.style;
            ol.width = vml.width + "px";
            ol.height = vml.height + "px";
            el.coordsize = coordsize;
            el.coordorigin = vml.coordorigin;
            g[appendChild](el);
            var p = new Element(el, g, vml),
                attr = {fill: "none", stroke: "#000"};
            pathString && (attr.path = pathString);
            p.type = "path";
            p.path = [];
            p.Path = E;
            setFillAndStroke(p, attr);
            vml.canvas[appendChild](g);
            return p;
        };
        setFillAndStroke = function (o, params) {
            o.attrs = o.attrs || {};
            var node = o.node,
                a = o.attrs,
                s = node.style,
                xy,
                newpath = (params.x != a.x || params.y != a.y || params.width != a.width || params.height != a.height || params.r != a.r) && o.type == "rect",
                res = o;

            for (var par in params) if (params[has](par)) {
                a[par] = params[par];
            }
            if (newpath) {
                a.path = rectPath(a.x, a.y, a.width, a.height, a.r);
                o.X = a.x;
                o.Y = a.y;
                o.W = a.width;
                o.H = a.height;
            }
            params.href && (node.href = params.href);
            params.title && (node.title = params.title);
            params.target && (node.target = params.target);
            params.cursor && (s.cursor = params.cursor);
            "blur" in params && o.blur(params.blur);
            if (params.path && o.type == "path" || newpath) {
                node.path = path2vml(a.path);
            }
            if (params.rotation != null) {
                o.rotate(params.rotation, true);
            }
            if (params.translation) {
                xy = Str(params.translation)[split](separator);
                translate.call(o, xy[0], xy[1]);
                if (o._.rt.cx != null) {
                    o._.rt.cx +=+ xy[0];
                    o._.rt.cy +=+ xy[1];
                    o.setBox(o.attrs, xy[0], xy[1]);
                }
            }
            if (params.scale) {
                xy = Str(params.scale)[split](separator);
                o.scale(+xy[0] || 1, +xy[1] || +xy[0] || 1, +xy[2] || null, +xy[3] || null);
            }
            if ("clip-rect" in params) {
                var rect = Str(params["clip-rect"])[split](separator);
                if (rect[length] == 4) {
                    rect[2] = +rect[2] + (+rect[0]);
                    rect[3] = +rect[3] + (+rect[1]);
                    var div = node.clipRect || doc.createElement("div"),
                        dstyle = div.style,
                        group = node.parentNode;
                    dstyle.clip = R.format("rect({1}px {2}px {3}px {0}px)", rect);
                    if (!node.clipRect) {
                        dstyle.position = "absolute";
                        dstyle.top = 0;
                        dstyle.left = 0;
                        dstyle.width = o.paper.width + "px";
                        dstyle.height = o.paper.height + "px";
                        group.parentNode.insertBefore(div, group);
                        div[appendChild](group);
                        node.clipRect = div;
                    }
                }
                if (!params["clip-rect"]) {
                    node.clipRect && (node.clipRect.style.clip = E);
                }
            }
            if (o.type == "image" && params.src) {
                node.src = params.src;
            }
            if (o.type == "image" && params.opacity) {
                node.filterOpacity = ms + ".Alpha(opacity=" + (params.opacity * 100) + ")";
                s.filter = (node.filterMatrix || E) + (node.filterOpacity || E);
            }
            params.font && (s.font = params.font);
            params["font-family"] && (s.fontFamily = '"' + params["font-family"][split](",")[0][rp](/^['"]+|['"]+$/g, E) + '"');
            params["font-size"] && (s.fontSize = params["font-size"]);
            params["font-weight"] && (s.fontWeight = params["font-weight"]);
            params["font-style"] && (s.fontStyle = params["font-style"]);
            if (params.opacity != null ||
                params["stroke-width"] != null ||
                params.fill != null ||
                params.stroke != null ||
                params["stroke-width"] != null ||
                params["stroke-opacity"] != null ||
                params["fill-opacity"] != null ||
                params["stroke-dasharray"] != null ||
                params["stroke-miterlimit"] != null ||
                params["stroke-linejoin"] != null ||
                params["stroke-linecap"] != null) {
                node = o.shape || node;
                var fill = (node.getElementsByTagName(fillString) && node.getElementsByTagName(fillString)[0]),
                    newfill = false;
                !fill && (newfill = fill = createNode(fillString));
                if ("fill-opacity" in params || "opacity" in params) {
                    var opacity = ((+a["fill-opacity"] + 1 || 2) - 1) * ((+a.opacity + 1 || 2) - 1) * ((+R.getRGB(params.fill).o + 1 || 2) - 1);
                    opacity = mmin(mmax(opacity, 0), 1);
                    fill.opacity = opacity;
                }
                params.fill && (fill.on = true);
                if (fill.on == null || params.fill == "none") {
                    fill.on = false;
                }
                if (fill.on && params.fill) {
                    var isURL = params.fill.match(ISURL);
                    if (isURL) {
                        fill.src = isURL[1];
                        fill.type = "tile";
                    } else {
                        fill.color = R.getRGB(params.fill).hex;
                        fill.src = E;
                        fill.type = "solid";
                        if (R.getRGB(params.fill).error && (res.type in {circle: 1, ellipse: 1} || Str(params.fill).charAt() != "r") && addGradientFill(res, params.fill)) {
                            a.fill = "none";
                            a.gradient = params.fill;
                        }
                    }
                }
                newfill && node[appendChild](fill);
                var stroke = (node.getElementsByTagName("stroke") && node.getElementsByTagName("stroke")[0]),
                newstroke = false;
                !stroke && (newstroke = stroke = createNode("stroke"));
                if ((params.stroke && params.stroke != "none") ||
                    params["stroke-width"] ||
                    params["stroke-opacity"] != null ||
                    params["stroke-dasharray"] ||
                    params["stroke-miterlimit"] ||
                    params["stroke-linejoin"] ||
                    params["stroke-linecap"]) {
                    stroke.on = true;
                }
                (params.stroke == "none" || stroke.on == null || params.stroke == 0 || params["stroke-width"] == 0) && (stroke.on = false);
                var strokeColor = R.getRGB(params.stroke);
                stroke.on && params.stroke && (stroke.color = strokeColor.hex);
                opacity = ((+a["stroke-opacity"] + 1 || 2) - 1) * ((+a.opacity + 1 || 2) - 1) * ((+strokeColor.o + 1 || 2) - 1);
                var width = (toFloat(params["stroke-width"]) || 1) * .75;
                opacity = mmin(mmax(opacity, 0), 1);
                params["stroke-width"] == null && (width = a["stroke-width"]);
                params["stroke-width"] && (stroke.weight = width);
                width && width < 1 && (opacity *= width) && (stroke.weight = 1);
                stroke.opacity = opacity;

                params["stroke-linejoin"] && (stroke.joinstyle = params["stroke-linejoin"] || "miter");
                stroke.miterlimit = params["stroke-miterlimit"] || 8;
                params["stroke-linecap"] && (stroke.endcap = params["stroke-linecap"] == "butt" ? "flat" : params["stroke-linecap"] == "square" ? "square" : "round");
                if (params["stroke-dasharray"]) {
                    var dasharray = {
                        "-": "shortdash",
                        ".": "shortdot",
                        "-.": "shortdashdot",
                        "-..": "shortdashdotdot",
                        ". ": "dot",
                        "- ": "dash",
                        "--": "longdash",
                        "- .": "dashdot",
                        "--.": "longdashdot",
                        "--..": "longdashdotdot"
                    };
                    stroke.dashstyle = dasharray[has](params["stroke-dasharray"]) ? dasharray[params["stroke-dasharray"]] : E;
                }
                newstroke && node[appendChild](stroke);
            }
            if (res.type == "text") {
                s = res.paper.span.style;
                a.font && (s.font = a.font);
                a["font-family"] && (s.fontFamily = a["font-family"]);
                a["font-size"] && (s.fontSize = a["font-size"]);
                a["font-weight"] && (s.fontWeight = a["font-weight"]);
                a["font-style"] && (s.fontStyle = a["font-style"]);
                res.node.string && (res.paper.span.innerHTML = Str(res.node.string)[rp](/</g, "&#60;")[rp](/&/g, "&#38;")[rp](/\n/g, "<br>"));
                res.W = a.w = res.paper.span.offsetWidth;
                res.H = a.h = res.paper.span.offsetHeight;
                res.X = a.x;
                res.Y = a.y + round(res.H / 2);

                // text-anchor emulationm
                switch (a["text-anchor"]) {
                    case "start":
                        res.node.style["v-text-align"] = "left";
                        res.bbx = round(res.W / 2);
                    break;
                    case "end":
                        res.node.style["v-text-align"] = "right";
                        res.bbx = -round(res.W / 2);
                    break;
                    default:
                        res.node.style["v-text-align"] = "center";
                    break;
                }
            }
        };
        addGradientFill = function (o, gradient) {
            o.attrs = o.attrs || {};
            var attrs = o.attrs,
                fill,
                type = "linear",
                fxfy = ".5 .5";
            o.attrs.gradient = gradient;
            gradient = Str(gradient)[rp](radial_gradient, function (all, fx, fy) {
                type = "radial";
                if (fx && fy) {
                    fx = toFloat(fx);
                    fy = toFloat(fy);
                    pow(fx - .5, 2) + pow(fy - .5, 2) > .25 && (fy = math.sqrt(.25 - pow(fx - .5, 2)) * ((fy > .5) * 2 - 1) + .5);
                    fxfy = fx + S + fy;
                }
                return E;
            });
            gradient = gradient[split](/\s*\-\s*/);
            if (type == "linear") {
                var angle = gradient.shift();
                angle = -toFloat(angle);
                if (isNaN(angle)) {
                    return null;
                }
            }
            var dots = parseDots(gradient);
            if (!dots) {
                return null;
            }
            o = o.shape || o.node;
            fill = o.getElementsByTagName(fillString)[0] || createNode(fillString);
            !fill.parentNode && o.appendChild(fill);
            if (dots[length]) {
                fill.on = true;
                fill.method = "none";
                fill.color = dots[0].color;
                fill.color2 = dots[dots[length] - 1].color;
                var clrs = [];
                for (var i = 0, ii = dots[length]; i < ii; i++) {
                    dots[i].offset && clrs[push](dots[i].offset + S + dots[i].color);
                }
                fill.colors && (fill.colors.value = clrs[length] ? clrs[join]() : "0% " + fill.color);
                if (type == "radial") {
                    fill.type = "gradientradial";
                    fill.focus = "100%";
                    fill.focussize = fxfy;
                    fill.focusposition = fxfy;
                } else {
                    fill.type = "gradient";
                    fill.angle = (270 - angle) % 360;
                }
            }
            return 1;
        };
        Element = function (node, group, vml) {
            var Rotation = 0,
                RotX = 0,
                RotY = 0,
                Scale = 1;
            this[0] = node;
            this.id = R._oid++;
            this.node = node;
            node.raphael = this;
            this.X = 0;
            this.Y = 0;
            this.attrs = {};
            this.Group = group;
            this.paper = vml;
            this._ = {
                tx: 0,
                ty: 0,
                rt: {deg:0},
                sx: 1,
                sy: 1
            };
            !vml.bottom && (vml.bottom = this);
            this.prev = vml.top;
            vml.top && (vml.top.next = this);
            vml.top = this;
            this.next = null;
        };
        elproto = Element[proto];
        elproto.rotate = function (deg, cx, cy) {
            if (this.removed) {
                return this;
            }
            if (deg == null) {
                if (this._.rt.cx) {
                    return [this._.rt.deg, this._.rt.cx, this._.rt.cy][join](S);
                }
                return this._.rt.deg;
            }
            deg = Str(deg)[split](separator);
            if (deg[length] - 1) {
                cx = toFloat(deg[1]);
                cy = toFloat(deg[2]);
            }
            deg = toFloat(deg[0]);
            if (cx != null) {
                this._.rt.deg = deg;
            } else {
                this._.rt.deg += deg;
            }
            cy == null && (cx = null);
            this._.rt.cx = cx;
            this._.rt.cy = cy;
            this.setBox(this.attrs, cx, cy);
            this.Group.style.rotation = this._.rt.deg;
            // gradient fix for rotation. TODO
            // var fill = (this.shape || this.node).getElementsByTagName(fillString);
            // fill = fill[0] || {};
            // var b = ((360 - this._.rt.deg) - 270) % 360;
            // !R.is(fill.angle, "undefined") && (fill.angle = b);
            return this;
        };
        elproto.setBox = function (params, cx, cy) {
            if (this.removed) {
                return this;
            }
            var gs = this.Group.style,
                os = (this.shape && this.shape.style) || this.node.style;
            params = params || {};
            for (var i in params) if (params[has](i)) {
                this.attrs[i] = params[i];
            }
            cx = cx || this._.rt.cx;
            cy = cy || this._.rt.cy;
            var attr = this.attrs,
                x,
                y,
                w,
                h;
            switch (this.type) {
                case "circle":
                    x = attr.cx - attr.r;
                    y = attr.cy - attr.r;
                    w = h = attr.r * 2;
                    break;
                case "ellipse":
                    x = attr.cx - attr.rx;
                    y = attr.cy - attr.ry;
                    w = attr.rx * 2;
                    h = attr.ry * 2;
                    break;
                case "image":
                    x = +attr.x;
                    y = +attr.y;
                    w = attr.width || 0;
                    h = attr.height || 0;
                    break;
                case "text":
                    this.textpath.v = ["m", round(attr.x), ", ", round(attr.y - 2), "l", round(attr.x) + 1, ", ", round(attr.y - 2)][join](E);
                    x = attr.x - round(this.W / 2);
                    y = attr.y - this.H / 2;
                    w = this.W;
                    h = this.H;
                    break;
                case "rect":
                case "path":
                    if (!this.attrs.path) {
                        x = 0;
                        y = 0;
                        w = this.paper.width;
                        h = this.paper.height;
                    } else {
                        var dim = pathDimensions(this.attrs.path);
                        x = dim.x;
                        y = dim.y;
                        w = dim.width;
                        h = dim.height;
                    }
                    break;
                default:
                    x = 0;
                    y = 0;
                    w = this.paper.width;
                    h = this.paper.height;
                    break;
            }
            cx = (cx == null) ? x + w / 2 : cx;
            cy = (cy == null) ? y + h / 2 : cy;
            var left = cx - this.paper.width / 2,
                top = cy - this.paper.height / 2, t;
            gs.left != (t = left + "px") && (gs.left = t);
            gs.top != (t = top + "px") && (gs.top = t);
            this.X = pathlike[has](this.type) ? -left : x;
            this.Y = pathlike[has](this.type) ? -top : y;
            this.W = w;
            this.H = h;
            if (pathlike[has](this.type)) {
                os.left != (t = -left * zoom + "px") && (os.left = t);
                os.top != (t = -top * zoom + "px") && (os.top = t);
            } else if (this.type == "text") {
                os.left != (t = -left + "px") && (os.left = t);
                os.top != (t = -top + "px") && (os.top = t);
            } else {
                gs.width != (t = this.paper.width + "px") && (gs.width = t);
                gs.height != (t = this.paper.height + "px") && (gs.height = t);
                os.left != (t = x - left + "px") && (os.left = t);
                os.top != (t = y - top + "px") && (os.top = t);
                os.width != (t = w + "px") && (os.width = t);
                os.height != (t = h + "px") && (os.height = t);
            }
        };
        elproto.hide = function () {
            !this.removed && (this.Group.style.display = "none");
            return this;
        };
        elproto.show = function () {
            !this.removed && (this.Group.style.display = "block");
            return this;
        };
        elproto.getBBox = function () {
            if (this.removed) {
                return this;
            }
            if (pathlike[has](this.type)) {
                return pathDimensions(this.attrs.path);
            }
            return {
                x: this.X + (this.bbx || 0),
                y: this.Y,
                width: this.W,
                height: this.H
            };
        };
        elproto.remove = function () {
            if (this.removed) {
                return;
            }
            tear(this, this.paper);
            this.node.parentNode.removeChild(this.node);
            this.Group.parentNode.removeChild(this.Group);
            this.shape && this.shape.parentNode.removeChild(this.shape);
            for (var i in this) {
                delete this[i];
            }
            this.removed = true;
        };
        elproto.attr = function (name, value) {
            if (this.removed) {
                return this;
            }
            if (name == null) {
                var res = {};
                for (var i in this.attrs) if (this.attrs[has](i)) {
                    res[i] = this.attrs[i];
                }
                this._.rt.deg && (res.rotation = this.rotate());
                (this._.sx != 1 || this._.sy != 1) && (res.scale = this.scale());
                res.gradient && res.fill == "none" && (res.fill = res.gradient) && delete res.gradient;
                return res;
            }
            if (value == null && R.is(name, "string")) {
                if (name == "translation") {
                    return translate.call(this);
                }
                if (name == "rotation") {
                    return this.rotate();
                }
                if (name == "scale") {
                    return this.scale();
                }
                if (name == fillString && this.attrs.fill == "none" && this.attrs.gradient) {
                    return this.attrs.gradient;
                }
                return this.attrs[name];
            }
            if (this.attrs && value == null && R.is(name, array)) {
                var ii, values = {};
                for (i = 0, ii = name[length]; i < ii; i++) {
                    values[name[i]] = this.attr(name[i]);
                }
                return values;
            }
            var params;
            if (value != null) {
                params = {};
                params[name] = value;
            }
            value == null && R.is(name, "object") && (params = name);
            if (params) {
                for (var key in this.paper.customAttributes) if (this.paper.customAttributes[has](key) && params[has](key) && R.is(this.paper.customAttributes[key], "function")) {
                    var par = this.paper.customAttributes[key].apply(this, [][concat](params[key]));
                    this.attrs[key] = params[key];
                    for (var subkey in par) if (par[has](subkey)) {
                        params[subkey] = par[subkey];
                    }
                }
                if (params.text && this.type == "text") {
                    this.node.string = params.text;
                }
                setFillAndStroke(this, params);
                if (params.gradient && (({circle: 1, ellipse: 1})[has](this.type) || Str(params.gradient).charAt() != "r")) {
                    addGradientFill(this, params.gradient);
                }
                (!pathlike[has](this.type) || this._.rt.deg) && this.setBox(this.attrs);
            }
            return this;
        };
        elproto.toFront = function () {
            !this.removed && this.Group.parentNode[appendChild](this.Group);
            this.paper.top != this && tofront(this, this.paper);
            return this;
        };
        elproto.toBack = function () {
            if (this.removed) {
                return this;
            }
            if (this.Group.parentNode.firstChild != this.Group) {
                this.Group.parentNode.insertBefore(this.Group, this.Group.parentNode.firstChild);
                toback(this, this.paper);
            }
            return this;
        };
        elproto.insertAfter = function (element) {
            if (this.removed) {
                return this;
            }
            if (element.constructor == Set) {
                element = element[element.length - 1];
            }
            if (element.Group.nextSibling) {
                element.Group.parentNode.insertBefore(this.Group, element.Group.nextSibling);
            } else {
                element.Group.parentNode[appendChild](this.Group);
            }
            insertafter(this, element, this.paper);
            return this;
        };
        elproto.insertBefore = function (element) {
            if (this.removed) {
                return this;
            }
            if (element.constructor == Set) {
                element = element[0];
            }
            element.Group.parentNode.insertBefore(this.Group, element.Group);
            insertbefore(this, element, this.paper);
            return this;
        };
        elproto.blur = function (size) {
            var s = this.node.runtimeStyle,
                f = s.filter;
            f = f.replace(blurregexp, E);
            if (+size !== 0) {
                this.attrs.blur = size;
                s.filter = f + S + ms + ".Blur(pixelradius=" + (+size || 1.5) + ")";
                s.margin = R.format("-{0}px 0 0 -{0}px", round(+size || 1.5));
            } else {
                s.filter = f;
                s.margin = 0;
                delete this.attrs.blur;
            }
        };

        theCircle = function (vml, x, y, r) {
            var g = createNode("group"),
                o = createNode("oval"),
                ol = o.style;
            g.style.cssText = "position:absolute;left:0;top:0;width:" + vml.width + "px;height:" + vml.height + "px";
            g.coordsize = coordsize;
            g.coordorigin = vml.coordorigin;
            g[appendChild](o);
            var res = new Element(o, g, vml);
            res.type = "circle";
            setFillAndStroke(res, {stroke: "#000", fill: "none"});
            res.attrs.cx = x;
            res.attrs.cy = y;
            res.attrs.r = r;
            res.setBox({x: x - r, y: y - r, width: r * 2, height: r * 2});
            vml.canvas[appendChild](g);
            return res;
        };
        function rectPath(x, y, w, h, r) {
            if (r) {
                return R.format("M{0},{1}l{2},0a{3},{3},0,0,1,{3},{3}l0,{5}a{3},{3},0,0,1,{4},{3}l{6},0a{3},{3},0,0,1,{4},{4}l0,{7}a{3},{3},0,0,1,{3},{4}z", x + r, y, w - r * 2, r, -r, h - r * 2, r * 2 - w, r * 2 - h);
            } else {
                return R.format("M{0},{1}l{2},0,0,{3},{4},0z", x, y, w, h, -w);
            }
        }
        theRect = function (vml, x, y, w, h, r) {
            var path = rectPath(x, y, w, h, r),
                res = vml.path(path),
                a = res.attrs;
            res.X = a.x = x;
            res.Y = a.y = y;
            res.W = a.width = w;
            res.H = a.height = h;
            a.r = r;
            a.path = path;
            res.type = "rect";
            return res;
        };
        theEllipse = function (vml, x, y, rx, ry) {
            var g = createNode("group"),
                o = createNode("oval"),
                ol = o.style;
            g.style.cssText = "position:absolute;left:0;top:0;width:" + vml.width + "px;height:" + vml.height + "px";
            g.coordsize = coordsize;
            g.coordorigin = vml.coordorigin;
            g[appendChild](o);
            var res = new Element(o, g, vml);
            res.type = "ellipse";
            setFillAndStroke(res, {stroke: "#000"});
            res.attrs.cx = x;
            res.attrs.cy = y;
            res.attrs.rx = rx;
            res.attrs.ry = ry;
            res.setBox({x: x - rx, y: y - ry, width: rx * 2, height: ry * 2});
            vml.canvas[appendChild](g);
            return res;
        };
        theImage = function (vml, src, x, y, w, h) {
            var g = createNode("group"),
                o = createNode("image");
            g.style.cssText = "position:absolute;left:0;top:0;width:" + vml.width + "px;height:" + vml.height + "px";
            g.coordsize = coordsize;
            g.coordorigin = vml.coordorigin;
            o.src = src;
            g[appendChild](o);
            var res = new Element(o, g, vml);
            res.type = "image";
            res.attrs.src = src;
            res.attrs.x = x;
            res.attrs.y = y;
            res.attrs.w = w;
            res.attrs.h = h;
            res.setBox({x: x, y: y, width: w, height: h});
            vml.canvas[appendChild](g);
            return res;
        };
        theText = function (vml, x, y, text) {
            var g = createNode("group"),
                el = createNode("shape"),
                ol = el.style,
                path = createNode("path"),
                ps = path.style,
                o = createNode("textpath");
            g.style.cssText = "position:absolute;left:0;top:0;width:" + vml.width + "px;height:" + vml.height + "px";
            g.coordsize = coordsize;
            g.coordorigin = vml.coordorigin;
            path.v = R.format("m{0},{1}l{2},{1}", round(x * 10), round(y * 10), round(x * 10) + 1);
            path.textpathok = true;
            ol.width = vml.width;
            ol.height = vml.height;
            o.string = Str(text);
            o.on = true;
            el[appendChild](o);
            el[appendChild](path);
            g[appendChild](el);
            var res = new Element(o, g, vml);
            res.shape = el;
            res.textpath = path;
            res.type = "text";
            res.attrs.text = text;
            res.attrs.x = x;
            res.attrs.y = y;
            res.attrs.w = 1;
            res.attrs.h = 1;
            setFillAndStroke(res, {font: availableAttrs.font, stroke: "none", fill: "#000"});
            res.setBox();
            vml.canvas[appendChild](g);
            return res;
        };
        setSize = function (width, height) {
            var cs = this.canvas.style;
            width == +width && (width += "px");
            height == +height && (height += "px");
            cs.width = width;
            cs.height = height;
            cs.clip = "rect(0 " + width + " " + height + " 0)";
            return this;
        };
        var createNode;
        doc.createStyleSheet().addRule(".rvml", "behavior:url(#default#VML)");
        try {
            !doc.namespaces.rvml && doc.namespaces.add("rvml", "urn:schemas-microsoft-com:vml");
            createNode = function (tagName) {
                return doc.createElement('<rvml:' + tagName + ' class="rvml">');
            };
        } catch (e) {
            createNode = function (tagName) {
                return doc.createElement('<' + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
            };
        }
        create = function () {
            var con = getContainer[apply](0, arguments),
                container = con.container,
                height = con.height,
                s,
                width = con.width,
                x = con.x,
                y = con.y;
            if (!container) {
                throw new Error("VML container not found.");
            }
            var res = new Paper,
                c = res.canvas = doc.createElement("div"),
                cs = c.style;
            x = x || 0;
            y = y || 0;
            width = width || 512;
            height = height || 342;
            width == +width && (width += "px");
            height == +height && (height += "px");
            res.width = 1e3;
            res.height = 1e3;
            res.coordsize = zoom * 1e3 + S + zoom * 1e3;
            res.coordorigin = "0 0";
            res.span = doc.createElement("span");
            res.span.style.cssText = "position:absolute;left:-9999em;top:-9999em;padding:0;margin:0;line-height:1;display:inline;";
            c[appendChild](res.span);
            cs.cssText = R.format("top:0;left:0;width:{0};height:{1};display:inline-block;position:relative;clip:rect(0 {0} {1} 0);overflow:hidden", width, height);
            if (container == 1) {
                doc.body[appendChild](c);
                cs.left = x + "px";
                cs.top = y + "px";
                cs.position = "absolute";
            } else {
                if (container.firstChild) {
                    container.insertBefore(c, container.firstChild);
                } else {
                    container[appendChild](c);
                }
            }
            plugins.call(res, res, R.fn);
            return res;
        };
        paperproto.clear = function () {
            this.canvas.innerHTML = E;
            this.span = doc.createElement("span");
            this.span.style.cssText = "position:absolute;left:-9999em;top:-9999em;padding:0;margin:0;line-height:1;display:inline;";
            this.canvas[appendChild](this.span);
            this.bottom = this.top = null;
        };
        paperproto.remove = function () {
            this.canvas.parentNode.removeChild(this.canvas);
            for (var i in this) {
                this[i] = removed(i);
            }
            return true;
        };
    }

    // rest
    // WebKit rendering bug workaround method
    var version = navigator.userAgent.match(/Version\/(.*?)\s/);
    if ((navigator.vendor == "Apple Computer, Inc.") && (version && version[1] < 4 || navigator.platform.slice(0, 2) == "iP")) {
        paperproto.safari = function () {
            var rect = this.rect(-99, -99, this.width + 99, this.height + 99).attr({stroke: "none"});
            win.setTimeout(function () {rect.remove();});
        };
    } else {
        paperproto.safari = function () {};
    }

    // Events
    var preventDefault = function () {
        this.returnValue = false;
    },
    preventTouch = function () {
        return this.originalEvent.preventDefault();
    },
    stopPropagation = function () {
        this.cancelBubble = true;
    },
    stopTouch = function () {
        return this.originalEvent.stopPropagation();
    },
    addEvent = (function () {
        if (doc.addEventListener) {
            return function (obj, type, fn, element) {
                var realName = supportsTouch && touchMap[type] ? touchMap[type] : type;
                var f = function (e) {
                    if (supportsTouch && touchMap[has](type)) {
                        for (var i = 0, ii = e.targetTouches && e.targetTouches.length; i < ii; i++) {
                            if (e.targetTouches[i].target == obj) {
                                var olde = e;
                                e = e.targetTouches[i];
                                e.originalEvent = olde;
                                e.preventDefault = preventTouch;
                                e.stopPropagation = stopTouch;
                                break;
                            }
                        }
                    }
                    return fn.call(element, e);
                };
                obj.addEventListener(realName, f, false);
                return function () {
                    obj.removeEventListener(realName, f, false);
                    return true;
                };
            };
        } else if (doc.attachEvent) {
            return function (obj, type, fn, element) {
                var f = function (e) {
                    e = e || win.event;
                    e.preventDefault = e.preventDefault || preventDefault;
                    e.stopPropagation = e.stopPropagation || stopPropagation;
                    return fn.call(element, e);
                };
                obj.attachEvent("on" + type, f);
                var detacher = function () {
                    obj.detachEvent("on" + type, f);
                    return true;
                };
                return detacher;
            };
        }
    })(),
    drag = [],
    dragMove = function (e) {
        var x = e.clientX,
            y = e.clientY,
            scrollY = doc.documentElement.scrollTop || doc.body.scrollTop,
            scrollX = doc.documentElement.scrollLeft || doc.body.scrollLeft,
            dragi,
            j = drag.length;
        while (j--) {
            dragi = drag[j];
            if (supportsTouch) {
                var i = e.touches.length,
                    touch;
                while (i--) {
                    touch = e.touches[i];
                    if (touch.identifier == dragi.el._drag.id) {
                        x = touch.clientX;
                        y = touch.clientY;
                        (e.originalEvent ? e.originalEvent : e).preventDefault();
                        break;
                    }
                }
            } else {
                e.preventDefault();
            }
            x += scrollX;
            y += scrollY;
            dragi.move && dragi.move.call(dragi.move_scope || dragi.el, x - dragi.el._drag.x, y - dragi.el._drag.y, x, y, e);
        }
    },
    dragUp = function (e) {
        R.unmousemove(dragMove).unmouseup(dragUp);
        var i = drag.length,
            dragi;
        while (i--) {
            dragi = drag[i];
            dragi.el._drag = {};
            dragi.end && dragi.end.call(dragi.end_scope || dragi.start_scope || dragi.move_scope || dragi.el, e);
        }
        drag = [];
    };
    for (var i = events[length]; i--;) {
        (function (eventName) {
            R[eventName] = Element[proto][eventName] = function (fn, scope) {
                if (R.is(fn, "function")) {
                    this.events = this.events || [];
                    this.events.push({name: eventName, f: fn, unbind: addEvent(this.shape || this.node || doc, eventName, fn, scope || this)});
                }
                return this;
            };
            R["un" + eventName] = Element[proto]["un" + eventName] = function (fn) {
                var events = this.events,
                    l = events[length];
                while (l--) if (events[l].name == eventName && events[l].f == fn) {
                    events[l].unbind();
                    events.splice(l, 1);
                    !events.length && delete this.events;
                    return this;
                }
                return this;
            };
        })(events[i]);
    }
    elproto.hover = function (f_in, f_out, scope_in, scope_out) {
        return this.mouseover(f_in, scope_in).mouseout(f_out, scope_out || scope_in);
    };
    elproto.unhover = function (f_in, f_out) {
        return this.unmouseover(f_in).unmouseout(f_out);
    };
    elproto.drag = function (onmove, onstart, onend, move_scope, start_scope, end_scope) {
        this._drag = {};
        this.mousedown(function (e) {
            (e.originalEvent || e).preventDefault();
            var scrollY = doc.documentElement.scrollTop || doc.body.scrollTop,
                scrollX = doc.documentElement.scrollLeft || doc.body.scrollLeft;
            this._drag.x = e.clientX + scrollX;
            this._drag.y = e.clientY + scrollY;
            this._drag.id = e.identifier;
            onstart && onstart.call(start_scope || move_scope || this, e.clientX + scrollX, e.clientY + scrollY, e);
            !drag.length && R.mousemove(dragMove).mouseup(dragUp);
            drag.push({el: this, move: onmove, end: onend, move_scope: move_scope, start_scope: start_scope, end_scope: end_scope});
        });
        return this;
    };
    elproto.undrag = function (onmove, onstart, onend) {
        var i = drag.length;
        while (i--) {
            drag[i].el == this && (drag[i].move == onmove && drag[i].end == onend) && drag.splice(i++, 1);
        }
        !drag.length && R.unmousemove(dragMove).unmouseup(dragUp);
    };
    paperproto.circle = function (x, y, r) {
        return theCircle(this, x || 0, y || 0, r || 0);
    };
    paperproto.rect = function (x, y, w, h, r) {
        return theRect(this, x || 0, y || 0, w || 0, h || 0, r || 0);
    };
    paperproto.ellipse = function (x, y, rx, ry) {
        return theEllipse(this, x || 0, y || 0, rx || 0, ry || 0);
    };
    paperproto.path = function (pathString) {
        pathString && !R.is(pathString, string) && !R.is(pathString[0], array) && (pathString += E);
        return thePath(R.format[apply](R, arguments), this);
    };
    paperproto.image = function (src, x, y, w, h) {
        return theImage(this, src || "about:blank", x || 0, y || 0, w || 0, h || 0);
    };
    paperproto.text = function (x, y, text) {
        return theText(this, x || 0, y || 0, Str(text));
    };
    paperproto.set = function (itemsArray) {
        arguments[length] > 1 && (itemsArray = Array[proto].splice.call(arguments, 0, arguments[length]));
        return new Set(itemsArray);
    };
    paperproto.setSize = setSize;
    paperproto.top = paperproto.bottom = null;
    paperproto.raphael = R;
    function x_y() {
        return this.x + S + this.y;
    }
    elproto.resetScale = function () {
        if (this.removed) {
            return this;
        }
        this._.sx = 1;
        this._.sy = 1;
        this.attrs.scale = "1 1";
    };
    elproto.scale = function (x, y, cx, cy) {
        if (this.removed) {
            return this;
        }
        if (x == null && y == null) {
            return {
                x: this._.sx,
                y: this._.sy,
                toString: x_y
            };
        }
        y = y || x;
        !+y && (y = x);
        var dx,
            dy,
            dcx,
            dcy,
            a = this.attrs;
        if (x != 0) {
            var bb = this.getBBox(),
                rcx = bb.x + bb.width / 2,
                rcy = bb.y + bb.height / 2,
                kx = abs(x / this._.sx),
                ky = abs(y / this._.sy);
            cx = (+cx || cx == 0) ? cx : rcx;
            cy = (+cy || cy == 0) ? cy : rcy;
            var posx = this._.sx > 0,
                posy = this._.sy > 0,
                dirx = ~~(x / abs(x)),
                diry = ~~(y / abs(y)),
                dkx = kx * dirx,
                dky = ky * diry,
                s = this.node.style,
                ncx = cx + abs(rcx - cx) * dkx * (rcx > cx == posx ? 1 : -1),
                ncy = cy + abs(rcy - cy) * dky * (rcy > cy == posy ? 1 : -1),
                fr = (x * dirx > y * diry ? ky : kx);
            switch (this.type) {
                case "rect":
                case "image":
                    var neww = a.width * kx,
                        newh = a.height * ky;
                    this.attr({
                        height: newh,
                        r: a.r * fr,
                        width: neww,
                        x: ncx - neww / 2,
                        y: ncy - newh / 2
                    });
                    break;
                case "circle":
                case "ellipse":
                    this.attr({
                        rx: a.rx * kx,
                        ry: a.ry * ky,
                        r: a.r * fr,
                        cx: ncx,
                        cy: ncy
                    });
                    break;
                case "text":
                    this.attr({
                        x: ncx,
                        y: ncy
                    });
                    break;
                case "path":
                    var path = pathToRelative(a.path),
                        skip = true,
                        fx = posx ? dkx : kx,
                        fy = posy ? dky : ky;
                    for (var i = 0, ii = path[length]; i < ii; i++) {
                        var p = path[i],
                            P0 = upperCase.call(p[0]);
                        if (P0 == "M" && skip) {
                            continue;
                        } else {
                            skip = false;
                        }
                        if (P0 == "A") {
                            p[path[i][length] - 2] *= fx;
                            p[path[i][length] - 1] *= fy;
                            p[1] *= kx;
                            p[2] *= ky;
                            p[5] = +(dirx + diry ? !!+p[5] : !+p[5]);
                        } else if (P0 == "H") {
                            for (var j = 1, jj = p[length]; j < jj; j++) {
                                p[j] *= fx;
                            }
                        } else if (P0 == "V") {
                            for (j = 1, jj = p[length]; j < jj; j++) {
                                p[j] *= fy;
                            }
                         } else {
                            for (j = 1, jj = p[length]; j < jj; j++) {
                                p[j] *= (j % 2) ? fx : fy;
                            }
                        }
                    }
                    var dim2 = pathDimensions(path);
                    dx = ncx - dim2.x - dim2.width / 2;
                    dy = ncy - dim2.y - dim2.height / 2;
                    path[0][1] += dx;
                    path[0][2] += dy;
                    this.attr({path: path});
                break;
            }
            if (this.type in {text: 1, image:1} && (dirx != 1 || diry != 1)) {
                if (this.transformations) {
                    this.transformations[2] = "scale("[concat](dirx, ",", diry, ")");
                    this.node[setAttribute]("transform", this.transformations[join](S));
                    dx = (dirx == -1) ? -a.x - (neww || 0) : a.x;
                    dy = (diry == -1) ? -a.y - (newh || 0) : a.y;
                    this.attr({x: dx, y: dy});
                    a.fx = dirx - 1;
                    a.fy = diry - 1;
                } else {
                    this.node.filterMatrix = ms + ".Matrix(M11="[concat](dirx,
                        ", M12=0, M21=0, M22=", diry,
                        ", Dx=0, Dy=0, sizingmethod='auto expand', filtertype='bilinear')");
                    s.filter = (this.node.filterMatrix || E) + (this.node.filterOpacity || E);
                }
            } else {
                if (this.transformations) {
                    this.transformations[2] = E;
                    this.node[setAttribute]("transform", this.transformations[join](S));
                    a.fx = 0;
                    a.fy = 0;
                } else {
                    this.node.filterMatrix = E;
                    s.filter = (this.node.filterMatrix || E) + (this.node.filterOpacity || E);
                }
            }
            a.scale = [x, y, cx, cy][join](S);
            this._.sx = x;
            this._.sy = y;
        }
        return this;
    };
    elproto.clone = function () {
        if (this.removed) {
            return null;
        }
        var attr = this.attr();
        delete attr.scale;
        delete attr.translation;
        return this.paper[this.type]().attr(attr);
    };
    var curveslengths = {},
    getPointAtSegmentLength = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length) {
        var len = 0,
            precision = 100,
            name = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y].join(),
            cache = curveslengths[name],
            old, dot;
        !cache && (curveslengths[name] = cache = {data: []});
        cache.timer && clearTimeout(cache.timer);
        cache.timer = setTimeout(function () {delete curveslengths[name];}, 2000);
        if (length != null) {
            var total = getPointAtSegmentLength(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
            precision = ~~total * 10;
        }
        for (var i = 0; i < precision + 1; i++) {
            if (cache.data[length] > i) {
                dot = cache.data[i * precision];
            } else {
                dot = R.findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, i / precision);
                cache.data[i] = dot;
            }
            i && (len += pow(pow(old.x - dot.x, 2) + pow(old.y - dot.y, 2), .5));
            if (length != null && len >= length) {
                return dot;
            }
            old = dot;
        }
        if (length == null) {
            return len;
        }
    },
    getLengthFactory = function (istotal, subpath) {
        return function (path, length, onlystart) {
            path = path2curve(path);
            var x, y, p, l, sp = "", subpaths = {}, point,
                len = 0;
            for (var i = 0, ii = path.length; i < ii; i++) {
                p = path[i];
                if (p[0] == "M") {
                    x = +p[1];
                    y = +p[2];
                } else {
                    l = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6]);
                    if (len + l > length) {
                        if (subpath && !subpaths.start) {
                            point = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6], length - len);
                            sp += ["C", point.start.x, point.start.y, point.m.x, point.m.y, point.x, point.y];
                            if (onlystart) {return sp;}
                            subpaths.start = sp;
                            sp = ["M", point.x, point.y + "C", point.n.x, point.n.y, point.end.x, point.end.y, p[5], p[6]][join]();
                            len += l;
                            x = +p[5];
                            y = +p[6];
                            continue;
                        }
                        if (!istotal && !subpath) {
                            point = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6], length - len);
                            return {x: point.x, y: point.y, alpha: point.alpha};
                        }
                    }
                    len += l;
                    x = +p[5];
                    y = +p[6];
                }
                sp += p;
            }
            subpaths.end = sp;
            point = istotal ? len : subpath ? subpaths : R.findDotsAtSegment(x, y, p[1], p[2], p[3], p[4], p[5], p[6], 1);
            point.alpha && (point = {x: point.x, y: point.y, alpha: point.alpha});
            return point;
        };
    };
    var getTotalLength = getLengthFactory(1),
        getPointAtLength = getLengthFactory(),
        getSubpathsAtLength = getLengthFactory(0, 1);
    elproto.getTotalLength = function () {
        if (this.type != "path") {return;}
        if (this.node.getTotalLength) {
            return this.node.getTotalLength();
        }
        return getTotalLength(this.attrs.path);
    };
    elproto.getPointAtLength = function (length) {
        if (this.type != "path") {return;}
        return getPointAtLength(this.attrs.path, length);
    };
    elproto.getSubpath = function (from, to) {
        if (this.type != "path") {return;}
        if (abs(this.getTotalLength() - to) < "1e-6") {
            return getSubpathsAtLength(this.attrs.path, from).end;
        }
        var a = getSubpathsAtLength(this.attrs.path, to, 1);
        return from ? getSubpathsAtLength(a, from).end : a;
    };

    // animation easing formulas
    R.easing_formulas = {
        linear: function (n) {
            return n;
        },
        "<": function (n) {
            return pow(n, 3);
        },
        ">": function (n) {
            return pow(n - 1, 3) + 1;
        },
        "<>": function (n) {
            n = n * 2;
            if (n < 1) {
                return pow(n, 3) / 2;
            }
            n -= 2;
            return (pow(n, 3) + 2) / 2;
        },
        backIn: function (n) {
            var s = 1.70158;
            return n * n * ((s + 1) * n - s);
        },
        backOut: function (n) {
            n = n - 1;
            var s = 1.70158;
            return n * n * ((s + 1) * n + s) + 1;
        },
        elastic: function (n) {
            if (n == 0 || n == 1) {
                return n;
            }
            var p = .3,
                s = p / 4;
            return pow(2, -10 * n) * math.sin((n - s) * (2 * PI) / p) + 1;
        },
        bounce: function (n) {
            var s = 7.5625,
                p = 2.75,
                l;
            if (n < (1 / p)) {
                l = s * n * n;
            } else {
                if (n < (2 / p)) {
                    n -= (1.5 / p);
                    l = s * n * n + .75;
                } else {
                    if (n < (2.5 / p)) {
                        n -= (2.25 / p);
                        l = s * n * n + .9375;
                    } else {
                        n -= (2.625 / p);
                        l = s * n * n + .984375;
                    }
                }
            }
            return l;
        }
    };

    var animationElements = [],
        animation = function () {
            var Now = +new Date;
            for (var l = 0; l < animationElements[length]; l++) {
                var e = animationElements[l];
                if (e.stop || e.el.removed) {
                    continue;
                }
                var time = Now - e.start,
                    ms = e.ms,
                    easing = e.easing,
                    from = e.from,
                    diff = e.diff,
                    to = e.to,
                    t = e.t,
                    that = e.el,
                    set = {},
                    now;
                if (time < ms) {
                    var pos = easing(time / ms);
                    for (var attr in from) if (from[has](attr)) {
                        switch (availableAnimAttrs[attr]) {
                            case "along":
                                now = pos * ms * diff[attr];
                                to.back && (now = to.len - now);
                                var point = getPointAtLength(to[attr], now);
                                that.translate(diff.sx - diff.x || 0, diff.sy - diff.y || 0);
                                diff.x = point.x;
                                diff.y = point.y;
                                that.translate(point.x - diff.sx, point.y - diff.sy);
                                to.rot && that.rotate(diff.r + point.alpha, point.x, point.y);
                                break;
                            case nu:
                                now = +from[attr] + pos * ms * diff[attr];
                                break;
                            case "colour":
                                now = "rgb(" + [
                                    upto255(round(from[attr].r + pos * ms * diff[attr].r)),
                                    upto255(round(from[attr].g + pos * ms * diff[attr].g)),
                                    upto255(round(from[attr].b + pos * ms * diff[attr].b))
                                ][join](",") + ")";
                                break;
                            case "path":
                                now = [];
                                for (var i = 0, ii = from[attr][length]; i < ii; i++) {
                                    now[i] = [from[attr][i][0]];
                                    for (var j = 1, jj = from[attr][i][length]; j < jj; j++) {
                                        now[i][j] = +from[attr][i][j] + pos * ms * diff[attr][i][j];
                                    }
                                    now[i] = now[i][join](S);
                                }
                                now = now[join](S);
                                break;
                            case "csv":
                                switch (attr) {
                                    case "translation":
                                        var x = pos * ms * diff[attr][0] - t.x,
                                            y = pos * ms * diff[attr][1] - t.y;
                                        t.x += x;
                                        t.y += y;
                                        now = x + S + y;
                                    break;
                                    case "rotation":
                                        now = +from[attr][0] + pos * ms * diff[attr][0];
                                        from[attr][1] && (now += "," + from[attr][1] + "," + from[attr][2]);
                                    break;
                                    case "scale":
                                        now = [+from[attr][0] + pos * ms * diff[attr][0], +from[attr][1] + pos * ms * diff[attr][1], (2 in to[attr] ? to[attr][2] : E), (3 in to[attr] ? to[attr][3] : E)][join](S);
                                    break;
                                    case "clip-rect":
                                        now = [];
                                        i = 4;
                                        while (i--) {
                                            now[i] = +from[attr][i] + pos * ms * diff[attr][i];
                                        }
                                    break;
                                }
                                break;
                            default:
                              var from2 = [].concat(from[attr]);
                                now = [];
                                i = that.paper.customAttributes[attr].length;
                                while (i--) {
                                    now[i] = +from2[i] + pos * ms * diff[attr][i];
                                }
                                break;
                        }
                        set[attr] = now;
                    }
                    that.attr(set);
                    that._run && that._run.call(that);
                } else {
                    if (to.along) {
                        point = getPointAtLength(to.along, to.len * !to.back);
                        that.translate(diff.sx - (diff.x || 0) + point.x - diff.sx, diff.sy - (diff.y || 0) + point.y - diff.sy);
                        to.rot && that.rotate(diff.r + point.alpha, point.x, point.y);
                    }
                    (t.x || t.y) && that.translate(-t.x, -t.y);
                    to.scale && (to.scale += E);
                    that.attr(to);
                    animationElements.splice(l--, 1);
                }
            }
            R.svg && that && that.paper && that.paper.safari();
            animationElements[length] && setTimeout(animation);
        },
        keyframesRun = function (attr, element, time, prev, prevcallback) {
            var dif = time - prev;
            element.timeouts.push(setTimeout(function () {
                R.is(prevcallback, "function") && prevcallback.call(element);
                element.animate(attr, dif, attr.easing);
            }, prev));
        },
        upto255 = function (color) {
            return mmax(mmin(color, 255), 0);
        },
        translate = function (x, y) {
            if (x == null) {
                return {x: this._.tx, y: this._.ty, toString: x_y};
            }
            this._.tx += +x;
            this._.ty += +y;
            switch (this.type) {
                case "circle":
                case "ellipse":
                    this.attr({cx: +x + this.attrs.cx, cy: +y + this.attrs.cy});
                    break;
                case "rect":
                case "image":
                case "text":
                    this.attr({x: +x + this.attrs.x, y: +y + this.attrs.y});
                    break;
                case "path":
                    var path = pathToRelative(this.attrs.path);
                    path[0][1] += +x;
                    path[0][2] += +y;
                    this.attr({path: path});
                break;
            }
            return this;
        };
    elproto.animateWith = function (element, params, ms, easing, callback) {
        for (var i = 0, ii = animationElements.length; i < ii; i++) {
            if (animationElements[i].el.id == element.id) {
                params.start = animationElements[i].start;
            }
        }
        return this.animate(params, ms, easing, callback);
    };
    elproto.animateAlong = along();
    elproto.animateAlongBack = along(1);
    function along(isBack) {
        return function (path, ms, rotate, callback) {
            var params = {back: isBack};
            R.is(rotate, "function") ? (callback = rotate) : (params.rot = rotate);
            path && path.constructor == Element && (path = path.attrs.path);
            path && (params.along = path);
            return this.animate(params, ms, callback);
        };
    }
    function CubicBezierAtTime(t, p1x, p1y, p2x, p2y, duration) {
        var cx = 3 * p1x,
            bx = 3 * (p2x - p1x) - cx,
            ax = 1 - cx - bx,
            cy = 3 * p1y,
            by = 3 * (p2y - p1y) - cy,
            ay = 1 - cy - by;
        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }
        function solve(x, epsilon) {
            var t = solveCurveX(x, epsilon);
            return ((ay * t + by) * t + cy) * t;
        }
        function solveCurveX(x, epsilon) {
            var t0, t1, t2, x2, d2, i;
            for(t2 = x, i = 0; i < 8; i++) {
                x2 = sampleCurveX(t2) - x;
                if (abs(x2) < epsilon) {
                    return t2;
                }
                d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
                if (abs(d2) < 1e-6) {
                    break;
                }
                t2 = t2 - x2 / d2;
            }
            t0 = 0;
            t1 = 1;
            t2 = x;
            if (t2 < t0) {
                return t0;
            }
            if (t2 > t1) {
                return t1;
            }
            while (t0 < t1) {
                x2 = sampleCurveX(t2);
                if (abs(x2 - x) < epsilon) {
                    return t2;
                }
                if (x > x2) {
                    t0 = t2;
                } else {
                    t1 = t2;
                }
                t2 = (t1 - t0) / 2 + t0;
            }
            return t2;
        }
        return solve(t, 1 / (200 * duration));
    }
    elproto.onAnimation = function (f) {
        this._run = f || 0;
        return this;
    };
    elproto.animate = function (params, ms, easing, callback) {
        var element = this;
        element.timeouts = element.timeouts || [];
        if (R.is(easing, "function") || !easing) {
            callback = easing || null;
        }
        if (element.removed) {
            callback && callback.call(element);
            return element;
        }
        var from = {},
            to = {},
            animateable = false,
            diff = {};
        for (var attr in params) if (params[has](attr)) {
            if (availableAnimAttrs[has](attr) || element.paper.customAttributes[has](attr)) {
                animateable = true;
                from[attr] = element.attr(attr);
                (from[attr] == null) && (from[attr] = availableAttrs[attr]);
                to[attr] = params[attr];
                switch (availableAnimAttrs[attr]) {
                    case "along":
                        var len = getTotalLength(params[attr]);
                        var point = getPointAtLength(params[attr], len * !!params.back);
                        var bb = element.getBBox();
                        diff[attr] = len / ms;
                        diff.tx = bb.x;
                        diff.ty = bb.y;
                        diff.sx = point.x;
                        diff.sy = point.y;
                        to.rot = params.rot;
                        to.back = params.back;
                        to.len = len;
                        params.rot && (diff.r = toFloat(element.rotate()) || 0);
                        break;
                    case nu:
                        diff[attr] = (to[attr] - from[attr]) / ms;
                        break;
                    case "colour":
                        from[attr] = R.getRGB(from[attr]);
                        var toColour = R.getRGB(to[attr]);
                        diff[attr] = {
                            r: (toColour.r - from[attr].r) / ms,
                            g: (toColour.g - from[attr].g) / ms,
                            b: (toColour.b - from[attr].b) / ms
                        };
                        break;
                    case "path":
                        var pathes = path2curve(from[attr], to[attr]);
                        from[attr] = pathes[0];
                        var toPath = pathes[1];
                        diff[attr] = [];
                        for (var i = 0, ii = from[attr][length]; i < ii; i++) {
                            diff[attr][i] = [0];
                            for (var j = 1, jj = from[attr][i][length]; j < jj; j++) {
                                diff[attr][i][j] = (toPath[i][j] - from[attr][i][j]) / ms;
                            }
                        }
                        break;
                    case "csv":
                        var values = Str(params[attr])[split](separator),
                            from2 = Str(from[attr])[split](separator);
                        switch (attr) {
                            case "translation":
                                from[attr] = [0, 0];
                                diff[attr] = [values[0] / ms, values[1] / ms];
                            break;
                            case "rotation":
                                from[attr] = (from2[1] == values[1] && from2[2] == values[2]) ? from2 : [0, values[1], values[2]];
                                diff[attr] = [(values[0] - from[attr][0]) / ms, 0, 0];
                            break;
                            case "scale":
                                params[attr] = values;
                                from[attr] = Str(from[attr])[split](separator);
                                diff[attr] = [(values[0] - from[attr][0]) / ms, (values[1] - from[attr][1]) / ms, 0, 0];
                            break;
                            case "clip-rect":
                                from[attr] = Str(from[attr])[split](separator);
                                diff[attr] = [];
                                i = 4;
                                while (i--) {
                                    diff[attr][i] = (values[i] - from[attr][i]) / ms;
                                }
                            break;
                        }
                        to[attr] = values;
                        break;
                    default:
                        values = [].concat(params[attr]);
                        from2 = [].concat(from[attr]);
                        diff[attr] = [];
                        i = element.paper.customAttributes[attr][length];
                        while (i--) {
                            diff[attr][i] = ((values[i] || 0) - (from2[i] || 0)) / ms;
                        }
                        break;
                }
            }
        }
        if (!animateable) {
            var attrs = [],
                lastcall;
            for (var key in params) if (params[has](key) && animKeyFrames.test(key)) {
                attr = {value: params[key]};
                key == "from" && (key = 0);
                key == "to" && (key = 100);
                attr.key = toInt(key, 10);
                attrs.push(attr);
            }
            attrs.sort(sortByKey);
            if (attrs[0].key) {
                attrs.unshift({key: 0, value: element.attrs});
            }
            for (i = 0, ii = attrs[length]; i < ii; i++) {
                keyframesRun(attrs[i].value, element, ms / 100 * attrs[i].key, ms / 100 * (attrs[i - 1] && attrs[i - 1].key || 0), attrs[i - 1] && attrs[i - 1].value.callback);
            }
            lastcall = attrs[attrs[length] - 1].value.callback;
            if (lastcall) {
                element.timeouts.push(setTimeout(function () {lastcall.call(element);}, ms));
            }
        } else {
            var easyeasy = R.easing_formulas[easing];
            if (!easyeasy) {
                easyeasy = Str(easing).match(bezierrg);
                if (easyeasy && easyeasy[length] == 5) {
                    var curve = easyeasy;
                    easyeasy = function (t) {
                        return CubicBezierAtTime(t, +curve[1], +curve[2], +curve[3], +curve[4], ms);
                    };
                } else {
                    easyeasy = function (t) {
                        return t;
                    };
                }
            }
            animationElements.push({
                start: params.start || +new Date,
                ms: ms,
                easing: easyeasy,
                from: from,
                diff: diff,
                to: to,
                el: element,
                t: {x: 0, y: 0}
            });
            R.is(callback, "function") && (element._ac = setTimeout(function () {
                callback.call(element);
            }, ms));
            animationElements[length] == 1 && setTimeout(animation);
        }
        return this;
    };
    elproto.stop = function () {
        for (var i = 0; i < animationElements.length; i++) {
            animationElements[i].el.id == this.id && animationElements.splice(i--, 1);
        }
        for (i = 0, ii = this.timeouts && this.timeouts.length; i < ii; i++) {
            clearTimeout(this.timeouts[i]);
        }
        this.timeouts = [];
        clearTimeout(this._ac);
        delete this._ac;
        return this;
    };
    elproto.translate = function (x, y) {
        return this.attr({translation: x + " " + y});
    };
    elproto[toString] = function () {
        return "Rapha\xebl\u2019s object";
    };
    R.ae = animationElements;

    // Set
    var Set = function (items) {
        this.items = [];
        this[length] = 0;
        this.type = "set";
        if (items) {
            for (var i = 0, ii = items[length]; i < ii; i++) {
                if (items[i] && (items[i].constructor == Element || items[i].constructor == Set)) {
                    this[this.items[length]] = this.items[this.items[length]] = items[i];
                    this[length]++;
                }
            }
        }
    };
    Set[proto][push] = function () {
        var item,
            len;
        for (var i = 0, ii = arguments[length]; i < ii; i++) {
            item = arguments[i];
            if (item && (item.constructor == Element || item.constructor == Set)) {
                len = this.items[length];
                this[len] = this.items[len] = item;
                this[length]++;
            }
        }
        return this;
    };
    Set[proto].pop = function () {
        delete this[this[length]--];
        return this.items.pop();
    };
    for (var method in elproto) if (elproto[has](method)) {
        Set[proto][method] = (function (methodname) {
            return function () {
                for (var i = 0, ii = this.items[length]; i < ii; i++) {
                    this.items[i][methodname][apply](this.items[i], arguments);
                }
                return this;
            };
        })(method);
    }
    Set[proto].attr = function (name, value) {
        if (name && R.is(name, array) && R.is(name[0], "object")) {
            for (var j = 0, jj = name[length]; j < jj; j++) {
                this.items[j].attr(name[j]);
            }
        } else {
            for (var i = 0, ii = this.items[length]; i < ii; i++) {
                this.items[i].attr(name, value);
            }
        }
        return this;
    };
    Set[proto].animate = function (params, ms, easing, callback) {
        (R.is(easing, "function") || !easing) && (callback = easing || null);
        var len = this.items[length],
            i = len,
            item,
            set = this,
            collector;
        callback && (collector = function () {
            !--len && callback.call(set);
        });
        easing = R.is(easing, string) ? easing : collector;
        item = this.items[--i].animate(params, ms, easing, collector);
        while (i--) {
            this.items[i] && !this.items[i].removed && this.items[i].animateWith(item, params, ms, easing, collector);
        }
        return this;
    };
    Set[proto].insertAfter = function (el) {
        var i = this.items[length];
        while (i--) {
            this.items[i].insertAfter(el);
        }
        return this;
    };
    Set[proto].getBBox = function () {
        var x = [],
            y = [],
            w = [],
            h = [];
        for (var i = this.items[length]; i--;) {
            var box = this.items[i].getBBox();
            x[push](box.x);
            y[push](box.y);
            w[push](box.x + box.width);
            h[push](box.y + box.height);
        }
        x = mmin[apply](0, x);
        y = mmin[apply](0, y);
        return {
            x: x,
            y: y,
            width: mmax[apply](0, w) - x,
            height: mmax[apply](0, h) - y
        };
    };
    Set[proto].clone = function (s) {
        s = new Set;
        for (var i = 0, ii = this.items[length]; i < ii; i++) {
            s[push](this.items[i].clone());
        }
        return s;
    };

    R.registerFont = function (font) {
        if (!font.face) {
            return font;
        }
        this.fonts = this.fonts || {};
        var fontcopy = {
                w: font.w,
                face: {},
                glyphs: {}
            },
            family = font.face["font-family"];
        for (var prop in font.face) if (font.face[has](prop)) {
            fontcopy.face[prop] = font.face[prop];
        }
        if (this.fonts[family]) {
            this.fonts[family][push](fontcopy);
        } else {
            this.fonts[family] = [fontcopy];
        }
        if (!font.svg) {
            fontcopy.face["units-per-em"] = toInt(font.face["units-per-em"], 10);
            for (var glyph in font.glyphs) if (font.glyphs[has](glyph)) {
                var path = font.glyphs[glyph];
                fontcopy.glyphs[glyph] = {
                    w: path.w,
                    k: {},
                    d: path.d && "M" + path.d[rp](/[mlcxtrv]/g, function (command) {
                            return {l: "L", c: "C", x: "z", t: "m", r: "l", v: "c"}[command] || "M";
                        }) + "z"
                };
                if (path.k) {
                    for (var k in path.k) if (path[has](k)) {
                        fontcopy.glyphs[glyph].k[k] = path.k[k];
                    }
                }
            }
        }
        return font;
    };
    paperproto.getFont = function (family, weight, style, stretch) {
        stretch = stretch || "normal";
        style = style || "normal";
        weight = +weight || {normal: 400, bold: 700, lighter: 300, bolder: 800}[weight] || 400;
        if (!R.fonts) {
            return;
        }
        var font = R.fonts[family];
        if (!font) {
            var name = new RegExp("(^|\\s)" + family[rp](/[^\w\d\s+!~.:_-]/g, E) + "(\\s|$)", "i");
            for (var fontName in R.fonts) if (R.fonts[has](fontName)) {
                if (name.test(fontName)) {
                    font = R.fonts[fontName];
                    break;
                }
            }
        }
        var thefont;
        if (font) {
            for (var i = 0, ii = font[length]; i < ii; i++) {
                thefont = font[i];
                if (thefont.face["font-weight"] == weight && (thefont.face["font-style"] == style || !thefont.face["font-style"]) && thefont.face["font-stretch"] == stretch) {
                    break;
                }
            }
        }
        return thefont;
    };
    paperproto.print = function (x, y, string, font, size, origin, letter_spacing) {
        origin = origin || "middle"; // baseline|middle
        letter_spacing = mmax(mmin(letter_spacing || 0, 1), -1);
        var out = this.set(),
            letters = Str(string)[split](E),
            shift = 0,
            path = E,
            scale;
        R.is(font, string) && (font = this.getFont(font));
        if (font) {
            scale = (size || 16) / font.face["units-per-em"];
            var bb = font.face.bbox.split(separator),
                top = +bb[0],
                height = +bb[1] + (origin == "baseline" ? bb[3] - bb[1] + (+font.face.descent) : (bb[3] - bb[1]) / 2);
            for (var i = 0, ii = letters[length]; i < ii; i++) {
                var prev = i && font.glyphs[letters[i - 1]] || {},
                    curr = font.glyphs[letters[i]];
                shift += i ? (prev.w || font.w) + (prev.k && prev.k[letters[i]] || 0) + (font.w * letter_spacing) : 0;
                curr && curr.d && out[push](this.path(curr.d).attr({fill: "#000", stroke: "none", translation: [shift, 0]}));
            }
            out.scale(scale, scale, top, height).translate(x - top, y - height);
        }
        return out;
    };

    R.format = function (token, params) {
        var args = R.is(params, array) ? [0][concat](params) : arguments;
        token && R.is(token, string) && args[length] - 1 && (token = token[rp](formatrg, function (str, i) {
            return args[++i] == null ? E : args[i];
        }));
        return token || E;
    };
    R.ninja = function () {
        oldRaphael.was ? (win.CQ.Raphael = oldRaphael.is) : delete CQ.Raphael;
        return R;
    };
    R.el = elproto;
    R.st = Set[proto];

    oldRaphael.was ? (win.CQ.Raphael = R) : (CQ.Raphael = R);
})();
/*!
 * g.Raphael 0.4.2 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009 Dmitry Baranovskiy (http://g.raphaeljs.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
(function () {
    var mmax = Math.max,
        mmin = Math.min;
    CQ.Raphael.fn.g = CQ.Raphael.fn.g || {};
    CQ.Raphael.fn.g.markers = {
        disc: "disc",
        o: "disc",
        flower: "flower",
        f: "flower",
        diamond: "diamond",
        d: "diamond",
        square: "square",
        s: "square",
        triangle: "triangle",
        t: "triangle",
        star: "star",
        "*": "star",
        cross: "cross",
        x: "cross",
        plus: "plus",
        "+": "plus",
        arrow: "arrow",
        "->": "arrow"
    };
    CQ.Raphael.fn.g.shim = {stroke: "none", fill: "#000", "fill-opacity": 0};
    CQ.Raphael.fn.g.txtattr = {font: "12px Arial, sans-serif"};
    CQ.Raphael.fn.g.colors = [];
    var hues = [.6, .2, .05, .1333, .75, 0];
    for (var i = 0; i < 10; i++) {
        if (i < hues.length) {
            CQ.Raphael.fn.g.colors.push("hsb(" + hues[i] + ", .75, .75)");
        } else {
            CQ.Raphael.fn.g.colors.push("hsb(" + hues[i - hues.length] + ", 1, .5)");
        }
    }
    CQ.Raphael.fn.g.text = function (x, y, text) {
        return this.text(x, y, text).attr(this.g.txtattr);
    };
    CQ.Raphael.fn.g.labelise = function (label, val, total) {
        if (label) {
            return (label + "").replace(/(##+(?:\.#+)?)|(%%+(?:\.%+)?)/g, function (all, value, percent) {
                if (value) {
                    return (+val).toFixed(value.replace(/^#+\.?/g, "").length);
                }
                if (percent) {
                    return (val * 100 / total).toFixed(percent.replace(/^%+\.?/g, "").length) + "%";
                }
            });
        } else {
            return (+val).toFixed(0);
        }
    };

    CQ.Raphael.fn.g.finger = function (x, y, width, height, dir, ending, isPath) {
        // dir 0 for horisontal and 1 for vertical
        if ((dir && !height) || (!dir && !width)) {
            return isPath ? "" : this.path();
        }
        ending = {square: "square", sharp: "sharp", soft: "soft"}[ending] || "round";
        var path;
        height = Math.round(height);
        width = Math.round(width);
        x = Math.round(x);
        y = Math.round(y);
        switch (ending) {
            case "round":
            if (!dir) {
                var r = ~~(height / 2);
                if (width < r) {
                    r = width;
                    path = ["M", x + .5, y + .5 - ~~(height / 2), "l", 0, 0, "a", r, ~~(height / 2), 0, 0, 1, 0, height, "l", 0, 0, "z"];
                } else {
                    path = ["M", x + .5, y + .5 - r, "l", width - r, 0, "a", r, r, 0, 1, 1, 0, height, "l", r - width, 0, "z"];
                }
            } else {
                r = ~~(width / 2);
                if (height < r) {
                    r = height;
                    path = ["M", x - ~~(width / 2), y, "l", 0, 0, "a", ~~(width / 2), r, 0, 0, 1, width, 0, "l", 0, 0, "z"];
                } else {
                    path = ["M", x - r, y, "l", 0, r - height, "a", r, r, 0, 1, 1, width, 0, "l", 0, height - r, "z"];
                }
            }
            break;
            case "sharp":
            if (!dir) {
                var half = ~~(height / 2);
                path = ["M", x, y + half, "l", 0, -height, mmax(width - half, 0), 0, mmin(half, width), half, -mmin(half, width), half + (half * 2 < height), "z"];
            } else {
                half = ~~(width / 2);
                path = ["M", x + half, y, "l", -width, 0, 0, -mmax(height - half, 0), half, -mmin(half, height), half, mmin(half, height), half, "z"];
            }
            break;
            case "square":
            if (!dir) {
                path = ["M", x, y + ~~(height / 2), "l", 0, -height, width, 0, 0, height, "z"];
            } else {
                path = ["M", x + ~~(width / 2), y, "l", 1 - width, 0, 0, -height, width - 1, 0, "z"];
            }
            break;
            case "soft":
            if (!dir) {
                r = mmin(width, Math.round(height / 5));
                path = ["M", x + .5, y + .5 - ~~(height / 2), "l", width - r, 0, "a", r, r, 0, 0, 1, r, r, "l", 0, height - r * 2, "a", r, r, 0, 0, 1, -r, r, "l", r - width, 0, "z"];
            } else {
                r = mmin(Math.round(width / 5), height);
                path = ["M", x - ~~(width / 2), y, "l", 0, r - height, "a", r, r, 0, 0, 1, r, -r, "l", width - 2 * r, 0, "a", r, r, 0, 0, 1, r, r, "l", 0, height - r, "z"];
            }
        }
        if (isPath) {
            return path.join(",");
        } else {
            return this.path(path);
        }
    };

    // Symbols
    CQ.Raphael.fn.g.disc = function (cx, cy, r) {
        return this.circle(cx, cy, r);
    };
    CQ.Raphael.fn.g.line = function (cx, cy, r) {
        return this.rect(cx - r, cy - r / 5, 2 * r, 2 * r / 5);
    };
    CQ.Raphael.fn.g.square = function (cx, cy, r) {
        r = r * .7;
        return this.rect(cx - r, cy - r, 2 * r, 2 * r);
    };
    CQ.Raphael.fn.g.triangle = function (cx, cy, r) {
        r *= 1.75;
        return this.path("M".concat(cx, ",", cy, "m0-", r * .58, "l", r * .5, ",", r * .87, "-", r, ",0z"));
    };
    CQ.Raphael.fn.g.diamond = function (cx, cy, r) {
        return this.path(["M", cx, cy - r, "l", r, r, -r, r, -r, -r, r, -r, "z"]);
    };
    CQ.Raphael.fn.g.flower = function (cx, cy, r, n) {
        r = r * 1.25;
        var rout = r,
            rin = rout * .5;
        n = +n < 3 || !n ? 5 : n;
        var points = ["M", cx, cy + rin, "Q"],
            R;
        for (var i = 1; i < n * 2 + 1; i++) {
            R = i % 2 ? rout : rin;
            points = points.concat([+(cx + R * Math.sin(i * Math.PI / n)).toFixed(3), +(cy + R * Math.cos(i * Math.PI / n)).toFixed(3)]);
        }
        points.push("z");
        return this.path(points.join(","));
    };
    CQ.Raphael.fn.g.star = function (cx, cy, r, r2, rays) {
        r2 = r2 || r * .382;
        rays = rays || 5;
        var points = ["M", cx, cy + r2, "L"],
            R;
        for (var i = 1; i < rays * 2; i++) {
            R = i % 2 ? r : r2;
            points = points.concat([(cx + R * Math.sin(i * Math.PI / rays)), (cy + R * Math.cos(i * Math.PI / rays))]);
        }
        points.push("z");
        return this.path(points.join(","));
    };
    CQ.Raphael.fn.g.cross = function (cx, cy, r) {
        r = r / 2.5;
        return this.path("M".concat(cx - r, ",", cy, "l", [-r, -r, r, -r, r, r, r, -r, r, r, -r, r, r, r, -r, r, -r, -r, -r, r, -r, -r, "z"]));
    };
    CQ.Raphael.fn.g.plus = function (cx, cy, r) {
        r = r / 2;
        return this.path("M".concat(cx - r / 2, ",", cy - r / 2, "l", [0, -r, r, 0, 0, r, r, 0, 0, r, -r, 0, 0, r, -r, 0, 0, -r, -r, 0, 0, -r, "z"]));
    };
    CQ.Raphael.fn.g.arrow = function (cx, cy, r) {
        return this.path("M".concat(cx - r * .7, ",", cy - r * .4, "l", [r * .6, 0, 0, -r * .4, r, r * .8, -r, r * .8, 0, -r * .4, -r * .6, 0], "z"));
    };

    // Tooltips
    CQ.Raphael.fn.g.tag = function (x, y, text, angle, r) {
        angle = angle || 0;
        r = r == null ? 5 : r;
        text = text == null ? "$9.99" : text;
        var R = .5522 * r,
            res = this.set(),
            d = 3;
        res.push(this.path().attr({fill: "#000", stroke: "#000"}));
        res.push(this.text(x, y, text).attr(this.g.txtattr).attr({fill: "#fff", "font-family": "Helvetica, Arial"}));
        res.update = function () {
            this.rotate(0, x, y);
            var bb = this[1].getBBox();
            if (bb.height >= r * 2) {
                this[0].attr({path: ["M", x, y + r, "a", r, r, 0, 1, 1, 0, -r * 2, r, r, 0, 1, 1, 0, r * 2, "m", 0, -r * 2 -d, "a", r + d, r + d, 0, 1, 0, 0, (r + d) * 2, "L", x + r + d, y + bb.height / 2 + d, "l", bb.width + 2 * d, 0, 0, -bb.height - 2 * d, -bb.width - 2 * d, 0, "L", x, y - r - d].join(",")});
            } else {
                var dx = Math.sqrt(Math.pow(r + d, 2) - Math.pow(bb.height / 2 + d, 2));
                this[0].attr({path: ["M", x, y + r, "c", -R, 0, -r, R - r, -r, -r, 0, -R, r - R, -r, r, -r, R, 0, r, r - R, r, r, 0, R, R - r, r, -r, r, "M", x + dx, y - bb.height / 2 - d, "a", r + d, r + d, 0, 1, 0, 0, bb.height + 2 * d, "l", r + d - dx + bb.width + 2 * d, 0, 0, -bb.height - 2 * d, "L", x + dx, y - bb.height / 2 - d].join(",")});
            }
            this[1].attr({x: x + r + d + bb.width / 2, y: y});
            angle = (360 - angle) % 360;
            this.rotate(angle, x, y);
            angle > 90 && angle < 270 && this[1].attr({x: x - r - d - bb.width / 2, y: y, rotation: [180 + angle, x, y]});
            return this;
        };
        res.update();
        return res;
    };
    CQ.Raphael.fn.g.popupit = function (x, y, set, dir, size) {
        dir = dir == null ? 2 : dir;
        size = size || 5;
        x = Math.round(x);
        y = Math.round(y);
        var bb = set.getBBox(),
            w = Math.round(bb.width / 2),
            h = Math.round(bb.height / 2),
            dx = [0, w + size * 2, 0, -w - size * 2],
            dy = [-h * 2 - size * 3, -h - size, 0, -h - size],
            p = ["M", x - dx[dir], y - dy[dir], "l", -size, (dir == 2) * -size, -mmax(w - size, 0), 0, "a", size, size, 0, 0, 1, -size, -size,
                "l", 0, -mmax(h - size, 0), (dir == 3) * -size, -size, (dir == 3) * size, -size, 0, -mmax(h - size, 0), "a", size, size, 0, 0, 1, size, -size,
                "l", mmax(w - size, 0), 0, size, !dir * -size, size, !dir * size, mmax(w - size, 0), 0, "a", size, size, 0, 0, 1, size, size,
                "l", 0, mmax(h - size, 0), (dir == 1) * size, size, (dir == 1) * -size, size, 0, mmax(h - size, 0), "a", size, size, 0, 0, 1, -size, size,
                "l", -mmax(w - size, 0), 0, "z"].join(","),
            xy = [{x: x, y: y + size * 2 + h}, {x: x - size * 2 - w, y: y}, {x: x, y: y - size * 2 - h}, {x: x + size * 2 + w, y: y}][dir];
        set.translate(xy.x - w - bb.x, xy.y - h - bb.y);
        return this.path(p).attr({fill: "#000", stroke: "none"}).insertBefore(set.node ? set : set[0]);
    };
    CQ.Raphael.fn.g.popup = function (x, y, text, dir, size) {
        dir = dir == null ? 2 : dir > 3 ? 3 : dir;
        size = size || 5;
        text = text || "$9.99";
        var res = this.set(),
            d = 3;
        res.push(this.path().attr({fill: "#000", stroke: "#000"}));
        res.push(this.text(x, y, text).attr(this.g.txtattr).attr({fill: "#fff", "font-family": "Helvetica, Arial"}));
        res.update = function (X, Y, withAnimation) {
            X = X || x;
            Y = Y || y;
            var bb = this[1].getBBox(),
                w = bb.width / 2,
                h = bb.height / 2,
                dx = [0, w + size * 2, 0, -w - size * 2],
                dy = [-h * 2 - size * 3, -h - size, 0, -h - size],
                p = ["M", X - dx[dir], Y - dy[dir], "l", -size, (dir == 2) * -size, -mmax(w - size, 0), 0, "a", size, size, 0, 0, 1, -size, -size,
                    "l", 0, -mmax(h - size, 0), (dir == 3) * -size, -size, (dir == 3) * size, -size, 0, -mmax(h - size, 0), "a", size, size, 0, 0, 1, size, -size,
                    "l", mmax(w - size, 0), 0, size, !dir * -size, size, !dir * size, mmax(w - size, 0), 0, "a", size, size, 0, 0, 1, size, size,
                    "l", 0, mmax(h - size, 0), (dir == 1) * size, size, (dir == 1) * -size, size, 0, mmax(h - size, 0), "a", size, size, 0, 0, 1, -size, size,
                    "l", -mmax(w - size, 0), 0, "z"].join(","),
                xy = [{x: X, y: Y + size * 2 + h}, {x: X - size * 2 - w, y: Y}, {x: X, y: Y - size * 2 - h}, {x: X + size * 2 + w, y: Y}][dir];
            xy.path = p;
            if (withAnimation) {
                this.animate(xy, 500, ">");
            } else {
                this.attr(xy);
            }
            return this;
        };
        return res.update(x, y);
    };
    CQ.Raphael.fn.g.flag = function (x, y, text, angle) {
        angle = angle || 0;
        text = text || "$9.99";
        var res = this.set(),
            d = 3;
        res.push(this.path().attr({fill: "#000", stroke: "#000"}));
        res.push(this.text(x, y, text).attr(this.g.txtattr).attr({fill: "#fff", "font-family": "Helvetica, Arial"}));
        res.update = function (x, y) {
            this.rotate(0, x, y);
            var bb = this[1].getBBox(),
                h = bb.height / 2;
            this[0].attr({path: ["M", x, y, "l", h + d, -h - d, bb.width + 2 * d, 0, 0, bb.height + 2 * d, -bb.width - 2 * d, 0, "z"].join(",")});
            this[1].attr({x: x + h + d + bb.width / 2, y: y});
            angle = 360 - angle;
            this.rotate(angle, x, y);
            angle > 90 && angle < 270 && this[1].attr({x: x - r - d - bb.width / 2, y: y, rotation: [180 + angle, x, y]});
            return this;
        };
        return res.update(x, y);
    };
    CQ.Raphael.fn.g.label = function (x, y, text) {
        var res = this.set();
        res.push(this.rect(x, y, 10, 10).attr({stroke: "none", fill: "#000"}));
        res.push(this.text(x, y, text).attr(this.g.txtattr).attr({fill: "#fff"}));
        res.update = function () {
            var bb = this[1].getBBox(),
                r = mmin(bb.width + 10, bb.height + 10) / 2;
            this[0].attr({x: bb.x - r / 2, y: bb.y - r / 2, width: bb.width + r, height: bb.height + r, r: r});
        };
        res.update();
        return res;
    };
    CQ.Raphael.fn.g.labelit = function (set) {
        var bb = set.getBBox(),
            r = mmin(20, bb.width + 10, bb.height + 10) / 2;
        return this.rect(bb.x - r / 2, bb.y - r / 2, bb.width + r, bb.height + r, r).attr({stroke: "none", fill: "#000"}).insertBefore(set.node ? set : set[0]);
    };
    CQ.Raphael.fn.g.drop = function (x, y, text, size, angle) {
        size = size || 30;
        angle = angle || 0;
        var res = this.set();
        res.push(this.path(["M", x, y, "l", size, 0, "A", size * .4, size * .4, 0, 1, 0, x + size * .7, y - size * .7, "z"]).attr({fill: "#000", stroke: "none", rotation: [22.5 - angle, x, y]}));
        angle = (angle + 90) * Math.PI / 180;
        res.push(this.text(x + size * Math.sin(angle), y + size * Math.cos(angle), text).attr(this.g.txtattr).attr({"font-size": size * 12 / 30, fill: "#fff"}));
        res.drop = res[0];
        res.text = res[1];
        return res;
    };
    CQ.Raphael.fn.g.blob = function (x, y, text, angle, size) {
        angle = (+angle + 1 ? angle : 45) + 90;
        size = size || 12;
        var rad = Math.PI / 180,
            fontSize = size * 12 / 12;
        var res = this.set();
        res.push(this.path().attr({fill: "#000", stroke: "none"}));
        res.push(this.text(x + size * Math.sin((angle) * rad), y + size * Math.cos((angle) * rad) - fontSize / 2, text).attr(this.g.txtattr).attr({"font-size": fontSize, fill: "#fff"}));
        res.update = function (X, Y, withAnimation) {
            X = X || x;
            Y = Y || y;
            var bb = this[1].getBBox(),
                w = mmax(bb.width + fontSize, size * 25 / 12),
                h = mmax(bb.height + fontSize, size * 25 / 12),
                x2 = X + size * Math.sin((angle - 22.5) * rad),
                y2 = Y + size * Math.cos((angle - 22.5) * rad),
                x1 = X + size * Math.sin((angle + 22.5) * rad),
                y1 = Y + size * Math.cos((angle + 22.5) * rad),
                dx = (x1 - x2) / 2,
                dy = (y1 - y2) / 2,
                rx = w / 2,
                ry = h / 2,
                k = -Math.sqrt(Math.abs(rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx) / (rx * rx * dy * dy + ry * ry * dx * dx)),
                cx = k * rx * dy / ry + (x1 + x2) / 2,
                cy = k * -ry * dx / rx + (y1 + y2) / 2;
            if (withAnimation) {
                this.animate({x: cx, y: cy, path: ["M", x, y, "L", x1, y1, "A", rx, ry, 0, 1, 1, x2, y2, "z"].join(",")}, 500, ">");
            } else {
                this.attr({x: cx, y: cy, path: ["M", x, y, "L", x1, y1, "A", rx, ry, 0, 1, 1, x2, y2, "z"].join(",")});
            }
            return this;
        };
        res.update(x, y);
        return res;
    };

    CQ.Raphael.fn.g.colorValue = function (value, total, s, b) {
        return "hsb(" + [mmin((1 - value / total) * .4, 1), s || .75, b || .75] + ")";
    };

    CQ.Raphael.fn.g.snapEnds = function (from, to, steps) {
        var f = from,
            t = to;
        // CQ:START guard against endless loop if non-numeric values are provided
        if (isNaN(f) || isNaN(t)) {
            return {from: 0, to: 0, power: 0};
        }
        // CQ:END        
        if (f == t) {
            return {from: f, to: t, power: 0};
        }
        function round(a) {
            return Math.abs(a - .5) < .25 ? ~~(a) + .5 : Math.round(a);
        }
        var d = (t - f) / steps,
            r = ~~(d),
            R = r,
            i = 0;
        if (r) {
            while (R) {
                i--;
                R = ~~(d * Math.pow(10, i)) / Math.pow(10, i);
            }
            i ++;
        } else {
            while (!r) {
                i = i || 1;
                r = ~~(d * Math.pow(10, i)) / Math.pow(10, i);
                i++;
            }
            i && i--;
        }
        t = round(to * Math.pow(10, i)) / Math.pow(10, i);
        if (t < to) {
            t = round((to + .5) * Math.pow(10, i)) / Math.pow(10, i);
        }
        f = round((from - (i > 0 ? 0 : .5)) * Math.pow(10, i)) / Math.pow(10, i);
        return {from: f, to: t, power: i};
    };
    CQ.Raphael.fn.g.axis = function (x, y, length, from, to, steps, orientation, labels, type, dashsize) {
        dashsize = dashsize == null ? 2 : dashsize;
        type = type || "t";
        steps = steps || 10;
        var path = type == "|" || type == " " ? ["M", x + .5, y, "l", 0, .001] : orientation == 1 || orientation == 3 ? ["M", x + .5, y, "l", 0, -length] : ["M", x, y + .5, "l", length, 0],
            ends = this.g.snapEnds(from, to, steps),
            f = ends.from,
            t = ends.to,
            i = ends.power,
            j = 0,
            // CQ:START axis label injection
            text = this.set(),
            value;
            // CQ:END
        d = (t - f) / steps;
        var label = f,
            rnd = i > 0 ? i : 0;
            dx = length / steps;
        if (+orientation == 1 || +orientation == 3) {
            var Y = y,
                addon = (orientation - 1 ? 1 : -1) * (dashsize + 3 + !!(orientation - 1));
            while (Y >= y - length) {
                type != "-" && type != " " && (path = path.concat(["M", x - (type == "+" || type == "|" ? dashsize : !(orientation - 1) * dashsize * 2), Y + .5, "l", dashsize * 2 + 1, 0]));
                // CQ:START axis label injection
                value = (typeof(labels) == "function" ? labels(label) : null);
                text.push(this.text(x + addon, Y, value || (labels && labels[j++]) || (Math.round(label) == label ? label : +label.toFixed(rnd))).attr(this.g.txtattr).attr({"text-anchor": orientation - 1 ? "start" : "end"}));
                // CQ:END
                label += d;
                Y -= dx;
            }
            if (Math.round(Y + dx - (y - length))) {
                type != "-" && type != " " && (path = path.concat(["M", x - (type == "+" || type == "|" ? dashsize : !(orientation - 1) * dashsize * 2), y - length + .5, "l", dashsize * 2 + 1, 0]));
                // CQ:START axis label injection
                value = (typeof(labels) == "function" ? labels(label) : null);
                text.push(this.text(x + addon, y - length, value || (labels && labels[j]) || (Math.round(label) == label ? label : +label.toFixed(rnd))).attr(this.g.txtattr).attr({"text-anchor": orientation - 1 ? "start" : "end"}));
                // CQ:END
            }
        } else {
            label = f;
            rnd = (i > 0) * i;
            addon = (orientation ? -1 : 1) * (dashsize + 9 + !orientation);
            var X = x,
                dx = length / steps,
                txt = 0,
                // CQ:START Ensure first legend value gets always displayed
                prev = null;
                // CQ:END
            while (X <= x + length) {
                type != "-" && type != " " && (path = path.concat(["M", X + .5, y - (type == "+" ? dashsize : !!orientation * dashsize * 2), "l", 0, dashsize * 2 + 1]));
                // CQ:START axis label injection
                value = (typeof(labels) == "function" ? labels(label) : null);
                text.push(txt = this.text(X, y + addon, value || (labels && labels[j++]) || (Math.round(label) == label ? label : +label.toFixed(rnd))).attr(this.g.txtattr));
                // CQ:END
                var bb = txt.getBBox();
                // CQ:START Ensure first legend value gets always displayed
                if ((prev != null) && (prev >= bb.x - 5)) {
                // CQ:END
                    text.pop(text.length - 1).remove();
                } else {
                    prev = bb.x + bb.width;
                }
                label += d;
                X += dx;
            }
            if (Math.round(X - dx - x - length)) {
                type != "-" && type != " " && (path = path.concat(["M", x + length + .5, y - (type == "+" ? dashsize : !!orientation * dashsize * 2), "l", 0, dashsize * 2 + 1]));
                // CQ:START axis label injection
                value = (typeof(labels) == "function" ? labels(label) : null);
                text.push(this.text(x + length, y + addon, value || (labels && labels[j]) || (Math.round(label) == label ? label : +label.toFixed(rnd))).attr(this.g.txtattr));
                // CQ:END
            }
        }
        var res = this.path(path);
        res.text = text;
        res.all = this.set([res, text]);
        res.remove = function () {
            this.text.remove();
            this.constructor.prototype.remove.call(this);
        };
        return res;
    };

    CQ.Raphael.el.lighter = function (times) {
        times = times || 2;
        var fs = [this.attrs.fill, this.attrs.stroke];
        this.fs = this.fs || [fs[0], fs[1]];
        fs[0] = CQ.Raphael.rgb2hsb(CQ.Raphael.getRGB(fs[0]).hex);
        fs[1] = CQ.Raphael.rgb2hsb(CQ.Raphael.getRGB(fs[1]).hex);
        fs[0].b = mmin(fs[0].b * times, 1);
        fs[0].s = fs[0].s / times;
        fs[1].b = mmin(fs[1].b * times, 1);
        fs[1].s = fs[1].s / times;
        this.attr({fill: "hsb(" + [fs[0].h, fs[0].s, fs[0].b] + ")", stroke: "hsb(" + [fs[1].h, fs[1].s, fs[1].b] + ")"});
    };
    CQ.Raphael.el.darker = function (times) {
        times = times || 2;
        var fs = [this.attrs.fill, this.attrs.stroke];
        this.fs = this.fs || [fs[0], fs[1]];
        fs[0] = CQ.Raphael.rgb2hsb(CQ.Raphael.getRGB(fs[0]).hex);
        fs[1] = CQ.Raphael.rgb2hsb(CQ.Raphael.getRGB(fs[1]).hex);
        fs[0].s = mmin(fs[0].s * times, 1);
        fs[0].b = fs[0].b / times;
        fs[1].s = mmin(fs[1].s * times, 1);
        fs[1].b = fs[1].b / times;
        this.attr({fill: "hsb(" + [fs[0].h, fs[0].s, fs[0].b] + ")", stroke: "hsb(" + [fs[1].h, fs[1].s, fs[1].b] + ")"});
    };
    CQ.Raphael.el.original = function () {
        if (this.fs) {
            this.attr({fill: this.fs[0], stroke: this.fs[1]});
            delete this.fs;
        }
    };
})();
/*!
 * g.Raphael 0.4.2 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009 Dmitry Baranovskiy (http://g.raphaeljs.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
CQ.Raphael.fn.g.piechart = function (cx, cy, r, values, opts) {
    opts = opts || {};
    var paper = this,
        sectors = [],
        covers = this.set(),
        chart = this.set(),
        series = this.set(),
        order = [],
        len = values.length,
        angle = 0,
        total = 0,
        others = 0,
        // CQ:START Make "cut" option configurable; make line height configurable
        cut = opts.cut || 9,
        lineHeight = opts.lineHeight,
        legendYOffs = opts.legendYOffs || 0,
        // CQ:END
        defcut = true;
    chart.covers = covers;
    if (len == 1) {
        series.push(this.circle(cx, cy, r).attr({fill: this.g.colors[0], stroke: opts.stroke || "#fff", "stroke-width": opts.strokewidth == null ? 1 : opts.strokewidth}));
        covers.push(this.circle(cx, cy, r).attr(this.g.shim));
        total = values[0];
        values[0] = {value: values[0], order: 0, valueOf: function () { return this.value; }};
        series[0].middle = {x: cx, y: cy};
        series[0].mangle = 180;
    } else {
        function sector(cx, cy, r, startAngle, endAngle, fill) {
            var rad = Math.PI / 180,
                x1 = cx + r * Math.cos(-startAngle * rad),
                x2 = cx + r * Math.cos(-endAngle * rad),
                xm = cx + r / 2 * Math.cos(-(startAngle + (endAngle - startAngle) / 2) * rad),
                y1 = cy + r * Math.sin(-startAngle * rad),
                y2 = cy + r * Math.sin(-endAngle * rad),
                ym = cy + r / 2 * Math.sin(-(startAngle + (endAngle - startAngle) / 2) * rad),
                res = ["M", cx, cy, "L", x1, y1, "A", r, r, 0, +(Math.abs(endAngle - startAngle) > 180), 1, x2, y2, "z"];
            res.middle = {x: xm, y: ym};
            return res;
        }
        for (var i = 0; i < len; i++) {
            total += values[i];
            values[i] = {value: values[i], order: i, valueOf: function () { return this.value; }};
        }
        // CQ:START make sorting optional
        if (!opts.preventSorting) {
            values.sort(function (a, b) {
                return b.value - a.value;
            });
        }
        // CQ:END
        // CQ:START Make removal of small pies optional
        if (!opts.allowTinyPies) {
            for (i = 0; i < len; i++) {
                if (defcut && values[i] * 360 / total <= 1.5) {
                    cut = i;
                    defcut = false;
                }
                if (i > cut) {
                    defcut = false;
                    values[cut].value += values[i];
                    values[cut].others = true;
                    others = values[cut].value;
                }
            }
        }
        // CQ:END
        len = Math.min(cut + 1, values.length);
        others && values.splice(len) && (values[cut].others = true);
        for (i = 0; i < len; i++) {
            var mangle = angle - 360 * values[i] / total / 2;
            if (!i) {
                angle = 90 - mangle;
                mangle = angle - 360 * values[i] / total / 2;
            }
            if (opts.init) {
                var ipath = sector(cx, cy, 1, angle, angle - 360 * values[i] / total).join(",");
            }
            var path = sector(cx, cy, r, angle, angle -= 360 * values[i] / total);
            var p = this.path(opts.init ? ipath : path).attr({fill: opts.colors && opts.colors[i] || this.g.colors[i] || "#666", stroke: opts.stroke || "#fff", "stroke-width": (opts.strokewidth == null ? 1 : opts.strokewidth), "stroke-linejoin": "round"});
            p.value = values[i];
            p.middle = path.middle;
            p.mangle = mangle;
            sectors.push(p);
            series.push(p);
            opts.init && p.animate({path: path.join(",")}, (+opts.init - 1) || 1000, ">");
        }
        for (i = 0; i < len; i++) {
            p = paper.path(sectors[i].attr("path")).attr(this.g.shim);
            opts.href && opts.href[i] && p.attr({href: opts.href[i]});
            p.attr = function () {};
            covers.push(p);
            series.push(p);
        }
    }

    chart.hover = function (fin, fout) {
        fout = fout || function () {};
        var that = this;
        for (var i = 0; i < len; i++) {
            (function (sector, cover, j) {
                var o = {
                    sector: sector,
                    cover: cover,
                    cx: cx,
                    cy: cy,
                    mx: sector.middle.x,
                    my: sector.middle.y,
                    mangle: sector.mangle,
                    r: r,
                    value: values[j],
                    total: total,
                    label: that.labels && that.labels[j]
                };
                cover.mouseover(function () {
                    fin.call(o);
                }).mouseout(function () {
                    fout.call(o);
                });
            })(series[i], covers[i], i);
        }
        return this;
    };
    // x: where label could be put
    // y: where label could be put
    // value: value to show
    // total: total number to count %
    chart.each = function (f) {
        var that = this;
        for (var i = 0; i < len; i++) {
            (function (sector, cover, j) {
                var o = {
                    sector: sector,
                    cover: cover,
                    cx: cx,
                    cy: cy,
                    x: sector.middle.x,
                    y: sector.middle.y,
                    mangle: sector.mangle,
                    r: r,
                    value: values[j],
                    total: total,
                    label: that.labels && that.labels[j]
                };
                f.call(o);
            })(series[i], covers[i], i);
        }
        return this;
    };
    chart.click = function (f) {
        var that = this;
        for (var i = 0; i < len; i++) {
            (function (sector, cover, j) {
                var o = {
                    sector: sector,
                    cover: cover,
                    cx: cx,
                    cy: cy,
                    mx: sector.middle.x,
                    my: sector.middle.y,
                    mangle: sector.mangle,
                    r: r,
                    value: values[j],
                    total: total,
                    label: that.labels && that.labels[j]
                };
                cover.click(function () { f.call(o); });
            })(series[i], covers[i], i);
        }
        return this;
    };
    chart.inject = function (element) {
        element.insertBefore(covers[0]);
    };
    var legend = function (labels, otherslabel, mark, dir) {
        var x = cx + r + r / 5,
            y = cy,
            // CQ:START Use calculated height + correction offset for Gecko-related bug
            h = y + 10,
            ch = 0;
            // CQ:END
        labels = labels || [];
        dir = (dir && dir.toLowerCase && dir.toLowerCase()) || "east";
        mark = paper.g.markers[mark && mark.toLowerCase()] || "disc";
        chart.labels = paper.set();
        for (var i = 0; i < len; i++) {
            var clr = series[i].attr("fill"),
                j = values[i].order,
                txt;
            // CQ:START I18n
            values[i].others && (labels[j] = otherslabel || CQ.I18n.getMessage("Others"));
            // CQ:END
            labels[j] = paper.g.labelise(labels[j], values[i], total);
            chart.labels.push(paper.set());
            chart.labels[i].push(paper.g[mark](x + 5, h, 5).attr({fill: clr, stroke: "none"}));
            // CQ:START
            chart.labels[i].push(txt = paper.text(x + 20, h  + legendYOffs, labels[j] || values[j]).attr(paper.g.txtattr).attr({fill: opts.legendcolor || "#000", "text-anchor": "start"}));
            // CQ:END
            covers[i].label = chart.labels[i];
            // CQ:START Use line height provided from outside to avoid problems if chart is created in invisible div
            var tlh = lineHeight || ((txt.getBBox().height || 12) * 1.2);
            h += tlh;
            ch += tlh;
            // CQ:END
        }
        var bb = chart.labels.getBBox(),
            // CQ:START Use calculated height for positioning - currently only works for direction "east" correctly
            tr = {
                east: [0, -ch / 2],
                west: [-bb.width - 2 * r - 20, -ch / 2],
                north: [-r - bb.width / 2, -r - ch - 10],
                south: [-r - bb.width / 2, r + 10]
            }[dir];
            // CQ:END
        chart.labels.translate.apply(chart.labels, tr);
        chart.push(chart.labels);
    };
    if (opts.legend) {
        legend(opts.legend, opts.legendothers, opts.legendmark, opts.legendpos);
    }
    chart.push(series, covers);
    chart.series = series;
    chart.covers = covers;
    return chart;
};

/*!
 * g.Raphael 0.4.2 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009 Dmitry Baranovskiy (http://g.raphaeljs.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
CQ.Raphael.fn.g.barchart = function (x, y, width, height, values, opts) {
    opts = opts || {};
    var type = {round: "round", sharp: "sharp", soft: "soft"}[opts.type] || "square",
        gutter = parseFloat(opts.gutter || "20%"),
        chart = this.set(),
        bars = this.set(),
        covers = this.set(),
        covers2 = this.set(),
        total = Math.max.apply(Math, values),
        stacktotal = [],
        paper = this,
        multi = 0,
        colors = opts.colors || this.g.colors,
        len = values.length;
    if (this.raphael.is(values[0], "array")) {
        total = [];
        multi = len;
        len = 0;
        for (var i = values.length; i--;) {
            bars.push(this.set());
            total.push(Math.max.apply(Math, values[i]));
            len = Math.max(len, values[i].length);
        }
        if (opts.stacked) {
            for (var i = len; i--;) {
                var tot = 0;
                for (var j = values.length; j--;) {
                    tot +=+ values[j][i] || 0;
                }
                stacktotal.push(tot);
            }
        }
        for (var i = values.length; i--;) {
            if (values[i].length < len) {
                for (var j = len; j--;) {
                    values[i].push(0);
                }
            }
        }
        total = Math.max.apply(Math, opts.stacked ? stacktotal : total);
    }

    total = (opts.to) || total;
    var barwidth = width / (len * (100 + gutter) + gutter) * 100,
        barhgutter = barwidth * gutter / 100,
        barvgutter = opts.vgutter == null ? 20 : opts.vgutter,
        stack = [],
        X = x + barhgutter,
        Y = (height - 2 * barvgutter) / total;
    if (!opts.stretch) {
        barhgutter = Math.round(barhgutter);
        barwidth = Math.floor(barwidth);
    }
    !opts.stacked && (barwidth /= multi || 1);
    for (var i = 0; i < len; i++) {
        stack = [];
        for (var j = 0; j < (multi || 1); j++) {
            var h = Math.round((multi ? values[j][i] : values[i]) * Y),
                top = y + height - barvgutter - h,
                bar = this.g.finger(Math.round(X + barwidth / 2), top + h, barwidth, h, true, type).attr({stroke: "none", fill: colors[multi ? j : i]});
            if (multi) {
                bars[j].push(bar);
            } else {
                bars.push(bar);
            }
            bar.y = top;
            bar.x = Math.round(X + barwidth / 2);
            bar.w = barwidth;
            bar.h = h;
            bar.value = multi ? values[j][i] : values[i];
            if (!opts.stacked) {
                X += barwidth;
            } else {
                stack.push(bar);
            }
        }
        if (opts.stacked) {
            var cvr;
            covers2.push(cvr = this.rect(stack[0].x - stack[0].w / 2, y, barwidth, height).attr(this.g.shim));
            cvr.bars = this.set();
            var size = 0;
            for (var s = stack.length; s--;) {
                stack[s].toFront();
            }
            for (var s = 0, ss = stack.length; s < ss; s++) {
                var bar = stack[s],
                    cover,
                    h = (size + bar.value) * Y,
                    path = this.g.finger(bar.x, y + height - barvgutter - !!size * .5, barwidth, h, true, type, 1);
                cvr.bars.push(bar);
                size && bar.attr({path: path});
                bar.h = h;
                bar.y = y + height - barvgutter - !!size * .5 - h;
                covers.push(cover = this.rect(bar.x - bar.w / 2, bar.y, barwidth, bar.value * Y).attr(this.g.shim));
                cover.bar = bar;
                cover.value = bar.value;
                size += bar.value;
            }
            X += barwidth;
        }
        X += barhgutter;
    }
    covers2.toFront();
    X = x + barhgutter;
    if (!opts.stacked) {
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < (multi || 1); j++) {
                var cover;
                covers.push(cover = this.rect(Math.round(X), y + barvgutter, barwidth, height - barvgutter).attr(this.g.shim));
                cover.bar = multi ? bars[j][i] : bars[i];
                cover.value = cover.bar.value;
                X += barwidth;
            }
            X += barhgutter;
        }
    }
    chart.label = function (labels, isBottom) {
        labels = labels || [];
        this.labels = paper.set();
        var L, l = -Infinity;
        if (opts.stacked) {
            for (var i = 0; i < len; i++) {
                var tot = 0;
                for (var j = 0; j < (multi || 1); j++) {
                    tot += multi ? values[j][i] : values[i];
                    if (j == multi - 1) {
                        var label = paper.g.labelise(labels[i], tot, total);
                        L = paper.g.text(bars[i * (multi || 1) + j].x, y + height - barvgutter / 2, label).insertBefore(covers[i * (multi || 1) + j]);
                        var bb = L.getBBox();
                        if (bb.x - 7 < l) {
                            L.remove();
                        } else {
                            this.labels.push(L);
                            l = bb.x + bb.width;
                        }
                    }
                }
            }
        } else {
            for (var i = 0; i < len; i++) {
                for (var j = 0; j < (multi || 1); j++) {
                    var label = paper.g.labelise(multi ? labels[j] && labels[j][i] : labels[i], multi ? values[j][i] : values[i], total);
                    L = paper.g.text(bars[i * (multi || 1) + j].x, isBottom ? y + height - barvgutter / 2 : bars[i * (multi || 1) + j].y - 10, label).insertBefore(covers[i * (multi || 1) + j]);
                    var bb = L.getBBox();
                    if (bb.x - 7 < l) {
                        L.remove();
                    } else {
                        this.labels.push(L);
                        l = bb.x + bb.width;
                    }
                }
            }
        }
        return this;
    };
    chart.hover = function (fin, fout) {
        covers2.hide();
        covers.show();
        covers.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.hoverColumn = function (fin, fout) {
        covers.hide();
        covers2.show();
        fout = fout || function () {};
        covers2.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.click = function (f) {
        covers2.hide();
        covers.show();
        covers.click(f);
        return this;
    };
    chart.each = function (f) {
        if (!CQ.Raphael.is(f, "function")) {
            return this;
        }
        for (var i = covers.length; i--;) {
            f.call(covers[i]);
        }
        return this;
    };
    chart.eachColumn = function (f) {
        if (!CQ.Raphael.is(f, "function")) {
            return this;
        }
        for (var i = covers2.length; i--;) {
            f.call(covers2[i]);
        }
        return this;
    };
    chart.clickColumn = function (f) {
        covers.hide();
        covers2.show();
        covers2.click(f);
        return this;
    };
    chart.push(bars, covers, covers2);
    chart.bars = bars;
    chart.covers = covers;
    return chart;
};
CQ.Raphael.fn.g.hbarchart = function (x, y, width, height, values, opts) {
    opts = opts || {};
    var type = {round: "round", sharp: "sharp", soft: "soft"}[opts.type] || "square",
        gutter = parseFloat(opts.gutter || "20%"),
        chart = this.set(),
        bars = this.set(),
        covers = this.set(),
        covers2 = this.set(),
        total = Math.max.apply(Math, values),
        stacktotal = [],
        paper = this,
        multi = 0,
        colors = opts.colors || this.g.colors,
        len = values.length;
    if (this.raphael.is(values[0], "array")) {
        total = [];
        multi = len;
        len = 0;
        for (var i = values.length; i--;) {
            bars.push(this.set());
            total.push(Math.max.apply(Math, values[i]));
            len = Math.max(len, values[i].length);
        }
        if (opts.stacked) {
            for (var i = len; i--;) {
                var tot = 0;
                for (var j = values.length; j--;) {
                    tot +=+ values[j][i] || 0;
                }
                stacktotal.push(tot);
            }
        }
        for (var i = values.length; i--;) {
            if (values[i].length < len) {
                for (var j = len; j--;) {
                    values[i].push(0);
                }
            }
        }
        total = Math.max.apply(Math, opts.stacked ? stacktotal : total);
    }

    total = (opts.to) || total;
    var barheight = Math.floor(height / (len * (100 + gutter) + gutter) * 100),
        bargutter = Math.floor(barheight * gutter / 100),
        stack = [],
        Y = y + bargutter,
        X = (width - 1) / total;
    !opts.stacked && (barheight /= multi || 1);
    for (var i = 0; i < len; i++) {
        stack = [];
        for (var j = 0; j < (multi || 1); j++) {
            var val = multi ? values[j][i] : values[i],
                bar = this.g.finger(x, Y + barheight / 2, Math.round(val * X), barheight - 1, false, type).attr({stroke: "none", fill: colors[multi ? j : i]});
            if (multi) {
                bars[j].push(bar);
            } else {
                bars.push(bar);
            }
            bar.x = x + Math.round(val * X);
            bar.y = Y + barheight / 2;
            bar.w = Math.round(val * X);
            bar.h = barheight;
            bar.value = +val;
            if (!opts.stacked) {
                Y += barheight;
            } else {
                stack.push(bar);
            }
        }
        if (opts.stacked) {
            var cvr = this.rect(x, stack[0].y - stack[0].h / 2, width, barheight).attr(this.g.shim);
            covers2.push(cvr);
            cvr.bars = this.set();
            var size = 0;
            for (var s = stack.length; s--;) {
                stack[s].toFront();
            }
            for (var s = 0, ss = stack.length; s < ss; s++) {
                var bar = stack[s],
                    cover,
                    val = Math.round((size + bar.value) * X),
                    path = this.g.finger(x, bar.y, val, barheight - 1, false, type, 1);
                cvr.bars.push(bar);
                size && bar.attr({path: path});
                bar.w = val;
                bar.x = x + val;
                covers.push(cover = this.rect(x + size * X, bar.y - bar.h / 2, bar.value * X, barheight).attr(this.g.shim));
                cover.bar = bar;
                size += bar.value;
            }
            Y += barheight;
        }
        Y += bargutter;
    }
    covers2.toFront();
    Y = y + bargutter;
    if (!opts.stacked) {
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < (multi || 1); j++) {
                var cover = this.rect(x, Y, width, barheight).attr(this.g.shim);
                covers.push(cover);
                cover.bar = multi ? bars[j][i] : bars[i];
                cover.value = cover.bar.value;
                Y += barheight;
            }
            Y += bargutter;
        }
    }
    chart.label = function (labels, isRight) {
        labels = labels || [];
        this.labels = paper.set();
        for (var i = 0; i < len; i++) {
            for (var j = 0; j < multi; j++) {
                var  label = paper.g.labelise(multi ? labels[j] && labels[j][i] : labels[i], multi ? values[j][i] : values[i], total);
                var X = isRight ? bars[i * (multi || 1) + j].x - barheight / 2 + 3 : x + 5,
                    A = isRight ? "end" : "start",
                    L;
                this.labels.push(L = paper.g.text(X, bars[i * (multi || 1) + j].y, label).attr({"text-anchor": A}).insertBefore(covers[0]));
                if (L.getBBox().x < x + 5) {
                    L.attr({x: x + 5, "text-anchor": "start"});
                } else {
                    bars[i * (multi || 1) + j].label = L;
                }
            }
        }
        return this;
    };
    chart.hover = function (fin, fout) {
        covers2.hide();
        covers.show();
        fout = fout || function () {};
        covers.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.hoverColumn = function (fin, fout) {
        covers.hide();
        covers2.show();
        fout = fout || function () {};
        covers2.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.each = function (f) {
        if (!CQ.Raphael.is(f, "function")) {
            return this;
        }
        for (var i = covers.length; i--;) {
            f.call(covers[i]);
        }
        return this;
    };
    chart.eachColumn = function (f) {
        if (!CQ.Raphael.is(f, "function")) {
            return this;
        }
        for (var i = covers2.length; i--;) {
            f.call(covers2[i]);
        }
        return this;
    };
    chart.click = function (f) {
        covers2.hide();
        covers.show();
        covers.click(f);
        return this;
    };
    chart.clickColumn = function (f) {
        covers.hide();
        covers2.show();
        covers2.click(f);
        return this;
    };
    chart.push(bars, covers, covers2);
    chart.bars = bars;
    chart.covers = covers;
    return chart;
};

/*!
 * g.Raphael 0.4.2 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009 Dmitry Baranovskiy (http://g.raphaeljs.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
CQ.Raphael.fn.g.dotchart = function (x, y, width, height, valuesx, valuesy, size, opts) {
    function drawAxis(ax) {
        +ax[0] && (ax[0] = paper.g.axis(x + gutter, y + gutter, width - 2 * gutter, minx, maxx, opts.axisxstep || Math.floor((width - 2 * gutter) / 20), 2, opts.axisxlabels || null, opts.axisxtype || "t"));
        +ax[1] && (ax[1] = paper.g.axis(x + width - gutter, y + height - gutter, height - 2 * gutter, miny, maxy, opts.axisystep || Math.floor((height - 2 * gutter) / 20), 3, opts.axisylabels || null, opts.axisytype || "t"));
        +ax[2] && (ax[2] = paper.g.axis(x + gutter, y + height - gutter + maxR, width - 2 * gutter, minx, maxx, opts.axisxstep || Math.floor((width - 2 * gutter) / 20), 0, opts.axisxlabels || null, opts.axisxtype || "t"));
        +ax[3] && (ax[3] = paper.g.axis(x + gutter - maxR, y + height - gutter, height - 2 * gutter, miny, maxy, opts.axisystep || Math.floor((height - 2 * gutter) / 20), 1, opts.axisylabels || null, opts.axisytype || "t"));
    }
    opts = opts || {};
    var xdim = this.g.snapEnds(Math.min.apply(Math, valuesx), Math.max.apply(Math, valuesx), valuesx.length - 1),
        minx = xdim.from,
        maxx = xdim.to,
        gutter = opts.gutter || 10,
        ydim = this.g.snapEnds(Math.min.apply(Math, valuesy), Math.max.apply(Math, valuesy), valuesy.length - 1),
        miny = ydim.from,
        maxy = ydim.to,
        len = Math.max(valuesx.length, valuesy.length, size.length),
        symbol = this.g.markers[opts.symbol] || "disc",
        res = this.set(),
        series = this.set(),
        max = opts.max || 100,
        top = Math.max.apply(Math, size),
        R = [],
        paper = this,
        k = Math.sqrt(top / Math.PI) * 2 / max;

    for (var i = 0; i < len; i++) {
        R[i] = Math.min(Math.sqrt(size[i] / Math.PI) * 2 / k, max);
    }
    gutter = Math.max.apply(Math, R.concat(gutter));
    var axis = this.set(),
        maxR = Math.max.apply(Math, R);
    if (opts.axis) {
        var ax = (opts.axis + "").split(/[,\s]+/);
        drawAxis(ax);
        var g = [], b = [];
        for (var i = 0, ii = ax.length; i < ii; i++) {
            var bb = ax[i].all ? ax[i].all.getBBox()[["height", "width"][i % 2]] : 0;
            g[i] = bb + gutter;
            b[i] = bb;
        }
        gutter = Math.max.apply(Math, g.concat(gutter));
        for (var i = 0, ii = ax.length; i < ii; i++) if (ax[i].all) {
            ax[i].remove();
            ax[i] = 1;
        }
        drawAxis(ax);
        for (var i = 0, ii = ax.length; i < ii; i++) if (ax[i].all) {
            axis.push(ax[i].all);
        }
        res.axis = axis;
    }
    var kx = (width - gutter * 2) / ((maxx - minx) || 1),
        ky = (height - gutter * 2) / ((maxy - miny) || 1);
    for (var i = 0, ii = valuesy.length; i < ii; i++) {
        var sym = this.raphael.is(symbol, "array") ? symbol[i] : symbol,
            X = x + gutter + (valuesx[i] - minx) * kx,
            Y = y + height - gutter - (valuesy[i] - miny) * ky;
        sym && R[i] && series.push(this.g[sym](X, Y, R[i]).attr({fill: opts.heat ? this.g.colorValue(R[i], maxR) : CQ.Raphael.fn.g.colors[0], "fill-opacity": opts.opacity ? R[i] / max : 1, stroke: "none"}));
    }
    var covers = this.set();
    for (var i = 0, ii = valuesy.length; i < ii; i++) {
        var X = x + gutter + (valuesx[i] - minx) * kx,
            Y = y + height - gutter - (valuesy[i] - miny) * ky;
        covers.push(this.circle(X, Y, maxR).attr(this.g.shim));
        opts.href && opts.href[i] && covers[i].attr({href: opts.href[i]});
        covers[i].r = +R[i].toFixed(3);
        covers[i].x = +X.toFixed(3);
        covers[i].y = +Y.toFixed(3);
        covers[i].X = valuesx[i];
        covers[i].Y = valuesy[i];
        covers[i].value = size[i] || 0;
        covers[i].dot = series[i];
    }
    res.covers = covers;
    res.series = series;
    res.push(series, axis, covers);
    res.hover = function (fin, fout) {
        covers.mouseover(fin).mouseout(fout);
        return this;
    };
    res.click = function (f) {
        covers.click(f);
        return this;
    };
    res.each = function (f) {
        if (!CQ.Raphael.is(f, "function")) {
            return this;
        }
        for (var i = covers.length; i--;) {
            f.call(covers[i]);
        }
        return this;
    };
    res.href = function (map) {
        var cover;
        for (var i = covers.length; i--;) {
            cover = covers[i];
            if (cover.X == map.x && cover.Y == map.y && cover.value == map.value) {
                cover.attr({href: map.href});
            }
        }
    };
    return res;
};

/*!
 * g.Raphael 0.4.2 - Charting library, based on Raphaël
 *
 * Copyright (c) 2009 Dmitry Baranovskiy (http://g.raphaeljs.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
CQ.Raphael.fn.g.linechart = function (x, y, width, height, valuesx, valuesy, opts) {
    function shrink(values, dim) {
        var k = values.length / dim,
            j = 0,
            l = k,
            sum = 0,
            res = [];
        while (j < values.length) {
            l--;
            if (l < 0) {
                sum += values[j] * (1 + l);
                res.push(sum / k);
                sum = values[j++] * -l;
                l += k;
            } else {
                sum += values[j++];
            }
        }
        return res;
    }
    function getAnchors(p1x, p1y, p2x, p2y, p3x, p3y) {
        var l1 = (p2x - p1x) / 2,
            l2 = (p3x - p2x) / 2,
            a = Math.atan((p2x - p1x) / Math.abs(p2y - p1y)),
            b = Math.atan((p3x - p2x) / Math.abs(p2y - p3y));
        a = p1y < p2y ? Math.PI - a : a;
        b = p3y < p2y ? Math.PI - b : b;
        var alpha = Math.PI / 2 - ((a + b) % (Math.PI * 2)) / 2,
            dx1 = l1 * Math.sin(alpha + a),
            dy1 = l1 * Math.cos(alpha + a),
            dx2 = l2 * Math.sin(alpha + b),
            dy2 = l2 * Math.cos(alpha + b);
        return {
            x1: p2x - dx1,
            y1: p2y + dy1,
            x2: p2x + dx2,
            y2: p2y + dy2
        };
    }
    opts = opts || {};
    if (!this.raphael.is(valuesx[0], "array")) {
        valuesx = [valuesx];
    }
    if (!this.raphael.is(valuesy[0], "array")) {
        valuesy = [valuesy];
    }
    var gutter = opts.gutter || 10,
        len = Math.max(valuesx[0].length, valuesy[0].length),
        symbol = opts.symbol || "",
        colors = opts.colors || CQ.Raphael.fn.g.colors,
        that = this,
        columns = null,
        dots = null,
        chart = this.set(),
        path = [];

    for (var i = 0, ii = valuesy.length; i < ii; i++) {
        len = Math.max(len, valuesy[i].length);
    }
    var shades = this.set();
    for (i = 0, ii = valuesy.length; i < ii; i++) {
        if (opts.shade) {
            shades.push(this.path().attr({stroke: "none", fill: colors[i], opacity: opts.nostroke ? 1 : .3}));
        }
        if (valuesy[i].length > width - 2 * gutter) {
            valuesy[i] = shrink(valuesy[i], width - 2 * gutter);
            len = width - 2 * gutter;
        }
        if (valuesx[i] && valuesx[i].length > width - 2 * gutter) {
            valuesx[i] = shrink(valuesx[i], width - 2 * gutter);
        }
    }
    var allx = Array.prototype.concat.apply([], valuesx),
        ally = Array.prototype.concat.apply([], valuesy),
        // CQ:START Provide extreme values as option
        xdim = opts.xDim || this.g.snapEnds(Math.min.apply(Math, allx), Math.max.apply(Math, allx), valuesx[0].length - 1),
        // CQ:END
        minx = xdim.from,
        maxx = xdim.to,
        // CQ:START Provide extreme values as option
        ydim = opts.yDim || this.g.snapEnds(Math.min.apply(Math, ally), Math.max.apply(Math, ally), valuesy[0].length - 1),
        // CQ:END
        miny = ydim.from,
        maxy = ydim.to,
        kx = (width - gutter * 2) / ((maxx - minx) || 1),
        ky = (height - gutter * 2) / ((maxy - miny) || 1);

    var axis = this.set();
    // CQ: START extended axis implementation
    if (opts.customAxis) {
        var execCustomAxis = function(fn, scope, x, y, direction) {
            var aw = width - 2 * gutter;
            var ah = height - 2 * gutter;
            var def = {
                "x": x,
                "y": y,
                "size": ((direction % 2) == 0 ?  aw : ah),
                "opposite": ((direction % 2) == 0 ?  ah : aw),
                "direction": direction,
                "min": ((direction % 2) == 0 ? minx : miny),
                "max": ((direction % 2) == 0 ? maxx : maxy),
                "opts": opts
            };
            axis.push(fn.call(scope, def));
        };
        opts.customAxis.createTimeAxis && axis.push(execCustomAxis(
                opts.customAxis.createTimeAxis, this, x + gutter, y + height - gutter, 0));
        opts.customAxis.createValueAxis && axis.push(execCustomAxis(
                opts.customAxis.createValueAxis, this, x + gutter, y + height - gutter, 1));
    } else if (opts.axis) {
        var ax = (opts.axis + "").split(/[,\s]+/);
        +ax[0] && axis.push(this.g.axis(x + gutter, y + gutter, width - 2 * gutter, minx, maxx, opts.axisxstep || Math.floor((width - 2 * gutter) / 20), 2, opts.xResolver));
        +ax[1] && axis.push(this.g.axis(x + width - gutter, y + height - gutter, height - 2 * gutter, miny, maxy, opts.axisystep || Math.floor((height - 2 * gutter) / 20), 3, opts.yResolver));
        +ax[2] && axis.push(this.g.axis(x + gutter, y + height - gutter, width - 2 * gutter, minx, maxx, opts.axisxstep || Math.floor((width - 2 * gutter) / 20), 0, opts.xResolver));
        +ax[3] && axis.push(this.g.axis(x + gutter, y + height - gutter, height - 2 * gutter, miny, maxy, opts.axisystep || Math.floor((height - 2 * gutter) / 20), 1, opts.yResolver));
    }
    // CQ:END
    var lines = this.set(),
        symbols = this.set(),
        line;
    for (i = 0, ii = valuesy.length; i < ii; i++) {
        if (!opts.nostroke) {
            lines.push(line = this.path().attr({
                stroke: colors[i],
                "stroke-width": opts.width || 2,
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "stroke-dasharray": opts.dash || ""
            }));
        }
        var sym = this.raphael.is(symbol, "array") ? symbol[i] : symbol,
            symset = this.set();
        path = [];
        for (var j = 0, jj = valuesy[i].length; j < jj; j++) {
            var X = x + gutter + ((valuesx[i] || valuesx[0])[j] - minx) * kx,
                Y = y + height - gutter - (valuesy[i][j] - miny) * ky;
            // CQ:START allow separate symbol size
            (CQ.Raphael.is(sym, "array") ? sym[j] : sym) && symset.push(this.g[CQ.Raphael.fn.g.markers[this.raphael.is(sym, "array") ? sym[j] : sym]](X, Y, opts.symbolSize || (opts.width || 2) * 3).attr({fill: colors[i], stroke: "none"}));
            // CQ:END
            if (opts.smooth) {
                if (j && j != jj - 1) {
                    var X0 = x + gutter + ((valuesx[i] || valuesx[0])[j - 1] - minx) * kx,
                        Y0 = y + height - gutter - (valuesy[i][j - 1] - miny) * ky,
                        X2 = x + gutter + ((valuesx[i] || valuesx[0])[j + 1] - minx) * kx,
                        Y2 = y + height - gutter - (valuesy[i][j + 1] - miny) * ky;
                    var a = getAnchors(X0, Y0, X, Y, X2, Y2);
                    path = path.concat([a.x1, a.y1, X, Y, a.x2, a.y2]);
                }
                if (!j) {
                    path = ["M", X, Y, "C", X, Y];
                }
            } else {
                path = path.concat([j ? "L" : "M", X, Y]);
            }
        }
        if (opts.smooth) {
            path = path.concat([X, Y, X, Y]);
        }
        symbols.push(symset);
        if (opts.shade) {
            shades[i].attr({path: path.concat(["L", X, y + height - gutter, "L",  x + gutter + ((valuesx[i] || valuesx[0])[0] - minx) * kx, y + height - gutter, "z"]).join(",")});
        }
        !opts.nostroke && line.attr({path: path.join(",")});
    }
    function createColumns(f) {
        // unite Xs together
        var Xs = [];
        for (var i = 0, ii = valuesx.length; i < ii; i++) {
            Xs = Xs.concat(valuesx[i]);
        }
        Xs.sort();
        // remove duplicates
        var Xs2 = [],
            xs = [];
        for (i = 0, ii = Xs.length; i < ii; i++) {
            Xs[i] != Xs[i - 1] && Xs2.push(Xs[i]) && xs.push(x + gutter + (Xs[i] - minx) * kx);
        }
        Xs = Xs2;
        ii = Xs.length;
        var cvrs = f || that.set();
        for (i = 0; i < ii; i++) {
            var X = xs[i] - (xs[i] - (xs[i - 1] || x)) / 2,
                w = ((xs[i + 1] || x + width) - xs[i]) / 2 + (xs[i] - (xs[i - 1] || x)) / 2,
                C;
            f ? (C = {}) : cvrs.push(C = that.rect(X - 1, y, Math.max(w + 1, 1), height).attr({stroke: "none", fill: "#000", opacity: 0}));
            C.values = [];
            C.symbols = that.set();
            C.y = [];
            C.x = xs[i];
            C.axis = Xs[i];
            for (var j = 0, jj = valuesy.length; j < jj; j++) {
                Xs2 = valuesx[j] || valuesx[0];
                for (var k = 0, kk = Xs2.length; k < kk; k++) {
                    if (Xs2[k] == Xs[i]) {
                        C.values.push(valuesy[j][k]);
                        C.y.push(y + height - gutter - (valuesy[j][k] - miny) * ky);
                        C.symbols.push(chart.symbols[j][k]);
                    }
                }
            }
            f && f.call(C);
        }
        !f && (columns = cvrs);
    }
    function createDots(f) {
        var cvrs = f || that.set(),
            C;
        for (var i = 0, ii = valuesy.length; i < ii; i++) {
            for (var j = 0, jj = valuesy[i].length; j < jj; j++) {
                var X = x + gutter + ((valuesx[i] || valuesx[0])[j] - minx) * kx,
                    nearX = x + gutter + ((valuesx[i] || valuesx[0])[j ? j - 1 : 1] - minx) * kx,
                    Y = y + height - gutter - (valuesy[i][j] - miny) * ky;
                // CQ:START using a fixed radius for the hover cover matches our use case better
                f ? (C = {}) : cvrs.push(C = that.circle(X, Y, opts.coverRadius || Math.abs(nearX - X) / 2).attr({stroke: "none", fill: "#000", opacity: 0}));
                // CQ:END
                // CQ:START save more info to the cover
                C.series = i;
                C.sample = j;
                // CQ:END
                C.x = X;
                C.y = Y;
                C.value = valuesy[i][j];
                C.line = chart.lines[i];
                C.shade = chart.shades[i];
                C.symbol = chart.symbols[i][j];
                C.symbols = chart.symbols[i];
                C.axis = (valuesx[i] || valuesx[0])[j];
                f && f.call(C);
            }
        }
        !f && (dots = cvrs);
    }
    chart.push(lines, shades, symbols, axis, columns, dots);
    chart.lines = lines;
    chart.shades = shades;
    chart.symbols = symbols;
    chart.axis = axis;
    chart.hoverColumn = function (fin, fout) {
        !columns && createColumns();
        columns.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.clickColumn = function (f) {
        !columns && createColumns();
        columns.click(f);
        return this;
    };
    chart.hrefColumn = function (cols) {
        var hrefs = that.raphael.is(arguments[0], "array") ? arguments[0] : arguments;
        if (!(arguments.length - 1) && typeof cols == "object") {
            for (var x in cols) {
                for (var i = 0, ii = columns.length; i < ii; i++) if (columns[i].axis == x) {
                    columns[i].attr("href", cols[x]);
                }
            }
        }
        !columns && createColumns();
        for (i = 0, ii = hrefs.length; i < ii; i++) {
            columns[i] && columns[i].attr("href", hrefs[i]);
        }
        return this;
    };
    chart.hover = function (fin, fout) {
        !dots && createDots();
        dots.mouseover(fin).mouseout(fout);
        return this;
    };
    chart.click = function (f) {
        !dots && createDots();
        dots.click(f);
        return this;
    };
    chart.each = function (f) {
        createDots(f);
        return this;
    };
    chart.eachColumn = function (f) {
        createColumns(f);
        return this;
    };
    return chart;
};

