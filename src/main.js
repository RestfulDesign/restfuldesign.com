/*! Picturefill - v2.2.0 - 2014-10-30
* http://scottjehl.github.io/picturefill
* Copyright (c) 2014 https://github.com/scottjehl/picturefill/blob/master/Authors.txt; Licensed MIT */
/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license */

window.matchMedia || (window.matchMedia = function() {
  "use strict";

  // For browsers that support matchMedium api such as IE 9 and webkit
  var styleMedia = (window.styleMedia || window.media);

  // For those that don't support matchMedium
  if (!styleMedia) {
    var style       = document.createElement('style'),
      script      = document.getElementsByTagName('script')[0],
      info        = null;

    style.type  = 'text/css';
    style.id    = 'matchmediajs-test';

    script.parentNode.insertBefore(style, script);

    // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
    info = ('getComputedStyle' in window) && window.getComputedStyle(style, null) || style.currentStyle;

    styleMedia = {
      matchMedium: function(media) {
        var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

        // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
        if (style.styleSheet) {
          style.styleSheet.cssText = text;
        } else {
          style.textContent = text;
        }

        // Test if media query is true or false
        return info.width === '1px';
      }
    };
  }

  return function(media) {
    return {
      matches: styleMedia.matchMedium(media || 'all'),
      media: media || 'all'
    };
  };
}());
/*! Picturefill - Responsive Images that work today.
*  Author: Scott Jehl, Filament Group, 2012 ( new proposal implemented by Shawn Jansepar )
*  License: MIT/GPLv2
*  Spec: http://picture.responsiveimages.org/
*/
(function( w, doc, image ) {
  // Enable strict mode
  "use strict";

  // If picture is supported, well, that's awesome. Let's get outta here...
  if ( w.HTMLPictureElement ) {
    w.picturefill = function() { };
    return;
  }

  // HTML shim|v it for old IE (IE9 will still need the HTML video tag workaround)
  doc.createElement( "picture" );

  // local object for method references and testing exposure
  var pf = {};

  // namespace
  pf.ns = "picturefill";

  // srcset support test
  (function() {
    pf.srcsetSupported = "srcset" in image;
    pf.sizesSupported = "sizes" in image;
  })();

  // just a string trim workaround
  pf.trim = function( str ) {
    return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, "" );
  };

  // just a string endsWith workaround
  pf.endsWith = function( str, suffix ) {
    return str.endsWith ? str.endsWith( suffix ) : str.indexOf( suffix, str.length - suffix.length ) !== -1;
  };

  /**
   * Shortcut method for https://w3c.github.io/webappsec/specs/mixedcontent/#restricts-mixed-content ( for easy overriding in tests )
   */
  pf.restrictsMixedContent = function() {
    return w.location.protocol === "https:";
  };
  /**
   * Shortcut method for matchMedia ( for easy overriding in tests )
   */

  pf.matchesMedia = function( media ) {
    return w.matchMedia && w.matchMedia( media ).matches;
  };

  // Shortcut method for `devicePixelRatio` ( for easy overriding in tests )
  pf.getDpr = function() {
    return ( w.devicePixelRatio || 1 );
  };

  /**
   * Get width in css pixel value from a "length" value
   * http://dev.w3.org/csswg/css-values-3/#length-value
   */
  pf.getWidthFromLength = function( length ) {
    // If a length is specified and doesn’t contain a percentage, and it is greater than 0 or using `calc`, use it. Else, use the `100vw` default.
    length = length && length.indexOf( "%" ) > -1 === false && ( parseFloat( length ) > 0 || length.indexOf( "calc(" ) > -1 ) ? length : "100vw";

    /**
     * If length is specified in  `vw` units, use `%` instead since the div we’re measuring
     * is injected at the top of the document.
     *
     * TODO: maybe we should put this behind a feature test for `vw`?
     */
    length = length.replace( "vw", "%" );

    // Create a cached element for getting length value widths
    if ( !pf.lengthEl ) {
      pf.lengthEl = doc.createElement( "div" );

      // Positioning styles help prevent padding/margin/width on `html` or `body` from throwing calculations off.
      pf.lengthEl.style.cssText = "border:0;display:block;font-size:1em;left:0;margin:0;padding:0;position:absolute;visibility:hidden";
    }

    pf.lengthEl.style.width = length;

    doc.body.appendChild(pf.lengthEl);

    // Add a class, so that everyone knows where this element comes from
    pf.lengthEl.className = "helper-from-picturefill-js";

    if ( pf.lengthEl.offsetWidth <= 0 ) {
      // Something has gone wrong. `calc()` is in use and unsupported, most likely. Default to `100vw` (`100%`, for broader support.):
      pf.lengthEl.style.width = doc.documentElement.offsetWidth + "px";
    }

    var offsetWidth = pf.lengthEl.offsetWidth;

    doc.body.removeChild( pf.lengthEl );

    return offsetWidth;
  };

  // container of supported mime types that one might need to qualify before using
  pf.types =  {};

  // Add support for standard mime types
  pf.types[ "image/jpeg" ] = true;
  pf.types[ "image/gif" ] = true;
  pf.types[ "image/png" ] = true;

  // test svg support
  pf.types[ "image/svg+xml" ] = doc.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1");

  // test webp support, only when the markup calls for it
  pf.types[ "image/webp" ] = function() {
    // based on Modernizr's lossless img-webp test
    // note: asynchronous
    var type = "image/webp";

    image.onerror = function() {
      pf.types[ type ] = false;
      picturefill();
    };
    image.onload = function() {
      pf.types[ type ] = image.width === 1;
      picturefill();
    };
    image.src = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
  };

  /**
   * Takes a source element and checks if its type attribute is present and if so, supported
   * Note: for type tests that require a async logic,
   * you can define them as a function that'll run only if that type needs to be tested. Just make the test function call picturefill again when it is complete.
   * see the async webp test above for example
   */
  pf.verifyTypeSupport = function( source ) {
    var type = source.getAttribute( "type" );
    // if type attribute exists, return test result, otherwise return true
    if ( type === null || type === "" ) {
      return true;
    } else {
      // if the type test is a function, run it and return "pending" status. The function will rerun picturefill on pending elements once finished.
      if ( typeof( pf.types[ type ] ) === "function" ) {
        pf.types[ type ]();
        return "pending";
      } else {
        return pf.types[ type ];
      }
    }
  };

  // Parses an individual `size` and returns the length, and optional media query
  pf.parseSize = function( sourceSizeStr ) {
    var match = /(\([^)]+\))?\s*(.+)/g.exec( sourceSizeStr );
    return {
      media: match && match[1],
      length: match && match[2]
    };
  };

  // Takes a string of sizes and returns the width in pixels as a number
  pf.findWidthFromSourceSize = function( sourceSizeListStr ) {
    // Split up source size list, ie ( max-width: 30em ) 100%, ( max-width: 50em ) 50%, 33%
    //                            or (min-width:30em) calc(30% - 15px)
    var sourceSizeList = pf.trim( sourceSizeListStr ).split( /\s*,\s*/ ),
      winningLength;

    for ( var i = 0, len = sourceSizeList.length; i < len; i++ ) {
      // Match <media-condition>? length, ie ( min-width: 50em ) 100%
      var sourceSize = sourceSizeList[ i ],
        // Split "( min-width: 50em ) 100%" into separate strings
        parsedSize = pf.parseSize( sourceSize ),
        length = parsedSize.length,
        media = parsedSize.media;

      if ( !length ) {
        continue;
      }
      if ( !media || pf.matchesMedia( media ) ) {
        // if there is no media query or it matches, choose this as our winning length
        // and end algorithm
        winningLength = length;
        break;
      }
    }

    // pass the length to a method that can properly determine length
    // in pixels based on these formats: http://dev.w3.org/csswg/css-values-3/#length-value
    return pf.getWidthFromLength( winningLength );
  };

  pf.parseSrcset = function( srcset ) {
    /**
     * A lot of this was pulled from Boris Smus’ parser for the now-defunct WHATWG `srcset`
     * https://github.com/borismus/srcset-polyfill/blob/master/js/srcset-info.js
     *
     * 1. Let input (`srcset`) be the value passed to this algorithm.
     * 2. Let position be a pointer into input, initially pointing at the start of the string.
     * 3. Let raw candidates be an initially empty ordered list of URLs with associated
     *    unparsed descriptors. The order of entries in the list is the order in which entries
     *    are added to the list.
     */
    var candidates = [];

    while ( srcset !== "" ) {
      srcset = srcset.replace( /^\s+/g, "" );

      // 5. Collect a sequence of characters that are not space characters, and let that be url.
      var pos = srcset.search(/\s/g),
        url, descriptor = null;

      if ( pos !== -1 ) {
        url = srcset.slice( 0, pos );

        var last = url.slice(-1);

        // 6. If url ends with a U+002C COMMA character (,), remove that character from url
        // and let descriptors be the empty string. Otherwise, follow these substeps
        // 6.1. If url is empty, then jump to the step labeled descriptor parser.

        if ( last === "," || url === "" ) {
          url = url.replace( /,+$/, "" );
          descriptor = "";
        }
        srcset = srcset.slice( pos + 1 );

        // 6.2. Collect a sequence of characters that are not U+002C COMMA characters (,), and
        // let that be descriptors.
        if ( descriptor === null ) {
          var descpos = srcset.indexOf( "," );
          if ( descpos !== -1 ) {
            descriptor = srcset.slice( 0, descpos );
            srcset = srcset.slice( descpos + 1 );
          } else {
            descriptor = srcset;
            srcset = "";
          }
        }
      } else {
        url = srcset;
        srcset = "";
      }

      // 7. Add url to raw candidates, associated with descriptors.
      if ( url || descriptor ) {
        candidates.push({
          url: url,
          descriptor: descriptor
        });
      }
    }
    return candidates;
  };

  pf.parseDescriptor = function( descriptor, sizesattr ) {
    // 11. Descriptor parser: Let candidates be an initially empty source set. The order of entries in the list
    // is the order in which entries are added to the list.
    var sizes = sizesattr || "100vw",
      sizeDescriptor = descriptor && descriptor.replace( /(^\s+|\s+$)/g, "" ),
      widthInCssPixels = pf.findWidthFromSourceSize( sizes ),
      resCandidate;

      if ( sizeDescriptor ) {
        var splitDescriptor = sizeDescriptor.split(" ");

        for (var i = splitDescriptor.length - 1; i >= 0; i--) {
          var curr = splitDescriptor[ i ],
            lastchar = curr && curr.slice( curr.length - 1 );

          if ( ( lastchar === "h" || lastchar === "w" ) && !pf.sizesSupported ) {
            resCandidate = parseFloat( ( parseInt( curr, 10 ) / widthInCssPixels ) );
          } else if ( lastchar === "x" ) {
            var res = curr && parseFloat( curr, 10 );
            resCandidate = res && !isNaN( res ) ? res : 1;
          }
        }
      }
    return resCandidate || 1;
  };

  /**
   * Takes a srcset in the form of url/
   * ex. "images/pic-medium.png 1x, images/pic-medium-2x.png 2x" or
   *     "images/pic-medium.png 400w, images/pic-medium-2x.png 800w" or
   *     "images/pic-small.png"
   * Get an array of image candidates in the form of
   *      {url: "/foo/bar.png", resolution: 1}
   * where resolution is http://dev.w3.org/csswg/css-values-3/#resolution-value
   * If sizes is specified, resolution is calculated
   */
  pf.getCandidatesFromSourceSet = function( srcset, sizes ) {
    var candidates = pf.parseSrcset( srcset ),
      formattedCandidates = [];

    for ( var i = 0, len = candidates.length; i < len; i++ ) {
      var candidate = candidates[ i ];

      formattedCandidates.push({
        url: candidate.url,
        resolution: pf.parseDescriptor( candidate.descriptor, sizes )
      });
    }
    return formattedCandidates;
  };

  /**
   * if it's an img element and it has a srcset property,
   * we need to remove the attribute so we can manipulate src
   * (the property's existence infers native srcset support, and a srcset-supporting browser will prioritize srcset's value over our winning picture candidate)
   * this moves srcset's value to memory for later use and removes the attr
   */
  pf.dodgeSrcset = function( img ) {
    if ( img.srcset ) {
      img[ pf.ns ].srcset = img.srcset;
      img.removeAttribute( "srcset" );
    }
  };

  // Accept a source or img element and process its srcset and sizes attrs
  pf.processSourceSet = function( el ) {
    var srcset = el.getAttribute( "srcset" ),
      sizes = el.getAttribute( "sizes" ),
      candidates = [];

    // if it's an img element, use the cached srcset property (defined or not)
    if ( el.nodeName.toUpperCase() === "IMG" && el[ pf.ns ] && el[ pf.ns ].srcset ) {
      srcset = el[ pf.ns ].srcset;
    }

    if ( srcset ) {
      candidates = pf.getCandidatesFromSourceSet( srcset, sizes );
    }
    return candidates;
  };

  pf.applyBestCandidate = function( candidates, picImg ) {
    var candidate,
      length,
      bestCandidate;

    candidates.sort( pf.ascendingSort );

    length = candidates.length;
    bestCandidate = candidates[ length - 1 ];

    for ( var i = 0; i < length; i++ ) {
      candidate = candidates[ i ];
      if ( candidate.resolution >= pf.getDpr() ) {
        bestCandidate = candidate;
        break;
      }
    }

    if ( bestCandidate && !pf.endsWith( picImg.src, bestCandidate.url ) ) {
      if ( pf.restrictsMixedContent() && bestCandidate.url.substr(0, "http:".length).toLowerCase() === "http:" ) {
        if ( typeof console !== undefined ) {
          console.warn( "Blocked mixed content image " + bestCandidate.url );
        }
      } else {
        picImg.src = bestCandidate.url;
        // currentSrc attribute and property to match
        // http://picture.responsiveimages.org/#the-img-element
        picImg.currentSrc = picImg.src;

        var style = picImg.style || {},
          WebkitBackfaceVisibility = "webkitBackfaceVisibility" in style,
          currentZoom = style.zoom;

        if (WebkitBackfaceVisibility) { // See: https://github.com/scottjehl/picturefill/issues/332
          style.zoom = ".999";

          WebkitBackfaceVisibility = picImg.offsetWidth;

          style.zoom = currentZoom;
        }
      }
    }
  };

  pf.ascendingSort = function( a, b ) {
    return a.resolution - b.resolution;
  };

  /**
   * In IE9, <source> elements get removed if they aren't children of
   * video elements. Thus, we conditionally wrap source elements
   * using <!--[if IE 9]><video style="display: none;"><![endif]-->
   * and must account for that here by moving those source elements
   * back into the picture element.
   */
  pf.removeVideoShim = function( picture ) {
    var videos = picture.getElementsByTagName( "video" );
    if ( videos.length ) {
      var video = videos[ 0 ],
        vsources = video.getElementsByTagName( "source" );
      while ( vsources.length ) {
        picture.insertBefore( vsources[ 0 ], video );
      }
      // Remove the video element once we're finished removing its children
      video.parentNode.removeChild( video );
    }
  };

  /**
   * Find all `img` elements, and add them to the candidate list if they have
   * a `picture` parent, a `sizes` attribute in basic `srcset` supporting browsers,
   * a `srcset` attribute at all, and they haven’t been evaluated already.
   */
  pf.getAllElements = function() {
    var elems = [],
      imgs = doc.getElementsByTagName( "img" );

    for ( var h = 0, len = imgs.length; h < len; h++ ) {
      var currImg = imgs[ h ];

      if ( currImg.parentNode.nodeName.toUpperCase() === "PICTURE" ||
      ( currImg.getAttribute( "srcset" ) !== null ) || currImg[ pf.ns ] && currImg[ pf.ns ].srcset !== null ) {
        elems.push( currImg );
      }
    }
    return elems;
  };

  pf.getMatch = function( img, picture ) {
    var sources = picture.childNodes,
      match;

    // Go through each child, and if they have media queries, evaluate them
    for ( var j = 0, slen = sources.length; j < slen; j++ ) {
      var source = sources[ j ];

      // ignore non-element nodes
      if ( source.nodeType !== 1 ) {
        continue;
      }

      // Hitting the `img` element that started everything stops the search for `sources`.
      // If no previous `source` matches, the `img` itself is evaluated later.
      if ( source === img ) {
        return match;
      }

      // ignore non-`source` nodes
      if ( source.nodeName.toUpperCase() !== "SOURCE" ) {
        continue;
      }
      // if it's a source element that has the `src` property set, throw a warning in the console
      if ( source.getAttribute( "src" ) !== null && typeof console !== undefined ) {
        console.warn("The `src` attribute is invalid on `picture` `source` element; instead, use `srcset`.");
      }

      var media = source.getAttribute( "media" );

      // if source does not have a srcset attribute, skip
      if ( !source.getAttribute( "srcset" ) ) {
        continue;
      }

      // if there's no media specified, OR w.matchMedia is supported
      if ( ( !media || pf.matchesMedia( media ) ) ) {
        var typeSupported = pf.verifyTypeSupport( source );

        if ( typeSupported === true ) {
          match = source;
          break;
        } else if ( typeSupported === "pending" ) {
          return false;
        }
      }
    }

    return match;
  };

  function picturefill( opt ) {
    var elements,
      element,
      parent,
      firstMatch,
      candidates,
      options = opt || {};

    elements = options.elements || pf.getAllElements();

    // Loop through all elements
    for ( var i = 0, plen = elements.length; i < plen; i++ ) {
      element = elements[ i ];
      parent = element.parentNode;
      firstMatch = undefined;
      candidates = undefined;

      // immediately skip non-`img` nodes
      if ( element.nodeName.toUpperCase() !== "IMG" ) {
        continue;
      }

      // expando for caching data on the img
      if ( !element[ pf.ns ] ) {
        element[ pf.ns ] = {};
      }

      // if the element has already been evaluated, skip it unless
      // `options.reevaluate` is set to true ( this, for example,
      // is set to true when running `picturefill` on `resize` ).
      if ( !options.reevaluate && element[ pf.ns ].evaluated ) {
        continue;
      }

      // if `img` is in a `picture` element
      if ( parent.nodeName.toUpperCase() === "PICTURE" ) {

        // IE9 video workaround
        pf.removeVideoShim( parent );

        // return the first match which might undefined
        // returns false if there is a pending source
        // TODO the return type here is brutal, cleanup
        firstMatch = pf.getMatch( element, parent );

        // if any sources are pending in this picture due to async type test(s)
        // remove the evaluated attr and skip for now ( the pending test will
        // rerun picturefill on this element when complete)
        if ( firstMatch === false ) {
          continue;
        }
      } else {
        firstMatch = undefined;
      }

      // Cache and remove `srcset` if present and we’re going to be doing `picture`/`srcset`/`sizes` polyfilling to it.
      if ( parent.nodeName.toUpperCase() === "PICTURE" ||
      ( element.srcset && !pf.srcsetSupported ) ||
      ( !pf.sizesSupported && ( element.srcset && element.srcset.indexOf("w") > -1 ) ) ) {
        pf.dodgeSrcset( element );
      }

      if ( firstMatch ) {
        candidates = pf.processSourceSet( firstMatch );
        pf.applyBestCandidate( candidates, element );
      } else {
        // No sources matched, so we’re down to processing the inner `img` as a source.
        candidates = pf.processSourceSet( element );

        if ( element.srcset === undefined || element[ pf.ns ].srcset ) {
          // Either `srcset` is completely unsupported, or we need to polyfill `sizes` functionality.
          pf.applyBestCandidate( candidates, element );
        } // Else, resolution-only `srcset` is supported natively.
      }

      // set evaluated to true to avoid unnecessary reparsing
      element[ pf.ns ].evaluated = true;
    }
  }

  /**
   * Sets up picture polyfill by polling the document and running
   * the polyfill every 250ms until the document is ready.
   * Also attaches picturefill on resize
   */
  function runPicturefill() {
    picturefill();
    var intervalId = setInterval( function() {
      // When the document has finished loading, stop checking for new images
      // https://github.com/ded/domready/blob/master/ready.js#L15
      picturefill();
      if ( /^loaded|^i|^c/.test( doc.readyState ) ) {
        clearInterval( intervalId );
        return;
      }
    }, 250 );

    function checkResize() {
      var resizeThrottle;

      if ( !w._picturefillWorking ) {
        w._picturefillWorking = true;
        w.clearTimeout( resizeThrottle );
        resizeThrottle = w.setTimeout( function() {
          picturefill({ reevaluate: true });
          w._picturefillWorking = false;
        }, 60 );
      }
    }

    if ( w.addEventListener ) {
      w.addEventListener( "resize", checkResize, false );
    } else if ( w.attachEvent ) {
      w.attachEvent( "onresize", checkResize );
    }
  }

  runPicturefill();

  /* expose methods for testing */
  picturefill._ = pf;

  /* expose picturefill */
  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // CommonJS, just export
    module.exports = picturefill;
  } else if ( typeof define === "function" && define.amd ) {
    // AMD support
    define( function() { return picturefill; } );
  } else if ( typeof w === "object" ) {
    // If no AMD and we are in the browser, attach to window
    w.picturefill = picturefill;
  }

} )( this, this.document, new this.Image() );

/*!
 * verge 1.9.1+201402130803
 * https://github.com/ryanve/verge
 * MIT License 2013 Ryan Van Etten
 */

(function(root, name, make) {
  if (typeof module != 'undefined' && module['exports']) module['exports'] = make();
  else root[name] = make();
}(this, 'verge', function() {

  var xports = {}
    , win = typeof window != 'undefined' && window
    , doc = typeof document != 'undefined' && document
    , docElem = doc && doc.documentElement
    , matchMedia = win['matchMedia'] || win['msMatchMedia']
    , mq = matchMedia ? function(q) {
        return !!matchMedia.call(win, q).matches;
      } : function() {
        return false;
      }
    , viewportW = xports['viewportW'] = function() {
        var a = docElem['clientWidth'], b = win['innerWidth'];
        return a < b ? b : a;
      }
    , viewportH = xports['viewportH'] = function() {
        var a = docElem['clientHeight'], b = win['innerHeight'];
        return a < b ? b : a;
      };

  /**
   * Test if a media query is active. Like Modernizr.mq
   * @since 1.6.0
   * @return {boolean}
   */
  xports['mq'] = mq;

  /**
   * Normalized matchMedia
   * @since 1.6.0
   * @return {MediaQueryList|Object}
   */
  xports['matchMedia'] = matchMedia ? function() {
    // matchMedia must be binded to window
    return matchMedia.apply(win, arguments);
  } : function() {
    // Gracefully degrade to plain object
    return {};
  };

  /**
   * @since 1.8.0
   * @return {{width:number, height:number}}
   */
  function viewport() {
    return {'width':viewportW(), 'height':viewportH()};
  }
  xports['viewport'] = viewport;

  /**
   * Cross-browser window.scrollX
   * @since 1.0.0
   * @return {number}
   */
  xports['scrollX'] = function() {
    return win.pageXOffset || docElem.scrollLeft;
  };

  /**
   * Cross-browser window.scrollY
   * @since 1.0.0
   * @return {number}
   */
  xports['scrollY'] = function() {
    return win.pageYOffset || docElem.scrollTop;
  };

  /**
   * @param {{top:number, right:number, bottom:number, left:number}} coords
   * @param {number=} cushion adjustment
   * @return {Object}
   */
  function calibrate(coords, cushion) {
    var o = {};
    cushion = +cushion || 0;
    o['width'] = (o['right'] = coords['right'] + cushion) - (o['left'] = coords['left'] - cushion);
    o['height'] = (o['bottom'] = coords['bottom'] + cushion) - (o['top'] = coords['top'] - cushion);
    return o;
  }

  /**
   * Cross-browser element.getBoundingClientRect plus optional cushion.
   * Coords are relative to the top-left corner of the viewport.
   * @since 1.0.0
   * @param {Element|Object} el element or stack (uses first item)
   * @param {number=} cushion +/- pixel adjustment amount
   * @return {Object|boolean}
   */
  function rectangle(el, cushion) {
    el = el && !el.nodeType ? el[0] : el;
    if (!el || 1 !== el.nodeType) return false;
    return calibrate(el.getBoundingClientRect(), cushion);
  }
  xports['rectangle'] = rectangle;

  /**
   * Get the viewport aspect ratio (or the aspect ratio of an object or element)
   * @since 1.7.0
   * @param {(Element|Object)=} o optional object with width/height props or methods
   * @return {number}
   * @link http://w3.org/TR/css3-mediaqueries/#orientation
   */
  function aspect(o) {
    o = null == o ? viewport() : 1 === o.nodeType ? rectangle(o) : o;
    var h = o['height'], w = o['width'];
    h = typeof h == 'function' ? h.call(o) : h;
    w = typeof w == 'function' ? w.call(o) : w;
    return w/h;
  }
  xports['aspect'] = aspect;

  /**
   * Test if an element is in the same x-axis section as the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */
  xports['inX'] = function(el, cushion) {
    var r = rectangle(el, cushion);
    return !!r && r.right >= 0 && r.left <= viewportW();
  };

  /**
   * Test if an element is in the same y-axis section as the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */
  xports['inY'] = function(el, cushion) {
    var r = rectangle(el, cushion);
    return !!r && r.bottom >= 0 && r.top <= viewportH();
  };

  /**
   * Test if an element is in the viewport.
   * @since 1.0.0
   * @param {Element|Object} el
   * @param {number=} cushion
   * @return {boolean}
   */
  xports['inViewport'] = function(el, cushion) {
    // Equiv to `inX(el, cushion) && inY(el, cushion)` but just manually do both
    // to avoid calling rectangle() twice. It gzips just as small like this.
    var r = rectangle(el, cushion);
    return !!r && r.bottom >= 0 && r.right >= 0 && r.top <= viewportH() && r.left <= viewportW();
  };

  return xports;
}));
(function() {
  var MutationObserver, Util, WeakMap, getComputedStyle, getComputedStyleRX,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  Util = (function() {
    function Util() {}

    Util.prototype.extend = function(custom, defaults) {
      var key, value;
      for (key in defaults) {
        value = defaults[key];
        if (custom[key] == null) {
          custom[key] = value;
        }
      }
      return custom;
    };

    Util.prototype.isMobile = function(agent) {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(agent);
    };

    Util.prototype.addEvent = function(elem, event, fn) {
      if (elem.addEventListener != null) {
        return elem.addEventListener(event, fn, false);
      } else if (elem.attachEvent != null) {
        return elem.attachEvent("on" + event, fn);
      } else {
        return elem[event] = fn;
      }
    };

    Util.prototype.removeEvent = function(elem, event, fn) {
      if (elem.removeEventListener != null) {
        return elem.removeEventListener(event, fn, false);
      } else if (elem.detachEvent != null) {
        return elem.detachEvent("on" + event, fn);
      } else {
        return delete elem[event];
      }
    };

    Util.prototype.innerHeight = function() {
      if ('innerHeight' in window) {
        return window.innerHeight;
      } else {
        return document.documentElement.clientHeight;
      }
    };

    return Util;

  })();

  WeakMap = this.WeakMap || this.MozWeakMap || (WeakMap = (function() {
    function WeakMap() {
      this.keys = [];
      this.values = [];
    }

    WeakMap.prototype.get = function(key) {
      var i, item, _i, _len, _ref;
      _ref = this.keys;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        item = _ref[i];
        if (item === key) {
          return this.values[i];
        }
      }
    };

    WeakMap.prototype.set = function(key, value) {
      var i, item, _i, _len, _ref;
      _ref = this.keys;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        item = _ref[i];
        if (item === key) {
          this.values[i] = value;
          return;
        }
      }
      this.keys.push(key);
      return this.values.push(value);
    };

    return WeakMap;

  })());

  MutationObserver = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (MutationObserver = (function() {
    function MutationObserver() {
      if (typeof console !== "undefined" && console !== null) {
        console.warn('MutationObserver is not supported by your browser.');
      }
      if (typeof console !== "undefined" && console !== null) {
        console.warn('WOW.js cannot detect dom mutations, please call .sync() after loading new content.');
      }
    }

    MutationObserver.notSupported = true;

    MutationObserver.prototype.observe = function() {};

    return MutationObserver;

  })());

  getComputedStyle = this.getComputedStyle || function(el, pseudo) {
    this.getPropertyValue = function(prop) {
      var _ref;
      if (prop === 'float') {
        prop = 'styleFloat';
      }
      if (getComputedStyleRX.test(prop)) {
        prop.replace(getComputedStyleRX, function(_, _char) {
          return _char.toUpperCase();
        });
      }
      return ((_ref = el.currentStyle) != null ? _ref[prop] : void 0) || null;
    };
    return this;
  };

  getComputedStyleRX = /(\-([a-z]){1})/g;

  this.WOW = (function() {
    WOW.prototype.defaults = {
      boxClass: 'wow',
      animateClass: 'animated',
      offset: 0,
      mobile: true,
      live: true,
      callback: null
    };

    function WOW(options) {
      if (options == null) {
        options = {};
      }
      this.scrollCallback = __bind(this.scrollCallback, this);
      this.scrollHandler = __bind(this.scrollHandler, this);
      this.start = __bind(this.start, this);
      this.scrolled = true;
      this.config = this.util().extend(options, this.defaults);
      this.animationNameCache = new WeakMap();
    }

    WOW.prototype.init = function() {
      var _ref;
      this.element = window.document.documentElement;
      if ((_ref = document.readyState) === "interactive" || _ref === "complete") {
        this.start();
      } else {
        this.util().addEvent(document, 'DOMContentLoaded', this.start);
      }
      return this.finished = [];
    };

    WOW.prototype.start = function() {
      var box, _i, _len, _ref;
      this.stopped = false;
      this.boxes = (function() {
        var _i, _len, _ref, _results;
        _ref = this.element.querySelectorAll("." + this.config.boxClass);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          box = _ref[_i];
          _results.push(box);
        }
        return _results;
      }).call(this);
      this.all = (function() {
        var _i, _len, _ref, _results;
        _ref = this.boxes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          box = _ref[_i];
          _results.push(box);
        }
        return _results;
      }).call(this);
      if (this.boxes.length) {
        if (this.disabled()) {
          this.resetStyle();
        } else {
          _ref = this.boxes;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            box = _ref[_i];
            this.applyStyle(box, true);
          }
        }
      }
      if (!this.disabled()) {
        this.util().addEvent(window, 'scroll', this.scrollHandler);
        this.util().addEvent(window, 'resize', this.scrollHandler);
        this.interval = setInterval(this.scrollCallback, 50);
      }
      if (this.config.live) {
        return new MutationObserver((function(_this) {
          return function(records) {
            var node, record, _j, _len1, _results;
            _results = [];
            for (_j = 0, _len1 = records.length; _j < _len1; _j++) {
              record = records[_j];
              _results.push((function() {
                var _k, _len2, _ref1, _results1;
                _ref1 = record.addedNodes || [];
                _results1 = [];
                for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
                  node = _ref1[_k];
                  _results1.push(this.doSync(node));
                }
                return _results1;
              }).call(_this));
            }
            return _results;
          };
        })(this)).observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    WOW.prototype.stop = function() {
      this.stopped = true;
      this.util().removeEvent(window, 'scroll', this.scrollHandler);
      this.util().removeEvent(window, 'resize', this.scrollHandler);
      if (this.interval != null) {
        return clearInterval(this.interval);
      }
    };

    WOW.prototype.sync = function(element) {
      if (MutationObserver.notSupported) {
        return this.doSync(this.element);
      }
    };

    WOW.prototype.doSync = function(element) {
      var box, _i, _len, _ref, _results;
      if (element == null) {
        element = this.element;
      }
      if (element.nodeType !== 1) {
        return;
      }
      element = element.parentNode || element;
      _ref = element.querySelectorAll("." + this.config.boxClass);
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        box = _ref[_i];
        if (__indexOf.call(this.all, box) < 0) {
          this.boxes.push(box);
          this.all.push(box);
          if (this.stopped || this.disabled()) {
            this.resetStyle();
          } else {
            this.applyStyle(box, true);
          }
          _results.push(this.scrolled = true);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    WOW.prototype.show = function(box) {
      this.applyStyle(box);
      box.className = "" + box.className + " " + this.config.animateClass;
      if (this.config.callback != null) {
        return this.config.callback(box);
      }
    };

    WOW.prototype.applyStyle = function(box, hidden) {
      var delay, duration, iteration;
      duration = box.getAttribute('data-wow-duration');
      delay = box.getAttribute('data-wow-delay');
      iteration = box.getAttribute('data-wow-iteration');
      return this.animate((function(_this) {
        return function() {
          return _this.customStyle(box, hidden, duration, delay, iteration);
        };
      })(this));
    };

    WOW.prototype.animate = (function() {
      if ('requestAnimationFrame' in window) {
        return function(callback) {
          return window.requestAnimationFrame(callback);
        };
      } else {
        return function(callback) {
          return callback();
        };
      }
    })();

    WOW.prototype.resetStyle = function() {
      var box, _i, _len, _ref, _results;
      _ref = this.boxes;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        box = _ref[_i];
        _results.push(box.style.visibility = 'visible');
      }
      return _results;
    };

    WOW.prototype.customStyle = function(box, hidden, duration, delay, iteration) {
      if (hidden) {
        this.cacheAnimationName(box);
      }
      box.style.visibility = hidden ? 'hidden' : 'visible';
      if (duration) {
        this.vendorSet(box.style, {
          animationDuration: duration
        });
      }
      if (delay) {
        this.vendorSet(box.style, {
          animationDelay: delay
        });
      }
      if (iteration) {
        this.vendorSet(box.style, {
          animationIterationCount: iteration
        });
      }
      this.vendorSet(box.style, {
        animationName: hidden ? 'none' : this.cachedAnimationName(box)
      });
      return box;
    };

    WOW.prototype.vendors = ["moz", "webkit"];

    WOW.prototype.vendorSet = function(elem, properties) {
      var name, value, vendor, _results;
      _results = [];
      for (name in properties) {
        value = properties[name];
        elem["" + name] = value;
        _results.push((function() {
          var _i, _len, _ref, _results1;
          _ref = this.vendors;
          _results1 = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            vendor = _ref[_i];
            _results1.push(elem["" + vendor + (name.charAt(0).toUpperCase()) + (name.substr(1))] = value);
          }
          return _results1;
        }).call(this));
      }
      return _results;
    };

    WOW.prototype.vendorCSS = function(elem, property) {
      var result, style, vendor, _i, _len, _ref;
      style = getComputedStyle(elem);
      result = style.getPropertyCSSValue(property);
      _ref = this.vendors;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        vendor = _ref[_i];
        result = result || style.getPropertyCSSValue("-" + vendor + "-" + property);
      }
      return result;
    };

    WOW.prototype.animationName = function(box) {
      var animationName;
      try {
        animationName = this.vendorCSS(box, 'animation-name').cssText;
      } catch (_error) {
        animationName = getComputedStyle(box).getPropertyValue('animation-name');
      }
      if (animationName === 'none') {
        return '';
      } else {
        return animationName;
      }
    };

    WOW.prototype.cacheAnimationName = function(box) {
      return this.animationNameCache.set(box, this.animationName(box));
    };

    WOW.prototype.cachedAnimationName = function(box) {
      return this.animationNameCache.get(box);
    };

    WOW.prototype.scrollHandler = function() {
      return this.scrolled = true;
    };

    WOW.prototype.scrollCallback = function() {
      var box;
      if (this.scrolled) {
        this.scrolled = false;
        this.boxes = (function() {
          var _i, _len, _ref, _results;
          _ref = this.boxes;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            box = _ref[_i];
            if (!(box)) {
              continue;
            }
            if (this.isVisible(box)) {
              this.show(box);
              continue;
            }
            _results.push(box);
          }
          return _results;
        }).call(this);
        if (!(this.boxes.length || this.config.live)) {
          return this.stop();
        }
      }
    };

    WOW.prototype.offsetTop = function(element) {
      var top;
      while (element.offsetTop === void 0) {
        element = element.parentNode;
      }
      top = element.offsetTop;
      while (element = element.offsetParent) {
        top += element.offsetTop;
      }
      return top;
    };

    WOW.prototype.isVisible = function(box) {
      var bottom, offset, top, viewBottom, viewTop;
      offset = box.getAttribute('data-wow-offset') || this.config.offset;
      viewTop = window.pageYOffset;
      viewBottom = viewTop + Math.min(this.element.clientHeight, this.util().innerHeight()) - offset;
      top = this.offsetTop(box);
      bottom = top + box.clientHeight;
      return top <= viewBottom && bottom >= viewTop;
    };

    WOW.prototype.util = function() {
      return this._util != null ? this._util : this._util = new Util();
    };

    WOW.prototype.disabled = function() {
      return !this.config.mobile && this.util().isMobile(navigator.userAgent);
    };

    return WOW;

  })();

}).call(this);
/*!
 * Site code
 */
new WOW().init();
