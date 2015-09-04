'use strict';

var React = require('react-native');
var MapboxGLMap = require('react-native-mapbox-gl');
var mapRef = 'mapRef';
var EventEmitter = require('EventEmitter');
var Subscribable = require('Subscribable');
var moment = require('moment');
moment().format();
var Display = require('react-native-device-display');
var config = require('../config');

var {
  AppRegistry,
  StyleSheet,
  StatusBarIOS,
  Text,
  TextInput,
  TouchableHighlight,
  View,
} = React;

// create MapTab class
var MapTab = React.createClass({
  mixins: [MapboxGLMap.Mixin],
  // initialize class with base states
  getInitialState() {
    return {
      searchString: '',
      zoom: 15,
      venuePins: [],
      searchPins: [],
      annotations: [],
      mapStyle: ['asset://styles/emerald-v7.json', 'asset://styles/dark-v7.json', 'asset://styles/light-v7.json', 'asset://styles/mapbox-streets-v7.json', 'asset://styles/satellite-v7.json'],
      currentMap: 0
     };
  },

  // update map on region change
  onRegionChange(location) {
    this.setState({
      currentZoom: location.zoom,
      latitude: location.latitude,
      longitude: location.longitude
    });
  },
  onRegionWillChange(location) {
    console.log(location);
  },
  onUpdateUserLocation(location) {
    console.log(location);
  },
  onOpenAnnotation(annotation) {
    console.log(annotation);
  },

  // Mapbox helper function for when right annotation press event is detected
  onRightAnnotationTapped(rightAnnot) {
    var that = this;
    for(var i = 0; i < this.state.annotations.length; i++) {
      var currVenue = this.state.annotations[i];
      if(currVenue.id === rightAnnot.id) {
        if(currVenue._id) {
          this.eventEmitter.emit('annotationTapped', { venue: currVenue });
        } else {
          fetch(config.serverURL+'/api/venues', {
            method: 'POST',
            headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
             title: currVenue.title,
             description: currVenue.description,
             address: currVenue.address,
             coordinates: currVenue.coordinates,
             creator: '55e7301b6df4ceb7721b41cb',
             datetime: new Date().toISOString(),
            })
          })
            .then(response => response.json())
            .then(json => this.eventEmitter.emit('annotationTapped', { venue: json}))
            .catch(function(err) {
              console.log('error');
              console.log(newVenue);
              console.log(err);
            });
        } 
      }
    }
  },

  componentWillMount: function() {
    navigator.geolocation.getCurrentPosition(
      (initialPosition) =>  this.setState({
        geolocation: initialPosition
      }),
      (error) => alert(error.message),
      {enableHighAccuracy: true, timeout: 20000, maximumAge: 1000}
    );
    this.watchID = navigator.geolocation.watchPosition((lastPosition) => {
      this.setState({
        geolocation: lastPosition,
      });
      this.eventEmitter.emit('positionUpdated', lastPosition);
    });

    this.eventEmitter = this.props.eventEmitter;
    fetch(config.serverURL + '/api/venues')
      .then(response => response.json())
      .then(json => this._handleResponse(json, true));
  },

  _handleResponse: function (venues, inDb) {
    var that = this;
    venues.forEach(function (venue) {
      var coords = venue.coordinates.split(',');
      var tempArray = [];

      venue.latitude = parseFloat(coords[0]);
      venue.longitude = parseFloat(coords[1]);
      venue.rightCalloutAccessory = {
        url: 'image!arrow',
          height: 25,
          width: 25
      };
      if(inDb) {
        venue.subtitle = venue.description;
        venue.id = venue._id;
        var ratingsSum = 0;

        if (venue.ratings) {
          for (var i = 0; i < venue.ratings.length; i++) {
            ratingsSum += venue.ratings[i].rating;
          }
          venue.overallRating = Math.round(ratingsSum / venue.ratings.length);
        } else {
          venue.overallRating = 'Be the first to vote!'
        }
        venue.annotationImage = {
          url: 'image!marker-1',
          height: 27,
          width: 41
        };
        venue.datetime = moment(venue.datetime).format("dddd, MMMM Do YYYY, h:mm:ss a");
        tempArray = that.state.venuePins.slice(0);
        tempArray.push(venue);
        that.setState({venuePins: tempArray});
      } else {
        venue.annotationImage = {
          url: 'image!marker-search',
          height: 27,
          width: 40
        };
        venue.comments = [];
        tempArray = that.state.searchPins;
        tempArray.push(venue);
        that.setState({searchPins: tempArray});
      }
    });
    //this.setState({annotations: venues});
    this._displayPins();

  },

  _displayPins: function () {
    var pins = this.state.venuePins.concat(this.state.searchPins);
    this.setState({annotations: pins});
  },

  _onSearchTextChanged: function (event) {
    this.setState({ searchString: event.nativeEvent.text });
  },

  _onSearchTextSubmit: function () {
    this.setState({searchPins: []});
    fetch(config.serverURL + '/api/search/query/'+this.state.searchString+'/'+this.state.center.latitude+','+this.state.center.longitude)
    .then(response => response.json())
    .then(json => this._handleResponse(json, false))
    .catch(function(err) {
      console.log(err);
    });
  },

  // method for changing style of map on button press - NOT in working state because new map style covers old pins
  _onStylePressed: function () {
    if(this.state.currentMap === 4) {
      this.setState({currentMap: 0});
    } else {
      this.setState({currentMap: this.state.currentMap+1});
    }
    this.render();
    this._displayPins();
  },

  render: function() {
    //StatusBarIOS.setHidden(true);
    return (
      <View style={styles.container}>
        {/*<Text style={styles.text} onPress={() => this.setDirectionAnimated(mapRef, 0)}>
          Set direction to 0
        </Text>
        <Text style={styles.text} onPress={() => this.setZoomLevelAnimated(mapRef, 6)}>
          Zoom out to zoom level 6
        </Text>
        <Text style={styles.text} onPress={() => this.setCenterCoordinateAnimated(mapRef, 48.8589, 2.3447)}>
          Go to Paris at current zoom level {parseInt(this.state.currentZoom)}
        </Text>
        <Text style={styles.text} onPress={() => this.setCenterCoordinateZoomLevelAnimated(mapRef, 35.68829, 139.77492, 14)}>
          Go to Tokyo at fixed zoom level 14
        </Text>
        <Text style={styles.text} onPress={() => {
          this.annotate({
            latitude: this.state.latitude,
            longitude:  this.state.longitude,
            title: 'This is a new marker',
            annotationImage: {
              url: 'https://cldup.com/CnRLZem9k9.png',
              height: 25,
              width: 25
            }
          });
        }}>
          Add new marker
        </Text>
        <Text style={styles.text} onPress={() => this.selectAnnotationAnimated(mapRef, 0)}>
          Open first popup
        </Text>
        <Text style={styles.text} onPress={() => {
          this.setState({
            annotations: this.state.annotations.slice(1, this.state.annotations.length)
          });
        }}>
          Remove first annotation
        </Text> */}
        <MapboxGLMap
          style={styles.map}
          direction={0}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          showsUserLocation={true}
          ref={mapRef}
          accessToken={'pk.eyJ1IjoibWFyeW1hc29uIiwiYSI6IjM1NGVhNWZmNzQ5Yjk5NTczMDFhMzc3Zjg2ZGEyYzI0In0.7IdD26iFQhD2b6LbTIw_Sw'}
          styleURL='asset://styles/light-v7.json'
          centerCoordinate={this.state.center}
          userLocationVisible={true}
          zoomLevel={this.state.zoom}
          onRegionChange={this.onRegionChange}
          onRegionWillChange={this.onRegionWillChange}
          annotations={this.state.annotations}
          onOpenAnnotation={this.onOpenAnnotation}
          onRightAnnotationTapped={this.onRightAnnotationTapped}
          onUpdateUserLocation={this.onUpdateUserLocation} />
        <View style={styles.flowRight}>
          <TextInput
            style={styles.searchInput}
            onChange={this._onSearchTextChanged}
            onSubmitEditing={this._onSearchTextSubmit}
            returnKeyType='search'
            placeholder='Search'/>
        </View>    
        {/*<TouchableHighlight 
          style={styles.button}
          underlayColor='#99d9f4'
          onPress={this._onStylePressed} >
          <Text style={styles.buttonText}>Style</Text>
        </TouchableHighlight>*/}
      </View>
    );
  }
});

var styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
  },
  beer:{

  },
  map: {
    flex: 5
  },
  flowRight: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch'
  },
  searchInput: {
    position: 'absolute',
    top: 0,
    height: 36,
    width: Display.width*.89,
    padding: 4,
    fontSize: 12,
    borderWidth: 0.5,
    borderColor: '#23FCA6',
    color: '#8C8C8C'
  },
    button: {
    height: 36,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#48BBEC',
    borderColor: '#48BBEC',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'stretch',
    justifyContent: 'center'
  },
});

module.exports = MapTab;



//annotations
// {
//   latitude: 40.72052634,
//   longitude: -73.97686958312988,
//   title: 'This is marker 1',
//   subtitle: 'It has a rightCalloutAccessory too',
//   rightCalloutAccessory: {
//     url: 'https://cldup.com/9Lp0EaBw5s.png',
//     height: 1000,
//     width: 100
//   },
//   annotationImage: {
//     url: 'https://cldup.com/CnRLZem9k9.png',
//     height: 100,
//     width: 100
//   },
//   id: 'marker1'
// }, {
//   latitude: 40.714541341726175,
//   longitude: -74.00579452514648,
//   title: 'Important!',
//   subtitle: 'Neat, this is a custom annotation image',
//   annotationImage: {
//     url: 'https://cldup.com/7NLZklp8zS.png',
//     height: 25,
//     width: 25
//   },
//   id: 'marker2'
// }