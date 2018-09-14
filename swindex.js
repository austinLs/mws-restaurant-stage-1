
self.addEventListener('install', function(event) {
  console.log('Service Worker installing.');

	event.waitUntil(
		caches.open('restaurant-cache-v1').then(function(cache) {
		return cache.addAll([
			'/',
			'swindex.js',
			'swregister.js',
			'index.html',
			'restaurant.html',
      'restaurant.html?id=2',
			'js/main.js',
			'js/dbhelper.js',
			'js/restaurant_info.js',
      'js/idb.js',
      'manifest.json',
			'css/mediaqueries.css',
      'css/styles.css',
			'img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg', 'img/5.jpg', 'img/6.jpg', 'img/7.jpg', 'img/8.jpg', 'img/9.jpg', 'img/10.jpg'
		  ]);
    })
  );

});

self.addEventListener('fetch', function(event){
  	event.respondWith(
  		caches.match(event.request, {ignoreSearch: true}).then(function(response) {
  			return response || fetch(event.request);
      })
      .catch(function(e){
        console.error('Error on caches.mach. ', e);
      })
    )
  });
