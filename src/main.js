/*!
 * Site code
 */
new WOW().init();

window.addEventListener("load", function() {
  var topNav = document.querySelector(".nav");

  enquire.register("screen and (max-width:767px)", {
    match : function() {
      var arkdesImg = document.querySelector(".arkdes-img");
      var parent = arkdesImg.parentNode;
      parent.insertBefore(arkdesImg, parent.firstChild);
    },
    unmatch : function() {
      
      var arkdesImg = document.querySelector(".arkdes-txt");
      var parent = arkdesImg.parentNode;
      parent.insertBefore(arkdesImg, parent.firstChild);
    }
  });

  changeBackgroundColor(topNav);
    
  // On scroll actions
  window.onscroll = function() {
    changeBackgroundColor(topNav);
  }
}, false);

function changeBackgroundColor(el) {
  var y = window.pageYOffset || document.documentElement.scrollTop;
  if (y > 20) {
    el.className = "fixed"; 
  } else {      
    el.className = "";      
  }
}

