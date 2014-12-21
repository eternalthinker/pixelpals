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

    /* ================== PixelCanvas class ================ */
    function PixelCanvas (w, h, pixelSize, canvasNode, ui) {
        this.w = w;
        this.h = h;
        this.pixelSize = pixelSize;
        this.rows = this.h / this.pixelSize;
        this.cols = this.w / this.pixelSize;
        this.canvasNode = canvasNode;
        this.canvasCtx = canvasNode.getContext('2d');
        this.ui = ui;
        
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

    PixelCanvas.prototype.setColorFrom = function (x, y) {
    }

    PixelCanvas.prototype.setColor = function (color) {
        this.color = color;
    }

    PixelCanvas.prototype.clearUi = function () {
        this.canvasCtx.clearRect(0, 0, this.w, this.h);
        // Note that we're not clearing internal array here
    }

    PixelCanvas.prototype.getPixelpoint = function (event) {
        coords = this.canvasNode.relMouseCoords (event);
        //return { x: Math.floor(coords.x/this.cellSize), y: Math.floor(coords.y/this.cellSize) };
        // Fine tuning pixel drawing at edges: (10,10) -> (1,1) for cellSize=5
        return { x: Math.floor(coords.x/this.pixelSize) - (coords.x%this.pixelSize?0:1), 
                 y: Math.floor(coords.y/this.pixelSize) - (coords.y%this.pixelSize?0:1) 
               };
    }
    /* ==================  End of class ================ */


    /* ================== Tool classes ================ */
    function Tool (ui) {
        this.ui = ui;
        this.pixelCanvas = ui.pixelCanvas;
        this.socket = ui.socket;
        this.drawing = false;
        this.dragging = false;
        this.name = "generic_tool";
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
        if (this.dragging) {
            this.drawing = false;
            this.dragging = false;
        }
    }

    /* ----------------------- Pencil -----------------------*/
    function Pencil (ui) {
        Tool.call(this, ui);
        this.name = "pencil";
        this.points = [];
        this.lastEmit = $.now();
    }
    Pencil.prototype = Object.create(Tool.prototype);

    Pencil.prototype.networkEmit = function () {
        var data = {
            color: this.pixelCanvas.color,
            points: this.points
        };
        this.socket.emit('drawing', data);
        this.ui.networkDraw(data);
        this.points = [];
        this.lastEmit = $.now();
    } 

    Pencil.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            else {
                var point = this.pixelCanvas.getPixelpoint(event);
                this.pixelCanvas.setPixel(point.x, point.y);
                this.points.push(point);
            }
            this.networkEmit();
            this.pixelCanvas.clearUi();
        }
    }

    Pencil.prototype.onMouseMove = function (event) {
        if (this.drawing) {
            this.dragging = true;
            var point = this.pixelCanvas.getPixelpoint(event);
            this.pixelCanvas.setPixel(point.x, point.y);
            this.points.push(point);
            if ($.now() - this.lastEmit > 30) {
                this.networkEmit();
            }
        }
    }

    Pencil.prototype.onMouseOut = function (event) {
        if (this.dragging) {
            this.drawing = false;
            this.dragging = false;
            this.networkEmit();
        }
    }

    /* ----------------------- Picker -----------------------*/
    function Picker (pixelCanvas) {
        Tool.call(this, pixelCanvas);
        this.name = "picker";
    }
    Picker.prototype = Object.create(Tool.prototype);

    Picker.prototype.onMouseUp = function (event) {
        if (this.drawing) {
            this.drawing = false;
            if (this.dragging) { // No mouse up action if mouse was being dragged
                this.dragging = false;
            }
            else {
                var point = this.pixelCanvas.getPixelpoint(event);
                var color = this.ui.networkCanvas.getPixel(point.x, point.y); // Final colors are here
                this.pixelCanvas.setColor(color);
                this.ui.setColorUi(color);
                this.ui.setTool('pencil');
            }
        }
    }
    /* ================== End of Tool classes ================ */


    /* ================== Ui class ================ */
    function Ui () {
        // Collect UI components
        this.$pixel_cnvs = $('#pixelcanvas');
        this.$network_cnvs = $('#networkcanvas');
        this.$grid_cnvs = $('#grid');
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

        // Networking
        var url = 'http://localhost:8080'; // The URL of your web server (the port is set in app.js)
        this.socket = io.connect(url);
        this.socket.on('drawing', $.proxy(this.networkDraw, this));

        // Drawing
        this.pixelCanvas = new PixelCanvas(this.w, this.h, this.pixelSize, this.$pixel_cnvs.get(0), this);
        this.networkCanvas = new PixelCanvas(this.w, this.h, this.pixelSize, this.$network_cnvs.get(0), this);
        this.tools = {
            pencil: new Pencil(this),
            picker: new Picker(this)
        };
        this.curTool = this.tools.pencil;
        this.curToolName = 'pencil';

        // Actions
        $('#picker').prop('disabled', false);
        this.setTool(this.curToolName);
        this.paintGrid();
        this.pixelCanvas.setColor('#FF4500');
        this.setColorUi('#FF4500');
    }

    // In multi-tool implementation, this logic shall be moved to each tool
    // Eg:- this.tools[data.toolname].networkDraw(data)
    Ui.prototype.networkDraw = function (data) {
        this.networkCanvas.setColor(data.color);
        for (var i = 0; i < data.points.length; ++i) {
            var point = data.points[i];
            this.networkCanvas.setPixel(point.x, point.y);
        }
    }

    Ui.prototype.setTool = function (toolname) {
        $('#' + this.curTool.name).prop('disabled', false);
        this.curTool = this.tools[toolname];
        $('#' + this.curTool.name).prop('disabled', true);
    };

    Ui.prototype.setColorUi = function (color) {
        this.$colorpicker_ui.val(color);
        this.$colorpicker_ui.change();
    }

    Ui.prototype.paintGrid = function () {
        var grid_ctx = this.$grid_cnvs.get(0).getContext('2d');
        grid_ctx.fillStyle = '#FFFFFF';
        grid_ctx.strokeStyle = '#DCDCDC';
        grid_ctx.lineWidth = 0.5;
        /* Background color
        this.grid_ctx.beginPath();
        this.grid_ctx.rect(0, 0, this.w, this.h); 
        this.grid_ctx.fill(); */
        for (var x = 0; x <= this.w; x += this.pixelSize) {
            grid_ctx.beginPath();
            grid_ctx.moveTo(x, 0);
            grid_ctx.lineTo(x, this.h);
            grid_ctx.stroke();
        }
        for (var y = 0; y <= this.h; y += this.pixelSize) {
            grid_ctx.beginPath();
            grid_ctx.moveTo(0, y);
            grid_ctx.lineTo(this.w, y);
            grid_ctx.stroke();
        }
    }

    Ui.prototype.onMouseDown = function (event) {
        event.originalEvent.preventDefault(); // Chrome drag text cursor fix
        this.curTool.onMouseDown(event);
    }

    Ui.prototype.onMouseUp = function (event) {
        this.curTool.onMouseUp(event);
    }

    Ui.prototype.onMouseMove = function (event) {
        this.curTool.onMouseMove(event);
    }

    Ui.prototype.onMouseOut = function (event) {
        this.curTool.onMouseOut(event);
    }
    /* ================== End of Ui class ================ */


    /* ================== Utilities ================ */
    // Retrieve mouse coordinates relative to the canvas element
    function relMouseCoords(event){
        if (event.offsetX !== undefined && event.offsetY !== undefined) 
        { 
            return {x:event.offsetX, y:event.offsetY}; 
        }

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