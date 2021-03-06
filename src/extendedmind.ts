import * as superagent from "superagent";
import superagentPromise = require("superagent-promise");
const request = superagentPromise(superagent, Promise);

import * as lruCache from "lru-cache";
import { processExternalPublicNote, PublicHeaders, PublicItems } from "./extendedmind-data";

export interface ClientPlatformInfo {
  url?: string;
  name?: string;
  notes?: string;
  pub_date?: string;
  version: string;
  userType: number;
  updateUrl?: string;
  fullUrl?: string;
}

export interface ClientPlatform {
  "platform": string;
  info: ClientPlatformInfo;
}

export interface Info {
  build: string;
  commonCollective: [string, string];
  version: string;
  created: number;
  ui?: string;
  clients?: ClientPlatform[];
}

export class Utils {

  public defaultCacheSettings = {
    maxCachedHandles: 100,  // default to keeping a maximum of 100 handles in-memory at a time
    syncTimeTreshold: 60000, // default to syncing once per minute
  };

  private cacheSettings: any;

  // Cache object for all public notes per owner
  private handleCache: lruCache.Cache<PublicItems>;
  private lastHandleCacheReset: number;
  // Cache object for all public notes headers
  private headers: any;
  private lastHeadersReset: number;

  constructor(private backendApiUrl: string, cacheSettings?: any) {
    // Use default settings for cache unless override options are given as parameter
    this.cacheSettings = cacheSettings ? cacheSettings : {};
    for (const defaultSetting in this.defaultCacheSettings) {
      if (this.defaultCacheSettings.hasOwnProperty(defaultSetting) &&
          !this.cacheSettings.hasOwnProperty(defaultSetting)) {
        this.cacheSettings[defaultSetting] = this.defaultCacheSettings[defaultSetting];
      }
    }
  }

  public async fetchPublicItems(handle) {
    const publicOwnerUrl: string = this.backendApiUrl + "/v2/public/" + handle;
    const backendResponse = await request.get(publicOwnerUrl).end();
    if (backendResponse.status === 200) {
      return new PublicItems(handle, backendResponse.body);
    }
  }

  public async refreshPublicItems(handle, cachedItems) {
    if (Date.now() - cachedItems.getLastSynced() > this.cacheSettings.syncTimeTreshold) {
      const publicOwnerModifiedUrl = this.backendApiUrl + "/v2/public/" + handle +
        "?modified=" + cachedItems.getLatestModified();
      try {
        const backendResponse = await request.get(publicOwnerModifiedUrl).end();
        if (backendResponse.status === 200) {
          cachedItems.updateItems(backendResponse.body);
        }
      } catch (exception) {
        // When refreshing, don't crash but just return potentially stale data
        console.error("Could not connect to backend refreshing public items: " + exception);
      }
    }
    return cachedItems;
  }

  public async fetchPublicHeaders(): Promise<PublicHeaders> {
    const publicUrl = this.backendApiUrl + "/v2/public";
    const backendResponse = await request.get(publicUrl).end();
    if (backendResponse.status === 200) {
      return new PublicHeaders(backendResponse.body);
    }
  }

  public async refreshPublicHeaders(cachedHeaders: PublicHeaders): Promise<PublicHeaders> {
    if (Date.now() - cachedHeaders.getLastSynced() > this.cacheSettings.syncTimeTreshold) {
      const publicOwnerModifiedUrl = this.backendApiUrl + "/v2/public" +
        "?modified=" + cachedHeaders.getLatestModified();
      try {
        const backendResponse = await request.get(publicOwnerModifiedUrl).end();
        if (backendResponse.status === 200) {
          cachedHeaders.updateHeaders(backendResponse.body);
        }
      } catch (exception) {
        // When refreshing, don't crash but just return potentially stale data
        console.error("Could not connect to backend when refreshing public headers: " + exception);
      }
   }
    return cachedHeaders;
  }

  public async getPublicItems(handle) {
    // One minute after midnight, that gives the backend one minute to prune all unpublished
    // items and then modified works again
    const todayMidnight = new Date().setUTCHours(0, 0, 1, 0);
    if (!this.lastHandleCacheReset || this.lastHandleCacheReset < todayMidnight) {
      this.lastHandleCacheReset = Date.now();
      this.handleCache = lruCache<PublicItems>(
        { max: this.cacheSettings.maxCachedHandles},
      );
    }
    const cachedItems: PublicItems = this.handleCache.get(handle);
    const items = cachedItems ?
      await this.refreshPublicItems(handle, cachedItems) : await this.fetchPublicItems(handle);
    this.handleCache.set(handle, items);
    return items;
  }

  public async getPublicHeaders(): Promise<any> {
    // One minute after midnight, that gives the backend one minute to prune all unpublished
    // items and then modified works again
    const todayMidnight = new Date().setUTCHours(0, 0, 1, 0);
    if (!this.lastHeadersReset || this.lastHeadersReset < todayMidnight) {
      this.lastHeadersReset = Date.now();
      this.headers = undefined;
    }

    this.headers = this.headers ?
      await this.refreshPublicHeaders(this.headers) : await this.fetchPublicHeaders();
    return this.headers;
  }

  public async getPreviewItem(ownerUUID, itemUUID, previewCode) {
    const backendResponse = await request.get(this.backendApiUrl + "/v2/owners/" + ownerUUID + "/data/" +
        itemUUID + "/preview/" + previewCode).end();
    if (backendResponse.status === 200) {
      return processExternalPublicNote(backendResponse.body);
    }
  }

  public async getInfo(latest?: boolean, history?: boolean): Promise<Info> {
    let url = this.backendApiUrl + "/v2/info";
    if (latest === true) {
      url += "?latest=true";
      if (history === true) {
        url += "&history=true";
      }
    }
    const infoResponse = await request.get(url)
        .set("Accept", "application/json")
        .end();
    return infoResponse.body;
  }

  public async getShortId(shortId) {
    // First, search if given short id is already cached
    if (this.handleCache) {
      const cachedPublicItems = this.handleCache.values();
      for (const cachedPublicItem of cachedPublicItems) {
        const shortIdInfo = cachedPublicItem.getShortId(shortId);
        if (shortIdInfo) return shortIdInfo;
      }
    }

    // Not cached, get it from the backend
    const backendResponse = await request.get(this.backendApiUrl + "/v2/short/" + shortId).end();
    if (backendResponse.status === 200) {
      return backendResponse.body;
    }
  }
}
