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
 * Furby-Module is based on the serial node of node-red
 **/

// writes out to furby a command
// port = serial port
// addCh = Char to be added or ""
// cmd = string which should send out through serial port
function writeCommand(node, cmd) {
	var payload = cmd; 
	
	// log out the command
	node.log("Furby gets: " + cmd);
	
	// set the payload to a buffer with the right content 
    if (!Buffer.isBuffer(payload)) {
        if (typeof payload === "object") {
            payload = JSON.stringify(payload);
        } else {
            payload = payload.toString();
        }
        payload += node.addCh;
    } else if (node.addCh !== "") {
        payload = Buffer.concat([payload,new Buffer(node.addCh)]);
    }
    
	// talk write out the buffer to the serial - furby
    node.port.write(payload,function(err,res) {
        if (err) {
            var errmsg = err.toString().replace("Serialport","Serialport "+node.port.serial.path);
            node.error(errmsg,msg);
        }
    });
};

// give the stream out on the audio 
function speakOutput(node, outStream) {
	// include needed libs
	var Readable = require('stream').Readable;
	var Speaker = require("speaker");
	
	// Create the Speaker instance
	var speaker = new Speaker({
	  channels: node.channel,          // 2 channels
	  bitDepth: node.bitdepth,         // 16-bit samples
	  sampleRate: node.samplerate     // 44,100 Hz sample rate
	});

	// make buffer streamable 
	var rs = new Readable;
	rs.push(outStream);
	rs.push(null);
 	
    // send file to output
    rs.pipe(speaker);
};

module.exports = function(RED) {
    "use strict";
    
    // var FurbyPiBoard = require('./lib/FurbyBoard');
    
    var settings = RED.settings;
    var events = require("events");
    var serialp = require("serialport");
    var bufMaxSize = 32768;  // Max serial buffer size, for inputs...

    // TODO: 'serialPool' should be encapsulated in SerialPortNode


    // FurbyPi Configuration Node 
    function FurbyPiConfigNode(n) {
        RED.nodes.createNode(this,n);
        
        this.serialport = n.serialport;
        this.newline = n.newline;
        this.addchar = n.addchar || "false";
        this.serialbaud = parseInt(n.serialbaud) || 57600;
        this.databits = parseInt(n.databits) || 8;
        this.parity = n.parity || "none";
        this.stopbits = parseInt(n.stopbits) || 1;
        this.bin = n.bin || "false";
        this.out = n.out || "char";
    }
    RED.nodes.registerType("furby-config",FurbyPiConfigNode);


    // Furby Speak Output
    function FurbyPiOutputNode(config) {
    	// Create this node
        RED.nodes.createNode(this,config);
        
        this.furby = config.furby;
        this.furbyConfig = RED.nodes.getNode(this.furby);
        
		this.channel =  config.channel;
		this.bitdepth =  config.bitdepth;
		this.samplerate =  config.samplerate;
		
		this.emotion =  config.emotion;
		this.state =  config.state;
		this.arm = config.arm;
		this.light = "255000255";
		this.name =  config.name;

		var node = this;
		
		// Configuration for Furby is given
        if (this.furbyConfig) {
        	// setup a serialPort communication
            node.port = serialPool.get(this.furbyConfig.serialport,
                this.furbyConfig.serialbaud,
                this.furbyConfig.databits,
                this.furbyConfig.parity,
                this.furbyConfig.stopbits,
                this.furbyConfig.newline);
            node.addCh = "";
            if (node.furbyConfig.addchar == "true" || node.furbyConfig.addchar === true) {
                node.addCh = this.furbyConfig.newline.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t").replace("\\e","\e").replace("\\f","\f").replace("\\0","\0"); // jshint ignore:line
            }

            // if there is an new input
            node.on("input",function(msg) {
            	var fstate, femotion, farm, flight;
            	
            	// set the right furby handling
            	fstate = msg.furby.state || node.state; 
            	femotion = msg.furby.emotion || node.emotion; 
            	farm = msg.furby.arm || node.arm;
            	flight = msg.furby.light || node.light || "255000000";
            	
            	// set the right emotion - default = happy             	
        		if (femotion == "awake") {
        			writeCommand(node, "ES");
        		} else {
        			writeCommand(node, "EH");
        		}
            	
            	// set the right state default = sleep
        		if (fstate == "awake") {
        			writeCommand(node, "SA");
        		} else if (fstate == "talk") {  
        			writeCommand(node, "ST");
        		} else {
        			writeCommand(node, "SS");
        		}
            
            	// set the right arm position / motion - default Postion Down
            	if (farm == "waveup") {
        			writeCommand(node, "AWU");
            	} else if (farm == "wavedown") {
        			writeCommand(node, "AWD");
            	} else if (farm == "wavesinus") {
        			writeCommand(node, "AWS");
            	} else if (farm == "waveasync") {
        			writeCommand(node, "AWA");
            	} else if (farm == "chaotic") {
        			writeCommand(node, "AWC");
            	} else if (farm == "positionup") {
        			writeCommand(node, "APD");
            	} else if (farm == "positionhorizontal") {
        			writeCommand(node, "APH");
            	} else {
        			writeCommand(node, "APD");
            	}
            	
            	// set the light to the right RGB
    			writeCommand(node, "L"+flight);

    			// if furby talks - send speech stream
    			if (fstate == "talk") {
    				// check if speech is filled or standard-sound given
    				if (msg.furby.speech) {
        				speakOutput(node, msg.furby.speech);    					
    				}
    			}
            });
            
            // Serial Port is ready
            node.port.on('ready', function() {
                node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
            });
            
            // Serial Port is closed
            node.port.on('closed', function() {
                node.status({fill:"red",shape:"ring",text:"node-red:common.status.not-connected"});
            });
            
        } else {
            this.error(RED._("serial.errors.missing-conf"));
        }

        // Furby has a close 
        this.on("close", function(done) {
            if (this.furbyConfig) {
                serialPool.close(this.furbyConfig.serialport,done);
            } else {
                done();
            }
        });
    }
	RED.nodes.registerType("furby-output",FurbyPiOutputNode);


    // Furby Speak Input
	function FurbyPiInputNode(n) {
        RED.nodes.createNode(this,n);
        
        this.furby = n.furby;
        this.furbyConfig = RED.nodes.getNode(this.furby);

        if (this.furbyConfig) {
            var node = this;
            node.tout = null;
            var buf;
            if (node.furbyConfig.out != "count") { buf = new Buffer(bufMaxSize); }
            else { buf = new Buffer(Number(node.furbyConfig.newline)); }
            var i = 0;
            node.status({fill:"grey",shape:"dot",text:"node-red:common.status.not-connected"});
            node.port = serialPool.get(this.serialConfig.serialport,
                this.serialConfig.serialbaud,
                this.serialConfig.databits,
                this.serialConfig.parity,
                this.serialConfig.stopbits,
                this.serialConfig.newline
            );

            var splitc;
            if (node.furbyConfig.newline.substr(0,2) == "0x") {
                splitc = new Buffer([parseInt(node.furbyConfig.newline)]);
            } else {
                splitc = new Buffer(node.furbyConfig.newline.replace("\\n","\n").replace("\\r","\r").replace("\\t","\t").replace("\\e","\e").replace("\\f","\f").replace("\\0","\0")); // jshint ignore:line
            }

            this.port.on('data', function(msg) {
                // single char buffer
                if ((node.furbyConfig.newline === 0)||(node.furbyConfig.newline === "")) {
                    if (node.furbyConfig.bin !== "bin") { node.send({"payload": String.fromCharCode(msg)}); }
                    else { node.send({"payload": new Buffer([msg])}); }
                }
                else {
                    // do the timer thing
                    if (node.furbyConfig.out === "time") {
                        if (node.tout) {
                            i += 1;
                            buf[i] = msg;
                        }
                        else {
                            node.tout = setTimeout(function () {
                                node.tout = null;
                                var m = new Buffer(i+1);
                                buf.copy(m,0,0,i+1);
                                if (node.furbyConfig.bin !== "bin") { m = m.toString(); }
                                node.send({"payload": m});
                                m = null;
                            }, node.furbyConfig.newline);
                            i = 0;
                            buf[0] = msg;
                        }
                    }
                    // count bytes into a buffer...
                    else if (node.furbyConfig.out === "count") {
                        buf[i] = msg;
                        i += 1;
                        if ( i >= parseInt(node.furbyConfig.newline)) {
                            var m = new Buffer(i);
                            buf.copy(m,0,0,i);
                            if (node.furbyConfig.bin !== "bin") { m = m.toString(); }
                            node.send({"payload":m});
                            m = null;
                            i = 0;
                        }
                    }
                    // look to match char...
                    else if (node.furbyConfig.out === "char") {
                        buf[i] = msg;
                        i += 1;
                        if ((msg === splitc[0]) || (i === bufMaxSize)) {
                            var n = new Buffer(i);
                            buf.copy(n,0,0,i);
                            if (node.furbyConfig.bin !== "bin") { n = n.toString(); }
                            node.send({"payload":n});
                            n = null;
                            i = 0;
                        }
                    }
                }
            });
            this.port.on('ready', function() {
                node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
            });
            this.port.on('closed', function() {
                node.status({fill:"red",shape:"ring",text:"node-red:common.status.not-connected"});
            });
        } else {
            this.error(RED._("serial.errors.missing-conf"));
        }

        this.on("close", function(done) {
            if (this.furbyConfig) {
                serialPool.close(this.furbyConfig.serialport,done);
            } else {
                done();
            }
        });
    }
    RED.nodes.registerType("furby-input",FurbyPiInputNode);

    // SerialPool holds the serial communication to the device
    var serialPool = (function() {
        var connections = {};
        return {
            get:function(port,baud,databits,parity,stopbits,newline,callback) {
                var id = port;
                if (!connections[id]) {
                    connections[id] = (function() {
                        var obj = {
                            _emitter: new events.EventEmitter(),
                            serial: null,
                            _closing: false,
                            tout: null,
                            on: function(a,b) { this._emitter.on(a,b); },
                            close: function(cb) { this.serial.close(cb); },
                            write: function(m,cb) { this.serial.write(m,cb); },
                        }
                        //newline = newline.replace("\\n","\n").replace("\\r","\r");
                        var olderr = "";
                        var setupSerial = function() {
                            obj.serial = new serialp.SerialPort(port,{
                                baudrate: baud,
                                databits: databits,
                                parity: parity,
                                stopbits: stopbits,
                                parser: serialp.parsers.raw
                            },true, function(err, results) {
                                if (err) {
                                    if (err.toString() !== olderr) {
                                        olderr = err.toString();
                                        RED.log.error(RED._("serial.errors.error",{port:port,error:olderr}));
                                    }
                                    obj.tout = setTimeout(function() {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('error', function(err) {
                                RED.log.error(RED._("serial.errors.error",{port:port,error:err.toString()}));
                                obj._emitter.emit('closed');
                                obj.tout = setTimeout(function() {
                                    setupSerial();
                                }, settings.serialReconnectTime);
                            });
                            obj.serial.on('close', function() {
                                if (!obj._closing) {
                                    RED.log.error(RED._("serial.errors.unexpected-close",{port:port}));
                                    obj._emitter.emit('closed');
                                    obj.tout = setTimeout(function() {
                                        setupSerial();
                                    }, settings.serialReconnectTime);
                                }
                            });
                            obj.serial.on('open',function() {
                                olderr = "";
                                RED.log.info(RED._("serial.onopen",{port:port,baud:baud,config: databits+""+parity.charAt(0).toUpperCase()+stopbits}));
                                if (obj.tout) { clearTimeout(obj.tout); }
                                //obj.serial.flush();
                                obj._emitter.emit('ready');
                            });
                            obj.serial.on('data',function(d) {
                                for (var z=0; z<d.length; z++) {
                                    obj._emitter.emit('data',d[z]);
                                }
                            });
                            obj.serial.on("disconnect",function() {
                                RED.log.error(RED._("serial.errors.disconnected",{port:port}));
                            });
                        }
                        setupSerial();
                        return obj;
                    }());
                }
                return connections[id];
            },
            close: function(port,done) {
                if (connections[port]) {
                    if (connections[port].tout != null) {
                        clearTimeout(connections[port].tout);
                    }
                    connections[port]._closing = true;
                    try {
                        connections[port].close(function() {
                            RED.log.info(RED._("serial.errors.closed",{port:port}));
                            done();
                        });
                    }
                    catch(err) { }
                    delete connections[port];
                } else {
                    done();
                }
            }
        }
    }());

    RED.httpAdmin.get("/serialports", RED.auth.needsPermission('serial.read'), function(req,res) {
        serialp.list(function (err, ports) {
            res.json(ports);
        });
    });
}
