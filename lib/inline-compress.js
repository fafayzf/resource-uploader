const path = require('path');
const gutil = require('gulp-util');
const through2 = require('through2-concurrent');
const htmlparser = require("htmlparser2");
const _ = require('lodash');
const cssnano = require('cssnano');
const uglify = require('uglify-js');
const crypto = require('crypto');
const fs = require('fs');
const babel = require('@babel/core');
const sass = require('node-sass');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const use = require('postcss-use');

const browsers = require('../package.json').browserslist;
const pxtoremDefault = require('../package.json').pxtorem;

const getHash = function(str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

const getStub = function(seed) {
  return '___inline_code$$$' + getHash(seed) + '$$$___';
};

RegExp.escape = function(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

module.exports = function() {
  const reScript = /<script(?:\s+?[^>]+?|[\s]*?)>[\s\S]*?<\/script>/ig;
  const reStyle = /<style(?:\s+?[^>]+?|[\s]*?)>[\s\S]*?<\/style>/ig;

  return through2.obj({ maxConcurrency: 8 }, function(file, enc, cb) {
    let contents;
    let element;
    let queue = [];

    if (file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      cb(new gutil.PluginError('Inline', 'Streaming not supported'));
      return;
    }

    //gutil.log(gutil.colors.green(file.path));

    contents = file.contents.toString();

    contents = contents.replace(reScript, function(content) {
      element = htmlparser.parseDOM(content)[0];

      if (!element || _.isString(element.attribs.src) || !element.children.length || (_.isString(element.attribs.type) && element.attribs.type != 'text/javascript')) {
        return content;
      }

      if (_.isString(element.attribs.nocompress)) {
        delete element.attribs.nocompress;
        return htmlparser.DomUtils.getOuterHTML(element);
      }

      if (element.children.length == 0) {
        return content;
      }

      let js = element.children[0].data;
      let result;

      js = js.trim();

      //console.log(js);

      try {
        try {
          let compileResult = babel.transform(js, {
            babelrc: false,
            compact: false,
            presets: [
              [
                require.resolve('@babel/preset-env'),
                {
                  targets: { browsers }
                }
              ]
            ]
          });

          if (compileResult.code) {
            js = compileResult.code;
          }
        }
        catch (e) {
        }

        result = uglify.minify(js, {
          ie8: true,
          compress: {
            drop_debugger: true,
            drop_console: true,
            warnings: true
          }
        });

        if (result.code) {
          element.children[0].data = result.code;
        }
        else {
          return content;
        }
      }
      catch (e) {
        return content;
      }

      return htmlparser.DomUtils.getOuterHTML(element);
    }).replace(reStyle, function(content) {
      element = htmlparser.parseDOM(content)[0];

      if (!element) {
        return content;
      }

      if (_.isString(element.attribs.nocompress)) {
        delete element.attribs.nocompress;
        return htmlparser.DomUtils.getOuterHTML(element);
      }

      if (element.children.length == 0) {
        return content;
      }

      const needCompile = (element.attribs.type == 'text/sass' || element.attribs.type == 'text/scss');
      const isSass = (element.attribs.type == 'text/sass');

      let css = element.children[0].data;

      css = css.trim();

      const hash = getHash(css);
      const name = getStub(content);

      if (needCompile) {
        try {
          const sassResult = sass.renderSync({
            data: css,
            indentedSyntax: isSass,
            includePaths: [file.base],
            outputStyle: 'expanded'
          });

          if (sassResult.css) {
            element.attribs.type = 'text/css';
            css = sassResult.css;
          }
        }
        catch (e) {
          gutil.log('Sass error: ', file.path, gutil.colors.red(e.message));
        }
      }

      queue.push({
        name: name,
        text: css,
        hash: hash
      });

      element.children[0].data = name;

      //console.log(htmlparser.DomUtils.getOuterHTML(element));

      return htmlparser.DomUtils.getOuterHTML(element);
    });


    let len = 0;
    let run = function() {
      postcss([use({
        modules: [ 'postcss-pxtorem' ],
        options: {
          'postcss-pxtorem': pxtoremDefault
        }
      }), cssnano({
        autoprefixer: false,
        zindex: false,
        reduceIdents: false,
        reduceTransforms: false
      }), autoprefixer({ browsers })]).process(queue[len].text, { from: undefined }).then(function(result) {
        contents = contents.replace(new RegExp(RegExp.escape(queue[len].name), 'g'), () => result.css);

        len++;
        if (len >= queue.length) {

          file.contents = new Buffer(contents);

          return cb(null, file);
        }
        else {
          run();
        }
      }, function() {
        contents = contents.replace(new RegExp(RegExp.escape(queue[len].name), 'g'), () => queue[len].text);

        len++;
        if (len >= queue.length) {

          file.contents = new Buffer(contents);

          return cb(null, file);
        }
        else {
          run();
        }
      });
    };

    if (queue.length > 0) {
      return run();
    }
    else {
      file.contents = new Buffer(contents);

      return cb(null, file);
    }
  });
};