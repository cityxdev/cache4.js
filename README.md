# cache4.js
### A simple cache library for JavaScript that requires jQuery and browser localStorage. Includes caching of Ajax requests.

Includes the basic features of caching values by key, removing them and setting expiration times.
The most advanced feature is a wrapper for $.ajax that caches GET and HEAD requests using the url and the headers defined in the configuration to generate a cache key.
It is compatible with promisses and the return value of the wrapper can and should be used just like the return value of $.ajax.

If [lz-string](https://github.com/pieroxy/lz-string) is present (and browser is not MS Edge), compresses the stored values (there is a limit of about 5mb of local storage).

On storing a value, if expireSecs is defined to a value lower than 5*60 (5 mins), the stored value is considered "short lasting" and thus stored in sessionStorage instead of localStorage (after closing the browser tab, sessionStorage is cleared)

MS IE not supported.

Example:

```javascript
cache4js.ajaxCache({
  url: '/rest/path/endpoint?param=10'
  success: function (data) {
    console.log('success');
    console.log(data);
    console.log(this.ctx1);
    console.log(this.ctx2);    
  },
  context:{
    ctx1: 'val1',
    ctx2: 'val2',
  }
},24*60*60 //cache for 24 hours
).then(function (data) {
    console.log("then");
    console.log(data);
}).done(function (data) {
    console.log("done");
    console.log(data);
}).always(function (data) {
    console.log("always");
    console.log(data);
});

//or
let ajaxCalls = [];
for(let i = 0 ; i < 10 ; i++){
  ajaxCalls.push(cache4js.ajaxCache({
    url: '/rest/path/endpoint?param='+i,
    context:{
      iter:i
    },
    success: function(res){
      console.log('res for iter '+this.iter);
      console.log(res);
    }
  }));
}
Promise.all(ajaxCalls).then(function () {
    console.log('finished');
}).catch(function (e) {
    console.log(e);
});


```

Other functions:

```javascript
cache4js.setMaxElements(maxElements)
cache4js.getMaxElements()
cache4js.setLocalNamespace(localNS)
cache4js.getLocalNamespace()
cache4js.getSize()
cache4js.loadCache(key,defVal)
cache4js.getCache(key,func,expireSecs)
cache4js.storeCache(key,value,expireSecs)
cache4js.removeCache(key)
cache4js.clearCaches()
cache4js.clearExpiredCaches()
```
