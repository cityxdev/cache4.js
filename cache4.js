const CACHE_NAMESPACE = '__CACHE4JS__';

/**
 * Obtain a cached value
 * @param key The key of the cached value
 * @param defVal A default value
 * @returns The cached value, or the default value if the cached value is not present or has expired
 */
const loadCache = function(key, defVal) {
    const item = localStorage.getItem(CACHE_NAMESPACE+btoa(key));
    const cache = item?JSON.parse(item):undefined;
    const isExpired = cache&&cache.expireSecs&&Date.now()-cache.expireSecs*1000>cache.millis;
    if(isExpired)
        removeCache(key);
    return cache&&!isExpired ? cache.value:defVal;
};

/**
 * Store a new cache if possible
 * This function fails if the local storage is full
 * @param key The key of the cache to store
 * @param value The value to store
 * @param expireSecs If defined, the number of seconds after which the cached value expires
 * @returns The cached value
 */
const storeCache = function(key, value, expireSecs) {
    if(value!==null && value!==undefined) {
        let cache = {
            value: value,
            millis: Date.now(),
            expireSecs: expireSecs
        };
        try {
            localStorage.setItem(CACHE_NAMESPACE + btoa(key), JSON.stringify(cache));
        } catch (e) {
            console.log(e);
        }
        setTimeout(clearExpiredCaches,10);
    }
    return value;
};

/**
 * Remove a cache
 * @param key The key of the cache to remove
 */
const removeCache = function (key) {
    localStorage.removeItem(key);
};

/**
 * Delete all caches
 */
const clearCaches = function () {
    $.each(localStorage, function (key, value) {
        if (0 === key.indexOf(CACHE_NAMESPACE))
            localStorage.removeItem(key);
    });
};

/**
 * Delete all expired caches
 */
const clearExpiredCaches = function () {
    $.each(localStorage, function (key, value) {
        if (0 === key.indexOf(CACHE_NAMESPACE)) {
            const item = localStorage.getItem(key);
            const cache = item?JSON.parse(item):undefined;
            const isExpired = cache&&cache.expireSecs&&Date.now()-cache.expireSecs*1000>cache.millis;
            if(isExpired)
                localStorage.removeItem(key);
        }
    });
};


/**
 * A wrapper to the $.ajax function that tries to retrieve the result form cache
 * If the result is not present, falls back to $.ajax and returns the result of that call (but caches the result)
 * The return value of this function should be used just like the return value of $.ajax
 * Only GET requests get cached
 * @param jQueryAjaxConf The $.ajax configuration object
 * @param expireSecs [optional] a number of seconds for the cache to last (default: 5 minutes)
 * @returns An ajax execution
 */
const ajaxCache = function (jQueryAjaxConf,expireSecs) {
    return new AjaxCacheObj(jQueryAjaxConf,expireSecs);
};

const AjaxCacheObj = function (jQueryAjaxConf, expireSecs) {

    let _self=this;

    this._data = undefined;

    expireSecs=expireSecs||5*60;
    if(!jQueryAjaxConf.method || jQueryAjaxConf.method.toLowerCase()!=='get'){
        if(jQueryAjaxConf.url){
            const fromCache = loadCache(jQueryAjaxConf.url+(jQueryAjaxConf.headers&&Object.keys(jQueryAjaxConf.headers)>0?JSON.stringify(jQueryAjaxConf.headers):''),undefined);
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
                jQueryAjaxConf.context.cacheKey=jQueryAjaxConf.url+(jQueryAjaxConf.headers&&Object.keys(jQueryAjaxConf.headers)>0?JSON.stringify(jQueryAjaxConf.headers):'');
                jQueryAjaxConf.context.expireSecs=expireSecs;
                jQueryAjaxConf.success = function (data,textStatus,jqXHR) {
                    storeCache(this.cacheKey,data,this.expireSecs);
                    if(this.cacheSuccess)
                        this.cacheSuccess(data,textStatus,jqXHR);
                }


            }
        }
    }
    return $.ajax(jQueryAjaxConf);
};

