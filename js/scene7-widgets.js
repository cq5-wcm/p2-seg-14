CQ.scene7 = CQ.scene7 || {};


CQ.scene7.initPresetOptions = function() {
    var cloudConfigCombo = CQ.Ext.getCmp("s7-videoprofile-cloudconfig");
    if(cloudConfigCombo){
        var cloudConfigPath = cloudConfigCombo.getValue();
        if(cloudConfigPath){
            CQ.scene7.loadPresetOptions(cloudConfigPath);
        }
    }
};

CQ.scene7.updatePresetOptions = function(record){
    if(record){
        var cloudConfigPath = record.data.path;
        if(cloudConfigPath){
            CQ.scene7.loadPresetOptions(cloudConfigPath);
        }
    }
};

CQ.scene7.loadPresetOptions = function(cloudConfigPath){
    if(cloudConfigPath){
        var path = cloudConfigPath;
        if(path){
            path = path + "/jcr:content.presets.encoding.json";
            var options;
            var response = CQ.HTTP.get(path);
            if(CQ.utils.HTTP.isOk(response)){
                var responseBody = response.body;
                options = JSON.parse(responseBody);
            }
            if(options){
                var presetCombo = CQ.Ext.getCmp("s7-videoprofile-preset");
                if(presetCombo){
                    presetCombo.setOptions(options);
                }
            }
        }
    }
};


CQ.scene7.triggerWorkflow = function(id, path, s7ConfigPath) {
    if (!s7ConfigPath) {
        s7ConfigPath = "";
    }
    document.getElementById(id + "-publishLink").removeAttribute("onclick");
    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Uploading to Scene7");
    CQ.HTTP.post("/etc/workflow/instances", function(options, success, xhr, response) {
        if (success && xhr.status == 201) {
            var locHeader = xhr.getResponseHeader("Location").replace(/^http:\/\/.*?\/(.*)$/, "/$1");
            window.setTimeout("CQ.scene7.checkWorkflow('" + id + "', '" + path + "', '" + locHeader + "');", 5000);
        }
    }, {
        model:"/etc/workflow/models/scene7/jcr:content/model",
        payloadType:"JCR_PATH",
        payload:decodeURIComponent(path),
        "_charset_":"utf-8",
        "pageCloudConfigPath":s7ConfigPath,
        "isInteractiveUpload": "true"
    });
};


// run the workflow until it succeeds or fails. If it succeeds then we work off poll for pub status  via checkPublishState
CQ.scene7.checkWorkflow = function(id, path, location) {
    CQ.HTTP.get(location + ".json", function(options, success, xhr, response) {
        if (success) {
            var workflowInstance = CQ.HTTP.eval(xhr);
            if (workflowInstance) {
                if (workflowInstance.state == "RUNNING") {
                    CQ.scene7.checkPublishState(id, path, 0);
                    window.setTimeout("CQ.scene7.checkWorkflow('" + id + "', '" + path + "', '" + location + "');", 5000);
                    return;
                } else if (workflowInstance.state == "COMPLETED") {
                    var now = new Date();
                    CQ.scene7.checkPublishState(id, path, now.getTime());
                    return;
                }

            }
        }
        document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publishing to Scene7 failed");
    });
};


CQ.scene7.triggerWorkflowFromViewer = function(id, path, s7PageConfigPath) {
    CQ.HTTP.get(path + "/_jcr_content/metadata.json", function(options, success, xhr, response) {
        if (success) {
            var asset = CQ.HTTP.eval(xhr);
            if (asset && asset["dam:scene7FileStatus"]) {
                var now = new Date();
                document.getElementById(id + "-publishLink").removeAttribute("onclick");
                CQ.scene7.checkPublishState(id, path, now.getTime());
            } else {
                CQ.scene7.triggerWorkflow(id, path, s7PageConfigPath);
            }
        }
    });
};

// Check status of s7 upload/publish based on asset metadata
// Polls based on startup and continues until the operation succeeds, fails or
// timeouts.
// Note: Timeout does not change the current status setting as the job likely has not failed, just has not yet completed
CQ.scene7.checkPublishState = function(id, path, startTime) {
    // if onclick has been reset a new asset was dropped in while the previous asset is publishing stop checking pub status of previous asset
    if (document.getElementById(id + "-publishLink").hasAttribute("onclick"))
        return;
    CQ.HTTP.get(path + "/_jcr_content/metadata.json", function(options, success, xhr, response) {
        if (success) {
            var asset = CQ.HTTP.eval(xhr);
            if (asset && asset["dam:scene7FileStatus"]) {
                var state = asset["dam:scene7FileStatus"];
                if (state == "UploadStart")
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Uploading to Scene7");
                else if (state == "PublishQueued")
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publishing to Scene7 queued");
                else if (state == "PublishStart")
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publishing to Scene7");
                else if (state == "UploadFailed" || state == "PublishFailed") {
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publish to Scene7 failed");
                    return;
                } else if (state == "PublishComplete") {
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publish to Scene7 completed");
                    return;
                } else if (state == "NotSupported") {
                    document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Unsupported Scene7 asset type");
                    return;
                }

                var now = new Date();
                if (now.getTime() - startTime < 20 * 60 * 1000)
                    window.setTimeout('CQ.scene7.checkPublishState(\'' + id + '\', \'' + path + '\', ' + now.getTime() + ');', 5000);
            } else
                document.getElementById(id + "-publishLink").innerHTML = CQ.I18n.getMessage("Publish to Scene7 failed");
        }
    });
};

CQ.scene7.pollingEnablerSelectionChange = function(selectCmp, value, changed) {
    var dialog = selectCmp.findParentByType("dialog");
    var pollConfigEnabled = dialog.find("name", "./pollConfig/enabled")[0];
    pollConfigEnabled.setValue(value)
    
    CQ.scene7.showHideRunningImporterTerminator(selectCmp, value == "false");
};

CQ.scene7.showHideRunningImporterTerminator = function(component, showControl) {
    var dialog = component.findParentByType("dialog");
    if (typeof dialog != undefined) {
        var cancelImporterCmpArray = dialog.find("name", "./pollConfig/cancelImporter");
        
        if (cancelImporterCmpArray &&
                cancelImporterCmpArray.length &&
                cancelImporterCmpArray.length > 0) {
            var cancelImporterCmp = cancelImporterCmpArray[0];
            
            cancelImporterCmp.setVisible(showControl);
        }
    }
};

CQ.scene7.doConnect = function(dialog) {
    var emailField = dialog.find("name", "./email");
    var passwordField = dialog.find("name", "./password");
    var regionField = dialog.find("name", "./region");
    var email = emailField[0].getValue();
    var password = passwordField[0].getValue();
    var region = regionField[0].getValue();
    
    if (!email) {
        CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), CQ.I18n.getVarMessage("Please provide an email address."));
        return;
    }
    if (!password) {
        CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), CQ.I18n.getVarMessage("Please provide the Scene7 account's password."));
        return;
    }
    if (!region) {
        CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), CQ.I18n.getVarMessage("Please select the region for your Scene7 account."));
        return;
    }

    this.showButtonIndicator(true);

    CQ.HTTP.post(dialog.path + ".companies.json", function(options, success, xhr, response) {
                if (success) {
                    var scene7Data = CQ.HTTP.eval(xhr);
                    this.showButtonIndicator(false);
                    if (scene7Data) {
                        if (scene7Data.error) {
                            CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), CQ.I18n.getVarMessage(scene7Data.error));
                        } else {
                            if (scene7Data.userHandle) {
                                dialog.find("name", "./userHandle")[0].setValue(scene7Data.userHandle);
                            }

                            if (scene7Data.companies && scene7Data.companies.length > 0) {
                                var companies = new Array();
                                for (var i = 0; i < scene7Data.companies.length; i++) {
                                    // has to be in the same order as the store field config
                                    companies.push([ scene7Data.companies[i].handle,
                                        scene7Data.companies[i].name,
                                        scene7Data.companies[i].rootPath]);
                                }
                                dialog.find("name", "./companyname")[0].store.loadData(companies);
                            }

                            var rootPath = dialog.find("name", "./rootPath")[0];
                            rootPath.setValue("");
                            rootPath.itemCt.setDisplayed("inherit");
                            dialog.find("name", "./companyname")[0].setValue("");
                            dialog.find("name", "./companyname")[0].itemCt.setDisplayed("inherit");
                            if (dialog.find("name", "./syncEnabled")[0].getValue(true) === "on") {
                                dialog.find("name", "./syncControl")[0].setValue(true);
                            } else {
                                dialog.find("name", "./syncControl")[0].setValue(false);
                            }
                            dialog.find("name", "./syncControl")[0].itemCt.setDisplayed("inherit");
						    if (dialog.find("name", "./publishEnabled")[0].getValue(true) === "on") {
                                dialog.find("name", "./publishEnabled")[0].setValue("on");
                                dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("inherit");
                           	} else {
                                dialog.find("name", "./publishEnabled")[0].setValue("off");
                                dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("none");
                           	}
                            dialog.find("name", "./publishEnabled")[0].itemCt.setDisplayed("inherit");
                            dialog.find("name", "./defaultConfiguration")[0].itemCt.setDisplayed("inherit");
                            dialog.find("localName", "connectButton")[0].setText(CQ.I18n.getMessage('Re-Connect to Scene7'));

                            dialog.find("name", "./pollConfig/source")[0].setValue("scene7:" + dialog.path);
                            dialog.find("name", "./pollConfig/target")[0].setValue(dialog.path);

                            CQ.Ext.Msg.show({
                                title:CQ.I18n.getMessage("Success"),
                                msg:CQ.I18n.getMessage("Connection successful"),
                                buttons:CQ.Ext.Msg.OK,
                                icon:CQ.Ext.Msg.INFO});
                            CQ.cloudservices.getEditOk().enable();
                        }
                    }
                }
            },
            {
                "email":email,
                "password":password,
                region:region,
                path:dialog.path
            }, this, true);

};

CQ.scene7.showButtonIndicator = function(isShown) {
    if (!isShown) {
        CQ.Ext.Msg.wait(CQ.I18n.getMessage("Connection successful")).hide();
    } else {
        CQ.Ext.Msg.wait(CQ.I18n.getMessage("Connecting to Scene7..."));
    }
};

CQ.scene7.EmailField = CQ.Ext.extend(CQ.Ext.form.TextField, {
    constructor:function(config) {
        config.enableKeyEvents = true;

        config.listeners = {
            change:function(field, newValue, oldValue) {
                var dialog = field.findParentByType("dialog");
                dialog.find("name", "./password")[0].setValue("");
                dialog.find("name", "./userHandle")[0].setValue("");
                dialog.find("name", "./companyHandle")[0].setValue("");

                dialog.find("name", "./rootPath")[0].setValue("");
                dialog.find("name", "./rootPath")[0].itemCt.setDisplayed("none");
                dialog.find("name", "./companyname")[0].setValue("");
                dialog.find("name", "./companyname")[0].itemCt.setDisplayed("none");
                dialog.find("name", "./syncControl")[0].itemCt.setDisplayed("none");
				dialog.find("name", "./previewServer")[0].setValue("");
                dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("none");
                dialog.find("name", "./defaultConfiguration")[0].itemCt.setDisplayed("none");
            }
        };

        CQ.scene7.EmailField.superclass.constructor.call(this, config);
    }

});

CQ.Ext.reg('scene7emailfield', CQ.scene7.EmailField);

CQ.scene7.CompanyField = CQ.Ext.extend(CQ.Ext.form.ComboBox, {
    constructor:function(config) {
        config.mode = "local";
        config.triggerAction = 'all';
        config.valueField = "handle";
        config.displayField = "name";
        config.store = new CQ.Ext.data.SimpleStore({
            data:[],
            fields:["handle", "name", "rootPath"],
            id:0
        });
        config.listeners = {
            select:function(combo, record, index) {
                var dialog = combo.findParentByType("dialog");
                dialog.find("name", "./companyHandle")[0].setValue(record.data.handle);
                dialog.find("name", "./rootPath")[0].setValue(record.data.rootPath);
                dialog.find("name", "./targetPath")[0].setValue("/content/dam/" + record.data.rootPath);
                dialog.find("name", "./s7RootPath")[0].setValue(record.data.rootPath);
                dialog.find("name", "./adhocFolder")[0].setValue(record.data.rootPath + "CQ5_adhoc");
				dialog.find("name", "./previewServer")[0].setValue(record.data.previewServer);
            },
            loadcontent:function(field, record, path) {
                var dialog = field.findParentByType("dialog");
                if (!record.data.companyHandle) {
                    field.itemCt.setDisplayed("none");
                    dialog.find("name", "./rootPath")[0].itemCt.setDisplayed("none");
                    dialog.find("name", "./syncControl")[0].itemCt.setDisplayed("none");
                    dialog.find("name", "./publishEnabled")[0].itemCt.setDisplayed("none");
					dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("none");
                    dialog.find("name", "./defaultConfiguration")[0].itemCt.setDisplayed("none");
                }
                CQ.scene7.init(dialog);
            }
        };

        CQ.scene7.CompanyField.superclass.constructor.call(this, config);
    },
    initComponent:function() {
        CQ.scene7.CompanyField.superclass.initComponent.call(this);
    }
});

CQ.Ext.reg('scene7companyfield', CQ.scene7.CompanyField);

CQ.scene7.TwoValueField = CQ.Ext.extend(CQ.form.CompositeField, {

    constructor:function(config) {
        var fieldItem = this;
        var items = new Array();
        items.push({
            xtype:'numberfield',
            allowDecimals:config.allowDecimals,
            allowNegative:config.allowNegative,
            listeners:{
                change:function(field, newValue, oldValue) {
                    fieldItem.hiddenField.setValue(newValue + "," + fieldItem.field2.getValue());
                }
            }
        });
        items.push({
            xtype:'numberfield',
            allowDecimals:config.allowDecimals,
            allowNegative:config.allowNegative,
            listeners:{
                change:function(field, newValue, oldValue) {
                    fieldItem.hiddenField.setValue(fieldItem.field1.getValue() + "," + newValue);
                }
            }
        });
        items.push({
            xtype:'hidden',
            name:config.name
        });

        config = CQ.Util.applyDefaults(config, {
            "border":false,
            "items":[
                {
                    "xtype":"panel",
                    "border":false,
                    "bodyStyle":"padding:" + this.bodyPadding + "px",
                    "layout":"column",
                    "items":items
                }
            ]
        });
        CQ.scene7.TwoValueField.superclass.constructor.call(this, config);
    },

    initComponent:function() {
        CQ.scene7.TwoValueField.superclass.initComponent.call(this);

        this.field1 = this.items.items[0].items.items[0];
        this.field2 = this.items.items[0].items.items[1];
        this.hiddenField = this.items.items[0].items.items[2];

        this.on("disable", function() {
            this.items.each(function(item/*, index, length*/) {
                if (item instanceof CQ.Ext.form.Field) {
                    item.field.disable();
                }
            }, this);
        });

        this.on("enable", function() {
            this.items.each(function(item/*, index, length*/) {
                if (item instanceof CQ.Ext.form.Field) {
                    item.field.enable();
                }
            }, this);
        });
    },

    // overriding CQ.form.CompositeField#getValue
    getValue:function() {
        return this.field1.getValue() + "," + this.field2.getValue();

    },

    // overriding CQ.form.CompositeField#setValue
    setValue:function(value) {
        if (value.indexOf(",") != -1) {
            var value1 = value.substring(0, value.indexOf(","));
            var value2 = value.substring(value.indexOf(",") + 1);
        } else {
            var value1 = value;
            var value2 = "";
        }
        this.field1.setValue(value1);
        this.field2.setValue(value2);
        this.hiddenField.setValue(value);
    }
});

CQ.Ext.reg('scene7twovaluefield', CQ.scene7.TwoValueField);

CQ.scene7.SyncField = CQ.Ext.extend(CQ.Ext.form.Checkbox, {
    constructor:function(config) {
        config.listeners = {
            check:function(cb, check) {
                var dialog = cb.findParentByType("dialog");
                if (check) {
                    dialog.find("name", "./syncEnabled")[0].setValue("on");
                } else {
                    dialog.find("name", "./syncEnabled")[0].setValue("off");
                }
            },
            loadcontent:function(field, record, path) {
                var dialog = field.findParentByType("dialog");
                if (record.data.syncEnabled === "off") {
                    dialog.find("name", "./syncControl")[0].setValue(false);
                }
            }
        };
        CQ.scene7.SyncField.superclass.constructor.call(this, config);
    }
});

CQ.Ext.reg('scene7syncfield', CQ.scene7.SyncField);

CQ.scene7.updateDefaultConfig = function(dialog) {
    // get the value of the default checkbox
    var configControls = dialog.find("name", "./defaultConfiguration");
    if (configControls && configControls[0]) {
        var isDefaultConfig = configControls[0].getValue();
        if (isDefaultConfig) {
            var configPath = dialog.path;

            // if the flag is set, perform a XHR to update the default configuration
            CQ.HTTP.post(configPath + ".config.json", function(options, success, xhr, response) {},
                {
                    "setDefault":"true"
                }, this, true);
        }
    }

    return true;
};

/**
 * Updates the presets for the given S7 config
 */
CQ.scene7.updatePresets = function(resourcePath, callback) {
    if (!callback) {
        callback = function(options, success, xhr, response) {};
    }
    CQ.HTTP.post(resourcePath + ".presets.all.html", callback, {}, this, true);
};

CQ.scene7.updatePreviewServer = function(publishOption, dialog) {

    if (publishOption === 'off') {
        dialog.find("name", "./previewServer")[0].setValue("");
	    dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("none");
    } else if (publishOption === 'on') {
        dialog.find("name", "./previewServer")[0].setValue("");
	    dialog.find("name", "./previewServer")[0].itemCt.setDisplayed("inherit");
    }
};

CQ.scene7.isUploadAndPollingEnabled = function (dialog) {
  	var syncEnabled = dialog.find("name","./syncEnabled");
    var pollConfigEnabled = dialog.find("name","./pollConfig/enabled");
    if (syncEnabled[0].value === "on" && pollConfigEnabled[0].value === "true") {
        CQ.Ext.Msg.alert(CQ.I18n.getMessage("Error"), "Configuring the AEM-Scene7 integration to enable both Automatic Upload and Polling Importer is not supported. This could lead to unintended consequences and undesirable behavior.");
        return false;
    }
    return true;
};

CQ.Ext.apply(CQ.Ext.form.VTypes, {
    //  vtype validation function
    scene7Path : function(val) {
        return /^.*\/$/.test(val);
    },
    // vtype Text property: The error text to display when the validation function returns false
    scene7PathText : CQ.I18n.getMessage('Not a valid path. Must end with /'),
    scene7Endpoint : function(val){
        var url = val;
        if ( url.lastIndexOf('/') != url.length )
            url += "/";
        if (! /^(https?:\/\/)?(([\da-z\.-]+)\.([a-z\.]{2,6})|localhost)(:[0-9]{1,5})?([\/\w \.-]*)*\/?$/.test(url))
            return false;

        // parsing the port out of the URL and check if it's range is correct
        var tokens=url.split(":");
        var lastToken = tokens[tokens.length-1];
        var port = lastToken.substring(0, lastToken.indexOf('/'));
        if (port < 0 || port > 65535)
            return false;

        return true;
    },
    scene7ConfigTargetPath : function(val) {
        var currentTargetPath = val,
            configsURL = CQ.shared.HTTP.externalize('/etc/cloudservices/scene7.infinity.json'),
            response,
            jsonResponse,
            currentObject,
            page,
            targetPath,
            currentPath = CQ.shared.HTTP.getPath(window.location.href),
            currentResource = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        if (currentTargetPath.lastIndexOf('/') == currentTargetPath.length - 1) {
            currentTargetPath = currentTargetPath.substring(0, currentTargetPath.length - 1);
        }
        response = CQ.shared.HTTP.get(configsURL);
        if (response) {
            jsonResponse = JSON.parse(response.body);
            if (jsonResponse) {
                for (prop in jsonResponse) {
                    if (prop == currentResource) {
                        continue;
                    }
                    currentObject = jsonResponse[prop];
                    page = currentObject['jcr:content'];
                    if (page && page['sling:resourceType'] && page['sling:resourceType'] === 'dam/components/scene7/scene7page') {
                        targetPath = page['targetPath'];
                        if (targetPath && targetPath.lastIndexOf('/') == targetPath.length - 1) {
                            targetPath = targetPath.substring(0, targetPath.length - 1);
                        }
                        if (currentTargetPath === targetPath) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    },
    scene7ConfigTargetPathText : CQ.I18n.getMessage('A previously existing configuration uses the same target path.')

});

/*
 * Copyright 1997-2008 Day Management AG
 * Barfuesserplatz 6, 4001 Basel, Switzerland
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * Day Management AG, ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with Day.
 */
CQ.scene7 = CQ.scene7 || {};
CQ.scene7.videoEncoding = {};

CQ.scene7.videoEncoding.videoEncodingResponse = null;
CQ.scene7.videoEncoding.init = function(resourcePath) {
    if (CQ.scene7.videoEncoding.videoEncodingResponse == null) {
        var response = CQ.HTTP.get(resourcePath + '.presets.encoding.json');
        if (CQ.shared.HTTP.isOk(response)) {
            CQ.scene7.videoEncoding.videoEncodingResponse = CQ.shared.Util.eval(response);
        }
    }
}

/**
 * @class CQ.S7.VideoEncodingPanel
 * @extends CQ.Ext.Panel
 * The VideoEncodingPanel supports the selection of one or more S7
 *    video encoding presets.
 */
CQ.scene7.videoEncoding.VideoEncodingPanel = CQ.Ext.extend(CQ.Ext.form.CompositeField, {
    
    constructor: function(config) {

        var self = this;
        var itemsArr = new Array();
        this.filter = config.filter;
        this.store = new CQ.Ext.data.JsonStore({
                autoLoad: false,
                data: CQ.scene7.videoEncoding.videoEncodingResponse,
                fields: [
                    'name','handle','type','playbackOn'
                ],
                listeners: {
                    "load": function(store, records, options) {
                        store.each(function(record) {
                            var type = record.get("type");
                            var playbackOn = record.get("playbackOn");
                            if ((type !== null && type.length > 0 && self.filter.indexOf(type) != -1) ||
                                    (playbackOn !== null && playbackOn.length > 0 && self.filter.indexOf(playbackOn) != -1)) {
                                itemsArr.push(new CQ.Ext.form.Checkbox({
                                        "id": record.get("handle"),
                                        "boxLabel": record.get("name")
                                }));
                            }
                        });
                        if (store.getCount() == 0) {
                            itemsArr.push({xtype: "label", text: CQ.I18n.getMessage("No presets to display")});
                        }
                    }
                }
            });
        
        this.valueField = new CQ.Ext.form.Hidden({ name:config.name });
        
        config = CQ.Util.applyDefaults(config, {
            items: [
                {
                    xtype:"panel",
                    border:false,
                    bodyStyle:"padding:4px",
                    items: itemsArr
                },
                this.valueField
            ],
            listeners: {
                render: function(comp) {
                    var parentDialog = comp.findParentByType("dialog");
                    if (parentDialog) {
                        parentDialog.on("beforesubmit", function(e) {
                            var value = self.getValue();
                            self.valueField.setValue(value);
                        });
                    }
                }
            }
        });
        CQ.scene7.videoEncoding.VideoEncodingPanel.superclass.constructor.call(this,config);
    },

    getValue: function() {
        var value = "";
        var separator = "";
        this.items.each(function(item, index, length) {
            if ((item instanceof CQ.Ext.form.Checkbox) && item.getValue()) {
                value = value + separator + item.getId();
                separator = ",";
            }
        }, this);
        return value;
    },
    
    setValue: function(value) {
        if ((value != null) && (value != "")) {
            var values = value.split(",");
            for (var i=0; i<values.length; i++) {
                this.items.each(function(item, index, length) {
                    if (item.getId() == values[i]) {
                        item.setValue(true);
                    }
                });
            }
        }
    }
});

CQ.Ext.reg("s7videoencoding", CQ.scene7.videoEncoding.VideoEncodingPanel);

/**
 * @class CQ.cloudservices.Scene7CloudConfigurationCombo
 * @extends CQ.cloudservices.CloudConfigurationCombo
 * The Scene7CloudConfigurationCombo is a customized {@link CQ.cloudservices.CloudConfigurationCombo}
 * that shows a list of available configurations for a specific Scene7 service, with additional support for
 * automatically selecting the S7 service marked as default.
 *
 * @constructor
 * Creates a new Scene7CloudConfigurationCombo.
 * @param {Object} config The config object
 */
CQ.cloudservices.Scene7CloudConfigurationCombo = CQ.Ext.extend(CQ.cloudservices.CloudConfigurationCombo, {
    constructor: function(config) {
        CQ.cloudservices.Scene7CloudConfigurationCombo.superclass.constructor.call(this, config);
    },
    
    /**
     * Override the data store procedure in the base class
     * Create and return a CQ.Ext.data.Store for this component
     */
    createDataStore : function(config, rootPathParam, self) {
        var newDataStore = new CQ.Ext.data.Store({
            "autoLoad": {},
            "proxy":new CQ.Ext.data.HttpProxy({
                "url":CQ.shared.HTTP.externalize("/libs/cq/cloudservices/configurations.json" + rootPathParam),
                "method":"GET"
            }),
            "reader": new CQ.Ext.data.JsonReader({
                "root": "configurations",
                "id" : "path",
                "fields": [ "title", "description", "name", "path", "templatePath" ]
            }),
            "listeners": {
                "load": function(store) {
                    if (self.createNewEnabled) {
                        store.add(new store.recordType({
                            "path": "",
                            "title": CQ.I18n.getMessage("Create new configuration..."),
                            "description": ""
                        }, CQ.Ext.id()));
                    }
                    
                    // perform an extra XHR to get the full json under rootPath
                    CQ.HTTP.get(config.rootPath + ".infinity.json", function(options, success, xhr, response) {
                        var value = "";
                        if (success) {
                            var scene7Data = CQ.HTTP.eval(xhr);
                            if (scene7Data) {
								// remove endpoint configurations
                                var removed = [];
                                for (var i=0 ; i < store.totalLength ; i++) {
                                    if (typeof store.getAt(i) != 'undefined'  && store.getAt(i).get('path').indexOf('scene7/endpoints') > -1) {
                                            removed.push(store.getAt(i));
                                    }
                                }
                                for (var i in removed) {
                                    store.remove(removed[i]);
                                }

                                // identify the first config with a default flag set
                                for (var i=0 ; i < store.totalLength ; i++) {

                                    if (typeof store.getAt(i) != 'undefined'){
                                        var configName = store.getAt(i).get('name');

                                        //set the first config
                                        var tmpObj = store.getAt(i);
                                        if (i == 0){ value = tmpObj.get('path'); }

										// find default config
                                        var configProperties = scene7Data[configName];
                                        var isDefault = false;
                                        if (configProperties
                                                && configProperties["jcr:content"]
                                                && configProperties["jcr:content"].defaultConfiguration == true) {
                                            isDefault = true;
                                        }
                                        
                                        if (isDefault) {
                                            value = store.getAt(i).get('path');
                                            break;
                                        }
                                    }
                                }
                                
                                //if the temp object is undefined then there are no valid s7 configurations for the content finder, remove everything from store (endpoints)
                                if(tmpObj === undefined) {
									store.removeAll();
                                }
                            }
                        }
                        
                        // pre-select the default, if available
                        if (value != "") {
                            self.setValue(value);
                            self.fireEvent("change", this, value, undefined);
                        } else if (config.selectFirst){
                            // make sure we have at least one configuration available
                            // before attempting to select the first
                            var firstConfig = store.getAt(0);
                            if (firstConfig) {
                                value = firstConfig.get('path');
                            }
                            self.setValue(value);
                            self.fireEvent("change", this, value, undefined);
                        }
                    }, this);
                }
            }
        });
        
        return newDataStore;
    },
    
    setValue : function(value) {
        CQ.cloudservices.Scene7CloudConfigurationCombo.superclass.setValue.call(this, value);
    },
    
    getCqRootPath : function() {
        return CQ.S7.getCqRootPath(this.getValue());
    }
});

CQ.Ext.reg("scene7cloudservicescombo", CQ.cloudservices.Scene7CloudConfigurationCombo);
/**
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2013 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 *
 */

/**
 * @class CQ.scene7.S7SmartImage
 * @extends CQ.html5.form.SmartImage
 * <p>The S7SmartImage is an extension of the CQ.html5.form.SmartImage.</p>
 * It will offer image manipulation functionality similar to the CQ.html5.form.SmartImage, but applied onto S7 content
 * a suitable {@link #height} setting.</p>
 * @since 5.5, replaces {@link CQ.form.SmartImage}
 * @constructor
 * Creates a new S7SmartImage.
 * @param {Object} config The config object
 */
CQ.scene7.S7SmartImage = CQ.Ext.extend(CQ.html5.form.SmartImage, {

    // image width
    imageWidth: -1,

    // image height
    imageHeight: -1,

    // image crop
    imageCrop: "",

    // image preset
    imagePreset: "",

    // overriden image width
    processedWidth: -1,

    // overriden image height
    processedHeight: -1,

    // image format
    imageFormat: "",

    // jpeg quality
    jpegQuality: 85,

    // sharpening
    imageSharpening: "",

    // unsharp mask values
    umAmount: 0,
    umRadius: 0,
    umThreshold:0,

    // url modifiers
    urlModifiers: "",

    // default dimension used to request image from S7 for crop functionality
    cropDefaultDimension: 400,

    // request width and height for the crop tool
    cropReqWidth: 0,

    cropReqHeight: 0,

    assetType: "",

    isImageServerUrl: false,
    
    // before submit handler
    beforeSubmitHandler: function(component) {

    },

    /**
     * Performs translation of a dimension from a (0 - sourceMaxDim) space to (0 - destinationMaxDim) value
     *
     * @param sourceMaxDim - Max dimension in the source space
     * @param sourceDim - current value in the source space
     * @param destinationMaxDim - Max dimension in the destination space
     * @return
     *      translated dimension in the  destination space
     */
    translateDimension: function(sourceMaxDim, sourceDim, destinationMaxDim) {
        if(isNaN(sourceMaxDim)) {
            sourceMaxDim = 0;
        }
        if(isNaN(sourceDim)) {
            sourceDim = 0;
        }
        if(isNaN(destinationMaxDim)) {
            destinationMaxDim = 0;
        }

        // compute scale factor
        var scaleFactor = 1;
        if (sourceMaxDim != 0) {
            scaleFactor = sourceDim / sourceMaxDim;
        }

        // apply the scale to the destination space
        var translatedDim = scaleFactor * destinationMaxDim;

        return translatedDim.toFixed(0);
    },

    /**
     * Translates a set of coordinates (xStart,yStart,xEnd,yEnd form) from (sourceXMax, sourceYMax) dimensions
     * in (destXMax, destYMax) space
     *
     * @param {String} serializedCoordString - coordinates string in the following format: xStart,yStart,xEnd,yEnd
     * @param {Number} sourceXMax, sourceYMax - source space max dimensions
     * @param {Number} destXMax, destYMax - destination space max dimensions
     */
    translateCoordinates: function(serializedCoordString, sourceXMax, sourceYMax, destXMax, destYMax) {
        if (!serializedCoordString) {
            return serializedCoordString;
        }
        var coordValues = serializedCoordString.split(",");
        if (coordValues.length >= 4) {
            var startX = coordValues[0];
            var startY = coordValues[1];
            var endX = coordValues[2];
            var endY = coordValues[3];

            // translate values
            startX = this.translateDimension(sourceXMax, startX, destXMax);
            startY = this.translateDimension(sourceYMax, startY, destYMax);
            endX = this.translateDimension(sourceXMax, endX, destXMax);
            endY = this.translateDimension(sourceYMax, endY, destYMax);

            // re-serialize
            serializedCoordString = startX + "," + startY + "," + endX + "," + endY;
        }

        return serializedCoordString;
    },

    // crop serialize method
    cropSerialize: function(translatedCropSerialize) {
        // received serialized form contains coordinates in the cropReqWidth x cropReqHeight space
        // must translate to originalSize
        return this.translateCoordinates(translatedCropSerialize, this.cropReqWidth, this.cropReqHeight, this.imageWidth, this.imageHeight);
    },

    // crop de-serialize method
    cropDeserialize: function(cropDefStr) {
        // received serialized form contains coordinates in the originalWidth x originalHeight space
        // must translate to cropReqWidth x cropReqHeight
        return this.translateCoordinates(cropDefStr, this.imageWidth, this.imageHeight, this.cropReqWidth, this.cropReqHeight);
    },

    constructor: function(config) {
        config = config || {};
        // disable upload
        var defaults = {
            "allowUpload": false,
            "ddAccept" :  "image/;Multipart"
        };

        CQ.Util.applyDefaults(config, defaults);

        // initialize crop req sizes to cropDefaultDimensio
        this.cropReqWidth = this.cropDefaultDimension;
        this.cropReqHeight = this.cropDefaultDimension;
        CQ.scene7.S7SmartImage.superclass.constructor.call(this, config);

        // override serialize and deserialize crop methods to map max 400 x 400 dimensions to image original dimensions
        var imageTools = this.imageToolDefs;
        var smartImage = this;
        if (imageTools) {
            for (var imageToolIdx = 0 ; imageToolIdx < imageTools.length ; imageToolIdx ++) {
                if (imageTools[imageToolIdx] instanceof CQ.form.ImageCrop) {
                    var originalSerialize = imageTools[imageToolIdx].serialize;
                    var originalDeserialize = imageTools[imageToolIdx].deserialize;

                    // overwrite the serialize and deserialize, to make sure we're being called to re-map the values to the scaled image
                    imageTools[imageToolIdx].serialize = function() {
                        // call original
                        var serializedCrop = originalSerialize.call(this);

                        // translate the crop to the original sizes
                        return smartImage.cropSerialize(serializedCrop);
                    };

                    imageTools[imageToolIdx].deserialize = function(cropDefStr) {
                        // translate the crop from original sizes to scaled dimensions
                        var translatedCrop = smartImage.cropDeserialize(cropDefStr);

                        return originalDeserialize.call(this, translatedCrop);
                    };
                }
            }
        }
    },

    // overriding CQ.html5.form.SmartImage#initComponent
    initComponent: function() {
        CQ.scene7.S7SmartImage.superclass.initComponent.call(this);

        // tab activate handler
        this.on("activate", function(panel){
            if (this.referencedFileInfo) {
                var imgConfig = CQ.scene7.dynamicImageHelper.getImageConfig(panel);
                imgConfig["imageCrop"] = this.imageCrop;
                this.initializeDimensions(imgConfig);
                this.reloadImages();
                this.updateView();
            }
        });

        // hook into the container dialog submit handler
        var s7SmartImage = this;
        var containerDialog = this.findParentByType("dialog");
        if (containerDialog) {
            containerDialog.on("beforesubmit", function(dialog){
                s7SmartImage.beforeSubmitHandler(dialog);
            });
        }
    },

    /**
     * Overrides the SmartImage's createRefUrl method
     * @param {Object} refFileInfo The file info for the referenced image; property refFileInfo.url is required
     * @return {String} The S7 URL to be used for requesting the referenced image
     * @private
     */
    createRefUrl: function(refFileInfo) {
        var urlPrefix = "";
        if (this.isImageServerUrl) {
            urlPrefix = "/is/image";
        }
        
        var url = this.urlAppend(urlPrefix + refFileInfo.url, this.buildCropEditSizeModifiers());
        return CQ.HTTP.externalize(url, true);
    },

    /**
     * Overrides the SmartImage's createFallbackRefUrl method
     * @param {Object} refFileInfo The file info for the referenced image; property refFileInfo.url is required
     * @return {String} The S7 URL to be used for requesting the referenced image
     * @private
     */
    createFallbackRefUrl: function(refFileInfo) {
        var urlPrefix = "";
        if (this.isImageServerUrl) {
            urlPrefix = "/is/image";
        }
        
        var url = this.urlAppend(urlPrefix + refFileInfo.url, this.buildCropEditSizeModifiers());
        return CQ.HTTP.externalize(url, true);
    },

    /**
     * Overrides the SmartImage's createProcessedImageConfig
     * Creates a configuration object that describes processed image data pointing to S7
     * @param {String} path The S7 path of the original image
     * @return {Object} The configuration object containing the path received as a parameter.
     *          Since the path will point to S7, it should not be altered in any way
     * @private
     */
    createProcessedImageConfig: function(path) {
        if (!path) {
            return null;
        }

        var urlPath = path + this.buildInfoImageUrlParams();

        return {
            "url": urlPath
        };
    },

    buildInfoImageUrlParams: function() {
        var urlParams = "";
        var hasPreset = false;

        if ("" != this.imagePreset) {
            urlParams = this.urlAppend(urlParams,"$" + this.imagePreset + "$");
            hasPreset = true;
        }

        if ("" != this.imageCrop) {
            urlParams = this.urlAppend(urlParams, this.buildCropModifiers());
        }

        if (!hasPreset) {
            if (this.processedWidth > 0) {
                urlParams = this.urlAppend(urlParams, "wid=" + this.processedWidth);
            }

            if (this.processedHeight > 0) {
                urlParams = this.urlAppend(urlParams, "hei=" + this.processedHeight);
            }

            if ("" != this.imageFormat) {
                urlParams = this.urlAppend(urlParams, "fmt=" + this.imageFormat);

                if ("jpeg" == this.imageFormat.toLowerCase()) {
                    urlParams = this.urlAppend(urlParams, "qlt=" + this.jpegQuality + ",1");
                }
            }

            if ("" != this.imageSharpening) {
                if ("unsharpmask" == this.imageSharpening.toLowerCase()) {
                    urlParams = this.urlAppend(urlParams, "op_usm=" + this.umAmount + "," + this.umRadius + "," + this.umThreshold + ",0");
                } else {
                    urlParams = this.urlAppend(urlParams, "op_sharpen=1");
                }
            }
        }

        if ("" != this.urlModifiers) {
            urlParams = this.urlAppend(urlParams, this.urlModifiers);
        }

        return urlParams;
    },

    /**
     * Called in the handleDrop method, before calling the superclass.handleDrop
     * By default it does nothing, it should be extended to perform post-drop needed actions
     */
    s7DropUpdateFormParams: function(component) {

    },

    /**
     * Override handleDrop implementation in SmartFile component
     * @param {Object} dragData Description of the object that has been dropped on the
     *        component
     */
    handleDrop: function(dragData) {
        // handle D&D in the Edit dialog Image tab
        if (dragData && dragData.records) {
            // initialize S7 width and height using the first record
            if (dragData.records.length > 0) {
                var firstRecord = dragData.records[0];

                this.assetType = firstRecord.data.mimeType;

                if (firstRecord.data.mimeType.indexOf("image") < 0) {
                    this.hideMainToolbar = true;
                }
                else {
                    this.hideMainToolbar = false;
                }

                // initialize S7 dimensions, if any
                if (firstRecord.data) {
                    this.initializeDimensions(firstRecord.data);
                }

                // if we have valid dimension, update the advanced tab
                this.s7DropUpdateFormParams.call(this, this);
            }
        }
        return CQ.scene7.S7SmartImage.superclass.handleDrop.call(this, dragData);
    },

    /**
     * Overrides SmartFile's getRefText
     * Returns the text to display in case of file references.
     * Takes into account that refPath points to S7, and uses component's dataPath to get permissions
     * @private
     * @param {String} refPath The reference file path
     * @param {String} pathTxt The text to display instead of the path
     * @return {String} The text
     */
    getRefText: function(refPath, pathTxt) {
        var canEditRef = CQ.User.getCurrentUser().hasPermissionOn("update", this.dataPath);
        var refHref = CQ.HTTP.externalize(CQ.shared.XSS.getXSSValue(refPath, true) + this.buildInfoImageUrlParams());
        var refTxt = CQ.I18n.getMessage("Referenced from:") + " ";
        if (canEditRef) {
            refTxt += "<a href=\"" + refHref + "\" target=\"_blank\" title=\"" +
                CQ.I18n.getMessage("Click here to open referenced file") +
                "\" style=\"cursor:pointer;\">";
        }
        refTxt += CQ.shared.XSS.getXSSValue(pathTxt ? pathTxt : refPath) + this.buildInfoImageUrlParams();
        if (canEditRef) {
            refTxt += "</a>";
        }
        return refTxt;
    },

    /**
     * Overrides the SmartImage's processRecord method
     * @param {CQ.data.SlingRecord} record The record to be processed
     * @param {String} path Base path for resolving relative file paths
     */
    processRecord: function(record, path) {
        // get the S7 image's width and height from the properties
        this.imageHeight = -1;
        this.imageWidth = -1;
        this.processedWidth = -1;
        this.processedHeight = -1;

        // initialize S7 dimensions, if any
        if (record.data) {
            this.initializeDimensions(record.data);
            this.assetType = record.data.assetType;
            this.hideMainToolbar = (this.assetType != "image"); //disable image tools for set asset.
        }

        var fileRef = record.get("./fileReference");
        var isSegmentIdx = fileRef.indexOf("/is/image");
        if (isSegmentIdx == 0) {
            this.isImageServerUrl = true;
            var damFileRef = fileRef.replace(/\/is\/image/g, "");
            record.json["fileReference"] = damFileRef;
            record.data["fileReference"] = damFileRef;
        }
        
        CQ.scene7.S7SmartImage.superclass.processRecord.call(this, record, path);
        
        record.json["fileReference"] = fileRef;
        record.data["fileReference"] = fileRef;
    },

    /**
     * Reloads the images based on the current image parameters
     */
    reloadImages: function() {
        this.processedRefImage = null;
        var processedImageConfig = null;
        this.fireEvent("beforeloadimage", this);
        if (this.referencedFileInfo) {
            this.originalRefImage = new CQ.form.SmartImage.Image({
                "dataPath": this.referencedFileInfo.dataPath,
                "url": this.referencedFileInfo.url,
                "fallbackUrl": this.referencedFileInfo.fallbackUrl
            });
            this.notifyImageLoad(this.originalRefImage);
            processedImageConfig =
                this.createProcessedImageConfig(this.referencedFileInfo.dataPath);
            if (processedImageConfig) {
                this.processedRefImage =
                    new CQ.form.SmartImage.Image(processedImageConfig);
                this.notifyImageLoad(this.processedRefImage);
            }
            this.originalRefImage.load();
            if (processedImageConfig) {
                this.processedRefImage.load();
            }
        }
    },

    /**
     * Overrides the SmartImage's postProcessRecord method
     * @param {CQ.data.SlingRecord} record The record to be processed
     * @param {String} path Base path for resolving relative file paths
     * @private
     */
    postProcessRecord: function(record, path) {
        this.dataRecord = record;
        if (this.originalImage != null) {
            this.fireEvent("statechange", "originalremoved", true);
        }
        this.originalImage = null;
        if (this.processedImage != null) {
            this.fireEvent("statechange", "processedremoved", true);
        }
        this.processedImage = null;
        if (this.originalRefImage != null) {
            this.fireEvent("statechange", "originalremoved", false);
        }
        this.originalRefImage = null;
        if (this.processedRefImage != null) {
            this.fireEvent("statechange", "processedremoved", false);
        }
        this.processedRefImage = null;
        var processedImageConfig = null;
        this.fireEvent("beforeloadimage", this);
        if (this.referencedFileInfo) {
            this.originalRefImage = new CQ.form.SmartImage.Image({
                "dataPath": this.referencedFileInfo.dataPath,
                "url": this.referencedFileInfo.url,
                "fallbackUrl": this.referencedFileInfo.fallbackUrl
            });
            this.notifyImageLoad(this.originalRefImage);
            processedImageConfig =
                this.createProcessedImageConfig(this.referencedFileInfo.dataPath);
            if (processedImageConfig) {
                this.processedRefImage =
                    new CQ.form.SmartImage.Image(processedImageConfig);
                this.notifyImageLoad(this.processedRefImage);
            }
            this.originalRefImage.load();
            if (processedImageConfig) {
                this.processedRefImage.load();
            }
        }
        if (this.fileInfo) {
            // do not support direct image upload
        }
        // tools
        var toolCnt = this.imageToolDefs.length;
        for (var toolIndex = 0; toolIndex < toolCnt; toolIndex++) {
            var tool = this.imageToolDefs[toolIndex];
            tool.processRecord(record);
        }
    },

    urlAppend: function(originalUrl, stuffToAppend) {
        var newUrl = "";
        if (originalUrl != undefined) {
            newUrl = originalUrl;
            if (originalUrl.indexOf("?") >= 0) {
                newUrl += "&";
            } else {
                newUrl += "?";
            }

            // strip leading &
            while(stuffToAppend.indexOf("&") == 0) {
                stuffToAppend = stuffToAppend.substring(1);
            }

            newUrl += stuffToAppend;
        }

        return newUrl;
    },

    buildCropModifiers: function() {
        var cropModifier = "";
        if (this.imageCrop != "") {
            var cropInfo = this.imageCrop.split(",");
            if (cropInfo.length >= 4) {
                var xStart = cropInfo[0];
                var yStart = cropInfo[1];
                var xEnd = cropInfo[2];
                var yEnd = cropInfo[3];
                cropModifier =  "crop=" + xStart + "," + yStart + "," + (xEnd-xStart) + "," + (yEnd-yStart);
            }
        }

        return cropModifier;
    },

    /**
     * Computes the size (width, height) parameters to be appended to the S7 image url when requesting the image from S7 to perform the crop operation
     * To make sure the request does not hit the MaxPix S7 server limitation the image will be scaled down using the cropDefaultDimension value based on the original image size in S7
     * @return {String} containing the S7 size url parameters
     */
    buildCropEditSizeModifiers: function() {

        var urlParamStr = "wid=" + this.cropReqWidth + "&hei=" + this.cropReqHeight;

        return urlParamStr;
    },

    /**
     * Attempts to initialize the S7 dimensions (width and height) based on the given record
     * @param {CQ.data.SlingRecord} record The record to be processed
     * @private
     */
    initializeDimensions: function(recordData) {
        if (recordData) {
            if (recordData.imageWidth) {
                this.imageWidth = recordData.imageWidth;
            }

            if (recordData.imageHeight) {
                this.imageHeight = recordData.imageHeight;
            }

            // if manual overrides set for width and height, use those ones
            if (recordData.width) {
                this.processedWidth = recordData.width;
            } else {
                this.processedWidth = -1;
            }

            if (recordData.height) {
                this.processedHeight = recordData.height;
            } else {
                this.processedHeight = -1;
            }

            if (recordData.imageCrop) {
                this.imageCrop = recordData.imageCrop;
            } else {
                this.imageCrop = "";
            }

            if (recordData.s7ImagePreset) {
                this.imagePreset = recordData.s7ImagePreset;
            } else {
                this.imagePreset = "";
            }

            if (recordData.outputFormat) {
                this.imageFormat = recordData.outputFormat;
            } else {
                this.imageFormat = "";
            }

            if (recordData.jpegQuality &&
                !isNaN(recordData.jpegQuality)) {
                this.jpegQuality = recordData.jpegQuality;
            } else {
                this.jpegQuality = 85;
            }

            if (recordData.sharpeningMode) {
                this.imageSharpening = recordData.sharpeningMode;
            } else {
                this.imageSharpening = "";
            }

            if (recordData.unsharpMaskAmount &&
                !isNaN(recordData.unsharpMaskAmount)) {
                this.umAmount = recordData.unsharpMaskAmount;
            } else {
                this.umAmount = 0;
            }

            if (recordData.unsharpMaskRadius
                && !isNaN(recordData.unsharpMaskRadius)) {
                this.umRadius = recordData.unsharpMaskRadius;
            } else {
                this.umRadius = 0;
            }

            if (recordData.unsharpMaskThreshold
                && !isNaN(recordData.unsharpMaskThreshold)) {
                this.umThreshold = recordData.unsharpMaskThreshold;
            } else {
                this.umThreshold = 0;
            }

            if (recordData.urlModifiers) {
                this.urlModifiers = recordData.urlModifiers;
            } else {
                this.urlModifiers = "";
            }
        }

        // compute the crop dimensions - used in the crop edit tool based on the original image dimensions
        this.computeCropDimensions();
    },

    /**
     * Computes the crop dimensions based on the actual S7 image size
     */
    computeCropDimensions: function() {
        var scaleFactor = 1;
        this.cropReqWidth = this.cropDefaultDimension;
        this.cropReqHeight = this.cropDefaultDimension;
        if (this.imageHeight > this.imageWidth) {
            scaleFactor = this.imageWidth / this.imageHeight;
            this.cropReqWidth = scaleFactor * this.cropDefaultDimension;
        } else {
            scaleFactor = this.imageHeight / this.imageWidth;
            this.cropReqHeight = scaleFactor * this.cropDefaultDimension;
        }

        this.cropReqWidth = this.cropReqWidth.toFixed(0);
        this.cropReqHeight = this.cropReqHeight.toFixed(0);
    }
});

// register xtype
CQ.Ext.reg('s7html5smartimage', CQ.scene7.S7SmartImage);

CQ.scene7 = CQ.scene7 || {};
CQ.scene7.dynamicImageHelper = {};

/**
 * Mark a flag if the unsharp mask fields need to be disabled after submitting the empty values
 */
CQ.scene7.dynamicImageHelper.reDisableUnsharpMaskFieldsAfterSubmission = false;

/**
 * Enables the size, image format and sharpening fields before submit if an image preset is selected
 *  so their empty values would get submitted
 *
 */
CQ.scene7.dynamicImageHelper.enableFieldsForSubmission = function(dialog) {
    if (!dialog) {
        return;
    }

    // always submit the unsharp values and breakpoints
    var fieldNames = ["./unsharpMaskAmount", "./unsharpMaskRadius", "./unsharpMaskThreshold", "./breakpoints"];

    // if an image preset is selected, enable the fields so they'll get submitted
    var selectedImagePreset = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", "./s7ImagePreset");
    if (selectedImagePreset && "" != selectedImagePreset.getValue()) {
        fieldNames.push("./width");
        fieldNames.push("./height");
        fieldNames.push("./outputFormat");
        fieldNames.push("./sharpeningMode");
    }

    for (var fieldNameIdx = 0 ; fieldNameIdx < fieldNames.length ; fieldNameIdx++) {
        var field = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", fieldNames[fieldNameIdx]);
        if (field) {

            if (fieldNames[fieldNameIdx] == "./unsharpMaskAmount" && field.disabled) {
                CQ.scene7.dynamicImageHelper.reDisableUnsharpMaskFieldsAfterSubmission = true;
            }

            field.setDisabled(false);
        }
    }
};

/**
 * Disables the size, image format and sharpening fields after submission if an image preset is selected
 */
CQ.scene7.dynamicImageHelper.disableFieldsAfterSubmission = function(dialog) {
    var selectedImagePreset = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", "./s7ImagePreset");
    if (selectedImagePreset && "" != selectedImagePreset.getValue()) {
        CQ.scene7.dynamicImageHelper.updatePresetPrecedence(dialog, selectedImagePreset.getValue());
    }

    // re-disable unsharp mask fields, if needed
    if (CQ.scene7.dynamicImageHelper.reDisableUnsharpMaskFieldsAfterSubmission) {
        CQ.scene7.dynamicImageHelper.reDisableUnsharpMaskFieldsAfterSubmission = false;

        var unsharpMaskFieldNames = ["./unsharpMaskAmount", "./unsharpMaskRadius", "./unsharpMaskThreshold"];
        for (var fieldNameIdx = 0 ; fieldNameIdx < unsharpMaskFieldNames.length ; fieldNameIdx++) {
            var field = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", unsharpMaskFieldNames[fieldNameIdx]);
            if (field) {
                field.setDisabled(true);
            }
        }
    }
};

/**
 * Handler for the "beforesubmit" event of the component edit dialog
 */
CQ.scene7.dynamicImageHelper.beforeDialogSubmit = function(dialog) {

    if (!dialog) {
        return;
    }

    // check the success and failure handlers
    var oldSuccessHandler = dialog.success;
    var oldFailureHandler = dialog.failure;

    if (typeof dialog.dynamicImageHandlers == "undefined") {
        // update handlers
        dialog.success = function(form, dialogResponse) {
            // disable the fields if needed
            CQ.scene7.dynamicImageHelper.disableFieldsAfterSubmission(dialog);

            // call old handler
            if (oldSuccessHandler) {
                oldSuccessHandler.call(this, form, dialogResponse);
            } else if (dialog.responseScope && dialog.responseScope.success) {
                dialog.responseScope.success.call(this, form, dialogResponse);
            }
        };

        dialog.failure = function(form, dialogResponse) {
            // disable the fields if needed
            CQ.scene7.dynamicImageHelper.disableFieldsAfterSubmission(dialog);

            // call old handler
            if (oldFailureHandler) {
                oldFailureHandler.call(this, form, dialogResponse);
            } else if (dialog.responseScope && dialog.responseScope.failure) {
                dialog.responseScope.failure.call(this, form, dialogResponse);
            }
        };

        dialog.dynamicImageHandlers = true;
    }

    // enable the fields
    CQ.scene7.dynamicImageHelper.enableFieldsForSubmission(dialog);
};

/**
 * Construct a config object based on the current field values in the edit dialog
 */
CQ.scene7.dynamicImageHelper.getImageConfig = function(component) {
    var tabPanel = component.findParentByType("tabpanel");
    var imgConfig = {};
    if (tabPanel) {
        var configMapArray = [
            {
                componentName: "./width",
                objectKey: "width"
            },
            {
                componentName: "./height",
                objectKey: "height"
            },
            {
                componentName: "./s7ImagePreset",
                objectKey: "s7ImagePreset"
            },
            {
                componentName: "./outputFormat",
                objectKey: "outputFormat"
            },
            {
                componentName: "./jpegQuality",
                objectKey: "jpegQuality"
            },
            {
                componentName: "./sharpeningMode",
                objectKey: "sharpeningMode"
            },
            {
                componentName: "./unsharpMaskAmount",
                objectKey: "unsharpMaskAmount"
            },
            {
                componentName: "./unsharpMaskRadius",
                objectKey: "unsharpMaskRadius"
            },
            {
                componentName: "./unsharpMaskThreshold",
                objectKey: "unsharpMaskThreshold"
            },
            {
                componentName: "./urlModifiers",
                objectKey: "urlModifiers"
            },
            {
                componentName: "./breakpoints",
                objectKey: "breakpoints"
            }
        ];

        for (var idx = 0 ; idx < configMapArray.length ; idx ++) {
            var componentSearchResult = tabPanel.find("name", configMapArray[idx].componentName);
            if (componentSearchResult && componentSearchResult.length > 0) {
                imgConfig[configMapArray[idx].objectKey] = componentSearchResult[0].getValue();
            }
        }
    }

    return imgConfig;
};

CQ.scene7.dynamicImageHelper.s7DropUpdateFormParams = function(comp) {
    // if we have valid dimension, update the advanced tab
    var tabPanel = comp.findParentByType("tabpanel");
    if (tabPanel) {
        var advancedTabSearch = tabPanel.find("title", "Advanced");
        var advancedTab = undefined;
        if (advancedTabSearch && advancedTabSearch.length > 0) {
            advancedTab = advancedTabSearch[0];
        }
        if (advancedTab) {
            var imageWidthFormField = CQ.scene7.dynamicImageHelper.getChildBy(advancedTab, "name", "./imageWidth");
            if (imageWidthFormField && comp.imageWidth > 0) {
                imageWidthFormField.setValue(comp.imageWidth);
            }

            var imageHeightFormField = CQ.scene7.dynamicImageHelper.getChildBy(advancedTab, "name", "./imageHeight");
            if (imageHeightFormField && comp.imageHeight > 0) {
                imageHeightFormField.setValue(comp.imageHeight);
            }
        }
        //hide image preset when set is dropped into component
        var s7SettingTabSearch = tabPanel.find("title", "Scene7 Settings");
        var s7SettingTab = undefined;
        if (s7SettingTabSearch && s7SettingTabSearch.length > 0) {
            s7SettingTab = s7SettingTabSearch[0];
        }
        if (s7SettingTab) {
            var imagePreset = CQ.scene7.dynamicImageHelper.getChildBy(s7SettingTab, "name", "imagePresetsHbox");
            if (comp.assetType.indexOf("image") == 0) {
                imagePreset.show();
            }
            else {
                imagePreset.hide();
            }
        }
    }
};

/**
 * Loads the SPS image presets for a given S7 config and updates the image presets combo with the new values
 * @param {String} s7ConfigPath - the Scene7 configuration for which the presets need to be fetched
 * @param {String} currentImagePreset - the selected image preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the image preset combo that will be updated with the preset values
 *
 */
CQ.scene7.dynamicImageHelper.loadImagePresets = function(s7ConfigPath, currentImagePreset, presetSelectWidget) {

    if (!s7ConfigPath
        || !presetSelectWidget) {
        return;
    }

    CQ.scene7.dynamicImageHelper.populateImagePresets(s7ConfigPath + "/jcr:content.imagepresets.json",
        currentImagePreset, presetSelectWidget, "presetName");
};

/**
 * Loads image presets from DAM and updates the image presets combo with the new values
 * @param {String} currentImagePreset - the selected image preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the image preset combo that will be updated with the preset values
 */
CQ.scene7.dynamicImageHelper.loadDAMImagePresets = function(currentImagePreset, presetSelectWidget) {
    if (!presetSelectWidget) {
        return;
    }

    CQ.scene7.dynamicImageHelper.populateImagePresets("/etc/dam/imageserver/macros.children.2.json?props=id",
        currentImagePreset, presetSelectWidget, "id");
};

/**
 * Populates the image presets select widget using a given endpoint to load the selection items
 * @param {String} presetsEndpoint - URL where to load the presets from
 * @param {String} currentImagePreset - the selected image preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the image preset combo that will be updated with the preset values
 * @param {String} presetNameJSONKey - key containing the name of the preset to be found in the returned JSON
 */
CQ.scene7.dynamicImageHelper.populateImagePresets = function(presetsEndpoint, currentImagePreset, presetSelectWidget, presetNameJSONKey) {
    // do a hit to load the presets
    CQ.HTTP.get(presetsEndpoint, function(options, success, xhr, response) {
        var newPresetOptions = [{
            text: 'None',
            value: ''}];

        if (success) {
            var jsonResponse = JSON.parse(xhr.responseText);
            if (jsonResponse && jsonResponse.length) {
                for (var imgPresetIdx = 0 ; imgPresetIdx < jsonResponse.length ; imgPresetIdx++) {
                    var imgPresetJson = jsonResponse[imgPresetIdx];
                    if (imgPresetJson[presetNameJSONKey]) {
                        newPresetOptions.push({
                            text: imgPresetJson[presetNameJSONKey],
                            value: imgPresetJson[presetNameJSONKey]});
                    }
                }
            }
        }

        presetSelectWidget.setOptions(newPresetOptions);

        if (currentImagePreset) {
            presetSelectWidget.setValue(currentImagePreset);
        }
    });
};


/**
 * Loads viewer presets from DAM and updates the viewer presets combo with the new values
 * @param {String} currentViewerPreset - the selected viewer preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the viewer preset combo that will be updated with the preset values
 * @param {String} assetType - current asset type to filter preset
 */
CQ.scene7.dynamicImageHelper.loadDAMViewerPresets = function(currentViewerPreset, presetSelectWidget, assetType) {
    if (!presetSelectWidget) {
        return;
    }

    CQ.scene7.dynamicImageHelper.populateViewerPresets("/etc/dam/presets/viewer.children.2.json?include=isactive,true",
        currentViewerPreset, presetSelectWidget, "id", "uri", assetType);
};


/**
 * Populates the viewer presets select widget using a given endpoint to load the selection items
 * @param {String} presetsEndpoint - URL where to load the presets from
 * @param {String} currentViewerPresetValue - the selected viewer preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the image preset combo that will be updated with the preset values
 * @param {String} presetNameJSONKey - key containing the name of the preset to be found in the returned JSON
 * @param {String} presetPathJSONKey - key containing the uri of the preset to be found in the returned JSON
 * @param {String} assetType - asset type to be used to filter the viewer preset list
 */
CQ.scene7.dynamicImageHelper.populateViewerPresets = function( presetsEndpoint,
                                                               currentViewerPresetValue,
                                                               presetSelectWidget,
                                                               presetNameJSONKey,
                                                               presetPathJSONKey,
                                                               assetType ) {
    presetSelectWidget.presetData = [];
    // Load the viewer presets
    CQ.HTTP.get(presetsEndpoint, function(options, success, xhr, response) {
        var newPresetOptions = [{
            text: 'None',
            value: ''}];
        if (success) {
            var jsonResponse = JSON.parse(xhr.responseText);
            if (jsonResponse && jsonResponse.length ) {
                for (var viewerPresetIdx = 0 ; viewerPresetIdx < jsonResponse.length ; viewerPresetIdx++) {
                    var viewerPresetItem = jsonResponse[viewerPresetIdx];
                    if (viewerPresetItem[presetNameJSONKey]) {
                        // For value, we use id|category.
                        // Since we don't allow | as viewer preset name, | can be safely used as a delimiter
                        var viewerPresetCat = viewerPresetItem['jcr:content']['category']
                        viewerPresetCat = viewerPresetCat.toLowerCase();
                        if ( viewerPresetCat !== 'image_set' ) {
                            viewerPresetCat = viewerPresetCat.replace('_set', '');
                        }
                        viewerPresetCat = viewerPresetCat.replace('_', '');
                        var presetFullValue = viewerPresetItem[presetNameJSONKey]
                            + '|' + viewerPresetCat
                            + '|' + viewerPresetItem[presetPathJSONKey];
                        presetSelectWidget.presetData.push({
                            text: viewerPresetItem[presetNameJSONKey],
                            value: presetFullValue,
                            assetType: viewerPresetCat });
                    }
                }
            }
        }

        CQ.scene7.dynamicImageHelper.renderViewerPreset(currentViewerPresetValue, presetSelectWidget, assetType);
    });
};

/**
 * Render viewer presets
 * @param {String} currentViewerPreset - the selected viewer preset for this dynamic image
 * @param {CQ.form.Selection} presetSelectWidget - the viewer preset combo that will be updated with the preset values
 * @param {String} assetType - current asset type to filter preset
 */
CQ.scene7.dynamicImageHelper.renderViewerPreset = function (currentViewerPresetValue, presetSelectWidget, assetType) {

    var newPresetOptions = [{
        text: 'None',
        value: ''}];
    var presetData = presetSelectWidget.presetData;
    if ( assetType === 'zoom' ) {
        assetType = 'imageset';
    }
    for (var viewerPresetIdx = 0 ; viewerPresetIdx < presetData.length ; viewerPresetIdx++) {
        var presetItem = presetData[viewerPresetIdx];
        if ( ( ( assetType === 'image' || assetType === '' ) &&
            ( presetItem.assetType === 'zoom' || presetItem.assetType === 'flyoutzoom' ) ) ||
            ( assetType === presetItem.assetType ) ) {
            newPresetOptions.push({
                text: presetItem.text,
                value: presetItem.value});
        }
    }

    presetSelectWidget.setOptions(newPresetOptions);

    if (currentViewerPresetValue) {
        presetSelectWidget.setValue(currentViewerPresetValue);
    }
}


/**
 * Selection change handler for the dynamic image output format field
 */
CQ.scene7.dynamicImageHelper.outputFormatSelectionChange = function(selectWidget, value, isChecked) {

    if (!selectWidget) {
        return;
    }

    // search for the container panel
    var parentPanel = selectWidget.findParentByType("panel");

    if(parentPanel) {
        // call the enable/disable jpeg quality method
        CQ.scene7.dynamicImageHelper.enableDisableJpegQuality(parentPanel, "jpeg" == value);
    }
};

/**
 * Selection change handler for the sharpening mode selector
 */
CQ.scene7.dynamicImageHelper.sharpeningModeSelectionChange = function(selectWidget, value, isChecked) {
    if (!selectWidget) {
        return;
    }

    // search for the container panel
    var parentPanel = selectWidget.findParentByType("panel");

    // update unsharp masking selectors status
    CQ.scene7.dynamicImageHelper.enableDisableUnsharpMask(parentPanel, ("unsharpMask" == value));

};

/**
 * Enable or disable the unsharp mask selectors based on the received boolean parameter
 * @parma tabPanel {CQ.Ext.Panel}
 *          panel widget under which unsharp mask sliders will be searched
 * @param {Boolean} enabled
 *          flag indicating if the sliders need to be enabled or not
 */
CQ.scene7.dynamicImageHelper.enableDisableUnsharpMask = function(tabPanel, enabled) {
    if (tabPanel) {

        var sharpeningModeFields = tabPanel.find("name", "./sharpeningMode");
        var selectedSharpeningMode = "";
        if (sharpeningModeFields && sharpeningModeFields.length > 0) {
            var sharpeningModeSelectWidget = sharpeningModeFields[0];
            selectedSharpeningMode = sharpeningModeSelectWidget.getValue();
        }

        enabled = enabled && "unsharpMask" == selectedSharpeningMode;

        var amountField = CQ.scene7.dynamicImageHelper.getChildBy(tabPanel, "name", "./unsharpMaskAmount");
        if (amountField) {
            // update amount slider widget state
            if (!enabled) {
                amountField.setValue(0);
            }
            CQ.scene7.dynamicImageHelper.updateSlider(amountField, !enabled, true);
        }

        var radiusField = CQ.scene7.dynamicImageHelper.getChildBy(tabPanel, "name", "./unsharpMaskRadius");
        if (radiusField) {
            // update radius slider widget state
            if (!enabled) {
                radiusField.setValue(0);
            }
            CQ.scene7.dynamicImageHelper.updateSlider(radiusField, !enabled, true);
        }

        var thresholdField = CQ.scene7.dynamicImageHelper.getChildBy(tabPanel, "name", "./unsharpMaskThreshold");
        if (thresholdField) {
            // update threshold slider widget state
            if (!enabled) {
                thresholdField.setValue(0);
            }
            CQ.scene7.dynamicImageHelper.updateSlider(thresholdField, !enabled, true);
        }
    }
};

/**
 *
 * Enables or disables the jpeg quality field, based on the value of the received boolean
 * @parma tabPanel {CQ.Ext.Panel}
 *          panel widget under which the jpeg quality will be searched
 * @param {Boolean} jpegQualityEnabled
 *          if true the field will be enabled, if false it will be disabled
 */
CQ.scene7.dynamicImageHelper.enableDisableJpegQuality = function(tabPanel, jpegQualityEnabled) {

    if (!tabPanel) {
        return;
    }

    // enable or disable the jpeg quality field based on the selected format
    var outputFormatFieldsSearchResults = tabPanel.find("name", "./outputFormat");
    var selectedFormat = "";
    if (outputFormatFieldsSearchResults && outputFormatFieldsSearchResults.length > 0) {
        var outputFormatWidget = outputFormatFieldsSearchResults[0];
        selectedFormat = outputFormatWidget.getValue();
    }

    jpegQualityEnabled = jpegQualityEnabled && "jpeg" == selectedFormat;

    var jpegQualityFields = tabPanel.find("name", "./jpegQuality");

    if (jpegQualityFields && jpegQualityFields.length > 0) {
        var jpegQualityWidget = jpegQualityFields[0];

        // update slider widget state
        CQ.scene7.dynamicImageHelper.updateSlider(jpegQualityWidget, !jpegQualityEnabled, true);
    }
};

/**
 *
 * Enables or disables the viewer preset dropdown, based on the value of the received boolean
 * @parma tabPanel {CQ.Ext.Panel}
 *          panel widget under which the viewer preset dropdown will be searched
 * @param {Boolean} viewerPresetEnabled
 *          if true the field will be enabled, if false it will be disabled
 */
CQ.scene7.dynamicImageHelper.enableDisableViewerPreset = function(tabPanel, viewerPresetEnabled) {

    if (!tabPanel) {
        return;
    }

    var viewerPresetCombo = tabPanel.find("name", "viewerPresetCombo");
    if (viewerPresetCombo && viewerPresetCombo.length > 0) {
        if (viewerPresetEnabled) {
            viewerPresetCombo[0].enable();
        }
        else {
            viewerPresetCombo[0].disable();
        }
    }
}

/**
 *
 * Enables or disables the image preset dropdown, based on the value of the received boolean
 * @parma tabPanel {CQ.Ext.Panel}
 *          panel widget under which the image preset dropdown will be searched
 * @param {Boolean} imagePresetEnabled
 *          if true the field will be enabled, if false it will be disabled
 */
CQ.scene7.dynamicImageHelper.enableDisableImagePreset = function(tabPanel, imagePresetEnabled) {

    if (!tabPanel) {
        return;
    }

    var imagePresetCombo = tabPanel.find("name", "imagePresetCombo");
    if (imagePresetCombo && imagePresetCombo.length > 0) {
        if (imagePresetEnabled) {
            imagePresetCombo[0].enable();
        }
        else {
            imagePresetCombo[0].disable();
        }
    }
}


/**
 * Helper method to update the state of a {CQ.Ext.form.SliderField} widget
 * @param {CQ.Ext.form.SliderField} sliderWidget - the slider
 * @param {Boolean} disabled - boolean indicating if the slider needs to be disabled or not
 * @param {Boolean} updateValue - boolean indicating if the underlying slider will need to be updated (the thumb does not always reflect the current value...)
 */
CQ.scene7.dynamicImageHelper.updateSlider = function(sliderWidget, disabled, updateValue) {
    if (!sliderWidget) {
        return;
    }

    // update disabled state
    sliderWidget.setDisabled(disabled);

    var slider = sliderWidget.slider;
    if (slider && updateValue == true) {
        // update the slider thumb
        var currentValue = sliderWidget.getValue();
        slider.setValue(currentValue, false);
        slider.moveThumb(0, slider.translateValue(currentValue), false);
    }
};

/**
 * Searches a parent component for a child having a given property name and value
 * @param {CQ.Ext.Container} parent - container component under which the search will be performed
 * @param {String} childSearchPropName - property name what will be searched in the children
 * @param {String} childSearchPropValue - property value that will be searched in the children
 * @return {CQ.Ext.Component} the first child component that has childSearchPropName = childSearchPropValue or undefined if no match is found
 */
CQ.scene7.dynamicImageHelper.getChildBy = function(parent, childSearchPropName, childSearchPropValue) {
    if (parent && parent.find) {
        var childSearchResultArray = parent.find(childSearchPropName, childSearchPropValue);

        if (childSearchResultArray && childSearchResultArray.length > 0) {
            return childSearchResultArray[0];
        }
    }

    return undefined;
};

/**
 * Updates the values and states for the size, image format and image sharpness based on wether a preset is selected or not
 * Preset has precedence, so if one is selected the size, format and sharpness are disabled
 */
CQ.scene7.dynamicImageHelper.updatePresetPrecedence = function(dialog, selectedPreset) {
    var disableFields = "" != selectedPreset;

    if (dialog) {

        var fieldNames = ["./width", "./height", "./outputFormat", "./sharpeningMode"];
        for (var fieldNameIdx = 0 ; fieldNameIdx < fieldNames.length ; fieldNameIdx++) {
            var field = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", fieldNames[fieldNameIdx]);
            if (field) {
                if (disableFields) {
                    field.setValue("");
                }
                field.setDisabled(disableFields);
            }
        }
    }
};

CQ.scene7.dynamicImageHelper.activateAdvancedTab = function(panel) {
    var dialog = panel.findParentByType("dialog");
    if (dialog) {
        var selectedImagePreset = CQ.scene7.dynamicImageHelper.getChildBy(dialog, "name", "./s7ImagePreset");
        if (selectedImagePreset) {
            CQ.scene7.dynamicImageHelper.updatePresetPrecedence(dialog, selectedImagePreset.getValue());
        }
    }
};

/**
 * Initializes the image presets taking into account the status of Dynamic Media
 * @param imagePresetsPanel - the panel holding the image presets settings
 * @param {CQ.form.Selection} presetSelectWidget - the image preset combo that will be updated with the preset values
 * @param {String} currentImagePreset - the selected image preset for this dynamic image
 * @param {Boolean} dynamicMediaMode - wether the component is in DM mode or not
 */
CQ.scene7.dynamicImageHelper.initImagePresetsPanel = function(imagePresetsPanel, presetSelectWidget, selectedImagePreset, dynamicMediaMode) {
    // check if Dynamic Media is enabled
    if (dynamicMediaMode) {
        // use DAM to get the presets
        if (CQ.S7
            && CQ.S7.isDynamicMediaEnabled()) {
            CQ.scene7.dynamicImageHelper.loadDAMImagePresets(selectedImagePreset, presetSelectWidget);
        }
    } else {
        // use S7 Saas config to get the presets
        // also add the S7 cloud config selection combo, the presets are fetched based on that config
        var s7CloudConfigCombo = new CQ.cloudservices.Scene7CloudConfigurationCombo({
            "fieldLabel": CQ.I18n.getMessage("Scene7 Configuration"),
            "fieldDescription": CQ.I18n.getMessage("Scene7 Configuration used to fetch the active image presets from SPS"),
            "rootPath": "/etc/cloudservices/scene7",
            "name": "S7ImpTemplateConfigSelector",
            "selectFirst": true,
            "clearEnabled": false,
            "valueNotFoundText": CQ.I18n.getMessage("None"),
            "width": 200,
            "tpl":new CQ.Ext.XTemplate(
                '<tpl for=".">',
                '<div class="workflow-model-item x-combo-list-item">',
                '<div class="workflow-model-title">{title:this.formatStr}</div>',
                '<div style="clear:both"></div>',
                '</div>',
                '</tpl>',
                '<div style="height:5px;overflow:hidden"></div>',
                {
                    formatStr:function(v) {
                        return (v!== null) ? v : "";
                    }
                }
            ),
            "listeners": {
                select: function (combo, record, index ) {
                    var selectedConfig = combo.getValue();

                    CQ.scene7.dynamicImageHelper.loadImagePresets(selectedConfig, selectedImagePreset, presetSelectWidget);
                },
                change: function(store, newValue, oldValue ) {
                    CQ.scene7.dynamicImageHelper.loadImagePresets(newValue, selectedImagePreset, presetSelectWidget);
                }
            }
        });

        imagePresetsPanel.add(s7CloudConfigCombo);
    }
};

/**
 * Initializes the viewer presets taking into account the status of Dynamic Media
 * @param viewerPresetsPanel - the panel holding the image presets settings
 * @param {CQ.form.Selection} presetSelectWidget - the viewer preset combo that will be updated with the preset values
 * @param {String} selectedViewerPreset - the selected viewer preset for this dynamic image
 * @param {String} assetType - current asset type
 */
CQ.scene7.dynamicImageHelper.initViewerPresetsPanel = function(viewerPresetsPanel, presetSelectWidget, selectedViewerPreset, assetType) {
    // check if Dynamic Media is enabled
    if (CQ.S7
        && CQ.S7.isDynamicMediaEnabled()) {
        // use DAM to get the presets
        CQ.scene7.dynamicImageHelper.loadDAMViewerPresets(selectedViewerPreset, presetSelectWidget, assetType);
    }
    else {
        //No viewer preset for non-DAM for now
        viewerPresetsPanel.hide();
    }
};

CQ.scene7.dynamicImageHelper.initS7ImagePanel = function(panel, dynamicMediaMode) {
    var imagePresetsPanel = panel.find("name", "imagePresetsHbox");
    var viewerPresetsPanel = panel.find("name", "viewerPresetsHbox");
    var enableViewerPresets = dynamicMediaMode;
    var tabpanel = panel.findParentByType("tabpanel");
    if ( tabpanel ) {
        tabpanel = panel.findParentByType("dialog");
    }
    var assetTypePanel = panel.find("name", "./assetType");
    var assetType = "";
    if (assetTypePanel && assetTypePanel.length > 0) {
        assetType = assetTypePanel[0].getValue();
    }

    var selectedImagePreset = "",
        selectedViewerPreset = "";
    if (imagePresetsPanel && imagePresetsPanel.length > 0) {

        imagePresetsPanel = imagePresetsPanel[0];
        imagePresetsPanel.removeAll();

        var selectedImagePresetArray = panel.find("name", "./s7ImagePreset");
        if (selectedImagePresetArray && selectedImagePresetArray.length > 0) {
            selectedImagePreset = selectedImagePresetArray[0].getValue();
        }

        var presetSelectWidget = new CQ.form.Selection({
            type: 'select',
            name: 'imagePresetCombo',
            fieldLabel: CQ.I18n.getMessage('Image Preset'),
            fieldDescription: CQ.I18n.getMessage("Image Preset to use when rendering image. It cannot be set when viewer preset is set."),
            defaultValue: selectedImagePreset,
            listeners: {
                selectionchanged : function(select, value, isChecked ) {
                    if (selectedImagePresetArray && selectedImagePresetArray.length > 0) {
                        selectedImagePresetArray[0].setValue(value);

                        // disable size, image format and sharpness selectors
                        CQ.scene7.dynamicImageHelper.updatePresetPrecedence(tabpanel, value);

                        CQ.scene7.dynamicImageHelper.enableDisableJpegQuality(panel, "" == value);
                        CQ.scene7.dynamicImageHelper.enableDisableUnsharpMask(panel, "" == value);
                        //disable viewer preset when image preset is set
                        CQ.scene7.dynamicImageHelper.enableDisableViewerPreset(panel, "" == value);
                    }

                }
            },
            options: [
                { text: 'None', value: ''},
            ]
        });

        CQ.scene7.dynamicImageHelper.initImagePresetsPanel(imagePresetsPanel, presetSelectWidget, selectedImagePreset, dynamicMediaMode);
        imagePresetsPanel.add(presetSelectWidget);
    }

    if (viewerPresetsPanel && viewerPresetsPanel.length > 0) {
        viewerPresetsPanel = viewerPresetsPanel[0];
        if (!enableViewerPresets) {
            viewerPresetsPanel.hide();
        }
        viewerPresetsPanel.removeAll();

        var selectedViewerPresetArray = panel.find("name", "./s7ViewerPreset");
        var breakpointField = CQ.scene7.dynamicImageHelper.getChildBy(panel, "name", "./breakpoints");
        if (selectedViewerPresetArray && selectedViewerPresetArray.length > 0) {
            selectedViewerPreset = selectedViewerPresetArray[0].getValue();
            breakpointField.setDisabled( selectedViewerPresetArray[0].getValue() !== '');
        }

        var viewerPresetSelectWidget = new CQ.form.Selection({
            type: 'select',
            name: 'viewerPresetCombo',
            fieldLabel: CQ.I18n.getMessage('Viewer Preset'),
            fieldDescription: CQ.I18n.getMessage("Viewer Preset to use when rendering dynamic image. It cannot be set when image preset is set."),
            defaultValue: selectedViewerPreset,
            listeners: {
                selectionchanged : function(select, value, isChecked ) {
                    if (selectedViewerPresetArray && selectedViewerPresetArray.length > 0) {
                        selectedViewerPresetArray[0].setValue(value);
                        //disable image preset when viewer preset is set.
                        CQ.scene7.dynamicImageHelper.enableDisableImagePreset(panel, "" == value);
                    }
                    breakpointField.setDisabled(value !== '');
                    breakpointField.setValue('');
                }
            },
            options: [
                { text: 'None', value: ''},
            ]
        });

        CQ.scene7.dynamicImageHelper.initViewerPresetsPanel( viewerPresetsPanel,
            viewerPresetSelectWidget,
            selectedViewerPreset,
            assetType);
        viewerPresetsPanel.add(viewerPresetSelectWidget);
    }

    //enable/disable viewer/image preset depending on state of the other.
    CQ.scene7.dynamicImageHelper.enableDisableViewerPreset(panel, "" == selectedImagePreset);
    CQ.scene7.dynamicImageHelper.enableDisableImagePreset(panel, "" == selectedViewerPreset);

    // enable or disable the jpeg quality field based on the selected format
    CQ.scene7.dynamicImageHelper.enableDisableJpegQuality(panel, "" == selectedImagePreset);

    // update unsharp mask slider fields based on the selected sharpening option
    CQ.scene7.dynamicImageHelper.enableDisableUnsharpMask(panel, "" == selectedImagePreset);

    // update fields based on selected preset
    CQ.scene7.dynamicImageHelper.updatePresetPrecedence(tabpanel, selectedImagePreset);

    panel.doLayout();
};

/**
 * Reset the tab panel to first tab so subsequent activate will be called when user
 * clicks on dynamic media settings tab to refresh viewer preset
 * @param dialog
 */
CQ.scene7.dynamicImageHelper.resetTab = function(dialog) {
    var tabPanel = dialog.findByType('tabpanel');
    if( tabPanel && tabPanel.length > 0 ) {
        tabPanel[0].setActiveTab(0);
    }
};
