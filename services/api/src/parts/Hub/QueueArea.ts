import { IPiece } from '@pipecraft/types';
import { IBuilding } from '@/parts/Manufacture/Building';
import { IPipe } from '@/parts/Manufacture/Pipe';

export interface IQueueItem {
  building :IBuilding;
  pipe :IPipe;
  batch :IPiece[];
  nice :number;
  vRuntime :number; // should be -1 for new items
}

export interface IQueueArea {
  push(item :IQueueItem) :IQueueArea;
  pop() :IQueueItem;
}

export class QueueArea {

}
