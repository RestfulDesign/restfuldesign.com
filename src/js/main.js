/*!
 * Site code
 */
new WOW().init();

window.addEventListener("load", function() {
  var topNav = document.querySelector(".nav");
  var menuToggle = document.getElementById("menu")
  
  // construct an instance of Headroom, passing the element
  var headroom  = new Headroom(topNav, {
 // vertical offset in px before element is first unpinned
    offset : 40,
    // scroll tolerance in px before state changes
    tolerance : 10,
  });
  // initialise
  headroom.init(); 
  
  // changeBackgroundColor(topNav);
  
  document.getElementById("menu-toggle").addEventListener("click", function() {
    toggleClass(document.getElementById('mobile-menu'), 'show');
  });

  
  
  enquire.register("screen and (max-width:767px)", {
    match : function() {
      var mobileMenu = document.getElementById("mobile-menu");
      mobileMenu.addEventListener("click", showMenu, false);
      
      var arkdesImg = document.querySelector(".arkdes-img");
      var parent = arkdesImg.parentNode;
      parent.insertBefore(arkdesImg, parent.firstChild);
    },
    unmatch : function() {
      toggleClass(document.getElementById('mobile-menu'), 'show');  
      var mobileMenu = document.getElementById("mobile-menu");
      mobileMenu.removeEventListener("click", showMenu, false);
      var arkdesImg = document.querySelector(".arkdes-txt");
      var parent = arkdesImg.parentNode;
      parent.insertBefore(arkdesImg, parent.firstChild);
    }
  });
  
  function showMenu() {
    toggleClass(document.getElementById('mobile-menu'), 'show');
  } 
  // On scroll actions
  window.onscroll = function() {
    // changeBackgroundColor(topNav);
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

function toggleClass(element, className) {
  if (!element || !className){ 
    return; 
  }  
  var classString = element.className, nameIndex = classString.indexOf(className);
  if (nameIndex == -1) {
    classString += ' ' + className;
  }
  else {
    classString = classString.substr(0, nameIndex) + classString.substr(nameIndex+className.length);
  }
  element.className = classString;
}
