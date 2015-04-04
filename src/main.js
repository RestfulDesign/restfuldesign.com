/*!
 * Site code
 */
new WOW().init();

window.addEventListener('load', function() {
  var topNav = document.getElementById("nav");
  

  changeBackgroundColor(topNav);
  
  CarouselInViewport()
  
  // On scroll actions
  window.onscroll = function() {
    changeBackgroundColor(topNav);
  }
}, false);

function changeBackgroundColor(id) {
  var y = window.pageYOffset || document.documentElement.scrollTop;
  if (y > 20) {
    id.className = "fixed"; 
  } else {      
    id.className = "";      
  }
}

