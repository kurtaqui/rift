# rift-player-overview



<!-- Auto Generated Below -->


## Properties

| Property     | Attribute | Description                                                          | Type                                                                                  | Default     |
| ------------ | --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| `topMastery` | --        | Top champions by mastery. Falls back to mock data when not provided. | `PlayerChampionEntry[]`                                                               | `undefined` |
| `user`       | --        |                                                                      | `{ id: string; summonerName: string; profileIconId: number; summonerLevel: number; }` | `undefined` |


## Dependencies

### Used by

 - [rift-player-app](../rift-player-app)

### Graph
```mermaid
graph TD;
  rift-player-app --> rift-player-overview
  style rift-player-overview fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
