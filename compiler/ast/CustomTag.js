'use strict';

var HtmlElement = require('./HtmlElement');
var path = require('path');
var removeDashes = require('../util/removeDashes');

function removeExt(filename) {
    var ext = path.extname(filename);
    if (ext) {
        return filename.slice(0, 0 - ext.length);
    } else {
        return filename;
    }
}

function buildInputProps(node, context) {
    var inputProps = {};

    node.forEachAttribute((attr) => {
        var attrName = attr.name;

        var attrDef = attr.def || context.taglibLookup.getAttribute(node.tagName, attr.name);

        var propName;
        var parentPropName;

        if (attrDef.dynamicAttribute) {
            // Dynamic attributes are allowed attributes
            // that are not declared (i.e. "*" attributes)
            //
            if (attrDef.preserveName === false) {
                propName = removeDashes(attrName);
            } else {
                propName = attrName;
            }

            if (attrDef.targetProperty) {
                parentPropName = attrDef.targetProperty;
            }
        } else {
            // Attributes map to properties and we allow the taglib
            // author to control how an attribute name resolves
            // to a property name.
            if (attrDef.targetProperty) {
                propName = attrDef.targetProperty;
            } else if (attrDef.preserveName) {
                propName = attr.name;
            } else {
                propName = removeDashes(attr.name);
            }
        }

        if (parentPropName) {
            let parent = inputProps[parentPropName] = (inputProps[parentPropName] = {});
            parent[propName] = attr.value;
        } else {
            inputProps[propName] = attr.value;
        }
    });

    return context.builder.literal(inputProps);
}

class CustomTag extends HtmlElement {
    constructor(el, tagDef) {
        super(el);
        this.type = 'CustomTag';
        this.tagDef = tagDef;
    }

    generateCode(codegen) {
        var loadRendererVar = codegen.addStaticVar('__renderer', '__helpers.r');
        var tagVar = codegen.addStaticVar('__tag', '__helpers.t');

        var builder = codegen.builder;
        var context = codegen.context;

        var tagDef = this.tagDef;

        var rendererPath = tagDef.renderer;
        if (rendererPath) {
            let rendererRequirePath = context.getRequirePath(rendererPath);
            let requireRendererFunctionCall = builder.require(JSON.stringify(rendererRequirePath));
            let loadRendererFunctionCall = builder.functionCall(loadRendererVar, [ requireRendererFunctionCall ]);

            let rendererVar = codegen.addStaticVar(removeExt(rendererPath), loadRendererFunctionCall);
            var inputProps = buildInputProps(this, context);
            var tagArgs = [ 'out', rendererVar, inputProps ];
            var tagFunctionCall = builder.functionCall(tagVar, tagArgs);
            return tagFunctionCall;
        }
    }
}

module.exports = CustomTag;