# cache4.js
### A simple cache library for JavaScript that requires jQuery and browser localStorage. Includes caching of Ajax requests.

Includes the basic features of caching values by key, removing them and setting expiration times.
The most advanced feature is a wrapper for $.ajax that caches GET requests using the url and the headers defined in the configuration to generate a cache key.
It is compatible with promisses and the return value of the wrapper can and should be used just like the return value of $.ajax.

Example:

```javascript
ajaxCache({
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
  ajaxCalls.push(ajaxCache({
    url: '/rest/path/endpoint?param='=i,
    context:{
      iter:i
    },
    success: function(res){
      console.log('res for iter '+i);
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
loadCache(key,defVal)
storeCache(key,value,expireSecs)
removeCache(key)
clearCaches()
clearExpiredCaches()
```
