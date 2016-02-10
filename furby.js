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

module.exports = function(RED) {
    "use strict";
    var FurbyPiBoard = require('./lib/FurbyBoard');

    // Furby Speak Output
    function FurbyPiSpeakOutputNode(config) {
    	// Create this node
        RED.nodes.createNode(this,config);
        
        // Retrieve the board-config node
       this.boardConfig = RED.nodes.getNode(config.board);
       this.format = config.format;
       this.filename = config.filename;
       this.log("Furby Pi Speak Output: Config:" + this.name +", Format:" + this.format);

       var node = this;

       if(node.boardConfig){
         // Board has been initialised
         if(!node.boardConfig.board){
           node.boardConfig.board = new FurbyPiBoard();
         }

         this.on('input', function(msg) {
              node.boardConfig.board.SpeakOutput(this.format, this.filename);
              node.log("Speak out Loud:" + this.filename);
          });

         this.on('close', function(done) {
         });

         node.boardConfig.board.init();

       } else {
         node.error("Node has no configuration!");
       }
    }
    RED.nodes.registerType("furby-speak",FurbyPiSpeakOutputNode);

    // FurbyPi Configuration Node 
    function FurbyPiConfigNode(n) {
       // Create this node
       RED.nodes.createNode(this,n);
       
       this.boardType = n.boardType;
       this.name = n.name;
       this.usedPins = [];
   }
   RED.nodes.registerType("furby-config",FurbyPiConfigNode);
}
