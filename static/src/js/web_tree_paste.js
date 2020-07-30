/* Copyright 2020 Pafnow */

odoo.define('web_tree_paste', function (require) {
    "use strict";

    const CrashManager = require('web.CrashManager');
    const ErrorDialog = CrashManager.ErrorDialog;

    var core = require('web.core');
    var ListController = require('web.ListController');
    var _t = core._t;

    var ErrorDialogTreePaste = ErrorDialog.extend({
        xmlDependencies: (ErrorDialog.prototype.xmlDependencies || []).concat(
            ['/web_tree_paste/static/src/xml/web_tree_paste_error_dialog.xml']
        ),
        template: "CrashManager.WebTreePasteError",
        init: function(parent, options, error) {
            this._super(parent, options, error);
            var $clipboardBtn;
            var clipboard;
            var dialog = this;
            dialog.opened(function() {
                dialog.$(".o_error_detail").on("shown.bs.collapse", function(e) {
                    e.target.scrollTop = e.target.scrollHeight;
                });
                $clipboardBtn = dialog.$(".o_clipboard_button");
                $clipboardBtn.tooltip({
                    title: _t("Copied !"),
                    trigger: "manual",
                    placement: "left"
                });
                clipboard = new window.ClipboardJS($clipboardBtn[0],{
                    text: function() {
                        return (error.message + "\n\n" + error.traceback).trim();
                    },
                    container: dialog.el,
                });
                clipboard.on("success", function(e) {
                    _.defer(function() {
                        $clipboardBtn.tooltip("show");
                        _.delay(function() {
                            $clipboardBtn.tooltip("hide");
                        }, 800);
                    });
                });
            });
            dialog.on("closed", this, function() {
                $clipboardBtn.tooltip('dispose');
                clipboard.destroy();
            });
        },
    });

    ListController.include({
        renderButtons: function($node) {
            this._super.apply(this, arguments);
            if (this.$buttons === undefined) {
                return;
            }
            this.btn_tree_paste = $('<button type="button" class="btn btn-secondary fa fa-clipboard btn_tree_paste" title="Paste from Excel"></button>');
            this.btn_tree_paste.appendTo(this.$buttons);

            this.$buttons.on('mouseup', '.btn_tree_paste', this._onMouseup.bind(this));
        },
        _onMouseup: function() {
            var self = this;
            var logString = "";
            var inputArray = ["Item1\tName1", "Item2\tName2", "Item3\tName3"];
            //TODO: Get array from clipboard

            //TODO: Disable buttons

            this.renderer.unselectRow().then(function() {
                Promise.all(inputArray.map(function(inputLine) {
                    var recordID;
                    return self.model.addDefaultRecord(self.handle, {
                        position: self.editable,
                    }).then(function(r) {
                        recordID = r;
                        self.model.applyDefaultValues(recordID, {"code": "Test2"+inputLine, "name": "Damien"+inputLine})
                        return self.model.save(recordID)
                    }).then(function(a) {

                        }, function(e) {
                            e.event.preventDefault();
                            logString += "\n" + inputLine + "\t" + e.message.data.arguments.join("\t").trim();
                            self.model.removeLine(recordID);
                            //self.model.discardChanges(recordID);
                            //return e
                    })
                })).then(function() {
                    var err = {message: _t("Some lines raised an error when trying to paste in this list."), traceback: logString.trim()};
                    var dialog = new ErrorDialogTreePaste(this,{
                        title: _t("Copy/Paste Errors"),
                    },err).open();

                    var state = self.model.get(self.handle);
                    self.renderer.updateState(state, {
                        keepWidths: true
                    })
                });
            });

            //TODO: Enable buttons
        }
    });
});
