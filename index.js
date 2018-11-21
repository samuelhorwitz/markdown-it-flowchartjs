'use strict';

var jsdom = require("jsdom");
var { JSDOM } = jsdom;

var dom = new JSDOM(``);
var win = dom.window;
var doc = win.document;
global.window = win;
global.document = doc;
global.navigator = win.navigator;

var flow = require('flowchart.js');

function flowchart_block(state, start, end, silent){
    var firstLine, lastLine, next, lastPos, found = false, token,
        pos = state.bMarks[start] + state.tShift[start],
        max = state.eMarks[start]

    if(pos + 8 > max){ return false; }
    if(state.src.slice(pos,pos+8)!=='::: flow'){ return false; }

    pos += 8;
    firstLine = state.src.slice(pos,max);

    if(silent){ return true; }
    if(firstLine.trim().slice(-3)===':::'){
        // Single line expression
        firstLine = firstLine.trim().slice(0, -3);
        found = true;
    }

    for(next = start; !found; ){

        next++;

        if(next >= end){ break; }

        pos = state.bMarks[next]+state.tShift[next];
        max = state.eMarks[next];

        if(pos < max && state.tShift[next] < state.blkIndent){
            // non-empty line with negative indent should stop the list:
            break;
        }

        if(state.src.slice(pos,max).trim().slice(-3)===':::'){
            lastPos = state.src.slice(0,max).lastIndexOf(':::');
            lastLine = state.src.slice(pos,lastPos);
            found = true;
        }

    }

    state.line = next + 1;

    token = state.push('flowchart_block', 'flowchart', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '')
    + state.getLines(start + 1, next, state.tShift[start], true)
    + (lastLine && lastLine.trim() ? lastLine : '');
    token.map = [ start, state.line ];
    token.markup = '::: flow';
    return true;
}

module.exports = function flowchart_plugin(md, options) {
    // Default options

    options = options || {};

    var flowchartBlock = function(code){
        try{
            var diagram = flowchart.parse(code);
            var div = document.createElement('div');
            div.id = 'flowchart-id-div';
            div.style.display = 'none';
            document.body.appendChild(div);
            diagram.drawSVG(div.id, options);
            var svg = div.innerHTML;
            div.parentNode.removeChild(div);
            return "<p>" + svg + "</p>";
        }
        catch(error){
            if(options.throwOnError){ console.log(error); }
            return code;
        }
    }

    var blockRenderer = function(tokens, idx){
        return flowchartBlock(tokens[idx].content) + '\n';
    }

    md.block.ruler.after('blockquote', 'flowchart_block', flowchart_block, {
        alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
    });
    md.renderer.rules.flowchart_block = blockRenderer;
};