/*!
 * Site code
 */
new WOW().init();

var Carousel = function(e,s,c,m,i) {
    m=e.length-1,c=c||0;
    function f() {
      for(i=m;~i;i--)e[i].className=i==c ? "t":"";c=++c%(m+1);
    } 
    f();
    setInterval(f,s);
}
window.addEventListener('load', function() {
  var qoutes = getChildrenOf('quotes');
  Carousel(qoutes, 15000, 0);
}, false)

function getChildrenOf(id) { 
    return [].filter.call(document.getElementById(id).childNodes, function(y) {
        return (y.nodeType === 1)
    }); 
};
