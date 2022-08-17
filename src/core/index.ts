import { createElement, Fragment, ReactNode } from 'react';
import { fold as optionFold, fromNullable, isNone, none, Option, some } from 'fp-ts/Option';
import { Either, isLeft, left, right } from 'fp-ts/Either';
import { Lazy, pipe } from 'fp-ts/function';
import { FetchBaseQueryError, QueryStatus } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';

export type RTKError = FetchBaseQueryError | SerializedError;

type RemoteRTKBase = {
  status: QueryStatus;
};

export type RemoteRTKInitial = RemoteRTKBase & {
  error?: undefined;
  data: undefined;
};

export type RemoteRTKPending<A> = RemoteRTKBase & {
  data?: A;
};

export type RemoteRTKSuccess<A> = RemoteRTKBase & {
  error?: undefined;
  data: A;
};

export type RemoteRTKFailure<E> = RemoteRTKBase & {
  error: E;
  data: undefined;
};

export type RemoteRTK<E, A> =
  | RemoteRTKInitial
  | RemoteRTKPending<A>
  | RemoteRTKSuccess<A>
  | RemoteRTKFailure<E>;

/**
 * RemoteRTKInitial constant
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const initialUsers: RemoteRTK<RTKError, User[]> = remoteRTK.initial;
 */
const initial: RemoteRTK<never, never> = {
  data: undefined,
  error: undefined,
  status: QueryStatus.uninitialized,
};

/**
 * RemoteRTKPending factory. Can be with or without "transitional" data
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const pendingUsersWithData: RemoteRTK<RTKError, User[]> = remoteRTK.pending([{name: "John", age: 20}]);
 * const pendingUsers: RemoteRTK<RTKError, User[]> = remoteRTK.pending();
 */
const pending = <A>(value?: A): RemoteRTK<never, A> => ({
  data: value,
  status: QueryStatus.pending,
});

/**
 * RemoteRTKFailure factory. Takes the "left" part of RemoteRTK
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const failureUsers: RemoteRTK<RTKError, User[]> = remoteRTK.failure(new Error('failed to fetch'));
 * // left part can be whatever you need
 * const failureUsersCustomError: RemoteRTK<{reason: string}, User[]> = remoteRTK.failure({reason: 'failed to fetch'});
 */
const failure = <E>(error: E): RemoteRTK<E, never> => ({
  data: undefined,
  error,
  status: QueryStatus.rejected,
});

/**
 * RemoteRTKSuccess factory. Takes the "right" part of RemoteRTK
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const successUsers: RemoteRTK<RTKError, User[]> = remoteRTK.success([{name: "John", age: 20}])
 */
const success = <A>(value: A): RemoteRTK<never, A> => ({
  data: value,
  error: undefined,
  status: QueryStatus.fulfilled,
});

/**
 * Checks if RemoteRTK<E, A> is RemoteRTKInitial
 *
 * @example
 * import { remoteRTK } from 'remote-data-rtk';
 * remoteRTK.isInitial(remoteRTK.initial) // true
 * remoteRTK.isInitial(remoteRTK.pending()) // false
 */
const isInitial = <E, A>(data: RemoteRTK<E, A>): data is RemoteRTKInitial =>
  data.status === QueryStatus.uninitialized;

/**
 * Checks if RemoteRTK<E, A> is RemoteRTKPending<A>
 *
 * @example
 * import { remoteRTK } from 'remote-data-rtk';
 * remoteRTK.isPending(remoteRTK.pending()) // true
 * remoteRTK.isPending(remoteRTK.failure(new Error())) // false
 */
const isPending = <E, A>(data: RemoteRTK<E, A>): data is RemoteRTKPending<A> =>
  data.status === QueryStatus.pending;

/**
 * Checks if RemoteRTK<E, A> is RemoteRTKFailure<E, A>
 *
 * @example
 * import { remoteRTK } from 'remote-data-rtk';
 * remoteRTK.isFailure(remoteRTK.failure(new Error())) // true
 * remoteRTK.isFailure(remoteRTK.success([])) // false
 */
const isFailure = <E, A>(data: RemoteRTK<E, A>): data is RemoteRTKFailure<E> =>
  data.status === QueryStatus.rejected;

/**
 * Checks if RemoteRTK<E, A> is RemoteRTKSuccess<A>
 *
 * @example
 * import { remoteRTK } from 'remote-data-rtk';
 * remoteRTK.isSuccess(remoteRTK.success([])) // true
 * remoteRTK.isSuccess(remoteRTK.pending([])) // false
 */
const isSuccess = <E, A>(data: RemoteRTK<E, A>): data is RemoteRTKSuccess<A> =>
  data.status === QueryStatus.fulfilled;

/**
 * Transforms the right part of RemoteRTK<E, A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * type UserInfo = string; // name + age
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 * const remoteUserName: RemoteRTK<RTKError, UserInfo> = pipe(remoteUser, remoteRTK.map(user => `${user.name} ${user.age}`))
 */
const map =
  <A, E, B>(f: (a: A) => B) =>
  (data: RemoteRTK<E, A>): RemoteRTK<E, B> =>
    ({
      ...data,
      data: data.data != null ? f(data.data) : data.data,
    } as RemoteRTK<E, B>);

/**
 * Unwraps RemoteRTK<E, A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { pipe, identity } from 'fp-ts/function';
 * import { option } from 'fp-ts';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 *
 * const user: string = pipe(
 *   remoteUser,
 *   remoteRTK.map(user => `${user.name} ${user.age}`),
 *   remoteRTK.fold(
 *     () => 'nothing is fetched',
 *     option.fold(() => 'just pending', (userInfo) => `info: ${userInfo}. pending again for some reason`),
 *     String,
 *     identity,
 *   )
 * )
 */
const fold =
  <A, E, B>(
    onInitial: Lazy<B>,
    onPending: (data: Option<A>) => B,
    onFailure: (e: E) => B,
    onSuccess: (a: A) => B,
  ) =>
  (data: RemoteRTK<E, A>): B => {
    if (isInitial(data)) return onInitial();
    if (isFailure(data)) return onFailure(data.error);
    if (isSuccess(data)) return onSuccess(data.data);
    return onPending(fromNullable(data.data));
  };

/**
 * Transforms RemoteRTK<E, A> to B
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 *
 * const user: string = pipe(
 *   remoteUser,
 *   remoteRTK.map(user => `${user.name} ${user.age}`),
 *   remoteRTK.getOrElse(() => 'no user was fetched')
 * )
 */
const getOrElse =
  <A, E>(onElse: Lazy<A>) =>
  (data: RemoteRTK<E, A>) => {
    if (isSuccess(data)) return data.data;
    if (isPending(data) && data.data != null) return data.data;
    return onElse();
  };

/**
 * Transforms RemoteRTK<E, A> to A | null
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 *
 * const nullableUser: User | null = remoteRTK.toNullable(remoteUser);
 */
const toNullable = <E, A>(data: RemoteRTK<E, A>): A | null => {
  if (isSuccess(data)) return data.data;
  if (isPending(data) && data.data != null) return data.data;
  return null;
};

/**
 * Creates RemoteRTK<E, A> from an Option<A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { option } from 'fp-ts';
 * import { Option } from 'fp-ts/Option';
 * type User = { name: string; age: number };
 * const optionUser: Option<User> = option.some({name: 'John', age: 20})
 *
 * const remoteFromOptionUser: RemoteRTK<RTKError, User> = remoteRTK.fromOption(optionUser, () => new Error('option was none'))
 */
const fromOption = <E, A>(option: Option<A>, onNone: Lazy<E>): RemoteRTK<E, A> => {
  if (isNone(option)) return failure(onNone());
  return success(option.value);
};

/**
 * Transforms RemoteRTK<E, A> to Option<A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { Option } from 'fp-ts/Option';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 *
 * const optionUser: Option<User> = remoteRTK.toOption(remoteUser);
 */
const toOption = <E, A>(data: RemoteRTK<E, A>): Option<A> => {
  if (isSuccess(data)) return some(data.data);
  if (isPending(data) && data.data != null) return some(data.data);
  return none;
};

/**
 * Creates RemoteRTK<E, A> from an Either<E, A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { Either, right } from 'fp-ts/lib/Either';
 * type User = { name: string; age: number };
 * const eitherUser: Either<RTKError, User> = right({name: 'John', age: 20})
 *
 * const remoteFromEitherUser: RemoteRTK<RTKError, User> = remoteRTK.fromEither(eitherUser)
 */
const fromEither = <E, A>(ea: Either<E, A>): RemoteRTK<E, A> =>
  isLeft(ea) ? failure(ea.left) : success(ea.right);

/**
 * Transforms RemoteRTK<E, A> to Either<E, A>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { Either } from 'fp-ts/lib/Either';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 *
 * const eitherUser: Either<RTKError, User> = pipe(
 *   remoteUser,
 *   remoteRTK.toEither(() => new Error('initial'), () => new Error('pending'))
 * )
 */
const toEither =
  <E, A>(onInitial: Lazy<E>, onPending: Lazy<E>) =>
  (data: RemoteRTK<E, A>): Either<E, A> => {
    if (isSuccess(data)) return right(data.data);
    if (isFailure(data)) return left(data.error);
    if (isInitial(data)) return left(onInitial());
    if (isPending(data) && data.data != null) return right(data.data);
    return left(onPending());
  };

/**
 * Chains RemoteRTK<E, A> to RemoteRTK<E, B>
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * type UserInfo = string; // name + age
 *
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
 * const chained = pipe(
 *   remoteUser,
 *   remoteRTK.chain<RTKError, User, UserInfo>((user) => remoteRTK.success(`${user.name} ${user.age}`))
 * )
 */
const chain =
  <E, A, B>(f: (a: A) => RemoteRTK<E, B>) =>
  (data: RemoteRTK<E, A>): RemoteRTK<E, B> => {
    if (isSuccess(data)) return f(data.data);
    if (isPending(data) && data.data != null) return f(data.data);
    return data as RemoteRTK<E, B>;
  };

interface SequenceT {
  <E, A>(a: RemoteRTK<E, A>): RemoteRTK<E, [A]>;

  <E, A, B>(a: RemoteRTK<E, A>, b: RemoteRTK<E, B>): RemoteRTK<E, [A, B]>;

  <E, A, B, C>(a: RemoteRTK<E, A>, b: RemoteRTK<E, B>, c: RemoteRTK<E, C>): RemoteRTK<E, [A, B, C]>;

  <E, A, B, C, D>(
    a: RemoteRTK<E, A>,
    b: RemoteRTK<E, B>,
    c: RemoteRTK<E, C>,
    d: RemoteRTK<E, D>,
  ): RemoteRTK<E, [A, B, C, D]>;

  <E, A, B, C, D, F>(
    a: RemoteRTK<E, A>,
    b: RemoteRTK<E, B>,
    c: RemoteRTK<E, C>,
    d: RemoteRTK<E, D>,
    f: RemoteRTK<E, F>,
  ): RemoteRTK<E, [A, B, C, D, F]>;

  <E, A, B, C, D, F, G>(
    a: RemoteRTK<E, A>,
    b: RemoteRTK<E, B>,
    c: RemoteRTK<E, C>,
    d: RemoteRTK<E, D>,
    f: RemoteRTK<E, F>,
    g: RemoteRTK<E, G>,
  ): RemoteRTK<E, [A, B, C, D, F, G]>;
}

/**
 * Transforms multiple remote data (in tuple) into one
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * type City = { title: string };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20});
 * const remoteCity: RemoteRTK<RTKError, City> = remoteRTK.success({title: "New Orleans"});
 *
 * const remoteCombined: RemoteRTK<RTKError, [User, City]> = remoteRTK.sequenceT(remoteUser, remoteCity)
 */
const sequenceT: SequenceT = ((...list: RemoteRTK<any, any>[]) => {
  const successCount = list.filter(isSuccess).length;
  if (successCount === list.length) return success(list.map(({ data }) => data));

  const failureEntry = list.find(isFailure);
  if (failureEntry) return failure(failureEntry.error);

  const pendingDataOrSuccessCount = list.filter(
    (el) => (isPending(el) && el.data != null) || isSuccess(el),
  ).length;
  if (pendingDataOrSuccessCount === list.length) return pending(list.map(({ data }) => data));

  const pendingCount = list.filter(isPending).length;
  if (pendingCount > 0) return pending();

  return initial;
}) as SequenceT;

interface SequenceS {
  <E, S extends Record<string, RemoteRTK<any, any>>>(struct: S): RemoteRTK<
    E,
    {
      [K in keyof S]: S[K] extends RemoteRTK<E, infer R> ? R : never;
    }
  >;
}

/**
 * Transforms multiple remote data (in struct) into one
 *
 * @example
 * import { remoteRTK, RTKError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * type City = { title: string };
 * const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20});
 * const remoteCity: RemoteRTK<RTKError, City> = remoteRTK.success({title: "New Orleans"});
 *
 * const remoteCombined: RemoteRTK<RTKError, {user: User; city: City}> = remoteRTK.sequenceS({user: remoteUser, city: remoteCity})
 */
const sequenceS = (<S extends Record<string, RemoteRTK<any, any>>>(struct: S) => {
  const entries = Object.entries(struct);
  const list = entries.map(([, el]) => el);

  // @ts-ignore
  const tupleSequence: RemoteRTK<any, any> = sequenceT(...list);

  if (isSuccess(tupleSequence))
    return success(entries.reduce((acc, [key, el]) => ({ ...acc, [key]: el.data }), {}));

  if (isPending(tupleSequence) && tupleSequence.data != null)
    return pending(
      entries.reduce(
        (acc, [key, el]) => ({
          ...acc,
          [key]: el.data,
        }),
        {},
      ),
    );

  if (isPending(tupleSequence)) return pending();

  if (isFailure(tupleSequence)) return tupleSequence;

  return initial;
}) as SequenceS;

export const remoteRTK = {
  initial,
  pending,
  failure,
  success,
  isInitial,
  isPending,
  isFailure,
  isSuccess,
  map,
  fold,
  getOrElse,
  toNullable,
  fromOption,
  toOption,
  fromEither,
  toEither,
  chain,
  sequenceT,
  sequenceS,
};

export type RenderRemoteRTKProps<E, A> = {
  /** Remote data needs to be rendered */
  data: RemoteRTK<E, A>;
  /** Render content function on failure state */
  failure?: (e: E) => ReactNode;
  /** Render content constant on initial state */
  initial?: ReactNode;
  /** Render content constant on pending state */
  pending?: ReactNode;
  /** Render content function on pending with data (refetching) state */
  refetching?: (data: A) => ReactNode;
  /** Render content function on success state */
  success: (data: A) => ReactNode;
};

export const RenderRemoteRTK = <E, A>({
  data,
  pending = null,
  refetching = () => pending,
  failure = () => null,
  initial = null,
  success,
}: RenderRemoteRTKProps<E, A>): JSX.Element =>
  createElement(
    Fragment,
    null,
    pipe(
      data,
      remoteRTK.fold(
        () => initial,
        optionFold(() => pending, refetching),
        failure,
        success,
      ),
    ),
  );
