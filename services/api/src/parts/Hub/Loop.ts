/**
 * Implement endless loop with adding and removing executors
 */
export class Loop<T = any> {
  protected _items :T[] = []; // simple implementation without real double-linked lists
  protected _pointer = 0;

  constructor(items :T[] = []) {
    this._items = [ ...items ];
  }

  /**
   * Get loop size
   */
  public get size() :number {
    return this._items.length;
  }

  /**
   * Check loop is empty
   */
  public get isEmpty() :boolean {
    return this._items.length === 0;
  }

  /**
   * Clear loop
   */
  public clear() :Loop<T> {
    this._items = [];
    this._pointer = 0;
    return this;
  }

  /**
   * Add item **before** current pointer
   * **IS NOT PROTECTED FROM DUPLICATES** use has method before add if you want to avoid duplicates
   * @param item
   */
  public add(item :T) :Loop<T> {
    const { _pointer, _items } = this;
    const prev = _items.slice(0, _pointer);
    const next = _items.slice(_pointer);
    this._items = [ ...prev, item, ...next ]; // custom splice
    this._pointer++;
    return this;
  }

  /**
   * Remove item from loop and if pointer has point to item, move pointer to next item
   * Found the closest item from pointer
   * @param item
   */
  public remove(item :T) :Loop<T> {
    const { _pointer, _items } = this;
    let index = _items.indexOf(item, _pointer);
    if (index === -1) {
      index = _items.indexOf(item);
    }
    if (index === -1) {
      return this;
    }
    this._items = [ ..._items.slice(0, index), ..._items.slice(index + 1) ]; // custom splice
    if (_pointer >= index) {
      this._pointer--;
    }
    return this;
  }

  /**
   * Get next item in loop
   * If loop is empty return undefined,
   * but when you want to check loop is empty use isEmpty prop
   */
  public next() :T | undefined {
    if (this._items.length === 0) {
      return undefined;
    }
    const item = this._items[this._pointer];
    this._pointer = (this._pointer + 1) % this._items.length;
    return item;
  }

  /**
   * Check loop has item
   * @param item
   */
  public has(item :T) :boolean {
    return this._items.includes(item);
  }
}
