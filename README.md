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
  const users: RemoteRTK<RTKError, APIUser[]> = api.useGetUsersQuery();
  const todos: RemoteRTK<RTKError, APITodo[]> = api.useGetTodosQuery();

  const data = pipe(
    remoteRTK.sequenceS({ users, todos }),
    remoteRTK.map(({ users, todos }) => ({
      users: users.map((user) => ({
        ...user,
        fullName: user.name + user.username,
      })),
      todos,
    })),
  );

  return (
    <div className="remote">
      <RenderRemoteRTK
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

### remoteRTK.initial
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };

const initialUsers: RemoteRTK<RTKError, User[]> = remoteRTK.initial;
```

### remoteRTK.pending
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };

const pendingUsersWithData: RemoteRTK<RTKError, User[]> = remoteRTK.pending([{name: "John", age: 20}]);

const pendingUsers: RemoteRTK<RTKError, User[]> = remoteRTK.pending();
```

### remoteRTK.failure
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };

const failureUsers: RemoteRTK<RTKError, User[]> = remoteRTK.failure(new Error('failed to fetch'));
// left part can be whatever you need
const failureUsersCustomError: RemoteRTK<{reason: string}, User[]> = remoteRTK.failure({reason: 'failed to fetch'});
```

### remoteRTK.success
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };

const successUsers: RemoteRTK<RTKError, User[]> = remoteRTK.success([{name: "John", age: 20}])
```

### remoteRTK.isInitial
```typescript
import { remoteRTK } from 'remote-data-rtk';

remoteRTK.isInitial(remoteRTK.initial) // true
remoteRTK.isInitial(remoteRTK.pending()) // false
```

### remoteRTK.isPending
```typescript

import { remoteRTK } from 'remote-data-rtk';

remoteRTK.isPending(remoteRTK.pending()) // true
remoteRTK.isPending(remoteRTK.failure(new Error())) // false
```

### remoteRTK.isFailure
```typescript
import { remoteRTK } from 'remote-data-rtk';

remoteRTK.isFailure(remoteRTK.failure(new Error())) // true
remoteRTK.isFailure(remoteRTK.success([])) // false
```

### remoteRTK.isSuccess
```typescript
import { remoteRTK } from 'remote-data-rtk';

remoteRTK.isSuccess(remoteRTK.success([])) // true
remoteRTK.isSuccess(remoteRTK.pending([])) // false
```

### remoteRTK.map
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };
type UserInfo = string; // name + age

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
const remoteUserName: RemoteRTK<RTKError, UserInfo> = pipe(remoteUser, remoteRTK.map(user => `${user.name} ${user.age}`))
```

### remoteRTK.fold
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { pipe, identity } from 'fp-ts/function';
import { option } from 'fp-ts';

type User = { name: string; age: number };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})

const user: string = pipe(
    remoteUser,
    remoteRTK.map(user => `${user.name} ${user.age}`),
    remoteRTK.fold(
        () => 'nothing is fetched',
        option.fold(() => 'just pending', (userInfo) => `info: ${userInfo}. pending again for some reason`),
        String,
        identity,
    )
)
```

### remoteRTK.getOrElse
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})

const user: string = pipe(
    remoteUser,
    remoteRTK.map(user => `${user.name} ${user.age}`),
    remoteRTK.getOrElse(() => 'no user was fetched')
)
```

### remoteRTK.toNullable
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})

const nullableUser: User | null = remoteRTK.toNullable(remoteUser);
```

### remoteRTK.fromOption
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { option } from 'fp-ts';
import { Option } from 'fp-ts/Option';

type User = { name: string; age: number };

const optionUser: Option<User> = option.some({name: 'John', age: 20})

const remoteFromOptionUser: RemoteRTK<RTKError, User> = remoteRTK.fromOption(optionUser, () => new Error('option was none'))
```

### remoteRTK.toOption
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { Option } from 'fp-ts/Option';

type User = { name: string; age: number };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})

const optionUser: Option<User> = remoteRTK.toOption(remoteUser);
```

### remoteRTK.fromEither
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { Either, right } from 'fp-ts/lib/Either';

type User = { name: string; age: number };

const eitherUser: Either<RTKError, User> = right({name: 'John', age: 20})

const remoteFromEitherUser: RemoteRTK<RTKError, User> = remoteRTK.fromEither(eitherUser)
```

### remoteRTK.toEither
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})

const eitherUser: Either<RTKError, User> = pipe(
    remoteUser,
    remoteRTK.toEither(() => new Error('initial'), () => new Error('pending'))
)
```

### remoteRTK.chain
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';
import { pipe } from 'fp-ts/function';

type User = { name: string; age: number };
type UserInfo = string; // name + age

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20})
const chained = pipe(
    remoteUser,
    remoteRTK.chain<RTKError, User, UserInfo>((user) => remoteRTK.success(`${user.name} ${user.age}`))
)
```

### remoteRTK.sequenceT
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };
type City = { title: string };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20});
const remoteCity: RemoteRTK<RTKError, City> = remoteRTK.success({title: "New Orleans"});

const remoteCombined: RemoteRTK<RTKError, [User, City]> = remoteRTK.sequenceT(remoteUser, remoteCity)
```

### remoteRTK.sequenceS
```typescript
import { remoteRTK, RTKError } from 'remote-data-rtk';

type User = { name: string; age: number };
type City = { title: string };

const remoteUser: RemoteRTK<RTKError, User> = remoteRTK.success({name: "John", age: 20});
const remoteCity: RemoteRTK<RTKError, City> = remoteRTK.success({title: "New Orleans"});

const remoteCombined: RemoteRTK<RTKError, {user: User; city: City}> = remoteRTK.sequenceS({user: remoteUser, city: remoteCity})
```

### RenderRemoteRTK
```typescript
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
```

## CHANGELOG

### 0.0.1 `17.08.2022`
* Initial release

### 0.0.2 `17.08.2022`
* Removed useless dependency