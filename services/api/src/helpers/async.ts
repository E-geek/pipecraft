/* eslint-disable @typescript-eslint/no-explicit-any */
export const wait = (timeout :number) :Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });

export interface IPromise<T, R = any> {
  promise :Promise<T>;
  done :(arg :T) =>void;
  fail :(arg :R) =>void;
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
