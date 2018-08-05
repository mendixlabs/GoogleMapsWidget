# Google Maps widget

> **Note: Google has updated the License agreements per July 16 2018, see [Price changes](https://cloud.google.com/maps-platform/user-guide/pricing-changes/). For commercial applications, a key (see Configuration) is required**

## Description
Bring the world into your application, with the Google Maps widget!

## Typical usage scenario

Giving a visual representation of an address.
Showing an overview where all your branches/members/clients/orders/etc. are.
 
## Features and limitations
Tap directly into all the power of Google Maps.
Easy to implement.
No route planning or advanced features yet.

## Dependencies
Mendix 5.x Environment

## Configuration
One of the most important things to keep in mind when implementing this widget is the Google Maps terms of use. These can be found here: Terms of Use. [Chapter 9.1 is especially important](https://developers.google.com/maps/terms#9-license-requirements).

        Free, Public Accessibility to Your Maps API Implementation. Your Maps API Implementation must be generally accessible to users without charge. You may require users to log in to your Maps API Implementation if you do not require users to pay a fee. U nless you have entered into a separate written agreement with Google or obtained Google's written permission , your Maps API Implementation must not:

        (a) require a fee-based subscription or other fee-based restricted access; or
        (b) operate only behind a firewall or only on an internal network (except during the development and testing phase).


There are 3 use-cases for which this widget can be used.

        Outside a dataview: Will just retrieve the objects specified and show them on the map.
        Inside a dataview not matching the Objects property: Will show the objects specified, can use '[%CurrentObject%]' in XPath Constraint.
        Inside a dataview matching the Objects property: Will show the objects specified, can NOT use '[%CurrentObject%]'. Can set up the dataview to listen to a matching datagrid. If 'Pan to context' is set to true, it will focus on the marker of the object that is selected in the datagrid.

To finish up, just enter the correct values into the widget. For more information on the different input properties, read below.

## Maps API Access Key

The Google Maps Javascript API v3 does not require an API key to function properly. However, Google strongly encourages you to load the Maps API using an APIs Console key which allows you to monitor your application's Maps API usage.
You can get an API key by following [the steps provided here](https://developers.google.com/maps/documentation/javascript/get-api-key)

## Properties
* Maps API Access Key: The Google Maps JavaScript API v3 does not require an API key to function correctly.
* Height: The height the widget will have (in pixels) . This attribute is required.
* Width: The width of the widget, can be in pixels or percentage.
* Enum attribute : Optional: The enumeration attribute of the entity on which you can display different images. This can be 1-deep association.
* Default icon Optional:The image that is used for all objects (In case enum attribute is empty) or the image for the enumeration's empty value.
* Enum based marker images: Optional: A list of all the enumeration's keys linked to the images that should represent them on the map.
* Pan to context: Set this only to true if your object containing the address matches your dataview. With this you can have your dataview listen to a datagrid of your Users objects containing the addresses and it will jump to the matching marker on the map.
* Default latitude: The default latitude the map should use when no objects are found or there is no object found (when using an XPath with CurrentObject)
* Default longitude: The default longitude the map should use when no objects are found or there is no object found (when using an XPath with CurrentObject)
* Single item zoom level: The zoom level to be used when showing a single item or the default location. Level 1 shows the entire globe, 15 is city level and 20 is house level.
* Refresh on entity changes: When set to true, the map refreshes on any changes to the mapped entity (and/or 1-deep entity). This includes on create/delete/change. Do note that it simply reloads the entire map, so this is not recommended when mapping a lot of objects.
* Objects: The Google Maps Overview widget retrieves its own objects based on the entity specified here.
* XPath constraint: The XPath constraint to be used for retrieving the objects. Important: Even though the Modeler lets you, you can't use '[%CurrentObject%]' if your dataview entity matches the entity of the objects you are retrieving. Doing so will result in an error.
* Marker attribute: The attribute that contains the text to display in the info window at the location. No info window will be shown if this is left empty. Tip: The window displays HTML, you can use the Rich Text Editor widget to create your styled text and have it saved as HTML. This can then be directly used for the info window! This can be 1-deep association.
* Latitude attribute: The attribute containing the latitudes of the objects. This can be 1-deep association.
* Longitude attribute: The attribute containing the longitudes of the objects. This can be 1-deep association.

