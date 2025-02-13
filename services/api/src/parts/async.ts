/* eslint-disable @typescript-eslint/no-explicit-any */
import { AnyFunction } from '@pipecraft/types';

export function wait(time :number) :Promise<undefined>;
export function wait(time :number, cb :AnyFunction) :number;

export function wait(time :number, cb ?:AnyFunction) {
  if (cb) {
    return setTimeout(cb, time) as unknown as number;
  }
  return new Promise<undefined>((resolve) => {
    setTimeout(resolve, time);
  });
}

export interface IPromise<T, R = any> {
  promise :Promise<T>;
  done :(arg ?:T) =>void;
  fail :(arg ?:R) =>void;
  resolved :boolean;
}

export const promise = <T, R = any>() :IPromise<T, R> => {
  let extRes :(value :T | PromiseLike<T>) =>void;
  let extRej :(value ?:any) =>void;
  const promiseObject = new Promise<T>((res, rej) => {
    extRes = res;
    extRej = rej;
  });
  const done = (arg :T) :void => {
    extRes(arg);
  };
  const fail = (arg :R) :void => {
    extRej(arg);
  };
  const iPromise = { promise: promiseObject, done, fail, resolved: false };
  promiseObject
    .then((arg :T) => {
      iPromise.resolved = true;
      return arg;
    })
    .catch((arg :R) => {
      iPromise.resolved = true;
      return arg;
    });
  return iPromise;
};
