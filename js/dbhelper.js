/**
 * Common database helper functions.
 */
class DBHelper {

  static dbOpen(){
    return idb.open('restDb', 1, function(upgradeDb){
        let restaurantDb = upgradeDb.createObjectStore('restaurantsDB');
        let reviewsDB = upgradeDb.createObjectStore('reviewsDB', {keypath: "id"});
        let offlineDB = upgradeDb.createObjectStore('offlineDB', {keypath : "time"});
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback){

    DBHelper.dbOpen().then(function(db){
      db.transaction('restaurantsDB').objectStore('restaurantsDB').getAll()
      .then((message)=>{
        if(message[0])
          callback(null, message[0])
        else{
          console.log("no db");
          fetch('http://localhost:1337/restaurants')
           .then(function(response){
             return response.json()})
           .then(function(jsonresponse){
               db.transaction('restaurantsDB', 'readwrite').objectStore('restaurantsDB').put(jsonresponse, "json");
               callback(null, jsonresponse)});
        }
      })
    });
  }

    /** XHR, OLD, reference
    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.DATABASE_URL);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const restaurants = json.restaurants;
        callback(null, restaurants);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();*/

  static fetchReview(id, callback){
    DBHelper.dbOpen().then(function(db){
      db.transaction('reviewsDB').objectStore('reviewsDB').get(id)
      .then(message =>{
        if(message)
          callback(null, message)
        else{
          fetch('http://localhost:1337/reviews/?restaurant_id='+id)
           .then(function(response){
              return response.json()})
           .then(function(jsonresponse){
             db.transaction('reviewsDB', 'readwrite').objectStore('reviewsDB').put(jsonresponse, id);
             callback(null, jsonresponse)});
           }
         })
       });
       DBHelper.fetchOfflineCache();
     }

  /**
  * Update Database with favorite status.
  */
  static favoriteRestaurant(restid, favoriteBool){
    // Shift ids to match DB location
    let shiftedrestid = restid - 1;
    DBHelper.dbOpen().then(function(db){
      db.transaction('restaurantsDB', 'readwrite').objectStore('restaurantsDB').openCursor()
      .then(cursor =>{
        // Select record with matching ID
        var updateFavorite = cursor.value[shiftedrestid];
        // Update favorite status
        updateFavorite.is_favorite = favoriteBool;
        // Update record
        cursor.update(cursor.value)
        })
      });
      //Send to server
      DBHelper.updateServerReview(null, "Put", favoriteBool, restid)
  }

  /**
  * Update Database with restaurant reviews.
  */
  static reviewRestaurant(body, id){
    DBHelper.dbOpen().then(function(db){
      db.transaction('reviewsDB', 'readwrite').objectStore('reviewsDB').openCursor()
      .then(cursor =>{
        // Check if cursor is at correct ID
        if(cursor.key != id){
          cursor.continue(id)
          .then(cursor =>{
            // Check number of reviews
            let reviewNumber = cursor.value.length
            // Get all records
            var newReview = cursor.value
            // Add new review at last spot
            newReview[reviewNumber] = body;
            // Update record
            cursor.update(newReview)
          })
        }
        // If first record cursor is at corret ID
        else{
          //Same as above
          let reviewNumber = cursor.value.length
          var newReview = cursor.value
          newReview[reviewNumber] = body;
          cursor.update(newReview)
        }
      })
    });
    //Send to server
    DBHelper.updateServerReview(null, "Post", body);
    //Attempt to submit offline cache
    DBHelper.fetchOfflineCache();
    //Scroll page to top to prevent double submit and populate new review
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }

  /**
  * Update server with restaurant reviews and favorites.
  */
  static updateServerReview(time, type, data, id){

    let fetchData;
    let URL;
    let postTime = time || Date.now();

    if (type == "Post"){
      URL = 'http://localhost:1337/reviews/';
      fetchData = {method: "POST", body: JSON.stringify(data)};
    }
    else if(type == "Put"){
      URL = 'http://localhost:1337/restaurants/'+ id +'/?is_favorite='+ data
      fetchData = {method: "PUT"}
    }

    fetch(URL, fetchData)
    .then(response => {
      if (response.status >= 200 && response.status < 300){
        document.getElementById("updatebar-text").innerHTML = "Updated!"
        return;
      }
      else{
        document.getElementById("updatebar-text").innerHTML = "Update saved till online"
        DBHelper.offlineCache(postTime, type, data, id)
      }
    })
    .catch(error => {
      console.error(error)
      document.getElementById("updatebar-text").innerHTML = "Update saved till online"
      DBHelper.offlineCache(postTime, type, data, id)
    });
  }

  static offlineCache(time, type, data, id){
      DBHelper.dbOpen().then(function(db){
        db.transaction('offlineDB', 'readwrite').objectStore('offlineDB').put({time, type, data, id}, time);
      })
  }

  static fetchOfflineCache(){
    DBHelper.dbOpen().then(function(db){
      db.transaction('offlineDB', 'readwrite').objectStore('offlineDB').openCursor()
      .then(cursor =>{
        if(cursor){
          let cacheItem = cursor.value
          let type = cacheItem.type;
          let data = cacheItem.data;
          let time = cacheItem.time;
          if(cacheItem.id)
            var id = cacheItem.id;

          DBHelper.updateServerReview(time, type, data, id)

          cursor.delete()
          .then(DBHelper.fetchOfflineCache);
        }
      })
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}.jpg`);
  }

  /**
   * Restaurant alt-text for image.
   */
   static altTextForRestaurant(restaurant){
	  const altText = restaurant.alt_text || 'Picture of restaurant'
	  return (altText);
   }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map){
     const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
       {title: restaurant.name,
       alt: restaurant.name,
       url: DBHelper.urlForRestaurant(restaurant)
    })
    marker.addTo(newMap);
    return marker;
   }



}
