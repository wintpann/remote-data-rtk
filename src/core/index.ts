import { createElement, Fragment, ReactNode } from 'react';
import { fold as optionFold, fromNullable, isNone, none, Option, some } from 'fp-ts/Option';
import { Either, isLeft, left, right } from 'fp-ts/Either';
import { Lazy, pipe } from 'fp-ts/function';
import { FetchBaseQueryError, QueryStatus } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';

export type RemoteError = FetchBaseQueryError | SerializedError;

type RemoteBase = {
  status: QueryStatus;
};

export type RemoteInitial = RemoteBase & {
  error?: undefined;
  data: undefined;
};

export type RemotePending<A> = RemoteBase & {
  data?: A;
};

export type RemoteSuccess<A> = RemoteBase & {
  error?: undefined;
  data: A;
};

export type RemoteFailure<E> = RemoteBase & {
  error: E;
  data: undefined;
};

export type RemoteData<E, A> =
  | RemoteInitial
  | RemotePending<A>
  | RemoteSuccess<A>
  | RemoteFailure<E>;

/**
 * RemoteInitial constant
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const initialUsers: RemoteData<RemoteError, User[]> = remote.initial;
 */
const initial: RemoteData<never, never> = {
  data: undefined,
  error: undefined,
  status: QueryStatus.uninitialized,
};

/**
 * RemotePending factory. Can be with or without "transitional" data
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const pendingUsersWithData: RemoteData<RemoteError, User[]> = remote.pending([{name: "John", age: 20}]);
 * const pendingUsers: RemoteData<RemoteError, User[]> = remote.pending();
 */
const pending = <A>(value?: A): RemoteData<never, A> => ({
  data: value,
  status: QueryStatus.pending,
});

/**
 * RemoteFailure factory. Takes the "left" part of RemoteData
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const failureUsers: RemoteData<RemoteError, User[]> = remote.failure(new Error('failed to fetch'));
 * // left part can be whatever you need
 * const failureUsersCustomError: RemoteData<{reason: string}, User[]> = remote.failure({reason: 'failed to fetch'});
 */
const failure = <E>(error: E): RemoteData<E, never> => ({
  data: undefined,
  error,
  status: QueryStatus.rejected,
});

/**
 * RemoteSuccess factory. Takes the "right" part of RemoteData
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const successUsers: RemoteData<RemoteError, User[]> = remote.success([{name: "John", age: 20}])
 */
const success = <A>(value: A): RemoteData<never, A> => ({
  data: value,
  error: undefined,
  status: QueryStatus.fulfilled,
});

/**
 * Checks if RemoteData<E, A> is RemoteInitial
 *
 * @example
 * import { remote } from 'remote-data-rtk';
 * remote.isInitial(remote.initial) // true
 * remote.isInitial(remote.pending()) // false
 */
const isInitial = (data: RemoteData<unknown, unknown>): data is RemoteInitial =>
  data.status === QueryStatus.uninitialized;

/**
 * Checks if RemoteData<E, A> is RemotePending<A>
 *
 * @example
 * import { remote } from 'remote-data-rtk';
 * remote.isPending(remote.pending()) // true
 * remote.isPending(remote.failure(new Error())) // false
 */
const isPending = <A>(data: RemoteData<unknown, A>): data is RemotePending<A> =>
  data.status === QueryStatus.pending;

/**
 * Checks if RemoteData<E, A> is RemoteFailure<E, A>
 *
 * @example
 * import { remote } from 'remote-data-rtk';
 * remote.isFailure(remote.failure(new Error())) // true
 * remote.isFailure(remote.success([])) // false
 */
const isFailure = <E>(data: RemoteData<E, unknown>): data is RemoteFailure<E> =>
  data.status === QueryStatus.rejected;

/**
 * Checks if RemoteData<E, A> is RemoteSuccess<A>
 *
 * @example
 * import { remote } from 'remote-data-rtk';
 * remote.isSuccess(remote.success([])) // true
 * remote.isSuccess(remote.pending([])) // false
 */
const isSuccess = <A>(data: RemoteData<unknown, A>): data is RemoteSuccess<A> =>
  data.status === QueryStatus.fulfilled;

/**
 * Transforms the right part of RemoteData<E, A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * type UserInfo = string; // name + age
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 * const remoteUserName: RemoteData<RemoteError, UserInfo> = pipe(remoteUser, remote.map(user => `${user.name} ${user.age}`))
 */
const map =
  <A, E, B>(f: (a: A) => B) =>
  (data: RemoteData<E, A>): RemoteData<E, B> => {
    if (isSuccess(data)) return remote.success(f(data.data));
    // TODO think about what if A is actually undefined | null
    if (isPending(data) && data.data != null) return remote.pending(f(data.data));
    return data as RemoteData<E, B>;
  };

/**
 * Unwraps RemoteData<E, A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { pipe, identity } from 'fp-ts/function';
 * import { option } from 'fp-ts';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 *
 * const user: string = pipe(
 *   remoteUser,
 *   remote.map(user => `${user.name} ${user.age}`),
 *   remote.fold(
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
  (data: RemoteData<E, A>): B => {
    if (isInitial(data)) return onInitial();
    if (isFailure(data)) return onFailure(data.error);
    if (isSuccess(data)) return onSuccess(data.data);
    return onPending(fromNullable(data.data));
  };

/**
 * Transforms RemoteData<E, A> to B
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 *
 * const user: string = pipe(
 *   remoteUser,
 *   remote.map(user => `${user.name} ${user.age}`),
 *   remote.getOrElse(() => 'no user was fetched')
 * )
 */
const getOrElse =
  <A>(onElse: Lazy<A>) =>
  (data: RemoteData<unknown, A>) => {
    if (isSuccess(data)) return data.data;
    if (isPending(data) && data.data != null) return data.data;
    return onElse();
  };

/**
 * Transforms RemoteData<E, A> to A | null
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 *
 * const nullableUser: User | null = remote.toNullable(remoteUser);
 */
const toNullable = <A>(data: RemoteData<unknown, A>): A | null => {
  if (isSuccess(data)) return data.data;
  if (isPending(data) && data.data != null) return data.data;
  return null;
};

/**
 * Creates RemoteData<E, A> from an Option<A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { option } from 'fp-ts';
 * import { Option } from 'fp-ts/Option';
 * type User = { name: string; age: number };
 * const optionUser: Option<User> = option.some({name: 'John', age: 20})
 *
 * const remoteFromOptionUser: RemoteData<RemoteError, User> = remote.fromOption(optionUser, () => new Error('option was none'))
 */
const fromOption = <E, A>(option: Option<A>, onNone: Lazy<E>): RemoteData<E, A> => {
  if (isNone(option)) return failure(onNone());
  return success(option.value);
};

/**
 * Transforms RemoteData<E, A> to Option<A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { Option } from 'fp-ts/Option';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 *
 * const optionUser: Option<User> = remote.toOption(remoteUser);
 */
const toOption = <E, A>(data: RemoteData<E, A>): Option<A> => {
  if (isSuccess(data)) return some(data.data);
  if (isPending(data) && data.data != null) return some(data.data);
  return none;
};

/**
 * Creates RemoteData<E, A> from an Either<E, A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { Either, right } from 'fp-ts/lib/Either';
 * type User = { name: string; age: number };
 * const eitherUser: Either<RemoteError, User> = right({name: 'John', age: 20})
 *
 * const remoteFromEitherUser: RemoteData<RemoteError, User> = remote.fromEither(eitherUser)
 */
const fromEither = <E, A>(ea: Either<E, A>): RemoteData<E, A> =>
  isLeft(ea) ? failure(ea.left) : success(ea.right);

/**
 * Transforms RemoteData<E, A> to Either<E, A>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { Either } from 'fp-ts/lib/Either';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 *
 * const eitherUser: Either<RemoteError, User> = pipe(
 *   remoteUser,
 *   remote.toEither(() => new Error('initial'), () => new Error('pending'))
 * )
 */
const toEither =
  <E, A>(onInitial: Lazy<E>, onPending: Lazy<E>) =>
  (data: RemoteData<E, A>): Either<E, A> => {
    if (isSuccess(data)) return right(data.data);
    if (isFailure(data)) return left(data.error);
    if (isInitial(data)) return left(onInitial());
    if (isPending(data) && data.data != null) return right(data.data);
    return left(onPending());
  };

/**
 * Chains RemoteData<E, A> to RemoteData<E, B>
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * import { pipe } from 'fp-ts/function';
 * type User = { name: string; age: number };
 * type UserInfo = string; // name + age
 *
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
 * const chained = pipe(
 *   remoteUser,
 *   remote.chain<RemoteError, User, UserInfo>((user) => remote.success(`${user.name} ${user.age}`))
 * )
 */
const chain =
  <E, A, B>(f: (a: A) => RemoteData<E, B>) =>
  (data: RemoteData<E, A>): RemoteData<E, B> => {
    if (isSuccess(data)) return f(data.data);
    if (isPending(data) && data.data != null) return f(data.data);
    return data as RemoteData<E, B>;
  };

interface Sequence {
  <E, A>(a: RemoteData<E, A>): RemoteData<E, [A]>;

  <E, A, B>(a: RemoteData<E, A>, b: RemoteData<E, B>): RemoteData<E, [A, B]>;

  <E, A, B, C>(a: RemoteData<E, A>, b: RemoteData<E, B>, c: RemoteData<E, C>): RemoteData<
    E,
    [A, B, C]
  >;

  <E, A, B, C, D>(
    a: RemoteData<E, A>,
    b: RemoteData<E, B>,
    c: RemoteData<E, C>,
    d: RemoteData<E, D>,
  ): RemoteData<E, [A, B, C, D]>;

  <E, A, B, C, D, F>(
    a: RemoteData<E, A>,
    b: RemoteData<E, B>,
    c: RemoteData<E, C>,
    d: RemoteData<E, D>,
    f: RemoteData<E, F>,
  ): RemoteData<E, [A, B, C, D, F]>;

  <E, A, B, C, D, F, G>(
    a: RemoteData<E, A>,
    b: RemoteData<E, B>,
    c: RemoteData<E, C>,
    d: RemoteData<E, D>,
    f: RemoteData<E, F>,
    g: RemoteData<E, G>,
  ): RemoteData<E, [A, B, C, D, F, G]>;
}

/**
 * Transforms multiple remote data (in tuple) into one
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * type City = { title: string };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20});
 * const remoteCity: RemoteData<RemoteError, City> = remote.success({title: "New Orleans"});
 *
 * const remoteCombined: RemoteData<RemoteError, [User, City]> = remote.sequence(remoteUser, remoteCity)
 */
const sequence: Sequence = ((...list: RemoteData<any, any>[]) => {
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
}) as Sequence;

interface Combine {
  <E, S extends Record<string, RemoteData<any, any>>>(struct: S): RemoteData<
    E,
    {
      [K in keyof S]: S[K] extends RemoteData<E, infer R> ? R : never;
    }
  >;
}

/**
 * Transforms multiple remote data (in struct) into one
 *
 * @example
 * import { remote, RemoteError } from 'remote-data-rtk';
 * type User = { name: string; age: number };
 * type City = { title: string };
 * const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20});
 * const remoteCity: RemoteData<RemoteError, City> = remote.success({title: "New Orleans"});
 *
 * const remoteCombined: RemoteData<RemoteError, {user: User; city: City}> = remote.combine({user: remoteUser, city: remoteCity})
 */
const combine = (<S extends Record<string, RemoteData<any, any>>>(struct: S) => {
  const entries = Object.entries(struct);
  const list = entries.map(([, el]) => el);

  // @ts-ignore
  const tupleSequence: RemoteData<any, any> = sequence(...list);

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
}) as Combine;

export const remote = {
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
  sequence,
  combine,
};

export type RenderRemoteProps<E, A> = {
  /** Remote data needs to be rendered */
  data: RemoteData<E, A>;
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

export const RenderRemote = <E, A>({
  data,
  pending = null,
  refetching = () => pending,
  failure = () => null,
  initial = null,
  success,
}: RenderRemoteProps<E, A>): JSX.Element =>
  createElement(
    Fragment,
    null,
    pipe(
      data,
      remote.fold(
        () => initial,
        optionFold(() => pending, refetching),
        failure,
        success,
      ),
    ),
  );
