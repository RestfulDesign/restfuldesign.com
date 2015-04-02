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
    CarouselInViewport();
  }
}, false)

function CarouselInViewport() {
  
  var qoutes = getChildrenOf('quotes'),
      quote = document.querySelector(".quote-progress");
      
  if (verge.inViewport(quote)) {
    Carousel(qoutes, 15000, 0);
    console.log(verge.inViewport(quote))
  } 
}

function Carousel(e,s,c,m,i) {
  var m = e.length-1,
      c = c||0;
      
  
  function f() {
    for(i=m;~i;i--)e[i].className=i==c ? "t":"";c=++c%(m+1);
  } 
  f();
  setInterval(f,s);
}

function changeBackgroundColor(id) {
  var y = window.pageYOffset || document.documentElement.scrollTop;
  if (y > 20) {
    id.className = "fixed"; 
  } else {      
    id.className = "";      
  }
}

function getChildrenOf(id) { 
  return [].filter.call(document.getElementById(id).childNodes, function(y) {
    return (y.nodeType === 1)
  }); 
};