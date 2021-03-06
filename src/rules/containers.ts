import { YAMLRule } from "../lint";

export const notClusteredIfNamedContainer: YAMLRule = {
  name: "prop-component-container-unnamed-when-cluster-true",
  type: "warn",
  message: "With clustering turned on, setting `container.name` will prevent multiple instances of the container from being scheduled on a single node",
  test: {
    AnyOf: {
      path: "components",
      pred: {
        AnyOf: {
          path: "containers",
          pred: {
            And: {
              preds: [
                { GT: { path: "cluster_instance_count", value: 1 } },
                { Exists: { path: "name" } },
                { Truthy: { path: "cluster" } },
              ],
            },
          },
        },
      },
    },
  },
  examples: {
    wrong: [
      {
        description: "container in component with `cluster_instance_count: 2` should not have a `name` specified",
        yaml: `
---
components:
- name: DB
  cluster: true
  cluster_host_count:
    min: 1
    max: 4
  containers:
  - source: public
    cluster: true
    cluster_instance_count: 2
    image_name: redis
    name: database
      `,
      },
    ],
    right: [
      {
        description: "container in component with `cluster_instance_count: 2` does not have a `name` specified",
        yaml: `
---
components:
- name: DB
  tags:
  - db
  cluster: true
  cluster_host_count:
    min: 1
    max: 4
  containers:
  - source: public
    cluster_instance_count: 2
    image_name: redis
    version: latest
      `,
      },
    ],
  },
};

export const eventSubscriptionContainerExists: YAMLRule = {
  name: "prop-component-container-event-subscription-container-exists",
  type: "error",
  message: "Container event subscriptions must reference an existing component/conatiner",
  test: { EventSubscriptionContainerMissing: {} },
  examples: {
    wrong: [
      {
        description: "container 'redis' has a publish_event that references missing container `Pipeline/logstash`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
  - source: public
    image_name: redis
    publish_events:
      - name: event
        subscriptions:
        - component: Pipeline
          container: logstash
          action: start
      `,
      },
      {
        description: "container 'redis' has a publish_event that references missing container `Pipeline/logstash`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
  - source: public
    image_name: logstash
  - source: public
    image_name: redis
    publish_events:
      - name: event
        subscriptions:
        - component: Pipeline
          container: logstash
          action: start
      `,
      },
    ],
    right: [
      {
        description: "All containers referenced in publish_events have a matching component/container definition",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
  - source: public
    image_name: redis
    publish_events:
      - name: event
        subscriptions:
        - component: Pipeline
          container: logstash
          action: start
- name: Pipeline
  containers:
  - source: public
    image_name: logstash
      `,
      },
    ],
  },
};

export const containerVolumeModes: YAMLRule = {
  name: "prop-component-container-volume-modes-valid",
  type: "error",
  message: "Container volume must not specify conflicting options",
  test: {
    AnyOf: {
      path: "components",
      pred: {
        AnyOf: {
          path: "containers",
          pred: {
            AnyOf: {
              path: "volumes",
              pred: {
                Dot: {
                  path: "options",
                  pred: {
                    Or: {
                      preds: [
                        { MoreThan: { limit: 1, values: ["rw", "ro"] } },
                        { MoreThan: { limit: 1, values: ["z", "Z"] } },
                        { MoreThan: { limit: 1, values: ["nocopy"] } },
                        {
                          MoreThan: {
                            limit: 1,
                            values: ["shared", "slave", "private", "rshared", "rslave", "rprivate"],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  examples: {
    wrong: [
      {
        description: "volume options contains conflicting options `rw` and `ro`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: /tmp
        options:
          - rw
          - ro
      `,
      },
      {
        description: "volume options contains conflicting options `z` and `Z`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: /tmp
        options:
          - z
          - Z
      `,
      },
      {
        description: "volume options contains conflicting options `rshared` and `private`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: /tmp
        options:
          - rshared
          - private
      `,
      },
      {
        description: "volume options contains duplicated option `nocopy`",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: /tmp
        options:
          - nocopy
          - nocopy
      `,
      },
    ],
    right: [
      {
        description: "no volumes are defined",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: redis
      `,
      },
      {
        description: "no volume options are defined",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: redis
    volumes:
      - host_path: /tmp
        container_path: /tmp
      `,
      },
      {
        description: "No conflicting volume options are defined",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: redis
    volumes:
      - host_path: /tmp
        container_path: /tmp
        options:
          - rw
          - Z
          - rshared
          - nocopy
      `,
      },
    ],
  },
};

export const volumeContainerPathAbsoulte: YAMLRule = {
  name: "prop-component-container-volume-path-absolute",
  type: "error",
  message: "Container volume's `container_path` must be absolute",
  test: {
    AnyOf: {
      path: "components",
      pred: {
        AnyOf: {
          path: "containers",
          pred: {
            AnyOf: {
              path: "volumes",
              pred: {
                And: {
                  preds: [
                    { NotMatch: { path: "container_path", pattern: "^/" } },
                    { NotMatch: { path: "container_path", pattern: "^{{repl" } },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
  examples: {
    wrong: [
      {
        description: "container path is not absolue",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: ubuntu/workspace
      `,
      },
    ],
    right: [
      {
        description: "container path is absolute",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: mongo
    volumes:
      - host_path: /tmp
        container_path: /home/ubuntu/workspace
      `,
      },
      {
        description: "container path is a templated field",
        yaml: `
---
components:
- name: DB
  containers:
  - source: public
    image_name: redis
    volumes:
      - host_path: /tmp
        container_path: '{{repl ConfigOption "mount_path"}}'
      `,
      },
    ],
  },
};

export const all: YAMLRule[] = [
  notClusteredIfNamedContainer,
  eventSubscriptionContainerExists,
  containerVolumeModes,
  volumeContainerPathAbsoulte,
];
