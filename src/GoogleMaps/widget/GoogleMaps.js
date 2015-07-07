/*jslint white:true, nomen: true, plusplus: true */
/*global mx, define, require, browser, devel, console, google, window */

define([
    'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
    'dojo/dom-style', 'dojo/dom-construct', 'dojo/_base/array', 'dojo/_base/lang',
    'GoogleMaps/lib/googlemaps!', 'dojo/text!GoogleMaps/widget/template/GoogleMaps.html'
], function (declare, _WidgetBase, _TemplatedMixin, domStyle, domConstruct, dojoArray, lang, googleMaps, widgetTemplate) {
    'use strict';

    return declare('GoogleMaps.widget.GoogleMaps', [_WidgetBase, _TemplatedMixin], {
        templateString: widgetTemplate,

        _handle: null,
        _contextObj: null,
        _googleMap: null,
        _markerCache: null,
        _googleScript: null,
        _defaultPosition: null,


        postCreate: function () {
            window[this.id + "_mapsCallback"] = lang.hitch(this, function () {
                this._loadMap();
            });

            this._loadMap();
        },

        update: function (obj, callback) {
            this._contextObj = obj;

            this._resetSubscriptions();
            if (this._googleMap) {
                this._fetchMarkers();
            }

            callback();
        },

        resize: function (box) {
            if (this._googleMap) {
                google.maps.event.trigger(this._googleMap, 'resize');
            }
        },

        uninitialize: function () {
            window[this.id + "_mapsCallback"] = null;
        },

        _resetSubscriptions: function () {
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

        _loadMap: function () {
            domStyle.set(this.mapContainer, {
                height: this.mapHeight + 'px',
                width: this.mapWidth
            });

            this._defaultPosition = new google.maps.LatLng(this.defaultLat, this.defaultLng);
            this._googleMap = new google.maps.Map(this.mapContainer, {
                zoom: 11,
                center: this._defaultPosition,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControlOption: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                }
            });

            this._fetchMarkers();

        },

        _fetchMarkers: function () {
            if (this.gotocontext) {
                this._goToContext();
            } else {
                if (this.updateRefresh) {

                    this._fetchFromDB();
                } else {
                    if (this._markerCache) {
                        this._fetchFromCache();
                    } else {
                        this._fetchFromDB();
                    }
                }
            }

        },

        _refreshMap: function (objs) {
            var self = this,
                bounds = new google.maps.LatLngBounds(),
                panPosition = self._defaultPosition,
                validCount = 0;
            dojoArray.forEach(objs, function (obj) {
                self._addMarker(obj);

                var position = self._getLatLng(obj);
                if (position) {
                    bounds.extend(position);
                    validCount++;
                    panPosition = position;
                } else {
                    console.error(self.id + ": " + "Incorrect coordinates (" + obj.get(self.latAttr) +
                                  "," + obj.get(self.lngAttr) + ")");
                }
            });

            if (validCount < 2) {
                self._googleMap.setZoom(self.lowestZoom);
                self._googleMap.panTo(panPosition);
            } else {
                self._googleMap.fitBounds(bounds);
            }
        },

        _fetchFromDB: function () {
            var xpath = '//' + this.mapEntity + this.xpathConstraint;

            this._removeAllMarkers();
            if (this._contextObj) {
                xpath = xpath.replace('[%CurrentObject%]', this._contextObj.getGuid());
                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, "_refreshMap")
                });
            } else if (!this._contextObj && (xpath.indexOf('[%CurrentObject%]') > -1)) {
                console.warn('No context for xpath, not fetching.');
            } else {
                mx.data.get({
                    xpath: xpath,
                    callback: lang.hitch(this, "_refreshMap")
                });
            }
        },

        _fetchFromCache: function () {
            var self = this,
                cached = false,
                bounds = new google.maps.LatLngBounds();

            this._removeAllMarkers();

            dojoArray.forEach(this._markerCache, function (marker, index) {
                if (self._contextObj) {
                    if (marker.id === self._contextObj.getGuid()) {
                        marker.setMap(self._googleMap);
                        bounds.extend(marker.position);
                        cached = true;
                    }
                } else {
                    marker.setMap(self._googleMap);
                }
                if (index === self._markerCache.length - 1) {
                    self._googleMap.fitBounds(bounds);
                }
            });

            if (!cached) {
                this._fetchFromDB();
            }

        },

        _removeAllMarkers: function () {
            if (this._markerCache) {
                dojoArray.forEach(this._markerCache, function (marker) {
                    marker.setMap(null);
                });
            }
        },

        _addMarker: function (obj) {
            var id = this._contextObj ? this._contextObj.getGuid() : null,
                marker = new google.maps.Marker({
                    position: new google.maps.LatLng(obj.get(this.latAttr), obj.get(this.lngAttr)),
                    map: this._googleMap
                }),
                self = this,
                markerImageURL = null,
                url = null;

            if (id) {
                marker.id = id;
            }

            if (this.markerDisplayAttr) {
                marker.setTitle(obj.get(this.markerDisplayAttr));
            }

            if (this.markerImages.length > 1) {
                dojoArray.forEach(this.markerImages, function (imageObj) {
                    if (imageObj.enumKey === obj.get(self.enumAttr)) {
                        markerImageURL = imageObj.enumImage;
                    }
                });
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

        _getLatLng: function (obj) {
            var lat = obj.get(this.latAttr),
                lng = obj.get(this.lngAttr);

            if (lat === "" && lng === "") {
                return this._defaultPosition;
            } else if (!isNaN(lat) && !isNaN(lng) && lat !== "" && lng !== "") {
                return new google.maps.LatLng(lat, lng);
            } else {
                return null;
            }
        },

        _goToContext: function () {
            this._removeAllMarkers();
            if (this._googleMap && this._contextObj) {
                this._refreshMap([ this._contextObj ]);
            }
        }
    });
});

require(["GoogleMaps/widget/GoogleMaps"], function() {});
