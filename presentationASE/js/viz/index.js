// name used in data-viz="…" -> factory(host, data, slide) returning { enter, step, leave }
import * as A from './anims.js';

export const VIZ = {
  scan: A.scan, demo: A.demo, arch: A.arch, pipeline: A.pipeline, backend: A.backend, mlapi: A.mlapi, frontend: A.frontend,
  stories: A.stories, storyshot: A.storyshot, mvp: A.mvp, gitflow: A.gitflow, roadmap: A.roadmap,
};
