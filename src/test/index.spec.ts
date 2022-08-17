import { remoteRTK, RemoteRTK } from '../core';
import { either, option } from 'fp-ts';
import { QueryStatus } from '@reduxjs/toolkit/query';

const MOCK = {
  INITIAL_VALUE: 0,
  SUCCESS_VALUE: 1,
  FAILURE_VALUE: 2,
  PENDING_VALUE: 3,
  ELSE_VALUE: 4,
};

const setup = () => {
  const initial: RemoteRTK<number, number> = remoteRTK.initial;
  const pending: RemoteRTK<number, number> = remoteRTK.pending();
  const refetching: RemoteRTK<number, number> = remoteRTK.pending(MOCK.PENDING_VALUE);
  const failure: RemoteRTK<number, number> = remoteRTK.failure(MOCK.FAILURE_VALUE);
  const success: RemoteRTK<number, number> = remoteRTK.success(MOCK.SUCCESS_VALUE);

  return { initial, pending, refetching, failure, success };
};

describe('remote-data-rtk', () => {
  it('should have correct initial object', () => {
    expect(remoteRTK.initial).toStrictEqual({
      data: undefined,
      status: 'uninitialized',
      error: undefined,
    });
  });

  it('should have correct pending factory', () => {
    expect(remoteRTK.pending()).toStrictEqual({
      status: QueryStatus.pending,
      data: undefined,
    });

    expect(remoteRTK.pending(MOCK.PENDING_VALUE)).toStrictEqual({
      status: QueryStatus.pending,
      data: MOCK.PENDING_VALUE,
    });
  });

  it('should have correct failure factory', () => {
    expect(remoteRTK.failure(MOCK.FAILURE_VALUE)).toStrictEqual({
      status: QueryStatus.rejected,
      error: MOCK.FAILURE_VALUE,
      data: undefined,
    });
  });

  it('should have correct success factory', () => {
    expect(remoteRTK.success(MOCK.SUCCESS_VALUE)).toStrictEqual({
      status: QueryStatus.fulfilled,
      error: undefined,
      data: MOCK.SUCCESS_VALUE,
    });
  });

  it('should have correct type guards', () => {
    const { initial, pending, failure, success } = setup();

    expect(remoteRTK.isInitial(initial)).toBe(true);
    expect(remoteRTK.isPending(pending)).toBe(true);
    expect(remoteRTK.isFailure(failure)).toBe(true);
    expect(remoteRTK.isSuccess(success)).toBe(true);

    expect(remoteRTK.isPending(initial)).toBe(false);
    expect(remoteRTK.isFailure(initial)).toBe(false);
    expect(remoteRTK.isSuccess(initial)).toBe(false);

    expect(remoteRTK.isInitial(pending)).toBe(false);
    expect(remoteRTK.isFailure(pending)).toBe(false);
    expect(remoteRTK.isSuccess(pending)).toBe(false);

    expect(remoteRTK.isInitial(failure)).toBe(false);
    expect(remoteRTK.isPending(failure)).toBe(false);
    expect(remoteRTK.isSuccess(failure)).toBe(false);

    expect(remoteRTK.isInitial(success)).toBe(false);
    expect(remoteRTK.isPending(success)).toBe(false);
    expect(remoteRTK.isFailure(success)).toBe(false);
  });

  it('should run map correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();
    const map = remoteRTK.map((a: number) => a * 2);

    expect(map(initial)).toStrictEqual(remoteRTK.initial);
    expect(map(pending)).toStrictEqual(remoteRTK.pending());
    expect(map(failure)).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));
    expect(map(success)).toStrictEqual(remoteRTK.success(MOCK.SUCCESS_VALUE * 2));
    expect(map(refetching)).toStrictEqual(remoteRTK.pending(MOCK.PENDING_VALUE * 2));
  });

  it('should run fold correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();
    const fold = remoteRTK.fold(
      () => 'initial',
      option.fold(
        () => 'pending_with_no_data',
        () => 'pending_with_data',
      ),
      () => 'failure',
      () => 'success',
    );

    expect(fold(initial)).toBe('initial');
    expect(fold(pending)).toBe('pending_with_no_data');
    expect(fold(refetching)).toBe('pending_with_data');
    expect(fold(failure)).toBe('failure');
    expect(fold(success)).toBe('success');
  });

  it('should run getOrElse correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();
    const orElse = remoteRTK.getOrElse(() => MOCK.ELSE_VALUE);

    expect(orElse(initial)).toBe(MOCK.ELSE_VALUE);
    expect(orElse(pending)).toBe(MOCK.ELSE_VALUE);
    expect(orElse(refetching)).toBe(MOCK.PENDING_VALUE);
    expect(orElse(failure)).toBe(MOCK.ELSE_VALUE);
    expect(orElse(success)).toBe(MOCK.SUCCESS_VALUE);
  });

  it('should run toNullable correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();
    expect(remoteRTK.toNullable(initial)).toBe(null);
    expect(remoteRTK.toNullable(pending)).toBe(null);
    expect(remoteRTK.toNullable(refetching)).toBe(MOCK.PENDING_VALUE);
    expect(remoteRTK.toNullable(failure)).toBe(null);
    expect(remoteRTK.toNullable(success)).toBe(MOCK.SUCCESS_VALUE);
  });

  it('should run fromOption correctly', () => {
    const onNone = () => MOCK.FAILURE_VALUE;

    expect(remoteRTK.fromOption(option.some(MOCK.SUCCESS_VALUE), onNone)).toStrictEqual(
      remoteRTK.success(MOCK.SUCCESS_VALUE),
    );
    expect(remoteRTK.fromOption(option.none, onNone)).toStrictEqual(
      remoteRTK.failure(MOCK.FAILURE_VALUE),
    );
  });

  it('should run toOption correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();
    expect(remoteRTK.toOption(initial)).toStrictEqual(option.none);
    expect(remoteRTK.toOption(pending)).toStrictEqual(option.none);
    expect(remoteRTK.toOption(refetching)).toStrictEqual(option.some(MOCK.PENDING_VALUE));
    expect(remoteRTK.toOption(failure)).toStrictEqual(option.none);
    expect(remoteRTK.toOption(success)).toStrictEqual(option.some(MOCK.SUCCESS_VALUE));
  });

  it('should run fromEither correctly', () => {
    expect(remoteRTK.fromEither(either.right(MOCK.SUCCESS_VALUE))).toStrictEqual(
      remoteRTK.success(MOCK.SUCCESS_VALUE),
    );
    expect(remoteRTK.fromEither(either.left(MOCK.FAILURE_VALUE))).toStrictEqual(
      remoteRTK.failure(MOCK.FAILURE_VALUE),
    );
  });

  it('should run toEither correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();

    const toEither = remoteRTK.toEither(
      () => MOCK.INITIAL_VALUE,
      () => MOCK.PENDING_VALUE,
    );

    expect(toEither(initial)).toStrictEqual(either.left(MOCK.INITIAL_VALUE));
    expect(toEither(pending)).toStrictEqual(either.left(MOCK.PENDING_VALUE));
    expect(toEither(refetching)).toStrictEqual(either.right(MOCK.PENDING_VALUE));
    expect(toEither(failure)).toStrictEqual(either.left(MOCK.FAILURE_VALUE));
    expect(toEither(success)).toStrictEqual(either.right(MOCK.SUCCESS_VALUE));
  });

  it('should run chain correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();

    const chain = remoteRTK.chain<number, number, number>((a: number) => remoteRTK.success(a * 2));

    expect(chain(initial)).toStrictEqual(remoteRTK.initial);
    expect(chain(pending)).toStrictEqual(remoteRTK.pending());
    expect(chain(refetching)).toStrictEqual(remoteRTK.success(MOCK.PENDING_VALUE * 2));
    expect(chain(failure)).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));
    expect(chain(success)).toStrictEqual(remoteRTK.success(MOCK.SUCCESS_VALUE * 2));
  });

  it('should run sequenceT correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();

    const sequenceSuccess = remoteRTK.sequenceT(success, success);
    expect(sequenceSuccess).toStrictEqual(
      remoteRTK.success([MOCK.SUCCESS_VALUE, MOCK.SUCCESS_VALUE]),
    );

    const sequenceSuccessPendingWithData = remoteRTK.sequenceT(success, refetching);
    expect(sequenceSuccessPendingWithData).toStrictEqual(
      remoteRTK.pending([MOCK.SUCCESS_VALUE, MOCK.PENDING_VALUE]),
    );

    const sequenceSuccessPending = remoteRTK.sequenceT(success, pending);
    expect(sequenceSuccessPending).toStrictEqual(remoteRTK.pending());

    const sequenceSuccessInitial = remoteRTK.sequenceT(success, initial);
    expect(sequenceSuccessInitial).toStrictEqual(remoteRTK.initial);

    const sequenceSuccessFailure = remoteRTK.sequenceT(success, failure);
    expect(sequenceSuccessFailure).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailurePending = remoteRTK.sequenceT(failure, pending);
    expect(sequenceFailurePending).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailurePendingWithData = remoteRTK.sequenceT(failure, refetching);
    expect(sequenceFailurePendingWithData).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailureInitial = remoteRTK.sequenceT(failure, initial);
    expect(sequenceFailureInitial).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailureFailure = remoteRTK.sequenceT(failure, failure);
    expect(sequenceFailureFailure).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequencePendingInitial = remoteRTK.sequenceT(pending, initial);
    expect(sequencePendingInitial).toStrictEqual(remoteRTK.pending());

    const sequencePendingWithDataInitial = remoteRTK.sequenceT(refetching, initial);
    expect(sequencePendingWithDataInitial).toStrictEqual(remoteRTK.pending());

    const sequenceInitialInitial = remoteRTK.sequenceT(initial, initial);
    expect(sequenceInitialInitial).toStrictEqual(remoteRTK.initial);
  });

  it('should run sequenceS correctly', () => {
    const { initial, pending, refetching, failure, success } = setup();

    const sequenceSuccess = remoteRTK.sequenceS({ one: success, two: success });
    expect(sequenceSuccess).toStrictEqual(
      remoteRTK.success({ one: MOCK.SUCCESS_VALUE, two: MOCK.SUCCESS_VALUE }),
    );

    const sequenceSuccessPendingWithData = remoteRTK.sequenceS({
      one: success,
      two: refetching,
    });
    expect(sequenceSuccessPendingWithData).toStrictEqual(
      remoteRTK.pending({
        one: MOCK.SUCCESS_VALUE,
        two: MOCK.PENDING_VALUE,
      }),
    );

    const sequenceSuccessPending = remoteRTK.sequenceS({ one: success, two: pending });
    expect(sequenceSuccessPending).toStrictEqual(remoteRTK.pending());

    const sequenceSuccessInitial = remoteRTK.sequenceS({ one: success, two: initial });
    expect(sequenceSuccessInitial).toStrictEqual(remoteRTK.initial);

    const sequenceSuccessFailure = remoteRTK.sequenceS({ one: success, two: failure });
    expect(sequenceSuccessFailure).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailurePending = remoteRTK.sequenceS({ one: failure, two: pending });
    expect(sequenceFailurePending).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailurePendingWithData = remoteRTK.sequenceS({
      one: failure,
      two: refetching,
    });
    expect(sequenceFailurePendingWithData).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailureInitial = remoteRTK.sequenceS({ one: failure, two: initial });
    expect(sequenceFailureInitial).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequenceFailureFailure = remoteRTK.sequenceS({ one: failure, two: failure });
    expect(sequenceFailureFailure).toStrictEqual(remoteRTK.failure(MOCK.FAILURE_VALUE));

    const sequencePendingInitial = remoteRTK.sequenceS({ one: pending, two: initial });
    expect(sequencePendingInitial).toStrictEqual(remoteRTK.pending());

    const sequencePendingWithDataInitial = remoteRTK.sequenceS({
      one: refetching,
      two: initial,
    });
    expect(sequencePendingWithDataInitial).toStrictEqual(remoteRTK.pending());

    const sequenceInitialInitial = remoteRTK.sequenceS({ one: initial, two: initial });
    expect(sequenceInitialInitial).toStrictEqual(remoteRTK.initial);
  });
});
