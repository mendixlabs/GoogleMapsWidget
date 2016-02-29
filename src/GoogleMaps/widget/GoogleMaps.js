/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, google, window */

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text!GoogleMaps/widget/template/GoogleMaps.html",
    "GoogleMaps/lib/jsapi"
], function (declare, _WidgetBase, _TemplatedMixin, domStyle, domConstruct, dojoArray, lang, widgetTemplate) {
    "use strict";

    return declare("GoogleMaps.widget.GoogleMaps", [_WidgetBase, _TemplatedMixin], {
        templateString: widgetTemplate,

        _handle: null,
        _contextObj: null,
        _googleMap: null,
        _markerCache: null,
        _googleScript: null,
        _defaultPosition: null,

        postCreate: function () {
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");
            this._contextObj = obj;
            this._resetSubscriptions();

            if (!google) {
                console.warn("Google JSAPI is not loaded, exiting!");
                callback();
                return;
            }

            if (!google.maps) {
                logger.debug(this.id + ".update load Google maps");
                var params = (this.apiAccessKey !== "") ? "key=" + this.ApiAccessKey : "";
                if (google.loader && google.loader.Secure === false) {
                    google.loader.Secure = true;
                }
                google.load("maps", 3, {
                    other_params: params,
                    callback: lang.hitch(this, function () {
                        logger.debug(this.id + ".update load Google maps callback");
                        this._loadMap(callback);
                    })
                });
            } else {
                if (this._googleMap) {
                    logger.debug(this.id + ".update has _googleMap");
                    this._fetchMarkers(callback);
                    google.maps.event.trigger(this._googleMap, "resize");
                } else {
                    logger.debug(this.id + ".update has no _googleMap");
                    this._loadMap(callback);
                }
            }
        },

        resize: function (box) {
            logger.debug(this.id + ".resize");
            if (this._googleMap) {
                google.maps.event.trigger(this._googleMap, "resize");
            }
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            if (this._handle) {
                logger.debug(this.id + "._resetSubscriptions unsubscribe", this._handle);
                this.unsubscribe(this._handle);
                this._handle = null;
            }

            if (this._contextObj) {
                logger.debug(this.id + "._resetSubscriptions subscribe", this._contextObj.getGuid());
                this._handle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        this._fetchMarkers();
                    })
                });
            }
        },

        _loadMap: function (callback) {
            logger.debug(this.id + "._loadMap");
            domStyle.set(this.mapContainer, {
                height: this.mapHeight + "px",
                width: this.mapWidth
            });

            this._defaultPosition = new google.maps.LatLng(this.defaultLat, this.defaultLng);
			var mapOptions = {
                zoom: 11,
                center: this._defaultPosition,
                mapTypeId: google.maps.MapTypeId[this.defaultMapType] || google.maps.MapTypeId.ROADMAP,
                mapTypeControlOption: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                }
			};
			if(this.styleArray != ''){
				mapOptions.styles = JSON.parse(this.styleArray);
			}
			
            this._googleMap = new google.maps.Map(this.mapContainer, mapOptions);

            this._fetchMarkers(callback);
        },

        _fetchMarkers: function (callback) {
            logger.debug(this.id + "._fetchMarkers");
            if (this.gotocontext) {
                this._goToContext(callback);
            } else {
                if (this.updateRefresh) {
                    this._fetchFromDB(callback);
                } else {
                    if (this._markerCache) {
                        this._fetchFromCache(callback);
                    } else {
                        this._fetchFromDB(callback);
                    }
                }
            }
        },

        _refreshMap: function (objs, callback) {
            logger.debug(this.id + "._refreshMap");
            var bounds = new google.maps.LatLngBounds(),
                panPosition = this._defaultPosition,
                validCount = 0;

            dojoArray.forEach(objs, lang.hitch(this, function (obj) {
                this._addMarker(obj);

                var position = this._getLatLng(obj);
                if (position) {
                    bounds.extend(position);
                    validCount++;
                    panPosition = position;
                } else {
                    logger.error(this.id + ": " + "Incorrect coordinates (" + this.checkAttrForDecimal(obj, this.latAttr) +
                                  "," + this.checkAttrForDecimal(obj, this.lngAttr) + ")");
                }
            }));

            if (validCount < 2) {
                this._googleMap.setZoom(this.lowestZoom);
                this._googleMap.panTo(panPosition);
            } else {
                this._googleMap.fitBounds(bounds);
            }

            if (typeof callback === "function") {
                callback();
            }
        },

        _fetchFromDB: function (callback) {
            logger.debug(this.id + "._fetchFromDB");
            var xpath = "//" + this.mapEntity + this.xpathConstraint;

            this._removeAllMarkers();
            if (this._contextObj) {
                xpath = xpath.replace("[%CurrentObject%]", this._contextObj.getGuid());
                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, function (objs) {
                        this._refreshMap(objs, callback);
                    })
                });
            } else if (!this._contextObj && (xpath.indexOf("[%CurrentObject%]") > -1)) {
                console.warn("No context for xpath, not fetching.");
                if (typeof callback === "function") {
                    callback();
                }
            } else {
                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, function (objs) {
                        this._refreshMap(objs, callback);
                    })
                });
            }
        },

        _fetchFromCache: function (callback) {
            logger.debug(this.id + "._fetchFromCache");
            var cached = false,
                bounds = new google.maps.LatLngBounds();

            this._removeAllMarkers();

            dojoArray.forEach(this._markerCache, lang.hitch(this, function (marker, index) {
                if (this._contextObj) {
                    if (marker.id === this._contextObj.getGuid()) {
                        marker.setMap(this._googleMap);
                        bounds.extend(marker.position);
                        cached = true;
                    }
                } else {
                    marker.setMap(this._googleMap);
                }
                if (index === this._markerCache.length - 1) {
                    this._googleMap.fitBounds(bounds);
                }
            }));

            if (!cached) {
                this._fetchFromDB(callback);
            } else if (typeof callback === "function") {
                callback();
            }
        },

        _removeAllMarkers: function () {
            logger.debug(this.id + "._removeAllMarkers");
            if (this._markerCache) {
                dojoArray.forEach(this._markerCache, function (marker) {
                    marker.setMap(null);
                });
            }
        },

        _addMarker: function (obj) {
            logger.debug(this.id + "._addMarker");
            var id = this._contextObj ? this._contextObj.getGuid() : null,
                marker = null,
                lat = 0,
                lng = 0,
                markerImageURL = null,
                url = null;

            lat = this.checkAttrForDecimal(obj, this.latAttr);
            lng = this.checkAttrForDecimal(obj, this.lngAttr);

            marker = new google.maps.Marker({
                position: new google.maps.LatLng(lat, lng),
                map: this._googleMap
            });

            if (id) {
                marker.id = id;
            }

            if (this.markerDisplayAttr) {
                marker.setTitle(obj.get(this.markerDisplayAttr));
            }

            if (this.markerImages.length > 1) {
                dojoArray.forEach(this.markerImages, lang.hitch(this, function (imageObj) {
                    if (imageObj.enumKey === obj.get(this.enumAttr)) {
                        markerImageURL = imageObj.enumImage;
                    }
                }));
            } else if(this.defaultIcon) {
                markerImageURL = this.defaultIcon;
            }

            if (markerImageURL) {
                marker.setIcon(window.mx.appUrl + markerImageURL);
            }

            if (!this._markerCache) {
                this._markerCache = [];
            }

            if (dojoArray.indexOf(this._markerCache, marker) === -1) {
                this._markerCache.push(marker);
            }
        },

        checkAttrForDecimal: function (obj, attr) {
            logger.debug(this.id + ".checkAttrForDecimal");
            if (obj.get(attr) === "Decimal") {
                return obj.get(attr).toFixed(5);
            } else {
                return obj.get(attr);
            }
        },

        _getLatLng: function (obj) {
            logger.debug(this.id + "._getLatLng");
            var lat = this.checkAttrForDecimal(obj, this.latAttr),
                lng = this.checkAttrForDecimal(obj, this.lngAttr);

            if (lat === "" && lng === "") {
                return this._defaultPosition;
            } else if (!isNaN(lat) && !isNaN(lng) && lat !== "" && lng !== "") {
                return new google.maps.LatLng(lat, lng);
            } else {
                return null;
            }
        },

        _goToContext: function (callback) {
            logger.debug(this.id + "._goToContext");
            this._removeAllMarkers();
            if (this._googleMap && this._contextObj) {
                this._refreshMap([ this._contextObj ], callback);
            } else if (typeof callback === "function") {
                callback();
            }
        }
    });
});

require(["GoogleMaps/widget/GoogleMaps"], function() {});
