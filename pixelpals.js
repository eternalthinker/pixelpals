/*
 * Javascript implementation of Conway's Game of Life and other cellular automata
 *
 * Author: Rahul Anand [ eternalthinker.co ], Nov 2014
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
*/

$(document).ready(function() {

    /*
        Tool:
            - Pencil
            - Eraser
            - Color Picker

        PixelCanvas:
            - grid of cells (color)
            - setPixel (x, y, color)
            - getPixel (x, y)

        Ui:
            - tool buttons
            - pixel canvas
                * tools
        
    */


    /* ================== Ui class ================ */
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
    /* ================== End of Ui class ================ */


    /* ================== Utilities ================ */
    // Compatibility fix
    if (String.prototype.repeat === undefined) {
        String.prototype.repeat = function (num)
        {
            return new Array(num + 1).join(this);
        }
    }

    // Add segments to a slider
    $.fn.addSliderSegments = function (amount, orientation) {
        return this.each(function () {
            if (orientation == "vertical") {
              var output = ''
              , i;
              for (i = 1; i <= amount - 2; i++) {
                output += '<div class="ui-slider-segment" style="top:' + 100 / (amount - 1) * i + '%;"></div>';
            };
            $(this).prepend(output);
            } else {
                var segmentGap = 100 / (amount - 1) + "%";
                var segment = '<div class="ui-slider-segment" style="margin-left: ' + segmentGap + ';"></div>';
                $(this).prepend(segment.repeat(amount - 2));
            }
        });
    };

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

    var ui;
    $(document).ajaxStop(function() {
        ui = new Ui(Rules, Lifeforms, Palettes);
    });

});