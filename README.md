# ADT compatible with '@reduxjs/toolkit/query/react'

## Prerequisites:
* basic knowledge of FP approach and [fp-ts](https://github.com/gcanti/fp-ts) package
* [@reduxjs/toolkit/query](https://www.npmjs.com/package/@reduxjs/toolkit)

## Installation
`yarn add remote-data-rtk`

## Prior art:
* [@devexperts/remote-data-ts](https://github.com/devexperts/remote-data-ts)

* [Slaying a UI Antipattern with Flow](https://medium.com/@gcanti/slaying-a-ui-antipattern-with-flow-5eed0cfb627b)

## Usage example from this repo
> Go to `src/dev/demo/index.tsx` for comparison with classic approach
```typescript jsx
export const WithRemoteRTKDemoCombined2Queries: FC = () => {
  const users: RemoteData<RemoteError, APIUser[]> = api.useGetUsersQuery();
  const todos: RemoteData<RemoteError, APITodo[]> = api.useGetTodosQuery();

  const data = pipe(
    remote.combine({ users, todos }),
    remote.map(({ users, todos }) => ({
      users: users.map((user) => ({
        ...user,
        fullName: user.name + user.username,
      })),
      todos,
    })),
  );

  return (
    <div className="remote">
      <RenderRemote
        data={data}
        success={(data) => <UsersWithTodosComponent users={data.users} todos={data.todos} />}
        initial={<div>INITIAL</div>}
        failure={() => <div>ERROR</div>}
        pending={<div>SKELETON</div>}
      />
    </div>
  );
};
```

## API

### remote.initial
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };

const initialUsers: RemoteData<RemoteError, User[]> = remote.initial;
```

### remote.pending
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };

const pendingUsersWithData: RemoteData<RemoteError, User[]> = remote.pending([{name: "John", age: 20}]);

const pendingUsers: RemoteData<RemoteError, User[]> = remote.pending();
```

### remote.failure
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };

const failureUsers: RemoteData<RemoteError, User[]> = remote.failure(new Error('failed to fetch'));
// left part can be whatever you need
const failureUsersCustomError: RemoteData<{reason: string}, User[]> = remote.failure({reason: 'failed to fetch'});
```

### remote.success
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };

const successUsers: RemoteData<RemoteError, User[]> = remote.success([{name: "John", age: 20}])
```

### remote.isInitial
```typescript
import { remote } from 'remote-data-rtk';

remote.isInitial(remote.initial) // true
remote.isInitial(remote.pending()) // false
```

### remote.isPending
```typescript

import { remote } from 'remote-data-rtk';

remote.isPending(remote.pending()) // true
remote.isPending(remote.failure(new Error())) // false
```

### remote.isFailure
```typescript
import { remote } from 'remote-data-rtk';

remote.isFailure(remote.failure(new Error())) // true
remote.isFailure(remote.success([])) // false
```

### remote.isSuccess
```typescript
import { remote } from 'remote-data-rtk';

remote.isSuccess(remote.success([])) // true
remote.isSuccess(remote.pending([])) // false
```

### remote.map
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };
type UserInfo = string; // name + age

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
const remoteUserName: RemoteData<RemoteError, UserInfo> = pipe(remoteUser, remote.map(user => `${user.name} ${user.age}`))
```

### remote.mapLeft
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

const remoteUser: RemoteData<RemoteError, string> = remote.failure(new Error('could not fetch'))
const remoteUserLeftMapped: RemoteData<{custom: string}, string> = pipe(remoteUser, remote.mapLeft(error => ({custom: String(error)})))
```

### remote.fold
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { pipe, identity } from 'fp-ts/function';
import { option } from 'fp-ts';

type User = { name: string; age: number };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})

const user: string = pipe(
    remoteUser,
    remote.map(user => `${user.name} ${user.age}`),
    remote.fold(
        () => 'nothing is fetched',
        option.fold(() => 'just pending', (userInfo) => `info: ${userInfo}. pending again for some reason`),
        String,
        identity,
    )
)
```

### remote.getOrElse
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})

const user: string = pipe(
    remoteUser,
    remote.map(user => `${user.name} ${user.age}`),
    remote.getOrElse(() => 'no user was fetched')
)
```

### remote.toNullable
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})

const nullableUser: User | null = remote.toNullable(remoteUser);
```

### remote.fromOption
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { option } from 'fp-ts';
import { Option } from 'fp-ts/Option';

type User = { name: string; age: number };

const optionUser: Option<User> = option.some({name: 'John', age: 20})

const remoteFromOptionUser: RemoteData<RemoteError, User> = remote.fromOption(optionUser, () => new Error('option was none'))
```

### remote.toOption
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { Option } from 'fp-ts/Option';

type User = { name: string; age: number };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})

const optionUser: Option<User> = remote.toOption(remoteUser);
```

### remote.fromEither
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { Either, right } from 'fp-ts/lib/Either';

type User = { name: string; age: number };

const eitherUser: Either<RemoteError, User> = right({name: 'John', age: 20})

const remoteFromEitherUser: RemoteData<RemoteError, User> = remote.fromEither(eitherUser)
```

### remote.toEither
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})

const eitherUser: Either<RemoteError, User> = pipe(
    remoteUser,
    remote.toEither(() => new Error('initial'), () => new Error('pending'))
)
```

### remote.chain
```typescript
import { remote, RemoteError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };
type UserInfo = string; // name + age

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20})
const chained = pipe(
    remoteUser,
    remote.chain<RemoteError, User, UserInfo>((user) => remote.success(`${user.name} ${user.age}`))
)
```

### remote.sequence
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };
type City = { title: string };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20});
const remoteCity: RemoteData<RemoteError, City> = remote.success({title: "New Orleans"});

const remoteCombined: RemoteData<RemoteError, [User, City]> = remote.sequence(remoteUser, remoteCity)
```

### remote.combine
```typescript
import { remote, RemoteError } from 'remote-data-rtk';

type User = { name: string; age: number };
type City = { title: string };

const remoteUser: RemoteData<RemoteError, User> = remote.success({name: "John", age: 20});
const remoteCity: RemoteData<RemoteError, City> = remote.success({title: "New Orleans"});

const remoteCombined: RemoteData<RemoteError, {user: User; city: City}> = remote.combine({user: remoteUser, city: remoteCity})
```

### RenderRemote
```typescript
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
```

## CHANGELOG

### 0.0.1 `17.08.2022`
* Initial release

### 0.0.2 `17.08.2022`
* Removed useless dependency