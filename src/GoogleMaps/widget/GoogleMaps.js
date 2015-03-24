/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, google, window */
/*mendix */
/*
    GoogleMaps
    ========================

    @file      : GoogleMaps.js
    @version   : 4.0
    @author    : Pauline Oudeman
    @date      : Mon, 09 Mar 2015 07:44:24 GMT
    @copyright : 
    @license   : 

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
require([
    'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
    'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang', 'dojo/text',
    'dojo/text!GoogleMaps/widget/template/GoogleMaps.html'
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, domQuery, domProp, domGeom, domClass, domStyle, domConstruct, dojoArray, lang, text, widgetTemplate) {
    'use strict';

    // Declare widget's prototype.
    return declare('GoogleMaps.widget.GoogleMaps', [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // Parameters configured in the Modeler.

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handle: null,
        _contextObj: null,
        _googleMap: null,
        _markerCache: null,
        _googleScript: null,


        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {},

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + '.postCreate');
            window[this.id + "_mapsCallback"] = lang.hitch(this, function () {
                this._loadMap();
            });

            this._loadGoogle();
            this._setupEvents();
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            console.log(this.id + '.update');

            this._contextObj = obj;
            if (this._googleMap) {
                this._fetchMarkers();
            }
            
            if(this.gotocontext) {
                this._goToContext();
            }
            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {

        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {

        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {

        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            window[this.id + "_mapsCallback"] = null;

        },


        //Events
        _setupEvents: function () {

        },

        //Subscriptions
        _resetSubscriptions: function () {
            console.log(this.id + '_resetSubscriptions');
            // Release handle on previous object, if any.
            if (this._handle) {
                this.unsubscribe(this._handle);
                this._handle = null;
            }

            if (this._contextObj) {
                this._handle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._fetchMarkers();
                    })
                });
            }
        },


        //start Google and create the map
        _loadGoogle: function () {
            console.log(this.id + '_loadGoogle');
            if (!window.google) {
                this._googleScript = dom.create('script');
                this._googleScript.type = 'text/javascript';
                this._googleScript.src = 'https://maps.googleapis.com/maps/api/js?v=3&callback=' + this.id + '_mapsCallback';
                domConstruct.place(this._googleScript, this.domNode);
            } else {
                this._loadMap();
            }
        },

        //load the map
        _loadMap: function () {
            console.log(this.id + '_loadMap');
            domStyle.set(this.mapContainer, {
                height: this.mapHeight + 'px',
                width: this.mapwidth
            });

            this._googleMap = new google.maps.Map(this.mapContainer, {
                zoom: 11,
                center: new google.maps.LatLng(this.defaultLat, this.defaultLng),
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControlOption: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                }
            });
            if (this.gotocontext) {
                this._fetchMarkers();
            }

        },

        //Fetch markers
        _fetchMarkers: function () {
            console.log(this.id + '_fetchMarkers');
            if (this.updateRefresh) {
                this._fetchFromDB();
            } else {
                console.log('cache! ', this._markerCache);
                if (this._markerCache) {
                    this._fetchFromCache();
                } else {
                    this._fetchFromDB();
                }
            }
        },

        _fetchFromDB: function () {
            console.log(this.id + '_fetchFromDB');
            var xpath = '//' + this.mapEntity + this.xpathConstraint;
            this._removeAllMarkers();
            if (this._contextObj) {
                xpath = xpath.replace('[%CurrentObject%]', this._contextObj.getGuid());

                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, function (objs) {
                        var self = this;
                        dojoArray.forEach(objs, function (obj, index) {
                            self._addMarker(obj);
                        });
                    })
                });
            } else {
                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, function (objs) {
                        var self = this;
                        dojoArray.forEach(objs, function (obj, index) {
                            self._addMarker(obj);
                        });
                    })
                });
            }
        },

        _fetchFromCache: function () {
            console.log(this.id + '_fetchFromCache');
            var self = this,
                cached = false;

            this._removeAllMarkers();
            if (!this.gotocontext) {
                dojoArray.forEach(this._markerCache, function (marker) {
                    marker.setMap(self._googleMap);
                    if (self._contextObj.getGuid() === marker.id) {
                        cached = true;
                    }
                });
                //fetch from the database if not already cached.
                if (!cached) {
                    console.log('not cached yet');
                    this._fetchFromDB();
                }
            } else {
                if(this._markerCache.length === 0){
                    console.log('not cached yet');
                    this._fetchFromDB();
                }
                
                dojoArray.forEach(this._markerCache, function (marker) {
                    marker.setMap(self._googleMap);
                });
            }

        },

        _removeAllMarkers: function () {
            console.log(this.id + '_removeAllMarkers');
            if (this._markerCache) {
                dojoArray.forEach(this._markerCache, function (marker) {
                    marker.setMap(null);
                });
            }
        },

        //Add markers to the map
        _addMarker: function (obj) {
            console.log(this.id + '_addMarker');
            //Create a new google marker
            var id = this._contextObj ? this._contextObj.getGuid() : null,
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(obj.get(this.latAttr), obj.get(this.lngAttr)),
                    map: this._googleMap
                }),
                self = this,
                markerImageURL = null,
                url = null;

            //set id if available
            if (id) {
                marker.id = id;
            }

            //Set a title, if available
            if (this.markerDisplayAttr) {
                marker.setTitle(obj.get(this.markerDisplayAttr));
            }

            //Set marker image if available
            if (this.markerImages.length > 1) {
                dojoArray.forEach(this.markerImages, function (imageObj) {
                    if (imageObj.enumKey === obj.get(self.enumAttr)) {
                        markerImageURL = imageObj.enumImage;
                    }
                });
            }
            //set marker image
            if (markerImageURL) {
                marker.setIcon(markerImageURL);
            }

            //build cache
            if (!this._markerCache) {
                this._markerCache = [];
            }
            if (dojoArray.indexOf(this._markerCache, marker) === -1) {
                this._markerCache.push(marker);
            }
        },

        _goToContext: function () {
            console.log(this.id + '_goToContext');
            var self = this;
            if (this._googleMap && this._contextObj) {
                this._googleMap.panTo(new google.maps.LatLng(this._contextObj.get(this.latAttr), this._contextObj.get(this.lngAttr)));
            }
        }
    });
});