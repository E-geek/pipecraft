import { IPieceId } from '@pipecraft/types';
import { BatchGetter, IBatchGetterProps } from './BatchGetter';

export class DirectBatchGetter extends BatchGetter {
  private _cursor :IPieceId;

  constructor(args :IBatchGetterProps) {
    super(args);
    this._cursor = args.firstCursor; // Start cursor from `firstCursor`
  }

  getBatch(size :number) :IPieceId[] {
    const result :IPieceId[] = [];

    // Step 1: Consume IDs from the recycle list
    for (const id of this._recycleList) {
      if (result.length >= size) break;
      this._recycleList.delete(id);
      this._holdList.add(id);
      result.push(id);
    }

    // Step 2: Consume IDs from the heap list sequentially, respecting the cursor
    const sortedHeap = Array.from(this._heapList).sort((a, b) => (a < b ? -1 : 1));
    for (const id of sortedHeap) {
      if (result.length >= size) break;
      if (id > this._cursor && !this._holdList.has(id)) {
        this._holdList.add(id);
        result.push(id);
      }
    }

    // Step 3: Update the cursor if new IDs were fetched
    if (result.length > 0) {
      this._cursor = result[result.length - 1]; // Move cursor to the last fetched ID
    }

    return result;
  }

  release(ids :IPieceId[]) :void {
    ids.forEach((id) => {
      this._holdList.delete(id); // Remove IDs from hold list
    });
  }

  recycle(ids :IPieceId[]) :void {
    ids.forEach((id) => {
      this._recycleList.add(id); // Add IDs directly to recycle list
    });
  }
}
