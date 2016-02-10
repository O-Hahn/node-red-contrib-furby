/**
 * Copyright 2015 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * Authors:
 *    - Olaf Hahn
**/

// import 

// Statics
var STATE_UNINITIALISED = 0;
var STATE_INITIALISED   = 1;

// FurbyPiBoard 
 var FurbyPiBoard = function() {
	 
   this.state = this.state || STATE_UNINITIALISED;
   
   if(this.state == STATE_UNINITIALISED){
     this.board = this.init.apply(this);
     this.state = STATE_INITIALISED;
   }
 };

 // Init the FurbyPiBoard
FurbyPiBoard.prototype.init = function() {

	var board = new function(){
	   
   }
        
   console.log("Furby Board Init done");
   
   return board;
 };


 // Furby Speak  
 FurbyPiBoard.prototype.SpeakOutput = function(msg, format, filename){
	var fs = require("fs-extra");
	var os = require("os");
	 	
	console.log("Format:" + format + "Filename: " + filename);
	  
	if (filename === "") {
		console.log("Furby Speak: No Filename given");
    } else if (msg.hasOwnProperty("payload") && (typeof msg.payload !== "undefined")) {
		var data = msg.payload;
		
		if ((typeof data === "object") && (!Buffer.isBuffer(data))) {
			 data = JSON.stringify(data);
		}
        if (typeof data === "boolean") { data = data.toString(); }
        if (typeof data === "number") { data = data.toString(); }
        if (!Buffer.isBuffer(data)) { data += os.EOL; }
        
        data = new Buffer(data);
         
        // using "binary" not {encoding:"binary"} to be 0.8 compatible for a while
        fs.writeFile(filename, data, "binary", function (err) {
            if (err) {
                if (err.code === "ENOENT") {
                    fs.ensureFile(filename, function (err) {
                        if (err) { 
                        	node.error(RED._("file.errors.createfail",{error:err.toString()}),msg); 
                        }
                        else {
                            fs.writeFile(filename, data, "binary", function (err) {
                                if (err) { node.error(RED._("file.errors.writefail",{error:err.toString()}),msg); }
                            });
                        }
                    });
                }
                else { node.error(RED._("file.errors.writefail",{error:err.toString()}),msg); }
            }
            else if (RED.settings.verbose) { node.log(RED._("file.status.wrotefile",{file:filename})); }
        });
    }
};



module.exports = FurbyPiBoard;