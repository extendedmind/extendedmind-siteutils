import {initializeExtendedMindUtils, ExtendedMindUtilsAPI} from './extendedmind';
import {ExtendedMindPublicItems as _ExtendedMindPublicItems} from './extendedmind-data';

export module extendedmindUtils {
  export class ExtendedMindPublicItems extends _ExtendedMindPublicItems{};
  export function initialize(apiUrl: string, settings?: any): ExtendedMindUtilsAPI{
    return initializeExtendedMindUtils(apiUrl, settings);
  };
}