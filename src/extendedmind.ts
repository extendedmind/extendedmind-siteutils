import * as superagent from 'superagent';
import superagentPromise = require('superagent-promise')
const request = superagentPromise(superagent, Promise);

import * as lruCache from 'lru-cache';

const defaultSettings = {
  syncTimeTreshold: 60000, // default to syncing once per minute
  maxCachedHandles: 100  // default to keeping a maximum of 100 handles in-memory at a time
};

import {ExtendedMindPublicItems} from './extendedmind-data';

export interface ExtendedMindUtilsAPI{
  getPublicItems(handle: string): Promise<any>;
  getPreviewItem(ownerUUID: string, itemUUID: string, previewCode: string): Promise<any>;
}

export function initializeExtendedMindUtils(apiUrl: string, settings?: any): ExtendedMindUtilsAPI {

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
    let backendResponse = await request.get(publicOwnerUrl).end();
    if (backendResponse.status === 200){
      return new ExtendedMindPublicItems(backendResponse.body);
    }
  }

  async function refreshPublicItems(handle, cachedItems){
    if (Date.now() - cachedItems.getLastSynced() > config.syncTimeTreshold){
      let publicOwnerModifiedUrl = backendApi + '/public/' + handle +
                                  '?modified=' + cachedItems.getLatestModified();
      let backendResponse = await request.get(publicOwnerModifiedUrl).end();
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
      handleCache = lruCache(
        { max: config.maxCachedHandles}
      );
    }
    const cachedItems = handleCache.get(handle);
    const items = cachedItems ? await refreshPublicItems(handle, cachedItems) : await fetchPublicItems(handle);
    handleCache.set(handle, items);
    return items;
  }


  async function getPreviewItem(ownerUUID, itemUUID, previewCode) {
    let backendResponse = await request.get(backendApi + '/' + ownerUUID + '/item/' +
                                              itemUUID + '/preview/' + previewCode).end();
    if (backendResponse.status === 200){
      return backendResponse.body;
    }
  }

  return {
    // Returns a list of public items for given handle
    getPublicItems: async function(handle) {
      return await getPublicItems(handle);
    },
    // Returns one preview item based on given information
    getPreviewItem: async function(ownerUUID, itemUUID, previewCode){
      return await getPreviewItem(ownerUUID, itemUUID, previewCode);
    }
  }
};

