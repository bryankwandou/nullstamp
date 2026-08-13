import React from 'react';
import {Composition} from 'remotion';
import {Walkthrough} from './Walkthrough';
import {FPS, TOTAL} from './theme';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Walkthrough"
    component={Walkthrough}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
