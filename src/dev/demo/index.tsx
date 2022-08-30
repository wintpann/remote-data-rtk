import React, { FC, PropsWithChildren } from 'react';
import { pipe } from 'fp-ts/function';
import { createApi, fetchBaseQuery, ApiProvider } from '@reduxjs/toolkit/query/react';
import { useDispatch } from 'react-redux';
import { remote, RemoteData, RemoteError, RenderRemote } from '../../core';
import './styles.scss';
import { useButtonControl } from 'storybox-react';

type APITodo = {
  id: number;
  title: string;
  completed: boolean;
};

type APIUser = {
  id: number;
  name: string;
  username: string;
  email: string;
};

type UserProps = APIUser & { fullName: string };

const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://jsonplaceholder.typicode.com',
  }),
  tagTypes: ['todos', 'users'],
  endpoints: (builder) => ({
    getTodos: builder.query<APITodo[], void>({
      query: () => '/todos?_limit=10',
      providesTags: ['todos'],
    }),
    getUsers: builder.query<APIUser[], void>({
      query: () => '/users?_limit=10',
      providesTags: ['users'],
    }),
  }),
});

const TodoComponent: FC<APITodo> = ({ title }) => <div className="remote-todo">TODO: {title}</div>;

const UserComponent: FC<UserProps> = ({ fullName }) => (
  <div className="remote-user">USER: {fullName}</div>
);

const UsersWithTodosComponent: FC<{ users: UserProps[]; todos: APITodo[] }> = ({
  users,
  todos,
}) => (
  <div className="remote">
    <div className="remote">
      {users.map((user) => (
        <UserComponent {...user} key={user.id} />
      ))}
    </div>
    <div className="remote">
      {todos.map((todo) => (
        <TodoComponent {...todo} key={todo.id} />
      ))}
    </div>
  </div>
);

const useInvalidateAllQueriesControl = () => {
  const dispatch = useDispatch();
  const invalidate = () => dispatch(api.util.invalidateTags(['todos', 'users']));

  useButtonControl({ onClick: invalidate, name: 'invalidate all queries' });
};

export const WithPlainRTKSimple: FC = () => {
  useInvalidateAllQueriesControl();

  const users = api.useGetUsersQuery();

  const usersLoading = users.isFetching || users.isLoading;
  const usersSuccess = users.isSuccess && users.data;

  const usersData = usersSuccess
    ? users.data.map((user) => ({
        ...user,
        fullName: user.name + user.username,
      }))
    : [];

  return (
    <div className="remote">
      {usersSuccess && usersData.map((user) => <UserComponent {...user} key={user.id} />)}
      {usersLoading && <div>SKELETON</div>}
      {users.isError && <div>ERROR</div>}
      {users.isUninitialized && <div>INITIAL</div>}
    </div>
  );
};

export const WithPlainRTKDemoCombined2Queries: FC = () => {
  useInvalidateAllQueriesControl();

  const users = api.useGetUsersQuery();
  const todos = api.useGetTodosQuery();

  const usersLoading = users.isFetching || users.isLoading;
  const usersSuccess = users.isSuccess && users.data;

  const todosLoading = todos.isFetching || todos.isLoading;
  const todosSuccess = todos.isSuccess && todos.data;

  const combinedLoading = (usersLoading || todosLoading) && !(users.isError || todos.isError);
  const combinedError = (users.isError || todos.isError) && !(usersLoading || todosLoading);
  const combinedUninitialized =
    (users.isUninitialized || todos.isUninitialized) && !combinedError && !combinedLoading;

  const combinedData =
    usersSuccess && todosSuccess
      ? {
          users: users.data.map((user) => ({
            ...user,
            fullName: user.name + user.username,
          })),
          todos: todos.data,
        }
      : { users: [], todos: [] };
  const combinedSuccess = todosSuccess && usersSuccess;

  return (
    <div className="remote">
      {combinedSuccess && (
        <UsersWithTodosComponent users={combinedData.users} todos={combinedData.todos} />
      )}
      {combinedLoading && <div>SKELETON</div>}
      {combinedError && <div>ERROR</div>}
      {combinedUninitialized && <div>INITIAL</div>}
    </div>
  );
};

export const WithRemoteRTKDemoSimple: FC = () => {
  useInvalidateAllQueriesControl();

  const users: RemoteData<RemoteError, APIUser[]> = api.useGetUsersQuery();

  const usersList = pipe(
    users,
    remote.map((users) =>
      users.map((user) => ({ ...user, fullName: user.name + user.username })),
    ),
  );

  return (
    <div className="remote">
      <RenderRemote
        data={usersList}
        success={(users) => users.map((user) => <UserComponent {...user} key={user.id} />)}
        initial={<div>INITIAL</div>}
        failure={() => <div>ERROR</div>}
        pending={<div>SKELETON</div>}
      />
    </div>
  );
};

export const WithRemoteRTKDemoCombined2Queries: FC = () => {
  useInvalidateAllQueriesControl();

  const users: RemoteData<RemoteError, APIUser[]> = api.useGetUsersQuery();
  const todos: RemoteData<RemoteError, APITodo[]> = api.useGetTodosQuery();

  const data = pipe(
    remote.sequenceS({ users, todos }),
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

export const Provider: FC<PropsWithChildren> = ({ children }) => (
  <ApiProvider api={api}>{children}</ApiProvider>
);
