/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2014 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/


CQ.mcm = CQ.mcm || { };
CQ.mcm.Campaign = CQ.mcm.Campaign || { };

/*
  ADOBE CONFIDENTIAL
  ___________________

   Copyright 2014 Adobe Systems Incorporated
   All Rights Reserved.

  NOTICE:  All information contained herein is, and remains
  the property of Adobe Systems Incorporated and its suppliers,
  if any.  The intellectual and technical concepts contained
  herein are proprietary to Adobe Systems Incorporated and its
  suppliers and are protected by trade secret or copyright law.
  Dissemination of this information or reproduction of this material
  is strictly forbidden unless prior written permission is obtained
  from Adobe Systems Incorporated.
*/

CQ.mcm.Campaign.WidgetUtils = (function() {

    var template = undefined;

    var templateRetrieved = false;

    var metaData = null;

    return {

        getTemplate: function(pagePath) {
            if ((template === undefined) && !templateRetrieved) {
                templateRetrieved = true;
                pagePath = pagePath || CQ.WCM.getPagePath();
                pagePath = CQ.HTTP.externalize(pagePath);
                var data = undefined;
                $CQ.ajax({
                    dataType: "json",
                    url: CQ.shared.HTTP.noCaching(pagePath + "/_jcr_content.json"),
                    async: false,
                    // data: data,
                    success: function(_data) {
                        data = _data;
                    }
                });
                if (data) {
                    template = data["acTemplate"];
                }
            }
            return template;
        },

        parseMetaData: function(data) {
            var groups = [ ];
            var groupData = data.schema;
            for (var groupName in groupData) {
                if (groupData.hasOwnProperty(groupName)) {
                    var groupObj = groupData[groupName];
                    groupObj.id = groupName;
                    groups.push(groupObj);
                }
            }
            groups.sort(function(a, b) {
                return (a.order - b.order);
            });
            var perGroup = { };
            var groupCnt = groups.length;
            var metaDataContainer = data.content;
            for (var g = 0; g < groupCnt; g++) {
                var groupDef = groups[g];
                var groupId = groupDef.id;
                var groupMetaData = metaDataContainer[groupId];
                var group = [ ];
                for (var dataName in groupMetaData) {
                    if (groupMetaData.hasOwnProperty(dataName)) {
                        var metaData = groupMetaData[dataName];
                        metaData.id = dataName;
                        group.push(metaData)
                    }
                }
                group.sort(function(a, b) {
                    return (a.order - b.order);
                });
                perGroup[groupId] = group;
            }
            return {
                groups: groups,
                perGroup: perGroup
            };
        },

        getMetaDataForValue: function(data, id) {
            if (!data) {
                return null;
            }
            var segments = id.split(".");
            for (var i = 0; i < segments.length; i++) {
                data = data[segments[i]];
                if (!data) {
                    return null;
                }
                if (data.hasOwnProperty("content")) {
                    data = data.content;
                }
            }
            return data;
        },

        getMetaData: function(callback, template) {
            if (metaData) {
                return metaData;
            }
            var utils = CQ.mcm.Campaign.WidgetUtils;
            var pagePath = CQ.WCM.getPagePath();
            pagePath += "/_jcr_content.campaign.metadata.json";
            var url = CQ.HTTP.externalize(pagePath);
            if (template) {
                url += "?template=" + template;
            }
            var data = undefined;
            var ajaxRet = $CQ.ajax({
                dataType: "json",
                url: CQ.shared.HTTP.noCaching(url),
                async: !!callback,
                // data: data,
                success: function(_data) {
                    _data = utils.parseMetaData(_data);
                    if (callback) {
                        callback(_data);
                    } else {
                        data = _data;
                    }
                },
                failure: function() {
                    if (callback) {
                        callback(false);
                    }
                }
            });
            var dataRet;
            if (!callback) {
                dataRet = {
                    dataAvailable: true,
                    success: !!data,
                    data: data
                };
            } else {
                dataRet = {
                    dataAvailable: false,
                    success: true,
                    ajax: ajaxRet
                }
            }
            metaData = dataRet;
            return dataRet;
        },

        createMetaDataMenu: function (metaData, itemClickHandler, itemFilter) {

            function createMenuLevel(tree, items, id) {
                var sortedElements = [];
                var key;
                for (key in tree) {
                    if (tree.hasOwnProperty(key)) {
                        sortedElements.push(key);
                    }
                }
                sortedElements.sort(function(obj, cmp) {
                    obj = tree[obj];
                    cmp = tree[cmp];
                    if (obj.hasOwnProperty("order") && cmp.hasOwnProperty("order")) {
                        return (obj.order < cmp.order ? -1 : 1);
                    }
                    if (obj.hasOwnProperty("order")) {
                        return 1;
                    }
                    return obj.label.localeCompare(cmp.label);
                });
                var elCnt = sortedElements.length;
                var count = 0;
                for (var e = 0; e < elCnt; e++) {
                    key = sortedElements[e];
                    var data = tree[sortedElements[e]];
                    var item;
                    if (data.hasOwnProperty("type") && data.type) {
                        if (itemFilter && !itemFilter(data)) {
                            continue;
                        }
                        item = {
                            "text": data.label,
                            "metaDataId": id ? id + "." + key : key,
                            "metaData": data,
                            "handler": itemClickHandler
                        };
                    } else {
                        item = {
                            "text": data.label
                        };
                    }
                    items.push(item);
                    count++;
                    if (data.hasOwnProperty("content")) {
                        item.menu = {
                            items: [ ]
                        };
                        createMenuLevel(data.content, item.menu.items, id ? id + "." + key : key);
                        if (item.menu.items.length == 0) {
                            items.pop();
                        }
                    }
                }
            }

            var menuItems = [];
            if (CQ.mcm.Campaign.Utils.hasMetaData(metaData)) {
                createMenuLevel(metaData, menuItems, "");
            } else {
                menuItems.push({
                    "text": CQ.I18n.get("No meta data available."),
                    "disabled": true
                });
            }
            return new CQ.Ext.menu.Menu({
                items: menuItems
            });
        }

    };

})();

/*
  ADOBE CONFIDENTIAL
  ___________________

   Copyright 2014 Adobe Systems Incorporated
   All Rights Reserved.

  NOTICE:  All information contained herein is, and remains
  the property of Adobe Systems Incorporated and its suppliers,
  if any.  The intellectual and technical concepts contained
  herein are proprietary to Adobe Systems Incorporated and its
  suppliers and are protected by trade secret or copyright law.
  Dissemination of this information or reproduction of this material
  is strictly forbidden unless prior written permission is obtained
  from Adobe Systems Incorporated.
*/

CQ.mcm.Campaign.ProfileUtils = (function() {

    var encryptedPK = null;

    var encryptedPKParam = null;
    return {

        setEncryptedPKParam: function(epkParam) {
            encryptedPKParam = epkParam;
        },

        setEncryptedPK: function(epk) {
            encryptedPK = epk;
        },

        refreshField: function(editable) {
            var path = editable.path + CQ.shared.HTTP.EXTENSION_HTML;
            if (encryptedPK && encryptedPKParam) {
                path += "?" + encodeURIComponent(encryptedPKParam) + "="
                        + encodeURIComponent(encryptedPK);
            }
            editable.refresh(path);
        }

    }

})();
/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2015 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/

CQ.mcm.Campaign.ACTplReader = CQ.Ext.extend(CQ.Ext.data.JsonReader, {

    _isPaging: true,

    next: undefined,


    read: function(response){
        var json = response.responseText;
        var o = CQ.Ext.decode(json);
        if (!o) {
            throw {
                message: 'JsonReader.read: Json object not found'
            };
        }
        // edge case: on a multipage result, the last page won't have a "next" parameter,
        // but it's still not paging; so we're only determining the paging mode if
        // the request wasn't originating from a "next" URL
        if (!this.next) {
            this._isPaging = !o.hasOwnProperty("next");
        }
        this.next = (o.next ? o.next.href : undefined);
        return this.readRecords(o);
    },

    getNext: function() {
        return this.next;
    },

    isPaging: function() {
        return this._isPaging;
    }

});
/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2015 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/

CQ.mcm.Campaign.ACTplStore = CQ.Ext.extend(CQ.Ext.data.JsonStore, {

    constructor: function(config) {
        CQ.Ext.data.JsonStore.superclass.constructor.call(this, CQ.Ext.apply(config, {
            reader: new CQ.mcm.Campaign.ACTplReader(config)
        }));
    },

    loadNext: function() {
        var nextUrl = this.reader.getNext();
        if (nextUrl) {
            this.load({
                params: {
                    "url": nextUrl
                }
            });
        }
    },

    hasNext: function() {
        return (this.reader.getNext() != null);
    },

    isPaging: function() {
        return this.reader.isPaging();
    }

});
/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2014 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/

CQ.mcm.Campaign.TemplateSelection = CQ.Ext.extend(CQ.Ext.form.ComboBox, {

    isAvailable: false,

    predefinedValue: null,


    constructor: function(config) {

        config = config || { };
        var url = CQ.WCM.getPagePath();
        // if we are in siteadmin
        if(CQ.wcm.SiteAdmin.hasListSelection()) {
            // get page path from selection
            var grid = CQ.wcm.SiteAdmin.getActiveGrid();
            var selections = grid.getSelectionModel().getSelections();
            url = selections[0].id;
        }
        url += "/_jcr_content.campaign.templates.json";

        var store = new CQ.mcm.Campaign.ACTplStore({
            autoDestroy: true,
            url: url,
            storeId: "acTemplates",
            root: "templates",
            idProperty: "name",
            fields: [ "name", "label" ],
            autoSave: false,
            autoLoad: true,
            listeners: {
                load: function(e) {
                    this.setDisabled(false);
                    if (!this.isAvailable) {
                        this.isAvailable = true;
                        if (this.predefinedValue) {
                            this.setValue(this.predefinedValue);
                        }
                    }

                    // hack to support the .next concept of providing access to the next
                    // page only (no real paging supported)
                    if (!this.store.isPaging()) {

                        if (this.pageTb) {
                            // hack: we're removing the paging toolbar to display the "next"
                            // link (if applicable)
                            this.pageTb.remove();
                            this.pageTb = undefined;
                            this.pageSize = 0;
                        }

                        var nextLink;
                        var self = this;
                        var footerEl = CQ.Ext.Element.get(CQ.Ext.DomQuery.selectNode(
                                ".x-combo-list-ft", this.list.dom));
                        if (this.store.hasNext()) {
                            footerEl.update(
                                    "<div style='padding: 2px 8px; text-align: right'>"
                                    + "<a href='#' style='color: blue'>"
                                    + CQ.I18n.get("next") + "&gt;"
                                    + "</a>"
                                    + "</div>");
                            nextLink = CQ.Ext.Element.get(
                                    CQ.Ext.DomQuery.selectNode("a", footerEl.dom));
                            nextLink.on("click", function() {
                                nextLink.un("click", this);
                                self.displayNext();
                            });
                        } else {
                            footerEl.update(
                                    "<div style='padding: 2px 8px; text-align: right'>"
                                    + CQ.I18n.get("No more results.")
                                    + " <a href='#' style='color: blue'>"
                                    + CQ.I18n.get("Search again")
                                    + "</a>"
                                    + "</div>");
                            nextLink = CQ.Ext.Element.get(
                                    CQ.Ext.DomQuery.selectNode("a", footerEl.dom));
                            nextLink.on("click", function() {
                                nextLink.un("click", this);
                                self.searchAgain();
                            });
                        }
                        this.assetHeight = footerEl.getHeight();
                        this.restrictHeight();
                    }
                },
                scope: this
            }
        });
        CQ.Util.applyDefaults(config, {
            "store": store,
            "valueField": "name",
            "displayField": "label",
            "hiddenName": config.name,
            "name": undefined,
            "remote": true,
            "pageSize": 8,
            "minChars": 0,
            "disabled": true,
            "listeners": {
                "added": function () {
                    var self = this;
                    this.findParentByType("dialog").on("show", function () {
                        if (self.isAvailable) {
                            if (this.store.isPaging()) {
                                store.load({params: {query: ""}});
                            } else {
                                self.searchAgain();
                            }
                            self.isAvailable = false;
                        }
                    });
                },
                scope: this
            }
        });

        CQ.mcm.Campaign.TemplateSelection.superclass.constructor.call(this, config);

        this.store.proxy.api.read.method = "GET";
        this.requestPageSize = this.pageSize;
    },

    setValue: function(value) {
        if (!this.isAvailable) {
            this.predefinedValue = value;
        } else {
            CQ.mcm.Campaign.TemplateSelection.superclass.setValue.call(this, value);
        }
    },

    getParams : function(){
        var params = {},
            paramNames = this.store.paramNames;
        if (this.requestPageSize) {
            params[paramNames.start] = 0;
            params[paramNames.limit] = this.requestPageSize;
        }
        return params;
    },

    displayNext: function() {
        this.store.loadNext();
    },

    searchAgain: function() {
        this.store.load({
            params: this.getParams()
        });
    }

});

CQ.Ext.reg('mcm-actpl-selection', CQ.mcm.Campaign.TemplateSelection);
/*
  ADOBE CONFIDENTIAL
  ___________________

   Copyright 2014 Adobe Systems Incorporated
   All Rights Reserved.

  NOTICE:  All information contained herein is, and remains
  the property of Adobe Systems Incorporated and its suppliers,
  if any.  The intellectual and technical concepts contained
  herein are proprietary to Adobe Systems Incorporated and its
  suppliers and are protected by trade secret or copyright law.
  Dissemination of this information or reproduction of this material
  is strictly forbidden unless prior written permission is obtained
  from Adobe Systems Incorporated.
*/

CQ.mcm.Campaign.MetaDataSelection = CQ.Ext.extend(CQ.form.CompositeField, {

    btnMetaData: null,

    valueField: null,

    noneText: null,

    filter: null,

    /**
     * Function returning the string to insert into the target input field.
     * It receives two parameters: the meta data id and object.
     */
    processMetaData: null,

    _data: null,

    _preselectedValue: null,

    /**
     * CSS selector for target input fields into which to insert selected meta data tags.
     * If this selector is not defined, then this component behaves like a dropdown and
     * snaps to the item that is selected from the menu.
     */
    targetInputSelector: null,

    constructor: function(config) {

        config = config || { };

        CQ.Util.applyDefaults(config, {
            border: false,
            noneText: CQ.I18n.getMessage("&lt;Please select&gt;"),
            processMetaData: function (id, metaData) {
                // insert the meta data tag by default
                return metaData.tag;
            }
        });

        CQ.mcm.Campaign.MetaDataSelection.superclass.constructor.call(this, config);

    },

    _setMetaData: function(id, label) {
        // if this component is used to insert tags into textfields, then don't change the button text
        if (!this.targetInputSelector) {
            this.btnMetaData.setText(label);
        }
        this.valueField.setValue(id);
    },

    initComponent: function() {

        CQ.mcm.Campaign.MetaDataSelection.superclass.initComponent.call(this);
        var utils = CQ.mcm.Campaign.Utils;

        var isDataAvail = utils.isClientContextAvailable();

        this.valueField = new CQ.Ext.form.Hidden({
            "name": this.name
        });
        this.add(this.valueField);

        var self = this;
        this._data = utils.getMetaData();   // will be empty if CC is not available

        if (this._preselectedValue != null) {
            this._preselectedValue = null;
            this.setValue(this._preselectedValue);
        }

        /**
         * Handler for clicks on menu items.
         */
        var handler = (isDataAvail ? function(item) {
            self._setMetaData(item.metaDataId, item.text);

            // insert the tag into the input field which was previously focused
            if (self.activeTargetInput) {
                var target = self.activeTargetInput;
                var $target = $CQ(target);
                // get current text
                var text = $target.val();
                // insert tag at caret position
                var pos = $target.data("caret-position") || 0;
                var textToInsert = self.processMetaData(item.metaDataId, item.metaData);
                var newText = [text.slice(0, pos), textToInsert, text.slice(pos)].join('');
                // replace text of input field
                var cmp = CQ.Ext.getCmp($target.attr("id"));
                cmp.setValue(newText);
                // move focus back to the input field
                $target.focus();
                // adjust caret position
                var newPos = pos + textToInsert.length;
                $target.data("caret-position", newPos);
                if (target.setSelectionRange) {
                    target.setSelectionRange(newPos, newPos);
                }
            }
            // notify listeners
            self.fireEvent("item-selected");
        } : null);

        var menu = CQ.mcm.Campaign.WidgetUtils.createMetaDataMenu(this._data, handler, this.filter);
        if (isDataAvail) {
            menu.addListener('hide', function() {
                self.menuIsOpen = false;
                if (self.targetInputSelector) {
                    // disable the button
                    self.btnMetaData.disable();
                    // if there was an active input field, then re-focusing it will re-enable the button
                    $CQ(self.activeTargetInput).focus();
                }
            });
            menu.addListener('show', function() {
                self.menuIsOpen = true;
            });
        }

        this.btnMetaData = new CQ.Ext.SplitButton({
            text: this.noneText,
            menu: menu,
            disabled: this.targetInputSelector || !isDataAvail ? true : false,
            width: "100%",
            clickEvent: "mousedown",
            listeners: {
                click: function (element, event) {
                    if (!self.menuIsOpen && isDataAvail) {
                        // show menu when clicking on the button
                        self.btnMetaData.showMenu();
                    }
                }
            }
        });
        this.add(this.btnMetaData);

        function getCaretPosition(el) {
            if (el.selectionStart) {
                return el.selectionStart;
            } else if (document.selection) {
                el.focus();
                var r = document.selection.createRange();
                if (r == null) {
                    return 0;
                }
                var re = el.createTextRange(),
                    rc = re.duplicate();
                re.moveToBookmark(r.getBookmark());
                rc.setEndPoint('EndToStart', re);
                return rc.text.length;
            }
            return 0;
        }

        // is called when the cursor of a target might have changed
        function onChange() {
            // store current caret position
            $CQ(this).data("caret-position", getCaretPosition(this));
        }

        // handles the focus event on the target input fields
        var onFocus = function () {
            // enable button
            if (isDataAvail) {
                self.btnMetaData.enable();
            }
        };

        // handles the focusout event on the target input fields
        var onFocusOut = function () {
            // set this target input as currently active
            self.activeTargetInput = this;
            if (!self.menuIsOpen) {
                // disable the button only if the menu hasn't been opened
                // (the mousedown event on the button executes before this focusout event)
                self.btnMetaData.disable();
                self.activeTargetInput = null;
            }
        };

        if (this.targetInputSelector) {
            // set listeners to track caret position
            $CQ(document).off("keyup", this.targetInputSelector, onChange);
            $CQ(document).on("keyup", this.targetInputSelector, onChange);
            $CQ(document).off("mouseup", this.targetInputSelector, onChange);
            $CQ(document).on("mouseup", this.targetInputSelector, onChange);
            $CQ(document).off("change", this.targetInputSelector, onChange);
            $CQ(document).on("change", this.targetInputSelector, onChange);

            // set focus listeners
            $CQ(document).off("focus", this.targetInputSelector, onFocus);
            $CQ(document).on("focus", this.targetInputSelector, onFocus);
            $CQ(document).off("focusout", this.targetInputSelector, onFocusOut);
            $CQ(document).on("focusout", this.targetInputSelector, onFocusOut);
        }
    },


    setValue: function(val) {

        CQ.mcm.Campaign.MetaDataSelection.superclass.setValue.call(this, val);

        if (this.valueField) {
            this.valueField.setValue(val);
        }

        if (this._data) {
            var metaData = CQ.mcm.Campaign.WidgetUtils.getMetaDataForValue(this._data, val);
            if (metaData) {
                this.btnMetaData.setText(metaData.label);
            } else {
                this.btnMetaData.setText(this.noneText);
            }
        } else {
            this._preselectedValue = val;
        }
    }

});

CQ.Ext.reg('mcm-acmetadata-selection', CQ.mcm.Campaign.MetaDataSelection);

/*************************************************************************
 *
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2014 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/

CQ.mcm.Campaign.CampaignOfferSelection = CQ.Ext.extend(CQ.Ext.form.ComboBox, {
    initComponent: function() {
        if (!this.store) {
            this.generateStore(true);
        }

        CQ.mcm.Campaign.CampaignOfferSelection.superclass.initComponent.call(this);
    },

    generateStore: function(initial) {
        var items = [];

        if (CQ_Analytics && CQ_Analytics.CampaignMgr) {
            var campaigns = CQ_Analytics.CampaignMgr.getData()['campaigns'] || [];

            for (var x = 0; x < campaigns.length; x++) {
                items.push(campaigns[x].title);
            }
        }

        this.bindStore(items, initial);
    }
});

CQ.Ext.reg('mcm-campaign-offer-selection', CQ.mcm.Campaign.CampaignOfferSelection);
/*
 ADOBE CONFIDENTIAL
 ___________________

 Copyright 2014 Adobe Systems Incorporated
 All Rights Reserved.

 NOTICE:  All information contained herein is, and remains
 the property of Adobe Systems Incorporated and its suppliers,
 if any.  The intellectual and technical concepts contained
 herein are proprietary to Adobe Systems Incorporated and its
 suppliers and are protected by trade secret or copyright law.
 Dissemination of this information or reproduction of this material
 is strictly forbidden unless prior written permission is obtained
 from Adobe Systems Incorporated.
*/

CQ.mcm.PlaintextGenerator = CQ.Ext.extend(CQ.Ext.Button, {

    targetInputName: null,

    constructor: function (config) {
        CQ.Util.applyDefaults(config, {
            handler: this.onClick,
            disabled: !CQ.mcm.Campaign.Utils.isClientContextAvailable()
        });
        CQ.mcm.PlaintextGenerator.superclass.constructor.call(this, config);
    },

    onClick: function () {
        var targetInput = this.getTargetInput();
        if (!targetInput) {
            return;
        }

        var self = this;
        if ($CQ(targetInput).val()) {
            var title = 'Warning';
            var message = 'This action will override the content already entered in the plain text field.';
            CQ.Ext.MessageBox.confirm(title, message, function (id) {
                if (id == 'yes') {
                    self.generatePlaintext();
                }
            });
        } else {
            self.generatePlaintext();
        }
    },

    getTargetInput: function () {
        return $CQ('input[name="'+this.targetInputName+'"], textarea[name="'+this.targetInputName+'"]').get(0);
    },

    generatePlaintext: function () {
        var targetInput = this.getTargetInput();
        if (!targetInput) {
            return;
        }
        var self = this;
        var url = CQ.HTTP.externalize(CQ.HTTP.getPath()) + '.html?wcmmode=disabled';
        CQ.Ext.Ajax.request( {
            method: 'GET',
            url: url,
            success: function (response, opts) {
                $CQ(targetInput).val(self.htmlToPlaintext(response.responseText));
            },
            failure: function (response, opts) {
                var title = 'Information';
                var message = 'Plain text version could not be created.<br\><br\>The server responded with status code ' + response.status;
                CQ.Ext.MessageBox.alert(title, message);
            }
        });
    },

    htmlToPlaintext: function (html) {
        var text = html;
        var patterns = [
            // remove all script, style or title tags including content
            [ /<(?:script|style|title)[\s\S]*?<\/(?:script|style|title)>/g, '' ],
            // remove all HTML tags, but leave content
            [ /<[\s\S]*?>/g, '' ],
            // replace HTML entity with whitespace
            [ /&nbsp;/g, ' ' ],
            // condense multiple blank lines to single one
            [ /\n\s*\n/g, '\n\n' ],
            // remove all whitespaces or tabs in the beginning of a line
            [ /^[ \t]+/mg, '' ],
            // condense multiple whitespaces or tabs to single one
            [ /[ \t]+/g, ' ' ],

            // replace HTML entity with appropriate sign
            [ /&acute;/g, '´' ],
            [ /&amp;/g, '&' ],
            [ /&(?:#x27|apos);/g, '\'' ],
            [ /&asymp;/g, '≈' ],
            [ /&bdquo;/g, '„' ],
            [ /&circ;/g, 'ˆ' ],
            [ /&copy;/g, '©' ],
            [ /&deg;/g, '°' ],
            [ /&divide;/g, '÷' ],
            [ /&euro;/g, '€' ],
            [ /&gt;/g, '>' ],
            [ /&hellip;/g, '…' ],
            [ /&infin;/g, '∞' ],
            [ /&laquo;/g, '«' ],
            [ /&ldquo;/g, '“' ],
            [ /&lsquo;/g, '‘' ],
            [ /&lt;/g, '<' ],
            [ /&mdash;/g, '—' ],
            [ /&ndash;/g, '–' ],
            [ /&Oslash;/g, 'Ø' ],
            [ /&oslash;/g, 'ø' ],
            [ /&para;/g, '¶' ],
            [ /&pound;/g, '£' ],
            [ /&Prime;/g, '″' ],
            [ /&prime;/g, '′' ],
            [ /&quot;/g, '"' ],
            [ /&raquo;/g, '»' ],
            [ /&rdquo;/g, '”' ],
            [ /&reg;/g, '®' ],
            [ /&rsquo;/g, '’' ],
            [ /&sbquo;/g, '‚' ],
            [ /&sect;/g, '§' ],
            [ /&sim;/g, '∼' ],
            [ /&szlig;/g, 'ß' ],
            [ /&tilde;/g, '˜' ],
            [ /&trade;/g, '™' ]
        ];

        for (var i = 0; i < patterns.length; i++) {
            text = text.replace(patterns[i][0], patterns[i][1]);
        }
        return text.trim();
    }

});

CQ.Ext.reg("cq-mcm-plaintext-generator", CQ.mcm.PlaintextGenerator);

/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

CUI.rte.FontProcessor = function() {
    var com = CUI.rte.Common;
    return {
        getFonts: function(context, fontsDef, node) {
            var fonts = fontsDef.fonts;
            var fontFaceCount = 0;
            var fontSizeCount = 0;
            if (!fonts) {
                fonts = [ ];
                fontsDef.fonts = fonts;
            }
            while (!com.isRootNode(context, node)) {
                if (com.isTag(node, "font")) {
                    fonts.push({
                        "dom": node
                    });
                    if (com.getAttribute(node, "face")) {
                        fontFaceCount++;
                    }
                    if (com.getAttribute(node, "size")) {
                        fontSizeCount++;
                    }
                }
                node = com.getParentNode(context, node);
            }
            fontsDef.isContinuousFontFace = fontFaceCount == 1;
            fontsDef.isContinuousFontSize = fontSizeCount == 1;
        }
    }
}();
/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

CQ.Ext.override(CUI.rte.NodeList, {
    getFonts: function (context, fontsDef, checkAncestors) {
        var com = CUI.rte.Common;
        var fonts = fontsDef.fonts;
        var hasParentFontFace = false;
        var hasParentFontSize = false;
        if (!fonts) {
            fonts = [ ];
            fontsDef.fonts = fonts;
        }
        if (checkAncestors) {
            var nodeToCheck = this.commonAncestor;
            while (nodeToCheck) {
                if (nodeToCheck.nodeType == 1) {
                    if (com.isRootNode(context, nodeToCheck)) {
                        break;
                    }
                    var tagLC = nodeToCheck.tagName.toLowerCase();
                    if (tagLC == "font") {
                        var face = com.getAttribute(nodeToCheck, "face");
                        var size = com.getAttribute(nodeToCheck, "size");
                        hasParentFontFace = hasParentFontFace || face ? true : false;
                        hasParentFontSize = hasParentFontSize || size ? true : false;
                        fonts.push({
                            "dom": nodeToCheck,
                            "face": face,
                            "size": size
                        });
                    }
                }
                nodeToCheck = com.getParentNode(context, nodeToCheck);
            }
        }
        var continuousFontFace = null;
        var continuousFontSize = null;
        var hasTopLevelText = false;
        var nodeCnt = this.nodes.length;
        for (var nodeIndex = 0; nodeIndex < nodeCnt; nodeIndex++) {
            var nodeToProcess = this.nodes[nodeIndex];
            if (nodeToProcess.nodeType == CUI.rte.DomProcessor.DOM_NODE) {
                var nodeState = nodeToProcess.getFonts(fonts);
                continuousFontFace = CUI.rte.NodeList.calcNewContState(
                        continuousFontFace, nodeState.continuousFontFace);
                continuousFontSize = CUI.rte.NodeList.calcNewContState(
                        continuousFontSize, nodeState.continuousFontSize);
            } else {
                hasTopLevelText = true;
            }
        }
        continuousFontFace = continuousFontFace ? continuousFontFace : "unstyled";
        continuousFontSize = continuousFontSize ? continuousFontSize : "unstyled";
        fontsDef.isContinuousFontFace = (hasParentFontFace && (continuousFontFace == "unstyled"))
                || (!hasParentFontFace && (continuousFontFace == "single") && !hasTopLevelText);
        fontsDef.isContinuousFontSize = (hasParentFontSize && (continuousFontSize == "unstyled"))
                || (!hasParentFontSize && (continuousFontSize == "single") && !hasTopLevelText);
    }
});

CQ.Ext.override(CUI.rte.DomProcessor.StructuralNode, {
    getFonts: function(fonts) {
        var continuousFaceState = "unstyled";
        var continuousSizeState = "unstyled";
        var com = CUI.rte.Common;
        if (this.tagName == "font") {
            var face = com.getAttribute(this.dom, "face");
            var size = com.getAttribute(this.dom, "size");
            fonts.push({
                "dom": this.dom,
                "face": face,
                "size": size
            });
            continuousFaceState = face ? "single" : "unstyled";
            continuousSizeState = size ? "single" : "unstyled";
        }
        if (this.childNodes != null) {
            var hasText = false;
            var childrenFaceState = null, childrenSizeState = null;
            var childCnt = this.childNodes.length;
            for (var childIndex = 0; childIndex < childCnt; childIndex++) {
                var childToProcess = this.childNodes[childIndex];
                if (childToProcess.nodeType == CUI.rte.DomProcessor.DOM_NODE) {
                    var childState = childToProcess.getFonts(fonts);
                    childrenFaceState = CUI.rte.NodeList.calcNewContState(childrenFaceState,
                            childState.continuousFaceState);
                    childrenSizeState = CUI.rte.NodeList.calcNewContState(childrenSizeState,
                            childState.continuousSizeState);
                } else {
                    hasText = true;
                }
            }
            childrenFaceState = childrenFaceState ? childrenFaceState : "unstyled";
            childrenSizeState = childrenSizeState ? childrenSizeState : "unstyled";
            continuousFaceState = CUI.rte.NodeList.calcNewContState(continuousFaceState,
                                      childrenFaceState);
            continuousSizeState = CUI.rte.NodeList.calcNewContState(childrenSizeState,
                                      childrenSizeState);
        }
        return {"continuousFaceState" : continuousFaceState, "continuousSizeState" : continuousSizeState};
    }
});
/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

CQ.Ext.override(CUI.rte.EditorKernel, {
    analyzeSelection: function(originalFunction) {
        return function(context, lastKnown) {
            var analysedSelection = originalFunction.call(this, context, lastKnown);
            var fpr = CUI.rte.FontProcessor;
            var fontsDef = { };
            var startFontsDef = fontsDef;
            var selection = analysedSelection.selection;
            var isSelection = analysedSelection.isSelection;
            var nodeList = analysedSelection.nodeList;
            context = analysedSelection.editContext;
            if (isSelection) {
                nodeList.getFonts(context, fontsDef, true);
                startFontsDef = { };
            }
            var fontNode = selection.startNode;
            fpr.getFonts(context, startFontsDef, fontNode);
            var fonts = fontsDef.fonts ? fontsDef.fonts : [];
            var startFonts = startFontsDef.fonts ? startFontsDef.fonts : [ ];
            //add font specific details to analysed selection
            analysedSelection.fonts = fonts;
            analysedSelection.fontCount = fonts.length;
            analysedSelection.startFontCount = startFonts.length;
            analysedSelection.startFonts = startFonts;
            analysedSelection.isContinuousFontFace = fontsDef.isContinuousFontFace;
            analysedSelection.isContinuousFontSize = fontsDef.isContinuousFontSize;
            return analysedSelection;
        };
    }( CUI.rte.EditorKernel.prototype.analyzeSelection)
});
/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2012 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

/**
 * @class CUI.rte.commands.Font
 * @extends CUI.rte.commands.Command
 * @private
 */
CUI.rte.commands.Font = new Class({

    toString: "Font",

    extend: CUI.rte.commands.Command,

    /**
     * Formats the currently selected text fragment with the given CSS style.
     * <p>
     * The currently selected text will be surrounded with a <code>span</code> tag that
     * has the given style name as its <code>class</code> attribute..
     * <p>
     * Note that this method only works on text fragments that have no other styles
     * applied.
     * @private
     */
    addFont: function(execDef, attrName) {
        var sel = CUI.rte.Selection;
        var com = CUI.rte.Common;
        var selection = execDef.selection;
        var context = execDef.editContext;
        var nodeList = execDef.nodeList;
        if (nodeList) {
            //if selection is present inside a font tag with same attribute, modify the font tag
            //else add a new font tag
            var fontTags = nodeList.getTags(context, [ {
                matcher: function(dom) {
                    return com.isTag(dom, "font") && com.getAttribute(dom, attrName);
                }
            } ], true);
            if (fontTags.length > 0) {
                com.setAttribute(fontTags[0].dom, attrName, execDef.value)
            } else {
                var attribute = {};
                attribute[attrName] = execDef.value;
                nodeList.surround(execDef.editContext, "font", attribute);
            }
        }
    },

    /**
     * Removes the style of the text fragment that is under the current caret position.
     * <p>
     * This method does currently not work with selections. Therefore a selection is
     * collapsed to a single char if the method is called for a selection.
     * @private
     */
    removeFont: function(execDef, fontTypeToRemove) {
        var com = CUI.rte.Common;
        var dpr = CUI.rte.DomProcessor;
        var sel = CUI.rte.Selection;
        var selection = execDef.selection;
        var context = execDef.editContext;
        // handle text selections
        var nodeList = execDef.nodeList;
        var fontTags = nodeList.getTags(context, [ {
                matcher: function(dom) {
                    return com.isTag(dom, "font");
                }
            } ], true);
        var fontsToRemove = [ ];
        var fontCnt = fontTags.length;
        for (var fontIndex = 0; fontIndex < fontCnt; fontIndex++) {
            var fontToProcess = fontTags[fontIndex].dom;
            if (fontTypeToRemove && com.getAttribute(fontToProcess, fontTypeToRemove)) {
                fontsToRemove.push(fontToProcess);
            } else if (!fontTypeToRemove) {
                fontsToRemove.push(fontToProcess);
            }
        }
        var removeCnt = fontsToRemove.length;
        for (var r = 0; r < removeCnt; r++) {
            var fontToRemove = fontsToRemove[r];
            dpr.removeWithoutChildren(fontToRemove);
        }
    },

    isCommand: function(cmdStr) {
        var cmdLC = cmdStr.toLowerCase();
        return (cmdLC == "applyfontface") || (cmdLC == "removefontface")
               || (cmdLC == "applyfontsize") || (cmdLC == "removefontsize");
    },

    getProcessingOptions: function() {
        var cmd = CUI.rte.commands.Command;
        return cmd.PO_BOOKMARK | cmd.PO_SELECTION | cmd.PO_NODELIST;
    },

    execute: function(execDef) {
        switch (execDef.command.toLowerCase()) {
            case "applyfontface":
                this.addFont(execDef, "face");
                break;
            case "applyfontsize":
                this.addFont(execDef, "size");
                break;
            case "removefontface":
                this.removeFont(execDef, "face");
                break;
            case "removefontsize":
                this.removeFont(execDef, "size");
                break;
        }
    },

    queryState: function(selectionDef, cmd) {
        // todo find a meaningful implementation -> list of span tags?
        return false;
    }

});


// register command
CUI.rte.commands.CommandRegistry.register("_font", CUI.rte.commands.Font);
/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

/**
 * @class CUI.rte.ui.FontSelectorImpl
 * @extends CUI.rte.ui.TbElement
 * @private
 * This class represents a font selecting element for use in
 * {@link CUI.rte.ui.ToolbarBuilder}.
 */
CUI.rte.ui.ext.FontSelectorImpl = new Class({

    toString: "FontSelector",

    extend: CUI.rte.ui.TbElement,

    fontFaceSelector: null,

    fontSizeSelector: null,

    faces: null,

    sizes: null,

    _init: function(id, plugin, toggle, tooltip, css, cmdDef, faces, sizes) {
        this.inherited(arguments);
        this.faces = faces;
        this.sizes = sizes;
    },

    /**
     * Creates HTML code for rendering the options of the font selector.
     * @param {Array} arrayToIterate The array (containing font faces or styles) to iterate
     * @return {String} HTML code containing the options of the style selector
     * @private
     */
    createFontOptions: function(arrayToIterate) {
        var htmlCode = "<option value=\"\">[None]</option>";
        if (arrayToIterate) {
            var cnt = arrayToIterate.length;
            for (var f = 0; f < cnt; f++) {
                var fontToAdd = arrayToIterate[f];
                htmlCode += "<option value=\"" + fontToAdd + "\">" + fontToAdd + "</option>";
            }
        }
        return htmlCode;
    },

    /**
    * Creates and returns the font selectors.
    * @param {Array} arrayToIterate The array (containing font faces or styles) to iterate
    * @private
    */
    createFontSelector: function(arrayToIterate) {
        var com = CUI.rte.Common;
        if (!arrayToIterate) {
            return null;
        }
        if (com.ua.isIE) {
            // the regular way doesn't work for IE anymore with Ext 3.1.1, hence working
            // around
            var helperDom = document.createElement("span");
            helperDom.innerHTML = "<select class=\"x-font-select\">"
                + this.createFontOptions(arrayToIterate) + "</span>";
            return CQ.Ext.get(helperDom.childNodes[0]);
        }
        return CQ.Ext.get(CQ.Ext.DomHelper.createDom({
            tag: "select",
            cls: "x-font-select",
            html: this.createFontOptions(arrayToIterate)
        }));
    },

    /**
    * Configures the font selectors - Adds handles, sets size etc.
    * @param {CQ.Ext.Element} selector FontFaceSelector or FontSizeSelector to configure
    * @param {String} fontAdditionCommand command to execute when adding font
    * @param {String} fontRemovalCommand command to execute when removing font
    * @param {integer} height height of the selector
    * @private
    */
    configureSelectors: function(selector, fontAdditionCommand, fontRemovalCommand, height) {
        selector.on('change', function() {
            var domValue = selector.dom.value;
            if (domValue.length > 0) {
                this.plugin.execute(fontAdditionCommand);
            } else {
                this.plugin.execute(fontRemovalCommand);
            }
        }, this);
        selector.on('focus', function() {
            this.plugin.editorKernel.isTemporaryBlur = true;
        }, this);
        if (height) {
            // fix for a Firefox problem that adjusts the combobox' height to the height
            // of the largest entry
            selector.setHeight(height);
        }
    },

    // Interface implementation ------------------------------------------------------------

    addToToolbar: function(toolbar) {
        this.toolbar = toolbar;
        this.fontFaceSelector = this.createFontSelector(this.faces);
        this.fontSizeSelector = this.createFontSelector(this.sizes);
        this.initializeSelectors();
        if (this.faces || this.sizes) {
            toolbar.add(CQ.I18n.getMessage("Font"));
        }
        if (this.faces) {
            toolbar.add(
                " ",
                this.fontFaceSelector.dom
            );
        }
        if (this.sizes) {
            toolbar.add(
                " ",
                this.fontSizeSelector.dom
            );
        }
    },

    createToolbarDef: function() {
        if (this.faces || this.sizes) {
            return [ {
                    "xtype": "panel",
                    "itemId": this.id,
                    "html": (this.faces ? "<select class=\"x-font-select\">"
                        + this.createFontOptions(this.faces) + "</select>" : "")
                        + (this.sizes ? "&nbsp;<select class=\"x-font-select\">"
                        + this.createFontOptions(this.sizes) + "</select>" : ""),
                    "listeners": {
                        "afterrender": function() {
                            var item = this.toolbar.items.get(this.id);
                            if (item && item.body) {
                                var selectors = item.body.dom.getElementsByTagName("select");
                                if (this.faces && this.sizes) {
                                    this.fontFaceSelector = CQ.Ext.get(selectors[0]);
                                    this.fontSizeSelector = CQ.Ext.get(selectors[1]);
                                } else if (this.faces) {
                                    this.fontFaceSelector = CQ.Ext.get(selectors[0]);
                                } else if (this.sizes) {
                                    this.fontSizeSelector = CQ.Ext.get(selectors[0]);
                                }
                                this.initializeSelectors();
                            }
                        },
                        "scope": this
                    }
                }
            ];
        }
    },

    notifyToolbar: function(toolbar) {
        this.toolbar = toolbar;
    },

    getToolbar: function() {
        return CUI.rte.ui.ToolbarBuilder.STYLE_TOOLBAR;
    },

    initializeSelectors: function() {
        if (this.fontFaceSelector) {
            //font face selector initialization
            this.configureSelectors(this.fontFaceSelector, "font_face", "font_face_remove", 19);
        }

        if (this.fontSizeSelector) {
            //font size selector initialization
            this.configureSelectors(this.fontSizeSelector, "font_size", "font_size_remove", 19);
        }
    },

    getFontFaceSelectorDom: function() {
        return this.fontFaceSelector ? this.fontFaceSelector.dom : null;
    },

    getFontSizeSelectorDom: function() {
        return this.fontSizeSelector ? this.fontSizeSelector.dom : null;
    },

    /**
    * @private
    */
    getIndexToSelect: function(values, selDef, selectorDom, isContinuousFont) {
        var indexToSelect;
        if (values.length == 0) {
            indexToSelect = 0;
        } else if (values.length > 1) {
            indexToSelect = -1;
        } else {
            if (isContinuousFont) {
                var valueToSelect = values[0];
                var options = selectorDom.options;
                for (var optIndex = 0; optIndex < options.length; optIndex++) {
                    var optionToCheck = options[optIndex];
                    if (optionToCheck.value == valueToSelect) {
                        indexToSelect = optIndex;
                        break;
                    }
                }
            } else {
                indexToSelect = -1;
            }
        }
        return indexToSelect;
    },

    selectFacesAndSizes: function(faces, sizes, selDef) {
        var faceSelectorDom = this.getFontFaceSelectorDom();
        var sizeSelectorDom = this.getFontSizeSelectorDom();
        var sel = CUI.rte.Selection;
        if (faceSelectorDom) {
            var faceIndexToSelect = this.getIndexToSelect(faces, selDef,
                                        faceSelectorDom, selDef.isContinuousFontFace);
            faceSelectorDom.selectedIndex = faceIndexToSelect;
            // if the selection is just a caret not contained inside font "face" tag, or if
            // the selection extends outside a font "face" tag i.e. faceIndexToSelect == -1,
            // disable the face dropdown
            faceSelectorDom.disabled = (faces.length == 0 && !sel.isSelection(selDef.selection)
                    || faceIndexToSelect == -1);
        }
        if (sizeSelectorDom) {
            var sizeIndexToSelect = this.getIndexToSelect(sizes, selDef,
                                        sizeSelectorDom, selDef.isContinuousFontSize);
            sizeSelectorDom.selectedIndex = sizeIndexToSelect;
            // if the selection is just a caret not contained inside font "size" tag, or if
            // the selection extends outside a font "size" tag i.e. sizeIndexToSelect == -1,
            // disable the size dropdown
            sizeSelectorDom.disabled = (sizes.length == 0 && !sel.isSelection(selDef.selection)
                    || sizeIndexToSelect == -1);
        }

    },

    getSelectedFontFace: function() {
        return this.fontFaceSelector ? this.fontFaceSelector.dom.value : null;
    },

    getSelectedFontSize: function() {
        return this.fontSizeSelector ? this.fontSizeSelector.dom.value : null;
    }

});
/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

/**
  * Default sort index for the font
  * @private
  * @static
  * @final
  * @type Number
  */
 CUI.rte.plugins.Plugin.SORT_FONT = 370;

/**
 * @class CUI.rte.plugins.FontPlugin
 * @extends CUI.rte.plugins.Plugin
 * <p>This class implements styling text fragments with a font tag as a
 * plugin.</p>
 * <p>The plugin ID is "<b>font</b>".</p>
 * <p><b>Features</b></p>
 * <ul>
 *   <li><b>faces</b> - adds a font face selector</li>
 *   <li><b>sizes</b> - adds a font size selector</li>
 * </ul>
 */
CUI.rte.plugins.FontPlugin = new Class({

    toString: "FontPlugin",

    extend: CUI.rte.plugins.Plugin,

    /**
     * @cfg {Object[]} faces
     * <p>Defines font faces that are available to the user for formatting text fragments
     * (defaults to { }).</p>
     * <p>Styling is applied by adding "font" element with face attribute set to the
     * selected value.</p>
     */

     /**
      * @cfg {Object[]} sizes
      * <p>Defines font sizes that are available to the user for formatting text fragments
      * (defaults to { }).</p>
      * <p>Styling is applied by adding "font" element with size attribute set to the
      * selected value.</p>
      */

    /**
     * @private
     */
    cachedFaces: null,

    /**
     * @private
     */
    cachedSizes: null,

    /**
     * @private
     */
    fontUI: null,


    getFeatures: function() {
        return [ "faces", "sizes" ];
    },

    getFaces: function() {
        if(!this.isFeatureEnabled("faces")) {
            return;
        }
        var com = CUI.rte.Common;
        if (!this.cachedFaces) {
            this.cachedFaces = this.config.faces;
            if (this.cachedFaces) {
                // take faces from config
                com.removeJcrData(this.cachedFaces);
                this.cachedFaces = com.toArray(this.cachedFaces);
            } else {
                this.cachedFaces = [ ];
            }
        }
        return this.cachedFaces;
    },

    getSizes: function() {
        if(!this.isFeatureEnabled("sizes")) {
            return;
        }
        var com = CUI.rte.Common;
        if (!this.cachedSizes) {
            this.cachedSizes = this.config.sizes;
            if (this.cachedSizes) {
                // take sizes from config
                com.removeJcrData(this.cachedSizes);
                this.cachedSizes = com.toArray(this.cachedSizes);
            } else {
                this.cachedSizes = [ ];
            }
        }
        return this.cachedSizes;
    },

    initializeUI: function(tbGenerator, options) {
        var plg = CUI.rte.plugins;
        if (this.isFeatureEnabled("faces") || this.isFeatureEnabled("sizes")) {
            this.fontUI = new CUI.rte.ui.ext.FontSelectorImpl("font", this, false, null,
                false, undefined, this.getFaces(), this.getSizes())
            tbGenerator.addElement("font", CUI.rte.plugins.Plugin.SORT_FONT, this.fontUI, 10);
        }
    },

    notifyPluginConfig: function(pluginConfig) {
        pluginConfig = pluginConfig || { };
        CUI.rte.Utils.applyDefaults(pluginConfig, { });
        this.config = pluginConfig;
    },

    execute: function(cmdId, font) {
        var cmd = null;
        var value = null;
        switch (cmdId.toLowerCase()) {
            case "font_face":
                cmd = "applyfontface";
                value = (font != null ? font : this.fontUI.getSelectedFontFace());
                break;
            case "font_face_remove":
                cmd = "removefontface";
                break;
            case "font_size":
                cmd = "applyfontsize";
                value = (font != null ? font : this.fontUI.getSelectedFontSize());
                break;
            case "font_size_remove":
                cmd = "removefontsize";
                break;
        }
        if (cmd) {
            this.editorKernel.relayCmd(cmd, value);
        }
    },

    updateState: function(selDef) {
        if (!this.fontUI) {
            return;
        }
        var com = CUI.rte.Common;
        var fonts = selDef.fonts;
        var actualFaces = [ ];
        var actualSizes = [ ];
        var facesDef = this.getFaces();
        var facesCnt = facesDef ? facesDef.length : 0;
        var sizesDef = this.getSizes();
        var sizesCnt = sizesDef ? sizesDef.length : 0;
        var checkCnt = fonts.length;
        for (var c = 0; c < checkCnt; c++) {
            var fontToProcess = fonts[c];
            for (var s = 0; s < facesCnt; s++) {
                if (facesDef[s] == fontToProcess.dom.face) {
                    actualFaces.push(fontToProcess.dom.face);
                    break;
                }
            }
            for (var s = 0; s < sizesCnt; s++) {
                if (sizesDef[s] == fontToProcess.dom.size) {
                    actualSizes.push(fontToProcess.dom.size);
                    break;
                }
            }
        }
        this.fontUI.selectFacesAndSizes(actualFaces, actualSizes, selDef);
    }

});

// register plugin
CUI.rte.plugins.PluginRegistry.register("font", CUI.rte.plugins.FontPlugin);

/*************************************************************************
*
* ADOBE CONFIDENTIAL
* ___________________
*
*  Copyright 2014 Adobe Systems Incorporated
*  All Rights Reserved.
*
* NOTICE:  All information contained herein is, and remains
* the property of Adobe Systems Incorporated and its suppliers,
* if any.  The intellectual and technical concepts contained
* herein are proprietary to Adobe Systems Incorporated and its
* suppliers and are protected by trade secret or copyright law.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe Systems Incorporated.
**************************************************************************/

// this class mirrors the CUI implementation for overlaying and makes it compatible
// with Ext's class system
CQ.form.rte.plugins.FontPlugin = CQ.Ext.extend(CUI.rte.plugins.FontPlugin, {

    _rtePluginType: "compat",

    constructor: function(/* varargs */) {
        if (this.construct) {
            this.construct.apply(this, arguments);
        }
    }

});
