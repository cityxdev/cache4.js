/* cache4.js - v1.2.1 - 2019-12-30 - https://github.com/cityxdev/cache4.js */

$(function(){
    'use strict';

    function initCache4js() {

        const navigatorCode = (function(){
            var ua= navigator.userAgent, tem,
                M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE '+(tem[1] || '');
            }
            if(M[1]=== 'Chrome'){
                tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
                if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
            }
            M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
            return M.join(' ');
        })();
        const isOpera = navigatorCode.indexOf('Opera')===0;
        const isFirefox = navigatorCode.indexOf('Firefox')===0;
        const isSafari = navigatorCode.indexOf('Safari')===0;
        const isChrome = navigatorCode.indexOf('Chrome')===0;
        const isIE = navigatorCode.indexOf('IE')===0;
        const isEdge = navigatorCode.indexOf('Edge')===0;

        var _cache4js={};

        _cache4js.CACHE_NAMESPACE = '__CACHE4JS__';

        const DEFAULT_MAX_ELEMENTS = 150;
        const LONG_LASTING_THRESHOLD = 5*60;

        const useCompression = !isEdge && !isIE && typeof(LZString) !== 'undefined';

        var size = undefined;

        function generateCacheKey(key) {
            return _cache4js.CACHE_NAMESPACE + btoa(key);
        }

        function unmarshallCacheItem(itemStr) {
            return itemStr
                ? JSON.parse(
                    useCompression
                        ? LZString.decompress(itemStr)
                        : itemStr
                )
                : undefined;
        }

        function marshallCacheItem(itemObj) {
            return useCompression ? LZString.compress(JSON.stringify(itemObj)) : JSON.stringify(itemObj);
        }


        /**
         * Set the maximum number of elements this cache can hold
         * @param maxElements {number} The max
         */
        _cache4js.setMaxElements = function(maxElements){
            localStorage.setItem('maxElements'+_cache4js.CACHE_NAMESPACE,maxElements.toString());
            if(_cache4js.getSize()>maxElements)
                setTimeout(_cache4js.clearExpiredCaches,10);
        };

        /**
         * Obtain the maximum number of elements this cache can hold
         * @returns {number} A number set with cache4js.setMaxElements or the default 150
         */
        _cache4js.getMaxElements = function(){
            const stored = localStorage.getItem('maxElements'+_cache4js.CACHE_NAMESPACE);
            return stored?parseInt(stored):undefined;
        };

        /**
         * The current size of this cache
         * @returns {number} The number of cached elements
         */
        _cache4js.getSize = function(){
            return size;
        };

        /**
         * Obtain a cached value
         * @param key {string} The key of the cached value
         * @param defVal {*} A default value
         * @returns {*} The cached value, or the default value if the cached value is not present or has expired
         */
        _cache4js.loadCache = function(key, defVal) {
            function load(storage) {
                const item = storage.getItem(generateCacheKey(key));
                const cache = unmarshallCacheItem(item);
                const isExpired = cache && cache.expireSecs && Date.now() - cache.expireSecs * 1000 > cache.millis;
                if (isExpired)
                    _cache4js.removeCache(key);
                return cache && !isExpired ? cache.value : undefined;
            }

            let res = load(localStorage);
            if(!res)
                res = load(sessionStorage);
            return res?res:defVal;
        };

        /**
         * Obtain a cached value or calculate it if necessary
         * @param key {string} The key of the cached value
         * @param func {function} The function to calculate the value (only gets called if necessary)
         * @param expireSecs {number} [optional] If defined, the number of seconds after which the cached value expires
         * @returns {*} The cached value, or the calculated value if the cached value is not present or has expired
         */
        _cache4js.getCache = function(key, func, expireSecs) {
            const res = _cache4js.loadCache(key,undefined);
            if(res===undefined || res===null)
                return _cache4js.storeCache(key,func(),expireSecs);
            return res;
        };

        /**
         * Store a new cache if possible
         * This function fails if the local storage is full
         * If LZString is present, compresses the cache content before storage
         *
         * If expireSecs is defined to a value lower than 5*60 (5 mins), the stored value is considered "short lasting" and thus stored in sessionStorage instead of localStorage (after closing the browser tab, sessionStorage is cleared)
         * @param key {string} The key of the cache to store
         * @param value {*} The value to store
         * @param expireSecs {number} [optional] If defined, the number of seconds after which the cached value expires
         * @returns {*} The cached value
         */
        _cache4js.storeCache = function(key, value, expireSecs) {
            if(size>=_cache4js.getMaxElements())
                _cache4js.clearExpiredCaches();

            const cacheKey = generateCacheKey(key);

            const existsInShortLasting = sessionStorage[cacheKey];
            const existsInLongLasting = localStorage[cacheKey];
            const alreadyExists = existsInShortLasting || existsInLongLasting;

            if(size>=_cache4js.getMaxElements() && !alreadyExists){
                console.log(_cache4js.CACHE_NAMESPACE+' Cache is full. Size: '+size+', max elements: '+_cache4js.getMaxElements());
                return value;
            }

            if(value!==null && value!==undefined) {
                const isLongLasting = expireSecs===null || expireSecs===undefined || (expireSecs<=0||expireSecs>LONG_LASTING_THRESHOLD);
                const storage = !isLongLasting ? sessionStorage : localStorage;

                if(isLongLasting && existsInShortLasting)
                    sessionStorage.removeItem(cacheKey);
                if(!isLongLasting && existsInLongLasting)
                    localStorage.removeItem(cacheKey);

                let cache = {
                    value: value,
                    millis: Date.now(),
                    expireSecs: expireSecs
                };
                const valString = marshallCacheItem(cache);
                try {
                    storage.setItem(cacheKey, valString);
                    if(!alreadyExists)
                        size++;
                    setTimeout(_cache4js.clearExpiredCaches,100);
                } catch (e) {
                    console.log(_cache4js.CACHE_NAMESPACE+' Error storing cache (1)');
                    _cache4js.clearExpiredCaches();
                    //try again, now having cleared where possible
                    try {
                        storage.setItem(cacheKey, valString);
                        if(!alreadyExists)
                            size++;
                    } catch (e) {
                        console.log(_cache4js.CACHE_NAMESPACE+' Error storing cache (2)');
                        console.log(e);
                    }
                }
            }
            return value;
        };

        /**
         * Remove a cache
         * @param key {string} The key of the cache to remove
         */
        _cache4js.removeCache = function (key) {
            const cacheKey = generateCacheKey(key);
            if(localStorage[cacheKey]) {
                localStorage.removeItem(cacheKey);
                size--;
            } else if(sessionStorage[cacheKey]){
                sessionStorage.removeItem(cacheKey);
                size--;
            }
        };

        /**
         * Delete all caches
         */
        _cache4js.clearCaches = function () {
            function clear(storage) {
                $.each(storage, function (key, value) {
                    if (0 === key.indexOf(_cache4js.CACHE_NAMESPACE)) {
                        storage.removeItem(key);
                        size--;
                    }
                });
            }
            clear(localStorage);
            clear(sessionStorage);
        };

        /**
         * Delete all expired caches
         */
        _cache4js.clearExpiredCaches = function () {
            let count = 0;
            function clear(storage) {
                storage = storage || localStorage;
                $.each(storage, function (key, item) {
                    if (0 === key.indexOf(_cache4js.CACHE_NAMESPACE)) {
                        const cache = unmarshallCacheItem(item);
                        const isExpired = cache && cache.expireSecs && Date.now() - cache.expireSecs * 1000 > cache.millis;
                        if (isExpired) {
                            storage.removeItem(key);
                            size--;
                            count++;
                        }
                    }
                });
            }
            clear(localStorage);
            clear(sessionStorage);
            if (count > 0)
                console.log(_cache4js.CACHE_NAMESPACE+" Cleared "+count+" expired caches");
        };

        /**
         * A wrapper to the $.ajax function that tries to retrieve the result form cache
         * If the result is not present or is expired, falls back to $.ajax and returns the result of that call (but caches the result)
         * The return value of this function should be used just like the return value of $.ajax
         * Only GET and HEAD requests get cached
         * @param jQueryAjaxConf {object} The $.ajax configuration object
         * @param expireSecs {number} [optional] a number of seconds for the cache to last (default: 5 minutes)
         * @returns {object} An ajax execution
         */
        _cache4js.ajaxCache = function (jQueryAjaxConf,expireSecs) {
            return new AjaxCacheObj(jQueryAjaxConf,expireSecs);
        };


        const AjaxCacheObj = function (jQueryAjaxConf, expireSecs) {

            let _self=this;

            this._data = undefined;

            if(!jQueryAjaxConf.method || jQueryAjaxConf.method.toLowerCase()!=='get' || jQueryAjaxConf.method.toLowerCase()!=='head'){
                if(jQueryAjaxConf.url){
                    const key = jQueryAjaxConf.url
                        +(jQueryAjaxConf.headers&&Object.keys(jQueryAjaxConf.headers)>0?JSON.stringify(jQueryAjaxConf.headers):'')
                        +(jQueryAjaxConf.data?JSON.stringify(jQueryAjaxConf.data):'');
                    const fromCache = _cache4js.loadCache(key,undefined);

                    if(jQueryAjaxConf.context)
                        for(let k in jQueryAjaxConf.context)
                            this[k]=jQueryAjaxConf.context[k];

                    if(fromCache!==null && fromCache!==undefined) {
                        _self._data = fromCache;

                        if (jQueryAjaxConf.success) {
                            this.mySucess = jQueryAjaxConf.success;
                            this.mySucess(fromCache);
                        }

                        if (jQueryAjaxConf.complete) {
                            this.myComplete = jQueryAjaxConf.complete;
                            this.myComplete(this,'CACHE');
                        }

                        _self.done = function(callback){
                            const callbackArr = Array.isArray(callback)?callback:[callback];
                            for(let c in callbackArr) {
                                _self._tempCallback = callbackArr[c];
                                _self._tempCallback(_self._data);
                            }
                            return _self;
                        };
                        _self.always=_self.done;
                        _self.fail=function(){};

                        _self.then = function(callback){
                            _self._tempCallback = callback;
                            _self._tempCallback(_self._data);
                            return _self;
                        };

                        return this;


                    }else{


                        let oldSuccess = jQueryAjaxConf.success;
                        jQueryAjaxConf.context=jQueryAjaxConf.context?jQueryAjaxConf.context:{};
                        jQueryAjaxConf.context.cacheSuccess=oldSuccess;
                        jQueryAjaxConf.context.cacheKey=key;
                        jQueryAjaxConf.context.expireSecs=expireSecs;
                        jQueryAjaxConf.success = function (data,textStatus,jqXHR) {
                            _cache4js.storeCache(this.cacheKey,data,this.expireSecs);
                            if(this.cacheSuccess)
                                this.cacheSuccess(data,textStatus,jqXHR);
                        }


                    }
                }
            }
            return $.ajax(jQueryAjaxConf);
        };


        //initial definitions
        const _maxElements = _cache4js.getMaxElements();
        if(!_maxElements)
            _cache4js.setMaxElements(DEFAULT_MAX_ELEMENTS);

        if(size===undefined) {
            size=0;
            const count = function (storage) {
                $.each(storage, function (key, value) {
                    if (0 === key.indexOf(_cache4js.CACHE_NAMESPACE)) {
                        size++;
                    }
                });
            };
            count(localStorage);
            count(sessionStorage);
        }


        return _cache4js;
    }

    if(typeof(window.cache4js) === 'undefined'){
        window.cache4js = initCache4js();
    }

});
