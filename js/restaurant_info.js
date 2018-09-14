let restaurant;
var newMap;

document.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('restaurant-name').focus();
  initMap();
});

/**
 * Initialize Google map, called from HTML.
 */
 initMap = () => {
   fetchRestaurantFromURL((error, restaurant) => {
     if (error){
      console.error(error);
      }
      else{
   self.newMap = L.map('map', {
     center: [restaurant.latlng.lat, restaurant.latlng.lng],
     zoom: 16,
     scrollWheelZoom: false
   });
   L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}',{
     mapboxToken:'pk.eyJ1IjoiYXVzdGlucyIsImEiOiJjaml6Y25yanYwNW5wM3BxZHMxa29hYXlqIn0.D6qwEN0V9WmBok7flSBpbA',
     maxZoom: 18,
     attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
     '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, '+
     'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
     id: 'mapbox.streets'
   }).addTo(newMap);
   fillBreadcrumb();
   DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const updateBar = document.getElementById('update-notification');
  const updateBarText = document.createElement('p');
  updateBarText.id = "updatebar-text";
  updateBar.appendChild(updateBarText)

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favoriteButton = document.getElementById('favorite-button');
  favoriteButton.addEventListener("click", favoriteClick, false);
  let favorite = restaurant.is_favorite;
  if (favorite){
    favoriteButton.className = "favorite-true";
  }
  else{
    favoriteButton.className = "favorite-false"
  }

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = DBHelper.altTextForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReview(restaurant.id, (error, review) => {
    self.review = review;
    fillReviewsHTML();
  })
  // new review
  newReviewFormHTML()
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.review) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const maindiv = document.createElement('div');
  const li = document.createElement('li');
  const div = document.createElement('div');

  div.className = 'review-header';

  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.className = 'review-name';
  div.appendChild(name);

  const date = document.createElement('p');
  let dateConverted = new Date(review.updatedAt)
  date.innerHTML = dateConverted.toDateString();
  date.className = 'review-date';
  div.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'review-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  maindiv.appendChild(div);
  maindiv.appendChild(li);
  return maindiv;
}

/**
 * New review form element
 */

 newReviewFormHTML = (restaurantid = self.restaurant.id) => {
   // Add ID and hide element
   const formElement = document.getElementById('review-form');
   const formID = document.createElement('input');
   formID.type = "hidden";
   formID.name = "restaurant_id";
   formID.id = "restaurant-id";
   formID.value = restaurantid;
   formElement.appendChild(formID);

   //Add radio-button stars to allow raiting
   const radioDiv = document.getElementById('radio-buttons');
   for (var i=1; i<=5; i++){

     const labelRating = document.createElement('label');
     const formRating = document.createElement('input');
     formRating.type = "radio";
     formRating.name = "rating";
     formRating.value = i;
     formRating.id = "input" + i;
     const starText = document.createElement('span');
     starText.innerHTML = "&#x2605;";
     starText.tabIndex = 0;
     starText.associatedInput = "input" + i;
     starText.addEventListener('keydown', (e)=>
       {
         //Detect input from keyboard only users
         let target = e.target;
         if (target=== document.activeElement && event.keyCode == 13)
          {document.getElementById(target.associatedInput).checked = true}
       })

     labelRating.appendChild(formRating);
     labelRating.appendChild(starText);
     radioDiv.appendChild(labelRating);
   }
 }

 /**
 * Handle new Comments
*/
postComment = () => {
  let id = Number(document.getElementById('restaurant-id').value);
  let name = document.getElementById('name-comment').value;
  let comment = document.getElementById('text-comments').value;
  let rating;
  for (var i=1; i<=5; i++){
    if(document.getElementById('input'+i).checked == true){
      rating = i;
    }
  }
  let body = {
    id: Date.now(),
    restaurant_id: id,
    name: name,
    comments: comment,
    rating: rating || 3,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  DBHelper.reviewRestaurant(body, id);
}

favoriteClick = () =>{
  const favoriteButton = document.getElementById('favorite-button');
  let favoriteBool = false;
  if(favoriteButton.className == "favorite-false"){
    favoriteButton.className = "favorite-true";
    favoriteBool = true;
  }
  else {
    favoriteButton.className = "favorite-false";
  }
  let restaurantid = document.getElementById('restaurant-id').value;
  DBHelper.favoriteRestaurant(restaurantid, favoriteBool)
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
