'use strict';

const request = require('superagent-promise')(require('superagent'), Promise);

const defaultSettings = {
  syncTimeTreshold: 60000, // default to syncing once per minute
  maxCachedHandles: 100  // default to keeping a maximum of 100 handles in-memory at a time
};

const PublicItems = require('./extendedmind-data');

module.exports = (apiUrl, settings) => {

  let config = settings ? settings : {};
  config.apiUrl = apiUrl;

  for (var defaultSetting in defaultSettings){
    if (defaultSettings.hasOwnProperty(defaultSetting) && !config.hasOwnProperty(defaultSetting)){
      config[defaultSetting] = defaultSettings[defaultSetting];
    }
  }
  // Cache object for all public notes
  let handleCache = require("lru-cache")(
    { max: config.maxCachedHandles}
  );

  function fetchPublicItems(handle){

  }

  function refreshPublicItems(cachedItems){

  }

  function filterPublicItems(items, filters){

  }

  function getPublicItems(handle){
    const cachedItems = handleCache.get(handle);
    const items = cachedItems ? refreshPublicItems(cachedItems) : getAllPublicItems(handle);
    handleCache.set(items);
    return items;
  }

  return {
    getPublicItems: (handle, filters) => {
      const items = getPublicItems(handle);
      return filterPublicItems(items, filters);
    },
    getPublicNote: (handle, path) => {
      const items = getPublicItems(handle);
      return items.getPublicNote(path);
    }
  }
};

