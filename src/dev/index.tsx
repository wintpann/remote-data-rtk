import React from 'react';
import ReactDOM from 'react-dom/client';
import { StoryBox } from 'storybox-react';
import 'storybox-react/dist/styles.css';
import {
  WithRemoteRTKDemoCombined2Queries,
  WithPlainRTKDemoCombined2Queries,
  WithPlainRTKSimple,
  WithRemoteRTKDemoSimple,
  Provider,
} from './demo';

const stories = {
  WithPlainRTKSimple,
  WithRemoteRTKDemoSimple,
  WithPlainRTKDemoCombined2Queries,
  WithRemoteRTKDemoCombined2Queries,
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <Provider>
    <StoryBox stories={stories} />
  </Provider>,
);
