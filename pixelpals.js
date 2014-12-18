/*
 * Web based public collaborative pixel canvas 
 *
 * Author: Rahul Anand [ eternalthinker.co ], Dec 2014
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
*/

$(document).ready(function() {

    /* ================== Tool classes ================ */
    function Tool (pixelCanvas) {
        this.pixelCanvas = pixelCanvas;
        this.drawing = false;
        this.dragging = false;
    }

    Tool.prototype.onMouseDown = function (event) {
        this.drawing = true;
    }

    Tool.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            // else click draw action
        }
    }

    Tool.prototype.onMouseMove = function (event) {
        if (this.drawing) {
            this.dragging = true;
        }
        // else drag draw action
    }

    Tool.prototype.onMouseOut = function (event) {
        this.dragging = false;
    }

    /* ----------------------- Pencil -----------------------*/
    function Pencil (pixelCanvas) {
        Tool.call(this, pixelCanvas);
    }
    Pencil.prototype = Object.create(Tool.prototype);

    Pencil.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            else {
                this.pixelCanvas.setPixel(event.x, event.y);
            }
        }
    }

    Pencil.prototype.onMouseMove = function (event) {
        if (this.drawing) {
            this.dragging = true;
            this.pixelCanvas.setPixel(event.x, event.y);
        }
    }

    Pencil.prototype.setColor = function (color) {
        this.color = color;
    }

    /* ----------------------- Picker -----------------------*/
    function Picker (pixelCanvas) {
        Tool.call(this, pixelCanvas);
    }
    Picker.prototype = Object.create(Tool.prototype);

    Picker.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            else {
                this.pixelCanvas.processColorPick(event);
            }
        }
    }
    /* ================== End of Tool classes ================ */


    /* ================== PixelCanvas class ================ */
    function PixelCanvas (rows, cols, pixelSize, canvasCtx, ui) {
        this.rows = rows;
        this.cols = cols;
        this.pixelSize = pixelSize;
        this.canvasCtx = canvasCtx;
        this.ui = ui;

        this.tools = {
            pencil: new Pencil(this),
            picker: new Picker(this)
        };
        this.curTool = this.tools.pencil;
        this.color = '#000000';
        this.canvasData = []; // Internal info storage for canvas pixels

        // Actions
        for (var r = 0; r < this.rows; ++r) {
            for (var c = 0; c < this.cols; ++c) {
                this.canvasData[r*this.cols + c] = '#FFFFFF';
            }
        }
    }

    PixelCanvas.prototype.setPixel = function (x, y) {
        this.canvasData[y*this.cols + x] = this.color;
        this.canvasCtx.fillStyle = this.color;
        this.canvasCtx.beginPath();
        this.canvasCtx.rect(x*this.pixelSize, y*this.pixelSize, this.pixelSize, this.pixelSize);
        this.canvasCtx.fill();
    }

    PixelCanvas.prototype.getPixel = function (x, y) {
        return this.canvasData[y*this.cols + x];
    }

    PixelCanvas.prototype.setTool = function (toolname) {
        this.curTool = this.tools[toolname];
    }

    PixelCanvas.prototype.processColorPick = function (event) {
        this.setColorFrom(event.x, event.y);
        this.ui.setColor(this.color);
        this.setTool('pencil');
        this.ui.setTool('pencil');
    }

    PixelCanvas.prototype.setColorFrom = function (x, y) {
        this.setColor( this.getPixel(x, y) );
    }

    PixelCanvas.prototype.setColor = function (color) {
        this.color = color;
    }

    PixelCanvas.prototype.onMouseDown = function (event) {
        this.curTool.onMouseDown(event);
    }

    PixelCanvas.prototype.onMouseUp = function (event) {
        this.curTool.onMouseUp(event);
    }

    PixelCanvas.prototype.onMouseMove = function (event) {
        this.curTool.onMouseMove(event);
    }

    PixelCanvas.prototype.onMouseOut = function (event) {
        this.curTool.onMouseOut(event);
    }
    /* ==================  End of class ================ */


    /* ================== Ui class ================ */
    function Ui () {
        // Collect UI components
        this.$pixel_cnvs = $('#pixelcanvas');
        this.$grid_cnvs = $('#grid');
        this.pixel_ctx = this.$pixel_cnvs.get(0).getContext('2d');
        this.grid_ctx = this.$grid_cnvs.get(0).getContext('2d');
        this.$grid_chk = $('#grid-switch');
        this.$colorpicker_ui = $('#colorpicker');

        // UI component handlers
        this.$grid_chk.bootstrapSwitch('state', true);
        this.$grid_chk.on('switchChange.bootstrapSwitch', $.proxy(function (event, state) {
          if (state) {
            this.$grid_cnvs.show();
          } else {
            this.$grid_cnvs.hide();
          }
        }, this));

        $('.tool').click($.proxy(function (event) {
            var toolname = event.target.id;
            this.setTool(toolname);
            this.pixelCanvas.setTool(toolname);
        }, this));

        this.$colorpicker_ui.colorPicker({
            pickerDefault: "000000",
            transparency: false,
            showHexField: true,
            onColorChange: $.proxy(function (id, newValue) {
                this.pixelCanvas.setColor(newValue);
            }, this),
            colors: ["E6E6FA", "D8BFD8", "DDA0DD", "EE82EE", "DA70D6", "FF00FF", "FF00FF", "BA55D3", "9370DB", "8A2BE2", 
                    "9400D3", "9932CC", "8B008B", "800080", "4B0082", "483D8B", "6A5ACD", "7B68EE", "FFC0CB", "FFB6C1", 
                    "FF69B4", "FF1493", "DB7093", "C71585", "FFA07A", "FA8072", "E9967A", "F08080", "CD5C5C", "DC143C", 
                    "B22222", "8B0000", "FF0000", "FF4500", "FF6347", "FF7F50", "FF8C00", "FFA500", "FFFF00", "FFFFE0", 
                    "FFFACD", "FAFAD2", "FFEFD5", "FFE4B5", "FFDAB9", "EEE8AA", "F0E68C", "BDB76B", "FFD700", "FFF8DC", 
                    "FFEBCD", "FFE4C4", "FFDEAD", "F5DEB3", "DEB887", "D2B48C", "BC8F8F", "F4A460", "DAA520", "B8860B", 
                    "CD853F", "D2691E", "8B4513", "A0522D", "A52A2A", "800000", "556B2F", "808000", "6B8E23", "9ACD32", 
                    "32CD32", "00FF00", "7CFC00", "7FFF00", "ADFF2F", "00FF7F", "00FA9A", "90EE90", "98FB98", "8FBC8F", 
                    "3CB371", "2E8B57", "228B22", "008000", "006400", "66CDAA", "00FFFF", "00FFFF", "E0FFFF", "AFEEEE", 
                    "7FFFD4", "40E0D0", "48D1CC", "00CED1", "20B2AA", "5F9EA0", "008B8B", "008080", "B0C4DE", "B0E0E6", 
                    "ADD8E6", "87CEEB", "87CEFA", "00BFFF", "1E90FF", "6495ED", "4682B4", "4169E1", "0000FF", "0000CD", 
                    "00008B", "000080", "191970", "FFFFFF", "FFFAFA", "F0FFF0", "F5FFFA", "F0FFFF", "F0F8FF", "F8F8FF", 
                    "F5F5F5", "FFF5EE", "F5F5DC", "FDF5E6", "FFFAF0", "FFFFF0", "FAEBD7", "FAF0E6", "FFF0F5", "FFE4E1", 
                    "DCDCDC", "D3D3D3", "C0C0C0", "A9A9A9", "808080", "696969", "778899", "708090", "2F4F4F", "000000" 
                    ]
        });
        $('.colorPicker-picker').addClass('btn btn-default');

        // Mouse handlers
        this.$grid_cnvs.mousedown($.proxy(function (event) { this.onMouseDown(event); }, this));
        this.$grid_cnvs.mouseup($.proxy(function (event) { this.onMouseUp(event); }, this));
        this.$grid_cnvs.mousemove($.proxy(function (event) { this.onMouseMove(event); }, this));
        this.$grid_cnvs.mouseout($.proxy(function (event) { this.onMouseOut(event); }, this));
        this.$pixel_cnvs.mousedown($.proxy(function (event) { this.onMouseDown(event); }, this));
        this.$pixel_cnvs.mouseup($.proxy(function (event) { this.onMouseUp(event); }, this));
        this.$pixel_cnvs.mousemove($.proxy(function (event) { this.onMouseMove(event); }, this));
        this.$pixel_cnvs.mouseout($.proxy(function (event) { this.onMouseOut(event); }, this));

        // Init vars
        this.w = 750;
        this.h = 600;
        this.pixelSize = 5;
        this.curToolName = 'pencil';

        // Actions
        $('#picker').prop('disabled', false);
        this.setTool(this.curToolName);
        this.paintGrid();
        this.pixelCanvas = new PixelCanvas(this.h/this.pixelSize, this.w/this.pixelSize, this.pixelSize, this.pixel_ctx, this);
        this.pixelCanvas.setColor('#FF4500');
        this.setColor('#FF4500');
    }

    Ui.prototype.setTool = function (toolname) {
        $('#' + this.curToolName).prop('disabled', false);
        this.curToolName = toolname;
        $('#' + this.curToolName).prop('disabled', true);
    };

    Ui.prototype.setColor = function (color) {
        this.$colorpicker_ui.val(color);
        this.$colorpicker_ui.change();
    }

    Ui.prototype.paintGrid = function () {
        this.grid_ctx.fillStyle = '#FFFFFF';
        this.grid_ctx.strokeStyle = '#DCDCDC';
        this.grid_ctx.lineWidth = 0.5;
        /* Background color
        this.grid_ctx.beginPath();
        this.grid_ctx.rect(0, 0, this.w, this.h); 
        this.grid_ctx.fill(); */
        for (var x = 0; x <= this.w; x += this.pixelSize) {
            this.grid_ctx.beginPath();
            this.grid_ctx.moveTo(x, 0);
            this.grid_ctx.lineTo(x, this.h);
            this.grid_ctx.stroke();
        }
        for (var y = 0; y <= this.h; y += this.pixelSize) {
            this.grid_ctx.beginPath();
            this.grid_ctx.moveTo(0, y);
            this.grid_ctx.lineTo(this.w, y);
            this.grid_ctx.stroke();
        }
    }

    Ui.prototype.getPixelpoint = function (event) {
        coords = this.$pixel_cnvs.get(0).relMouseCoords (event)
        //return { x: Math.floor(coords.x/this.cellSize), y: Math.floor(coords.y/this.cellSize) };
        // Fine tuning pixel drawing at edges: (10,10) -> (1,1) for cellSize=5
        return { x: Math.floor(coords.x/this.pixelSize) - (coords.x%this.pixelSize?0:1), 
                 y: Math.floor(coords.y/this.pixelSize) - (coords.y%this.pixelSize?0:1) 
               };
    }

    Ui.prototype.onMouseDown = function (event) {
        event.originalEvent.preventDefault(); // Chrome drag text cursor fix
        this.pixelCanvas.onMouseDown(this.getPixelpoint(event));
    }

    Ui.prototype.onMouseUp = function (event) {
        this.pixelCanvas.onMouseUp(this.getPixelpoint(event));
    }

    Ui.prototype.onMouseMove = function (event) {
        this.pixelCanvas.onMouseMove(this.getPixelpoint(event));
    }

    Ui.prototype.onMouseOut = function (event) {
        this.pixelCanvas.onMouseOut(this.getPixelpoint(event));
    }
    /* ================== End of Ui class ================ */

    


    /* ================== Ui class ================
    function Ui (Rules, Lifeforms, Palettes) {
        this.Rules = Rules;
        this.Lifeforms = Lifeforms;
        this.Palettes = Palettes;

        // Ui components
        this.$run_btn = $('#run');
        this.$step_btn = $('#step');
        this.$pause_btn = $('#pause');
        this.$pencil_btn = $('#pencil');
        this.$eraser_btn = $('#eraser');
        this.$clear_btn = $('#clear');
        this.$slider_ui = $('#slider');
        this.slider_values = [1000, 250, 120, 70, 10];
        this.$trace_chk = $('#trace-switch');
        this.$grid_chk = $('#grid-switch');
        this.$grid_cnvs = $('#grid');
        this.$world_cnvs = $('#world');
        this.world_cnvs = $('#world').get(0);
        this.$generation_ui = $('#generation');
        this.$population_ui = $('#population');
        this.$rules_sel = $('#rules');
        this.$lifeform_sel = $('#lifeforms');
        this.$brule_ip = $('#b-rule');
        this.$srule_ip = $('#s-rule');

        // Ui component handlers
        this.$run_btn.click($.proxy(this.run, this));
        this.$step_btn.click($.proxy(this.step_update, this));
        this.$pause_btn.click($.proxy(this.pause, this)); 
        this.$pencil_btn.click($.proxy(function() {
            this.curTool = this.Tool.PENCIL;
            this.$pencil_btn.prop('disabled', true);
            this.$eraser_btn.prop('disabled', false);
        }, this));
        this.$eraser_btn.click($.proxy(function() {
            this.curTool = this.Tool.ERASER;
            this.$pencil_btn.prop('disabled', false);
            this.$eraser_btn.prop('disabled', true);
        }, this));
        this.$clear_btn.click($.proxy(this.clearWorld, this));

        if (this.$slider_ui.length > 0) {
          this.$slider_ui.slider({
            min: 1,
            max: 5,
            value: 3,
            orientation: "horizontal",
            range: "min",
            slide: $.proxy(function (event, ui) {
                this.frameDelay = this.slider_values[ui.value - 1];
            }, this)
          }).addSliderSegments(this.$slider_ui.slider("option").max);
        }
        $('#palette').click($.proxy(function () {
            this.rotatePalette();
        }, this));
        this.$trace_chk.bootstrapSwitch('state', true);
        this.$trace_chk.on('switchChange.bootstrapSwitch', $.proxy(function (event, state) {
          this.trace = state;
          if (this.halt) {
            this.paint();
          }
        }, this));
        this.$grid_chk.bootstrapSwitch('state', true);
        this.$grid_chk.on('switchChange.bootstrapSwitch', $.proxy(function (event, state) {
          if (state) {
            this.$grid_cnvs.show();
          } else {
            this.$grid_cnvs.hide();
          }
        }, this));

        $('select').select2();
        this.$rules_sel.on('change', $.proxy(function (event) {
            if (event.val !== "CUSTOM") {
                this.setRule(event.val);
            } 
            else {
                var curRule = this.Rules[this.rulename];
                this.rule = { B: curRule.B.slice(0), S: curRule.S.slice(0) };
                this.rulename = event.val;
                this.$brule_ip.prop('disabled', false).parent().addClass('has-success');
                this.$srule_ip.prop('disabled', false).parent().addClass('has-success');
            }
        }, this));
        this.$brule_ip.on('input', $.proxy(function (event) {
            var B = this.parseRule(this.$brule_ip.val());
            if (B) {
                this.rule.B = B;
                this.life.setRule(this.rule);
                this.$brule_ip.parent().removeClass('has-error').addClass('has-success');
            }
            else {
                this.$brule_ip.parent().removeClass('has-success').addClass('has-error');
            }
        }, this));
        this.$srule_ip.on('input', $.proxy(function (event) {
            var S = this.parseRule(this.$srule_ip.val());
            if (S) {
                this.rule.S = S;
                this.life.setRule(this.rule);
                this.$srule_ip.parent().removeClass('has-error').addClass('has-success');
            }
            else {
                this.$srule_ip.parent().removeClass('has-success').addClass('has-error');
            }
        }, this));
        this.$lifeform_sel.on('change', $.proxy(function (event) {
            if (event.val !== "NONE") {
                this.loadLifeform(event.val);
            }
        }, this));

        $(window).blur($.proxy(function () {
            this.halt || this.pause();
        }, this));

        // Mouse handlers
        this.$grid_cnvs.mousedown($.proxy(function (event) { this.onMouseDown(event); }, this));
        this.$grid_cnvs.mouseup($.proxy(function (event) { this.onMouseUp(event); }, this));
        this.$grid_cnvs.mousemove($.proxy(function (event) { this.onMouseMove(event); }, this));
        this.$grid_cnvs.mouseout($.proxy(function (event) { this.onMouseOut(event); }, this));
        this.$world_cnvs.mousedown($.proxy(function (event) { this.onMouseDown(event); }, this));
        this.$world_cnvs.mouseup($.proxy(function (event) { this.onMouseUp(event); }, this));
        this.$world_cnvs.mousemove($.proxy(function (event) { this.onMouseMove(event); }, this));
        this.$world_cnvs.mouseout($.proxy(function (event) { this.onMouseOut(event); }, this));

        // Drawing related variables
        this.drawing = false;
        this.dragging = false;
        this.Tool = Object.freeze({
            PENCIL: 1,
            ERASER: 2
        });
        this.curTool = this.Tool.PENCIL;

        // Life appearance variables
        this.w = 750;
        this.h = 600;
        this.cellSize = 5;
        this.cellColor = '#000000';
        this.gridColor = '#CCCCCC';
        this.bgColor = '#FFFFFF';
        this.palette_idx = 0;
        this.Palette = this.Palettes[this.palette_idx];
        this.gridStroke = 0.5;
        this.frameDelay = 120; // ms
        this.frameTimer;

        this.world_ui = $('#world').get(0).getContext('2d');
        this.grid_ui = $('#grid').get(0).getContext('2d');
        this.world_ui.fillStyle = this.cellColor;
        this.world_ui.strokeStyle  = this.bgColor;
        this.grid_ui.fillStyle = this.bgColor;
        this.grid_ui.strokeStyle = this.gridColor;
        this.grid_ui.lineWidth = this.gridStroke;

        this.rows = this.h / this.cellSize;
        this.cols = this.w / this.cellSize;
        this.rulename = "GAME_OF_LIFE";
        this.rule = { B:[], S:[] };
        this.trace = true;
        this.halt = true;

        // Actions
        this.$rules_sel.select2('val', this.rulename);
        this.$brule_ip.prop('disabled', true).parent().removeClass('has-error').removeClass('has-success');
        this.$srule_ip.prop('disabled', true).parent().removeClass('has-error').removeClass('has-success');
        this.$lifeform_sel.select2('val', 'GOSPER_GLIDER_GUN');
        this.$run_btn.prop('disabled', false);
        this.$step_btn.prop('disabled', false);
        this.$pause_btn.prop('disabled', true);
        this.$pencil_btn.prop('disabled', true);
        this.$eraser_btn.prop('disabled', false);
        this.paintGrid();
        this.life = new Life (this.rows, this.cols, null);
        this.setRule (this.rulename);
        this.life.load(this.Lifeforms["GOSPER_GLIDER_GUN"]);
        this.paint();
    }

    Ui.prototype.rotatePalette = function () {
        this.palette_idx = (this.palette_idx + 1) % this.Palettes.length;
        this.Palette = this.Palettes[this.palette_idx];
        if (this.halt) {
            this.paint();
        }
    }

    Ui.prototype.parseRule = function (value) {
        var rulePat = /^\s*([0-8]{0,9})\s*$/; // full, rulenums
        var ruleMatch = rulePat.exec(value);
        if (! ruleMatch) return null;
        var rule = ruleMatch[1];
        var arr = [];
        for (var i = 0; i < rule.length; ++i) {
            var num = +rule[i];
            if (arr.indexOf(num) != -1) return null;
            arr.push(num);
        }
        return arr;
    }

    Ui.prototype.setRule = function (rulename) {
        var rule = this.Rules[rulename];
        this.life.setRule(rule);
        this.$brule_ip.val(rule.B.join(''));
        this.$srule_ip.val(rule.S.join(''));
        if (this.rulename === "CUSTOM") {
            this.$brule_ip.prop('disabled', true).parent().removeClass('has-error').removeClass('has-success');
            this.$srule_ip.prop('disabled', true).parent().removeClass('has-error').removeClass('has-success');
        }
        this.rulename = rulename;
    }

    Ui.prototype.loadLifeform = function (name) {
        this.pause();
        this.life.clear();
        this.life.load(this.Lifeforms[name]);
        this.paint();
    }

    Ui.prototype.getPixelpoint = function (coords) {
        //return { x: Math.floor(coords.x/this.cellSize), y: Math.floor(coords.y/this.cellSize) };
        // Fine tuning pixel drawing at edges: (10,10) -> (1,1) for cellSize=5
        return { x: Math.floor(coords.x/this.cellSize) - (coords.x%this.cellSize?0:1), 
                 y: Math.floor(coords.y/this.cellSize) - (coords.y%this.cellSize?0:1) 
               };
    }

    Ui.prototype.onMouseDown = function (event) {
        event.originalEvent.preventDefault(); // Chrome drag text cursor fix
        this.drawing = true;
        // var point = this.getPixelpoint(this.world_cnvs.relMouseCoords(event));
    }

    Ui.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            else {
                var point = this.getPixelpoint(this.world_cnvs.relMouseCoords(event));
                if (this.curTool === this.Tool.PENCIL) {
                    var ievent = this.world_cnvs.relMouseCoords(event);
                    //console.log ("(" + ievent.x + ", " + ievent.y + ") -> " + "(" + point.x + ", " + point.y + ")");
                    if (! this.life.get(point.x, point.y).alive) {
                        this.setCell(point.x, point.y);
                    } else {
                        this.unsetCell(point.x, point.y); // Live cell; click to unset
                    }
                }
                else { // this.curTool.ERASER
                    this.unsetCell(point.x, point.y);
                }
            }
        }
    }

    Ui.prototype.onMouseMove = function (event) {
        if (this.drawing) {
            this.dragging = true;
            var point = this.getPixelpoint(this.world_cnvs.relMouseCoords(event));
            if (this.curTool === this.Tool.PENCIL) {
                this.setCell(point.x, point.y);
            }
            else { // this.curTool.ERASER
                this.unsetCell(point.x, point.y);
            }
        }
    }

    Ui.prototype.onMouseOut = function (event) {
        if (this.drawing) {
            this.drawing = false;
            this.dragging = false;
            // var point = this.getPixelpoint(this.world_cnvs.relMouseCoords(event));
        }
    }

    Ui.prototype.setCell = function (x, y) {
        if (this.life.get(x,y).alive) return;
        this.life.set(x, y);
        this.world_ui.fillStyle = this.cellColor;
        this.world_ui.beginPath();
        this.world_ui.rect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize);
        this.world_ui.fill();
    }

    Ui.prototype.unsetCell = function (x, y) {
        if (! this.life.get(x,y).alive) return;
        this.life.unset(x, y);
        if (this.trace) {
            this.world_ui.fillStyle = this.Palette[1]; // Age always -1 after unset()
            this.world_ui.beginPath();
            this.world_ui.rect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize);
            this.world_ui.fill();
        }
        else {
            this.world_ui.clearRect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize);
        }
    }

    Ui.prototype.clearWorld = function (x, y) {
        this.pause();
        this.life.clear();
        this.$lifeform_sel.select2('val', 'NONE');
        this.paint();
    }

    Ui.prototype.run = function () {
        this.update();
        this.$run_btn.prop('disabled', true);
        this.$step_btn.prop('disabled', true);
        this.$pause_btn.prop('disabled', false);
        this.halt = false;
    }

    Ui.prototype.step_update = function () {
        this.life.step();
        this.paint();
    }

    Ui.prototype.pause = function () {
        clearTimeout(this.frameTimer);
        this.$run_btn.prop('disabled', false);
        this.$step_btn.prop('disabled', false);
        this.$pause_btn.prop('disabled', true);
        this.halt = true;
    }

    Ui.prototype.paint = function () {
        this.world_ui.clearRect(0, 0, this.w, this.h);
        for (var x = 0; x < this.cols; ++x) {
            for (var y = 0; y < this.rows; ++y) {
                var cell = this.life.get(x,y);
                if (cell.alive) {
                    this.world_ui.fillStyle = this.cellColor;
                    this.world_ui.beginPath();
                    this.world_ui.rect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize);
                    this.world_ui.fill();
                }
                else if (this.trace && cell.age < 0) {
                    this.world_ui.fillStyle = this.Palette[-cell.age];
                    this.world_ui.beginPath();
                    this.world_ui.rect(x*this.cellSize, y*this.cellSize, this.cellSize, this.cellSize);
                    this.world_ui.fill();
                }
            }
        }
        this.$generation_ui.text(this.life.generation);
        this.$population_ui.text(this.life.population);
    }

    Ui.prototype.update = function () {
        this.life.step();
        this.paint();
        this.frameTimer = setTimeout(this.update.bind(this), this.frameDelay);
    }

    Ui.prototype.paintGrid = function () {
        //this.grid_ui.beginPath();
        //this.grid_ui.rect(0, 0, this.w, this.h);
        //this.grid_ui.fill();
        for (var x = 0; x <= this.w; x += this.cellSize) {
            this.grid_ui.beginPath();
            this.grid_ui.moveTo(x, 0);
            this.grid_ui.lineTo(x, this.h);
            this.grid_ui.stroke();
        }
        for (var y = 0; y <= this.h; y += this.cellSize) {
            this.grid_ui.beginPath();
            this.grid_ui.moveTo(0, y);
            this.grid_ui.lineTo(this.w, y);
            this.grid_ui.stroke();
        }
    }
   ================== End of Ui class ================ */


    /* ================== Utilities ================ */
    // Retrieve mouse coordinates relative to the canvas element
    function relMouseCoords(event){
        var totalOffsetX = 0;
        var totalOffsetY = 0;
        var canvasX = 0;
        var canvasY = 0;
        var currentElement = this;

        do {
            totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
            totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
        }
        while(currentElement = currentElement.offsetParent);

        canvasX = event.pageX - totalOffsetX;
        canvasY = event.pageY - totalOffsetY;

        return {x:canvasX, y:canvasY};
    }
    HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;
    /* ================== End of Utilities ================ */

    var ui = new Ui();

});