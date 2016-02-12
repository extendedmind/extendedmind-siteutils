'use strict';

const request = require('superagent-promise')(require('superagent'), Promise);

const defaultSettings = {
  syncTimeTreshold: 60000, // default to syncing once per minute
  maxCachedHandles: 100  // default to keeping a maximum of 100 handles in-memory at a time
};

const ExtendedMindPublicItems = require('./extendedmind-data.js')

module.exports = (apiUrl, settings) => {

  let backendApi = apiUrl;
  let config = settings ? settings : {};
  config.apiUrl = apiUrl;
  let lastReset;

  for (var defaultSetting in defaultSettings){
    if (defaultSettings.hasOwnProperty(defaultSetting) && !config.hasOwnProperty(defaultSetting)){
      config[defaultSetting] = defaultSettings[defaultSetting];
    }
  }
  // Cache object for all public notes
  let handleCache;

  async function fetchPublicItems(handle){
    let publicOwnerUrl = backendApi + '/public/' + handle;
    let backendResponse = await request.get(publicOwnerUrl);
    if (backendResponse.status === 200){
      return new ExtendedMindPublicItems(backendResponse.body);
    }
  }

  async function refreshPublicItems(handle, cachedItems){
    if (Date.now() - cachedItems.getLastSynced() > config.syncTimeTreshold){
      let publicOwnerModifiedUrl = backendApi + '/public/' + handle +
                                  '?modified=' + cachedItems.getLatestModified();
      let backendResponse = await request.get(publicOwnerModifiedUrl);
      if (backendResponse.status === 200){
        cachedItems.updateItems(backendResponse.body);
      }
    }
    return cachedItems;
  }

  async function getPublicItems(handle){
    // One minute after midnight, that gives the backend one minute to prune all unpublished items and then modified works again
    let todayMidnight = new Date().setUTCHours(0,0,1,0);
    if (!lastReset || lastReset < todayMidnight){
      lastReset = Date.now();
      handleCache = require("lru-cache")(
        { max: config.maxCachedHandles}
      );
    }
    const cachedItems = handleCache.get(handle);
    const items = cachedItems ? await refreshPublicItems(handle, cachedItems) : await fetchPublicItems(handle);
    handleCache.set(handle, items);
    return items;
  }

  return {
    // Returns a list of public items for given handle
    getPublicItems: async function(handle) {
      return await getPublicItems(handle);
    }
  }
};

