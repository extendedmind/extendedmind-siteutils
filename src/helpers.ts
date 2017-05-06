export interface ArraySlice {
  arraySlice: any[];
  remaining: number;
}

export function getSliceOfArrayWithRemaining(
    itemsPerPage: number, array: any[], queryParamRemaining?: number): ArraySlice {
  // How many items were indicated as being not shown previously. If first query, everything is remaining
  const previousRemaining: number = queryParamRemaining === undefined ? array.length : queryParamRemaining;
  // Because new headers might be added to the top of the array, we use remaining to count the index from
  // the end.
  const firstHeaderIndex: number = array.length - previousRemaining;
  const arraySlice: any[] = array.slice(firstHeaderIndex, firstHeaderIndex + itemsPerPage);
  const remaining: number = array.length - (firstHeaderIndex + itemsPerPage) < 0
    ? 0 : array.length - (firstHeaderIndex + itemsPerPage);
  return { arraySlice, remaining };
}
