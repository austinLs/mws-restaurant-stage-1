document.addEventListener('DOMContentLoaded', (event) => {

	if (navigator.serviceWorker) {
		navigator.serviceWorker.register('swindex.js').then(function(reg) {
			console.log("Service worker registered")			
		}).catch(function(error){
			console.log("Service worker registration failed")
		});
	}

});