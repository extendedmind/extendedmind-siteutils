import * as superagent from "superagent";
import superagentPromise = require("superagent-promise");
const request = superagentPromise(superagent, Promise);

import * as lruCache from "lru-cache";

const defaultSettings = {
  maxCachedHandles: 100,  // default to keeping a maximum of 100 handles in-memory at a time
  syncTimeTreshold: 60000, // default to syncing once per minute
};

import {ExtendedMindPublicItems, ExtendedMindHeaders} from "./extendedmind-data";

export interface ExtendedMindUtilsAPI {
  getInfo(): Promise<any>;
  getHeaders(): Promise<any>;
  getPreviewItem(ownerUUID: string, itemUUID: string, previewCode: string): Promise<any>;
  getPublicItems(handle: string): Promise<any>;
}

export function initializeExtendedMindUtils(apiUrl: string, settings?: any): ExtendedMindUtilsAPI {

  let backendApi = apiUrl;
  let config = settings ? settings : {};
  config.apiUrl = apiUrl;

  for (let defaultSetting in defaultSettings) {
    if (defaultSettings.hasOwnProperty(defaultSetting) && !config.hasOwnProperty(defaultSetting)) {
      config[defaultSetting] = defaultSettings[defaultSetting];
    }
  }
  // Cache object for all public notes per owner
  let handleCache;
  let lastHandleCacheReset: number;

  // Cache object for all public notes headers
  let headers;
  let lastHeadersReset: number;

  async function fetchPublicItems(handle) {
    let publicOwnerUrl = backendApi + "/public/" + handle;
    let backendResponse = await request.get(publicOwnerUrl).end();
    if (backendResponse.status === 200) {
      return new ExtendedMindPublicItems(backendResponse.body);
    }
  }

  async function refreshPublicItems(handle, cachedItems) {
    if (Date.now() - cachedItems.getLastSynced() > config.syncTimeTreshold) {
      let publicOwnerModifiedUrl = backendApi + "/public/" + handle +
                                  "?modified=" + cachedItems.getLatestModified();
      let backendResponse = await request.get(publicOwnerModifiedUrl).end();
      if (backendResponse.status === 200) {
        cachedItems.updateItems(backendResponse.body);
      }
    }
    return cachedItems;
  }

  async function fetchHeaders(): Promise<ExtendedMindHeaders> {
    let publicUrl = backendApi + "/public";
    let backendResponse = await request.get(publicUrl).end();
    if (backendResponse.status === 200) {
      return new ExtendedMindHeaders(backendResponse.body);
    }
  }

  async function refreshHeaders(cachedHeaders: ExtendedMindHeaders): Promise<ExtendedMindHeaders> {
    if (Date.now() - cachedHeaders.getLastSynced() > config.syncTimeTreshold) {
      let publicOwnerModifiedUrl = backendApi + "/public" +
                                  "?modified=" + cachedHeaders.getLatestModified();
      let backendResponse = await request.get(publicOwnerModifiedUrl).end();
      if (backendResponse.status === 200) {
        cachedHeaders.updateHeaders(backendResponse.body);
      }
    }
    return cachedHeaders;
  }

  async function getPublicItems(handle) {
    // One minute after midnight, that gives the backend one minute to prune all unpublished
    // items and then modified works again
    let todayMidnight = new Date().setUTCHours(0, 0, 1, 0);
    if (!lastHandleCacheReset || lastHandleCacheReset < todayMidnight) {
      lastHandleCacheReset = Date.now();
      handleCache = lruCache(
        { max: config.maxCachedHandles}
      );
    }
    const cachedItems = handleCache.get(handle);
    const items = cachedItems ? await refreshPublicItems(handle, cachedItems) : await fetchPublicItems(handle);
    handleCache.set(handle, items);
    return items;
  }

  async function getHeaders() {
    // One minute after midnight, that gives the backend one minute to prune all unpublished
    // items and then modified works again
    let todayMidnight = new Date().setUTCHours(0, 0, 1, 0);
    if (!lastHeadersReset || lastHeadersReset < todayMidnight) {
      lastHeadersReset = Date.now();
      headers = undefined;
    }

    headers = headers ? await refreshHeaders(headers) : await fetchHeaders();
    return headers;
  }

  async function getPreviewItem(ownerUUID, itemUUID, previewCode) {
    let backendResponse = await request.get(backendApi + "/" + ownerUUID + "/item/" +
                                              itemUUID + "/preview/" + previewCode).end();
    if (backendResponse.status === 200) {
      return backendResponse.body;
    }
  }

  return {
    getHeaders: async function(): Promise<any> {
      return await getHeaders();
    },
    getInfo: function(): Promise<any>{
      return request.get(backendApi + "/info")
          .set("Accept", "application/json")
          .end();
    },
    // Returns one preview item based on given information
    getPreviewItem: async function(ownerUUID, itemUUID, previewCode){
      return await getPreviewItem(ownerUUID, itemUUID, previewCode);
    },
    // Returns a list of public items for given handle
    getPublicItems: async function(handle) {
      return await getPublicItems(handle);
    },
  };
};

